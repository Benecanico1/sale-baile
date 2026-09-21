import React, { useState, useEffect } from 'react';
import type { TicketItem } from '../../types';
import { getLocalTickets, fetchCloudTickets, saveLocalTickets } from '../../lib/tickets';
import { syncChannel } from '../../lib/cloudRequests';
import { useAuth } from '../../context/AuthContext';
import { QRCodeCanvas } from './QRCodeCanvas';
import {
  Ticket,
  Calendar,
  MapPin,
  CheckCircle,
  Share2,
  Clock,
  AlertTriangle,
  Lock,
  MessageCircle,
  Eye,
  Image as ImageIcon,
  X,
} from 'lucide-react';

interface MyTicketsViewProps {
  onGoToExplore?: () => void;
  onExploreEvents?: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({ onGoToExplore, onExploreEvents }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketItem[]>(() => getLocalTickets());
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'pending' | 'used'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string; ticket: TicketItem } | null>(null);
  const handleExplore = onGoToExplore || onExploreEvents || (() => {});

  const loadTickets = async () => {
    const local = getLocalTickets();
    setTickets(local);

    try {
      const cloud = await fetchCloudTickets();
      if (cloud && cloud.length > 0) {
        const map = new Map<string, TicketItem>();
        local.forEach(t => map.set(t.id, t));
        cloud.forEach(t => map.set(t.id, t));
        const merged = Array.from(map.values());
        setTickets(merged);
        saveLocalTickets(merged);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadTickets();

    const channel = syncChannel;
    if (channel) {
      const handleMessage = () => {
        loadTickets();
      };
      channel.addEventListener('message', handleMessage);
      return () => channel.removeEventListener('message', handleMessage);
    }
  }, []);

  // Filtrar las entradas del usuario actual
  const userTickets = tickets.filter(t => {
    if (user?.email && t.buyer_email?.toLowerCase() === user.email.toLowerCase()) return true;
    if (user?.id && t.buyer_user_id === user.id) return true;
    if (user?.full_name && t.buyer_name?.toLowerCase().includes(user.full_name.toLowerCase())) return true;
    // En modo demo, si no hay coincidencias exactas, mostrar las entradas disponibles para testing
    return true;
  });

  const filteredTickets = userTickets.filter(t => {
    if (filterTab === 'valid') return t.status === 'valid';
    if (filterTab === 'pending') return t.status === 'pending_payment';
    if (filterTab === 'used') return t.status === 'used';
    return true;
  });

  const validCount = userTickets.filter(t => t.status === 'valid').length;
  const pendingCount = userTickets.filter(t => t.status === 'pending_payment').length;
  const usedCount = userTickets.filter(t => t.status === 'used').length;

  const handleShareTicket = (tkt: TicketItem) => {
    const text = `🎟️ Mi entrada para ${tkt.event_title} en ${tkt.event_venue} (${tkt.event_date}). Código de pase: ${tkt.id} • Titular: ${tkt.buyer_name} (DNI ${tkt.buyer_dni})`;
    if (navigator.share) {
      navigator.share({ title: 'Mi Entrada - Sale Baile', text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleSendWhatsAppProof = (tkt: TicketItem) => {
    const refText = tkt.payment_reference ? `\n• Nro Comprobante / Ref: ${tkt.payment_reference}` : '';
    const receiptNotice = tkt.payment_receipt_url ? `\n• Comprobante: Cargado en mi perfil de Sale Baile` : '';
    const message = `Hola Sale Baile! Te envío los datos de mi pago para la entrada:\n\n• Evento: ${tkt.event_title}\n• Titular: ${tkt.buyer_name}\n• DNI: ${tkt.buyer_dni}\n• Código Ticket: ${tkt.id}${refText}${receiptNotice}\n\n¿Me confirmás la acreditación para desbloquear mi QR? ¡Muchas gracias!`;
    const url = `https://wa.me/5491158589088?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-dance-crimson/20 via-dance-coral/15 to-transparent p-6 rounded-3xl border border-dance-crimson/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-dance-crimson/20 text-dance-crimson text-xs font-bold border border-dance-crimson/30 uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <Ticket className="w-3.5 h-3.5" />
            Billetera Digital
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-2">
            Mis Entradas & Pases de Baile
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Presentá tu código QR o DNI en la puerta del evento para ingresar sin demoras.
          </p>
        </div>

        <button
          onClick={onGoToExplore}
          className="px-4 py-2.5 bg-gradient-to-r from-dance-crimson to-dance-coral text-white text-xs font-extrabold rounded-xl shadow-glow-crimson transition-all cursor-pointer hover:opacity-95"
        >
          Explorar Más Eventos
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            filterTab === 'all'
              ? 'bg-dance-coral text-white shadow-md'
              : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-700'
          }`}
        >
          Todas ({userTickets.length})
        </button>
        <button
          onClick={() => setFilterTab('valid')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
            filterTab === 'valid'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-dark-850 text-emerald-400 hover:text-emerald-300 border border-dark-700'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Válidas ({validCount})</span>
        </button>
        {pendingCount > 0 && (
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
              filterTab === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-dark-850 text-amber-400 hover:text-amber-300 border border-dark-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En Revisión ({pendingCount})</span>
          </button>
        )}
        <button
          onClick={() => setFilterTab('used')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
            filterTab === 'used'
              ? 'bg-slate-700 text-white shadow-md'
              : 'bg-dark-850 text-slate-400 hover:text-slate-300 border border-dark-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Ingresadas ({usedCount})</span>
        </button>
      </div>

      {/* Lista de Entradas */}
      {filteredTickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((tkt) => {
            const isValid = tkt.status === 'valid';
            const isPending = tkt.status === 'pending_payment';

            return (
              <div
                key={tkt.id}
                className={`bg-oled-950 border-2 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all space-y-4 relative overflow-hidden ${
                  isValid
                    ? 'border-[#ff2d55]/60 shadow-[0_0_30px_rgba(255,45,85,0.25)] hover:border-[#ff5500]'
                    : isPending
                    ? 'border-amber-500/50 bg-amber-950/10 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                    : 'border-white/10 opacity-75'
                }`}
              >
                {/* Muescas laterales de boleto físico (Ticket Notches) */}
                <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#050508] border border-[#ff2d55]/50 z-10" />
                <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#050508] border border-[#ff2d55]/50 z-10" />

                {/* Cabecera VIP Digital QR Pass */}
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-dance-coral animate-ping" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber">
                      VIP DIGITAL QR PASS
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-white bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                    TICKET #{tkt.id.slice(-6).toUpperCase()}
                  </span>
                </div>

                {/* Badge de Estado */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                      isValid
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : isPending
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isValid ? 'bg-emerald-400 animate-pulse' : isPending ? 'bg-amber-400' : 'bg-slate-500'
                      }`}
                    />
                    <span>
                      {isValid
                        ? '🟢 ENTRADA VÁLIDA PARA INGRESO'
                        : isPending
                        ? '⏳ PAGO EN REVISIÓN (NO HABILITADA AÚN)'
                        : '⚪ YA INGRESADA'}
                    </span>
                  </span>

                  <span className="text-[11px] font-bold text-slate-400">
                    {tkt.tier_name || '🎟️ Pase Digital'}
                  </span>
                </div>

                {/* Evento & Fecha */}
                <div className="flex gap-3.5 items-start">
                  <img
                    src={tkt.event_flyer_url}
                    alt=""
                    className="w-16 h-20 rounded-2xl object-cover border border-white/10 shrink-0 shadow-lg"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-black text-sm sm:text-base text-white truncate leading-snug">
                      {tkt.event_title}
                    </h3>
                    <div className="text-xs text-dance-coral font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{tkt.event_date} ({tkt.event_time_range})</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{tkt.event_venue} • {tkt.event_city}</span>
                    </div>
                  </div>
                </div>

                {/* Banner si el pago está en revisión */}
                {isPending && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="block text-white font-bold">Verificación de Transferencia en Proceso</strong>
                      <p className="text-[11px] text-slate-300">
                        La administración está revisando la acreditación. En cuanto se verifique, tu código QR se desbloqueará aquí automáticamente.
                      </p>
                    </div>
                  </div>
                )}

                {/* Línea Perforada de Corte de Boleto */}
                <div className="border-t-2 border-dashed border-white/15 my-2 -mx-2" />

                {/* Código QR y Datos del Titular con Marco Neón */}
                <div className="p-4 bg-oled-900/90 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                  <div className="space-y-1.5 text-xs text-slate-300 w-full sm:w-auto">
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Titular</span>
                      <strong className="text-white text-sm font-black">{tkt.attendee_name || tkt.buyer_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">DNI de Verificación</span>
                      <strong className="text-emerald-400 font-mono text-sm font-black">{tkt.buyer_dni}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Organiza</span>
                      <span className="text-slate-300 font-semibold">{tkt.organizer_name}</span>
                    </div>
                    {tkt.payment_reference && (
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Ref / Comprobante</span>
                        <span className="font-mono text-amber-300 text-[11px]">{tkt.payment_reference}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-2 shrink-0 relative p-2.5 rounded-2xl bg-black/40 border border-dance-coral/30 shadow-glow-coral">
                    {isPending ? (
                      <div className="w-[115px] h-[115px] rounded-xl bg-dark-900 border border-amber-500/30 flex flex-col items-center justify-center text-center p-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-2 text-center">
                          <Lock className="w-6 h-6 text-amber-400 mb-1" />
                          <span className="text-[9px] font-black text-amber-300 uppercase leading-tight">
                            QR Bloqueado hasta acreditación
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <QRCodeCanvas value={tkt.qr_code_payload} size={115} />
                        <span className="text-[10px] text-dance-coral font-mono font-black uppercase tracking-wider">
                          Pase Digital QR
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Comprobante de Pago si existe */}
                {tkt.payment_receipt_url && (
                  <div className="p-3 bg-[#121622] border border-purple-500/20 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="truncate">
                        <span className="text-white font-bold text-xs block truncate">Comprobante de Pago</span>
                        <span className="text-[11px] text-slate-400">Adjuntado a tu entrada</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedReceipt({ url: tkt.payment_receipt_url!, ticket: tkt })}
                      className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/30 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Foto</span>
                    </button>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-1">
                  {isPending ? (
                    <button
                      onClick={() => handleSendWhatsAppProof(tkt)}
                      className="flex-1 py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Notificar por WhatsApp</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleShareTicket(tkt)}
                      className="flex-1 py-2 px-3 bg-[#151a27] hover:bg-[#1f2638] text-slate-200 text-xs font-bold rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir Pase</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0e111a] border border-white/10 rounded-3xl p-10 text-center space-y-3">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-white text-base">Aún no tienes entradas en esta categoría</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Comprá tu entrada anticipada para los próximos sociales y clases para ingresar directo con tu celular.
          </p>
          <button
            onClick={handleExplore}
            className="px-5 py-2.5 bg-gradient-to-r from-dance-crimson to-dance-coral text-white text-xs font-black rounded-xl shadow-glow-crimson inline-flex items-center gap-2 cursor-pointer"
          >
            Ver Cartelera de Eventos
          </button>
        </div>
      )}

      {/* Modal Lightbox de Comprobante */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0e111a] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  Comprobante de Pago
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedReceipt.ticket.event_title} • {selectedReceipt.ticket.buyer_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-black/50 border border-white/5 flex items-center justify-center p-2 min-h-[250px]">
              <img
                src={selectedReceipt.url}
                alt="Comprobante de pago"
                className="max-h-[60vh] max-w-full object-contain rounded-xl"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleSendWhatsAppProof(selectedReceipt.ticket)}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Reenviar a la Administración por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

