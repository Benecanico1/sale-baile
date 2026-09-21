import type { UserProfile, EventItem, UserRole } from '../types';

const RTDB_BASE = 'https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile';
const EVENTS_URL = `${RTDB_BASE}/events.json`;
const REQUESTS_URL = `${RTDB_BASE}/requests.json`;

// BroadcastChannel para sincronización instantánea entre pestañas del mismo navegador
export const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('sale_baile_channel_v4')
  : null;

export interface CloudRequestItem {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  zone?: string;
  profile_type?: 'bailarin' | 'profesor' | 'organizador' | 'dueno_local';
  teacher_academy?: string;
  teacher_genres?: string[];
  teacher_days?: string[];
  teacher_levels?: string[];
  venue_name_registered?: string;
  venue_capacity?: number;
  venue_address?: string;
  venue_features?: string[];
  role: UserRole;
  organizer_status: 'pending' | 'approved' | 'rejected' | 'none';
  organizer_request_date: string;
  organizer_request_notes?: string;
  phone?: string;
  whatsapp_phone?: string;
  instagram_handle?: string;
  facebook_url?: string;
  favorite_genres?: string[];
  onboarding_completed?: boolean;
  avatar_url?: string;
  created_at: string;
}

function notifySync() {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'SYNC_UPDATE', timestamp: Date.now() });
    } catch (e) {}
  }
}

/**
 * Obtiene todos los eventos sincronizados en Firebase RTDB directamente
 */
export async function fetchCloudEvents(): Promise<EventItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(EVENTS_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const list: EventItem[] = Array.isArray(data) ? data : (data && typeof data === 'object') ? Object.values(data) : [];
      return list.filter((e) => e.id !== 'evt-merlo-bachata-los-patos' && !e.flyer_url?.includes('flyer_bachata_patos_18hs.jpg'));
    }
    return [];
  } catch (error) {
    console.warn('Could not fetch cloud events:', error);
    return [];
  }
}

/**
 * Obtiene todas las solicitudes de organizador registradas en Firebase RTDB
 */
export async function fetchCloudOrganizerRequests(): Promise<CloudRequestItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(REQUESTS_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object') return Object.values(data);
    }
    return [];
  } catch (error) {
    console.warn('Could not fetch cloud organizer requests:', error);
    return [];
  }
}

/**
 * Guarda o sincroniza la lista completa de eventos en Firebase RTDB de forma directa
 */
export async function syncCloudEvents(events: EventItem[]): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(EVENTS_URL, {
      method: 'PUT',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      notifySync();
    }
    return res.ok;
  } catch (error) {
    console.error('Error syncing cloud events directly:', error);
    return false;
  }
}

/**
 * Actualiza atómicamente el estado de un evento en Firebase RTDB
 */
export async function updateCloudEventStatus(
  eventId: string,
  newStatus?: 'publicado' | 'pendiente' | 'rechazado' | 'borrador',
  isFeatured?: boolean,
  rejectionReason?: string
): Promise<boolean> {
  try {
    const currentEvents = await fetchCloudEvents();
    if (!currentEvents || currentEvents.length === 0) return false;

    let found = false;
    const updated = currentEvents.map((evt) => {
      if (evt.id === eventId) {
        found = true;
        return {
          ...evt,
          status: newStatus !== undefined ? newStatus : evt.status,
          is_featured: isFeatured !== undefined ? isFeatured : evt.is_featured,
          featured_fee_paid: isFeatured ? true : evt.featured_fee_paid,
          rejection_reason: rejectionReason !== undefined ? rejectionReason : evt.rejection_reason,
          updated_at: new Date().toISOString(),
        };
      }
      return evt;
    });

    if (!found) return false;

    return await syncCloudEvents(updated);
  } catch (error) {
    console.error('Error updating cloud event status:', error);
    return false;
  }
}

/**
 * Elimina definitivamente un evento/flyer de Firebase RTDB
 */
export async function deleteCloudEvent(eventId: string): Promise<boolean> {
  try {
    const currentEvents = await fetchCloudEvents();
    if (!currentEvents || currentEvents.length === 0) return false;

    const filtered = currentEvents.filter((evt) => evt.id !== eventId);
    return await syncCloudEvents(filtered);
  } catch (error) {
    console.error('Error deleting cloud event:', error);
    return false;
  }
}

/**
 * Elimina duplicados por correo en las solicitudes de organizador
 */
