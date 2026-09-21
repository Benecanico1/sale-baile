const CLICKS_STORAGE_KEY = 'salebaile_event_clicks';

/**
 * Obtiene el número de clics o visualizaciones que tiene un flyer.
 * Si no tiene clics registrados, calcula una base inicial sutil basada en el ID.
 */
export function getEventClicks(eventId: string, initialBase?: number): number {
  try {
    const raw = localStorage.getItem(CLICKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (map[eventId] !== undefined) {
      return Number(map[eventId]);
    }
  } catch (e) {}

  if (initialBase !== undefined && initialBase > 0) {
    return initialBase;
  }

  // Si no tiene base, generar un conteo inicial orgánico (12 a 45 clics)
  const charSum = eventId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 12 + (charSum % 35);
}

/**
 * Registra y aumenta en 1 el contador de clics cuando alguien presiona el flyer o "Ver detalles".
 */
export function recordEventClick(eventId: string): number {
  try {
    const raw = localStorage.getItem(CLICKS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const current = map[eventId] !== undefined ? Number(map[eventId]) : getEventClicks(eventId);
    const next = current + 1;
    map[eventId] = next;
    localStorage.setItem(CLICKS_STORAGE_KEY, JSON.stringify(map));
    return next;
  } catch (e) {
    return 1;
  }
}
