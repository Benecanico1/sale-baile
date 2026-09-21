import type { CityPreset } from '../types';

/**
 * Presets de ciudades principales de Argentina para selección manual rápida
 */
export const ARGENTINA_CITY_PRESETS: CityPreset[] = [
  { name: 'Buenos Aires (CABA)', province: 'Capital Federal', latitude: -34.6037, longitude: -58.3816 },
  { name: 'Zona Norte (San Isidro / Vicente López)', province: 'Buenos Aires', latitude: -34.4714, longitude: -58.5284 },
  { name: 'Zona Sur (Quilmes / Lomas de Zamora)', province: 'Buenos Aires', latitude: -34.7242, longitude: -58.2608 },
  { name: 'Zona Oeste (Morón / Ramos Mejía)', province: 'Buenos Aires', latitude: -34.6534, longitude: -58.6198 },
  { name: 'La Plata', province: 'Buenos Aires', latitude: -34.9214, longitude: -57.9545 },
  { name: 'Córdoba Capital', province: 'Córdoba', latitude: -31.4201, longitude: -64.1888 },
  { name: 'Rosario', province: 'Santa Fe', latitude: -32.9468, longitude: -60.6393 },
  { name: 'Mendoza Capital', province: 'Mendoza', latitude: -32.8895, longitude: -68.8458 },
  { name: 'Mar del Plata', province: 'Buenos Aires', latitude: -38.0055, longitude: -57.5562 },
  { name: 'San Miguel de Tucumán', province: 'Tucumán', latitude: -26.8241, longitude: -65.2226 },
  { name: 'Salta Capital', province: 'Salta', latitude: -24.7859, longitude: -65.4117 },
  { name: 'Neuquén Capital', province: 'Neuquén', latitude: -38.9516, longitude: -68.0591 },
];

/**
 * Fórmula de Haversine para calcular distancia en kilómetros entre dos coordenadas
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formatea la distancia calculada para mostrar en la interfaz de usuario
 */
export function formatDistance(distanceKm: number | undefined): string {
  if (distanceKm === undefined || isNaN(distanceKm)) return '';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `a ${meters} m`;
  }
  return `a ${distanceKm.toFixed(1)} km`;
}

/**
 * Genera enlaces directos a Google Maps, Waze y Apple Maps
 */
export function generateNavigationLinks(
  latitude: number,
  longitude: number,
  venueName: string,
  address: string
) {
  const query = encodeURIComponent(`${venueName}, ${address}`);
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${query}`,
    waze: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
    appleMaps: `https://maps.apple.com/?daddr=${latitude},${longitude}&q=${query}`,
  };
}

/**
 * Búsqueda de direcciones y geocodificación mediante OpenStreetMap Nominatim
 */
export async function searchAddressGeocode(query: string): Promise<Array<{
  display_name: string;
  lat: number;
  lon: number;
  road?: string;
  city?: string;
  state?: string;
}>> {
  if (!query || query.trim().length < 3) return [];
  
  try {
    const encoded = encodeURIComponent(`${query}, Argentina`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&addressdetails=1&limit=5&countrycodes=ar`,
      {
        headers: {
          'Accept-Language': 'es',
        },
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      road: item.address?.road || item.address?.suburb,
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.state_district,
      state: item.address?.state,
    }));
  } catch (error) {
    console.warn('Geocoding search warning:', error);
    return [];
  }
}
