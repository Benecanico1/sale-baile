import React, { useState } from 'react';
import type { EventItem } from '../../types';
import { formatEventSchedule, isEventExpired, isEventFinished, getHoursUntilArchive } from '../../lib/dateUtils';
import { formatDistance } from '../../lib/geo';
import { formatGenreBadge } from '../../lib/danceCategories';
import { useFavorites } from '../../context/FavoritesContext';
import { getOptimizedImageUrl } from '../../lib/imageOptimizer';
import { getEventClicks, recordEventClick } from '../../lib/eventClicks';
import { MapPin, Calendar, Heart, Share2, AlertCircle, ArrowUpRight, History, Film, Image as ImageIcon, Eye } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
  onShare: (event: EventItem, e: React.MouseEvent) => void;
  isPriority?: boolean;
}

const CATEGORY_STYLES: Record<string, { label: string; tag: string; border: string }> = {
  social: { label: 'Social', tag: 'bg-[#ff2d55]/20 text-[#ff2d55]', border: 'border-[#ff2d55]/30' },
  clase: { label: 'Clase', tag: 'bg-[#38bdf8]/20 text-[#38bdf8]', border: 'border-[#38bdf8]/30' },
  taller: { label: 'Taller', tag: 'bg-[#ffb300]/20 text-[#ffb300]', border: 'border-[#ffb300]/30' },
  festival: { label: 'Festival', tag: 'bg-[#a855f7]/20 text-[#a855f7]', border: 'border-[#a855f7]/30' },
  practica: { label: 'Práctica', tag: 'bg-[#10b981]/20 text-[#10b981]', border: 'border-[#10b981]/30' },
};

