import React, { useState, useEffect } from 'react';
import type { EventItem } from '../../types';
import { formatEventSchedule } from '../../lib/dateUtils';
import { generateNavigationLinks } from '../../lib/geo';
import { getGenreFamilyById } from '../../lib/danceCategories';
import { useFavorites } from '../../context/FavoritesContext';
import { useFollowing } from '../../context/FollowingContext';
import { MASTER_ADMIN_WHATSAPP } from '../../context/AuthContext';
import { LightboxModal } from './LightboxModal';
import { EventMediaCarousel } from './EventMediaCarousel';
import { ShareModal } from './ShareModal';
import { ReportModal } from './ReportModal';
import { AdvanceTicketCTA } from './AdvanceTicketCTA';
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Heart,
  MessageCircle,
  Ticket,
  AlertTriangle,
  Flag,
  X,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Building,
  Star,
  UserCheck,
  UserPlus,
} from 'lucide-react';

interface EventDetailModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReviewModal?: (event: EventItem) => void;
  onOpenBuyTicketModal?: (event: EventItem) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onOpenReviewModal,
  onOpenBuyTicketModal,
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isFollowing, toggleFollow } = useFollowing();
  const [showLightbox, setShowLightbox] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'descripcion' | 'artistas' | 'lugar'>('descripcion');
  const [showReportModal, setShowReportModal] = useState(false);

  // Manejo del botón "Atrás" nativo de Android, gestos del teléfono y tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Empujar un estado al historial para capturar el botón físico "Atrás" en móviles
    window.history.pushState({ modal: 'event-detail' }, '');
    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const isFav = isFavorite(event.id);
  const schedule = formatEventSchedule(event.start_time, event.end_time);
  const navLinks = generateNavigationLinks(event.latitude, event.longitude, event.venue_name, event.address);
  const genreFamily = getGenreFamilyById(event.genre_family);
  const ticketsWhatsapp = MASTER_ADMIN_WHATSAPP;

  // Comprobar si las anticipadas ya cerraron por fecha/hora
  let isAdvanceExpired = false;
  if (event.advance_sales_end_date) {
    const endHour = event.advance_sales_end_time || '23:59';
    const deadlineObj = new Date(`${event.advance_sales_end_date}T${endHour}:00`);
    if (!isNaN(deadlineObj.getTime()) && Date.now() > deadlineObj.getTime()) {
      isAdvanceExpired = true;
    }
  }

  // 1. Detección de clases y profesores (contacto directo con el profesor, sin emisión de ticket)
  const isTeacherClass = event.category === 'clase' || event.event_target === 'clase_profesor';

  // 2. Detección de venta de entradas anticipadas (solo se cobra si hay anticipada)
  const hasAdvanceTicket = !isTeacherClass && !event.is_free && Boolean(event.advance_ticket_price && event.advance_ticket_price > 0);
  const teacherWhatsapp = (event.organizer_whatsapp || ticketsWhatsapp || '5491158589088').replace(/\D/g, '');

  // Deadline de anticipada (null si es clase recurrente sin caducidad)
  const advanceDeadline = (!event.is_recurring_weekly && event.advance_sales_end_date)
    ? new Date(`${event.advance_sales_end_date}T${event.advance_sales_end_time || '23:59'}:00`).getTime()
    : null;
  const advanceEnd = advanceDeadline && !isNaN(advanceDeadline) ? advanceDeadline : null;
  const viaWhatsapp = Boolean(event.advance_tickets_whatsapp);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-hidden">
        <div className="w-full max-w-2xl bg-oled-950 sm:border sm:border-white/10 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh]">
          {/* Header Superior con botón Volver prominente y espaciado para la barra de estado de Android (Notch) */}
          <div className="sticky top-0 z-30 px-3 sm:px-4 py-3 bg-oled-900/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-2.5 pt-[max(14px,env(safe-area-inset-top))] sm:pt-3">
            {/* Botón Volver Atrás Prominente */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/25 text-white font-black text-xs sm:text-sm border border-white/15 transition-all shadow-md cursor-pointer shrink-0"
              title="Volver a la cartelera"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Volver</span>
            </button>

            {/* Badges de Ritmo y Formato Centrados */}
            <div className="flex items-center gap-1.5 overflow-hidden flex-1 justify-center sm:justify-start">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${genreFamily.badgeBg} ${genreFamily.badgeText} ${genreFamily.border} flex items-center gap-1 shrink-0`}>
                <span>{genreFamily.icon}</span>
                <span className="truncate max-w-[120px] sm:max-w-none">{genreFamily.shortName}</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 shrink-0">
                {event.category}
              </span>
            </div>

            {/* Acciones Rápidas: Compartir, Favorito y Cerrar */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
                title="Compartir"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => toggleFavorite(event.id)}
                className={`p-2 rounded-xl border transition-all ${
                  isFav
                    ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white border-transparent shadow-glow-crimson scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                }`}
                title={isFav ? 'Quitar de favoritos' : 'Guardar'}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer"
                title="Cerrar detalles"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1 bg-oled-950 overscroll-contain">
            {event.is_cancelled && (
              <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-400 text-sm">EVENTO CANCELADO</h4>
                  <p className="text-xs text-red-200/80 mt-0.5">
                    {event.cancellation_notice || 'El organizador ha suspendido esta fecha. Revisa sus redes sociales para próximas novedades.'}
                  </p>
                </div>
              </div>
            )}

            {/* Carrusel de Medios (Flyer, Fotos y Videos) con marco elegante */}
            <div className="relative rounded-3xl overflow-hidden bg-oled-900/80 border border-white/10 shadow-2xl max-w-sm sm:max-w-md mx-auto p-2">
              <EventMediaCarousel
                items={event.gallery || []}
                fallbackUrl={event.flyer_url}
                title={event.title}
                onExpand={() => setShowLightbox(true)}
              />
            </div>

            {/* Categoría destacada en píldora neón (Pantalla 3) */}
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-dance-crimson to-dance-coral text-white text-xs font-black uppercase tracking-wider shadow-glow-crimson">
                {event.category === 'social' ? 'Social • Baile' : event.category === 'clase' ? 'Clase • Taller' : `${genreFamily.shortName}`}
              </span>
              {event.genre_family && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300">
                  {genreFamily.icon} {genreFamily.shortName}
                </span>
              )}
            </div>

            {/* Título */}
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {event.title}
            </h1>

            {/* Fila de Datos Clave (Lugar, Fecha, Distancia) */}
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-dance-coral shrink-0" />
                <span className="font-semibold text-white truncate">{event.venue_name} {event.city ? `• ${event.city}` : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-dance-coral shrink-0" />
                <span>{schedule.dateLabel} - {schedule.timeRange}</span>
              </div>
              {event.distance_meters !== undefined && (
                <div className="flex items-center gap-2 text-dance-amber font-bold">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>A {(event.distance_meters / 1000).toFixed(1)} km de tu ubicación</span>
                </div>
              )}
            </div>

            {/* Fila de Precio y Badge */}
            <div className="flex items-center gap-3 pt-1">
              <div className="text-xl sm:text-2xl font-black text-white">
                {event.is_free ? 'GRATIS' : `$${(event.advance_ticket_price || event.price || 0).toLocaleString('es-AR')}`}
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                event.is_free
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : hasAdvanceTicket
                  ? 'bg-gradient-to-r from-dance-crimson/25 to-dance-coral/25 text-dance-coral border border-dance-coral/40'
                  : 'bg-white/10 text-slate-300 border border-white/10'
              }`}>
                {event.is_free ? 'Entrada Libre' : hasAdvanceTicket ? 'Anticipada' : 'En Puerta'}
              </span>
            </div>

            {/* Fila Social (Pantalla 3 de la maqueta) */}
            <div className="flex items-center justify-between py-3 border-y border-white/10 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-base">👥</span>
                <span className="font-bold text-white">{(event as any).attendees_count || 38} van</span>
              </div>
              <button
                type="button"
                onClick={() => toggleFavorite(event.id)}
                className="flex items-center gap-1.5 hover:text-dance-coral transition-colors cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${isFav ? 'text-dance-coral fill-current' : 'text-slate-400'}`} />
                <span>{isFav ? 'Guardado' : 'Guardar'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span>Compartir</span>
              </button>
            </div>

            {/* Botón de Acción: Cómo llegar */}
            <div className="pt-1">
              <a
                href={navLinks.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/15 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md text-center"
              >
                <MapPin className="w-4 h-4 text-dance-coral" />
                <span>Cómo llegar</span>
              </a>
            </div>

            {/* CTA de venta anticipada: urgencia + countdown + rama WhatsApp (debajo de "Cómo llegar") */}
            <AdvanceTicketCTA
              advancePrice={event.advance_ticket_price || 0}
              doorPrice={event.price}
              hasAdvanceTicket={hasAdvanceTicket}
              isAdvanceExpired={isAdvanceExpired}
              advanceEnd={advanceEnd}
              viaWhatsapp={viaWhatsapp}
              whatsappNumber={event.advance_tickets_whatsapp}
              onBuy={onOpenBuyTicketModal ? () => onOpenBuyTicketModal(event) : undefined}
            />

            {/* Organizador del Evento con botón Seguir */}
            {event.organizer_name && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md">
                    {event.organizer_name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      Organiza este evento
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white truncate block">
                      {event.organizer_name}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFollow(event.organizer_name!)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm ${
                    isFollowing(event.organizer_name)
                      ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isFollowing(event.organizer_name) ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-purple-300" />
                      <span>Siguiendo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Seguir</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Pestañas de Contenido (Descripción | Artistas | Lugar) */}
            <div className="flex items-center border-b border-white/10 text-xs sm:text-sm font-black pt-2">
              {(['descripcion', 'artistas', 'lugar'] as const).map((tab) => {
                const label = tab === 'descripcion' ? 'Descripción' : tab === 'artistas' ? 'Artistas' : 'Lugar';
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-center transition-all cursor-pointer border-b-2 ${
                      isActive
                        ? 'border-dance-coral text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Contenido según la pestaña activa */}
            {activeTab === 'descripcion' && (
              <div className="space-y-4 pt-1">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-oled-900/90 p-4 rounded-2xl border border-white/5">
                  {event.description || 'Clase abierta + social con la mejor música. ¡No te lo pierdas!'}
                </p>

                {/* Galería de fotos / ediciones anteriores */}
                {event.gallery && event.gallery.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fotos del ambiente</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {event.gallery.slice(0, 3).map((item, i) => (
                        <img
                          key={i}
                          src={item.url}
                          alt=""
                          className="w-full h-24 object-cover rounded-xl border border-white/10"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'artistas' && (
              <div className="p-4 bg-oled-900/90 rounded-2xl border border-white/5 text-xs sm:text-sm text-slate-300 space-y-2">
                <div className="font-bold text-white">Line-up y Profesores:</div>
                <p>{event.organizer_name || 'Bailarines e invitados especiales de la escena.'}</p>
              </div>
            )}

            {activeTab === 'lugar' && (
              <div className="p-4 bg-oled-900/90 rounded-2xl border border-white/5 text-xs sm:text-sm text-slate-300 space-y-2">
                <div className="font-bold text-white">{event.venue_name}</div>
                <p>{event.address}{event.city ? `, ${event.city}` : ''}</p>
                <div className="pt-2">
                  <a
                    href={navLinks.googleMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-dance-coral font-bold hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Abrir en mapa interactivo
                  </a>
                </div>
              </div>
            )}

            {/* COMPRA DE ENTRADAS / ACCIONES CON MEJOR VISTA */}
            {isTeacherClass ? (
              /* CASO 1: Clase de Profesor (Contacto directo) */
              <div className="w-full p-4 bg-gradient-to-br from-indigo-950/50 via-oled-900 to-indigo-950/30 border border-indigo-500/40 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
                    <span className="text-base">🎓</span>
                    <span>Clase con Profesor</span>
                  </div>
                  {event.price ? (
                    <span className="text-xs font-bold text-slate-300">
                      Arancel: <strong className="text-emerald-400 font-black">${event.price.toLocaleString('es-AR')}</strong>
                    </span>
                  ) : null}
                </div>

                <a
                  href={`https://wa.me/${teacherWhatsapp}?text=${encodeURIComponent(
                    `¡Hola ${event.organizer_name || 'Profesor'}! Te contacto desde Sale Baile para consultar/inscribirme a tu clase de "${event.title}" 💃🕺`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contactar al Profesor por WhatsApp</span>
                </a>
              </div>
            ) : event.is_free ? (
              /* CASO 2: Evento Gratuito */
              onOpenBuyTicketModal && (
                <button
                  type="button"
                  onClick={() => onOpenBuyTicketModal(event)}
                  className="w-full py-4 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:opacity-95 text-white font-black text-sm sm:text-base rounded-2xl flex items-center justify-between shadow-glow-coral transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-black/25">
                      <Ticket className="w-5 h-5 text-emerald-200" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-sm sm:text-base">Obtener Pase Gratuito (QR)</span>
                      <span className="text-[11px] text-emerald-100/80 font-medium block">
                        Ingreso sin costo garantizado
                      </span>
                    </div>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-black/35 text-emerald-300 font-black text-xs sm:text-sm border border-white/10">
                    GRATIS
                  </div>
                </button>
              )
            ) : hasAdvanceTicket && !isAdvanceExpired ? (
              /* CASO 3: botón "Comprar Entrada Anticipada" movido debajo de "Cómo llegar" */
              null
            ) : isAdvanceExpired ? (
              /* CASO 4: Venta anticipada finalizada */
              <div className="w-full p-4 bg-oled-900/90 border border-amber-500/40 rounded-2xl space-y-1.5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-sm sm:text-base">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span>Venta de Anticipadas Finalizada</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                  El horario para adquirir anticipadas ha concluido. <strong className="text-white font-black">Se abona directamente en puerta</strong>{event.price ? ` ($${event.price.toLocaleString('es-AR')})` : ''}.
                </p>
              </div>
            ) : (
              /* CASO 5: Solo en puerta */
              <div className="w-full p-4 bg-oled-900/90 border border-white/10 rounded-2xl space-y-1.5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 text-white font-black text-sm sm:text-base">
                  <span className="text-base">🚪</span>
                  <span>Entrada en Puerta: {event.price ? `$${event.price.toLocaleString('es-AR')}` : 'A consultar'}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  Entrada disponible directamente en la boletería o puerta del local la noche del evento.
                </p>
              </div>
            )}

            {event.tickets_url && (
              <a
                href={event.tickets_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-dance-gold/20 hover:bg-dance-gold/30 border border-dance-gold/40 text-dance-gold font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
              >
                <Ticket className="w-4 h-4" />
                Comprar Entradas en Web Externa
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Organizado por */}
            <div className="p-4 bg-oled-900/90 rounded-2xl border border-white/10 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-dance-coral font-bold shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-black text-sm text-white">{event.organizer_name}</h5>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Organizador Verificado
                  </p>
                </div>
              </div>

              {/* Calificar: Solo el ícono de la estrellita */}
              {onOpenReviewModal && (
                <button
                  type="button"
                  onClick={() => onOpenReviewModal(event)}
                  className="p-2.5 rounded-2xl bg-dance-amber/15 hover:bg-dance-amber/30 text-dance-amber border border-dance-amber/30 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
                  title="Calificar este evento"
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              )}
            </div>

            {/* Botón Inferior Grande para Volver a la Cartelera */}
            <div className="pt-4 pb-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-3.5 px-6 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-black text-sm rounded-2xl border border-white/15 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                <span>Volver a la cartelera</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="text-xs text-slate-500 hover:text-amber-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                Reportar datos incorrectos o inapropiados
              </button>
            </div>
          </div>
        </div>
      </div>

      <LightboxModal
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        items={event.gallery || []}
        imageUrl={event.flyer_url}
        title={event.title}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        event={event}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        event={event}
      />
    </>
  );
};
