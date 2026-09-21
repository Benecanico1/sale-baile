import React from 'react';
import type { EventItem } from '../../types';
import { useFavorites } from '../../context/FavoritesContext';
import { EventCard } from '../explore/EventCard';
import { Heart, Compass } from 'lucide-react';

interface FavoritesViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onShareEvent: (event: EventItem, e: React.MouseEvent) => void;
  onGoToExplore: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  events,
  onSelectEvent,
  onShareEvent,
  onGoToExplore,
}) => {
  const { favorites } = useFavorites();
  const favoriteEvents = events.filter((e) => favorites.includes(e.id));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-28 space-y-5 bg-oled-950 min-h-screen">
      {/* Header con diseño glassmorphism */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-dance-crimson to-dance-coral flex items-center justify-center text-white shrink-0 shadow-glow-crimson">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-white">Favoritos</h1>
            <p className="text-[11px] sm:text-xs text-slate-400">Sociales y talleres que guardaste</p>
          </div>
        </div>

        <span className="px-3 py-1.5 bg-oled-900/90 backdrop-blur-sm rounded-full text-[11px] sm:text-xs font-black text-slate-300 border border-white/10 shrink-0">
          {favoriteEvents.length} guardados
        </span>
      </div>

      {favoriteEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {favoriteEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
              onShare={onShareEvent}
            />
          ))}
        </div>
      ) : (
        <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-10 sm:p-14 text-center space-y-5 max-w-md mx-auto my-8 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-dance-crimson/20 to-dance-coral/10 border border-dance-crimson/30 flex items-center justify-center text-dance-coral mx-auto shadow-glow-crimson">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-white">No tienes eventos guardados</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Toca el corazón en cualquier flyer para guardarlo aquí y no perderte ninguna fiesta.
            </p>
          </div>
          <button
            onClick={onGoToExplore}
            className="px-5 py-3 bg-gradient-to-r from-dance-crimson to-dance-coral text-white font-black text-xs rounded-xl shadow-glow-crimson inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            Explorar Eventos
          </button>
        </div>
      )}
    </div>
  );
};
