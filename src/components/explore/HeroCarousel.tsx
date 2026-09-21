import React, { useState, useEffect, useRef } from 'react';
import type { EventItem } from '../../types';
import { formatEventSchedule } from '../../lib/dateUtils';
import { formatDistance } from '../../lib/geo';
import { formatGenreBadge } from '../../lib/danceCategories';
import { useFavorites } from '../../context/FavoritesContext';
import { getOptimizedImageUrl, markImageAsLoaded } from '../../lib/imageOptimizer';
import { recordEventClick, getEventClicks } from '../../lib/eventClicks';
import {
  Flame,
  Calendar,
  Heart,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Eye,
  MapPin,
} from 'lucide-react';

interface HeroCarouselProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ events, onSelectEvent }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ÚNICAMENTE eventos que el Administrador marcó con is_featured: true
  const featured = events.filter(
    (e) => e.is_featured === true && e.status === 'publicado' && !e.is_cancelled
  );

  const nextSlide = () => {
    if (featured.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  const prevSlide = () => {
    if (featured.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  // Movimiento automático de los destacados
  useEffect(() => {
    if (featured.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 2800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [featured.length, isPaused]);

  if (featured.length === 0) return null;

  const validIndex = currentIndex < featured.length ? currentIndex : 0;
  const currentEvent = featured[validIndex] || featured[0];
  const schedule = formatEventSchedule(currentEvent.start_time, currentEvent.end_time);
  const isFav = isFavorite(currentEvent.id);
  const genreBadge = formatGenreBadge(currentEvent.genre_family, currentEvent.subgenres);

  return (
    <div
      className="relative w-full my-3 overflow-hidden rounded-2xl select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Ambient background glow */}
      <div
        className="ambient-hero-glow"
        style={{
          background: `radial-gradient(circle, rgba(255, 45, 85, 0.35) 0%, rgba(255, 107, 74, 0.15) 50%, transparent 80%)`,
        }}
      />

      <div className="relative z-10">
        {/* Header de Sección */}
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-dance-crimson/20 text-dance-crimson border border-dance-crimson/30 shadow-glow-crimson">
              <Flame className="w-4 h-4 fill-current animate-pulse" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                IMPERDIBLES VIP <span className="text-dance-coral font-extrabold text-xs">• CARTELERA ESTRELLA</span>
              </h2>
              <span className="text-[10px] text-slate-400 block font-medium">
                Los eventos más destacados y esperados de la temporada
              </span>
            </div>
          </div>

          {featured.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevSlide}
                className="p-1.5 rounded-full bg-oled-900/80 hover:bg-oled-800 text-slate-300 hover:text-white border border-white/10 transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="p-1.5 rounded-full bg-oled-900/80 hover:bg-oled-800 text-slate-300 hover:text-white border border-white/10 transition-colors"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Hero Card con Flyer que llena todo el espacio y pie minimalista */}
        <div
          onClick={() => {
            recordEventClick(currentEvent.id);
            onSelectEvent(currentEvent);
          }}
          className="group relative w-full max-w-xl mx-auto bg-oled-900/90 rounded-[28px] border border-white/10 p-3.5 sm:p-4 shadow-2xl cursor-pointer hover:border-dance-crimson/50 transition-all duration-300"
        >
          {/* Contenedor del Flyer ocupando todo el espacio con marco redondeado */}
          <div className="relative aspect-[4/5] sm:aspect-[16/10] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#141926] via-oled-950 to-black border border-white/15 shadow-xl flex items-center justify-center">
            {/* Imagen principal que llena todo el espacio del recuadro */}
            <img
              src={getOptimizedImageUrl(currentEvent.flyer_url, 600, 80)}
              alt={currentEvent.title}
              className="relative z-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out will-change-transform"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={() => markImageAsLoaded(currentEvent.flyer_url)}
            />

            {/* Gradiente cinemático para máxima legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-t from-oled-950/90 via-transparent to-black/50 pointer-events-none z-1" />

            {/* Badges superiores Flotantes: Arriba queda solo Destacado */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-30 pointer-events-auto">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md flex items-center gap-1 border border-amber-300">
                <span>⭐</span>
                <span>DESTACADO VIP</span>
              </span>
            </div>

            {/* Badges Inferiores dentro del flyer: Social y Bachata donde estaba el precio */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2 z-10 pointer-events-auto">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-oled-950/90 backdrop-blur-md text-white uppercase tracking-wider border border-white/20 shadow-sm">
                  {currentEvent.category}
                </span>

                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-sm flex items-center gap-1 ${genreBadge.badgeBg} ${genreBadge.badgeText} ${genreBadge.border}`}>
                  <span>{genreBadge.icon}</span>
                  <span>{genreBadge.label}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Contenido Minimalista: Fecha, Hora, Precio, Kilometraje, Contador de Clics, Botón "Ver detalles" y Corazón */}
          <div className="pt-3 px-1 pb-1 space-y-2.5">
            {/* Fila 1: Fecha y Hora de entrada solamente + Contador de Clics */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-dance-coral truncate">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{schedule.dateLabel}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-semibold">{schedule.startTime}</span>
              </div>

              {/* Contador de Clics / Visualizaciones */}
              <div
                className="flex items-center gap-1 text-[11px] font-extrabold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg shrink-0"
                title={`${getEventClicks(currentEvent.id, currentEvent.clicks_count)} personas abrieron este flyer`}
              >
                <Eye className="w-3 h-3 text-dance-amber" />
                <span>{getEventClicks(currentEvent.id, currentEvent.clicks_count)}</span>
              </div>
            </div>

            {/* Fila 2 (Arriba de Ver detalles): Precio y Kilometraje */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {/* Precio */}
              <div className="flex items-center gap-1.5">
                {currentEvent.is_free ? (
                  <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-dance-emerald/20 text-dance-emerald border border-dance-emerald/30">
                    GRATIS
                  </span>
                ) : currentEvent.price ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] text-slate-400 font-medium">{currentEvent.currency || 'ARS'}</span>
                    <span className="text-sm font-black text-dance-amber">
                      ${currentEvent.price?.toLocaleString('es-AR')}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-amber-300/90">
                    A consultar
                  </span>
                )}
              </div>

              {/* Kilometraje de ubicación si está disponible */}
              {currentEvent.distance_meters !== undefined && (
                <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg shrink-0">
                  <MapPin className="w-3 h-3 text-dance-coral shrink-0" />
                  <span>{formatDistance(currentEvent.distance_meters / 1000)}</span>
                </div>
              )}
            </div>

            {/* Fila 3: Botón Ver Detalles y Corazoncito */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-glow-crimson transition-all cursor-pointer group-hover:scale-[1.01]"
              >
                <span>Ver detalles</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(currentEvent.id);
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                  isFav
                    ? 'bg-dance-crimson/20 border-dance-crimson text-dance-crimson'
                    : 'bg-oled-950/80 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
                title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                aria-label="Favorito"
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

          {/* Dots Indicator interactivos */}
          {featured.length > 1 && (
            <div className="flex justify-center items-center gap-1.5 pt-3">
              {featured.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === currentIndex ? 'w-6 bg-gradient-to-r from-dance-crimson to-dance-coral' : 'w-2 bg-white/25 hover:bg-white/50'
                  }`}
                  aria-label={`Ver destacado ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
  );
};
