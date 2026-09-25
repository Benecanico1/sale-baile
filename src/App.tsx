import React, { useState, useEffect } from 'react';
import type { EventItem, EventReport } from './types';
import { LocationProvider } from './context/LocationContext';
import { FilterProvider } from './context/FilterContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { FollowingProvider } from './context/FollowingContext';
import { AuthProvider } from './context/AuthContext';
import {
  getLocalEvents,
  saveLocalEvents,
  getLocalReports,
  resolveLocalReport,
  saveLocalReview,
} from './lib/supabase';
import {
  fetchCloudEvents,
  syncCloudEvents,
  updateCloudEventStatus,
  deleteCloudEvent,
  syncChannel,
} from './lib/cloudRequests';
import {
  fetchCloudOrders,
  fetchCloudTickets,
  getLocalOrders,
  getLocalTickets,
  saveLocalOrders,
  saveLocalTickets,
  approveTicketOrder,
} from './lib/tickets';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { registerOrUpdateDevice } from './lib/deviceTracker';

// Componentes
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { LocationPickerModal } from './components/common/LocationPickerModal';
import { AuthModal } from './components/common/AuthModal';
import { GenrePreferencesModal } from './components/common/GenrePreferencesModal';
import { ExploreView } from './components/explore/ExploreView';
import { MapView } from './components/map/MapView';
import { AgendaView } from './components/agenda/AgendaView';
import { EventDetailModal } from './components/event/EventDetailModal';
import { ShareModal } from './components/event/ShareModal';
import { ReviewModal } from './components/feedback/ReviewModal';
import { OrganizerDashboard } from './components/organizer/OrganizerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { FavoritesView } from './components/account/FavoritesView';
import { AccountView } from './components/account/AccountView';
import { BuyTicketModal } from './components/ticket/BuyTicketModal';
import { MyTicketsView } from './components/ticket/MyTicketsView';
import { Footer } from './components/common/Footer';
import { PrivacyPolicyModal } from './components/common/PrivacyPolicyModal';
import { AboutModal } from './components/common/AboutModal';
import { DownloadAppModal } from './components/common/DownloadAppModal';
import { AIAssistantModal } from './components/common/AIAssistantModal';
import { FloatingAIAssistantButton } from './components/common/FloatingAIAssistantButton';
import { OnboardingWelcomeModal } from './components/common/OnboardingWelcomeModal';
import { useAuth } from './context/AuthContext';

