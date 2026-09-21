import React, { useState, useEffect } from 'react';
import type { EventCategory, EventItem } from '../../types';
import { processImageFile } from '../../lib/mediaProcessor';
import {
  X,
  CheckCircle,
  Star,
  Save,
  DollarSign,
  Calendar,
  MapPin,
  Upload,
  Percent,
  Trash2,
} from 'lucide-react';

interface AdminEditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  onSave: (updatedData: Partial<EventItem>, autoApprove?: boolean, makeFeatured?: boolean) => void;
  onDelete?: (eventId: string) => void;
}

export const AdminEditEventModal: React.FC<AdminEditEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !event) return null;

  const [title, setTitle] = useState(event.title || '');
  const [description, setDescription] = useState(event.description || '');
  const [flyerUrl, setFlyerUrl] = useState(event.flyer_url || '');
  const [category, setCategory] = useState<EventCategory>(event.category || 'social');
  const [venueName, setVenueName] = useState(event.venue_name || '');
  const [address, setAddress] = useState(event.address || '');
  const [city, setCity] = useState(event.city || 'Buenos Aires');

  // Fechas y Horas
  const defaultStartDate = event.start_time
    ? new Date(event.start_time).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const defaultStartTime = event.start_time
    ? new Date(event.start_time).toTimeString().slice(0, 5)
    : '22:00';
  const defaultEndTime = event.end_time
    ? new Date(event.end_time).toTimeString().slice(0, 5)
    : '05:00';

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);

  // Precios y Comisión
  const [isFree, setIsFree] = useState(Boolean(event.is_free));
  const getInitialSaleType = (ev: EventItem): 'anticipada' | 'puerta' | 'ambas' => {
    const hasAdv = Boolean(ev.advance_ticket_price && ev.advance_ticket_price > 0);
    const hasDoor = Boolean(ev.price && ev.price > 0);
    if (hasAdv && hasDoor) return 'ambas';
    if (hasAdv && !hasDoor) return 'anticipada';
    if (!hasAdv && hasDoor) return 'puerta';
    return 'ambas';
  };
  const [ticketSaleType, setTicketSaleType] = useState<'anticipada' | 'puerta' | 'ambas'>(() =>
    getInitialSaleType(event)
  );
  const [price, setPrice] = useState(event.price ? String(event.price) : '6000');
  const [advancePrice, setAdvancePrice] = useState(
    event.advance_ticket_price ? String(event.advance_ticket_price) : '5000'
  );

  // ¿Tiene comisión para Sale Baile?
  const initialHasCommission = Boolean(
    !event.is_free &&
    event.admin_commission_rate &&
    !event.admin_commission_rate.includes('0%') &&
    !event.admin_commission_rate.includes('0 ARS')
  );
  const [hasCommission, setHasCommission] = useState<boolean>(initialHasCommission || true);
  const [commissionRatePct, setCommissionRatePct] = useState(20); // 20% por defecto

  const [organizerNotesToAdmin, setOrganizerNotesToAdmin] = useState(
    event.organizer_notes_to_admin || ''
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setFlyerUrl(event.flyer_url || '');
      setCategory(event.category || 'social');
      setVenueName(event.venue_name || '');
      setAddress(event.address || '');
      setCity(event.city || 'Buenos Aires');
      setIsFree(Boolean(event.is_free));
      setTicketSaleType(getInitialSaleType(event));
      setPrice(event.price ? String(event.price) : '6000');
      setAdvancePrice(event.advance_ticket_price ? String(event.advance_ticket_price) : '5000');
      setOrganizerNotesToAdmin(event.organizer_notes_to_admin || '');

      const hasComm = Boolean(
        !event.is_free &&
        event.admin_commission_rate &&
        !event.admin_commission_rate.includes('0%') &&
        !event.admin_commission_rate.includes('0 ARS')
      );
      setHasCommission(hasComm !== false);
    }
  }, [event]);

  // Cálculos reactivos de comisión
  const hasAdv = !isFree && (ticketSaleType === 'anticipada' || ticketSaleType === 'ambas');
  const numPrice = (ticketSaleType === 'puerta' || ticketSaleType === 'ambas') ? (parseFloat(price) || 0) : 0;
  const numAdvPrice = hasAdv ? (parseFloat(advancePrice) || 0) : 0;
  const adminCommissionAmount = (hasCommission && numAdvPrice > 0)
    ? Math.round(numAdvPrice * (commissionRatePct / 100))
    : 0;
  const organizerNetAmount = Math.max(0, numAdvPrice - adminCommissionAmount);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const processed = await processImageFile(file);
      setFlyerUrl(processed.url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const buildPayload = (autoApprove: boolean = false, makeFeatured: boolean = false): Partial<EventItem> => {
    const startObj = new Date(`${startDate}T${startTime}:00`);
    const endObj = new Date(`${startDate}T${endTime}:00`);
    if (endTime <= startTime) {
      endObj.setDate(endObj.getDate() + 1);
    }

    const commRateStr = isFree || ticketSaleType === 'puerta'
      ? undefined
      : hasCommission && numAdvPrice > 0
      ? `$${adminCommissionAmount.toLocaleString('es-AR')} ARS (${commissionRatePct}%)`
      : '0 ARS (0% - Sin comisión)';

    return {
      title: title.trim() || event.title,
      description: description.trim() || event.description,
      flyer_url: flyerUrl.trim() || event.flyer_url,
      gallery: [
        {
          id: `med-${Date.now()}`,
          type: 'image',
          url: flyerUrl.trim() || event.flyer_url,
          thumbnail_url: flyerUrl.trim() || event.flyer_url,
        },
      ],
      category,
      start_time: startObj.toISOString(),
      end_time: endObj.toISOString(),
      venue_name: venueName.trim() || event.venue_name,
      address: address.trim() || event.address,
      city: city.trim() || event.city,
      is_free: isFree,
      price: isFree ? undefined : (numPrice || (ticketSaleType === 'anticipada' ? numAdvPrice : undefined)),
      advance_ticket_price: isFree || ticketSaleType === 'puerta' ? undefined : numAdvPrice,
      admin_resale_price: isFree || ticketSaleType === 'puerta' ? undefined : organizerNetAmount,
      admin_commission_rate: commRateStr,
      organizer_notes_to_admin: organizerNotesToAdmin || undefined,
      is_featured: makeFeatured ? true : event.is_featured,
      status: autoApprove ? 'publicado' : event.status,
    };
  };

  const handleSaveOnly = () => {
    onSave(buildPayload(false, false), false, false);
    onClose();
  };

  const handleSaveAndApprove = (makeFeatured: boolean = false) => {
    onSave(buildPayload(true, makeFeatured), true, makeFeatured);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0e111a] border-2 border-purple-500/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Cabecera del Modal */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-purple-950/80 via-[#131626] to-[#0f121d] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black shadow-md">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Editar Flyer & Condiciones de Venta</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/40">
                  Panel Administrador
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Ajusta el flyer, precios y comisiones antes de publicar en la cartelera oficial.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. Flyer y Previsualización */}
          <div className="p-4 rounded-2xl bg-[#141824] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Flyer del Evento
              </span>
              <label className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingImage ? 'Subiendo...' : 'Subir Nueva Imagen'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden bg-black/40 border border-white/15 shrink-0 shadow-md">
                <img src={flyerUrl} alt="Flyer" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1.5 flex-1 w-full">
                <label className="block text-[11px] text-slate-400 font-semibold">
                  URL directa del Flyer (o CDN):
                </label>
                <input
                  type="text"
                  value={flyerUrl}
                  onChange={(e) => setFlyerUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0d14] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. Título, Formato y Lugar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-slate-300 font-bold">Título del Evento</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#141824] border border-white/10 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Formato</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-3 py-2 bg-[#141824] border border-white/10 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
              >
                <option value="social">Social / Fiesta</option>
                <option value="clase">Clase</option>
                <option value="taller">Taller / Workshop</option>
                <option value="festival">Festival</option>
                <option value="practica">Práctica</option>
              </select>
            </div>
          </div>

          {/* 3. Fechas y Horas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                Fecha
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#141824] border border-white/10 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Hora Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#141824] border border-white/10 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Hora Fin</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#141824] border border-white/10 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Lugar y Dirección */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-dance-coral" />
                Nombre del Lugar
              </label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full px-3 py-2 bg-[#141824] border border-white/10 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Dirección</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-[#141824] border border-white/10 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Ciudad / Barrio</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-[#141824] border border-white/10 rounded-xl text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 5. GESTIÓN DE PRECIOS Y COMISIÓN DEL ADMINISTRADOR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#121626] via-[#101422] to-[#0c0f18] border-2 border-emerald-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💵</span>
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Configuración Comercial: Precios & Comisión Sale Baile
                </h4>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="rounded bg-dark-800 border-dark-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Evento Gratuito</span>
              </label>
            </div>

            {!isFree && (
              <div className="space-y-4 pt-1">
                {/* 3 Botones de Modalidad de Venta */}
                <div className="p-3.5 bg-dark-900/90 rounded-xl border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white block text-xs uppercase tracking-wider">
                      Modalidad de Venta de Entradas
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {ticketSaleType === 'anticipada' && '🎟️ Solo Anticipada'}
                      {ticketSaleType === 'puerta' && '🚪 Solo en Puerta'}
                      {ticketSaleType === 'ambas' && '✨ Ambas (Anticipada + Puerta)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTicketSaleType('anticipada')}
                      className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        ticketSaleType === 'anticipada'
                          ? 'bg-purple-600 text-white shadow-md border border-purple-400'
                          : 'bg-dark-800 text-slate-400 hover:text-white border border-dark-700'
                      }`}
                    >
                      <span>🎟️ Solo Anticipada</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTicketSaleType('puerta')}
                      className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        ticketSaleType === 'puerta'
                          ? 'bg-amber-600 text-white shadow-md border border-amber-400'
                          : 'bg-dark-800 text-slate-400 hover:text-white border border-dark-700'
                      }`}
                    >
                      <span>🚪 Solo en Puerta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTicketSaleType('ambas')}
                      className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        ticketSaleType === 'ambas'
                          ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
                          : 'bg-dark-800 text-slate-400 hover:text-white border border-dark-700'
                      }`}
                    >
                      <span>✨ Ambas</span>
                    </button>
                  </div>
                </div>

                {/* Precios */}
                <div className={`grid grid-cols-1 ${ticketSaleType === 'ambas' ? 'sm:grid-cols-2' : ''} gap-3`}>
                  {(ticketSaleType === 'puerta' || ticketSaleType === 'ambas') && (
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        Precio Entrada en Puerta (ARS $)
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-3.5 py-2 bg-dark-900 border border-white/15 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  )}

                  {hasAdv && (
                    <div>
                      <label className="block text-emerald-300 font-bold mb-1">
                        Precio Venta Anticipada (ARS $)
                      </label>
                      <input
                        type="number"
                        value={advancePrice}
                        onChange={(e) => setAdvancePrice(e.target.value)}
                        className="w-full px-3.5 py-2 bg-dark-900 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* CONTROL DE COMISIÓN DE INTERMEDIACIÓN (SOLO ADMIN) */}
                {hasAdv && numAdvPrice > 0 && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-emerald-950/30 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-amber-400" />
                        <span className="font-extrabold text-amber-300 text-xs uppercase">
                          ¿Aplica Comisión para Sale Baile?
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHasCommission(true)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            hasCommission
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                              : 'bg-dark-900 text-slate-400 hover:text-white border border-dark-700'
                          }`}
                        >
                          Sí, con Comisión
                        </button>
                        <button
                          type="button"
                          onClick={() => setHasCommission(false)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            !hasCommission
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-dark-900 text-slate-400 hover:text-white border border-dark-700'
                          }`}
                        >
                          Sin Comisión (0%)
                        </button>
                      </div>
                    </div>

                    {hasCommission ? (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-3">
                          <label className="text-slate-300 font-bold text-xs whitespace-nowrap">
                            Porcentaje de Comisión:
                          </label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[10, 15, 20, 25, 30].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setCommissionRatePct(pct)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  commissionRatePct === pct
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                    : 'bg-dark-900 text-slate-400 hover:text-white border border-white/10'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                            <div className="flex items-center gap-1 bg-dark-900 px-2 py-1 rounded-lg border border-white/10 ml-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={commissionRatePct}
                                onChange={(e) => setCommissionRatePct(Number(e.target.value))}
                                className="w-10 bg-transparent text-white text-xs font-bold focus:outline-none text-right"
                              />
                              <span className="text-slate-400 text-xs">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Resumen del Reparto */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-xl bg-dark-950/80 border border-emerald-500/30">
                            <span className="text-slate-400 text-[10px] block">Ganancia Sale Baile ({commissionRatePct}%):</span>
                            <span className="text-base font-black text-emerald-400">
                              +${adminCommissionAmount.toLocaleString('es-AR')} ARS
                            </span>
                            <span className="text-[10px] text-slate-500 block">por entrada vendida</span>
                          </div>

                          <div className="p-3 rounded-xl bg-dark-950/80 border border-amber-500/30">
                            <span className="text-slate-400 text-[10px] block">Liquidación Organizador:</span>
                            <span className="text-base font-black text-amber-300">
                              ${organizerNetAmount.toLocaleString('es-AR')} ARS
                            </span>
                            <span className="text-[10px] text-slate-500 block">monto neto a transferir</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Sin comisión para Sale Baile. El 100% de la venta anticipada (${numAdvPrice.toLocaleString('es-AR')} ARS) se transfiere íntegro al organizador.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal con Acciones */}
        <div className="px-5 sm:px-6 py-4 bg-[#0a0c14] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-dark-800 hover:bg-dark-750 text-slate-300 font-bold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de ELIMINAR definitivamente este flyer ("${event.title}")?`)) {
                    onDelete(event.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white font-bold text-xs rounded-xl border border-rose-700/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Eliminar flyer definitivamente"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Eliminar Flyer</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-end">
            <button
              type="button"
              onClick={handleSaveOnly}
              className="px-4 py-2.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-bold text-xs rounded-xl border border-purple-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndApprove(false)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Guardar y ✓ APROBAR</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndApprove(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Star className="w-4 h-4 fill-slate-950" />
              <span>Guardar y ⭐ DESTACAR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
