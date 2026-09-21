import React, { useState, useMemo } from 'react';
import type { EventItem } from '../../types';
import { useLocation } from '../../context/LocationContext';
import { useFilters } from '../../context/FilterContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useAuth } from '../../context/AuthContext';
import { calculateHaversineDistance } from '../../lib/geo';
import { parseISODate } from '../../lib/dateUtils';
import {
  Search,
  Sparkles,
  MapPin,
  Clock,
  Heart,
  ChevronRight,
  ChevronDown,
  Bell,
  Bot,
  Flame,
  Radio,
} from 'lucide-react';

interface NewHomeDemoViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onShareEvent: (event: EventItem, e: React.MouseEvent) => void;
  onOpenLocationModal?: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenAIModal: () => void;
  onExitDemo?: () => void;
}

export const NewHomeDemoView: React.FC<NewHomeDemoViewProps> = ({
  events,
  onSelectEvent,
  onShareEvent: _onShareEvent,
  onOpenLocationModal,
  onNavigateTab,
  onOpenAIModal,
  onExitDemo,
}) => {
  const { location } = useLocation();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { filters, setSearchQuery, setDateFilter, setGenreFamily } = useFilters();

  const [activeDateTab, setActiveDateTab] = useState<'hoy' | 'manana' | 'finde' | 'cercano'>('hoy');
  const [selectedGenrePill, setSelectedGenrePill] = useState<string>('todos');
  const [showAllGenresModal, setShowAllGenresModal] = useState(false);

  // Lista de géneros con estilos según la maqueta
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

  // Eventos enriquecidos con distancia
  const processedEvents = useMemo(() => {
    return events
      .filter((e) => e.status === 'publicado' && !e.is_cancelled)
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

  // Cantidad de lugares a menos de 15km para la tarjeta Radar
  const radarPlacesCount = useMemo(() => {
    const near = processedEvents.filter((e) => e.distance_km <= 15);
    return near.length > 0 ? near.length : processedEvents.length;
  }, [processedEvents]);

  // Eventos destacados
  const featuredEvents = useMemo(() => {
    const feat = processedEvents.filter((e) => e.is_featured);
    return feat.length > 0 ? feat : processedEvents.slice(0, 6);
  }, [processedEvents]);

  // Filtrado según búsqueda y género
  const displayEvents = useMemo(() => {
    return processedEvents.filter((evt) => {
      if (selectedGenrePill !== 'todos') {
        const matchGenre =
          evt.genre_family?.toLowerCase().includes(selectedGenrePill) ||
          (evt.subgenres || []).some((s) => s.toLowerCase().includes(selectedGenrePill)) ||
          evt.title.toLowerCase().includes(selectedGenrePill);
        if (!matchGenre) return false;
      }
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const match =
          evt.title.toLowerCase().includes(q) ||
          evt.venue_name.toLowerCase().includes(q) ||
          evt.city.toLowerCase().includes(q) ||
          (evt.subgenres || []).some((s) => s.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [processedEvents, selectedGenrePill, filters.searchQuery]);

  const handleDateTabClick = (tab: 'hoy' | 'manana' | 'finde' | 'cercano') => {
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
      {/* Barra superior de control Demo */}
      <div className="bg-gradient-to-r from-dance-coral/25 via-purple-900/30 to-blue-900/25 border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-dance-crimson to-dance-coral font-black text-[10px] text-white uppercase tracking-wider animate-pulse shadow-glow-crimson/50">
            Modo Demo
          </span>
          <span className="text-slate-200 font-medium hidden sm:inline">
            Maqueta Nuevo Diseño de Portada
          </span>
        </div>
        {onExitDemo && (
          <button
            onClick={onExitDemo}
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/10 cursor-pointer"
          >
            Volver a Vista Clásica
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pt-3 space-y-5">
        {/* 1. Header con Logo, Ubicación, Notificación y Perfil */}
        <header className="flex items-center justify-between pt-1">
          {/* Logo y Ubicación */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-dance-crimson to-dance-coral p-0.5 flex items-center justify-center shadow-glow-coral">
                <div className="w-full h-full bg-oled-950 rounded-full flex items-center justify-center">
                  <Flame className="w-4 h-4 text-dance-coral fill-dance-coral" />
                </div>
              </div>
              <span className="text-2xl font-black tracking-tight flex items-center">
                <span>Sale</span>
                <span className="bg-gradient-to-r from-dance-coral via-orange-400 to-dance-amber bg-clip-text text-transparent">
                  Baile
                </span>
              </span>
            </div>

            {/* Selector de Ubicación */}
            <button
              onClick={onOpenLocationModal}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer pl-10 -mt-1"
            >
              <MapPin className="w-3 h-3 text-dance-coral" />
              <span className="font-semibold">{location.cityName || 'Buenos Aires'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Iconos a la derecha: Campana de Notificación y Avatar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateTab('agenda')}
              className="relative w-9 h-9 rounded-full bg-oled-900 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-dance-crimson text-white text-[9px] font-black flex items-center justify-center shadow-glow-crimson">
                3
              </span>
            </button>

            <button
              onClick={() => onNavigateTab('account')}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-dance-coral to-purple-600 p-0.5 cursor-pointer"
              title="Mi Cuenta"
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

        {/* 2. Título Hero: ¿Dónde bailamos hoy? */}
        <section className="space-y-1 pt-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            ¿Dónde <br />
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">
              bailamos hoy?
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Eventos, clases y sociales cerca tuyo
          </p>
        </section>

        {/* 3. Buscador con Estilo Glassmorphism */}
        <div className="relative">
          <div className="relative flex items-center bg-oled-900/90 border border-white/15 focus-within:border-dance-coral/70 rounded-2xl p-3 shadow-glass-card transition-all group">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-dance-coral ml-1 shrink-0" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscá por género, lugar o fecha..."
              className="w-full bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none px-3"
            />
            <button
              type="button"
              onClick={onOpenAIModal}
              className="text-dance-coral hover:text-dance-amber transition-colors p-1"
              title="Asistente de Búsqueda IA"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
            </button>
          </div>
        </div>

        {/* 4. Selector de Ritmos / Géneros en Dos Filas */}
        <section className="space-y-2">
          {/* Fila 1 */}
          <div className="grid grid-cols-3 gap-2">
            {genrePills.slice(0, 3).map((pill) => {
              const isSelected = selectedGenrePill === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => handleGenreClick(pill.id)}
                  className={`py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                    pill.bgClass
                  } ${
                    isSelected
                      ? `${pill.activeBorder} scale-[1.02] shadow-lg`
                      : 'opacity-90 hover:opacity-100 hover:scale-[1.01]'
                  }`}
                >
                  <span className="text-sm">{pill.icon}</span>
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
                  className={`py-2 px-2 rounded-2xl flex items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                    pill.bgClass
                  } ${
                    isSelected
                      ? `${pill.activeBorder} scale-[1.02] shadow-lg`
                      : 'opacity-90 hover:opacity-100 hover:scale-[1.01]'
                  }`}
                >
                  <span>{pill.icon}</span>
                  <span className="truncate">{pill.label}</span>
                </button>
              );
            })}

            {/* Botón Más */}
            <button
              onClick={() => setShowAllGenresModal(true)}
              className="py-2 px-2 rounded-2xl bg-oled-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer"
            >
              <span>••• Más</span>
            </button>
          </div>
        </section>

        {/* 5. Tarjeta Banner: Radar de Baile (IA) */}
        <section>
          <div
            onClick={() => onNavigateTab('map')}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/40 via-rose-950/30 to-oled-900 border border-dance-crimson/50 hover:border-dance-crimson p-4 shadow-glow-crimson/20 cursor-pointer transition-all hover:scale-[1.01] group"
          >
            {/* Resplandor decorativo de fondo */}
            <div className="absolute -top-10 -left-10 w-28 h-28 bg-dance-crimson/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                {/* Animación de Radar con círculos concéntricos */}
                <div className="w-11 h-11 rounded-2xl bg-dance-crimson/15 border border-dance-crimson/40 flex items-center justify-center shrink-0 relative">
                  <div className="absolute inset-0 rounded-2xl border border-dance-crimson/30 animate-ping opacity-30" />
                  <Radio className="w-5 h-5 text-dance-crimson animate-pulse" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white">Radar de Baile</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-dance-crimson text-white text-[9px] font-black tracking-wide uppercase">
                      IA
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    <span className="text-dance-coral font-bold">{radarPlacesCount} lugares</span> para bailar esta noche a menos de 15 km
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </section>

        {/* 6. Pestañas de Filtro Rápido de Fechas */}
        <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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

        {/* 7. Sección: Eventos destacados (Carrusel Horizontal) */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🔥</span>
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Eventos destacados
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('explore')}
              className="text-xs font-bold text-dance-coral hover:text-dance-amber transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Carrusel Horizontal de Tarjetas */}
          <div className="flex gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory">
            {featuredEvents.map((evt) => {
              const fav = isFavorite(evt.id);
              const startDate = parseISODate(evt.start_time);
              const timeString = startDate.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="w-56 shrink-0 snap-start bg-oled-900/90 border border-white/10 hover:border-dance-coral/40 rounded-3xl overflow-hidden shadow-glass-card cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
                >
                  {/* Imagen de Flyer con Corazón */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-dark-900">
                    <img
                      src={evt.flyer_url}
                      alt={evt.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-oled-900 via-transparent to-black/30" />

                    {/* Botón Favorito */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(evt.id);
                      }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:text-rose-400 transition-colors"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          fav ? 'fill-dance-crimson text-dance-crimson' : 'text-white'
                        }`}
                      />
                    </button>

                    {/* Tag de Categoría / Ritmo */}
                    <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-black text-rose-300">
                        {evt.category === 'social' ? 'Social' : evt.category}
                        {evt.genre_family ? ` • ${evt.genre_family.split('-')[0]}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Datos del Evento */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-white line-clamp-1">
                        {evt.title}
                      </h3>
                      <div className="space-y-1 pt-1 text-[11px] text-slate-300">
                        <p className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-dance-coral shrink-0" />
                          <span className="truncate">{evt.venue_name || evt.address}</span>
                        </p>
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Hoy {timeString}
                          </span>
                          {evt.distance_km !== undefined && (
                            <span className="text-dance-coral font-semibold">
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

        {/* 8. Sección: Eventos en el Mapa (Mini Preview Interactivo) */}
        <section className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-dance-coral" />
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Eventos en el mapa
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs font-bold text-dance-coral hover:text-dance-amber transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <span>Ver mapa completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tarjeta Visual de Mapa */}
          <div
            onClick={() => onNavigateTab('map')}
            className="relative h-28 w-full rounded-3xl overflow-hidden border border-white/15 bg-dark-900 cursor-pointer group shadow-glass-card"
          >
            {/* Imagen simulada de mapa oscuro con puntos brillantes */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e2640_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-r from-oled-950/80 via-transparent to-oled-950/80" />

            {/* Pines decorativos que brillan */}
            <div className="absolute top-6 left-12 flex flex-col items-center animate-bounce">
              <div className="w-5 h-5 rounded-full bg-dance-crimson flex items-center justify-center shadow-glow-crimson text-[9px] font-black text-white">
                📍
              </div>
            </div>
            <div className="absolute top-10 right-16 flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-dance-coral flex items-center justify-center shadow-glow-coral text-[9px] font-black text-white animate-pulse">
                📍
              </div>
            </div>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-oled-900/90 border border-white/15 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-dance-emerald animate-ping" />
              <span className="text-xs font-bold text-white">
                {location.cityName || 'Buenos Aires'} • {processedEvents.length} eventos activos
              </span>
            </div>
          </div>
        </section>

        {/* Lista general si se buscó por filtro */}
        {selectedGenrePill !== 'todos' && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                Resultados para {selectedGenrePill} ({displayEvents.length})
              </h2>
              <button
                onClick={() => setSelectedGenrePill('todos')}
                className="text-xs text-dance-coral font-semibold"
              >
                Limpiar filtro
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {displayEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="bg-oled-900/80 border border-white/10 rounded-2xl p-3 flex gap-3 cursor-pointer hover:border-dance-coral/40"
                >
                  <img
                    src={evt.flyer_url}
                    alt=""
                    className="w-16 h-20 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-bold text-xs text-white truncate">{evt.title}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{evt.venue_name}</p>
                    <p className="text-[10px] text-dance-coral font-bold">
                      {evt.price && evt.price > 0 ? `$ ${evt.price}` : 'GRATIS'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 9. Botón Flotante "Buscar con IA" */}
      <div className="fixed bottom-20 right-4 z-40">
        <button
          onClick={onOpenAIModal}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-dance-coral via-dance-crimson to-purple-600 text-white shadow-glow-crimson hover:scale-105 transition-all cursor-pointer border border-white/20"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-black leading-tight">Buscar con IA</p>
            <p className="text-[9px] text-rose-100 font-medium leading-tight">
              Decime qué querés bailar &gt;
            </p>
          </div>
        </button>
      </div>

      {/* Modal selector de todos los géneros (cuando pulsa "••• Más") */}
      {showAllGenresModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-oled-900 border border-white/15 rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-white">Todos los Ritmos</h3>
              <button
                onClick={() => setShowAllGenresModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {[
                { id: 'salsa', name: 'Salsa', icon: '💃' },
                { id: 'bachata', name: 'Bachata', icon: '🕺' },
                { id: 'rock', name: 'Rock', icon: '🎸' },
                { id: 'tango', name: 'Tango', icon: '💃' },
                { id: 'cumbia', name: 'Cumbia', icon: '🕺' },
                { id: 'electronica', name: 'Electrónica', icon: '🎵' },
                { id: 'merengue', name: 'Merengue', icon: '🎺' },
                { id: 'kizomba', name: 'Kizomba', icon: '✨' },
                { id: 'folklore', name: 'Folklore', icon: '🪘' },
                { id: 'reggaeton', name: 'Reggaetón / Urbano', icon: '🔥' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    handleGenreClick(g.id);
                    setShowAllGenresModal(false);
                  }}
                  className="p-2 rounded-xl bg-dark-800 hover:bg-dance-coral/20 border border-dark-700 text-left text-xs text-white font-semibold flex items-center gap-2"
                >
                  <span>{g.icon}</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
