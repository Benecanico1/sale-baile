import React, { useState } from 'react';
import { useAuth, MASTER_ADMIN_EMAIL, MASTER_ADMIN_WHATSAPP } from '../../context/AuthContext';
import {
  X,
  Building,
  Send,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Percent,
} from 'lucide-react';

interface RequestOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequestOrganizerModal: React.FC<RequestOrganizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, requestOrganizerStatus, setShowAuthModal, setAuthModalMode } = useAuth();
  const [producerName, setProducerName] = useState(user?.full_name || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp_phone || '');
  const [instagram, setInstagram] = useState(user?.instagram_handle || '');
  const [notes, setNotes] = useState('');
  const [agreedCommission, setAgreedCommission] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getSummaryMessage = () => {
    return `🎟️ *SOLICITUD DE ORGANIZADOR - SALE BAILE*
━━━━━━━━━━━━━━━━━━━━━
👤 *Organizador / Productora:* ${producerName || user?.full_name || 'Sin especificar'}
📧 *Email:* ${user?.email || 'Sin email'}
📱 *WhatsApp de Contacto:* ${whatsapp}
📸 *Instagram:* ${instagram || 'No informado'}
📝 *Propuesta de Eventos:* ${notes || 'Eventos y clases de baile'}
🤝 *Acuerdo Comercial:* Acepto la comisión fija del 20% por cada entrada anticipada vendida en la plataforma Sale Baile (80% liquidación neta para el organizador).`;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(getSummaryMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      onClose();
      setAuthModalMode('register');
      setShowAuthModal(true);
      return;
    }

    if (!producerName.trim()) {
      setError('Por favor indica el nombre de tu productora, academia o tu nombre.');
      return;
    }

    if (!whatsapp.trim()) {
      setError('Por favor indica tu número de WhatsApp de contacto.');
      return;
    }

    if (!agreedCommission) {
      setError('Debes aceptar las condiciones de reventa y comisión para coordinar con el Administrador.');
      return;
    }

    requestOrganizerStatus(notes || 'Organizador de eventos y sociales de baile.', {
      producerName,
      whatsapp,
      instagram,
    });

    setIsSubmitted(true);
  };

  const adminPhoneDigits = MASTER_ADMIN_WHATSAPP.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${adminPhoneDigits}?text=${encodeURIComponent(getSummaryMessage())}`;
  const mailtoUrl = `mailto:${MASTER_ADMIN_EMAIL}?subject=${encodeURIComponent(`[Sale Baile] Solicitud de Organizador - ${producerName}`)}&body=${encodeURIComponent(getSummaryMessage())}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#121622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-dance-coral/15 border border-dance-coral/30 flex items-center justify-center text-dance-coral shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Solicitar ser Organizador
              </h2>
              <p className="text-xs text-slate-400">Sale Baile • Habilitación para Publicar</p>
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
        <div className="p-6 space-y-4">
          {isSubmitted ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">¡Solicitud Registrada en la App!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para activar tu cuenta rápidamente y coordinar el valor de las entradas anticipadas, <strong>notifica directamente al Administrador de Sale Baile:</strong>
                </p>
              </div>

              {/* Botón Principal WhatsApp */}
              <div className="space-y-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-white" />
                  <span>📲 Notificar al Administrador por WhatsApp</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={mailtoUrl}
                    className="py-2.5 px-3 bg-[#151a27] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <Mail className="w-4 h-4 text-dance-coral" />
                    <span>Enviar Email</span>
                  </a>

                  <button
                    onClick={handleCopyMessage}
                    className="py-2.5 px-3 bg-[#151a27] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>Copiar Datos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-[#1f2638] hover:bg-[#283148] text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Listo / Entendido
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-dance-coral/10 via-dance-crimson/10 to-transparent border border-dance-coral/20 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-dance-coral">
                  <Sparkles className="w-4 h-4" />
                  <span>Publicá tus fiestas y clases en la cartelera</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  El Administrador revisa cada solicitud para habilitar la subida de flyers y acordar el porcentaje de venta de entradas anticipadas.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre del Organizador, Productora o Academia *
                </label>
                <input
                  type="text"
                  required
                  value={producerName}
                  onChange={(e) => setProducerName(e.target.value)}
                  placeholder="Ej: Bachata Palermo / Salsa Club"
                  className="w-full px-3.5 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp de Contacto *
                  </label>
                  <input
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+5491155551234"
                    className="w-full px-3.5 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Instagram Oficial (@)
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.trim() && !val.trim().startsWith('@') && !val.includes('instagram.com/')) {
                        val = `@${val.trim()}`;
                      }
                      setInstagram(val);
                    }}
                    placeholder="@tu_productora"
                    className="w-full px-3.5 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Contanos sobre tus eventos o clases (Estilo, frecuencia, locación)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Organizamos sociales de bachata y salsa todos los sábados en Palermo..."
                  className="w-full px-3.5 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral transition-colors"
                />
              </div>

              {/* Acuerdo de Comisión de Reventa */}
              <div className="p-3 bg-[#151a27] border border-dance-coral/30 rounded-2xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agreedCommission"
                  checked={agreedCommission}
                  onChange={(e) => setAgreedCommission(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-dance-coral focus:ring-0 cursor-pointer"
                />
                <label htmlFor="agreedCommission" className="text-[11px] text-slate-300 leading-relaxed cursor-pointer select-none">
                  <span className="font-bold text-dance-coral flex items-center gap-1 inline-flex">
                    <Percent className="w-3 h-3" /> Acuerdo de Comisión por Entradas:
                  </span>{' '}
                  Acepto que la publicación está sujeta a autorización del Administrador y a la comisión fija del 20% por cada entrada anticipada vendida en la plataforma (80% liquidación neta para el organizador).
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-[#151a27] hover:bg-[#1f2638] text-slate-300 font-semibold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-dance-coral to-dance-crimson hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-glow-crimson transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Solicitud al Administrador</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
