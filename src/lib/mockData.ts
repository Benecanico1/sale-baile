import type { EventItem, UserProfile } from '../types';

function getRelativeDate(daysOffset: number, startHour: number, endHour: number): { start: string; end: string } {
  const start = new Date();
  start.setDate(start.getDate() + daysOffset);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(start);
  if (endHour < startHour) {
    end.setDate(end.getDate() + 1);
  }
  end.setHours(endHour, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export const KNOWN_ORGANIZER_EMAILS: string[] = [];

export const isAuthorizedOrganizer = (_email?: string): boolean => {
  return false;
};

export const MOCK_ORGANIZERS: UserProfile[] = [];

export const MOCK_ADMIN: UserProfile = {
  id: 'admin-jesus',
  email: 'jesushidalgo25@gmail.com',
  full_name: 'Jesús Hidalgo (Admin)',
  role: 'admin',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  bio: 'Administrador general y moderador oficial de Sale Baile.',
  created_at: '2026-01-01T00:00:00Z',
};

// Eventos demo eliminados — variables de fecha ya no necesarias
void getRelativeDate;

// Eventos demo eliminados — Sale Baile ahora solo muestra eventos REALES cargados por organizadores.
// Antes había 6 eventos ficticios hardcoded que confundían a los usuarios.
export const INITIAL_MOCK_EVENTS: EventItem[] = [];

export const INITIAL_MOCK_REVIEWS: any[] = [];

export const INITIAL_MOCK_PROMOTERS: any[] = [];
