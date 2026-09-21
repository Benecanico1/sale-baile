import React from 'react';
import { ExternalLink, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onOpenPrivacyPolicy: () => void;
  onOpenAboutModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacyPolicy, onOpenAboutModal }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#141316] border-t border-white/10 mt-12 py-8 px-4 text-center text-xs text-slate-400">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center space-y-4">
        {/* Logo y lema */}
        <div
          onClick={onOpenAboutModal}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity select-none"
          title="Conoce más sobre Sale Baile"
        >
          <img
            src="/branding/logo_horizontal.png"
            alt="Sale Baile"
            className="h-6 sm:h-7 w-auto object-contain"
          />
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-medium">Comunidad de Baile</span>
        </div>

        {/* Links de Privacidad y Desarrollador */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <button
            onClick={onOpenPrivacyPolicy}
            className="text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-white/5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-dance-crimson" />
            <span>Política de Privacidad</span>
          </button>

          <span className="text-slate-700 hidden sm:inline">|</span>

          <a
            href="https://ingenieriajh.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5 group"
          >
            <span>Desarrollado por</span>
            <strong className="text-dance-coral group-hover:underline font-bold">ING JH</strong>
            <ExternalLink className="w-3 h-3 text-dance-coral" />
          </a>
        </div>

        {/* Derechos Reservados */}
        <div className="text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-1 pt-2 border-t border-white/5 w-full max-w-md">
          <span>© {currentYear} Sale Baile. Todos los derechos reservados.</span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1">
            Hecho con <Heart className="w-3 h-3 text-dance-crimson fill-current inline" /> para bailarines
          </span>
        </div>
      </div>
    </footer>
  );
};
