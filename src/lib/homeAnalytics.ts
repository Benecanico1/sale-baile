/**
 * FASE 0 — Instrumentación mínima de la home.
 * Métricas objetivo (definidas en equipo):
 *   1. CTR por card de evento (impresiones únicas vs. clics).
 *   2. % de eventos irrelevantes descartados por curación.
 *
 * Persiste en localStorage por sesión de navegador y expone un acceso global
 * (`window.__saleBaileAnalytics`) para leer/dumpear sin construir dashboard.
 */

const ANALYTICS_KEY = 'salebaile_home_analytics_v1';

interface HomeAnalytics {
  sessionStart: string;
  /** ids de eventos que ya fueron vistos (impresión única por sesión). */
  impressions: Record<string, number>;
  /** clics reales por id de evento. */
  clicks: Record<string, number>;
  /** eventos descartados por curación en el último pase. */
  lastCuratedOut: { id: string; title: string; reason: string }[];
  lastMetrics: { irrelevantCount: number; irrelevantPct: number; totalEvaluated: number };
}

function read(): HomeAnalytics {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sessionStart: parsed.sessionStart || new Date().toISOString(),
        impressions: parsed.impressions || {},
        clicks: parsed.clicks || {},
        lastCuratedOut: parsed.lastCuratedOut || [],
        lastMetrics: parsed.lastMetrics || { irrelevantCount: 0, irrelevantPct: 0, totalEvaluated: 0 },
      };
    }
  } catch { /* ignore */ }
  return {
    sessionStart: new Date().toISOString(),
    impressions: {},
    clicks: {},
    lastCuratedOut: [],
    lastMetrics: { irrelevantCount: 0, irrelevantPct: 0, totalEvaluated: 0 },
  };
}

function write(data: HomeAnalytics): void {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/** Registra una impresión única por evento (solo la primera vez en la sesión). */
export function recordImpression(eventId: string): void {
  const data = read();
  if (!data.impressions[eventId]) {
    data.impressions[eventId] = 1;
    write(data);
  }
}

/** Registra un clic de usuario sobre la card de un evento. */
export function recordClick(eventId: string): void {
  const data = read();
  data.clicks[eventId] = (data.clicks[eventId] || 0) + 1;
  write(data);
}

/** Guarda el resultado de curación del último pase para poder calcular % irrelevante. */
export function recordCuration(
  excluded: { id: string; title: string; reason: string }[],
  metrics: { irrelevantCount: number; irrelevantPct: number; totalEvaluated: number },
): void {
  const data = read();
  data.lastCuratedOut = excluded;
  data.lastMetrics = metrics;
  write(data);
}

export interface AnalyticsMetrics {
  uniqueEventsSeen: number;
  totalClicks: number;
  /** CTR global = clics / eventos vistos. */
  ctr: number;
  /** CTR por evento, ordenado desc. */
  byEvent: { id: string; clicks: number; ctr: number }[];
  /** % de eventos irrelevantes descartados por curación (último pase). */
  irrelevantPct: number;
  irrelevantCount: number;
  totalEvaluated: number;
  curatedOutTitles: string[];
}

export function computeMetrics(): AnalyticsMetrics {
  const data = read();
  const seenIds = Object.keys(data.impressions);
  const uniqueEventsSeen = seenIds.length;
  const totalClicks = Object.values(data.clicks).reduce((a, b) => a + b, 0);

  const byEvent = seenIds
    .map((id) => {
      const clicks = data.clicks[id] || 0;
      return { id, clicks, ctr: clicks > 0 ? 1 : 0 };
    })
    .sort((a, b) => b.clicks - a.clicks);

  return {
    uniqueEventsSeen,
    totalClicks,
    ctr: uniqueEventsSeen > 0 ? Math.round((totalClicks / uniqueEventsSeen) * 1000) / 10 : 0,
    byEvent,
    irrelevantPct: data.lastMetrics.irrelevantPct,
    irrelevantCount: data.lastMetrics.irrelevantCount,
    totalEvaluated: data.lastMetrics.totalEvaluated,
    curatedOutTitles: data.lastCuratedOut.map((c) => c.title),
  };
}

/** Vuelca las métricas a la consola (dev) en formato tabla legible. */
export function dumpAnalytics(): void {
  const m = computeMetrics();
  // eslint-disable-next-line no-console
  console.group('📊 Sale Baile · Analytics de la home (Fase 0)');
  // eslint-disable-next-line no-console
  console.table({
    'Eventos vistos (impresiones únicas)': m.uniqueEventsSeen,
    'Clics totales': m.totalClicks,
    'CTR global (%)': m.ctr,
    '% eventos irrelevantes (curados)': m.irrelevantPct,
    'Eventos evaluados': m.totalEvaluated,
  });
  if (m.byEvent.length) {
    // eslint-disable-next-line no-console
    console.table(m.byEvent.slice(0, 20), ['id', 'clicks', 'ctr']);
  }
  if (m.curatedOutTitles.length) {
    // eslint-disable-next-line no-console
    console.warn('🚫 Descartados por curación (off-topic):', m.curatedOutTitles);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();
}

// Acceso global para inspección manual: window.__saleBaileAnalytics.computeMetrics()
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__saleBaileAnalytics = {
    computeMetrics,
    dump: dumpAnalytics,
    reset: () => {
      try { localStorage.removeItem(ANALYTICS_KEY); } catch { /* ignore */ }
    },
  };
}
