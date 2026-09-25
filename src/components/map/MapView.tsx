import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { EventItem } from '../../types';
import { useLocation } from '../../context/LocationContext';
import { formatEventSchedule } from '../../lib/dateUtils';
import { getGenreRadarBadge } from '../../lib/danceCategories';
import { MapPin, Calendar, ChevronRight, X, Navigation, LocateFixed, ExternalLink, Ticket } from 'lucide-react';

interface MapViewProps {
  events: EventItem[];
  onSelectEvent?: (event: EventItem) => void;
  isMinimized?: boolean;
  onActiveVenueChange?: (hasVenue: boolean) => void;
}

// Icono neón para el marcador de la persona/teléfono en el centro del mapa
const createUserBeaconIcon = () => {
  return L.divIcon({
    className: 'user-beacon-pin',
    html: `
      <div style="position: relative; width: 0; height: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 68px; height: 68px; margin-top: -34px; margin-left: -34px; border-radius: 50%; border: 1.5px solid rgba(56, 189, 248, 0.7); box-shadow: 0 0 24px rgba(56, 189, 248, 0.45); animation: ping 3.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 34px; height: 34px; margin-top: -17px; margin-left: -17px; border-radius: 50%; background: rgba(56, 189, 248, 0.25); border: 2px solid #38bdf8; box-shadow: 0 0 16px #38bdf8;"></div>
        <div style="position: absolute; width: 14px; height: 14px; margin-top: -7px; margin-left: -7px; border-radius: 50%; background: #ffffff; border: 3px solid #0284c7; box-shadow: 0 0 12px #38bdf8; z-index: 20;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Marcador del local bailable con badge luminoso y pin en punta
const createRadarMarkerIcon = (evt: EventItem, isSelected: boolean) => {
  const badge = getGenreRadarBadge(evt.genre_family || 'salsa-y-bachata');
  const color = badge.pinColor || '#ff2d55';
  const icon = badge.icon || '💃';
  const venueName = evt.venue_name || evt.city || 'Pista de Baile';
  const borderHighlight = isSelected ? 'border: 2.5px solid #ffffff; transform: scale(1.1);' : `border: 1.5px solid ${color};`;

  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:pointer;pointer-events:auto;user-select:none;transition:transform 0.2s ease;">
      <div style="background:#080c14;${borderHighlight}border-radius:10px;padding:3px 8px;box-shadow:0 4px 18px rgba(0,0,0,0.95),0 0 16px ${color}88;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:3px;min-width:68px;max-width:145px;text-align:center;backdrop-filter:blur(8px);">
        <div style="color:${color};font-weight:900;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;white-space:nowrap;display:flex;align-items:center;gap:3px;line-height:1.2;">
          <span style="font-size:10px;">${icon}</span><span>${badge.genreUpper || 'BAILE'}</span>
        </div>
        <div style="color:#f8fafc;font-weight:800;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:135px;line-height:1.2;margin-top:1px;">${venueName}</div>
      </div>
      <div style="background-color:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 4px 18px rgba(0,0,0,0.8),0 0 18px ${color};">
        <span style="transform:rotate(45deg);color:white;font-weight:900;font-size:13px;">${icon}</span>
      </div>
      <div style="width:3px;height:30px;background:linear-gradient(to bottom, ${color}, rgba(255,255,255,0.9), transparent);box-shadow:0 0 12px ${color},0 0 24px ${color};border-radius:2px;margin-top:-2px;pointer-events:none;"></div>
    </div>`;

  return L.divIcon({ className: 'radar-map-pin', html, iconSize: [0, 0], iconAnchor: [0, 0] });
};

// Calcula la distancia aproximada en km/metros
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
};

// Controlador interno del mapa para centrar y reajustar tamaño al minimizar/maximizar
const MapController: React.FC<{ center: [number, number]; isMinimized: boolean }> = ({ center, isMinimized }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, isMinimized ? 14 : 13, { duration: 0.8 });
  }, [center, isMinimized, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 320);
    return () => clearTimeout(timer);
  }, [isMinimized, map]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ events, onSelectEvent, onActiveVenueChange }) => {
  const { location, requestCurrentLocation, isLocating } = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isZoomedFlyerOpen, setIsZoomedFlyerOpen] = useState(false);

  // Centro inicial del mapa centrado en la persona o GPS
  const userLat = location.latitude || -34.6037;
  const userLng = location.longitude || -58.3816;
  const [mapCenter, setMapCenter] = useState<[number, number]>([userLat, userLng]);

  // Actualizar cuando cambie la posición del usuario
  useEffect(() => {
    if (location.latitude && location.longitude && !selectedEvent) {
      setMapCenter([location.latitude, location.longitude]);
    }
  }, [location.latitude, location.longitude, selectedEvent]);

  // Eventos visibles en el radar con coordenadas válidas
  const visibleEvents = useMemo(() => {
    return events.filter(
      (evt) =>
        evt.status === 'publicado' &&
        !evt.is_cancelled &&
        evt.flyer_url &&
        evt.latitude &&
        evt.longitude &&
        !isNaN(evt.latitude) &&
        !isNaN(evt.longitude)
    );
  }, [events]);

  // Cuando el usuario toca un sitio en el mapa
  const handleMarkerClick = (evt: EventItem) => {
    setSelectedEvent(evt);
    setMapCenter([evt.latitude, evt.longitude]);
    onActiveVenueChange?.(true);
  };

  // Cerrar el flyer y volver a expandir el mapa
  const handleCloseFlyer = () => {
    setSelectedEvent(null);
    setMapCenter([userLat, userLng]);
    onActiveVenueChange?.(false);
  };

  // Re-centrar mapa en la persona/GPS
  const handleRecenterUser = async () => {
    if (location.latitude && location.longitude) {
      setSelectedEvent(null);
      setMapCenter([location.latitude, location.longitude]);
      onActiveVenueChange?.(false);
    } else {
      await requestCurrentLocation();
    }
  };

  // Detección de gesto táctil: deslizar hacia los lados o hacia abajo para cerrar
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - (touchStartY.current || 0);

    // Si desliza hacia la izquierda/derecha más de 65px, o hacia abajo más de 75px
    if (Math.abs(deltaX) > 65 || deltaY > 75) {
      handleCloseFlyer();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const isMapMinimized = Boolean(selectedEvent);

  return (
    <div className="relative w-full h-[calc(100dvh-4.5rem)] flex flex-col md:flex-row bg-[#07070a] overflow-hidden select-none isolate z-0">
      {/* MAPA LEAFLET INTERACTIVO: 
          - En Móvil: Se reduce a cabecera radar de 22vh cuando hay evento activo
          - En PC: Permanece siempre a pantalla completa (100% alto y ancho) */}
      <div
        className={`w-full transition-all duration-300 ease-in-out relative shrink-0 ${
          isMapMinimized ? 'h-[22vh] md:h-full border-b md:border-b-0 border-zinc-800' : 'h-full'
        }`}
      >
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#07070a' }}
        >
          {/* Base oscura Esri Dark Gray Canvas (alta definición, sin marcas de agua ni restricciones de API) */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, &copy; OpenStreetMap'
            maxZoom={18}
          />
          {/* Etiquetas nítidas de calles, avenidas y barrios */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
          <MapController center={mapCenter} isMinimized={isMapMinimized} />

          {/* 1. MARCADOR DEL USUARIO / TELÉFONO EN EL CENTRO */}
          <Marker position={[userLat, userLng]} icon={createUserBeaconIcon()} />

          {/* 2. MARCADORES DE LOS LUGARES PARA BAILAR */}
          {visibleEvents.map((evt) => (
            <Marker
              key={evt.id}
              position={[evt.latitude, evt.longitude]}
              icon={createRadarMarkerIcon(evt, selectedEvent?.id === evt.id)}
              eventHandlers={{
                click: () => handleMarkerClick(evt),
              }}
            />
          ))}
        </MapContainer>

        {/* Botón flotante para recentrar en tu ubicación */}
        <button
          type="button"
          onClick={handleRecenterUser}
          className="absolute top-3 right-3 z-[1000] p-2.5 rounded-full bg-oled-950/90 hover:bg-oled-900 border border-white/20 text-sky-400 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          title="Centrar en mi ubicación"
        >
          <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-bold text-white hidden sm:inline">Mi ubicación</span>
        </button>

        {/* Indicador superior flotante con conteo de eventos */}
        <div className="absolute top-3 left-3 md:left-auto md:right-36 z-[1000] pointer-events-none transition-all">
          <div className="px-3.5 py-1.5 rounded-full bg-oled-950/90 backdrop-blur-md border border-white/15 text-[11px] text-slate-200 shadow-2xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-dance-crimson animate-pulse" />
            <span className="font-bold">{visibleEvents.length} pistas en el radar</span>
          </div>
        </div>
      </div>

      {/* PANEL / DRAWER DEL FLYER: 
          - En Móvil: Drawer inferior que toma el espacio restante con pb-36
          - En PC: Elegante tarjeta flotante lateral a la izquierda (estilo Google Maps / Airbnb) sobre el mapa completo */}
      {selectedEvent && (
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="flex-1 w-full bg-oled-950 text-white flex flex-col overflow-y-auto relative z-20 shadow-2xl border-t border-zinc-800 md:border-t-0 md:absolute md:top-4 md:left-4 md:bottom-4 md:w-[440px] lg:w-[480px] md:z-[1000] md:rounded-3xl md:border md:border-white/15 md:shadow-[0_25px_60px_rgba(0,0,0,0.85)] md:bg-oled-950/95 md:backdrop-blur-2xl md:flex-none md:overflow-y-auto"
        >
          {/* Barra superior con encabezado y botón cerrar */}
          <div className="w-full pt-2.5 pb-2 px-4 flex items-center justify-between relative border-b border-white/10 shrink-0 bg-oled-950/95 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <div className="md:hidden w-10 h-1.5 rounded-full bg-zinc-600 mr-1" />
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-dance-crimson" />
                <span className="truncate max-w-[240px] sm:max-w-xs">{selectedEvent.venue_name || selectedEvent.city || 'Pista de Baile'}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleCloseFlyer}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer transition-colors active:scale-95 shadow-md shrink-0"
              title="Cerrar y ver mapa completo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contenido detallado del Flyer */}
          <div className="p-4 sm:p-5 pb-36 md:pb-6 flex-1 flex flex-col gap-4 w-full">
            {/* Imagen del Flyer completa - muestra TODO el flyer sin recortes */}
            <div
              onClick={() => setIsZoomedFlyerOpen(true)}
              className="w-full rounded-2xl overflow-hidden bg-black/85 border border-white/15 shrink-0 relative shadow-2xl flex items-center justify-center p-1.5 cursor-pointer group hover:border-dance-coral/50 transition-all"
              title="Toca para ver el flyer en grande"
            >
              <img
                src={selectedEvent.flyer_url}
                alt={selectedEvent.title}
                className="w-full max-h-[38vh] md:max-h-[40vh] object-contain rounded-xl transition-transform duration-200 group-hover:scale-[1.01]"
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 text-[10px] font-black uppercase tracking-wider text-dance-coral shadow-lg">
                {selectedEvent.category || 'Evento'}
              </div>
              <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/90 backdrop-blur-md border border-white/15 text-xs font-black text-dance-gold shadow-lg">
                {selectedEvent.is_free
                  ? 'GRATIS'
                  : selectedEvent.price
                  ? `$${selectedEvent.price.toLocaleString('es-AR')}`
                  : 'A consultar'}
              </div>
              <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[9px] text-slate-300 font-semibold opacity-85 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <span>🔍</span>
                <span>Ampliar flyer</span>
              </div>
            </div>

            {/* Información del Lugar y Horarios */}
            <div className="w-full space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-dance-crimson/20 border border-dance-crimson/40 text-dance-coral text-[11px] font-black uppercase">
                    {getGenreRadarBadge(selectedEvent.genre_family || 'salsa-y-bachata').icon}{' '}
                    {getGenreRadarBadge(selectedEvent.genre_family || 'salsa-y-bachata').genreUpper}
                  </span>
                  <span className="text-[11px] text-sky-400 font-bold flex items-center gap-1">
                    <Navigation className="w-3 h-3" />A{' '}
                    {calculateDistance(
                      userLat,
                      userLng,
                      selectedEvent.latitude,
                      selectedEvent.longitude
                    )}{' '}
                    de tu ubicación
                  </span>
                </div>

                <h2 className="text-xl font-black text-white leading-tight">
                  {selectedEvent.title}
                </h2>

                <div className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-dance-crimson shrink-0" />
                    <span className="font-semibold text-white">
                      {selectedEvent.venue_name || selectedEvent.city}
                    </span>
                    {selectedEvent.address && (
                      <span className="text-slate-400">({selectedEvent.address})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-dance-coral shrink-0" />
                    <span>
                      {
                        formatEventSchedule(selectedEvent.start_time, selectedEvent.end_time)
                          .dateLabel
                      }
                      {' • '}
                      {
                        formatEventSchedule(selectedEvent.start_time, selectedEvent.end_time)
                          .timeRange
                      }
                    </span>
                  </div>
                </div>

                {selectedEvent.description && (
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-1 whitespace-pre-line">
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              {/* Botones de Acción apilados al 100% de ancho */}
              <div className="pt-3 pb-2 flex flex-col gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => onSelectEvent?.(selectedEvent)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-dance-crimson to-dance-coral hover:opacity-90 text-white text-xs sm:text-sm font-black shadow-glow-crimson transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Ver Entradas y Detalles Completos</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.latitude},${selectedEvent.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                  <span>Cómo Llegar en Google Maps</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ZOOM DEL FLYER: Para ver en pantalla completa el flyer en máxima resolución */}
      {isZoomedFlyerOpen && selectedEvent && (
        <div
          className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-3 animate-fadeIn"
          onClick={() => setIsZoomedFlyerOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomedFlyerOpen(false)}
            className="absolute top-4 right-4 z-[2001] p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white shadow-2xl cursor-pointer transition-colors"
            title="Cerrar vista completa"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedEvent.flyer_url}
            alt={selectedEvent.title}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-xs sm:text-sm text-slate-300 font-bold mt-3 text-center">
            {selectedEvent.title} • {selectedEvent.venue_name || selectedEvent.city}
          </p>
        </div>
      )}
    </div>
  );
};
