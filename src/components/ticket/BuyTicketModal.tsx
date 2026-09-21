import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import type { EventItem, TicketItem } from '../../types';
import { purchaseTickets } from '../../lib/tickets';
import { createMercadoPagoPreference } from '../../lib/mercadopago';
import { useAuth } from '../../context/AuthContext';
import { formatEventSchedule } from '../../lib/dateUtils';
import {
  X,
  Ticket,
  CheckCircle,
  Calendar,
  MapPin,
  ArrowRight,
  Clock,
  AlertTriangle,
  Upload,
  Trash2,
  CreditCard,
  Loader2,
  Lock,
} from 'lucide-react';

interface BuyTicketModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tickets: TicketItem[]) => void;
  onGoToMyTickets?: () => void;
}

export const BuyTicketModal: React.FC<BuyTicketModalProps> = ({
  event,
  isOpen,
  onClose,
  onSuccess,
  onGoToMyTickets,
}) => {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState(user?.full_name || '');
  const [buyerDni, setBuyerDni] = useState('');
  const [buyerEmail, setBuyerEmail] = useState(user?.email || '');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState(user?.whatsapp_phone || '');
  const [paymentReference, setPaymentReference] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'payment_details' | 'completed' | 'pending_review'>('form');
  const [purchasedTickets, setPurchasedTickets] = useState<TicketItem[]>([]);
  const [isCreatingMpPreference, setIsCreatingMpPreference] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  // 1. Los profesores y clases no generan venta de tickets (contacto directo)
  const isTeacherClass = event.category === 'clase' || event.event_target === 'clase_profesor';
  if (isTeacherClass) return null;

  // 2. Comprobar vencimiento de venta anticipada
  let isAdvanceExpired = false;
  if (event.advance_sales_end_date) {
    const endHour = event.advance_sales_end_time || '23:59';
    const deadlineObj = new Date(`${event.advance_sales_end_date}T${endHour}:00`);
    if (!isNaN(deadlineObj.getTime()) && Date.now() > deadlineObj.getTime()) {
      isAdvanceExpired = true;
    }
  }

  // 3. Bloquear eventos sin venta anticipada (el cobro en puerta no genera venta en la app)
  if (!event.is_free && (!event.advance_ticket_price || event.advance_ticket_price <= 0 || isAdvanceExpired)) {
    return null;
  }

  const unitPrice = event.is_free ? 0 : (event.advance_ticket_price || 0);
  const totalPrice = unitPrice * quantity;
  const schedule = formatEventSchedule(event.start_time, event.end_time);

  const handlePayWithMercadoPagoCheckout = async () => {
    try {
      setIsCreatingMpPreference(true);
      setMpError(null);

      // 1. Crear la orden localmente en estado pending_payment
      const { order, tickets } = purchaseTickets({
        event,
        quantity,
        buyerUserId: user?.id,
        buyerName: buyerName.trim(),
        buyerDni: buyerDni.trim(),
        buyerEmail: buyerEmail.trim(),
        buyerWhatsapp: buyerWhatsapp.trim(),
        paymentMethod: 'mercadopago',
      });

      setPurchasedTickets(tickets);

      // 2. Crear la preferencia de pago oficial en Mercado Pago
      const pref = await createMercadoPagoPreference({
        orderId: order.id,
        items: [
          {
            id: event.id,
            title: `Entrada Sale Baile: ${event.title}`,
            description: `Pase Digital QR x ${quantity} - ${buyerName}`,
            quantity,
            unit_price: unitPrice,
            currency_id: 'ARS',
          }
        ],
        buyer: {
          name: buyerName.trim(),
          email: buyerEmail.trim(),
          phone: buyerWhatsapp.trim(),
          identificationNumber: buyerDni.trim(),
        },
        metadata: {
          event_id: event.id,
          order_id: order.id,
        },
      });

      // 3. Redirigir al Checkout Oficial de Mercado Pago
      window.location.href = pref.init_point;
    } catch (err: any) {
      console.error('Error al iniciar Mercado Pago Checkout:', err);
      setMpError(err?.message || 'No se pudo conectar con Mercado Pago. Por favor intenta nuevamente.');
      setIsCreatingMpPreference(false);
    }
  };

  const handleContinueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerDni.trim() || !buyerEmail.trim()) return;

    if (event.is_free || unitPrice === 0) {
      // Entrada gratuita: emitir directamente
      handleConfirmPurchase();
    } else {
      setStep('payment_details');
    }
  };

  const handleConfirmPurchase = () => {
    const isFree = event.is_free || unitPrice === 0;

    if (!isFree && !receiptImage) {
      alert('Es obligatorio adjuntar la captura del comprobante de pago para continuar.');
      return;
    }

    const { tickets } = purchaseTickets({
      event,
      quantity,
      buyerUserId: user?.id,
      buyerName: buyerName.trim(),
      buyerDni: buyerDni.trim(),
      buyerEmail: buyerEmail.trim(),
      buyerWhatsapp: buyerWhatsapp.trim(),
      paymentMethod: 'mercadopago',
      paymentReference: paymentReference.trim() || undefined,
      paymentReceiptUrl: receiptImage || undefined,
    });

    setPurchasedTickets(tickets);

    if (isFree) {
      setStep('completed');
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#ff2d55', '#ff5a36', '#ffb300', '#10b981'],
        });
      } catch (e) {}
    } else {
      setStep('pending_review');
    }

    if (onSuccess) {
      onSuccess(tickets);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0e111a] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
              step === 'pending_review'
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-glow-amber'
                : 'bg-gradient-to-tr from-dance-crimson to-dance-coral shadow-glow-crimson'
            }`}>
              {step === 'pending_review' ? <Clock className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {step === 'completed'
                  ? '¡Entrada Emitida con Éxito!'
                  : step === 'pending_review'
                  ? 'Comprobante en Verificación'
                  : 'Comprar Entrada Anticipada'}
              </h3>
              <p className="text-[11px] text-slate-400">Sale Baile Tickets Oficiales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen del Evento */}
        <div className="p-3.5 bg-[#151a27] border border-white/10 rounded-2xl flex items-center gap-3.5">
          <img
            src={event.flyer_url}
            alt=""
            className="w-14 h-18 rounded-xl object-cover border border-white/10 shrink-0"
          />
          <div className="min-w-0 space-y-1">
            <h4 className="font-extrabold text-sm text-white truncate">{event.title}</h4>
            <div className="text-xs text-dance-coral font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{schedule.dateLabel}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-normal">{schedule.timeRange}</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span className="truncate">{event.venue_name} ({event.city})</span>
            </div>
          </div>
        </div>

        {/* PASO 1: Formulario y Selección de Cantidad */}
        {step === 'form' && (
          <form onSubmit={handleContinueToPayment} className="space-y-4">
            {/* Aviso de Cierre de Anticipadas */}
            {isAdvanceExpired && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-2xl flex items-start gap-2.5 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block text-white font-bold">Venta de Anticipadas Finalizada</strong>
                  <p className="text-slate-300 text-[11px]">
                    El período de compra anticipada ha concluido. Debes adquirir tu entrada directamente en la puerta o boletería del local.
                  </p>
                </div>
              </div>
            )}

            {/* Selector de Cantidad */}
            <div className="p-4 bg-[#121624] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-white block">Cantidad de Entradas</span>
                  <span className="text-[11px] text-slate-400">
                    {event.is_free ? 'Acceso 100% Gratuito' : `$${unitPrice.toLocaleString('es-AR')} por persona`}
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-[#0a0d16] border border-white/10 px-3 py-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-lg font-black text-slate-400 hover:text-white px-1 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-base font-black text-white min-w-[20px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="text-lg font-black text-dance-coral hover:text-white px-1 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Calculado */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Total a abonar:</span>
                <span className="text-lg font-black text-dance-amber">
                  {event.is_free ? 'GRATIS' : `$${totalPrice.toLocaleString('es-AR')} ARS`}
                </span>
              </div>
            </div>

            {/* Datos del Titular / Asistente */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Datos del Titular (Para control en puerta)
              </span>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-dance-crimson focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    DNI / Documento * <strong className="text-dance-coral">(Obligatorio)</strong>
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerDni}
                    onChange={(e) => setBuyerDni(e.target.value)}
                    placeholder="Ej: 38.452.190"
                    className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-dance-crimson focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">WhatsApp / Celular *</label>
                  <input
                    type="text"
                    required
                    value={buyerWhatsapp}
                    onChange={(e) => setBuyerWhatsapp(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-dance-crimson focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Email (Para recibir el ticket) *</label>
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="usuario@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-dance-crimson focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAdvanceExpired}
              className={`w-full py-3.5 font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all ${
                isAdvanceExpired
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white shadow-glow-crimson cursor-pointer'
              }`}
            >
              <span>
                {isAdvanceExpired
                  ? 'Venta Anticipada Cerrada'
                  : event.is_free
                  ? 'Obtener Entrada Gratuita'
                  : 'Continuar al Pago'}
              </span>
              {!isAdvanceExpired && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}

        {/* PASO 2: Instrucciones de Pago y Transferencia Mercado Pago */}
        {step === 'payment_details' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-[#121624] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Total a Transferir:</span>
                <span className="text-xl font-black text-emerald-400">
                  ${totalPrice.toLocaleString('es-AR')} ARS
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                Pases: <strong className="text-white">{quantity} {quantity === 1 ? 'Entrada' : 'Entradas'}</strong> • Titular: <strong className="text-white">{buyerName} (DNI {buyerDni})</strong>
              </div>
            </div>

            {/* Pago con Mercado Pago Oficial */}
            <div className="p-4 rounded-2xl border bg-gradient-to-r from-sky-950/40 via-[#151a27] to-[#151a27] border-sky-400/50 shadow-lg space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                  MP
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-white">Mercado Pago</h4>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[9px] border border-emerald-500/30">
                      Oficial
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Tarjetas de Crédito, Débito, Cuotas o Saldo en Cuenta</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2.5 text-xs">
                <button
                  type="button"
                  disabled={isCreatingMpPreference}
                  onClick={handlePayWithMercadoPagoCheckout}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  {isCreatingMpPreference ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conectando con Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pagar ${totalPrice.toLocaleString('es-AR')} con Mercado Pago</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Escrito Pago Seguro */}
                <div className="flex items-center justify-center gap-1.5 py-1 text-slate-400 text-xs text-center">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-bold">Pago Seguro</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 text-[11px]">Mercado Pago te indicará el destinatario antes de confirmar</span>
                </div>

                {mpError && (
                  <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-[11px]">
                    {mpError}
                  </div>
                )}
              </div>
            </div>

            {/* Subir Captura de Pantalla del Comprobante (Obligatorio) */}
            <div className="p-4 bg-[#121624] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-bold text-slate-200">
                  Subí tu Comprobante de Pago
                </span>
                <span className="text-[10px] font-black text-dance-crimson bg-dance-crimson/15 border border-dance-crimson/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Obligatorio
                </span>
              </div>

              {/* Uploader de Captura */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                  Captura de pantalla del comprobante de pago:
                </label>

                {receiptImage ? (
                  <div className="relative p-2.5 bg-[#0a0d16] border border-emerald-500/40 rounded-xl flex items-center gap-3">
                    <img
                      src={receiptImage}
                      alt="Comprobante"
                      className="w-14 h-14 rounded-lg object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-emerald-400 block truncate">
                        ✓ Captura adjuntada
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Lista para enviar y registrar en tu cuenta
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptImage(null)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                      title="Quitar captura"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-white/20 hover:border-dance-coral/60 rounded-xl bg-[#0b0e17] cursor-pointer transition-colors group">
                    <Upload className="w-5 h-5 text-dance-coral group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-xs font-bold text-white">
                      Toca aquí para seleccionar la captura de tu teléfono
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG o foto del comprobante
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setReceiptImage(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Nro de Comprobante / Operación de Transferencia */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nro de Operación de Mercado Pago (Opcional):
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ej: 94821034 o últimos dígitos"
                  className="w-full px-3.5 py-2.5 bg-[#0b0e17] border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:border-dance-coral focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {!receiptImage && (
                <p className="text-[11px] text-dance-coral font-bold text-center bg-dance-coral/10 border border-dance-coral/20 py-2 px-3 rounded-xl">
                  ⚠️ Es obligatorio subir la captura del comprobante para confirmar
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="py-3 px-4 bg-[#141926] hover:bg-[#1f2638] text-slate-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={!receiptImage}
                  onClick={handleConfirmPurchase}
                  className={`flex-1 py-3 px-4 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                    receiptImage
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white cursor-pointer shadow-emerald-900/40'
                      : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Pago y Registrar en mi Perfil</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3A: PENDIENTE DE REVISIÓN (Eventos Pagos) */}
        {step === 'pending_review' && (
          <div className="text-center space-y-4 animate-fadeIn py-2">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-glow-amber">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">¡Comprobante Registrado!</h4>
              <p className="text-xs text-amber-300 font-bold">
                Tu solicitud ha sido ingresada en estado: PENDIENTE DE VERIFICACIÓN
              </p>
            </div>

            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl text-left space-y-2 text-xs text-slate-200">
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>¿Cómo se activa mi entrada QR?</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                El Administrador o Productor del evento cotejará la acreditación de tu transferencia. Una vez verificado el pago, <strong>tu código QR se activará automáticamente</strong> para ingresar en la puerta.
              </p>
              <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
                <div>Titular: <strong className="text-white">{buyerName} (DNI {buyerDni})</strong></div>
                <div>Monto: <strong className="text-emerald-400">${totalPrice.toLocaleString('es-AR')} ARS</strong></div>
                {paymentReference && (
                  <div>Nro de Ref/Operación: <strong className="font-mono text-amber-300">{paymentReference}</strong></div>
                )}
                <div>ID de Orden: <strong className="font-mono text-slate-300">{purchasedTickets[0]?.order_id}</strong></div>
              </div>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={onGoToMyTickets || onClose}
                className="w-full py-3.5 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber text-white font-black text-xs sm:text-sm rounded-xl shadow-glow-crimson cursor-pointer hover:opacity-95"
              >
                Ver en Mi Billetera de Entradas
              </button>
            </div>
          </div>
        )}

        {/* PASO 3B: Confirmación Exitosa Inmediata (Eventos Gratuitos) */}
        {step === 'completed' && (
          <div className="text-center space-y-4 animate-fadeIn py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-glow-coral">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">¡Pase Gratuito Confirmado!</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Tu entrada gratuita ha sido registrada exitosamente. Ya podés presentar tu código QR en puerta o verla en la sección <strong>"Mis Entradas"</strong>.
              </p>
            </div>

            <div className="p-4 bg-[#121624] border border-white/10 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Titular:</span>
                <strong className="text-white">{buyerName}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>DNI de Control:</span>
                <strong className="text-emerald-400">{buyerDni}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Entradas Emitidas:</span>
                <strong className="text-white">{purchasedTickets.length} {purchasedTickets.length === 1 ? 'Pase' : 'Pases'}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Código de Ticket:</span>
                <strong className="font-mono text-amber-300">{purchasedTickets[0]?.id || 'TKT-OK'}</strong>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={onGoToMyTickets || onClose}
                className="w-full py-3.5 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber text-white font-black text-xs sm:text-sm rounded-xl shadow-glow-crimson cursor-pointer hover:opacity-95"
              >
                Ver Mi Entrada con Código QR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
