import React from 'react';
import { Flame, Radar, Calendar, Heart, User } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab }) => {
  const { favorites } = useFavorites();
  const { user } = useAuth();

  const navItems = [
    { id: 'explore', label: 'Cartelera', icon: Flame },
    { id: 'map', label: 'Mapa', icon: Radar },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'favorites', label: 'Favoritos', icon: Heart, badge: favorites.length },
    { id: 'account', label: user ? 'Perfil' : 'Ingresar', icon: User },
  ];

  return (
    <div
      className="md:hidden fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 flex justify-center pointer-events-none w-auto max-w-[calc(100vw-1.5rem)]"
    >
      <nav className="pointer-events-auto flex items-center justify-center gap-1 sm:gap-2 bg-[#0a0d16]/95 backdrop-blur-2xl border border-white/15 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.88)] max-w-fit ring-1 ring-white/5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 sm:py-1.5 px-2.5 sm:px-3.5 rounded-full transition-all duration-200 cursor-pointer min-w-[54px] sm:min-w-[66px] group ${
                isActive
                  ? 'bg-white/10 text-white font-black scale-102'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${
                    isActive
                      ? 'stroke-[2.5px] text-dance-crimson drop-shadow-[0_0_8px_rgba(255,45,85,0.85)]'
                      : 'stroke-2'
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-dance-crimson text-white text-[8px] sm:text-[9px] font-black rounded-full min-w-[14px] text-center leading-3.5 shadow-glow-crimson">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 truncate ${
                  isActive ? 'text-white font-extrabold' : 'font-medium text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