const MainAppContent: React.FC = () => {
  const { user, showPreferencesModal, setShowPreferencesModal } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('explore');
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [events, setEvents] = useState<EventItem[]>(() => getLocalEvents());
  const [reports, setReports] = useState<EventReport[]>(() => getLocalReports());
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [buyingEvent, setBuyingEvent] = useState<EventItem | null>(null);
  const [sharingEvent, setSharingEvent] = useState<EventItem | null>(null);
  const [reviewingEvent, setReviewingEvent] = useState<EventItem | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isMapVenueActive, setIsMapVenueActive] = useState(false);
  const [paymentAlert, setPaymentAlert] = useState<{ title: string; message: string; isSuccess: boolean } | null>(null);

  // Detección y aprobación automática al volver de Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment') || params.get('collection_status') || params.get('status');
    const orderId = params.get('order_id') || params.get('external_reference');

    if (paymentStatus === 'success' || paymentStatus === 'approved') {
      if (orderId) {
        approveTicketOrder(orderId).then(() => {
          setPaymentAlert({
            title: '¡Pago Acreditado con Éxito!',
            message: 'Tu pago fue procesado correctamente por Mercado Pago. Tu entrada digital con código QR ya está activa.',
            isSuccess: true,
          });
          setCurrentTab('tickets');
          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#009ee3', '#10b981', '#ff2d55', '#ffb300'],
            });
          } catch (e) {}
        });
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'failure' || paymentStatus === 'rejected') {
      setPaymentAlert({
        title: 'Pago No Completado',
        message: 'La operación en Mercado Pago no pudo completarse. Podés intentar nuevamente cuando lo desees.',
        isSuccess: false,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Registro y conteo de equipos y descargas de la app
  useEffect(() => {
    registerOrUpdateDevice(user?.email);

    const handleAppInstalled = () => {
      registerOrUpdateDevice(user?.email, true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [user?.email]);

  // Comprobar si se abrió con enlace directo ?event=<id> o ?descargar=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    if (eventId) {
      const found = events.find((e) => e.id === eventId);
      if (found) {
        setSelectedEvent(found);
      }
    }
    if (params.get('descargar') || params.get('download') || params.get('apk')) {
      setIsDownloadModalOpen(true);
    }
  }, [events]);

  // Sincronización en la nube periódica y al inicio para que las solicitudes y aprobaciones se mantengan vivas en todos los dispositivos
  useEffect(() => {
    const syncEventsFromCloud = async () => {
      try {
        const [cloudEvts, cloudOrders, cloudTickets] = await Promise.all([
          fetchCloudEvents(),
          fetchCloudOrders(),
          fetchCloudTickets(),
        ]);

        if (cloudOrders && Array.isArray(cloudOrders) && cloudOrders.length > 0) {
          const localO = getLocalOrders();
          const orderMap = new Map<string, any>();
          localO.forEach((o) => orderMap.set(o.id, o));
          cloudOrders.forEach((co) => orderMap.set(co.id, co));
          saveLocalOrders(Array.from(orderMap.values()));
        }

        if (cloudTickets && Array.isArray(cloudTickets) && cloudTickets.length > 0) {
          const localT = getLocalTickets();
          const ticketMap = new Map<string, any>();
          localT.forEach((t) => ticketMap.set(t.id, t));
          cloudTickets.forEach((ct) => ticketMap.set(ct.id, ct));
          saveLocalTickets(Array.from(ticketMap.values()));
        }

        if (cloudEvts && Array.isArray(cloudEvts)) {
          setEvents((prev) => {
            const cloudIds = new Set(cloudEvts.map((c) => c.id));
            const nowTime = Date.now();

            // Preservar borradores o eventos locales creados en los últimos 45 segundos mientras suben
            const localPending = prev.filter((p) => {
              if (cloudIds.has(p.id)) return false;
              const created = new Date(p.created_at || 0).getTime();
              return (nowTime - created) < 45000;
            });

            const merged = [...cloudEvts, ...localPending];
            saveLocalEvents(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Sync cloud events error:', err);
      }
    };

    syncEventsFromCloud();
    const interval = setInterval(syncEventsFromCloud, 4000);

    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_UPDATE') {
        syncEventsFromCloud();
      }
    };

    if (syncChannel) {
      syncChannel.addEventListener('message', handleChannelMessage);
    }

    return () => {
      clearInterval(interval);
      if (syncChannel) {
        syncChannel.removeEventListener('message', handleChannelMessage);
      }
    };
  }, []);

  const handleRefreshAll = async () => {
    const localEvts = getLocalEvents();
    const localReps = getLocalReports();
    setEvents(localEvts);
    setReports(localReps);
    try {
      const [cloudEvts, cloudOrders, cloudTickets] = await Promise.all([
        fetchCloudEvents(),
        fetchCloudOrders(),
        fetchCloudTickets(),
      ]);

      if (cloudOrders && Array.isArray(cloudOrders) && cloudOrders.length > 0) {
        const localO = getLocalOrders();
        const orderMap = new Map<string, any>();
        localO.forEach((o) => orderMap.set(o.id, o));
        cloudOrders.forEach((co) => orderMap.set(co.id, co));
        saveLocalOrders(Array.from(orderMap.values()));
      }

      if (cloudTickets && Array.isArray(cloudTickets) && cloudTickets.length > 0) {
        const localT = getLocalTickets();
        const ticketMap = new Map<string, any>();
        localT.forEach((t) => ticketMap.set(t.id, t));
        cloudTickets.forEach((ct) => ticketMap.set(ct.id, ct));
        saveLocalTickets(Array.from(ticketMap.values()));
      }

      if (cloudEvts && Array.isArray(cloudEvts)) {
        setEvents(cloudEvts);
        saveLocalEvents(cloudEvts);
      }
    } catch (e) {
      console.warn('Refresh error:', e);
    }
  };

  const updateAndPersistEvents = (newEvents: EventItem[]) => {
    setEvents(newEvents);
    saveLocalEvents(newEvents);
    syncCloudEvents(newEvents).catch((err) => console.warn('Cloud events upload error:', err));
  };

  const handleCreateEvent = (eventData: Partial<EventItem>, isDraft: boolean) => {
    const now = new Date().toISOString();
    const isUserAdmin = Boolean(user?.role === 'admin' || (user?.email && user.email === 'jesushidalgo25@gmail.com'));
    const isVerifiedOrg = user?.organizer_status === 'approved' || user?.role === 'organizer';
    const isTeacher = user?.profile_type === 'profesor';

    // Auto-publicación: si es Admin, organizador verificado o profesor de clases, se publica directo sin requerir aprobación
    const autoPublish = isUserAdmin || isVerifiedOrg || isTeacher;
    const initialStatus: EventItem['status'] = isDraft ? 'borrador' : (autoPublish ? 'publicado' : (eventData.status || 'pendiente'));

    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      organizer_id: user?.id || 'org-1',
      title: eventData.title || 'Nuevo Evento de Bachata',
      description: eventData.description || '',
      flyer_url: eventData.flyer_url || '',
      gallery: eventData.gallery || (eventData.flyer_url ? [{ id: `med-${Date.now()}`, type: 'image', url: eventData.flyer_url, thumbnail_url: eventData.flyer_url }] : []),
      category: eventData.category || 'social',
      genre_family: eventData.genre_family || 'salsa-y-bachata',
      subgenres: eventData.subgenres || ['social-salsa-bachata'],
      start_time: eventData.start_time || now,
      end_time: eventData.end_time || now,
      timezone: 'America/Argentina/Buenos_Aires',
      venue_name: eventData.venue_name || '',
      address: eventData.address || '',
      city: eventData.city || 'Buenos Aires',
      province: eventData.province || 'Capital Federal',
      country: 'Argentina',
      latitude: eventData.latitude || -34.5828,
      longitude: eventData.longitude || -58.4326,
      is_free: Boolean(eventData.is_free),
      price: eventData.price,
      advance_ticket_price: eventData.advance_ticket_price,
      advance_sales_end_date: eventData.advance_sales_end_date,
      advance_sales_end_time: eventData.advance_sales_end_time,
      is_recurring_weekly: eventData.is_recurring_weekly,
      admin_resale_price: eventData.admin_resale_price,
      admin_commission_rate: eventData.admin_commission_rate,
      class_days: eventData.class_days,
      class_level: eventData.class_level,
      event_target: eventData.event_target,
      organizer_notes_to_admin: eventData.organizer_notes_to_admin,
      currency: 'ARS',
      tickets_url: eventData.tickets_url,
      advance_tickets_whatsapp: eventData.advance_tickets_whatsapp,
      organizer_name: eventData.organizer_name || user?.full_name || 'Organizador Bachata',
      organizer_whatsapp: eventData.organizer_whatsapp || user?.whatsapp_phone,
      organizer_instagram: eventData.organizer_instagram || user?.instagram_handle,
      rating_average: 5.0,
      rating_count: 0,
      is_featured: Boolean(eventData.is_featured),
      featured_fee_paid: Boolean(eventData.featured_fee_paid),
      status: initialStatus,
      is_cancelled: false,
      created_at: now,
      updated_at: now,
    };

    updateAndPersistEvents([newEvent, ...events]);
  };

  const handleUpdateEvent = (eventId: string, eventData: Partial<EventItem>, isDraft: boolean) => {
    const now = new Date().toISOString();
    const updated = events.map((e) => {
      if (e.id === eventId) {
        return {
          ...e,
          ...eventData,
          status: isDraft ? 'borrador' : 'pendiente',
          updated_at: now,
        } as EventItem;
      }
      return e;
    });
    updateAndPersistEvents(updated);
  };

  const handleCancelEvent = (eventId: string, reason: string) => {
    const now = new Date().toISOString();
    const updated = events.map((e) => {
      if (e.id === eventId) {
        return {
          ...e,
          is_cancelled: true,
          cancellation_notice: reason,
          updated_at: now,
        };
      }
      return e;
    });
    updateAndPersistEvents(updated);
  };

  const handleDeleteEvent = (eventId: string) => {
    const updated = events.filter((e) => e.id !== eventId);
    updateAndPersistEvents(updated);
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(null);
    }
    deleteCloudEvent(eventId).catch((e) => console.warn('Cloud delete error:', e));
  };

  const handleApproveEvent = (eventId: string, makeFeatured: boolean = false) => {
    const now = new Date().toISOString();
    const updated = events.map((e) => {
      if (e.id === eventId) {
        return {
          ...e,
          status: 'publicado' as const,
          is_featured: makeFeatured,
          featured_fee_paid: makeFeatured ? true : e.featured_fee_paid,
          rejection_reason: undefined,
          updated_at: now,
        };
      }
      return e;
    });
    updateAndPersistEvents(updated);
    updateCloudEventStatus(eventId, 'publicado', makeFeatured).catch((e) => console.warn('Cloud approve error:', e));
  };

  const handleToggleFeatured = (eventId: string) => {
    let nextFeatured = false;
    const now = new Date().toISOString();
    const updated = events.map((e) => {
      if (e.id === eventId) {
        nextFeatured = !e.is_featured;
        return {
          ...e,
          is_featured: nextFeatured,
          featured_fee_paid: nextFeatured ? true : e.featured_fee_paid,
          updated_at: now,
        };
      }
      return e;
    });
    updateAndPersistEvents(updated);
    updateCloudEventStatus(eventId, undefined, nextFeatured).catch((e) => console.warn('Cloud toggle featured error:', e));
  };

  const handleRejectEvent = (eventId: string, reason: string) => {
    const now = new Date().toISOString();
    const updated = events.map((e) => {
      if (e.id === eventId) {
        return {
          ...e,
          status: 'rechazado' as const,
          is_featured: false,
          rejection_reason: reason,
          updated_at: now,
        };
      }
      return e;
    });
    updateAndPersistEvents(updated);
    updateCloudEventStatus(eventId, 'rechazado', false, reason).catch((e) => console.warn('Cloud reject error:', e));
  };

  const handleResolveReport = (reportId: string) => {
    resolveLocalReport(reportId);
    setReports(getLocalReports());
  };

  const handleReviewSubmit = (reviewData: any) => {
    const newReview = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    saveLocalReview(newReview);

    // Update the event's rating average and count
    const updatedEvents = events.map((evt) => {
      if (evt.id === reviewData.event_id) {
        const currentCount = evt.rating_count || 0;
        const currentAvg = evt.rating_average || 5.0;
        const newCount = currentCount + 1;
        const newAvg = Number(((currentAvg * currentCount + reviewData.rating) / newCount).toFixed(1));
        return {
          ...evt,
          rating_count: newCount,
          rating_average: newAvg,
        };
      }
      return evt;
    });

    updateAndPersistEvents(updatedEvents);

    if (selectedEvent && selectedEvent.id === reviewData.event_id) {
      const target = updatedEvents.find((e) => e.id === selectedEvent.id);
      if (target) setSelectedEvent(target);
    }
  };

  const handleShareClick = (event: EventItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharingEvent(event);
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans max-w-full overflow-x-hidden">
      {/* Navbar: visible siempre en desktop (md:block) y en móvil en pestañas secundarias */}
      <div className={currentTab === 'explore' ? 'hidden md:block' : 'block'}>
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
          onOpenAboutModal={() => setIsAboutModalOpen(true)}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        />
      </div>

      <main className="flex-1">
        {currentTab === 'explore' && (
          <ExploreView
            events={events}
            onSelectEvent={setSelectedEvent}
            onShareEvent={handleShareClick}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            onNavigateTab={setCurrentTab}
            onOpenAIModal={() => setIsAIModalOpen(true)}
          />
        )}

        {currentTab === 'map' && (
          <MapView
            events={events}
            onSelectEvent={setSelectedEvent}
            isMinimized={!!selectedEvent}
            onActiveVenueChange={setIsMapVenueActive}
          />
        )}

        {currentTab === 'agenda' && (
          <AgendaView
            events={events}
            onSelectEvent={setSelectedEvent}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
          />
        )}

        {currentTab === 'favorites' && (
          <FavoritesView
            events={events}
            onSelectEvent={setSelectedEvent}
            onShareEvent={handleShareClick}
            onGoToExplore={() => setCurrentTab('explore')}
          />
        )}

        {currentTab === 'organizer' && (
          <OrganizerDashboard
            events={events}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onCancelEvent={handleCancelEvent}
            onSelectEventPreview={setSelectedEvent}
            onApproveEvent={handleApproveEvent}
            onToggleFeatured={handleToggleFeatured}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            events={events}
            reports={reports}
            onApproveEvent={handleApproveEvent}
            onRejectEvent={handleRejectEvent}
            onDeleteEvent={handleDeleteEvent}
            onToggleFeatured={handleToggleFeatured}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onResolveReport={handleResolveReport}
            onSelectEventPreview={setSelectedEvent}
            onRefreshAll={handleRefreshAll}
          />
        )}

        {currentTab === 'tickets' && (
          <MyTicketsView onExploreEvents={() => setCurrentTab('explore')} />
        )}

        {currentTab === 'account' && (
          <AccountView
            onNavigateTab={setCurrentTab}
            onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
            onCreateEvent={handleCreateEvent}
          />
        )}
      </main>

      {/* Footer general (visible en todas las vistas excepto mapa que es pantalla completa) */}
      {currentTab !== 'map' && (
        <Footer
          onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
          onOpenAboutModal={() => setIsAboutModalOpen(true)}
        />
      )}

      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      <AuthModal />

      <GenrePreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onSaved={() => setIsWelcomeModalOpen(true)}
      />

      <OnboardingWelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onStartExploring={() => {
          setIsWelcomeModalOpen(false);
          setCurrentTab('explore');
        }}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => {
          setIsDownloadModalOpen(false);
          if (window.location.search.includes('descargar') || window.location.search.includes('download') || window.location.search.includes('apk')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
      />

      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onNavigateTab={(tab) => {
          setIsAIModalOpen(false);
          setCurrentTab(tab);
        }}
      />

      {/* Botón flotante inteligente con notita musical con ? para Asistente IA (visible en todas las páginas, salvo cuando se inspecciona un flyer en el mapa) */}
      <FloatingAIAssistantButton
        onClick={() => setIsAIModalOpen(true)}
        isOpen={isAIModalOpen}
        hidden={currentTab === 'map' && isMapVenueActive}
      />

      <EventDetailModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => {
          setSelectedEvent(null);
          if (window.location.search.includes('event=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
        onOpenReviewModal={(evt) => setReviewingEvent(evt)}
        onOpenBuyTicketModal={(evt) => setBuyingEvent(evt)}
      />

      <BuyTicketModal
        event={buyingEvent}
        isOpen={Boolean(buyingEvent)}
        onClose={() => setBuyingEvent(null)}
        onGoToMyTickets={() => {
          setBuyingEvent(null);
          setSelectedEvent(null);
          setCurrentTab('tickets');
        }}
      />

      <ReviewModal
        isOpen={Boolean(reviewingEvent)}
        event={reviewingEvent}
        onClose={() => setReviewingEvent(null)}
        onSubmitReview={handleReviewSubmit}
      />

      <ShareModal
        event={sharingEvent}
        isOpen={Boolean(sharingEvent)}
        onClose={() => setSharingEvent(null)}
      />

      {/* Modal de Notificación de Pago de Mercado Pago */}
      {paymentAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-[#0e111a] border border-white/15 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
              paymentAlert.isSuccess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {paymentAlert.isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{paymentAlert.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{paymentAlert.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setPaymentAlert(null)}
              className={`w-full py-3 px-4 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer ${
                paymentAlert.isSuccess
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95'
                  : 'bg-dark-800 hover:bg-dark-700 border border-white/10'
              }`}
            >
              {paymentAlert.isSuccess ? 'Ver Mis Entradas' : 'Entendido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <FilterProvider>
          <FavoritesProvider>
            <FollowingProvider>
              <MainAppContent />
            </FollowingProvider>
          </FavoritesProvider>
        </FilterProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
