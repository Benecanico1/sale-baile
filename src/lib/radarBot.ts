import type { EventItem, EventCategory } from '../types';
import { searchAddressGeocode } from './geo';

export interface MonitoredAccount {
  id: string;
  handle: string;
  name: string;
  category_tag: 'bachata' | 'salsa' | 'rock' | 'cena_show' | 'teatro' | 'concierto' | 'salon' | 'general';
  last_scanned?: string;
  is_active: boolean;
  avatar_url?: string;
}

export type EventValidityStatus = 'upcoming' | 'expired' | 'tentative';

/**
 * Genera un flyer SVG estilizado de alta definición para eventos que no tienen imagen o fallan al cargar
 */
export function createFallbackFlyerSvg(title: string, subtitle?: string, genre?: string): string {
  const safeTitle = (title || 'Gran Noche de Baile').slice(0, 32);
  const safeSubtitle = (subtitle || 'Clases de Bachata & Baile Social').slice(0, 40);
  const safeGenre = (genre || 'BACHATA SOCIAL').toUpperCase();
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
    <defs>
      <linearGradient id="bgDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#180728"/>
        <stop offset="50%" stop-color="#090d16"/>
        <stop offset="100%" stop-color="#150824"/>
      </linearGradient>
      <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ff007f"/>
        <stop offset="50%" stop-color="#7928ca"/>
        <stop offset="100%" stop-color="#00dfd8"/>
      </linearGradient>
      <radialGradient id="centerLight" cx="50%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ff007f" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="600" height="800" fill="url(#bgDark)"/>
    <rect width="600" height="800" fill="url(#centerLight)"/>
    
    <!-- Neon Border -->
    <rect x="25" y="25" width="550" height="750" rx="24" fill="none" stroke="url(#neonGlow)" stroke-width="3.5" opacity="0.75"/>
    <circle cx="300" cy="230" r="100" fill="#ff007f" opacity="0.15"/>
    
    <!-- Music Icon -->
    <g transform="translate(255, 185) scale(1.8)" fill="url(#neonGlow)">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </g>
    
    <!-- Genre Tag -->
    <rect x="180" y="75" width="240" height="42" rx="21" fill="#ff007f" opacity="0.2"/>
    <rect x="180" y="75" width="240" height="42" rx="21" fill="none" stroke="#ff007f" stroke-width="1.5"/>
    <text x="300" y="102" fill="#ff70a6" font-size="15" font-weight="900" font-family="system-ui, sans-serif" text-anchor="middle" letter-spacing="3">${safeGenre}</text>
    
    <!-- Event Title -->
    <text x="300" y="420" fill="#ffffff" font-size="32" font-weight="900" font-family="system-ui, sans-serif" text-anchor="middle">
      ${safeTitle}
    </text>
    
    <!-- Subtitle -->
    <text x="300" y="480" fill="#a0aec0" font-size="19" font-weight="600" font-family="system-ui, sans-serif" text-anchor="middle">
      ${safeSubtitle}
    </text>
    
    <!-- Sale Baile Badge -->
    <rect x="160" y="660" width="280" height="52" rx="26" fill="url(#neonGlow)"/>
    <text x="300" y="694" fill="#090d16" font-size="18" font-weight="900" font-family="system-ui, sans-serif" text-anchor="middle" letter-spacing="1.5">
      SALE BAILE • RADAR
    </text>
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface ParsedDateResult {
  startDate: string; // YYYY-MM-DD
  startTimeHour: string; // HH:mm
  endTimeHour: string; // HH:mm
  validityStatus: EventValidityStatus;
  validityReason: string;
  daysUntilEvent: number;
  rawDateMatched?: string;
  isPastRecap: boolean;
}

export interface RadarDraftItem {
  id: string;
  source_type: 'instagram_url' | 'flyer_upload' | 'account_scan';
  source_url?: string;
  source_account?: string;
  flyer_url: string;
  raw_caption?: string;
  extracted_data: Partial<EventItem>;
  confidence_score: number; // 0 to 100
  status: 'pending' | 'published' | 'dismissed';
  validity_status: EventValidityStatus;
  validity_reason: string;
  days_until_event: number;
  detected_date_text?: string;
  created_at: string;
}

const STORAGE_RADAR_DRAFTS = 'salebaile_radar_drafts_v6';
const STORAGE_MONITORED_ACCOUNTS = 'salebaile_monitored_accounts_v6';

export const DEFAULT_MONITORED_ACCOUNTS: MonitoredAccount[] = [
  { id: 'acc-melanybys', handle: '@melanybys', name: 'Melany Bys', category_tag: 'bachata', is_active: true },
];

/**
 * Obtiene los borradores capturados por el radar bot
 */
export function getRadarDrafts(): RadarDraftItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_RADAR_DRAFTS);
    if (raw) {
      const parsed: RadarDraftItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}

  return [];
}

