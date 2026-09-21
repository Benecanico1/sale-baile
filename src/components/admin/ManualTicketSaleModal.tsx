import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import type { EventItem, TicketItem, TicketOrder } from '../../types';
import { issueManualAdminTickets } from '../../lib/tickets';
import { QRCodeCanvas } from '../ticket/QRCodeCanvas';
import {
  X,
  Ticket,
  MessageCircle,
  CheckCircle2,
  User,
  CreditCard,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

interface ManualTicketSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  onSuccess: (order: TicketOrder, tickets: TicketItem[]) => void;
}

export const ManualTicketSaleModal: React.FC<ManualTicketSaleModalProps> = ({
  isOpen,
  onClose,
  events,
  onSuccess,
}) => {
  const publishedEvents = events.filter((e) => e.status === 'publicado');
  const availableEvents = publishedEvents.length > 0 ? publishedEvents : events;

  const [selectedEventId, setSelectedEventId] = useState<string>(
    availableEvents[0]?.id || ''
  );
  const [buyerName, setBuyerName] = useState('');
  const [buyerDni, setBuyerDni] = useState('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [resaleCost, setResaleCost] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estado posterior a la emisión
  const [issuedResult, setIssuedResult] = useState<{
    order: TicketOrder;
    tickets: TicketItem[];
    event: EventItem;
  } | null>(null);

  const selectedEvent =
    events.find((e) => e.id === selectedEventId) || availableEvents[0];

  // Auto-ajustar precios al cambiar de evento seleccionado
  React.useEffect(() => {
    if (selectedEvent) {
      const defaultPrice =
        selectedEvent.advance_ticket_price || selectedEvent.price || 4000;
      const defaultCost =
        selectedEvent.admin_resale_price || Math.round(defaultPrice * 0.80);
      setUnitPrice(String(defaultPrice));
      setResaleCost(String(defaultCost));
    }
  }, [selectedEventId]);

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setResaleCost(String(Math.round(num * 0.80)));
    }
  };

  if (!isOpen) return null;

  const numUnitPrice = parseFloat(unitPrice) || 0;
  const numResaleCost = parseFloat(resaleCost) || 0;
  const numQty = Math.max(1, quantity || 1);

  const totalAmount = numUnitPrice * numQty;
  const totalOrganizerRevenue = numResaleCost * numQty;
  const totalCommission = Math.max(0, totalAmount - totalOrganizerRevenue);

  const handleResetForm = () => {
    setBuyerName('');
    setBuyerDni('');
    setBuyerWhatsapp('');
    setBuyerEmail('');
    setQuantity(1);
    setPaymentNotes('');
    setError(null);
    setIssuedResult(null);
    setCopiedLink(false);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedEvent) {
      setError('Debes seleccionar un evento válido.');
      return;
    }
    if (!buyerName.trim()) {
      setError('El nombre y apellido del cliente es obligatorio.');
      return;
    }
    if (!buyerDni.trim()) {
      setError('El DNI del cliente es obligatorio para el control de acceso.');
      return;
    }
    if (!buyerWhatsapp.trim()) {
      setError('El WhatsApp del cliente es obligatorio para enviarle el QR.');
      return;
    }
    if (numUnitPrice <= 0) {
      setError('El precio de la entrada debe ser mayor a 0.');
      return;
    }

    try {
      const result = issueManualAdminTickets({
        event: selectedEvent,
        quantity: numQty,
        buyerName: buyerName.trim(),
        buyerDni: buyerDni.trim(),
        buyerWhatsapp: buyerWhatsapp.trim(),
        buyerEmail: buyerEmail.trim() || undefined,
        unitPricePaid: numUnitPrice,
        adminResaleCost: numResaleCost,
        paymentNotes: paymentNotes.trim() || 'Venta Manual WhatsApp / Admin',
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });

      setIssuedResult({
        order: result.order,
        tickets: result.tickets,
        event: selectedEvent,
      });

      onSuccess(result.order, result.tickets);
    } catch (err: any) {
      console.error('Error emitiendo entrada manual:', err);
      setError('Ocurrió un error al generar las entradas. Intenta de nuevo.');
    }
  };

  const generateWhatsappMessage = () => {
    if (!issuedResult) return '';
    const { order, tickets, event } = issuedResult;
    const ticketIdsList = tickets.map((t) => `• ${t.id}`).join('\n');

    return `🎟️ *¡Hola ${order.buyer_name}!* 💃🕺

Confirmamos tu compra de entrada para *"${event.title}"* a través de Sale Baile:

📅 *Fecha:* ${tickets[0]?.event_date || 'Fecha del evento'} (${tickets[0]?.event_time_range || 'Horario'})
📍 *Lugar:* ${event.venue_name} - ${event.address}, ${event.city}
👤 *Titular:* ${order.buyer_name} (DNI: ${order.buyer_dni})
🎫 *Pases Generados:* ${order.quantity} entrada(s)
${ticketIdsList}
💵 *Total Abonado:* $${order.total_amount_paid.toLocaleString('es-AR')} ARS

✅ *Tu código QR oficial ya está activo para el ingreso en puerta.*
Podés consultar tus entradas y descargar tu código QR cuando quieras ingresando a:
👉 https://salebaile.web.app

¡Que disfrutes una noche inolvidable! ✨`;
  };

  const handleSendWhatsapp = () => {
    if (!issuedResult) return;
    const cleanPhone = issuedResult.order.buyer_whatsapp.replace(/\D/g, '');
    const msg = generateWhatsappMessage();
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );
  };

  const handleCopyMessage = () => {
    const msg = generateWhatsappMessage();
    navigator.clipboard.writeText(msg);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-white/10 bg-[#121622] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Cargar Venta Manual / WhatsApp</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Admin Directo
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Registrá los datos del comprador, generá el QR oficial y envíaselo por WhatsApp.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-[#0e111a] flex-1">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {issuedResult ? (
            /* Pantalla de Éxito y Envío Inmediato de Entrada */
            <div className="space-y-6 text-center animate-fadeIn py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-white">
                  ¡Entrada Generada y Acreditada con Éxito!
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  La orden <strong className="text-emerald-400 font-mono">{issuedResult.order.id}</strong> ha sido creada con estado <strong className="text-emerald-400">VÁLIDA</strong> para control de acceso en puerta.
                </p>
              </div>

              {/* Tarjetas de Tickets Generados con QR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {issuedResult.tickets.map((tkt, idx) => (
                  <div
                    key={tkt.id}
                    className="p-4 rounded-2xl bg-[#121624] border border-emerald-500/30 space-y-3 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                        Pase #{idx + 1} • QR ACTIVO
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {tkt.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <QRCodeCanvas value={tkt.qr_code_payload} size={88} className="rounded-xl p-1.5" />
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-white truncate max-w-[140px]">
                          {tkt.attendee_name || tkt.buyer_name}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          DNI: <span className="text-slate-200 font-mono font-semibold">{tkt.buyer_dni}</span>
                        </div>
                        <div className="text-emerald-400 font-black text-xs">
                          ${tkt.unit_price_paid.toLocaleString('es-AR')} ARS
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones de Envío por WhatsApp y Acciones */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    Enviar al WhatsApp del Comprador ({issuedResult.order.buyer_whatsapp}):
                  </span>
                  <button
                    onClick={handleCopyMessage}
                    className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? '¡Mensaje Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div className="p-3 bg-[#0a0d14] rounded-xl text-[11px] text-slate-300 font-mono leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap border border-white/5">
                  {generateWhatsappMessage()}
                </div>

                <button
                  onClick={handleSendWhatsapp}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <MessageCircle className="w-5 h-5 fill-slate-950" />
                  <span>📲 Abrir WhatsApp y Enviar Entrada</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleResetForm}
                  className="px-4 py-2.5 bg-[#151a27] hover:bg-[#1f2638] text-white text-xs font-bold rounded-xl border border-white/10 transition-colors cursor-pointer"
                >
                  Cargar Otra Venta
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-200 text-xs font-black rounded-xl transition-colors cursor-pointer"
                >
                  Listo / Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* Formulario de Carga de Venta */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selección de Evento */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  1. Seleccionar Evento / Fiesta
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-medium"
                >
                  {availableEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} — {evt.venue_name} ({evt.city || 'Bs As'}) [${(evt.advance_ticket_price || evt.price || 0).toLocaleString('es-AR')}]
                    </option>
                  ))}
                </select>

                {selectedEvent && (
                  <div className="p-3 bg-[#121622]/60 rounded-xl border border-white/5 flex items-center gap-3 text-xs text-slate-300">
                    <img
                      src={selectedEvent.flyer_url}
                      alt={selectedEvent.title}
                      className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="font-black text-white truncate">
                        {selectedEvent.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>📍 {selectedEvent.venue_name}</span>
                        <span>•</span>
                        <span>🏢 {selectedEvent.organizer_name}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Datos del Cliente */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <User className="w-4 h-4" />
                  <span>2. Datos del Comprador (Asistente)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nombre y Apellido del Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Ej: Martín Rodríguez"
                      className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      DNI del Asistente (para puerta) *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerDni}
                      onChange={(e) => setBuyerDni(e.target.value)}
                      placeholder="Ej: 38491823"
                      className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      WhatsApp del Cliente (para enviar QR) *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerWhatsapp}
                      onChange={(e) => setBuyerWhatsapp(e.target.value)}
                      placeholder="Ej: +5491155551234"
                      className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Correo Electrónico (opcional)
                    </label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Valores y Liquidación */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-dance-coral">
                  <CreditCard className="w-4 h-4" />
                  <span>3. Cantidad y Liquidación Económica</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Cantidad de Entradas
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Precio Cobrado por Entrada (ARS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => handleUnitPriceChange(e.target.value)}
                      placeholder="4000"
                      className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-bold text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      A Liquidar Organizador (80% ARS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={resaleCost}
                      onChange={(e) => setResaleCost(e.target.value)}
                      placeholder="3200"
                      className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-bold text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Comprobante de Pago / Notas
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ej: Transferencia MP #894210, alias: juan.baile"
                    className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tarjeta de Resumen en Vivo */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121624] to-[#0c0f17] border border-white/10 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Cobrado</span>
                  <span className="text-base sm:text-lg font-black text-white mt-0.5 block">
                    ${totalAmount.toLocaleString('es-AR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 block uppercase font-bold">Comisión Sale Baile (20% Fijo)</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 block">
                    +${totalCommission.toLocaleString('es-AR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">A Liquidar Organizador (80%)</span>
                  <span className="text-base sm:text-lg font-black text-slate-300 mt-0.5 block">
                    ${totalOrganizerRevenue.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Botón de Emisión */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 bg-[#121622] hover:bg-[#1a2030] text-slate-300 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Emitir Entrada y Generar QR</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
