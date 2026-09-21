import React, { useState, useMemo } from 'react';
import type { EventItem } from '../../types';
import { useLocation } from '../../context/LocationContext';
import { useFilters } from '../../context/FilterContext';
import { calculateHaversineDistance, formatDistance } from '../../lib/geo';
import { isEventExpired, parseISODate, formatEventSchedule } from '../../lib/dateUtils';
import { getOptimizedImageUrl } from '../../lib/imageOptimizer';
import { FilterChips } from '../explore/FilterChips';
import { LocationHeader } from '../common/LocationHeader';
import { Calendar, Clock, MapPin, Heart, MoreVertical } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';

interface AgendaViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onOpenLocationModal: () => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  onSelectEvent,
  onOpenLocationModal,
}) => {
  const { location } = useLocation();
  const { filters } = useFilters();
  const { isFavorite, toggleFavorite } = useFavorites();

  const groupedAgenda = useMemo(() => {
    const validEvents = events
      .filter((evt) => {
        if (evt.status !== 'publicado' && !evt.is_cancelled) return false;
        if (isEventExpired(evt.end_time)) return false;
        if (filters.category !== 'all' && evt.category !== filters.category) return false;

        const distanceKm = calculateHaversineDistance(
          location.latitude,
          location.longitude,
          evt.latitude,
          evt.longitude
        );
        if (distanceKm > filters.radiusKm) return false;

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
          distance_meters: distanceKm * 1000,
        };
      })
      .sort((a, b) => parseISODate(a.start_time).getTime() - parseISODate(b.start_time).getTime());

    const groups: Record<string, { label: string; dateObj: Date; items: typeof validEvents }> = {};

    validEvents.forEach((evt) => {
      const date = parseISODate(evt.start_time);
      const key = date.toISOString().split('T')[0];
      const sched = formatEventSchedule(evt.start_time, evt.end_time);

      if (!groups[key]) {
        groups[key] = {
          label: sched.dateLabel,
          dateObj: date,
          items: [],
        };
      }
      groups[key].items.push(evt);
    });

    return Object.values(groups);
  }, [events, location, filters]);

  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [agendaScope, setAgendaScope] = useState<'upcoming' | 'past'>('upcoming');

  const next7Days = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push({
        dateObj: d,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '').toUpperCase(),
        monthName: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '').toUpperCase(),
        dateString: d.toDateString(),
      });
    }
    return days;
  }, []);

  const filteredGroupedAgenda = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let list = groupedAgenda.filter((g) => {
      const gDate = new Date(g.dateObj);
      gDate.setHours(0, 0, 0, 0);
      if (agendaScope === 'past') {
        return gDate.getTime() < today.getTime();
      } else {
        return gDate.getTime() >= today.getTime();
      }
    });

    if (selectedCalendarDay) {
      list = list.filter((g) => g.dateObj.toDateString() === selectedCalendarDay);
    }
    return list;
  }, [groupedAgenda, selectedCalendarDay, agendaScope]);

  return (
    <div className="pb-28 bg-oled-950 min-h-screen">
      <LocationHeader onOpenLocationModal={onOpenLocationModal} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
        {/* Selector de Pestañas: Próximos / Pasados (Pantalla 8 de la Maqueta) */}
        <div className="flex items-center p-1 rounded-2xl bg-oled-900/90 border border-white/10 max-w-xs mx-auto shadow-lg">
          <button
            type="button"
            onClick={() => setAgendaScope('upcoming')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              agendaScope === 'upcoming'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-crimson'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Próximos
          </button>
          <button
            type="button"
            onClick={() => setAgendaScope('past')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              agendaScope === 'past'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-crimson'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pasados
          </button>
        </div>

        {/* Tira de Calendario Semanal Interactivo (Interactive Weekly Calendar - Pantalla 3 y 8) */}
        <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-dance-crimson to-dance-coral flex items-center justify-center shadow-glow-crimson">
                <Calendar className="w-3.5 h-3.5 text-white" />
              </div>
              Calendario Semanal
            </h2>
            {selectedCalendarDay && (
              <button
                type="button"
                onClick={() => setSelectedCalendarDay(null)}
                className="text-[11px] font-bold text-dance-coral hover:underline"
              >
                Ver todos los días
              </button>
            )}
          </div>

          {/* Carrusel horizontal de días de la semana */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
            {next7Days.map((day) => {
              const isSelected = selectedCalendarDay === day.dateString;
              return (
                <button
                  key={day.dateString}
                  type="button"
                  onClick={() =>
                    setSelectedCalendarDay(isSelected ? null : day.dateString)
                  }
                  className={`flex flex-col items-center justify-center min-w-[54px] sm:min-w-[64px] py-2.5 px-2 rounded-2xl transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#ff2d55] bg-gradient-to-b from-[#ff2d55]/25 to-[#ff5500]/15 shadow-[0_0_20px_rgba(255,45,85,0.4)] scale-105'
                      : 'border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-400'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-dance-coral' : 'text-slate-500'}`}>
                    {day.monthName}
                  </span>
                  <span className={`text-base sm:text-lg font-black leading-tight my-0.5 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {day.dayNum}
                  </span>
                  <span className={`text-[9px] font-black uppercase ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                    {day.dayName}
                  </span>
                </button>
              );
            })}
          </div>

          <FilterChips />
        </div>

        {filteredGroupedAgenda.length > 0 ? (
          <div className="space-y-6 sm:space-y-8 pt-1">
            {filteredGroupedAgenda.map((group, idx) => (
              <section key={idx} className="space-y-2.5 sm:space-y-3">
                {/* Fecha Sticky con diseño OLED */}
                <div className="sticky top-16 z-20 py-2 sm:py-2.5 bg-oled-950/98 backdrop-blur-xl flex items-center justify-between border-b border-white/8">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-dance-crimson/30 to-dance-coral/20 border border-dance-crimson/40 flex items-center justify-center text-dance-coral font-black text-sm sm:text-base shadow-sm">
                      {group.dateObj.getDate()}
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-white capitalize">{group.label}</h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/5 backdrop-blur-sm text-slate-300 text-[11px] sm:text-xs font-bold border border-white/10">
                    {group.items.length} {group.items.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {group.items.map((event) => {
                    const sched = formatEventSchedule(event.start_time, event.end_time);
                    const isFav = isFavorite(event.id);
                    return (
                      <div
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className="group bg-oled-900/90 hover:bg-oled-800/90 border border-white/8 hover:border-dance-crimson/50 rounded-2xl p-2.5 sm:p-4 flex gap-3 sm:gap-4 items-center cursor-pointer transition-all shadow-lg active:scale-[0.99] backdrop-blur-sm"
                      >
                        {/* Thumbnail con precio overlay */}
                        <div className="relative w-16 h-20 sm:w-24 sm:h-28 rounded-xl overflow-hidden bg-oled-900 shrink-0 border border-white/10">
                          <img
                            src={getOptimizedImageUrl(event.flyer_url, 300, 70)}
                            alt={event.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] sm:text-[10px] font-black text-dance-gold">
                            {event.is_free ? 'GRATIS' : `$${event.price?.toLocaleString('es-AR')}`}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-dance-crimson/20 text-dance-coral text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-dance-crimson/20">
                              {event.category}
                            </span>
                            <span className="text-[11px] sm:text-xs text-dance-amber font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              {sched.timeRange}
                            </span>
                          </div>

                          <h4 className="font-black text-xs sm:text-sm text-white group-hover:text-dance-coral transition-colors line-clamp-2 leading-snug">
                            {event.title}
                          </h4>

                          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-400">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 shrink-0" />
                              {event.venue_name} ({event.city})
                            </span>
                            {event.distance_meters !== undefined && (
                              <span className="text-dance-coral font-bold shrink-0">
                                {formatDistance(event.distance_meters / 1000)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(event.id);
                            }}
                            className={`p-2 rounded-xl border transition-all ${
                              isFav
                                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white border-transparent shadow-glow-crimson scale-105'
                                : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFav ? 'fill-current' : ''}`} />
                          </button>
                          <div className="p-1.5 rounded-xl text-slate-400 hover:text-white transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-base font-black text-white">No hay eventos en la agenda</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Prueba cambiando la categoría o ampliando el radio de búsqueda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