/**
 * Guarda borradores del radar bot
 */
export function saveRadarDrafts(drafts: RadarDraftItem[]): void {
  try {
    localStorage.setItem(STORAGE_RADAR_DRAFTS, JSON.stringify(drafts));
  } catch (e) {}
}

/**
 * Obtiene las cuentas monitoreadas
 */
export function getMonitoredAccounts(): MonitoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_MONITORED_ACCOUNTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_MONITORED_ACCOUNTS;
}

/**
 * Guarda las cuentas monitoreadas
 */
export function saveMonitoredAccounts(accounts: MonitoredAccount[]): void {
  try {
    localStorage.setItem(STORAGE_MONITORED_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {}
}

const STORAGE_GEMINI_API_KEY = 'salebaile_gemini_api_key';

export function getGeminiApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_GEMINI_API_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function saveGeminiApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_GEMINI_API_KEY, key.trim());
  } catch (e) {}
}

const MONTHS_MAP: Record<string, number> = {
  enero: 0, ene: 0,
  febrero: 1, feb: 1,
  marzo: 2, mar: 2,
  abril: 3, abr: 3,
  mayo: 4, may: 4,
  junio: 5, jun: 5,
  julio: 6, jul: 6,
  agosto: 7, ago: 7, agost: 7,
  septiembre: 8, setiembre: 8, sep: 8, sept: 8,
  octubre: 9, oct: 9,
  noviembre: 10, nov: 10,
  diciembre: 11, dic: 11,
};

const DAYS_OF_WEEK_MAP: Record<string, number> = {
  domingo: 0, dom: 0,
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  miercoles: 3, miércoles: 3, mie: 3, mié: 3,
  jueves: 4, jue: 4,
  viernes: 5, vie: 5,
  sabado: 6, sábado: 6, sab: 6, sáb: 6,
};

const PAST_RECAP_KEYWORDS = [
  'lo que fue',
  'lo que se vivió',
  'lo que se vivio',
  'revivi la noche',
  'reviví la noche',
  'revivimos la noche',
  'fotos del viernes',
  'fotos del sabado',
  'fotos del sábado',
  'fotos de la noche',
  'gracias a todos los que vinieron',
  'gracias por venir',
  'gracias por acompañarnos',
  'gracias por bailar',
  'resumen del social',
  'recuerdos del social',
  'tremenda noche la de',
  'así se vivió',
  'asi se vivio',
  'álbum de fotos',
  'album de fotos',
  'la rompieron el',
];

/**
 * MOTOR DE EXTRACCIÓN Y FILTRO DE VIGENCIA DE FECHAS
 * Analiza el texto en español para extraer la fecha exacta y determinar si el evento es próximo o vencido.
 */
