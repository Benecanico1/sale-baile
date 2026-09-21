import React from 'react';
import { useFilters } from '../../context/FilterContext';
import type { SortOption } from '../../types';
import { Compass, ArrowUpDown } from 'lucide-react';

export const RadiusSelector: React.FC = () => {
  const { filters, setRadiusKm, setSortBy } = useFilters();
  const radiusOptions = [5, 10, 25, 50, 100];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-dark-800 text-xs">
      {/* Radio de búsqueda */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-slate-400 text-[11px] font-medium shrink-0 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-dance-orange" />
          Radio:
        </span>
        <div className="flex items-center bg-dark-850 p-0.5 rounded-xl border border-dark-700 shrink-0">
          {radiusOptions.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                filters.radiusKm === r
                  ? 'bg-dance-orange text-dark-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {/* Ordenamiento */}
      <div className="flex items-center justify-between sm:justify-start gap-1.5 pt-1 sm:pt-0">
        <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          Ordenar:
        </span>
        <select
          value={filters.sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="bg-dark-850 border border-dark-700 rounded-xl px-2.5 py-1 text-slate-200 text-xs focus:border-dance-crimson focus:outline-none"
        >
          <option value="distance">📍 Más cercanos</option>
          <option value="date">📅 Fecha más próxima</option>
        </select>
      </div>
    </div>
  );
};
