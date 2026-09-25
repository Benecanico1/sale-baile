import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface FloatingAIAssistantButtonProps {
  onClick: () => void;
  isOpen?: boolean;
  hidden?: boolean;
}

export const FloatingAIAssistantButton: React.FC<FloatingAIAssistantButtonProps> = ({
  onClick,
  isOpen = false,
  hidden = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(true);
  const [hasDismissedTooltip, setHasDismissedTooltip] = useState(false);

  // Ocultar tooltip automáticamente después de 4.5 segundos al inicio
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  // Si el modal del Asistente IA ya está abierto o se solicita ocultar, evitar solapamientos
  if (isOpen || hidden) return null;

  return (
    <div
      className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-40 flex items-center gap-2"
      onMouseEnter={() => !hasDismissedTooltip && setShowTooltip(true)}
      onMouseLeave={() => !hasDismissedTooltip && setShowTooltip(false)}
    >
      {/* Tooltip / Globo Flotante "¡Pregúntame! ✨" */}
      <div
        className={`transition-all duration-300 ease-out flex items-center gap-1.5 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber text-white font-black text-[11px] sm:text-xs py-1.5 px-3 rounded-full shadow-[0_8px_20px_rgba(255,45,85,0.4)] border border-white/20 select-none cursor-pointer group active:scale-95 ${
          showTooltip
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 translate-x-3 scale-90 pointer-events-none w-0 py-0 px-0 overflow-hidden border-0'
        }`}
        onClick={onClick}
      >
        <span className="tracking-tight whitespace-nowrap">¡Pregúntame!</span>
        <Sparkles className="w-3 h-3 text-white/90 animate-sparkle-pulse shrink-0" />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(false);
            setHasDismissedTooltip(true);
          }}
          className="ml-0.5 p-0.5 hover:bg-black/20 rounded-full text-white/70 hover:text-white transition-colors"
          title="Ocultar mensaje"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Botón Circular con Notita Musical y Signitos de Interrogación */}
      <button
        type="button"
        onClick={onClick}
        className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-dance-crimson via-dance-coral to-dance-amber p-[2px] shadow-[0_8px_28px_rgba(255,45,85,0.5)] hover:shadow-[0_12px_36px_rgba(255,45,85,0.7)] active:scale-90 transition-all duration-200 cursor-pointer animate-gentle-float group"
        title="Asistente IA • Consulta sobre funciones de Sale Baile"
        aria-label="Abrir Asistente IA"
      >
        {/* Contenedor interior oscuro para contraste */}
        <div className="w-full h-full rounded-full bg-[#0d101a] flex items-center justify-center relative overflow-hidden group-hover:bg-[#121726] transition-colors">
          {/* Brillo de fondo con pulso */}
          <div className="absolute inset-0 bg-radial from-dance-crimson/30 via-dance-coral/10 to-transparent opacity-80" />

          {/* SVG Oficial de la Notita Musical con Corazón */}
          <svg
            viewBox="0 0 512 512"
            className="w-6 h-6 sm:w-7 sm:h-7 text-dance-coral relative z-10 transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,45,85,0.8)]"
            fill="none"
          >
            <defs>
              <linearGradient id="fabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff2d55" />
                <stop offset="50%" stopColor="#ff6b4a" />
                <stop offset="100%" stopColor="#ffb300" />
              </linearGradient>
            </defs>
            {/* Nota Musical */}
            <path
              d="M220 370 C190 370 165 350 165 320 C165 290 190 270 220 270 C245 270 265 285 270 305 L270 160 L360 135 L360 190 L290 210 L290 320 C290 350 265 370 235 370 Z"
              fill="url(#fabGrad)"
            />
            {/* Corazón en la nota */}
            <path
              d="M340 240 C320 220 290 230 280 250 C270 230 240 220 220 240 C195 265 220 300 280 340 C340 300 365 265 340 240 Z"
              fill="#ff2d55"
              opacity="0.85"
            />
          </svg>

          {/* Signito de Interrogación chiquitito animado flotando en esquina interior */}
          <span className="absolute bottom-1 right-1 font-black text-[9px] text-dance-amber leading-none select-none opacity-80 group-hover:opacity-100">
            ?
          </span>
        </div>

        {/* Insignia externa superior derecha: Signito de interrogación brillante */}
        <div className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-gradient-to-r from-dance-amber to-dance-coral text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md border border-white/40 animate-sparkle-pulse">
          ?
        </div>

        {/* Pequeño destello superior izquierdo */}
        <div className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-dance-coral opacity-75 blur-[1px]" />
      </button>
    </div>
  );
};
