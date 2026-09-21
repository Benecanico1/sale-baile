import React from 'react';
import { useFilters } from '../../context/FilterContext';
import type { EventCategory } from '../../types';
import { DANCE_GENRE_FAMILIES, getGenreFamilyById } from '../../lib/danceCategories';

export const CategoryChips: React.FC = () => {
  const { filters, setCategory, setGenreFamily, setSelectedSubgenre } = useFilters();

  const activeFamily = filters.genreFamily !== 'all' ? getGenreFamilyById(filters.genreFamily) : null;

  const formatCategories: { id: EventCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'Todos los formatos', icon: '✨' },
    { id: 'social', label: 'Sociales / Matinés', icon: '🍸' },
    { id: 'clase', label: 'Clases', icon: '🕺' },
    { id: 'taller', label: 'Talleres', icon: '🎯' },
    { id: 'festival', label: 'Festivales', icon: '🎪' },
    { id: 'practica', label: 'Prácticas', icon: '🎧' },
  ];

  return (
    <div className="space-y-2.5 py-1">
      {/* Nivel 1: Familias de Baile & Ritmos */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar select-none">
          <button
            onClick={() => setGenreFamily('all')}
            className={`px-4 py-2 rounded-2xl shrink-0 font-bold text-xs transition-all flex items-center gap-2 border ${
              filters.genreFamily === 'all'
                ? 'bg-white text-oled-950 border-white shadow-lg scale-105 font-black'
                : 'bg-oled-900/90 hover:bg-oled-850 text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <span>✨</span>
            <span>Todos los Ritmos</span>
          </button>

          {DANCE_GENRE_FAMILIES.map((family) => {
            const isSelected = filters.genreFamily === family.id;
            return (
              <button
                key={family.id}
                onClick={() => setGenreFamily(isSelected ? 'all' : family.id)}
                className={`px-4 py-2 rounded-2xl shrink-0 font-bold text-xs transition-all flex items-center gap-2 border ${
                  isSelected
                    ? `${family.badgeBg} ${family.badgeText} ${family.border} ring-2 ring-current font-black scale-105 shadow-lg`
                    : 'bg-oled-900/90 hover:bg-oled-850 text-slate-300 border-white/10 hover:border-white/20'
                }`}
              >
                <span>{family.icon}</span>
                <span>{family.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nivel 2: Subgéneros si hay una familia seleccionada */}
      {activeFamily && activeFamily.subgenres.length > 0 && (
        <div className="animate-fadeIn">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none bg-oled-900/50 p-1.5 rounded-2xl border border-white/5">
            <span className="text-[11px] font-bold text-slate-400 pl-2 pr-1 uppercase tracking-wider shrink-0">
              Estilo:
            </span>
            <button
              onClick={() => setSelectedSubgenre(undefined)}
              className={`px-3 py-1 rounded-xl shrink-0 text-xs font-semibold transition-all border ${
                !filters.selectedSubgenre
                  ? 'bg-white text-oled-950 border-white font-bold'
                  : 'bg-oled-950/60 hover:bg-oled-850 text-slate-300 border-white/5'
              }`}
            >
              Todos en {activeFamily.shortName}
            </button>
            {activeFamily.subgenres.map((sub) => {
              const isSubSelected = filters.selectedSubgenre === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubgenre(isSubSelected ? undefined : sub.id)}
                  className={`px-3 py-1 rounded-xl shrink-0 text-xs font-semibold transition-all border ${
                    isSubSelected
                      ? 'bg-dance-crimson text-white border-dance-crimson font-bold shadow-sm'
                      : 'bg-oled-950/60 hover:bg-oled-850 text-slate-300 border-white/5'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nivel 3: Formato de Actividad (Social, Clase, Taller...) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
        {formatCategories.map((fmt) => {
          const isFmtSelected = filters.category === fmt.id;
          return (
            <button
              key={fmt.id}
              onClick={() => setCategory(fmt.id)}
              className={`px-3 py-1.5 rounded-xl shrink-0 text-[11px] font-medium transition-all flex items-center gap-1.5 border ${
                isFmtSelected
                  ? 'bg-[#1e2436] text-white border-white/30 font-bold'
                  : 'bg-oled-950/80 hover:bg-oled-900 text-slate-400 border-white/5'
              }`}
            >
              <span>{fmt.icon}</span>
              <span>{fmt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
