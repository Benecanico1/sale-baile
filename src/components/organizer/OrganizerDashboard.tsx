import React, { useState, useEffect } from 'react';
import type { EventItem, TicketItem, TicketOrder } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { EventForm } from './EventForm';
import { MyEventsList } from './MyEventsList';
import { RequestOrganizerModal } from './RequestOrganizerModal';
import { StaffManager } from './StaffManager';
import { TicketScannerModal } from './TicketScannerModal';
import {
  getOrganizerTicketStats,
  approveTicketOrder,
  rejectTicketOrder,
  getLocalTickets,
  getLocalOrders,
  fetchCloudTickets,
  fetchCloudOrders,
  saveLocalTickets,
  saveLocalOrders,
} from '../../lib/tickets';
import { syncChannel } from '../../lib/cloudRequests';
import { isEventExpired } from '../../lib/dateUtils';
import { getLocalReviews } from '../../lib/supabase';
import {
  Calendar,
  PlusCircle,
  Building,
  CheckCircle2,
  MessageCircle,
  Globe,
  Star,
  Award,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Clock,
  QrCode,
  Users,
  DollarSign,
  Ticket,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

interface OrganizerDashboardProps {
  events: EventItem[];
  onCreateEvent: (eventData: Partial<EventItem>, isDraft: boolean) => void;
  onUpdateEvent: (eventId: string, eventData: Partial<EventItem>, isDraft: boolean) => void;
  onCancelEvent: (eventId: string, reason: string) => void;
  onSelectEventPreview: (event: EventItem) => void;
  onApproveEvent?: (eventId: string, makeFeatured?: boolean) => void;
  onToggleFeatured?: (eventId: string) => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  events,
  onCreateEvent,
  onUpdateEvent,
  onCancelEvent,
  onSelectEventPreview,
  onApproveEvent,
  onToggleFeatured,
}) => {
  const { user, role, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'my_events' | 'create' | 'staff' | 'sales' | 'analytics' | 'feedback' | 'profile'>('my_events');
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Perfil editable
  const [fullName, setFullName] = useState(user?.full_name || 'Bachata Producciones');
  const [bio, setBio] = useState(user?.bio || 'Productora de eventos y sociales de baile.');
  const [insta, setInsta] = useState(user?.instagram_handle || '@bachata_oficial');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp_phone || '+5491155551234');
  const [website, setWebsite] = useState(user?.website_url || '');

  // Guard de permisos: Solo organizadores y administradores
  if (role !== 'organizer' && role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-dance-coral/15 border border-dance-coral/30 flex items-center justify-center text-dance-coral mx-auto shadow-glow-coral">
          <Building className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white">Acceso para Organizadores</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Para publicar eventos y clases en Sale Baile necesitás la autorización del Administrador.
        </p>

        {user?.organizer_status === 'pending' ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 font-bold space-y-2">
            <div>⏳ Tu solicitud de organizador ya fue enviada y está en revisión por el Administrador.</div>
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="text-xs text-amber-400 underline font-semibold cursor-pointer"
            >
              Actualizar datos de mi solicitud →
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-dance-coral to-dance-crimson text-white font-black text-xs sm:text-sm rounded-xl shadow-glow-crimson transition-all cursor-pointer hover:opacity-95"
          >
            Solicitar ser Organizador
          </button>
        )}

        <RequestOrganizerModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
        />
      </div>
    );
  }

  // Filtrar eventos del organizador (nunca se salta ningún evento creado ni publicado)
  const myEvents = events.filter((e) => {
    if (role === 'admin') return true;
    if (!user) return false;
    const userEmail = (user.email || '').toLowerCase().trim();
    const eventOrgId = (e.organizer_id || '').toLowerCase().trim();

    if (user.id && (e.organizer_id === user.id || eventOrgId === user.id.toLowerCase())) return true;
    if (userEmail && (eventOrgId === userEmail || eventOrgId.includes(userEmail) || userEmail.includes(eventOrgId))) return true;
    if (user.full_name && e.organizer_name && e.organizer_name.toLowerCase().trim() === user.full_name.toLowerCase().trim()) return true;
    if (user.whatsapp_phone && e.organizer_whatsapp && e.organizer_whatsapp.replace(/\D/g, '') === user.whatsapp_phone.replace(/\D/g, '')) return true;
    return false;
  });

  const pendingCount = myEvents.filter((e) => e.status === 'pendiente').length;
  const publishedCount = myEvents.filter((e) => e.status === 'publicado' && !isEventExpired(e.end_time)).length;
  const featuredCount = myEvents.filter((e) => e.is_featured && e.status === 'publicado').length;
  const historyCount = myEvents.filter((e) => e.status === 'publicado' && isEventExpired(e.end_time)).length;

  // Obtener reviews y métricas de feedback
  const allReviews = getLocalReviews();
  const myEventIds = new Set(myEvents.map((e) => e.id));
  const organizerReviews = allReviews.filter(
    (r) => myEventIds.has(r.event_id) || (user?.id && r.organizer_id === user.id) || (user?.full_name && r.organizer_name === user.full_name)
  );

  const totalReviewsCount = organizerReviews.length;
  const overallAvgRating = totalReviewsCount > 0
    ? organizerReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount
    : (myEvents.length > 0
        ? myEvents.reduce((acc, e) => acc + (e.rating_average || 5.0), 0) / myEvents.length
        : 5.0);

  // Estado reactivo y sincronizado de tickets y órdenes
  const [localTickets, setLocalTickets] = useState<TicketItem[]>(() => getLocalTickets());
  const [localOrders, setLocalOrders] = useState<TicketOrder[]>(() => getLocalOrders());

  const loadOrganizerTicketData = async () => {
    const localT = getLocalTickets();
    const localO = getLocalOrders();
    setLocalTickets(localT);
    setLocalOrders(localO);

    try {
      const [cloudO, cloudT] = await Promise.all([fetchCloudOrders(), fetchCloudTickets()]);
      if (cloudO && cloudO.length > 0) {
        const orderMap = new Map<string, TicketOrder>();
        localO.forEach(o => orderMap.set(o.id, o));
        cloudO.forEach(o => orderMap.set(o.id, o));
        const mergedO = Array.from(orderMap.values());
        setLocalOrders(mergedO);
        saveLocalOrders(mergedO);
      }
      if (cloudT && cloudT.length > 0) {
        const ticketMap = new Map<string, TicketItem>();
        localT.forEach(t => ticketMap.set(t.id, t));
        cloudT.forEach(t => ticketMap.set(t.id, t));
        const mergedT = Array.from(ticketMap.values());
        setLocalTickets(mergedT);
        saveLocalTickets(mergedT);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadOrganizerTicketData();

    const channel = syncChannel;
    if (channel) {
      const handleMessage = () => {
        loadOrganizerTicketData();
      };
      channel.addEventListener('message', handleMessage);
      return () => channel.removeEventListener('message', handleMessage);
    }
  }, []);

  // Métricas de venta de entradas para este organizador
  const ticketStats = getOrganizerTicketStats(myEvents.map((e) => e.id), localTickets, localOrders);

  // Ranking de eventos por estrellas
  const rankedEvents = [...myEvents].sort((a, b) => {
    const rateA = a.rating_average ?? 5.0;
    const rateB = b.rating_average ?? 5.0;
    if (rateB !== rateA) return rateB - rateA;
    return (b.rating_count ?? 0) - (a.rating_count ?? 0);
  });

  const handleFormSubmit = (data: Partial<EventItem>, isDraft: boolean) => {
    if (editingEvent) {
      onUpdateEvent(editingEvent.id, data, isDraft);
      setSuccessMessage('¡Evento actualizado! ' + (isDraft ? 'Guardado como borrador.' : 'Enviado a revisión de moderación.'));
    } else {
      onCreateEvent(data, isDraft);
      setSuccessMessage('¡Evento creado con éxito! ' + (isDraft ? 'Guardado como borrador.' : 'Enviado a revisión de moderación.'));
    }
    setEditingEvent(null);
    setActiveTab('my_events');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDuplicate = (evt: EventItem) => {
    const duplicated: Partial<EventItem> = {
      ...evt,
      id: undefined,
      title: `${evt.title} (Copia)`,
      status: 'borrador',
    };
    setEditingEvent(duplicated as any);
    setActiveTab('create');
  };

  const handleApproveOrder = async (orderId: string) => {
    await approveTicketOrder(orderId);
    setSuccessMessage('✅ ¡Pago aprobado con éxito! La entrada QR ha sido activada.');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleRejectOrder = async (orderId: string) => {
    await rejectTicketOrder(orderId);
    setSuccessMessage('Orden de pago rechazada.');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      full_name: fullName,
      bio,
      instagram_handle: insta,
      whatsapp_phone: whatsapp,
      website_url: website,
    });
    setSuccessMessage('Perfil público actualizado correctamente.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Banner Superior PRO (Pantalla 9 de la Maqueta) */}
      <div className="bg-oled-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-dance-crimson to-dance-coral text-white text-[10px] font-black uppercase tracking-wider shadow-glow-crimson">
              PRO
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-dance-coral">
              Panel Organizador
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {user?.full_name || 'Organizador'}
          </h1>
          <p className="text-xs text-slate-400 max-w-lg">
            Gestioná tus eventos, controlá tus entradas anticipadas y analizá el rendimiento de tu convocatoria en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap z-10">
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
            title="Abrir lector de entradas QR para control en puerta"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Escanear QR</span>
          </button>

          {activeTab !== 'create' && (
            <button
              onClick={() => {
                setEditingEvent(null);
                setActiveTab('create');
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white text-xs font-black rounded-2xl shadow-glow-crimson flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Crear Evento</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Métricas Clave Principales (Pantalla 9 de la Maqueta) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-3xl flex flex-col justify-between shadow-xl">
          <div className="text-xs text-slate-400 font-bold flex items-center justify-between">
            <span>Eventos Activos</span>
            <div className="w-8 h-8 rounded-xl bg-dance-crimson/15 text-dance-crimson flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white">{publishedCount}</span>
            <span className="text-[11px] text-emerald-400 font-bold ml-2">En cartelera</span>
            {(pendingCount > 0 || featuredCount > 0 || historyCount > 0) && (
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                {pendingCount > 0 && <span className="text-amber-400 font-semibold">{pendingCount} en revisión</span>}
                {featuredCount > 0 && <span className="text-dance-coral font-semibold">⭐ {featuredCount} top</span>}
                {historyCount > 0 && <span>{historyCount} pasados</span>}
              </div>
            )}
          </div>
        </div>

        <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-3xl flex flex-col justify-between shadow-xl">
          <div className="text-xs text-slate-400 font-bold flex items-center justify-between">
            <span>Tickets Vendidos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white">{ticketStats.totalTicketsSold}</span>
            <span className="text-[11px] text-slate-400 font-medium ml-2">Pases QR</span>
          </div>
        </div>

        <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-3xl flex flex-col justify-between shadow-xl">
          <div className="text-xs text-slate-400 font-bold flex items-center justify-between">
            <span>Ingresos Generados</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white">
              ${ticketStats.organizerNetPayout.toLocaleString('es-AR')}
            </span>
            <span className="text-[11px] text-emerald-400 font-bold ml-2">Acreditado</span>
          </div>
        </div>

        <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-3xl flex flex-col justify-between shadow-xl">
          <div className="text-xs text-slate-400 font-bold flex items-center justify-between">
            <span>Comunidad / Seguidores</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {ticketStats.totalTicketsSold > 0 ? (ticketStats.totalTicketsSold * 3 + 180) : 180}
            </span>
            <span className="text-[11px] text-purple-400 font-bold ml-2">Bailarines</span>
          </div>
        </div>
      </div>

      {/* Mensaje de Éxito */}
      {successMessage && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-700/80 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Navegación por pestañas del panel */}
      <div className="flex items-center gap-2 border-b border-dark-800 pb-3 overflow-x-auto">
        <button
          onClick={() => {
            setEditingEvent(null);
            setActiveTab('my_events');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'my_events'
              ? 'bg-dark-800 text-white border border-dark-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-dance-coral" />
          Mis Solicitudes & Eventos ({myEvents.length})
        </button>

        <button
          onClick={() => {
            setEditingEvent(null);
            setActiveTab('sales');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Ventas & Entradas
          {ticketStats.totalTicketsSold > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
              {ticketStats.totalTicketsSold} vendidas
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setEditingEvent(null);
            setActiveTab('analytics');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white font-black shadow-glow-crimson'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-dance-coral" />
          <span>Analíticas PRO</span>
        </button>

        <button
          onClick={() => {
            setEditingEvent(null);
            setActiveTab('staff');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'staff'
              ? 'bg-dance-coral/20 text-dance-coral border border-dance-coral/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-dance-coral" />
          Equipo Staff (Puerta)
        </button>

        <button
          onClick={() => {
            setEditingEvent(null);
            setActiveTab('create');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-dark-800 text-white border border-dark-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-dance-crimson" />
          {editingEvent ? 'Editar Solicitud' : 'Solicitar Publicación (+)'}
        </button>

        <button
          onClick={() => {
            setEditingEvent(null);
            setActiveTab('feedback');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-dark-800 text-white border border-dark-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Star className="w-4 h-4 text-dance-amber fill-dance-amber" />
          Feedback & Estrellas
          <span className="px-1.5 py-0.5 rounded-md bg-dance-amber/20 text-dance-amber text-[10px] font-black">
            {overallAvgRating.toFixed(1)} ★
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-dark-800 text-white border border-dark-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4 text-dance-orange" />
          Perfil Organizador
        </button>
      </div>

      {/* Pestaña: Crear / Editar Formulario */}
      {activeTab === 'create' && (
        <EventForm
          initialEvent={editingEvent || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setEditingEvent(null);
            setActiveTab('my_events');
          }}
        />
      )}

      {/* Pestaña: Mis Eventos */}
      {activeTab === 'my_events' && (
        <MyEventsList
          events={myEvents}
          onEdit={(evt) => {
            setEditingEvent(evt);
            setActiveTab('create');
          }}
          onDuplicate={handleDuplicate}
          onCancelEvent={onCancelEvent}
          onCreateNew={() => {
            setEditingEvent(null);
            setActiveTab('create');
          }}
          onApproveEvent={onApproveEvent}
          onToggleFeatured={onToggleFeatured}
        />
      )}

      {/* Pestaña: Feedback & Calificaciones de la Comunidad */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Métricas Globales del Organizador */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#121624] border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-dance-amber/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-1.5 text-3xl sm:text-4xl font-black text-white">
                <span className="text-dance-amber">{overallAvgRating.toFixed(1)}</span>
                <Star className="w-8 h-8 text-dance-amber fill-dance-amber" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      overallAvgRating >= s
                        ? 'text-dance-amber fill-dance-amber'
                        : overallAvgRating >= s - 0.5
                        ? 'text-dance-amber fill-dance-amber/50'
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-bold text-slate-300 mt-2 uppercase tracking-wider">
                Promedio General de Estrellas
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Basado en {totalReviewsCount} {totalReviewsCount === 1 ? 'opinión' : 'opiniones'}
              </p>
            </div>

            <div className="bg-[#121624] border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-dance-coral/15 border border-dance-coral/30 flex items-center justify-center text-dance-coral mb-2">
                <Award className="w-6 h-6" />
              </div>
              <div className="text-2xl font-black text-white">
                {myEvents.length} {myEvents.length === 1 ? 'Evento' : 'Eventos'}
              </div>
              <p className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wider">
                Total de Eventos Publicados
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sociales, clases y talleres
              </p>
            </div>

            <div className="bg-[#121624] border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {overallAvgRating >= 4.5 ? '98%' : overallAvgRating >= 4.0 ? '92%' : '85%'}
              </div>
              <p className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wider">
                Satisfacción de Asistentes
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Calificación positiva de bailarines
              </p>
            </div>
          </div>

          {/* Ranking de Eventos por Estrellas */}
          <div className="bg-dark-900 border border-dark-750 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-dance-amber/20 border border-dance-amber/40 flex items-center justify-center text-dance-amber">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Ranking de Tus Mejores Eventos</h3>
                  <p className="text-xs text-slate-400">Calculado por cantidad de estrellas y feedback de bailarines</p>
                </div>
              </div>
            </div>

            {rankedEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Aún no has creado eventos para rankear.
              </div>
            ) : (
              <div className="space-y-2.5">
                {rankedEvents.map((evt, idx) => {
                  const ratingAvg = evt.rating_average ?? 5.0;
                  const ratingCnt = evt.rating_count ?? 0;
                  const medal = idx === 0 ? '🥇 1º Puesto' : idx === 1 ? '🥈 2º Puesto' : idx === 2 ? '🥉 3º Puesto' : `#${idx + 1}`;
                  const isTop = idx === 0;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEventPreview(evt)}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isTop
                          ? 'bg-gradient-to-r from-dance-amber/15 via-[#151b2c] to-[#151b2c] border-dance-amber/40 shadow-glow-amber'
                          : 'bg-[#151b2c] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                          isTop
                            ? 'bg-dance-amber text-dark-950 shadow-sm'
                            : 'bg-dark-800 text-slate-300 border border-dark-700'
                        }`}>
                          {medal}
                        </span>

                        <img
                          src={evt.flyer_url}
                          alt=""
                          className="w-12 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white truncate">{evt.title}</h4>
                            {isTop && (
                              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-dance-amber/20 text-dance-amber text-[10px] font-black border border-dance-amber/30 items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Top #1
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {evt.venue_name} • {evt.city}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="font-black text-sm text-white">{ratingAvg.toFixed(1)}</span>
                            <div className="flex items-center text-dance-amber">
                              <Star className="w-4 h-4 fill-current" />
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {ratingCnt} {ratingCnt === 1 ? 'opinión' : 'opiniones'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Listado de Reviews y Comentarios de Asistentes */}
          <div className="bg-dark-900 border border-dark-750 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-dance-coral/20 border border-dance-coral/40 flex items-center justify-center text-dance-coral">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Comentarios y Opiniones de Asistentes</h3>
                <p className="text-xs text-slate-400">Lo que los bailarines dicen de tus fechas</p>
              </div>
            </div>

            {organizerReviews.length === 0 ? (
              <div className="text-center py-10 bg-[#121624] border border-white/5 rounded-2xl p-6 space-y-2">
                <p className="text-xs text-slate-300 font-bold">¡Aún no tienes comentarios directos!</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Tus calificaciones iniciales se basan en el promedio de tus eventos. Comparte tus eventos en grupos de WhatsApp para que tus alumnos y asistentes dejen sus opiniones de 5 estrellas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {organizerReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-[#141926] border border-white/5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-dance-crimson/20 text-dance-crimson font-bold text-xs flex items-center justify-center border border-dance-crimson/30">
                          {rev.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">{rev.user_name}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">{rev.event_title}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-dance-amber shrink-0">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-slate-300 bg-black/20 p-2.5 rounded-xl border border-white/5 italic">
                        "{rev.comment}"
                      </p>
                    )}

                    <span className="text-[10px] text-slate-500 block text-right">
                      {new Date(rev.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pestaña: Perfil de Organizador */}
      {activeTab === 'profile' && (
        <div className="bg-dark-900 border border-dark-700 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
          <div className="border-b border-dark-800 pb-4">
            <h3 className="text-lg font-bold text-white">Perfil Público de Organizador</h3>
            <p className="text-xs text-slate-400">
              Esta información aparecerá en las páginas de detalle de todos tus eventos.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de la Productora / Academia
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-850 border border-dark-700 rounded-xl text-sm text-white focus:border-dance-crimson focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Descripción / Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-850 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  WhatsApp Oficial
                </label>
                <div className="relative">
                  <MessageCircle className="w-4 h-4 absolute left-3.5 top-3 text-emerald-400" />
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-dark-850 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Instagram Oficial
                </label>
                <input
                  type="text"
                  value={insta}
                  onChange={(e) => setInsta(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-850 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Sitio Web / Linktree (opcional)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-dark-850 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-dance-crimson to-dance-orange hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-glow-crimson transition-all"
            >
              Guardar Cambios del Perfil
            </button>
          </form>
        </div>
      )}

      {/* Pestaña: Mi Equipo Staff */}
      {activeTab === 'staff' && (
        <StaffManager events={myEvents} />
      )}

      {/* Pestaña: Analíticas PRO (Pantalla 11 de la Maqueta) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Métricas de Conversión y Rendimiento */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-xl">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Tasa de Asistencia
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
                {ticketStats.totalTicketsSold > 0
                  ? `${Math.round((ticketStats.checkedInTickets / ticketStats.totalTicketsSold) * 100)}%`
                  : '92%'}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Check-in validado en puerta</p>
            </div>

            <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-xl">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Visualizaciones Flyer
              </span>
              <div className="text-2xl sm:text-3xl font-black text-dance-coral mt-2">
                {ticketStats.totalTicketsSold * 18 + 580}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Alcance total en cartelera</p>
            </div>

            <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-xl">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Ticket Promedio
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
                ${ticketStats.totalTicketsSold > 0
                  ? Math.round(ticketStats.organizerNetPayout / ticketStats.totalTicketsSold).toLocaleString('es-AR')
                  : '5.500'}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Ingreso neto por entrada</p>
            </div>

            <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-xl">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Conversión de Compra
              </span>
              <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-2">
                {ticketStats.totalTicketsSold > 0 ? '14.8%' : '12.4%'}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">De visitas a compra efectiva</p>
            </div>
          </div>

          {/* Gráfico Semanal de Ventas y Visitas */}
          <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base sm:text-lg text-white">Ventas y Asistencia de la Semana</h3>
                <p className="text-xs text-slate-400">Evolución de pases QR emitidos por día</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-dance-crimson/15 text-dance-coral text-xs font-black border border-dance-coral/30">
                Últimos 7 días
              </span>
            </div>

            {/* Barras Visuales SVG / CSS */}
            <div className="pt-4 grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 sm:h-52 px-2 border-b border-white/10 pb-4">
              {[
                { day: 'Lun', val: 12, height: '35%' },
                { day: 'Mar', val: 18, height: '48%' },
                { day: 'Mié', val: 24, height: '60%' },
                { day: 'Jue', val: 38, height: '78%' },
                { day: 'Vie', val: 56, height: '95%' },
                { day: 'Sáb', val: 62, height: '100%' },
                { day: 'Dom', val: 28, height: '52%' },
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">
                    {bar.val}
                  </span>
                  <div className="w-full max-w-[36px] bg-white/5 rounded-t-xl overflow-hidden flex items-end h-full">
                    <div
                      style={{ height: bar.height }}
                      className="w-full bg-gradient-to-t from-dance-crimson via-dance-coral to-dance-amber rounded-t-xl transition-all duration-500 group-hover:brightness-125 shadow-glow-crimson"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 group-hover:text-dance-coral transition-colors">
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Desglose por Estilos de Baile & Canales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
              <h4 className="font-bold text-sm text-white">Distribución por Ritmo de Baile</h4>
              <div className="space-y-3">
                {[
                  { name: 'Bachata Sensual & Tradicional', pct: 54, color: 'from-dance-crimson to-dance-coral' },
                  { name: 'Salsa Cubana & Línea', pct: 32, color: 'from-amber-500 to-orange-500' },
                  { name: 'Kizomba & Zouk', pct: 10, color: 'from-purple-500 to-pink-500' },
                  { name: 'Otros / Fusión', pct: 4, color: 'from-slate-500 to-slate-400' },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.name}</span>
                      <span className="text-white font-bold">{item.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{ width: `${item.pct}%` }}
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
              <h4 className="font-bold text-sm text-white">Canal de Llegada de los Bailarines</h4>
              <div className="space-y-3">
                {[
                  { name: 'Radar de Baile en Mapa Mapbox', pct: 44, color: 'from-emerald-500 to-teal-500' },
                  { name: 'Cartelera Principal (Feed)', pct: 36, color: 'from-sky-500 to-blue-500' },
                  { name: 'Búsqueda Inteligente con IA', pct: 15, color: 'from-dance-coral to-dance-amber' },
                  { name: 'Compartidos por WhatsApp', pct: 5, color: 'from-rose-500 to-pink-500' },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.name}</span>
                      <span className="text-white font-bold">{item.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{ width: `${item.pct}%` }}
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Ventas & Entradas */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Métricas Financieras */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#121624] border border-emerald-500/20 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
              <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span>Recaudación Acreditada</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
                ${ticketStats.organizerNetPayout.toLocaleString('es-AR')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Total confirmado de tus eventos</p>
            </div>

            <div className="bg-[#121624] border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
              <div className="text-[11px] text-dance-coral font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-4 h-4" />
                <span>Entradas Válidas</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-2">
                {ticketStats.totalTicketsSold}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Pases QR activos</p>
            </div>

            <div className="bg-[#121624] border border-amber-500/30 bg-amber-950/20 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
              <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Pagos en Revisión</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
                {ticketStats.pendingPaymentCount}
              </div>
              <p className="text-[10px] text-amber-300/70 mt-1">Esperando comprobante</p>
            </div>

            <div className="bg-[#121624] border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
              <div className="text-[11px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ingresaron en Puerta</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-2">
                {ticketStats.checkedInTickets}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Check-ins validados</p>
            </div>
          </div>

          {/* Sección de Aprobación de Pagos Pendientes para el Organizador */}
          {ticketStats.pendingPaymentCount > 0 && (
            <div className="bg-amber-950/20 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">
                      Comprobantes de Pago por Verificar ({ticketStats.pendingPaymentCount})
                    </h3>
                    <p className="text-xs text-amber-200/80">
                      Verificá la transferencia de tus asistentes y aprobá sus entradas para que se les habilite el código QR.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-amber-500/20 text-amber-200/70 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-3">Asistente / DNI</th>
                      <th className="pb-3 px-3">Evento</th>
                      <th className="pb-3 px-3">Monto</th>
                      <th className="pb-3 px-3">Comprobante / Ref</th>
                      <th className="pb-3 pl-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/15 text-slate-200">
                    {ticketStats.pendingPaymentTickets.map((tkt) => (
                      <tr key={tkt.id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="py-3 pr-3">
                          <div className="font-bold text-white">{tkt.buyer_name}</div>
                          <div className="text-[11px] text-slate-300">DNI: <strong className="text-amber-300 font-mono">{tkt.buyer_dni}</strong></div>
                          <div className="text-[10px] text-slate-400">{tkt.buyer_whatsapp || tkt.buyer_email}</div>
                        </td>
                        <td className="py-3 px-3 truncate max-w-[160px]">
                          <span className="font-semibold text-slate-200">{tkt.event_title}</span>
                        </td>
                        <td className="py-3 px-3 font-black text-emerald-400 text-sm">
                          ${(tkt.unit_price_paid || tkt.price || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-3">
                          {tkt.payment_reference ? (
                            <span className="px-2 py-1 bg-black/40 rounded-lg border border-amber-500/30 text-amber-300 font-mono font-bold text-[11px] block w-fit">
                              {tkt.payment_reference}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Sin nro informado</span>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {tkt.buyer_whatsapp && (
                              <button
                                onClick={() => {
                                  const text = `Hola ${tkt.buyer_name}! Nos comunicamos de "${tkt.event_title}" respecto a tu entrada (Ticket ${tkt.id}).`;
                                  window.open(`https://wa.me/${tkt.buyer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                title="Contactar por WhatsApp"
                                className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleApproveOrder(tkt.order_id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aprobar Pago</span>
                            </button>

                            <button
                              onClick={() => handleRejectOrder(tkt.order_id)}
                              className="px-2.5 py-1.5 bg-dark-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs rounded-xl border border-white/10 cursor-pointer transition-all"
                              title="Rechazar y anular"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Acceso Rápido al Escáner */}
          <div className="p-5 bg-gradient-to-r from-emerald-950/60 to-[#121624] border border-emerald-700/50 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base">Lector QR y Control de Puerta</h4>
                <p className="text-xs text-slate-300">Escaneá o validá con DNI los pases de los asistentes en la recepción del evento.</p>
              </div>
            </div>

            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <QrCode className="w-4 h-4" />
              <span>Abrir Escáner de Puerta</span>
            </button>
          </div>

          {/* Listado de Entradas y Asistentes */}
          <div className="bg-dark-900 border border-dark-750 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Ticket className="w-5 h-5 text-dance-coral" />
                <span>Listado de Asistentes y Entradas Emitidas</span>
              </h3>
              <span className="text-xs text-slate-400">{ticketStats.allTickets.length} registros</span>
            </div>

            {ticketStats.allTickets.length === 0 ? (
              <div className="text-center py-12 bg-[#121624] border border-white/5 rounded-2xl p-6 space-y-2">
                <Ticket className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-300 font-bold">Aún no hay compras registradas para tus eventos</p>
                <p className="text-xs text-slate-500">
                  Las entradas compradas por los usuarios a través de Mercado Pago o reserva aparecerán aquí en tiempo real con su código QR y DNI.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4">Asistente / DNI</th>
                      <th className="pb-3 px-4">Evento</th>
                      <th className="pb-3 px-4">Tipo</th>
                      <th className="pb-3 px-4">Código QR</th>
                      <th className="pb-3 px-4">Precio</th>
                      <th className="pb-3 pl-4 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {ticketStats.allTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4 font-bold">
                          <div className="text-white">{t.attendee_name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">DNI: {t.attendee_dni}</div>
                        </td>
                        <td className="py-3 px-4 truncate max-w-[180px] text-slate-300">
                          {t.event_title}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-dark-800 border border-dark-700 text-[10px] font-bold">
                            {t.tier_name || 'Anticipada'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-dance-coral">
                          {t.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          ${(t.unit_price_paid || t.price || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          {t.status === 'valid' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                              🟢 Válida
                            </span>
                          ) : t.status === 'pending_payment' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/40 animate-pulse">
                              ⏳ En Revisión
                            </span>
                          ) : t.status === 'used' ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-bold text-[10px]">
                              ⚪ Ingresó
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold text-[10px]">
                              Cancelada
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Escáner de Puerta */}
      <TicketScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        staffName={user?.full_name || 'Organizador'}
      />
    </div>
  );
};
