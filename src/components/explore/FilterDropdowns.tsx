import React, { useState, useRef, useEffect } from 'react';
import { useFilters } from '../../context/FilterContext';
import { DANCE_GENRE_FAMILIES, getGenreFamilyById } from '../../lib/danceCategories';
import type { EventCategory, QuickDateFilter, SortOption } from '../../types';
import {
  ChevronDown,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';

interface FilterDropdownsProps {
  onOpenCustomDateModal: () => void;
}

const FORMAT_OPTIONS: { id: EventCategory | 'all'; label: string; icon: string; desc: string }[] = [
  { id: 'all', label: 'Todos los formatos', icon: '✨', desc: 'Sociales, clases, talleres y más' },
  { id: 'social', label: 'Sociales / Matinés', icon: '🍸', desc: 'Fiestas y pistas de baile' },
  { id: 'clase', label: 'Clases', icon: '🕺', desc: 'Clases regulares de baile' },
  { id: 'taller', label: 'Talleres & Workshops', icon: '🎯', desc: 'Capacitaciones intensivas' },
  { id: 'festival', label: 'Festivales & Congresos', icon: '🎪', desc: 'Eventos masivos de fin de semana' },
  { id: 'practica', label: 'Prácticas Libres', icon: '🎧', desc: 'Espacios de práctica abierta' },
];

const DATE_OPTIONS: { id: QuickDateFilter; label: string; icon: string; desc: string }[] = [
  { id: 'all', label: 'Todas las fechas', icon: '🌟', desc: 'Ver toda la cartelera' },
  { id: 'today', label: 'Hoy', icon: '⚡', desc: 'Eventos de esta noche' },
  { id: 'tomorrow', label: 'Mañana', icon: '🌙', desc: 'Eventos del día siguiente' },
  { id: 'weekend', label: 'Este Fin de Semana', icon: '🎉', desc: 'Viernes, sábado y domingo' },
  { id: 'custom', label: 'Elegir fecha específica...', icon: '🗓️', desc: 'Seleccionar día en el calendario' },
];

const RADIUS_OPTIONS = [
  { value: 5, label: '5 km', desc: 'Muy cerca de mi ubicación' },
  { value: 10, label: '10 km', desc: 'Mi barrio y alrededores' },
  { value: 25, label: '25 km', desc: 'Ciudad / Zona metropolitana' },
  { value: 50, label: '50 km', desc: 'Gran Buenos Aires / Conurbano' },
  { value: 100, label: '100 km', desc: 'Provincias limítrofes / Región' },
  { value: 500, label: 'Toda la provincia (500 km)', desc: 'Sin límite de distancia' },
];

const SORT_OPTIONS: { id: SortOption; label: string; icon: string }[] = [
  { id: 'distance', label: 'Más cercanos (GPS)', icon: '📍' },
  { id: 'date', label: 'Fecha más próxima', icon: '📅' },
  { id: 'rating', label: 'Mejor calificados ⭐', icon: '🏆' },
];

export const FilterDropdowns: React.FC<FilterDropdownsProps> = ({ onOpenCustomDateModal }) => {
  const {
    filters,
    setGenreFamily,
    setSelectedSubgenre,
    setCategory,
    setDateFilter,
    setRadiusKm,
    setSortBy,
    resetFilters,
  } = useFilters();

  const [openDropdown, setOpenDropdown] = useState<'genre' | 'format' | 'date' | 'radius' | 'sort' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: 'genre' | 'format' | 'date' | 'radius' | 'sort') => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  // Obtener texto actual de cada dropdown
  const currentGenreFamily = filters.genreFamily !== 'all' ? getGenreFamilyById(filters.genreFamily) : null;
  const currentSubgenreObj = currentGenreFamily?.subgenres.find((s) => s.id === filters.selectedSubgenre);
  
  const genreLabel = currentSubgenreObj
    ? `${currentGenreFamily?.icon} ${currentSubgenreObj.name}`
    : currentGenreFamily
    ? `${currentGenreFamily.icon} ${currentGenreFamily.name}`
    : '✨ Todos los Ritmos';

  const currentFormat = FORMAT_OPTIONS.find((f) => f.id === filters.category) || FORMAT_OPTIONS[0];
  const currentDate = filters.dateFilter === 'custom' && filters.customStartDate
    ? {
        label: `📅 ${new Date(filters.customStartDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
        icon: '🗓️',
      }
    : DATE_OPTIONS.find((d) => d.id === filters.dateFilter) || DATE_OPTIONS[0];

  const currentRadius = RADIUS_OPTIONS.find((r) => r.value === filters.radiusKm) || {
    value: filters.radiusKm,
    label: `${filters.radiusKm} km`,
  };

  const currentSort = SORT_OPTIONS.find((s) => s.id === filters.sortBy) || SORT_OPTIONS[0];

  const isFilterActive =
    filters.genreFamily !== 'all' ||
    filters.selectedSubgenre !== undefined ||
    filters.category !== 'all' ||
    filters.dateFilter !== 'all' ||
    filters.radiusKm !== 25 ||
    filters.sortBy !== 'distance';

  return (
    <div ref={containerRef} className="space-y-3 bg-[#0d111d] p-3.5 sm:p-4 rounded-3xl border border-white/10 shadow-2xl relative">
      {/* Barra Principal de Menús Desplegables en Grid Adaptable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {/* 1. Menú Desplegable: Ritmo de Baile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('genre')}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-1.5 border text-left cursor-pointer ${
              filters.genreFamily !== 'all'
                ? 'bg-dance-crimson/20 border-dance-crimson/50 text-white shadow-glow-crimson'
                : 'bg-[#141928] hover:bg-[#1a2135] border-white/10 text-slate-200'
            }`}
          >
            <div className="min-w-0 flex-1 truncate">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider truncate">Ritmo</span>
              <span className="truncate block font-black text-white">{genreLabel}</span>
            </div>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openDropdown === 'genre' ? 'rotate-180 text-dance-coral' : 'text-slate-400'}`} />
          </button>

          {/* Menú Desplegable de Ritmos */}
          {openDropdown === 'genre' && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-[#121626] border border-white/15 rounded-3xl shadow-2xl p-2 z-50 animate-fadeIn max-h-96 overflow-y-auto space-y-1 backdrop-blur-xl">
              <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                <span>Selecciona el Ritmo</span>
                {filters.genreFamily !== 'all' && (
                  <button
                    onClick={() => {
                      setGenreFamily('all');
                      setOpenDropdown(null);
                    }}
                    className="text-dance-coral hover:underline text-[10px] font-bold cursor-pointer"
                  >
                    Ver Todos
                  </button>
                )}
              </div>

              {/* Opción Todos los Ritmos */}
              <button
                onClick={() => {
                  setGenreFamily('all');
                  setOpenDropdown(null);
                }}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  filters.genreFamily === 'all'
                    ? 'bg-white text-dark-950 font-black'
                    : 'text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">✨</span>
                  <div>
                    <span>Todos los Ritmos</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Bachata, salsa, rock, tango, cachengue y más</span>
                  </div>
                </div>
                {filters.genreFamily === 'all' && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              {/* Familias de Baile */}
              {DANCE_GENRE_FAMILIES.map((family) => {
                const isSelected = filters.genreFamily === family.id;
                return (
                  <div key={family.id} className="space-y-1">
                    <button
                      onClick={() => {
                        setGenreFamily(family.id);
                        if (family.subgenres.length === 0) {
                          setOpenDropdown(null);
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? `${family.badgeBg} ${family.badgeText} ${family.border} border font-black`
                          : 'text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{family.icon}</span>
                        <div>
                          <span>{family.name}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">{family.description}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    {/* Subgéneros si está seleccionado */}
                    {isSelected && family.subgenres.length > 0 && (
                      <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-dance-coral/40 ml-4 my-1">
                        <button
                          onClick={() => {
                            setSelectedSubgenre(undefined);
                            setOpenDropdown(null);
                          }}
                          className={`w-full py-1.5 px-2 rounded-lg text-left text-[11px] font-semibold flex items-center justify-between ${
                            !filters.selectedSubgenre
                              ? 'bg-dance-coral/30 text-white font-bold'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <span>Todos en {family.shortName}</span>
                          {!filters.selectedSubgenre && <Check className="w-3.5 h-3.5" />}
                        </button>
                        {family.subgenres.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              setSelectedSubgenre(sub.id);
                              setOpenDropdown(null);
                            }}
                            className={`w-full py-1.5 px-2 rounded-lg text-left text-[11px] font-semibold flex items-center justify-between ${
                              filters.selectedSubgenre === sub.id
                                ? 'bg-dance-crimson text-white font-bold'
                                : 'text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            <span>🎵 {sub.name}</span>
                            {filters.selectedSubgenre === sub.id && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Menú Desplegable: Formato de Evento */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('format')}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-1.5 border text-left cursor-pointer ${
              filters.category !== 'all'
                ? 'bg-dance-orange/20 border-dance-orange/50 text-white shadow-glow-orange'
                : 'bg-[#141928] hover:bg-[#1a2135] border-white/10 text-slate-200'
            }`}
          >
            <div className="min-w-0 flex-1 truncate">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider truncate">Formato</span>
              <span className="truncate block font-black text-white">{currentFormat.icon} {currentFormat.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openDropdown === 'format' ? 'rotate-180 text-dance-orange' : 'text-slate-400'}`} />
          </button>

          {openDropdown === 'format' && (
            <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-[#121626] border border-white/15 rounded-3xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 backdrop-blur-xl">
              <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-white/10">
                Tipo de Actividad
              </div>
              {FORMAT_OPTIONS.map((fmt) => {
                const isSelected = filters.category === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => {
                      setCategory(fmt.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-dance-orange/30 to-dance-coral/30 border border-dance-orange/50 text-white font-black'
                        : 'text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{fmt.icon}</span>
                      <div>
                        <span>{fmt.label}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">{fmt.desc}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-dance-orange stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Menú Desplegable: Fecha */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('date')}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-1.5 border text-left cursor-pointer ${
              filters.dateFilter !== 'all'
                ? 'bg-dance-amber/20 border-dance-amber/50 text-white shadow-glow-amber'
                : 'bg-[#141928] hover:bg-[#1a2135] border-white/10 text-slate-200'
            }`}
          >
            <div className="min-w-0 flex-1 truncate">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider truncate">Fecha</span>
              <span className="truncate block font-black text-white">{currentDate.icon} {currentDate.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openDropdown === 'date' ? 'rotate-180 text-dance-amber' : 'text-slate-400'}`} />
          </button>

          {openDropdown === 'date' && (
            <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-[#121626] border border-white/15 rounded-3xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 backdrop-blur-xl">
              <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-white/10">
                ¿Cuándo querés bailar?
              </div>
              {DATE_OPTIONS.map((d) => {
                const isSelected = filters.dateFilter === d.id && filters.dateFilter !== 'custom';
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      if (d.id === 'custom') {
                        setOpenDropdown(null);
                        onOpenCustomDateModal();
                      } else {
                        setDateFilter(d.id);
                        setOpenDropdown(null);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-dance-amber/25 border border-dance-amber/50 text-white font-black'
                        : 'text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{d.icon}</span>
                      <div>
                        <span>{d.label}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">{d.desc}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-dance-amber stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Menú Desplegable: Radio de Distancia */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('radius')}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-1.5 border text-left cursor-pointer ${
              filters.radiusKm !== 25
                ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                : 'bg-[#141928] hover:bg-[#1a2135] border-white/10 text-slate-200'
            }`}
          >
            <div className="min-w-0 flex-1 truncate">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider truncate">Distancia</span>
              <span className="truncate block font-black text-white">📍 {currentRadius.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openDropdown === 'radius' ? 'rotate-180 text-emerald-400' : 'text-slate-400'}`} />
          </button>

          {openDropdown === 'radius' && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#121626] border border-white/15 rounded-3xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 backdrop-blur-xl">
              <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-white/10">
                Radio de Búsqueda
              </div>
              {RADIUS_OPTIONS.map((r) => {
                const isSelected = filters.radiusKm === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => {
                      setRadiusKm(r.value);
                      setOpenDropdown(null);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 font-black'
                        : 'text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <span>📍 {r.label}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">{r.desc}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Menú Desplegable: Ordenar */}
        <div className="relative col-span-2 sm:col-span-1">
          <button
            type="button"
            onClick={() => toggleDropdown('sort')}
            className="w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-1.5 border text-left cursor-pointer bg-[#141928] hover:bg-[#1a2135] border-white/10 text-slate-200"
          >
            <div className="min-w-0 flex-1 truncate">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider truncate">Ordenar</span>
              <span className="truncate block font-black text-white">{currentSort.icon} {currentSort.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openDropdown === 'sort' ? 'rotate-180 text-dance-coral' : 'text-slate-400'}`} />
          </button>

          {openDropdown === 'sort' && (
            <div className="absolute top-full right-0 mt-2 w-60 bg-[#121626] border border-white/15 rounded-3xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 backdrop-blur-xl">
              <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-white/10">
                Criterio de Orden
              </div>
              {SORT_OPTIONS.map((s) => {
                const isSelected = filters.sortBy === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSortBy(s.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-dance-coral/25 border border-dance-coral/50 text-white font-black'
                        : 'text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <span>{s.icon} {s.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-dance-coral stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros Activos con Botón Limpiar */}
      {isFilterActive && (
        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs animate-fadeIn">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtros aplicados:</span>

            {filters.genreFamily !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-dance-crimson/20 text-dance-coral font-bold text-[11px] border border-dance-crimson/30 flex items-center gap-1">
                {genreLabel}
                <X onClick={() => setGenreFamily('all')} className="w-3 h-3 hover:text-white cursor-pointer" />
              </span>
            )}

            {filters.category !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-dance-orange/20 text-dance-orange font-bold text-[11px] border border-dance-orange/30 flex items-center gap-1">
                {currentFormat.label}
                <X onClick={() => setCategory('all')} className="w-3 h-3 hover:text-white cursor-pointer" />
              </span>
            )}

            {filters.dateFilter !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-dance-amber/20 text-dance-amber font-bold text-[11px] border border-dance-amber/30 flex items-center gap-1">
                {currentDate.label}
                <X onClick={() => setDateFilter('all')} className="w-3 h-3 hover:text-white cursor-pointer" />
              </span>
            )}

            {filters.radiusKm !== 25 && (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 flex items-center gap-1">
                {filters.radiusKm} km
                <X onClick={() => setRadiusKm(25)} className="w-3 h-3 hover:text-white cursor-pointer" />
              </span>
            )}
          </div>

          <button
            onClick={resetFilters}
            className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer todo</span>
          </button>
        </div>
      )}
    </div>
  );
};