const EventCardComponent: React.FC<EventCardProps> = ({ event, onSelect, onShare, isPriority = false }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [clicks, setClicks] = useState<number>(() => getEventClicks(event.id, event.clicks_count));
  const isFav = isFavorite(event.id);
  const schedule = formatEventSchedule(event.start_time, event.end_time);
  const categoryStyle = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.social;
  const genreBadge = formatGenreBadge(event.genre_family, event.subgenres);
  const isExpired = isEventExpired(event.end_time);
  const isFinished = isEventFinished(event.end_time);
  const hoursLeft = getHoursUntilArchive(event.end_time);

  const hasVideo = event.gallery?.some((g) => g.type === 'video');
  const mediaCount = event.gallery?.length || 1;

  const optimizedFlyer = getOptimizedImageUrl(event.flyer_url, 480, 75);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(event.id);
  };

  const handleCardClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextClicks = recordEventClick(event.id);
    setClicks(nextClicks);
    onSelect(event);
  };

  return (
    <article
      onClick={handleCardClick}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '320px 480px' }}
      className={`group relative bg-oled-900/90 rounded-[28px] border p-3.5 sm:p-4 cursor-pointer transition-all duration-200 sm:hover:scale-[1.015] sm:hover:border-dance-crimson/50 active:scale-[0.99] ${
        event.is_cancelled ? 'border-red-900/60 opacity-80' : 'border-white/10'
      }`}
    >
      {/* Flyer adaptado al espacio visible con marco y fondo oscuro nítido */}
      <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#141926] via-oled-950 to-black border border-white/10 shadow-lg flex items-center justify-center">
        {/* Placeholder / Fondo estilizado de carga inmediata */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-850 to-dark-950 flex items-center justify-center pointer-events-none">
          <span className="text-2xl opacity-15">💃</span>
        </div>

        {/* Imagen principal que llena todo el espacio del recuadro */}
        <img
          src={optimizedFlyer}
          alt={`Flyer de ${event.title}`}
          className="relative z-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out will-change-transform"
          loading={isPriority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={isPriority ? 'high' : 'auto'}
        />

        {/* Gradiente cinemático para máxima legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-oled-950/90 via-oled-950/20 to-black/40 pointer-events-none z-1" />

        {/* Badges Superiores */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-30 pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Badge de Historial (Caducado +24hs) */}
            {isExpired && !event.is_cancelled && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                <History className="w-3 h-3" />
                <span>HISTORIAL</span>
              </span>
            )}

            {/* Badge de Finalizado Reciente (antes de las 24hs) */}
            {!isExpired && isFinished && !event.is_cancelled && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-slate-700 flex items-center gap-1" title={`Pasa al historial en ${hoursLeft} hs`}>
                <span>🕒</span>
                <span>FINALIZÓ</span>
              </span>
            )}

            {/* Badge de Destacado Premium (Admin) */}
            {event.is_featured && !event.is_cancelled && !isExpired && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md flex items-center gap-1 border border-amber-300">
                <span>⭐</span>
                <span>DESTACADO</span>
              </span>
            )}

            {!isExpired && !isFinished && schedule.relativeBadge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-crimson animate-pulse">
                {schedule.relativeBadge}
              </span>
            )}
            {event.is_cancelled && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                CANCELADO
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => onShare(event, e)}
              className="p-2 rounded-full bg-oled-950/80 hover:bg-oled-800 text-white backdrop-blur-md transition-colors border border-white/15"
              title="Compartir evento"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFavoriteClick}
              className={`p-2 rounded-full backdrop-blur-md transition-all border border-white/15 ${
                isFav
                  ? 'bg-dance-crimson text-white scale-110 shadow-glow-crimson'
                  : 'bg-oled-950/80 hover:bg-oled-800 text-slate-300 hover:text-white'
              }`}
              title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Badges Inferiores dentro del marco del flyer: Social y Bachata donde estaba el precio */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2 z-10 pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Categoría (Social, Clase, Taller...) */}
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xl border shadow-sm ${categoryStyle.tag} ${categoryStyle.border}`}>
              {categoryStyle.label}
            </span>

            {/* Género de Baile (Bachata, Salsa, etc.) donde estaba el precio */}
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-sm flex items-center gap-1 ${genreBadge.badgeBg} ${genreBadge.badgeText} ${genreBadge.border}`}>
              <span>{genreBadge.icon}</span>
              <span>{genreBadge.label}</span>
            </span>

            {hasVideo ? (
              <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-dance-coral font-bold text-[10px] border border-dance-coral/30 flex items-center gap-1 shadow-sm">
                <Film className="w-3 h-3" />
                <span>VIDEO</span>
              </span>
            ) : mediaCount > 1 ? (
              <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-slate-200 font-bold text-[10px] border border-white/20 flex items-center gap-1 shadow-sm">
                <ImageIcon className="w-3 h-3 text-dance-coral" />
                <span>+{mediaCount}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Contenido Minimalista: Fecha, Hora, Precio, Kilometraje, Contador de Clics, Botón "Ver detalles" y Corazón */}
      <div className="pt-3 px-1 pb-1 space-y-2.5">
        {/* Fila 1: Fecha y Hora + Contador de Clics */}
        <div className="flex items-center justify-between gap-2">
          {event.class_days && event.class_days.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-dance-coral truncate">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{event.class_days.join(' • ')} • {schedule.startTime}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-dance-coral truncate">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{schedule.dateLabel}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-semibold">{schedule.startTime}</span>
            </div>
          )}

          {/* Contador de Clics / Visualizaciones */}
          <div
            className="flex items-center gap-1 text-[11px] font-extrabold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg shrink-0"
            title={`${clicks} personas abrieron este flyer`}
          >
            <Eye className="w-3 h-3 text-dance-amber" />
            <span>{clicks}</span>
          </div>
        </div>

        {/* Fila 2 (Arriba de Ver detalles): Precio y Kilometraje */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Precio */}
          <div className="flex items-center gap-1.5">
            {event.is_free ? (
              <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-dance-emerald/20 text-dance-emerald border border-dance-emerald/30">
                GRATIS
              </span>
            ) : event.price ? (
              <div className="flex items-baseline gap-1">
                <span className="text-[11px] text-slate-400 font-medium">{event.currency || 'ARS'}</span>
                <span className="text-sm font-black text-dance-amber">
                  ${event.price?.toLocaleString('es-AR')}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-amber-300/90">
                A consultar
              </span>
            )}
          </div>

          {/* Kilometraje de ubicación */}
          {event.distance_meters !== undefined && (
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg shrink-0">
              <MapPin className="w-3 h-3 text-dance-coral shrink-0" />
              <span>{formatDistance(event.distance_meters / 1000)}</span>
            </div>
          )}
        </div>

        {/* Fila 3: Botón Ver Detalles y Corazoncito */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleCardClick}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-dance-crimson to-dance-coral hover:opacity-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-glow-crimson transition-all cursor-pointer group-hover:scale-[1.01]"
          >
            <span>Ver detalles</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>

          <button
            type="button"
            onClick={handleFavoriteClick}
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
    </article>
  );
};

export const EventCard = React.memo(EventCardComponent);
