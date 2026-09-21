import React, { useState, useMemo, useEffect } from 'react';
import type { EventItem } from '../../types';
import { useLocation } from '../../context/LocationContext';
import { useFilters } from '../../context/FilterContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useAuth } from '../../context/AuthContext';
import { calculateHaversineDistance, formatDistance } from '../../lib/geo';
import { isEventExpired, isEventFinished, isThisWeekend, parseISODate, formatEventSchedule } from '../../lib/dateUtils';
import { preloadImages, getOptimizedImageUrl } from '../../lib/imageOptimizer';
import {
  Search,
  MapPin,
  Clock,
  Heart,
  ChevronRight,
  ChevronDown,
  Bell,
  Radio,
  X,
  Music2,
} from 'lucide-react';

interface ExploreViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onShareEvent: (event: EventItem, e: React.MouseEvent) => void;
  onOpenLocationModal?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenAIModal?: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  events,
  onSelectEvent,
  onShareEvent: _onShareEvent,
  onOpenLocationModal,
  onNavigateTab,
  onOpenAIModal,
}) => {
  const { location } = useLocation();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { filters, setSearchQuery, setDateFilter, setGenreFamily } = useFilters();

  const [activeDateTab, setActiveDateTab] = useState<'todos' | 'hoy' | 'manana' | 'finde' | 'cercano'>('todos');
  const [selectedGenrePill, setSelectedGenrePill] = useState<string>('todos');
  const [showAllGenresModal, setShowAllGenresModal] = useState(false);

  // Lista de géneros con estilos según la maqueta Pantalla 1
  const genrePills = [
    {
      id: 'salsa',
      label: 'Salsa',
      icon: '💃',
      bgClass: 'bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-glow-coral/30',
      activeBorder: 'ring-2 ring-rose-400',
    },
    {
      id: 'bachata',
      label: 'Bachata',
      icon: '🕺',
      bgClass: 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-purple-900/40',
      activeBorder: 'ring-2 ring-purple-400',
    },
    {
      id: 'rock',
      label: 'Rock',
      icon: '🎸',
      bgClass: 'bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-blue-900/40',
      activeBorder: 'ring-2 ring-cyan-400',
    },
    {
      id: 'tango',
      label: 'Tango',
      icon: '💃',
      bgClass: 'bg-gradient-to-r from-amber-700 to-orange-600 text-white shadow-amber-900/40',
      activeBorder: 'ring-2 ring-amber-400',
    },
    {
      id: 'cumbia',
      label: 'Cumbia',
      icon: '🕺',
      bgClass: 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white shadow-emerald-900/40',
      activeBorder: 'ring-2 ring-emerald-400',
    },
    {
      id: 'electronica',
      label: 'Electrónica',
      icon: '🎵',
      bgClass: 'bg-gradient-to-r from-cyan-700 to-blue-600 text-white shadow-cyan-900/40',
      activeBorder: 'ring-2 ring-cyan-400',
    },
  ];

  // Lista extendida para el modal "Más"
  const allGenresList = [
    { id: 'salsa', name: 'Salsa', icon: '💃' },
    { id: 'bachata', name: 'Bachata', icon: '🕺' },
    { id: 'rock', name: 'Rock', icon: '🎸' },
    { id: 'tango', name: 'Tango', icon: '💃' },
    { id: 'cumbia', name: 'Cumbia', icon: '🕺' },
    { id: 'electronica', name: 'Electrónica', icon: '🎵' },
    { id: 'kizomba', name: 'Kizomba', icon: '✨' },
    { id: 'reggaeton', name: 'Reggaetón', icon: '🔥' },
    { id: 'folklore', name: 'Folklore', icon: '🪘' },
    { id: 'swing', name: 'Swing', icon: '🎷' },
    { id: 'disco', name: 'Disco', icon: '🪩' },
    { id: 'merengue', name: 'Merengue', icon: '🎺' },
  ];

  // Eventos activos y enriquecidos con distancia calculada
  const activeEvents = useMemo(() => {
    return events
      .filter((evt) => {
        if (evt.status !== 'publicado' || evt.is_cancelled) return false;
        if (!evt.flyer_url || !evt.flyer_url.trim()) return false;
        // Si no es clase recurrente semanal y ya finalizó, no mostrar
        if (!evt.is_recurring_weekly && (isEventFinished(evt.end_time) || isEventExpired(evt.end_time))) return false;
        return true;
      })
      .map((evt) => {
        const distanceKm = calculateHaversineDistance(
          location.latitude,
          location.longitude,
          evt.latitude,
          evt.longitude
        );
        return {
          ...evt,
          distance_km: Math.round(distanceKm * 10) / 10,
        };
      });
  }, [events, location]);

  // Precargar imágenes de flyers para fluidez total
  useEffect(() => {
    if (activeEvents.length > 0) {
      preloadImages(activeEvents.slice(0, 15).map((e) => e.flyer_url));
    }
  }, [activeEvents]);

  // Conteo sincronizado de eventos dentro del alcance del Radar (radio seleccionado o 15 km)
  const radarEvents = useMemo(() => {
    const radius = filters.radiusKm || 15;
    const near = activeEvents.filter((e) => e.distance_km <= radius);
    return near.length > 0 ? near : activeEvents;
  }, [activeEvents, filters.radiusKm]);

  const radarCount = radarEvents.length;

  // Eventos destacados para el carrusel horizontal superior
  const featuredEvents = useMemo(() => {
    const feat = activeEvents.filter((e) => e.is_featured);
    return feat.length > 0 ? feat : activeEvents.slice(0, 8);
  }, [activeEvents]);

  // Eventos filtrados para el feed principal
  const filteredEvents = useMemo(() => {
    return activeEvents.filter((evt) => {
      // Filtro por píldora de ritmo
      if (selectedGenrePill !== 'todos') {
        const target = selectedGenrePill.toLowerCase();
        const matchFamily = evt.genre_family?.toLowerCase().includes(target);
        const matchSub = (evt.subgenres || []).some((s) => s.toLowerCase().includes(target));
        const matchTitle = evt.title.toLowerCase().includes(target);
        if (!matchFamily && !matchSub && !matchTitle) return false;
      }

      // Filtro por fecha rápida
      const evtStart = parseISODate(evt.start_time);
      const todayStr = new Date().toDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toDateString();

      if (activeDateTab === 'hoy' && evtStart.toDateString() !== todayStr) return false;
      if (activeDateTab === 'manana' && evtStart.toDateString() !== tomorrowStr) return false;
      if (activeDateTab === 'finde' && !isThisWeekend(evtStart)) return false;
      if (activeDateTab === 'cercano' && evt.distance_km > 10) return false;

      // Filtro por búsqueda de texto
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchTitle = evt.title.toLowerCase().includes(q);
        const matchVenue = evt.venue_name.toLowerCase().includes(q);
        const matchCity = evt.city.toLowerCase().includes(q);
        const matchOrg = evt.organizer_name.toLowerCase().includes(q);
        const matchSub = (evt.subgenres || []).some((s) => s.toLowerCase().includes(q));
        if (!matchTitle && !matchVenue && !matchCity && !matchOrg && !matchSub) return false;
      }

      return true;
    });
  }, [activeEvents, selectedGenrePill, activeDateTab, filters.searchQuery]);

  const handleDateTabClick = (tab: 'todos' | 'hoy' | 'manana' | 'finde' | 'cercano') => {
    setActiveDateTab(tab);
    if (tab === 'hoy') setDateFilter('today');
    else if (tab === 'manana') setDateFilter('tomorrow');
    else if (tab === 'finde') setDateFilter('weekend');
    else setDateFilter('all');
  };

  const handleGenreClick = (genreId: string) => {
    if (selectedGenrePill === genreId) {
      setSelectedGenrePill('todos');
      setGenreFamily('all');
    } else {
      setSelectedGenrePill(genreId);
      if (genreId === 'salsa' || genreId === 'bachata') {
        setGenreFamily('salsa-y-bachata');
      } else {
        setGenreFamily(genreId as any);
      }
    }
  };

  return (
    <div className="min-h-screen bg-oled-950 text-white pb-32 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 space-y-6 sm:space-y-8">
        {/* 1. Header Integrado: Logo, Ubicación, Campana y Perfil (Sólo visible en teléfonos móviles) */}
        <header className="flex md:hidden items-center justify-between pt-1">
          {/* Logo y Selector de Ubicación */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <img
                src="/branding/logo_horizontal.png"
                alt="Sale Baile"
                className="h-8 w-auto object-contain"
              />
            </div>

            {/* Selector de Ciudad */}
            <button
              onClick={onOpenLocationModal}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer pl-0.5"
              title="Cambiar ubicación de búsqueda"
            >
              <MapPin className="w-3.5 h-3.5 text-dance-coral" />
              <span className="font-semibold">{location.cityName || 'Buenos Aires'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Notificaciones y Avatar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateTab?.('agenda')}
              className="relative w-9 h-9 rounded-full bg-oled-900 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Notificaciones y eventos próximos"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-dance-crimson text-white text-[9px] font-black flex items-center justify-center shadow-glow-crimson">
                3
              </span>
            </button>

            <button
              onClick={() => onNavigateTab?.('account')}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-dance-coral to-purple-600 p-0.5 cursor-pointer"
              title="Ver mi perfil"
            >
              <div className="w-full h-full rounded-full bg-oled-900 overflow-hidden flex items-center justify-center">
                {user?.email ? (
                  <span className="text-xs font-black text-white uppercase">
                    {user.email.slice(0, 2)}
                  </span>
                ) : (
                  <span className="text-sm">💃</span>
                )}
              </div>
            </button>
          </div>
        </header>

        {/* 2. Hero + Buscador + Radar Banner en Grid Responsivo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            {/* Título Hero Impactante */}
            <section className="space-y-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                ¿Dónde <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">
                  bailamos hoy?
                </span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-slate-300 font-medium">
                Eventos, clases y sociales cerca tuyo en tiempo real
              </p>
            </section>

            {/* 3. Buscador Glassmorphism con Chispas */}
            <div className="relative max-w-2xl">
              <div className="relative flex items-center bg-oled-900/90 border border-white/15 focus-within:border-dance-coral/70 rounded-2xl p-3 sm:p-3.5 shadow-glass-card transition-all group">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-dance-coral ml-1 shrink-0" />
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscá por género, lugar o fecha..."
                  className="w-full bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none px-3"
                />
                {filters.searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-white p-1 mr-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onOpenAIModal}
                  className="relative flex items-center justify-center p-1.5 rounded-xl bg-gradient-to-tr from-dance-crimson/25 to-dance-coral/20 hover:from-dance-crimson/40 hover:to-dance-coral/30 border border-dance-coral/40 text-dance-coral hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm group ml-1 shrink-0"
                  title="Buscar con IA • Asistente inteligente SaleBaile"
                  aria-label="Buscar con IA"
                >
                  <Music2 className="w-4 h-4 text-dance-coral group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-dance-amber to-dance-coral text-slate-950 font-black text-[9px] flex items-center justify-center shadow-sm border border-black/70 animate-sparkle-pulse">
                    ?
                  </span>
                </button>
              </div>
            </div>

            {/* 4. Selector de Ritmos / Géneros */}
            <div className="space-y-2 max-w-2xl">
              {/* Fila 1 */}
              <div className="grid grid-cols-3 gap-2">
                {genrePills.slice(0, 3).map((pill) => {
                  const isSelected = selectedGenrePill === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => handleGenreClick(pill.id)}
                      className={`py-2 px-3 rounded-2xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                        pill.bgClass
                      } ${
                        isSelected
                          ? `${pill.activeBorder} scale-[1.02] shadow-lg`
                          : 'opacity-90 hover:opacity-100 hover:scale-[1.01]'
                      }`}
                    >
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Fila 2 */}
              <div className="grid grid-cols-4 gap-2">
                {genrePills.slice(3, 6).map((pill) => {
                  const isSelected = selectedGenrePill === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => handleGenreClick(pill.id)}
                      className={`py-2 px-2 rounded-2xl flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer ${
                        pill.bgClass
                      } ${
                        isSelected
                          ? `${pill.activeBorder} scale-[1.02] shadow-lg`
                          : 'opacity-90 hover:opacity-100 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="truncate">{pill.label}</span>
                    </button>
                  );
                })}

                {/* Botón Más */}
                <button
                  onClick={() => setShowAllGenresModal(true)}
                  className="py-2 px-2 rounded-2xl bg-oled-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer"
                  title="Ver todos los estilos"
                >
                  <span>••• Más</span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha en PC: Radar de Baile (IA) + Mini Mapa */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* 5. Tarjeta Banner: Radar de Baile (IA) */}
            <div
              onClick={() => onNavigateTab?.('map')}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/40 via-rose-950/30 to-oled-900 border border-dance-crimson/50 hover:border-dance-crimson p-4 sm:p-5 shadow-glow-crimson/20 cursor-pointer transition-all hover:scale-[1.01] group h-full flex flex-col justify-center"
            >
              <div className="absolute -top-10 -left-10 w-28 h-28 bg-dance-crimson/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-dance-crimson/15 border border-dance-crimson/40 flex items-center justify-center shrink-0 relative">
                    <div className="absolute inset-0 rounded-2xl border border-dance-crimson/30 animate-ping opacity-30" />
                    <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-dance-crimson animate-pulse" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-base font-black text-white">Radar de Baile</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-dance-crimson text-white text-[9px] font-black tracking-wide uppercase">
                        IA
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-300 leading-snug">
                      <span className="text-dance-coral font-bold">{radarCount} {radarCount === 1 ? 'lugar' : 'lugares'}</span> en radar cerca tuyo (a menos de {filters.radiusKm || 15} km)
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </div>

            {/* Mini Preview de Mapa Interactivo con Radar Neón */}
            <div
              onClick={() => onNavigateTab?.('map')}
              className="relative h-28 sm:h-32 lg:h-32 w-full rounded-3xl overflow-hidden border border-white/15 bg-[#07070a] cursor-pointer group shadow-glass-card"
            >
              {/* Grilla sutil oscura */}
              <div className="absolute inset-0 bg-[radial-gradient(#1e2230_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
              
              {/* Anillos concéntricos de Radar */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border border-dance-crimson/15" />
                <div className="w-32 h-32 rounded-full border border-dance-coral/25" />
                <div className="w-16 h-16 rounded-full border border-dance-crimson/35" />
                {/* Haz giratorio de radar */}
                <div
                  className="absolute w-48 h-48 rounded-full animate-spin"
                  style={{
                    animationDuration: '6s',
                    background: 'conic-gradient(from 0deg at 50% 50%, rgba(255, 45, 85, 0.28) 0deg, transparent 60deg, transparent 360deg)',
                  }}
                />
                {/* Centro del usuario */}
                <div className="w-3 h-3 rounded-full bg-dance-coral shadow-[0_0_12px_#ff5500] border border-white z-10 animate-pulse" />
              </div>

              {/* Puntos de eventos reales en el radar */}
              {radarEvents.slice(0, 5).map((evt, idx) => {
                const angle = ((idx * 71 + 28) * Math.PI) / 180;
                const radiusPct = 20 + (idx % 3) * 14;
                const topPct = 50 + radiusPct * Math.sin(angle);
                const leftPct = 50 + radiusPct * Math.cos(angle);
                return (
                  <div
                    key={evt.id}
                    style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-dance-crimson shadow-[0_0_10px_#ff2d55] animate-ping opacity-60" />
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-dance-coral border border-white/80 shadow-sm" />
                  </div>
                );
              })}

              {/* Píldora de estado sincronizada con la misma cantidad de eventos */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-oled-950/92 border border-white/15 px-3 py-1 rounded-full shadow-2xl backdrop-blur-md z-20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] sm:text-xs font-bold text-white whitespace-nowrap">
                  {location.cityName || 'Buenos Aires'} • {radarCount} {radarCount === 1 ? 'evento en radar' : 'eventos en radar'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Pestañas de Filtro Rápido de Fechas */}
        <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleDateTabClick('todos')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeDateTab === 'todos'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-coral'
                : 'bg-oled-900 text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => handleDateTabClick('hoy')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeDateTab === 'hoy'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-coral'
                : 'bg-oled-900 text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => handleDateTabClick('manana')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeDateTab === 'manana'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-coral'
                : 'bg-oled-900 text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            Mañana
          </button>
          <button
            onClick={() => handleDateTabClick('finde')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeDateTab === 'finde'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-coral'
                : 'bg-oled-900 text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            Este finde
          </button>
          <button
            onClick={() => handleDateTabClick('cercano')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeDateTab === 'cercano'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-coral'
                : 'bg-oled-900 text-slate-300 border border-white/10 hover:border-white/20'
            }`}
          >
            Cerca mío
          </button>
        </section>

        {/* 7. Sección: Eventos destacados (Carrusel Horizontal con Flyers Verticales) */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🔥</span>
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Eventos destacados
              </h2>
            </div>
            <button
              onClick={() => {
                setSelectedGenrePill('todos');
                setActiveDateTab('todos');
              }}
              className="text-xs font-bold text-dance-coral hover:text-dance-amber transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Carrusel en móvil / Grid en Desktop */}
          <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 overflow-x-auto sm:overflow-visible pb-3 pt-1 scrollbar-none snap-x snap-mandatory">
            {featuredEvents.map((evt) => {
              const fav = isFavorite(evt.id);
              const sched = formatEventSchedule(evt.start_time, evt.end_time);

              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="w-48 sm:w-auto shrink-0 sm:shrink snap-start bg-oled-900/90 border border-white/10 hover:border-dance-coral/40 rounded-3xl overflow-hidden shadow-glass-card cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
                >
                  {/* Flyer Vertical como en Agenda / Póster */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-dark-900">
                    <img
                      src={getOptimizedImageUrl(evt.flyer_url, 400, 75)}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-oled-950 via-transparent to-black/30" />

                    {/* Botón Favorito */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(evt.id);
                      }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:text-rose-400 transition-colors"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          fav ? 'fill-dance-crimson text-dance-crimson' : 'text-white'
                        }`}
                      />
                    </button>

                    {/* Tag de Categoría / Ritmo */}
                    <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-black text-rose-300">
                        {evt.category === 'social' ? 'Social' : evt.category}
                        {evt.genre_family ? ` • ${evt.genre_family.split('-')[0]}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Datos del Evento */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-1">
                        {evt.title}
                      </h3>
                      <div className="space-y-1 pt-1 text-[11px] text-slate-300">
                        <p className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-dance-coral shrink-0" />
                          <span className="truncate">{evt.venue_name || evt.address}</span>
                        </p>
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span className="flex items-center gap-1 truncate">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            {sched.dateLabel}
                          </span>
                          {evt.distance_km !== undefined && (
                            <span className="text-dance-coral font-semibold shrink-0">
                              {evt.distance_km} km
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Precio y Badge */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-black text-white">
                        {evt.price && evt.price > 0 ? `$ ${evt.price.toLocaleString('es-AR')}` : 'GRATIS'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          !evt.price || evt.price === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-dance-coral/20 text-dance-coral border-dance-coral/30'
                        }`}
                      >
                        {!evt.price || evt.price === 0 ? 'Entrada libre' : 'Anticipada'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 8. Cartelera Principal de Eventos en Grid Responsivo */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-300 uppercase tracking-wider">
              {selectedGenrePill !== 'todos'
                ? `Cartelera: ${selectedGenrePill} (${filteredEvents.length})`
                : `Cartelera (${filteredEvents.length})`}
            </h2>
            {(selectedGenrePill !== 'todos' || activeDateTab !== 'todos') && (
              <button
                onClick={() => {
                  setSelectedGenrePill('todos');
                  setActiveDateTab('todos');
                }}
                className="text-xs text-dance-coral font-semibold hover:underline cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-8 text-center space-y-3 bg-oled-900/60 rounded-3xl border border-white/10 p-6">
              <p className="text-sm font-bold text-slate-300">
                {activeDateTab === 'hoy'
                  ? 'No hay eventos programados para hoy en tu zona.'
                  : 'No se encontraron eventos para este filtro.'}
              </p>
              <button
                onClick={() => {
                  setSelectedGenrePill('todos');
                  setActiveDateTab('todos');
                  setSearchQuery('');
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-dance-crimson to-dance-coral text-white text-xs font-black shadow-glow-crimson cursor-pointer transition-all hover:scale-105"
              >
                Ver toda la Cartelera
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredEvents.map((evt) => {
                const fav = isFavorite(evt.id);
                const sched = formatEventSchedule(evt.start_time, evt.end_time);

                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className="group bg-oled-900/90 hover:bg-oled-800/90 border border-white/10 hover:border-dance-coral/50 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 flex gap-3 sm:gap-4 items-center cursor-pointer transition-all shadow-glass-card active:scale-[0.99] backdrop-blur-sm"
                  >
                    {/* Flyer Thumbnail con precio overlay (diseño de Agenda) */}
                    <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-oled-900 shrink-0 border border-white/10 shadow-md">
                      <img
                        src={getOptimizedImageUrl(evt.flyer_url, 300, 75)}
                        alt={evt.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-sm text-[9px] sm:text-[10px] font-black text-dance-gold">
                        {evt.is_free ? 'GRATIS' : `$${(evt.advance_ticket_price || evt.price || 0).toLocaleString('es-AR')}`}
                      </span>
                    </div>

                    {/* Datos del Evento (igual a Agenda) */}
                    <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-dance-crimson/20 text-dance-coral text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-dance-crimson/20">
                          {evt.category}
                        </span>
                        <span className="text-[11px] sm:text-xs text-dance-amber font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-dance-amber shrink-0" />
                          {sched.dateLabel} • {sched.timeRange}
                        </span>
                      </div>

                      <h4 className="font-black text-xs sm:text-sm text-white group-hover:text-dance-coral transition-colors line-clamp-2 leading-snug">
                        {evt.title}
                      </h4>

                      <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-400">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{evt.venue_name || evt.address} ({evt.city})</span>
                        </span>
                        {evt.distance_km !== undefined && (
                          <span className="text-dance-coral font-bold shrink-0">
                            {formatDistance(evt.distance_km)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 shrink-0 pr-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(evt.id);
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          fav
                            ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white border-transparent shadow-glow-crimson scale-105'
                            : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
                        }`}
                        title={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${fav ? 'fill-current text-white' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal selector de todos los géneros (cuando pulsa "••• Más") */}
      {showAllGenresModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-oled-900 border border-white/15 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-glass-card animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-white">Todos los Ritmos</h3>
              <button
                onClick={() => setShowAllGenresModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {allGenresList.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    handleGenreClick(g.id);
                    setShowAllGenresModal(false);
                  }}
                  className="p-2.5 rounded-2xl bg-dark-800 hover:bg-dance-coral/20 border border-dark-700 hover:border-dance-coral/40 text-left text-xs text-white font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-base">{g.icon}</span>
                  <span className="truncate">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
