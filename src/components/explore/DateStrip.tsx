import React from 'react';
import { useFilters } from '../../context/FilterContext';
import { Sparkles, Calendar as CalendarIcon } from 'lucide-react';

interface DateStripProps {
  onOpenCustomDateModal: () => void;
}

const DAYS_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export const DateStrip: React.FC<DateStripProps> = ({ onOpenCustomDateModal }) => {
  const { filters, setDateFilter } = useFilters();

  const days = React.useMemo(() => {
    const list = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;

      list.push({
        dateObj: d,
        dayNum: d.getDate(),
        dayName: DAYS_SHORT[d.getDay()],
        monthName: MONTHS_SHORT[d.getMonth()],
        isToday,
        isTomorrow,
        isoKey: d.toISOString().split('T')[0],
      });
    }
    return list;
  }, []);

  return (
    <div className="relative py-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 no-scrollbar select-none">
        <button
          onClick={() => setDateFilter('all')}
          className={`px-4 py-2.5 rounded-2xl shrink-0 font-bold text-xs transition-all flex flex-col items-center justify-center min-w-[76px] ${
            filters.dateFilter === 'all'
              ? 'bg-gradient-to-br from-dance-crimson to-dance-coral text-white shadow-glow-crimson scale-105 border border-white/20'
              : 'bg-oled-900/90 hover:bg-oled-850 text-slate-400 hover:text-slate-200 border border-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 mb-0.5" />
          <span className="tracking-wide text-[11px]">TODOS</span>
        </button>

        {days.map((item, idx) => {
          const isSelected =
            (item.isToday && filters.dateFilter === 'today') ||
            (item.isTomorrow && filters.dateFilter === 'tomorrow') ||
            (filters.dateFilter === 'custom' &&
              filters.customStartDate &&
              filters.customStartDate.startsWith(item.isoKey));

          return (
            <button
              key={idx}
              onClick={() => {
                if (item.isToday) {
                  setDateFilter('today');
                } else if (item.isTomorrow) {
                  setDateFilter('tomorrow');
                } else {
                  const start = new Date(item.dateObj);
                  start.setHours(0, 0, 0, 0);
                  const end = new Date(item.dateObj);
                  end.setHours(23, 59, 59, 999);
                  setDateFilter('custom', start.toISOString(), end.toISOString());
                }
              }}
              className={`py-2 px-3.5 rounded-2xl shrink-0 transition-all flex flex-col items-center justify-center min-w-[66px] border ${
                isSelected
                  ? 'bg-gradient-to-b from-dance-crimson to-dance-coral text-white font-extrabold shadow-glow-crimson scale-105 border-white/30'
                  : 'bg-oled-900/90 hover:bg-oled-850 text-slate-300 border-white/5 hover:border-white/10'
              }`}
            >
              <span className="text-[10px] tracking-wider opacity-80 uppercase">
                {item.isToday ? 'HOY' : item.isTomorrow ? 'MAÑ' : item.dayName}
              </span>
              <span className="text-base font-black tracking-tight leading-tight">
                {item.dayNum}
              </span>
              <span className="text-[9px] opacity-60">{item.monthName}</span>
            </button>
          );
        })}

        <button
          onClick={onOpenCustomDateModal}
          className="p-3 rounded-2xl shrink-0 bg-oled-900/90 hover:bg-oled-850 text-slate-400 hover:text-white border border-white/5 transition-colors flex items-center justify-center"
          title="Elegir otra fecha..."
        >
          <CalendarIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