export function parseEventDateAndValidity(
  rawText: string,
  referenceDate: Date = new Date()
): ParsedDateResult {
  const text = (rawText || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, function (match) {
    return match;
  });

  const cleanText = text
    .replace(/[,\.;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Detectar si es un post recap / resumen de evento ya ocurrido
  const isPastRecap = PAST_RECAP_KEYWORDS.some((kw) => cleanText.includes(kw));

  // 2. Detección de Horarios
  let startTimeHour = '22:00';
  let endTimeHour = '05:00';

  const timeRangeMatch = cleanText.match(
    /(?:de|desde|arranca|apertura|puerta)?\s*(\d{1,2})(?::(\d{2}))?\s*(?:hs|hrs|pm|am)?\s*(?:a|hasta|-)\s*(\d{1,2})(?::(\d{2}))?\s*(?:hs|hrs|pm|am)?/i
  );
  if (timeRangeMatch) {
    const sH = parseInt(timeRangeMatch[1]);
    const sM = timeRangeMatch[2] ? parseInt(timeRangeMatch[2]) : 0;
    const eH = parseInt(timeRangeMatch[3]);
    const eM = timeRangeMatch[4] ? parseInt(timeRangeMatch[4]) : 0;

    startTimeHour = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
    endTimeHour = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
  } else {
    const singleTimeMatch = cleanText.match(/(?:a las|arrancamos|desde las|inicio)?\s*(\d{1,2})(?::(\d{2}))?\s*(?:hs|hrs)/i);
    if (singleTimeMatch) {
      const sH = parseInt(singleTimeMatch[1]);
      const sM = singleTimeMatch[2] ? parseInt(singleTimeMatch[2]) : 0;
      startTimeHour = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
    }
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  let targetDate: Date | null = null;
  let rawDateMatched: string | undefined = undefined;

  // Pattern A: "viernes 26 de septiembre", "19 de sep", "domingo 4 de octubre de 2026"
  const dateWrittenRegex = /(?:(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\s+)?(\d{1,2})\s*(?:de|\/)\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|sep|sept|octubre|oct|noviembre|nov|diciembre|dic)(?:\s*(?:de|\/)?\s*(\d{4}))?/i;
  const matchA = cleanText.match(dateWrittenRegex);

  if (matchA) {
    const dayNum = parseInt(matchA[2]);
    const monthName = matchA[3].toLowerCase();
    const monthNum = MONTHS_MAP[monthName] !== undefined ? MONTHS_MAP[monthName] : currentMonth;
    let yearNum = matchA[4] ? parseInt(matchA[4]) : currentYear;

    if (!matchA[4] && monthNum < currentMonth - 2) {
      yearNum = currentYear + 1;
    }

    targetDate = new Date(yearNum, monthNum, dayNum);
    rawDateMatched = matchA[0];
  }

  // Pattern B: "26/09", "19-10-2026", "15.11"
  if (!targetDate) {
    const numericDateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/;
    const matchB = cleanText.match(numericDateRegex);
    if (matchB) {
      const dayNum = parseInt(matchB[1]);
      const monthNum = parseInt(matchB[2]) - 1;
      let yearNum = matchB[3] ? parseInt(matchB[3]) : currentYear;
      if (yearNum < 100) yearNum += 2000;

      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 0 && monthNum <= 11) {
        if (!matchB[3] && monthNum < currentMonth - 2) {
          yearNum = currentYear + 1;
        }
        targetDate = new Date(yearNum, monthNum, dayNum);
        rawDateMatched = matchB[0];
      }
    }
  }

  // Pattern C: "hoy", "esta noche", "mañana"
  if (!targetDate) {
    if (cleanText.includes('hoy') || cleanText.includes('esta noche') || cleanText.includes('hoy social')) {
      targetDate = new Date(referenceDate);
      rawDateMatched = 'Hoy';
    } else if (cleanText.includes('mañana') || cleanText.includes('manana')) {
      targetDate = new Date(referenceDate.getTime() + 86400000);
      rawDateMatched = 'Mañana';
    }
  }

  // Pattern D: "este viernes", "este sábado", "próximo viernes", "todos los viernes"
  if (!targetDate) {
    const dayOfWeekRegex = /(?:este|proximo|próximo|todos los|cada)\s+(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)/i;
    const matchD = cleanText.match(dayOfWeekRegex);
    if (matchD) {
      const targetDayOfWeek = DAYS_OF_WEEK_MAP[matchD[1].toLowerCase()];
      if (targetDayOfWeek !== undefined) {
        const todayDay = referenceDate.getDay();
        let diff = targetDayOfWeek - todayDay;
        if (diff < 0) diff += 7;
        targetDate = new Date(referenceDate.getTime() + diff * 86400000);
        rawDateMatched = matchD[0];
      }
    }
  }

  // Si no se encontró ninguna fecha explícita, calcular para el próximo fin de semana como tentativa
  let isTentative = false;
  if (!targetDate) {
    isTentative = true;
    const todayDay = referenceDate.getDay();
    let daysToFriday = (5 - todayDay + 7) % 7;
    if (daysToFriday === 0) daysToFriday = 7;
    targetDate = new Date(referenceDate.getTime() + daysToFriday * 86400000);
    rawDateMatched = 'Estimado (Próximo fin de semana)';
  }

  // Normalizar horas en targetDate para cálculo de días
  const eventDateClean = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const todayClean = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const diffMs = eventDateClean.getTime() - todayClean.getTime();
  const daysUntilEvent = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedDateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

  // Formato legible para español
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const readableDate = `${dayNames[targetDate.getDay()]} ${targetDate.getDate()} de ${monthNames[targetDate.getMonth()]}`;

  let validityStatus: EventValidityStatus = 'upcoming';
  let validityReason = '';

  if (isPastRecap) {
    validityStatus = 'expired';
    validityReason = '⛔ Publicación tipo resumen/recap de evento pasado.';
  } else if (daysUntilEvent < 0) {
    validityStatus = 'expired';
    const daysAgo = Math.abs(daysUntilEvent);
    validityReason = `⛔ Evento vencido: Ocurrió el ${readableDate} (hace ${daysAgo} ${daysAgo === 1 ? 'día' : 'días'}).`;
  } else if (daysUntilEvent === 0) {
    validityStatus = 'upcoming';
    validityReason = `🔥 ¡El evento es HOY (${readableDate})!`;
  } else if (daysUntilEvent === 1) {
    validityStatus = 'upcoming';
    validityReason = `✨ Mañana (${readableDate})`;
  } else if (daysUntilEvent <= 60) {
    validityStatus = isTentative ? 'tentative' : 'upcoming';
    validityReason = isTentative
      ? `🟡 Fecha estimada: ${readableDate} (en ${daysUntilEvent} días)`
      : `🟢 Vigente: ${readableDate} (en ${daysUntilEvent} días)`;
  } else {
    validityStatus = 'tentative';
    validityReason = `📅 Evento lejano: ${readableDate} (en más de 60 días)`;
  }

  return {
    startDate: formattedDateStr,
    startTimeHour,
    endTimeHour,
    validityStatus,
    validityReason,
    daysUntilEvent,
    rawDateMatched,
    isPastRecap,
  };
}

/**
 * Descarga una imagen remota y la convierte a Data URL Base64 para guardarla permanentemente
 */
async function convertRemoteImageToBase64(remoteUrl: string): Promise<string> {
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  for (const proxyGen of proxies) {
    try {
      const proxyUrl = proxyGen(remoteUrl);
      const res = await fetch(proxyUrl, { headers: { Accept: 'image/*' } });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0 && blob.type.startsWith('image/')) {
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (e) {
      // Continuar con el siguiente proxy
    }
  }

  return remoteUrl;
}

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN || '';

export interface ScrapedInstagramPost {
  url: string;
  imageUrl: string;
  caption: string;
  author: string;
  timestamp?: string;
}

/**
 * Llama al Scraper oficial de Apify para extraer las publicaciones reales de un usuario de Instagram
 */
export async function scrapeRealInstagramProfile(usernameOrUrl: string): Promise<ScrapedInstagramPost[]> {
  const input = usernameOrUrl.trim();
  if (!input) {
    throw new Error('Ingresa un usuario (@cuenta) o link de publicación de Instagram.');
  }

  let directUrl = '';
  let authorFallback = '';

  const postMatch = input.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_\-]+)/i);
  if (postMatch) {
    directUrl = `https://www.instagram.com/p/${postMatch[1]}/`;
    authorFallback = '@instagram';
  } else {
    const cleanHandle = input
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .replace(/\/.*$/, '')
      .trim();

    if (!cleanHandle) {
      throw new Error('Nombre de usuario o URL de Instagram no válido.');
    }
    directUrl = `https://www.instagram.com/${cleanHandle}/`;
    authorFallback = `@${cleanHandle}`;
  }

  const actorUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  const payload = {
    directUrls: [directUrl],
    resultsType: 'posts',
    resultsLimit: 3,
  };

  const response = await fetch(actorUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Apify respondió con estado ${response.status}: no se pudo conectar con Instagram.`);
  }

  const items: any[] = await response.json();
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`No se encontraron publicaciones públicas reales en ${directUrl}`);
  }

  return items.map((p) => ({
    url: p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : directUrl),
    imageUrl: p.displayUrl || p.firstComment?.owner?.profile_pic_url || '',
    caption: p.caption || '',
    author: p.ownerUsername ? `@${p.ownerUsername}` : authorFallback,
    timestamp: p.timestamp,
  }));
}

/**
 * Escanea un perfil de Instagram monitoreado para extraer su flyer más reciente real
 */
export async function scanInstagramAccount(account: MonitoredAccount): Promise<RadarDraftItem> {
  const { handle } = account;

  const realPosts = await scrapeRealInstagramProfile(handle);
  const newestPost = realPosts[0];

  if (!newestPost || (!newestPost.imageUrl && !newestPost.caption)) {
    throw new Error(`No se encontró ningún post con contenido en ${handle}`);
  }

  return await analyzeFlyerWithAI({
    instagramUrl: newestPost.url,
    sourceAccount: newestPost.author || handle,
    rawText: newestPost.caption || `Publicación de Instagram de ${newestPost.author || handle}`,
    imageUrl: newestPost.imageUrl,
  });
}

/**
 * Extrae la foto real y el pie de foto de una publicación o perfil de Instagram usando Apify
 */
export async function fetchRealInstagramPost(instagramUrlOrHandle: string): Promise<{
  imageUrl: string;
  caption: string;
  author: string;
  url: string;
}> {
  const posts = await scrapeRealInstagramProfile(instagramUrlOrHandle);
  if (!posts || posts.length === 0) {
    throw new Error(`No se pudo extraer ninguna publicación real de ${instagramUrlOrHandle}.`);
  }

  const post = posts[0];
  let finalBase64Image = post.imageUrl;
  if (post.imageUrl && post.imageUrl.startsWith('http')) {
    try {
      finalBase64Image = await convertRemoteImageToBase64(post.imageUrl);
    } catch (e) {
      finalBase64Image = post.imageUrl;
    }
  }

  return {
    imageUrl: finalBase64Image,
    caption: post.caption,
    author: post.author,
    url: post.url,
  };
}

/**
 * Motor de IA y Visión Artificial: analiza un texto y/o flyer para estructurar el evento y calcular vigencia
 */
/**
 * Extrae texto visible directamente de la imagen del flyer usando OCR con Tesseract.js
 */
export async function extractTextFromFlyerImage(imageUrl: string): Promise<string> {
  if (!imageUrl || imageUrl.startsWith('data:image/svg')) {
    return '';
  }

  try {
    let source = imageUrl;
    if (imageUrl.startsWith('http')) {
      try {
        source = await convertRemoteImageToBase64(imageUrl);
      } catch (err) {
        source = imageUrl;
      }
    }

    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('spa');
    const ret = await worker.recognize(source);
    await worker.terminate();
    return ret?.data?.text || '';
  } catch (err) {
    console.warn('[RadarBot OCR] Error extrayendo texto del flyer:', err);
    return '';
  }
}

/**
 * Análisis Multimodal de Visión Artificial con Gemini
 * Examina el flyer visualmente como un humano: reconoce con exactitud el título principal, organizador, lugar, dirección y precio.
 */
export async function analyzeFlyerWithGeminiVision(
  imageUrl: string,
  rawText: string,
  apiKey: string
): Promise<{
  title?: string;
  organizer_name?: string;
  venue_name?: string;
  address?: string;
  city?: string;
  start_date?: string;
  start_time_hour?: string;
  price?: number;
  is_free?: boolean;
  genre_family?: string;
} | null> {
  try {
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',');
      const matchMime = parts[0].match(/data:(.*?);base64/);
      mimeType = matchMime ? matchMime[1] : 'image/jpeg';
      base64Data = parts[1];
    } else if (imageUrl.startsWith('http')) {
      const base64Url = await convertRemoteImageToBase64(imageUrl);
      if (base64Url && base64Url.startsWith('data:')) {
        const parts = base64Url.split(',');
        const matchMime = parts[0].match(/data:(.*?);base64/);
        mimeType = matchMime ? matchMime[1] : 'image/jpeg';
        base64Data = parts[1];
      }
    }

    if (!base64Data) {
      return null;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `Eres un asistente de IA experto en auditar flyers de baile (Bachata, Salsa, etc.).
Observa cuidadosamente el diseño gráfico de este flyer y el pie de foto de Instagram adjunto:
"${rawText}"

Tu misión es extraer los datos REALES con máxima precisión, tal como los vería un humano:
1. "title": El NOMBRE o TÍTULO principal del evento (el nombre destacado o fiesta en el flyer).
2. "organizer_name": El nombre de la persona, academia o productora que organiza (o null si no figura).
3. "venue_name": Nombre del salón, boliche o club donde se hace (o null si no figura).
4. "address": Dirección física exacta (calle y número) o null si no figura.
5. "city": Barrio, localidad o ciudad (ej: "Palermo", "Morón", "Buenos Aires") o null si no figura.
6. "start_date": Fecha del evento en formato "YYYY-MM-DD". Si el año no figura, asume el año actual.
7. "start_time_hour": Hora de inicio en formato "HH:MM" (ej: "22:00").
8. "price": Si en el flyer figura un precio numérico de entrada/puerta/general, devuélvelo como número entero (ej: 8000). Si no figura ningún precio ni dice gratis, pon null.
9. "is_free": true si el flyer indica expresamente que es gratis o entrada libre; false en caso contrario.
10. "genre_family": "salsa-y-bachata" si tiene ambos ritmos salsa y bachata; "bachata" si es solo de bachata; "salsa" si es de salsa sola (cubana, venezolana, en línea, etc.); "rock" si es rock and roll o swing; "tango" si es tango o milonga; "cachengue" si es fiesta/cumbia/reggaeton; "folklore" si es folklore/peña; "urbano" si es hip hop/dancehall; u "otros".

IMPORTANTE: Si un dato no figura en el flyer, pon null. NO INVENTES NADA.
Responde únicamente con un objeto JSON válido.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[Gemini Vision] Error API ${res.status}`);
      return null;
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      return JSON.parse(candidateText);
    }
  } catch (err) {
    console.warn('[Gemini Vision] Error procesando flyer:', err);
  }

  return null;
}

/**
 * Motor de IA y Visión Artificial: analiza un texto y/o flyer para estructurar el evento y calcular vigencia
 */
export async function analyzeFlyerWithAI(params: {
  imageUrl?: string;
  rawText?: string;
  instagramUrl?: string;
  sourceAccount?: string;
}): Promise<RadarDraftItem> {
  const { imageUrl = '', rawText = '', instagramUrl, sourceAccount } = params;

  // 1. Si el usuario configuró una clave de Gemini, usar Visión Artificial Real de Google (Gemini 2.0 Flash)
  const geminiKey = getGeminiApiKey();
  if (geminiKey && imageUrl && !imageUrl.startsWith('data:image/svg')) {
    const aiResult = await analyzeFlyerWithGeminiVision(imageUrl, rawText, geminiKey);
    if (aiResult) {
      const finalTitle = aiResult.title || (sourceAccount ? `Evento de ${sourceAccount}` : 'Social de Baile');
      const finalVenue = aiResult.venue_name || 'Lugar a confirmar';
      const finalAddress = aiResult.address || 'Dirección a confirmar';
      const finalCity = aiResult.city || 'Buenos Aires';
      const finalOrganizer = aiResult.organizer_name || (sourceAccount ? sourceAccount.replace('@', '') : 'Organizador Verificado');
      const finalPrice = aiResult.is_free ? undefined : aiResult.price;
      const isFree = !!aiResult.is_free;

      const dateAnalysis = parseEventDateAndValidity(aiResult.start_date || rawText);
      const startTime = aiResult.start_date
        ? `${aiResult.start_date}T${aiResult.start_time_hour || '22:00'}:00.000Z`
        : `${dateAnalysis.startDate}T${dateAnalysis.startTimeHour}:00.000Z`;

      const finalGenreFamily = aiResult.genre_family && aiResult.genre_family !== 'caribeno'
        ? aiResult.genre_family
        : 'salsa-y-bachata';

      const finalSubgenres =
        finalGenreFamily === 'bachata' ? ['bachata-sensual'] :
        finalGenreFamily === 'salsa' ? ['salsa-cubana'] :
        finalGenreFamily === 'salsa-y-bachata' ? ['social-salsa-bachata'] :
        finalGenreFamily === 'rock' ? ['rock-and-roll'] :
        finalGenreFamily === 'tango' ? ['milonga'] :
        finalGenreFamily === 'cachengue' ? ['cachengue'] :
        finalGenreFamily === 'folklore' ? ['chacarera'] :
        finalGenreFamily === 'urbano' ? ['hiphop'] : ['fusion'];

      // Geocodificación precisa de la dirección para ubicar en el Radar de Baile
      let finalLat = -34.5880;
      let finalLng = -58.4350;
      if (finalAddress && finalAddress !== 'Dirección a confirmar') {
        try {
          const geoQuery = `${finalAddress}, ${finalCity || 'Buenos Aires'}`;
          const geoRes = await searchAddressGeocode(geoQuery);
          if (geoRes && geoRes.length > 0) {
            finalLat = geoRes[0].lat;
            finalLng = geoRes[0].lon;
          }
        } catch (gErr) {
          console.warn('Geocoding error:', gErr);
        }
      }

      return {
        id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        source_type: instagramUrl ? 'instagram_url' : imageUrl ? 'flyer_upload' : 'account_scan',
        source_url: instagramUrl,
        source_account: sourceAccount || '@instagram',
        flyer_url: imageUrl,
        raw_caption: rawText || 'Información extraída con Visión Artificial Gemini.',
        confidence_score: 99,
        status: 'pending',
        validity_status: dateAnalysis.validityStatus,
        validity_reason: dateAnalysis.validityReason,
        days_until_event: dateAnalysis.daysUntilEvent,
        detected_date_text: aiResult.start_date || dateAnalysis.rawDateMatched,
        created_at: new Date().toISOString(),
        extracted_data: {
          title: finalTitle,
          description: rawText.slice(0, 300) || `Evento organizado por ${finalOrganizer}.`,
          flyer_url: imageUrl,
          category: 'social',
          genre_family: finalGenreFamily,
          subgenres: finalSubgenres,
          start_time: startTime,
          end_time: startTime,
          timezone: 'America/Argentina/Buenos_Aires',
          venue_name: finalVenue,
          address: finalAddress,
          city: finalCity,
          province: 'Capital Federal',
          country: 'Argentina',
          latitude: finalLat,
          longitude: finalLng,
          is_free: isFree,
          price: isFree ? undefined : finalPrice,
          advance_ticket_price: undefined,
          currency: 'ARS',
          organizer_name: finalOrganizer,
          organizer_instagram: sourceAccount || '',
        },
      };
    }
  }

  // 2. Extraer texto visible del flyer mediante OCR local como respaldo
  let ocrFlyerText = '';
  if (imageUrl && !imageUrl.startsWith('data:image/svg')) {
    try {
      ocrFlyerText = await extractTextFromFlyerImage(imageUrl);
    } catch (ocrErr) {
      console.warn('OCR error:', ocrErr);
    }
  }

  // Combinar texto del pie de foto con texto detectado en el flyer
  const combinedText = `${rawText}\n${ocrFlyerText}`;
  const text = combinedText.toLowerCase();

  // Detección de Género y Familia según lo que se baila en Argentina
  let genre_family = 'salsa-y-bachata';
  let subgenres: string[] = ['social-salsa-bachata'];
  let category: EventCategory = 'social';

  const hasBachata = text.includes('bachata') || text.includes('sensual') || text.includes('dominicana');
  const hasSalsa = text.includes('salsa') || text.includes('timba') || text.includes('mambo') || text.includes('guaguanco') || text.includes('casino');

  if (hasBachata && hasSalsa) {
    genre_family = 'salsa-y-bachata';
    subgenres = ['social-salsa-bachata'];
  } else if (hasBachata) {
    genre_family = 'bachata';
    subgenres = ['bachata-sensual', 'bachata-dominicana'];
  } else if (hasSalsa) {
    genre_family = 'salsa';
    subgenres = ['salsa-cubana', 'salsa-linea'];
  } else if (text.includes('rock') || text.includes('rockabilly') || text.includes('swing') || text.includes('blues')) {
    genre_family = 'rock';
    subgenres = ['rock-and-roll'];
  } else if (text.includes('tango') || text.includes('milonga') || text.includes('vals')) {
    genre_family = 'tango';
    subgenres = ['milonga', 'tango-salon'];
  } else if (text.includes('cachengue') || text.includes('reggaeton') || text.includes('boliche') || text.includes('cumbia') || text.includes('cuarteto')) {
    genre_family = 'cachengue';
    subgenres = ['cachengue'];
  } else if (text.includes('folklore') || text.includes('chacarera') || text.includes('zamba') || text.includes('peña') || text.includes('pena')) {
    genre_family = 'folklore';
    subgenres = ['chacarera', 'pena'];
  } else if (text.includes('urbano') || text.includes('hip hop') || text.includes('dancehall')) {
    genre_family = 'urbano';
    subgenres = ['hiphop'];
  } else if (text.includes('teatro') || text.includes('varieté') || text.includes('obra')) {
    genre_family = 'otros';
    subgenres = [];
    category = 'festival';
  }

  if (text.includes('taller') || text.includes('workshop')) {
    category = 'taller';
  } else if (text.includes('clase') || text.includes('seminario')) {
    category = 'clase';
  }

  // Extracción Avanzada de Fechas y Vigencia sobre el texto combinado
  const dateAnalysis = parseEventDateAndValidity(combinedText);

  // Extracción Inteligente de Precios: ÚNICAMENTE lo que dice el flyer
  const is_free = /\b(gratis|entrada libre|free pass|sin cargo|acceso libre|sin costo|acceso gratuito|gratuita)\b/i.test(text);

  let price: number | undefined = undefined;

  if (!is_free) {
    // 1. Buscar precio explícito con palabra clave: puerta, entrada, valor, precio, ticket, costo
    const explicitPriceMatch = combinedText.match(/(?:puerta|en puerta|entrada|valor|precio|ticket|costo|social)[\s:]*\$?[\s]*(\d{1,3}(?:\.\d{3})+|\d{4,6})/i);
    if (explicitPriceMatch) {
      const val = parseInt(explicitPriceMatch[1].replace(/\./g, ''), 10);
      if (val >= 500 && val <= 250000) {
        price = val;
      }
    }

    // 2. Si no hubo palabra clave pero hay un signo pesos ($8000, $8.000)
    if (!price) {
      const dollarMatch = combinedText.match(/\$\s?(\d{1,3}(?:\.\d{3})+|\d{4,6})/i);
      if (dollarMatch) {
        const val = parseInt(dollarMatch[1].replace(/\./g, ''), 10);
        if (val >= 500 && val <= 250000) {
          price = val;
        }
      }
    }

    // 3. Si dice "8000 pesos" o "8000$"
    if (!price) {
      const suffixMatch = combinedText.match(/(\d{1,3}(?:\.\d{3})+|\d{4,6})\s*(?:pesos|\$)/i);
      if (suffixMatch) {
        const val = parseInt(suffixMatch[1].replace(/\./g, ''), 10);
        if (val >= 500 && val <= 250000) {
          price = val;
        }
      }
    }
  }

  // Dirección y Lugar: solo lo que figure en el flyer
  let venueName = 'Lugar a confirmar';
  let address = 'Dirección a confirmar';
  let city = 'Buenos Aires';

  if (text.includes('palermo')) city = 'Buenos Aires (Palermo)';
  if (text.includes('san telmo')) city = 'Buenos Aires (San Telmo)';
  if (text.includes('villa crespo')) city = 'Buenos Aires (Villa Crespo)';
  if (text.includes('recoleta')) city = 'Buenos Aires (Recoleta)';
  if (text.includes('belgrano')) city = 'Buenos Aires (Belgrano)';
  if (text.includes('microcentro') || text.includes('obelisco')) city = 'Buenos Aires (Microcentro)';
  if (text.includes('merlo')) city = 'Merlo';
  if (text.includes('moron') || text.includes('morón')) city = 'Morón';
  if (text.includes('ramos mejia') || text.includes('ramos mejía')) city = 'Ramos Mejía';

  const addressMatch = combinedText.match(/(?:📍|en\s+|calle\s+|av\.\s+|ubicación:?|direccion:?|dirección:?)\s*([A-Za-zÁÉÍÓÚáéíóúñ\.\s]+\d{2,5})/i);
  if (addressMatch) {
    address = addressMatch[1].trim();
  }

  const venueMatch = combinedText.match(/(?:📍|lugar:?|salon:?|salón:?)\s*([A-Za-zÁÉÍÓÚáéíóúñ\s]{3,35})/i);
  if (venueMatch) {
    venueName = venueMatch[1].trim();
  }

  // Organizador: si el flyer lo menciona o la cuenta que lo publica
  let organizerName = sourceAccount ? sourceAccount.replace('@', '') : 'Organizador Verificado';
  const orgMatch = combinedText.match(/(?:organiza|organizan|organizador|producción|produce|de la mano de)[\s:]+([A-Za-zÁÉÍÓÚáéíóúñ\s]{3,30})/i);
  if (orgMatch && orgMatch[1]) {
    organizerName = orgMatch[1].trim();
  }

  // Título del evento: solo el texto del flyer
  let title = '';
  const titleCandidates = (ocrFlyerText ? `${ocrFlyerText}\n${rawText}` : rawText)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 3 && l.length < 70 && !l.toLowerCase().includes('http') && !/^(clases?|viernes|sabado|sábado|domingo|📍|🎟️|\$)/i.test(l));

  if (titleCandidates.length > 0) {
    title = titleCandidates[0].replace(/^[🔥✨💃🕺🎉📍🎟️🎸🎵\s]+/, '').trim();
  }
  if (!title) {
    title = sourceAccount ? `Evento de ${sourceAccount}` : 'Social de Baile';
  }

  const start_time = `${dateAnalysis.startDate}T${dateAnalysis.startTimeHour}:00.000Z`;
  const end_time = `${dateAnalysis.startDate}T${dateAnalysis.endTimeHour}:00.000Z`;

  const finalFlyerUrl = imageUrl || createFallbackFlyerSvg(title, `${venueName} • ${city}`, genre_family);

  // Geocodificación precisa de la dirección para ubicar en el Radar de Baile
  let finalLat = -34.5880;
  let finalLng = -58.4350;
  if (address && address !== 'Dirección a confirmar') {
    try {
      const geoQuery = `${address}, ${city || 'Buenos Aires'}`;
      const geoRes = await searchAddressGeocode(geoQuery);
      if (geoRes && geoRes.length > 0) {
        finalLat = geoRes[0].lat;
        finalLng = geoRes[0].lon;
      }
    } catch (gErr) {
      console.warn('Geocoding error:', gErr);
    }
  }

  const draft: RadarDraftItem = {
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    source_type: instagramUrl ? 'instagram_url' : imageUrl ? 'flyer_upload' : 'account_scan',
    source_url: instagramUrl,
    source_account: sourceAccount || '@instagram',
    flyer_url: finalFlyerUrl,
    raw_caption: ocrFlyerText ? `${rawText}\n\n[Texto detectado en Flyer]:\n${ocrFlyerText.trim()}` : rawText || 'Información extraída de Instagram.',
    confidence_score: dateAnalysis.validityStatus === 'upcoming' ? 96 : 85,
    status: 'pending',
    validity_status: dateAnalysis.validityStatus,
    validity_reason: dateAnalysis.validityReason,
    days_until_event: dateAnalysis.daysUntilEvent,
    detected_date_text: dateAnalysis.rawDateMatched,
    created_at: new Date().toISOString(),
    extracted_data: {
      title,
      description: rawText.slice(0, 300) || `Información del evento organizado por ${sourceAccount || 'el organizador'}.`,
      flyer_url: finalFlyerUrl,
      category,
      genre_family,
      subgenres,
      start_time,
      end_time,
      timezone: 'America/Argentina/Buenos_Aires',
      venue_name: venueName,
      address,
      city,
      province: 'Capital Federal',
      country: 'Argentina',
      latitude: finalLat,
      longitude: finalLng,
      is_free,
      price: is_free ? undefined : price,
      advance_ticket_price: undefined,
      currency: 'ARS',
      organizer_name: organizerName,
      organizer_instagram: sourceAccount || '',
    },
  };

  return draft;
}

