/**
 * Utilidades de Fecha y Horarios para Bachata Hoy
 * Manejo de huso horario local (Argentina), eventos que cruzan la medianoche y filtros rápidos.
 */

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Formatea un rango de horario que puede cruzar la medianoche.
 * Ej: "Sáb 13 Sep • 22:30 a 05:00 (+1d)"
 */
export function formatEventSchedule(startIso: string, endIso: string): {
  dateLabel: string;
  timeRange: string;
  startTime: string;
  isMidnightCrossing: boolean;
  relativeBadge?: string;
} {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  
  const dayName = DAYS_ES[start.getDay()];
  const dayNum = start.getDate();
  const monthName = MONTHS_ES[start.getMonth()];
  
  const startHours = String(start.getHours()).padStart(2, '0');
  const startMinutes = String(start.getMinutes()).padStart(2, '0');
  const endHours = String(end.getHours()).padStart(2, '0');
  const endMinutes = String(end.getMinutes()).padStart(2, '0');
  
  const isDifferentDay = start.toDateString() !== end.toDateString();
  
  const dateLabel = `${dayName} ${dayNum} de ${monthName}`;
  const startTime = `${startHours}:${startMinutes} hs`;
  const timeRange = isDifferentDay 
    ? `${startHours}:${startMinutes} a ${endHours}:${endMinutes} (+1 día)` 
    : `${startHours}:${startMinutes} a ${endHours}:${endMinutes} hs`;

  // Badge relativo (Hoy, Mañana, etc.)
  const now = new Date();
  const todayStr = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toDateString();
  
  let relativeBadge: string | undefined;
  if (start.toDateString() === todayStr) {
    relativeBadge = 'HOY';
  } else if (start.toDateString() === tomorrowStr) {
    relativeBadge = 'MAÑANA';
  }

  return {
    dateLabel,
    timeRange,
    startTime,
    isMidnightCrossing: isDifferentDay,
    relativeBadge
  };
}

export const EVENT_EXPIRATION_HOURS = 24;

/**
 * Retorna la fecha exacta de expiración (24 horas después de la finalización del evento).
 */
export function getEventExpirationDate(endIso: string): Date {
  const end = parseISODate(endIso);
  return new Date(end.getTime() + EVENT_EXPIRATION_HOURS * 60 * 60 * 1000);
}

/**
 * Verifica si un evento ha caducado (han pasado más de 24 horas desde que finalizó).
 * Al caducar, el flyer pasa automáticamente a la zona de Historial.
 */
export function isEventExpired(endIso: string): boolean {
  const expiration = getEventExpirationDate(endIso);
  return Date.now() > expiration.getTime();
}

/**
 * Verifica si un evento ya finalizó en vivo (para badges de "En Vivo" o "Finalizado"),
 * pero aún sigue visible en cartelera antes de cumplir las 24 horas de caducidad.
 */
export function isEventFinished(endIso: string): boolean {
  const end = parseISODate(endIso);
  return end.getTime() < Date.now();
}

/**
 * Retorna el tiempo restante antes de que un evento finalizado pase al historial
 */
export function getHoursUntilArchive(endIso: string): number {
  const expiration = getEventExpirationDate(endIso);
  const diffMs = expiration.getTime() - Date.now();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
}

/**
 * Genera el enlace para Google Calendar
 */
export function generateGoogleCalendarUrl(event: {
  title: string;
  description: string;
  venue_name: string;
  address: string;
  city: string;
  start_time: string;
  end_time: string;
}): string {
  const formatForGCal = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };
  
  const start = parseISODate(event.start_time);
  const end = parseISODate(event.end_time);
  const datesParam = `${formatForGCal(start)}/${formatForGCal(end)}`;
  const locationParam = encodeURIComponent(`${event.venue_name}, ${event.address}, ${event.city}`);
  const detailsParam = encodeURIComponent(event.description);
  const textParam = encodeURIComponent(event.title);
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${textParam}&dates=${datesParam}&details=${detailsParam}&location=${locationParam}`;
}

/**
 * Comprueba si una fecha cae en el fin de semana más próximo (Viernes tarde, Sábado o Domingo)
 */
export function isThisWeekend(date: Date): boolean {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Dom, 5 = Vie, 6 = Sáb
  
  // Calcular el viernes de esta semana
  const friday = new Date(now);
  const diffToFriday = (5 - currentDay + 7) % 7;
  friday.setDate(now.getDate() + (diffToFriday === 0 && now.getHours() >= 20 ? 0 : diffToFriday));
  friday.setHours(0, 0, 0, 0);
  
  // Calcular el domingo por la noche
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);
  
  return date >= friday && date <= sunday;
}
