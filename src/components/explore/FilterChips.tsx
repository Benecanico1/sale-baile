import React, { useState } from 'react';
import { useFilters } from '../../context/FilterContext';
import type { EventCategory, QuickDateFilter } from '../../types';
import { Calendar, Filter, X } from 'lucide-react';

export const FilterChips: React.FC = () => {
  const { filters, setDateFilter, setCategory } = useFilters();
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [tempDate, setTempDate] = useState('');

  const dateOptions: { id: QuickDateFilter; label: string }[] = [
    { id: 'all', label: 'Todas las fechas' },
    { id: 'today', label: '🔥 Hoy' },
    { id: 'tomorrow', label: 'Mañana' },
    { id: 'weekend', label: 'Este finde' },
    { id: 'custom', label: 'Elegir fecha...' },
  ];

  const categoryOptions: { id: EventCategory | 'all'; label: string; emoji: string }[] = [
    { id: 'all', label: 'Todo', emoji: '✨' },
    { id: 'social', label: 'Social', emoji: '💃' },
    { id: 'clase', label: 'Clases', emoji: '🕺' },
    { id: 'taller', label: 'Talleres', emoji: '🎓' },
    { id: 'festival', label: 'Festivales', emoji: '🎪' },
    { id: 'practica', label: 'Prácticas', emoji: '🎧' },
  ];

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempDate) {
      const start = new Date(tempDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(tempDate);
      end.setHours(23, 59, 59, 999);
      setDateFilter('custom', start.toISOString(), end.toISOString());
    }
    setShowCustomDateModal(false);
  };

  return (
    <div className="space-y-3">
      {/* Selector de Fechas Rápidas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Cuándo:
        </span>
        {dateOptions.map((opt) => {
          const isSelected = filters.dateFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => {
                if (opt.id === 'custom') {
                  setShowCustomDateModal(true);
                } else {
                  setDateFilter(opt.id);
                }
              }}
              className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-dance-crimson to-dance-orange text-white shadow-glow-crimson'
                  : 'bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-700'
              }`}
            >
              {opt.id === 'custom' && filters.customStartDate ? (
                `📅 ${new Date(filters.customStartDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`
              ) : (
                opt.label
              )}
            </button>
          );
        })}
      </div>

      {/* Selector de Categorías de Baile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Tipo:
        </span>
        {categoryOptions.map((cat) => {
          const isSelected = filters.category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl shrink-0 font-medium transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-dance-crimson/20 border-dance-crimson text-dance-crimson font-bold border'
                  : 'bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-700'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modal para elegir fecha personalizada */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-dark-900 border border-dark-700 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-dance-crimson" />
                Elegir fecha específica
              </h3>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCustomDateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Selecciona el día</label>
                <input
                  type="date"
                  value={tempDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-850 border border-dark-700 rounded-xl text-white text-sm focus:border-dance-crimson focus:outline-none"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomDateModal(false)}
                  className="flex-1 py-2 bg-dark-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-dark-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-dance-crimson text-white text-xs font-semibold rounded-xl hover:opacity-90 shadow-glow-crimson"
                >
                  Aplicar Fecha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
