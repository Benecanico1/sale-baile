import React from 'react';
import { X, Shield, Lock, Eye, MapPin, Mail, ExternalLink, Sparkles } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#0d1019] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#121623] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dance-crimson/15 border border-dance-crimson/30 flex items-center justify-center text-dance-crimson shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Política de Privacidad</h2>
              <p className="text-xs text-slate-400">Sale Baile • Última actualización: Septiembre 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-oled-900/80 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-dance-coral" />
              <span>Compromiso con tu Privacidad</span>
            </div>
            <p className="text-xs text-slate-400">
              En <strong>Sale Baile</strong> valoramos y respetamos tu privacidad. Esta política detalla de manera transparente qué información recopilamos, cómo la usamos y las medidas que tomamos para protegerla al usar nuestra plataforma web y aplicación móvil.
            </p>
          </div>

          {/* 1. Información que recopilamos */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-dance-crimson" />
              1. Información que Recopilamos
            </h3>
            <ul className="space-y-2 pl-4 list-disc text-xs text-slate-300">
              <li>
                <strong className="text-white">Datos de Registro y Cuenta:</strong> Al registrarte o iniciar sesión con Google o correo electrónico, recopilamos tu nombre, dirección de correo electrónico y foto de perfil pública proporcionada por el proveedor de autenticación.
              </li>
              <li>
                <strong className="text-white">Ubicación Geográfica:</strong> Con tu consentimiento expreso, accedemos a la ubicación aproximada o precisa de tu dispositivo únicamente para calcular la distancia a los eventos de baile, mostrar los eventos más cercanos en el mapa y filtrar por radio de kilómetros. No rastreamos tu ubicación en segundo plano.
              </li>
              <li>
                <strong className="text-white">Preferencias de Baile y Favoritos:</strong> Guardamos tus ritmos favoritos (Bachata, Salsa, Tango, Folklore, etc.) y los eventos que marcas como favoritos para personalizar tu experiencia.
              </li>
              <li>
                <strong className="text-white">Datos de Organizadores:</strong> Si solicitas ser organizador de eventos, recopilamos información de contacto comercial (número de WhatsApp de contacto y usuario de Instagram) para que los asistentes puedan comunicarse respecto a las entradas y consultas del evento.
              </li>
            </ul>
          </section>

          {/* 2. Uso de la Información */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-dance-orange" />
              2. Uso de la Información
            </h3>
            <p className="text-xs text-slate-300">Utilizamos los datos recopilados exclusivamente para:</p>
            <ul className="space-y-1.5 pl-4 list-disc text-xs text-slate-300">
              <li>Mostrarte la cartelera y mapa de eventos bailables cercanos a tu zona.</li>
              <li>Gestionar tu cuenta de usuario u organizador de manera segura.</li>
              <li>Permitir a los administradores moderar y aprobar eventos de calidad para la comunidad.</li>
              <li>Mejorar el rendimiento y diseño de la aplicación.</li>
            </ul>
          </section>

          {/* 3. Seguridad y Protección de Datos */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-dance-amber" />
              3. Protección de Datos y No Venta a Terceros
            </h3>
            <p className="text-xs text-slate-300">
              <strong>Nunca vendemos ni comercializamos tus datos personales con terceros ni anunciantes externos.</strong> Toda la información de inicio de sesión se procesa mediante protocolos seguros y cifrados estándar de la industria.
            </p>
          </section>

          {/* 4. Tus Derechos */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-dance-emerald" />
              4. Tus Derechos como Usuario
            </h3>
            <p className="text-xs text-slate-300">
              Tienes derecho a acceder, actualizar o solicitar la eliminación total de tu cuenta y datos personales en cualquier momento desde la sección de Mi Cuenta o comunicándote con nuestro equipo de soporte.
            </p>
          </section>

          {/* 5. Desarrollador y Contacto */}
          <section className="p-4 rounded-2xl bg-[#131722] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Desarrollado y Gestionado por</h4>
                <p className="text-sm font-black text-dance-coral">ING JH</p>
              </div>
              <a
                href="https://ingenieriajh.web.app"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-white/10"
              >
                <span>ingenieriajh.web.app</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1 border-t border-white/5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Contacto oficial: <strong className="text-slate-200">jesushidalgo25@gmail.com</strong></span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#121623] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-dance-crimson to-dance-coral text-white font-bold text-xs rounded-xl shadow-glow-crimson transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
