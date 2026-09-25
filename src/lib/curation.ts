import type { EventItem } from '../types';
import { getGenreFamilyById } from './danceCategories';
import { parseISODate } from './dateUtils';

/**
 * FASE 1 — Curación de contenido para la home de Sale Baile.
 * Regla de negocio definida en equipo (Estratega de Negocios):
 *   - INCLUSIÓN binaria: solo entra contenido de baile.
 *   - PRIORIDAD: score 0–100 que ordena dentro de lo que sí entra
 *     (este score es, además, el activo que el "destacado pago" anulará en el futuro).
 */

// Términos que delatan contenido NO bailable. Se evalúan sobre el título en minúsculas.
// Deporte / competencia + formatos genéricos que no son "baile".
const NON_DANCE_TERMS = [
  'partido', 'futbol', 'fútbol', 'football', 'campeonato', 'torneo', 'deporte',
  'liga', 'fixture', 'cancha', 'estadio', 'recital', 'concierto', 'feria',
  'charla', 'conferencia', 'seminario', 'congreso', 'teatro', 'obra de',
  'expo', 'carrera', 'maraton', 'maratón', 'boxeo', 'pelea', 'corrida',
];

// Términos positivos que confirman que ES baile (override sobre cualquier negativo).
const DANCE_TERMS = [
  'baile', 'baila', 'bailar', 'salsa', 'bachata', 'tango', 'milonga', 'cumbia',
  'danza', 'dance', 'clase', 'social', 'noche de', 'fiesta', 'rock', 'swing',
  'lindy', 'folclore', 'folklore', 'chacarera', 'zamba', 'chamamé', 'peña',
  'reggaeton', 'reggaetón', 'kizomba', 'merengue', 'zouk', 'samba', 'cuarteto',
  'rkt', 'cachengue', 'sbk', 'practica', 'práctica', 'taller', 'festival',
];

// Familias de género populares (puntúan alto en "género popular").
const POPULAR_GENRES = new Set([
  'salsa-y-bachata', 'salsa', 'bachata', 'cachengue', 'tango',
]);

export interface CurationDecision {
  included: boolean;
  reason: string;
}

/**
 * Regla de inclusión binaria: ¿este evento pertenece a una app de baile?
 * - Excluye si el título contiene un término NO-bailable y no contiene ningún término de baile.
 * - La categoría ya está acotada a tipos de baile en el modelo (social/clase/taller/festival/practica),
 *   así que el título es la señal principal que delata un "partido" mal categorizado.
 */
export function isDanceEvent(event: EventItem): CurationDecision {
  const title = (event.title || '').toLowerCase();
  const desc = (event.description || '').toLowerCase();
  const subs = (event.subgenres || []).join(' ').toLowerCase();
  const fam = (event.genre_family || '').toLowerCase();
  const haystack = `${title} ${desc} ${subs} ${fam}`;

  const hasDance = DANCE_TERMS.some((t) => haystack.includes(t));
  const hasNonDance = NON_DANCE_TERMS.some((t) => haystack.includes(t));

  if (hasNonDance && !hasDance) {
    return { included: false, reason: `off-topic: "${title.slice(0, 40)}"` };
  }
  if (hasDance) {
    return { included: true, reason: 'dance' };
  }
  // Sin señal fuerte en texto: se mantiene (evitar falsos negativos en fichas escuetas).
  return { included: true, reason: 'default-keep' };
}

/**
 * Score de prioridad 0–100. Ordena dentro de lo que sí entra en la home.
 *   Recencia 30 · Proximidad 25 · Género popular 25 · Calidad de ficha 20.
 */
export function scoreEventPriority(event: EventItem, distanceKm?: number): number {
  // --- Recencia (30) ---
  let recency = 5;
  try {
    const start = parseISODate(event.start_time);
    const now = new Date();
    const diffDays = Math.round((start.getTime() - now.getTime()) / 86400000);
    if (diffDays < 0) recency = 2; // ya pasó
    else if (diffDays === 0) recency = 30;
    else if (diffDays === 1) recency = 28;
    else if (diffDays <= 7) recency = 22;
    else if (diffDays <= 14) recency = 15;
    else if (diffDays <= 30) recency = 9;
    else recency = 5;
  } catch {
    recency = 5;
  }

  // --- Proximidad (25) ---
  let proximity = 12; // sin ubicación conocida
  if (typeof distanceKm === 'number' && !Number.isNaN(distanceKm)) {
    if (distanceKm <= 2) proximity = 25;
    else if (distanceKm <= 5) proximity = 22;
    else if (distanceKm <= 10) proximity = 18;
    else if (distanceKm <= 25) proximity = 12;
    else proximity = 6;
  }

  // --- Género popular (25) ---
  const fam = getGenreFamilyById(event.genre_family);
  const genrePopularity = POPULAR_GENRES.has(fam.id) ? 25
    : fam.id === 'rock' || fam.id === 'urbano' ? 20
    : 15;

  // --- Calidad de ficha (20) ---
  let completeness = 0;
  if (event.flyer_url && event.flyer_url.trim()) completeness += 5;
  if (event.is_free || (event.price != null && event.price > 0)) completeness += 5;
  if ((event.venue_name || '').trim() && (event.city || '').trim()) completeness += 5;
  if (event.organizer_instagram || event.organizer_whatsapp || event.tickets_url) completeness += 5;

  return Math.round(recency + proximity + genrePopularity + completeness);
}

export interface CuratedHomeResult<T extends EventItem = EventItem> {
  /** Eventos que entran en la home, ya ordenados por score (destacados arriba). */
  included: (T & { curation_score: number })[];
  /** Eventos que quedan afuera por regla de inclusión. */
  excluded: { id: string; title: string; reason: string }[];
  /** Total de eventos evaluados (para calcular % irrelevante). */
  totalEvaluated: number;
  /** Métricas crudas para Fase 0. */
  metrics: { irrelevantCount: number; irrelevantPct: number };
}

/**
 * Filtra + ordena la lista de eventos para la home.
 * @param distanceByEvent Map opcional de distancia en km por evento (para proximidad).
 */
export function curateHomeEvents<T extends EventItem>(
  events: T[],
  distanceByEvent?: Map<string, number>,
): CuratedHomeResult<T> {
  const excluded: CuratedHomeResult<T>['excluded'] = [];
  const scored: CuratedHomeResult<T>['included'] = [];

  for (const evt of events) {
    const decision = isDanceEvent(evt);
    if (!decision.included) {
      excluded.push({ id: evt.id, title: evt.title, reason: decision.reason });
      continue;
    }
    scored.push({
      ...evt,
      curation_score: scoreEventPriority(evt, distanceByEvent?.get(evt.id)),
    });
  }

  // Destacados primero; después por score descendente.
  scored.sort((a, b) => {
    if (Boolean(a.is_featured) !== Boolean(b.is_featured)) {
      return a.is_featured ? -1 : 1;
    }
    return b.curation_score - a.curation_score;
  });

  const totalEvaluated = events.length;
  const irrelevantCount = excluded.length;
  const irrelevantPct = totalEvaluated > 0
    ? Math.round((irrelevantCount / totalEvaluated) * 1000) / 10
    : 0;

  return {
    included: scored,
    excluded,
    totalEvaluated,
    metrics: { irrelevantCount, irrelevantPct },
  };
}
