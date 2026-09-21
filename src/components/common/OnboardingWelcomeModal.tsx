import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, MapPin, Music2, Ticket, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OnboardingWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExploring: () => void;
}

export const OnboardingWelcomeModal: React.FC<OnboardingWelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartExploring,
}) => {
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff5500', '#e11d48', '#f43f5e', '#a855f7', '#10b981'],
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#141316] border border-dance-coral/40 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 text-center space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icono Neón Festivo */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-dance-crimson to-dance-coral blur-xl opacity-75 animate-pulse" />
          <div className="relative w-full h-full rounded-3xl bg-[#141316] border-2 border-dance-coral/60 flex items-center justify-center shadow-glow-coral p-3">
            <img src="/branding/logo_flame.png" alt="Sale Baile" className="w-16 h-16 object-contain animate-gentle-float" />
          </div>
        </div>

        {/* Textos Principales (Pantalla 12) */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dance-coral/15 text-dance-coral text-xs font-black uppercase tracking-wider border border-dance-coral/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Configuración Completa</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white pt-1">
            ¡Todo listo!
          </h2>
          <p className="text-sm font-bold text-dance-coral">
            {user?.full_name ? `${user.full_name}, ¡ya sos parte de SaleBaile!` : '¡Ya sos parte de SaleBaile!'}
          </p>
          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed pt-1">
            Tu cartelera y radar inteligente están configurados con tus ritmos preferidos.
          </p>
        </div>

        {/* 3 Ventajas Rápidas */}
        <div className="grid grid-cols-1 gap-2 text-left">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-dance-crimson/20 text-dance-coral flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Eventos a tu Medida</div>
              <div className="text-[11px] text-slate-400">Filtrados automáticamente según lo que bailás</div>
            </div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Radar en Tiempo Real</div>
              <div className="text-[11px] text-slate-400">Mirá locales, sociales y talleres en el mapa</div>
            </div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Pases VIP y Tickets QR</div>
              <div className="text-[11px] text-slate-400">Asegurá tu anticipada y entrá directo por puerta</div>
            </div>
          </div>
        </div>

        {/* Botón Principal */}
        <button
          type="button"
          onClick={() => {
            onStartExploring();
            onClose();
          }}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-glow-crimson flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
        >
          <span>Empezar a bailar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