export function deduplicateCloudRequests(requests: CloudRequestItem[]): CloudRequestItem[] {
  const map = new Map<string, CloudRequestItem>();
  for (const r of requests) {
    if (!r || !r.email) continue;
    const normEmail = r.email.toLowerCase().trim();
    // Excluir únicamente los correos con error de tipeo previo
    if (normEmail === 'cursoplati2022@gmail.com' || normEmail === 'cursoplaxi2022@gmail.com') continue;

    const existing = map.get(normEmail);
    if (!existing) {
      map.set(normEmail, { ...r, email: normEmail });
    } else {
      // Si alguno de los dos tiene solicitud pendiente, mantenerla como pendiente para que el administrador la vea
      const isPending = r.organizer_status === 'pending' || existing.organizer_status === 'pending';
      const isApproved = !isPending && (r.organizer_status === 'approved' || existing.organizer_status === 'approved' || r.role === 'organizer' || existing.role === 'organizer');
      const isRejected = !isPending && !isApproved && (r.organizer_status === 'rejected' || existing.organizer_status === 'rejected');

      const finalStatus: 'pending' | 'approved' | 'rejected' | 'none' = isPending
        ? 'pending'
        : isApproved
        ? 'approved'
        : isRejected
        ? 'rejected'
        : 'none';
      const finalRole: UserRole = isApproved ? 'organizer' : (existing.role || r.role || 'user');

      // Preservar onboarding y géneros favoritos si cualquiera de las dos fuentes lo tiene
      const hasOnboarding = Boolean(existing.onboarding_completed || r.onboarding_completed || isApproved);
      const favGenres = (existing.favorite_genres && existing.favorite_genres.length > 0)
        ? existing.favorite_genres.map(g => g === 'caribeno' ? 'salsa-y-bachata' : g)
        : (r.favorite_genres && r.favorite_genres.length > 0)
        ? r.favorite_genres.map(g => g === 'caribeno' ? 'salsa-y-bachata' : g)
        : ['salsa-y-bachata', 'bachata', 'salsa'];

      map.set(normEmail, {
        ...r, // Base con datos antiguos de la base de datos
        ...existing, // Sobrescribir con datos nuevos/recientes del usuario
        id: existing.id || r.id,
        email: normEmail,
        full_name: existing.full_name || r.full_name,
        first_name: existing.first_name !== undefined && existing.first_name !== '' ? existing.first_name : (r.first_name || ''),
        last_name: existing.last_name !== undefined && existing.last_name !== '' ? existing.last_name : (r.last_name || ''),
        zone: existing.zone !== undefined && existing.zone !== '' ? existing.zone : (r.zone || ''),
        profile_type: existing.profile_type || r.profile_type || 'bailarin',
        teacher_academy: existing.teacher_academy !== undefined && existing.teacher_academy !== '' ? existing.teacher_academy : (r.teacher_academy || ''),
        teacher_genres: (existing.teacher_genres && existing.teacher_genres.length > 0) ? existing.teacher_genres : (r.teacher_genres || []),
        teacher_days: (existing.teacher_days && existing.teacher_days.length > 0) ? existing.teacher_days : (r.teacher_days || []),
        teacher_levels: (existing.teacher_levels && existing.teacher_levels.length > 0) ? existing.teacher_levels : (r.teacher_levels || []),
        venue_name_registered: existing.venue_name_registered !== undefined && existing.venue_name_registered !== '' ? existing.venue_name_registered : (r.venue_name_registered || ''),
        venue_capacity: existing.venue_capacity !== undefined ? existing.venue_capacity : r.venue_capacity,
        venue_address: existing.venue_address !== undefined && existing.venue_address !== '' ? existing.venue_address : (r.venue_address || ''),
        venue_features: (existing.venue_features && existing.venue_features.length > 0) ? existing.venue_features : (r.venue_features || []),
        role: finalRole,
        organizer_status: finalStatus,
        phone: existing.phone || r.phone || existing.whatsapp_phone || r.whatsapp_phone || '',
        whatsapp_phone: existing.whatsapp_phone || r.whatsapp_phone || existing.phone || r.phone || '',
        instagram_handle: existing.instagram_handle !== undefined && existing.instagram_handle !== '' ? existing.instagram_handle : (r.instagram_handle || ''),
        facebook_url: existing.facebook_url !== undefined && existing.facebook_url !== '' ? existing.facebook_url : (r.facebook_url || ''),
        organizer_request_notes: existing.organizer_request_notes || r.organizer_request_notes,
        organizer_request_date: existing.organizer_request_date || r.organizer_request_date,
        favorite_genres: favGenres,
        onboarding_completed: hasOnboarding,
        avatar_url: existing.avatar_url || r.avatar_url,
        created_at: r.created_at || existing.created_at,
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Guarda o actualiza una solicitud de organizador en Firebase RTDB garantizando unicidad de correo
 */
export async function submitCloudOrganizerRequest(userProfile: UserProfile): Promise<boolean> {
  try {
    const currentRequests = await fetchCloudOrganizerRequests();
    const normEmail = userProfile.email.toLowerCase().trim();
    if (normEmail === 'cursoplati2022@gmail.com' || normEmail === 'cursoplaxi2022@gmail.com') return false;

    const newItem: CloudRequestItem = {
      id: userProfile.id || `user-${Date.now()}`,
      email: normEmail,
      full_name: userProfile.full_name || 'Organizador',
      first_name: userProfile.first_name,
      last_name: userProfile.last_name,
      zone: userProfile.zone,
      profile_type: userProfile.profile_type,
      teacher_academy: userProfile.teacher_academy,
      teacher_genres: userProfile.teacher_genres,
      teacher_days: userProfile.teacher_days,
      teacher_levels: userProfile.teacher_levels,
      venue_name_registered: userProfile.venue_name_registered,
      venue_capacity: userProfile.venue_capacity,
      venue_address: userProfile.venue_address,
      venue_features: userProfile.venue_features,
      role: userProfile.role || 'user',
      organizer_status: userProfile.organizer_status || 'none',
      organizer_request_date: userProfile.organizer_request_date || new Date().toISOString(),
      organizer_request_notes: userProfile.organizer_request_notes || 'Usuario registrado en Sale Baile.',
      phone: userProfile.phone,
      whatsapp_phone: userProfile.whatsapp_phone || userProfile.phone,
      instagram_handle: userProfile.instagram_handle,
      facebook_url: userProfile.facebook_url,
      favorite_genres: userProfile.favorite_genres && userProfile.favorite_genres.length > 0 ? userProfile.favorite_genres.map(g => g === 'caribeno' ? 'salsa-y-bachata' : g) : ['salsa-y-bachata', 'bachata', 'salsa'],
      onboarding_completed: userProfile.onboarding_completed !== undefined ? userProfile.onboarding_completed : true,
      avatar_url: userProfile.avatar_url,
      created_at: userProfile.created_at || new Date().toISOString(),
    };

    const updatedRequests = deduplicateCloudRequests([newItem, ...currentRequests]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(REQUESTS_URL, {
      method: 'PUT',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRequests),
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      notifySync();
    }
    return res.ok;
  } catch (error) {
    console.error('Error submitting cloud organizer request:', error);
    return false;
  }
}

/**
 * Actualiza el estado (aprobado / rechazado / bajado a usuario) de una solicitud en Firebase RTDB
 */
export async function updateCloudOrganizerStatus(
  userIdOrEmail: string,
  newStatus: 'approved' | 'rejected' | 'none'
): Promise<boolean> {
  try {
    const currentRequests = await fetchCloudOrganizerRequests();
    const target = userIdOrEmail.toLowerCase().trim();

    const updatedRequests = deduplicateCloudRequests(
      currentRequests.map((item) => {
        if (item.id.toLowerCase() === target || item.email.toLowerCase() === target) {
          return {
            ...item,
            organizer_status: newStatus === 'none' ? 'none' : newStatus,
            role: (newStatus === 'approved' ? 'organizer' : 'user') as UserRole,
          };
        }
        return item;
      })
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(REQUESTS_URL, {
      method: 'PUT',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRequests),
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      notifySync();
    }
    return res.ok;
  } catch (error) {
    console.error('Error updating cloud organizer status:', error);
    return false;
  }
}

/**
 * Elimina de forma permanente una solicitud / usuario organizador de la base de datos de la nube
 */
export async function deleteCloudOrganizerRequest(userIdOrEmail: string): Promise<boolean> {
  try {
    const currentRequests = await fetchCloudOrganizerRequests();
    const target = userIdOrEmail.toLowerCase().trim();

    const filtered = currentRequests.filter(
      (item) => item.id.toLowerCase() !== target && item.email.toLowerCase() !== target
    );
    const cleaned = deduplicateCloudRequests(filtered);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(REQUESTS_URL, {
      method: 'PUT',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaned),
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      notifySync();
    }
    return res.ok;
  } catch (error) {
    console.error('Error deleting cloud organizer request:', error);
    return false;
  }
}



