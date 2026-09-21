import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { EventItem } from '../../types';
import { useLocation } from '../../context/LocationContext';
import { useFilters } from '../../context/FilterContext';
import { formatEventSchedule, isEventExpired, isEventFinished, isThisWeekend, parseISODate } from '../../lib/dateUtils';
import { DANCE_GENRE_FAMILIES, getGenreRadarBadge } from '../../lib/danceCategories';
import { FilterChips } from '../explore/FilterChips';
import { Search, Calendar, ChevronRight, Radar, MapPin, X } from 'lucide-react';

interface MapViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

/**
 * Anillos Concéntricos de Radar Neón centrados en el usuario (Idéntico a Pantalla 2 de la maqueta)
 */
const createRadarRingsIcon = () => {
  return L.divIcon({
    className: 'radar-concentric-container',
    html: `
      <div style="position: relative; width: 0; height: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;">
        <!-- Anillo Exterior 3 -->
        <div style="
          position: absolute;
          width: 380px; height: 380px;
          margin-top: -190px; margin-left: -190px;
          border-radius: 50%;
          border: 1.5px dashed rgba(255, 45, 85, 0.4);
          box-shadow: 0 0 35px rgba(255, 45, 85, 0.2), inset 0 0 25px rgba(255, 45, 85, 0.08);
          animation: ping 5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>

        <!-- Anillo Medio 2 -->
        <div style="
          position: absolute;
          width: 250px; height: 250px;
          margin-top: -125px; margin-left: -125px;
          border-radius: 50%;
          border: 1.5px solid rgba(255, 107, 74, 0.6);
          box-shadow: 0 0 30px rgba(255, 107, 74, 0.35), inset 0 0 20px rgba(255, 107, 74, 0.15);
        "></div>

        <!-- Anillo Interior 1 -->
        <div style="
          position: absolute;
          width: 130px; height: 130px;
          margin-top: -65px; margin-left: -65px;
          border-radius: 50%;
          border: 2px solid rgba(255, 45, 85, 0.75);
          box-shadow: 0 0 25px rgba(255, 45, 85, 0.45), inset 0 0 15px rgba(255, 45, 85, 0.25);
        "></div>

        <!-- Centro del Usuario Neón -->
        <div style="
          position: absolute;
          width: 24px; height: 24px;
          margin-top: -12px; margin-left: -12px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffffff 15%, #ff5500 55%, #ff2d55 100%);
          border: 3px solid white;
          box-shadow: 0 0 20px #ff5500, 0 0 45px #ff2d55;
          z-index: 20;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

/**
 * Crea un pin personalizado con el NOMBRE DEL GÉNERO arriba, NOMBRE DEL LOCAL abajo
 * y la ESTELA VERTICAL LUMINOSA hacia el punto geográfico (estilo Pantalla 2 de la maqueta)
 */
const createRadarMarkerIcon = (evt: EventItem) => {
  const badge = getGenreRadarBadge(evt.genre_family);
  const color = badge.pinColor;
  const genreUpper = badge.genreUpper;
  const icon = badge.icon;
  const venueName = evt.venue_name || (evt.address ? evt.address.split(',')[0] : evt.city) || 'Pista de Baile';

  const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      cursor: pointer;
      pointer-events: auto;
      user-select: none;
    ">
      <!-- Tarjeta Flotante: Género Arriba y Nombre del Local Abajo -->
      <div style="
        background: #080c14;
        border: 1.5px solid ${color};
        border-radius: 10px;
        padding: 2.5px 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.95), 0 0 14px ${color}66;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-bottom: 3px;
        min-width: 68px;
        max-width: 140px;
        text-align: center;
        backdrop-filter: blur(8px);
      ">
        <!-- 1. Nombre de Género en Mayúsculas -->
        <div style="
          color: ${color};
          font-weight: 900;
          font-size: 10px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 3px;
          line-height: 1.2;
        ">
          <span style="font-size: 10px;">${icon}</span>
          <span>${genreUpper}</span>
        </div>

        <!-- 2. Nombre del Local / Salón Abajo -->
        <div style="
          color: #f8fafc;
          font-weight: 800;
          font-size: 10.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
          line-height: 1.2;
          margin-top: 1px;
        ">
          ${venueName}
        </div>
      </div>

      <!-- Marcador Geográfico Luminoso -->
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid white;
        box-shadow: 0 4px 18px rgba(0,0,0,0.8), 0 0 18px ${color};
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: 900;
          font-size: 13px;
        ">${icon}</span>
      </div>

      <!-- Estela Vertical Luminosa hacia el Mapa (Efecto Haz de Luz / Radar) -->
      <div style="
        width: 3px;
        height: 32px;
        background: linear-gradient(to bottom, ${color}, rgba(255,255,255,0.9), transparent);
        box-shadow: 0 0 12px ${color}, 0 0 24px ${color};
        border-radius: 2px;
        margin-top: -2px;
        pointer-events: none;
      "></div>
    </div>
  `;

  return L.divIcon({
    className: 'radar-map-pin',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -78],
  });
};

const MapController: React.FC<{
  centerLat: number;
  centerLng: number;
  onMapMoved: (lat: number, lng: number) => void;
}> = ({ centerLat, centerLng, onMapMoved }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo([centerLat, centerLng], map.getZoom() || 13, { duration: 0.8 });
  }, [centerLat, centerLng, map]);

  useMapEvents({
    dragend: () => {
      const center = map.getCenter();
      onMapMoved(center.lat, center.lng);
    },
    zoomend: () => {
      const center = map.getCenter();
      onMapMoved(center.lat, center.lng);
    },
  });

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ events, onSelectEvent }) => {
  const { location, setCustomCoordinates } = useLocation();
  const { filters, setGenreFamily } = useFilters();
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: location.latitude,
    lng: location.longitude,
  });
  const [hasMovedFromCenter, setHasMovedFromCenter] = useState(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<{ lat: number; lng: number }>({
    lat: location.latitude,
    lng: location.longitude,
  });
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMapCenter({ lat: location.latitude, lng: location.longitude });
    setCurrentMapCenter({ lat: location.latitude, lng: location.longitude });
    setHasMovedFromCenter(false);
  }, [location.latitude, location.longitude]);

  const visibleEvents = useMemo(() => {
    return events.filter((evt) => {
      // 1. Debe estar publicado y NO cancelado
      if (evt.status !== 'publicado' || evt.is_cancelled) return false;

      // 2. Debe tener flyer activo en circulación
      if (!evt.flyer_url || !evt.flyer_url.trim()) return false;

      // 3. Debe tener coordenadas válidas
      if (!evt.latitude || !evt.longitude || isNaN(evt.latitude) || isNaN(evt.longitude)) return false;

      // 4. Si el evento ya finalizó (a menos que sea clase recurrente semanal), desaparece inmediatamente del mapa
      if (!evt.is_recurring_weekly && (isEventFinished(evt.end_time) || isEventExpired(evt.end_time))) {
        return false;
      }

      // 5. Filtro por categoría
      if (filters.category !== 'all' && evt.category !== filters.category) return false;

      // 6. Filtro por búsqueda de texto (Search)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (evt.title && evt.title.toLowerCase().includes(q)) ||
          (evt.venue_name && evt.venue_name.toLowerCase().includes(q)) ||
          (evt.city && evt.city.toLowerCase().includes(q)) ||
          (evt.address && evt.address.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 7. Filtro por Género en Radar
      if (filters.genreFamily !== 'all') {
        const eventFamily = evt.genre_family || 'salsa-y-bachata';
        if (eventFamily !== filters.genreFamily) {
          // Compatibilidad: si el evento tenía 'caribeno' y se filtra salsa-y-bachata, bachata o salsa
          if (evt.genre_family === 'caribeno' && (filters.genreFamily === 'salsa-y-bachata' || filters.genreFamily === 'bachata' || filters.genreFamily === 'salsa')) {
            // permitir match suave
          } else {
            return false;
          }
        }
      }

      const evtStart = parseISODate(evt.start_time);
      const todayStr = new Date().toDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toDateString();

      if (filters.dateFilter === 'today' && evtStart.toDateString() !== todayStr) return false;
      if (filters.dateFilter === 'tomorrow' && evtStart.toDateString() !== tomorrowStr) return false;
      if (filters.dateFilter === 'weekend' && !isThisWeekend(evtStart)) return false;

      return true;
    });
  }, [events, filters, searchQuery]);

  const handleMapMoved = (lat: number, lng: number) => {
    setCurrentMapCenter({ lat, lng });
    const dist = Math.hypot(lat - location.latitude, lng - location.longitude);
    if (dist > 0.02) {
      setHasMovedFromCenter(true);
    }
  };

  const handleSearchInThisArea = async () => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentMapCenter.lat}&lon=${currentMapCenter.lng}&zoom=13`,
        { headers: { 'Accept-Language': 'es' } }
      );
      let detectedName = 'Zona seleccionada en mapa';
      if (resp.ok) {
        const data = await resp.json();
        const city = data.address?.city || data.address?.town || data.address?.suburb || 'Nueva Zona';
        detectedName = city;
      }
      setCustomCoordinates(currentMapCenter.lat, currentMapCenter.lng, detectedName);
      setHasMovedFromCenter(false);
    } catch (e) {
      setCustomCoordinates(currentMapCenter.lat, currentMapCenter.lng, 'Zona explorada');
      setHasMovedFromCenter(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-4rem)] pb-20 md:pb-0 overflow-hidden">
      {/* Controles y Filtros Flotantes del Radar de Baile */}
      <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-4 sm:left-4 sm:right-4 z-20 max-w-4xl mx-auto pointer-events-none space-y-2">
        <div className="bg-oled-950/92 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl pointer-events-auto space-y-2">
          {/* Encabezado: Radar de Baile */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-dance-crimson to-dance-coral p-0.5 shadow-glow-crimson flex items-center justify-center shrink-0">
                <Radar className="w-4 h-4 text-white animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                  Radar de Baile
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h1>
                <p className="text-[10px] text-slate-400">
                  {visibleEvents.length} {visibleEvents.length === 1 ? 'evento en el radar' : 'eventos en el radar'}
                </p>
              </div>
            </div>

            {/* Selector de Fechas */}
            <div className="hidden sm:block">
              <FilterChips />
            </div>
          </div>

          {/* Barra de Búsqueda Flotante (Search - Idéntica a la maqueta) */}
          <div className="relative flex items-center pt-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-8 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-dance-coral/60 focus:bg-white/10 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Fila Móvil de Filtros de Fecha */}
          <div className="sm:hidden">
            <FilterChips />
          </div>

          {/* Selector Rápido de Géneros para el Radar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-white/5">
            <button
              onClick={() => setGenreFamily('all')}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer ${
                filters.genreFamily === 'all'
                  ? 'bg-white text-oled-950 shadow-md scale-102'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              ✨ Todos ({events.length})
            </button>
            {DANCE_GENRE_FAMILIES.map((fam) => {
              const isSelected = filters.genreFamily === fam.id;
              const count = events.filter((e) => {
                const f = e.genre_family || 'salsa-y-bachata';
                return f === fam.id || (e.genre_family === 'caribeno' && fam.id === 'salsa-y-bachata');
              }).length;

              return (
                <button
                  key={fam.id}
                  onClick={() => setGenreFamily(fam.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-white text-oled-950 border-white shadow-md scale-102'
                      : 'bg-oled-900/90 text-slate-300 border-white/10 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <span>{fam.icon}</span>
                  <span>{fam.shortName}</span>
                  {count > 0 && (
                    <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isSelected ? 'bg-oled-950 text-white' : 'bg-white/15 text-slate-200'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {hasMovedFromCenter && (
        <div className="absolute top-44 sm:top-40 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <button
            onClick={handleSearchInThisArea}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-dance-crimson to-dance-orange text-white text-[11px] sm:text-xs font-bold rounded-full shadow-2xl border border-white/20 flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Buscar en esta zona
          </button>
        </div>
      )}

      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-10 bg-[#09090b]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <MapController
          centerLat={mapCenter.lat}
          centerLng={mapCenter.lng}
          onMapMoved={handleMapMoved}
        />

        {/* Anillos Concéntricos de Radar Neón centrados en el Usuario (Idéntico a Pantalla 2) */}
        <Marker
          position={[location.latitude, location.longitude]}
          icon={createRadarRingsIcon()}
          interactive={false}
        />

        {/* Marcadores de Eventos en el Radar de Baile */}
        {visibleEvents.map((evt) => {
          const schedule = formatEventSchedule(evt.start_time, evt.end_time);
          const badge = getGenreRadarBadge(evt.genre_family);

          return (
            <Marker
              key={evt.id}
              position={[evt.latitude, evt.longitude]}
              icon={createRadarMarkerIcon(evt)}
              eventHandlers={{
                click: () => setSelectedEvent(evt),
              }}
            >
              <Popup>
                <div className="w-64 bg-oled-950 text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  {/* Encabezado con Género en Mayúsculas arriba y Local abajo */}
                  <div
                    className="py-2 px-3 text-white"
                    style={{ backgroundColor: badge.pinColor }}
                  >
                    <div className="flex items-center justify-between text-[11px] font-black tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <span>{badge.icon}</span>
                        <span>{badge.genreUpper}</span>
                      </span>
                      <span className="bg-black/30 px-2 py-0.5 rounded text-[9px] uppercase font-bold">
                        {evt.category}
                      </span>
                    </div>
                    <div className="text-xs font-black tracking-tight mt-0.5 text-white flex items-center gap-1 drop-shadow-sm">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-white/90" />
                      <span className="truncate">{evt.venue_name || evt.city}</span>
                    </div>
                  </div>

                  {/* Imagen del Flyer adaptada al espacio */}
                  <div className="relative aspect-[4/3] w-full bg-oled-900 overflow-hidden flex items-center justify-center">
                    <img
                      src={evt.flyer_url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-30 pointer-events-none"
                    />
                    <img
                      src={evt.flyer_url}
                      alt={evt.title}
                      className="relative z-10 w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-black text-dance-gold shadow-lg">
                      {evt.is_free
                        ? 'GRATIS'
                        : evt.price
                        ? `$${evt.price.toLocaleString('es-AR')}`
                        : 'A consultar'}
                    </div>
                  </div>

                  {/* Datos del Evento */}
                  <div className="p-3 space-y-2">
                    <h4 className="font-bold text-sm text-white line-clamp-1">{evt.title}</h4>
                    <div className="text-[11px] text-dance-crimson font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{schedule.dateLabel}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{evt.venue_name} ({evt.address || evt.city})</span>
                    </div>

                    <button
                      onClick={() => onSelectEvent(evt)}
                      className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-dance-crimson to-dance-coral hover:opacity-90 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-glow-crimson"
                    >
                      <span>Ver Evento</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Tarjeta Flotante Inferior de Vista Previa (Pantalla 2 de la Plantilla) */}
      {selectedEvent ? (
        <div className="absolute bottom-24 md:bottom-6 left-3.5 right-3.5 sm:left-auto sm:right-6 sm:w-96 z-30 animate-slideUp">
          <div className="bg-oled-950/95 backdrop-blur-2xl p-3.5 rounded-3xl border border-white/15 shadow-2xl flex items-center gap-3.5 relative overflow-hidden">
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Flyer Thumbnail */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-oled-900 shrink-0 border border-white/10 relative">
              <img
                src={selectedEvent.flyer_url}
                alt={selectedEvent.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black uppercase text-dance-coral">
                  {selectedEvent.category}
                </span>
                {selectedEvent.is_free ? (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px]">
                    GRATIS
                  </span>
                ) : selectedEvent.price ? (
                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-dance-gold font-bold text-[9px]">
                    ${selectedEvent.price.toLocaleString('es-AR')}
                  </span>
                ) : null}
              </div>
              <h3 className="font-black text-xs sm:text-sm text-white truncate">
                {selectedEvent.venue_name || selectedEvent.title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {selectedEvent.address || selectedEvent.city}
              </p>

              {/* Botón Ver Detalles */}
              <button
                type="button"
                onClick={() => onSelectEvent(selectedEvent)}
                className="mt-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-dance-crimson to-dance-coral text-white font-black text-xs shadow-glow-crimson hover:scale-102 active:scale-98 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Detalles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dots de Carrusel (Idéntico a Pantalla 2) */}
          <div className="flex justify-center items-center gap-1.5 pt-2">
            <span className="w-5 h-1 rounded-full bg-gradient-to-r from-dance-crimson to-dance-coral shadow-glow-crimson" />
            <span className="w-1.5 h-1 rounded-full bg-white/25" />
            <span className="w-1.5 h-1 rounded-full bg-white/25" />
          </div>
        </div>
      ) : (
        /* Indicador inferior de eventos en radar cuando no hay seleccionado */
        <div className="absolute bottom-24 md:bottom-6 left-3.5 z-20">
          <div className="px-3.5 py-1.5 rounded-full bg-oled-950/90 backdrop-blur-md border border-white/10 text-[11px] sm:text-xs text-slate-300 shadow-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-dance-crimson animate-ping" />
            <span className="font-semibold">{visibleEvents.length} eventos en Radar de Baile</span>
          </div>
        </div>
      )}
    </div>
  );
};
