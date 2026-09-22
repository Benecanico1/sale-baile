/**
 * Bot Results — Lectura de datos generados por los bots desde Firebase RTDB
 */

const FIREBASE_BASE = 'https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile';

export interface BotLead {
  handle: string;
  full_name?: string;
  avatar_url?: string;
  score: number;
  status: 'new' | 'contacted' | 'joined' | 'declined';
  event_posts_count: number;
  total_likes?: number;
  total_comments?: number;
  dance_style?: string;
  event_type?: string;
  location_mentioned?: string;
  outreach_message?: string;
  dm_status?: string;
  last_contacted_at?: string;
  detected_at?: string;
  sample_caption?: string;
  score_reasons?: string[];
}

export interface BotEvent {
  id: string;
  title: string;
  status: string;
  organizer_instagram?: string;
  organizer_name?: string;
  start_time?: string;
  venue_name?: string;
  city?: string;
  genre_family?: string;
  is_free?: boolean;
  price?: number | string;
  source?: string;
}

export interface BotReport {
  organizer: string;
  week_start: string;
  week_end: string;
  stats: {
    total_events: number;
    published: number;
    pending: number;
    featured: number;
    future_events: number;
    total_views: number;
    total_clicks: number;
    total_favorites: number;
    total_tickets_sold: number;
    genres: Record<string, number>;
  };
  suggestions: string[];
  generated_at: string;
}

export interface BotDraft {
  id: string;
  source_account: string;
  title: string;
  start_date?: string;
  venue_name?: string;
  city?: string;
  genre_family?: string;
  is_free?: boolean;
  price?: number;
  status: 'pending' | 'published' | 'dismissed';
  detected_at: string;
  notification_message?: string;
}

async function fetchFirebase(path: string): Promise<any> {
  try {
    const resp = await fetch(`${FIREBASE_BASE}/${path}.json`, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function fetchLeads(): Promise<Record<string, BotLead>> {
  const data = await fetchFirebase('leads');
  if (!data || typeof data !== 'object') return {};
  return data as Record<string, BotLead>;
}

export async function fetchBotEvents(): Promise<BotEvent[]> {
  const data = await fetchFirebase('events');
  if (!data) return [];
  if (Array.isArray(data)) return (data.filter(Boolean) as BotEvent[]);
  if (typeof data === 'object') return (Object.values(data).filter(Boolean) as BotEvent[]);
  return [];
}

export async function fetchReports(): Promise<Record<string, BotReport>> {
  const data = await fetchFirebase('weekly_reports');
  if (!data || typeof data !== 'object') return {};
  return data as Record<string, BotReport>;
}

export async function fetchDrafts(): Promise<Record<string, BotDraft>> {
  const data = await fetchFirebase('auto_drafts');
  if (!data || typeof data !== 'object') return {};
  return data as Record<string, BotDraft>;
}

export async function fetchVPSLogs(): Promise<string | null> {
  try {
    const resp = await fetch('http://129.146.75.135:8585/api/bots', { signal: AbortSignal.timeout(5000) });
    if (resp.ok) return 'online';
    return 'offline';
  } catch {
    return 'offline';
  }
}
