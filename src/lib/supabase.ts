import { createClient } from '@supabase/supabase-js';
import type { EventItem, EventReport, EventReview, PromoterSeller, PromoterCustomFlyer } from '../types';
import { INITIAL_MOCK_REVIEWS, INITIAL_MOCK_PROMOTERS } from './mockData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const STORAGE_EVENTS_KEY = 'sale_baile_events_v5';
const STORAGE_FAVS_KEY = 'bachata_hoy_favs_v1';
const STORAGE_REPORTS_KEY = 'sale_baile_reports_v5';
const STORAGE_REVIEWS_KEY = 'sale_baile_reviews_v5';
const STORAGE_PROMOTERS_KEY = 'bachata_hoy_promoters_v1';

export function getLocalEvents(): EventItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (saved) {
      const parsed: EventItem[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Devolver solo eventos reales guardados en localStorage.
        // Sin eventos demo, sin mezclar con datos inventados.
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading localStorage events', e);
  }
  // No hay eventos reales → devolver array vacio.
  // La cartelera mostrara el estado de "sin eventos" correctamente.
  return [];
}

export function saveLocalEvents(events: EventItem[]): void {
  try {
    localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn('Error saving to localStorage', e);
  }
}

export function getLocalFavorites(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_FAVS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

export function toggleLocalFavorite(eventId: string): string[] {
  const favs = getLocalFavorites();
  const exists = favs.includes(eventId);
  const updated = exists ? favs.filter(id => id !== eventId) : [...favs, eventId];
  try {
    localStorage.setItem(STORAGE_FAVS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function getLocalReports(): EventReport[] {
  try {
    const saved = localStorage.getItem(STORAGE_REPORTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

export function saveLocalReport(report: Omit<EventReport, 'id' | 'created_at' | 'is_resolved'>): void {
  const reports = getLocalReports();
  const newReport: EventReport = {
    ...report,
    id: `rep-${Date.now()}`,
    created_at: new Date().toISOString(),
    is_resolved: false,
  };
  try {
    localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify([newReport, ...reports]));
  } catch (e) {}
}

export function resolveLocalReport(reportId: string): void {
  const reports = getLocalReports().map(r => 
    r.id === reportId ? { ...r, is_resolved: true } : r
  );
  try {
    localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(reports));
  } catch (e) {}
}

export function getLocalReviews(): EventReview[] {
  try {
    const saved = localStorage.getItem(STORAGE_REVIEWS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return INITIAL_MOCK_REVIEWS;
}

export function saveLocalReview(reviewData: Omit<EventReview, 'id' | 'created_at'>): EventReview[] {
  const reviews = getLocalReviews();
  const newReview: EventReview = {
    ...reviewData,
    id: `rev-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const updated = [newReview, ...reviews];
  try {
    localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function getLocalPromoters(): PromoterSeller[] {
  try {
    const saved = localStorage.getItem(STORAGE_PROMOTERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return INITIAL_MOCK_PROMOTERS;
}

export function saveLocalPromoter(promoter: PromoterSeller): PromoterSeller[] {
  const list = getLocalPromoters();
  const existsIndex = list.findIndex(p => p.id === promoter.id || p.email.toLowerCase() === promoter.email.toLowerCase());
  let updated: PromoterSeller[];
  if (existsIndex >= 0) {
    updated = list.map((p, idx) => idx === existsIndex ? { ...p, ...promoter } : p);
  } else {
    updated = [promoter, ...list];
  }
  try {
    localStorage.setItem(STORAGE_PROMOTERS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function updateLocalPromoter(promoterId: string, updates: Partial<PromoterSeller>): PromoterSeller[] {
  const list = getLocalPromoters();
  const updated = list.map(p => p.id === promoterId ? { ...p, ...updates } : p);
  try {
    localStorage.setItem(STORAGE_PROMOTERS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function deleteLocalPromoter(promoterId: string): PromoterSeller[] {
  const list = getLocalPromoters();
  const updated = list.filter(p => p.id !== promoterId);
  try {
    localStorage.setItem(STORAGE_PROMOTERS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function saveCustomFlyerForPromoter(promoterEmail: string, flyer: PromoterCustomFlyer): PromoterSeller[] {
  const list = getLocalPromoters();
  const updated = list.map(p => {
    if (p.email.toLowerCase() === promoterEmail.toLowerCase()) {
      const existingFlyers = p.custom_flyers || [];
      return {
        ...p,
        custom_flyers: [flyer, ...existingFlyers],
      };
    }
    return p;
  });
  try {
    localStorage.setItem(STORAGE_PROMOTERS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function deleteCustomFlyerForPromoter(promoterEmail: string, flyerId: string): PromoterSeller[] {
  const list = getLocalPromoters();
  const updated = list.map(p => {
    if (p.email.toLowerCase() === promoterEmail.toLowerCase()) {
      return {
        ...p,
        custom_flyers: (p.custom_flyers || []).filter(f => f.id !== flyerId),
      };
    }
    return p;
  });
  try {
    localStorage.setItem(STORAGE_PROMOTERS_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}


