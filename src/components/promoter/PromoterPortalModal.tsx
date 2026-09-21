import React, { useState } from 'react';
import type { EventItem, PromoterSeller, PromoterCustomFlyer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getLocalPromoters,
  saveCustomFlyerForPromoter,
  deleteCustomFlyerForPromoter,
} from '../../lib/supabase';
import {
  X,
  Ticket,
  MessageCircle,
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  Image,
  Sparkles,
  Calendar,
  MapPin,
  AlertCircle,
} from 'lucide-react';

interface PromoterPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  defaultPromoterEmail?: string;
}

export const PromoterPortalModal: React.FC<PromoterPortalModalProps> = ({
  isOpen,
  onClose,
  events,
  defaultPromoterEmail,
}) => {
  const { user } = useAuth();
  const [emailInput, setEmailInput] = useState(defaultPromoterEmail || user?.email || '');
  const [promotersList, setPromotersList] = useState<PromoterSeller[]>(() => getLocalPromoters());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Modal para agregar flyer personalizado
  const [addingFlyerEventId, setAddingFlyerEventId] = useState<string | null>(null);
  const [customFlyerUrl, setCustomFlyerUrl] = useState('');
  const [customFlyerLabel, setCustomFlyerLabel] = useState('');
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Buscar el promotor por el email
  const activeEmail = emailInput.trim().toLowerCase();
  const currentPromoter = promotersList.find(
    (p) => p.email.toLowerCase() === activeEmail
  );

  // Filtrar eventos asignados al promotor
  const assignedEvents = events.filter((evt) => {
    if (!currentPromoter) return false;
    if (!currentPromoter.assigned_event_ids || currentPromoter.assigned_event_ids.length === 0) {
      return true; // Asignado a todos
    }
    return currentPromoter.assigned_event_ids.includes(evt.id);
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileUploadError('Por favor selecciona un archivo de imagen (JPG, PNG o WebP).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setFileUploadError('La imagen no debe superar los 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomFlyerUrl(reader.result as string);
      setFileUploadError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomFlyer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPromoter || !addingFlyerEventId || !customFlyerUrl) return;

    const newFlyer: PromoterCustomFlyer = {
      id: `flyer-${Date.now()}`,
      promoter_email: currentPromoter.email,
      event_id: addingFlyerEventId,
      flyer_url: customFlyerUrl,
      label: customFlyerLabel.trim() || 'Flyer con mi foto RRPP',
      created_at: new Date().toISOString(),
    };

    const updated = saveCustomFlyerForPromoter(currentPromoter.email, newFlyer);
    setPromotersList(updated);
    setAddingFlyerEventId(null);
    setCustomFlyerUrl('');
    setCustomFlyerLabel('');
  };

  const handleDeleteFlyer = (flyerId: string) => {
    if (!currentPromoter) return;
    if (confirm('¿Eliminar este flyer personalizado?')) {
      const updated = deleteCustomFlyerForPromoter(currentPromoter.email, flyerId);
      setPromotersList(updated);
    }
  };

  const generatePromoCopy = (evt: EventItem, promoter: PromoterSeller) => {
    const cleanPhone = promoter.whatsapp.replace(/\D/g, '');
    const priceText = evt.advance_ticket_price
      ? `$${evt.advance_ticket_price.toLocaleString('es-AR')}`
      : evt.price
      ? `$${evt.price.toLocaleString('es-AR')}`
      : 'Consultar precio';

    return `🔥 ¡YA ESTÁN A LA VENTA LAS ANTICIPADAS! 🎟️💃
✨ *${evt.title}*
📍 Lugar: ${evt.venue_name} (${evt.city})
📅 Fecha: ${new Date(evt.start_time).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
💰 Precio Anticipada con Descuento: ${priceText}

👉 Pedime tu entrada antes que se agoten por WhatsApp al:
📲 https://wa.me/${cleanPhone}?text=Hola+${encodeURIComponent(promoter.name)}+quiero+comprar+anticipadas+para+${encodeURIComponent(evt.title)}

¡Te espero en la pista! 🕺🎶`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[#0e121e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 max-h-[92vh] my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#131828]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-dance-coral to-dance-crimson flex items-center justify-center text-white shadow-glow-crimson shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Espacio de Vendedor / Promotor RRPP
                <span className="px-2 py-0.5 rounded-full bg-dance-coral/20 text-dance-coral text-[10px] font-black border border-dance-coral/30">
                  Kit de Venta
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Compartí flyers oficiales o con tu foto y recibí compradores directo a tu WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Barra de Identificación de Email del Vendedor */}
          <div className="p-4 bg-[#151b2c] border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Vendedor Registrado
              </span>
              {currentPromoter ? (
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white">{currentPromoter.name}</span>
                  <span className="text-xs text-slate-400">({currentPromoter.email})</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Activo
                  </span>
                </div>
              ) : (
                <p className="text-xs text-amber-300 font-semibold">
                  Ingresa el correo con el que te registró el organizador
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="tu.email@gmail.com"
                className="w-full sm:w-60 px-3 py-1.5 bg-[#0e121e] border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson"
              />
            </div>
          </div>

          {!currentPromoter ? (
            <div className="text-center py-12 px-4 bg-[#131828]/50 border border-white/5 rounded-3xl space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <h4 className="font-bold text-base text-white">No encontramos este correo en la lista de promotores</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Pídele al organizador del evento que te agregue en su panel de organizador con tu dirección de correo: <strong className="text-white">{emailInput || 'tu email'}</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumen de Comisión y Datos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-[#141928] border border-white/5 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tu Comisión Pactada</span>
                  <span className="text-lg font-black text-dance-amber mt-1 block">
                    {currentPromoter.commission_rate || '15% por venta'}
                  </span>
                  <span className="text-[10px] text-slate-500">Acordado con el organizador</span>
                </div>

                <div className="p-4 bg-[#141928] border border-white/5 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tu WhatsApp de Ventas</span>
                  <span className="text-sm font-black text-emerald-400 mt-1 block truncate">
                    {currentPromoter.whatsapp}
                  </span>
                  <span className="text-[10px] text-slate-500">Tus compradores te escribirán aquí</span>
                </div>

                <div className="p-4 bg-[#141928] border border-white/5 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Eventos Habilitados</span>
                  <span className="text-lg font-black text-white mt-1 block">
                    {assignedEvents.length} {assignedEvents.length === 1 ? 'Evento' : 'Eventos'}
                  </span>
                  <span className="text-[10px] text-slate-500">Para publicar y vender</span>
                </div>
              </div>

              {/* Listado de Eventos Asignados */}
              <div className="space-y-6">
                <h4 className="font-bold text-sm text-slate-300 uppercase tracking-wider">
                  Tus Eventos y Flyers para Vender
                </h4>

                {assignedEvents.map((evt) => {
                  const promoterFlyers = (currentPromoter.custom_flyers || []).filter(
                    (f) => f.event_id === evt.id
                  );
                  const promoCopy = generatePromoCopy(evt, currentPromoter);
                  const cleanPhone = currentPromoter.whatsapp.replace(/\D/g, '');
                  const waSalesLink = `https://wa.me/${cleanPhone}?text=Hola+${encodeURIComponent(currentPromoter.name)}+quiero+comprar+anticipadas+para+${encodeURIComponent(evt.title)}`;

                  return (
                    <div
                      key={evt.id}
                      className="p-5 sm:p-6 bg-[#131828] border border-white/10 rounded-3xl space-y-5 shadow-lg"
                    >
                      {/* Cabecera del Evento */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-dance-coral">
                            {evt.organizer_name}
                          </span>
                          <h5 className="font-black text-base text-white mt-0.5">{evt.title}</h5>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-dance-orange" />
                              {new Date(evt.start_time).toLocaleDateString('es-AR', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-dance-crimson" />
                              {evt.venue_name} ({evt.city})
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-right">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Anticipada</span>
                            <span className="text-sm font-black text-emerald-400">
                              ${(evt.advance_ticket_price || evt.price || 0).toLocaleString('es-AR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Galería de Flyers: Flyer Oficial + Flyers con foto / personalizados del vendedor */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Image className="w-4 h-4 text-dance-amber" />
                            Flyers Disponibles para Compartir
                          </span>
                          <button
                            onClick={() => {
                              setAddingFlyerEventId(evt.id);
                              setCustomFlyerUrl('');
                              setCustomFlyerLabel('Flyer con mi foto RRPP');
                            }}
                            className="px-3 py-1.5 bg-dance-crimson/20 hover:bg-dance-crimson/30 text-dance-coral font-bold text-xs rounded-xl border border-dance-crimson/30 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar Flyer con mi Foto</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* Flyer Oficial */}
                          <div className="p-3 bg-[#171d30] border border-white/10 rounded-2xl space-y-2 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black">
                                <img
                                  src={evt.flyer_url}
                                  alt="Flyer Oficial"
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-dance-amber text-[10px] font-black border border-white/10 backdrop-blur-sm">
                                  Flyer Oficial
                                </span>
                              </div>
                              <div>
                                <h6 className="font-bold text-xs text-white">Flyer Oficial del Evento</h6>
                                <p className="text-[10px] text-slate-400">Diseño oficial del organizador</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1">
                              <a
                                href={evt.flyer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={`flyer-${evt.title}.jpg`}
                                className="flex-1 py-1.5 px-2 bg-[#20273f] hover:bg-[#2a3454] text-slate-200 text-xs font-semibold rounded-xl text-center border border-white/10 flex items-center justify-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Descargar
                              </a>
                            </div>
                          </div>

                          {/* Flyers Personalizados del Vendedor */}
                          {promoterFlyers.map((pf) => (
                            <div
                              key={pf.id}
                              className="p-3 bg-gradient-to-b from-dance-coral/15 to-[#171d30] border border-dance-coral/30 rounded-2xl space-y-2 flex flex-col justify-between relative shadow-glow-coral"
                            >
                              <button
                                onClick={() => handleDeleteFlyer(pf.id)}
                                className="absolute top-4 right-4 p-1.5 bg-black/80 hover:bg-rose-900/90 text-rose-400 rounded-lg border border-white/10 z-10 transition-colors cursor-pointer"
                                title="Eliminar este flyer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <div className="space-y-2">
                                <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black">
                                  <img
                                    src={pf.flyer_url}
                                    alt={pf.label}
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-dance-crimson text-white text-[10px] font-black shadow-sm">
                                    ⭐ Mi Flyer Personalizado
                                  </span>
                                </div>
                                <div>
                                  <h6 className="font-bold text-xs text-white truncate">{pf.label || 'Flyer con mi foto'}</h6>
                                  <p className="text-[10px] text-slate-400">Tu flyer personalizado para historias</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 pt-1">
                                <a
                                  href={pf.flyer_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={`mi-flyer-${evt.title}.jpg`}
                                  className="flex-1 py-1.5 px-2 bg-gradient-to-r from-dance-coral to-dance-crimson hover:opacity-90 text-white text-xs font-bold rounded-xl text-center shadow-sm flex items-center justify-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Descargar
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Kit de Venta Rápido (Enlace a WhatsApp + Copy de Redes) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Enlace Directo a WhatsApp del Vendedor */}
                        <div className="p-4 bg-[#161c2e] border border-white/5 rounded-2xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <MessageCircle className="w-4 h-4 fill-current" />
                              Tu Enlace de Venta por WhatsApp
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Coloca este enlace en tu biografía de Instagram o en el botón de enlace en tus Historias:
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={waSalesLink}
                              className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-300 truncate focus:outline-none"
                            />
                            <button
                              onClick={() => handleCopy(waSalesLink, `link-${evt.id}`)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                            >
                              {copiedId === `link-${evt.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copiar
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Copy Formateado para Historias y Estados */}
                        <div className="p-4 bg-[#161c2e] border border-white/5 rounded-2xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-dance-amber flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" />
                              Texto Listo para Copiar y Pegar
                            </span>
                            <button
                              onClick={() => handleCopy(promoCopy, `copy-${evt.id}`)}
                              className="px-3 py-1 bg-dance-amber hover:bg-amber-400 text-dark-950 text-xs font-black rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedId === `copy-${evt.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  ¡Texto Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copiar Texto
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl text-[11px] text-slate-300 font-mono whitespace-pre-line max-h-20 overflow-y-auto">
                            {promoCopy}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Agregar Flyer Personalizado con Foto */}
      {addingFlyerEventId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#131828] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-dance-coral" />
                Agregar Flyer con tu Foto / RRPP
              </h4>
              <button
                onClick={() => setAddingFlyerEventId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomFlyer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre o Etiqueta del Flyer
                </label>
                <input
                  type="text"
                  required
                  value={customFlyerLabel}
                  onChange={(e) => setCustomFlyerLabel(e.target.value)}
                  placeholder="Ej: Flyer con mi foto para Historias"
                  className="w-full px-3.5 py-2 bg-[#0e121e] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-dance-crimson"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Subir Imagen desde tu Teléfono / PC
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-dance-coral/20 file:text-dance-coral hover:file:bg-dance-coral/30 cursor-pointer"
                />
                {fileUploadError && (
                  <p className="text-xs text-rose-400 mt-1">{fileUploadError}</p>
                )}
              </div>

              <div className="text-center text-xs text-slate-500 font-bold uppercase">
                o por enlace web
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL de Imagen (Opcional)
                </label>
                <input
                  type="url"
                  value={customFlyerUrl.startsWith('data:') ? '' : customFlyerUrl}
                  onChange={(e) => setCustomFlyerUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 bg-[#0e121e] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-dance-crimson"
                />
              </div>

              {customFlyerUrl && (
                <div className="p-2 bg-black/40 rounded-2xl border border-white/10 max-w-[140px] mx-auto">
                  <img
                    src={customFlyerUrl}
                    alt="Preview"
                    className="w-full h-auto max-h-40 object-cover rounded-xl"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingFlyerEventId(null)}
                  className="flex-1 py-2.5 px-4 bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!customFlyerUrl}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-dance-crimson to-dance-coral hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-glow-crimson transition-all"
                >
                  Guardar Flyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
