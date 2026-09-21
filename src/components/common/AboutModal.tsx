import React from 'react';
import {
  X,
  ArrowLeft,
  MapPin,
  Calendar,
  Compass,
  Heart,
  Share2,
  Building,
  Sparkles,
  Music,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: Compass,
      color: 'text-dance-crimson',
      bgColor: 'bg-dance-crimson/15 border-dance-crimson/30',
      title: 'Cartelera y Flyers en Vivo',
      description:
        'Encuentra qué eventos, sociales, clases y talleres se realizan hoy y en las próximas semanas con información completa, precios y horarios.',
    },
    {
      icon: MapPin,
      color: 'text-dance-coral',
      bgColor: 'bg-dance-coral/15 border-dance-coral/30',
      title: 'Mapa Interactivo por Cercanía',
      description:
        'Visualiza en el mapa interactivo todos los locales de baile y calcula en tiempo real la distancia exacta desde tu ubicación actual.',
    },
    {
      icon: Calendar,
      color: 'text-dance-amber',
      bgColor: 'bg-dance-amber/15 border-dance-amber/30',
      title: 'Agenda Día por Día',
      description:
        'Filtra con un solo toque lo que hay disponible Hoy, Mañana, el Fin de Semana o selecciona cualquier fecha del calendario.',
    },
    {
      icon: Music,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/15 border-purple-500/30',
      title: 'Todos los Ritmos de Baile',
      description:
        'Bachata (Sensual, Tradicional), Salsa (Cubana, Mambo), Tango, Milongas, Rock & Roll, Folklore, Cachengue / Urbano, Kizomba y más.',
    },
    {
      icon: Heart,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/15 border-pink-500/30',
      title: 'Favoritos y Notificaciones',
      description:
        'Guarda tus eventos preferidos en tu lista de Favoritos para no perderte ninguna fiesta o taller especial.',
    },
    {
      icon: Share2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15 border-blue-500/30',
      title: 'Compartir con tus Amigos',
      description:
        'Comparte eventos al instante por WhatsApp, Telegram o redes sociales con detalles claros y enlaces directos.',
    },
    {
      icon: Building,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15 border-emerald-500/30',
      title: 'Panel para Organizadores',
      description:
        'Si organizas sociales, boliches o das clases, solicita tu cuenta de organizador para publicar y difundir tus eventos ante miles de bailarines.',
    },
    {
      icon: CheckCircle2,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15 border-amber-500/30',
      title: 'Moderación y Seguridad',
      description:
        'Contenido supervisado por el Administrador para asegurar datos reales de locaciones, precios y profesores.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[#141316] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col z-10 my-auto max-h-[92vh]">
        {/* Header con botón Volver destacado */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1a191e] sticky top-0 z-20">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors border border-white/10 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-dance-coral" />
            <span>Volver a la aplicación</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8">
          {/* Hero Branding */}
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-[#1a191e] border border-white/15 p-3 shadow-glow-crimson mx-auto flex items-center justify-center">
              <img src="/branding/logo_flame.png" alt="Sale Baile" className="w-16 h-16 object-contain" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-dance-crimson/15 text-dance-crimson border border-dance-crimson/30 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                La Guía N°1 de Salidas y Baile
              </span>
              <div className="pt-2">
                <img src="/branding/logo_horizontal.png" alt="Sale Baile" className="h-10 mx-auto object-contain" />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed pt-2">
                <strong>Sale Baile</strong> es la plataforma y aplicación creada para conectar a bailarines, alumnos, profesores y organizadores de eventos de baile en toda la Argentina y Latinoamérica.
              </p>
            </div>
          </div>

          {/* Grid de Funcionalidades */}
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 text-center">
              Todo lo que puedes hacer en la app
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#1a191e] border border-white/5 hover:border-white/15 transition-all space-y-2 group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl ${feat.bgColor} border flex items-center justify-center ${feat.color} shrink-0 group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm text-white">{feat.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-12">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desarrollador y Contacto */}
          <div className="p-5 rounded-2xl bg-[#1a191e] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Creado y Desarrollado por</p>
              <h4 className="text-base font-extrabold text-white">ING JH</h4>
              <p className="text-xs text-slate-400">Soluciones de Software y Aplicaciones Web</p>
            </div>

            <a
              href="https://ingenieriajh.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all border border-white/15 shrink-0"
            >
              <span>Visitar ingenieriajh.web.app</span>
              <ExternalLink className="w-3.5 h-3.5 text-dance-coral" />
            </a>
          </div>

          {/* Botón Volver a la App al final */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white font-extrabold text-sm rounded-2xl shadow-glow-crimson flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la Aplicación y Explorar Eventos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
