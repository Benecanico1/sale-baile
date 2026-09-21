import React from 'react';
import { useLocation } from '../../context/LocationContext';
import { useAuth, isAdminEmail } from '../../context/AuthContext';
import { Shield, ChevronDown, Radar, Sparkles, ArrowDownToLine } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenLocationModal: () => void;
  onOpenAboutModal?: () => void;
  onOpenDownloadModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenLocationModal,
  onOpenAboutModal,
  onOpenDownloadModal,
}) => {
  const { location } = useLocation();
  const { user, role, setShowAuthModal, setAuthModalMode } = useAuth();
  const isUserAdmin = Boolean(role === 'admin' || (user?.email && isAdminEmail(user.email)));

  const handleLogoClick = () => {
    if (onOpenAboutModal) {
      onOpenAboutModal();
    } else {
      setCurrentTab('explore');
    }
  };

  const handleDownloadClick = () => {
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));

    if (!isIOS) {
      try {
        const link = document.createElement('a');
        link.href = '/sale-baile.bin';
        link.download = 'SaleBaile.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {}
    }

    if (onOpenDownloadModal) {
      onOpenDownloadModal();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-oled-950/85 backdrop-blur-2xl border-b border-white/8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand / Logo */}
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
          title="Conoce más sobre Sale Baile"
        >
          <img
            src="/branding/logo_horizontal.png"
            alt="Sale Baile"
            className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </div>

        {/* Desktop Navigation Tabs (Visibles en PC y Tablets) */}
        <nav className="hidden md:flex items-center gap-1 bg-oled-900/90 border border-white/10 rounded-full p-1 shadow-sm">
          <button
            onClick={() => setCurrentTab('explore')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'explore'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-crimson'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Cartelera
          </button>
          <button
            onClick={() => setCurrentTab('map')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'map'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-crimson'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Radar & Mapa
          </button>
          <button
            onClick={() => setCurrentTab('agenda')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'agenda'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-crimson'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Agenda
          </button>
          <button
            onClick={() => setCurrentTab('favorites')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'favorites'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-crimson'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Favoritos
          </button>
          <button
            onClick={() => setCurrentTab('tickets')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'tickets'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white shadow-glow-crimson'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Mis Entradas
          </button>
        </nav>

        {/* Location Selector Pill */}
        <button
          onClick={onOpenLocationModal}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-oled-900 hover:bg-oled-850 border border-white/10 text-[11px] sm:text-xs text-slate-200 transition-all max-w-[130px] sm:max-w-md truncate shadow-sm group cursor-pointer"
        >
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-dance-crimson animate-pulse shrink-0" />
          <span className="truncate font-semibold text-slate-200 group-hover:text-white">{location.cityName}</span>
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 group-hover:text-white shrink-0" />
        </button>

        {/* Desktop Navigation & Actions (Súper ligero y limpio, solo iconos) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Acceso directo a Radar de Baile (Solo icono para máxima limpieza) */}
          <button
            onClick={() => setCurrentTab('map')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              currentTab === 'map'
                ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white border-dance-crimson shadow-glow-crimson'
                : 'bg-oled-900 text-slate-300 border-white/10 hover:border-white/20'
            }`}
            title="Radar de Baile y Mapa en Vivo"
            aria-label="Radar de Baile y Mapa"
          >
            <Radar className="w-4 h-4 text-dance-coral animate-spin" style={{ animationDuration: '6s' }} />
          </button>

          {/* Zona de Administrador: solo el icono del escudo (sin texto) */}
          {isUserAdmin && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-md ${
                currentTab === 'admin'
                  ? 'bg-dance-amber text-oled-950 border-dance-amber ring-2 ring-dance-amber/50'
                  : 'bg-dance-amber/20 text-dance-amber border-dance-amber/40 hover:bg-dance-amber hover:text-oled-950'
              }`}
              title="Panel de Administrador"
              aria-label="Panel de Administrador"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}

          {/* Zona de Coordinador: solo el icono de chispas (sin texto) */}
          {role === 'organizer' && !isUserAdmin && (
            <button
              onClick={() => setCurrentTab('organizer')}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-md ${
                currentTab === 'organizer'
                  ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white border-dance-crimson shadow-glow-crimson'
                  : 'bg-oled-900 text-slate-300 border-white/10 hover:border-white/20'
              }`}
              title="Panel de Coordinador"
              aria-label="Panel de Coordinador"
            >
              <Sparkles className="w-4 h-4 text-dance-coral" />
            </button>
          )}

          {/* Botón con flechita hacia abajo (Símbolo de descarga para Android APK y iPhone) */}
          <button
            type="button"
            onClick={handleDownloadClick}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-oled-900 hover:bg-oled-850 border border-white/10 hover:border-dance-coral/50 flex items-center justify-center text-dance-coral hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 group relative"
            title="Descargar aplicación oficial"
            aria-label="Descargar aplicación oficial"
          >
            <ArrowDownToLine className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-dance-coral group-hover:text-white group-hover:translate-y-0.5 transition-all" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dance-coral opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-dance-crimson"></span>
            </span>
          </button>

          {/* Usuario: Si no está logueado botón Ingresar, si está logueado SOLO LA FOTO (sin nombre) */}
          {!user ? (
            <button
              onClick={() => {
                setAuthModalMode('login');
                setShowAuthModal(true);
              }}
              className="px-3.5 py-1.5 bg-oled-900 hover:bg-oled-800 text-slate-200 text-xs sm:text-sm font-bold rounded-full border border-white/10 transition-colors cursor-pointer"
            >
              Ingresar
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab('account')}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 transition-all p-0.5 flex items-center justify-center cursor-pointer shadow-md group shrink-0 ${
                currentTab === 'account'
                  ? 'border-dance-crimson ring-2 ring-dance-crimson/50 scale-105'
                  : 'border-white/20 hover:border-dance-crimson/80 hover:scale-105'
              }`}
              title={user.full_name || user.email || 'Mi Perfil'}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || 'Perfil'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-dance-crimson to-dance-coral flex items-center justify-center text-xs font-black text-white">
                  {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
