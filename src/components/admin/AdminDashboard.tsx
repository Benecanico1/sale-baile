import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { EventItem, EventReport, TicketItem, TicketOrder, UserProfile } from '../../types';
import { formatEventSchedule } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  CheckCircle,
  XCircle,
  Flag,
  Calendar,
  Eye,
  Check,
  Clock,
  MapPin,
  Users,
  Building,
  UserCheck,
  CreditCard,
  MessageCircle,
  DollarSign,
  Plus,
  X,
  RefreshCw,
  Star,
  Ticket,
  AlertTriangle,
  Bot,
  Mail,
  Copy,
  Download,
  FileText,
  CheckCheck,
  Smartphone,
  Laptop,
  Globe,
  DownloadCloud,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getLocalTickets,
  getLocalOrders,
  saveLocalTickets,
  saveLocalOrders,
  fetchCloudTickets,
  fetchCloudOrders,
  approveTicketOrder,
  rejectTicketOrder,
  getAdminTicketStats,
} from '../../lib/tickets';
import {
  getLocalDevices,
  fetchCloudDevices,
  getDeviceStats,
  type DeviceRecord,
} from '../../lib/deviceTracker';
import { syncChannel } from '../../lib/cloudRequests';
import { ManualTicketSaleModal } from './ManualTicketSaleModal';
import { AdminEditEventModal } from './AdminEditEventModal';
import { EventForm } from '../organizer/EventForm';
import { EditProfileModal } from '../account/EditProfileModal';
import { BotsPanel } from './BotsPanel';
import { OutreachCampaignPanel } from './OutreachCampaignPanel';

interface AdminDashboardProps {
  events: EventItem[];
  reports: EventReport[];
  onApproveEvent: (eventId: string, makeFeatured?: boolean) => void;
  onRejectEvent: (eventId: string, reason: string) => void;
  onToggleFeatured: (eventId: string) => void;
  onCreateEvent?: (eventData: Partial<EventItem>, isDraft: boolean) => void;
  onUpdateEvent?: (eventId: string, eventData: Partial<EventItem>, isDraft: boolean) => void;
  onResolveReport: (reportId: string) => void;
  onSelectEventPreview: (event: EventItem) => void;
  onDeleteEvent?: (eventId: string) => void;
  onRefreshAll?: () => Promise<void> | void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events,
  reports,
  onApproveEvent,
  onRejectEvent,
  onDeleteEvent,
  onToggleFeatured,
  onCreateEvent,
  onUpdateEvent,
  onResolveReport,
  onSelectEventPreview,
  onRefreshAll,
}) => {
  const { usersList, approveOrganizer, rejectOrganizer, registerOrganizerDirectly, setUserRole, updateUserById, deleteUser, syncFromCloud } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'reports' | 'all' | 'tickets' | 'devices' | 'bots' | 'outreach'>('pending');
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [eventFilter, setEventFilter] = useState<'all' | 'featured' | 'standard'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'installed' | 'android' | 'ios' | 'desktop'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('La imagen o el texto no cumplen con las pautas de calidad.');
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  const [isManualSaleModalOpen, setIsManualSaleModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [editingPendingEvent, setEditingPendingEvent] = useState<EventItem | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgWhatsapp, setNewOrgWhatsapp] = useState('');
  const [newOrgInsta, setNewOrgInsta] = useState('');
  const [showEmailDirectory, setShowEmailDirectory] = useState(false);
  const [isDevicesHistoryOpen, setIsDevicesHistoryOpen] = useState(false);

  // Estado reactivo y sincronizado de órdenes, tickets y equipos registrados
  const [adminTickets, setAdminTickets] = useState<TicketItem[]>(() => getLocalTickets());
  const [adminOrders, setAdminOrders] = useState<TicketOrder[]>(() => getLocalOrders());
  const [adminDevices, setAdminDevices] = useState<DeviceRecord[]>(() => getLocalDevices());

  const loadAdminTicketData = async () => {
    const localT = getLocalTickets();
    const localO = getLocalOrders();
    const localD = getLocalDevices();
    setAdminTickets(localT);
    setAdminOrders(localO);
    setAdminDevices(localD);

    try {
      const [cloudO, cloudT, cloudD] = await Promise.all([
        fetchCloudOrders(),
        fetchCloudTickets(),
        fetchCloudDevices(),
      ]);
      if (cloudO && cloudO.length > 0) {
        const orderMap = new Map<string, TicketOrder>();
        localO.forEach(o => orderMap.set(o.id, o));
        cloudO.forEach(o => orderMap.set(o.id, o));
        const mergedO = Array.from(orderMap.values());
        setAdminOrders(mergedO);
        saveLocalOrders(mergedO);
      }
      if (cloudT && cloudT.length > 0) {
        const ticketMap = new Map<string, TicketItem>();
        localT.forEach(t => ticketMap.set(t.id, t));
        cloudT.forEach(t => ticketMap.set(t.id, t));
        const mergedT = Array.from(ticketMap.values());
        setAdminTickets(mergedT);
        saveLocalTickets(mergedT);
      }
      if (cloudD && cloudD.length > 0) {
        setAdminDevices(cloudD);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadAdminTicketData();

    const channel = syncChannel;
    if (channel) {
      const handleMessage = () => {
        loadAdminTicketData();
      };
      channel.addEventListener('message', handleMessage);
      return () => channel.removeEventListener('message', handleMessage);
    }
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      await Promise.all([syncFromCloud(), loadAdminTicketData()]);
      if (onRefreshAll) {
        await onRefreshAll();
      }
      setSyncNotice('✅ ¡Panel actualizado! Se sincronizaron todas las solicitudes pendientes, órdenes de pago y eventos en tiempo real.');
    } catch (e) {
      setSyncNotice('✅ Solicitudes y órdenes actualizadas.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  // Cálculo de métricas sobre el estado reactivo actual
  const ticketStats = getAdminTicketStats(adminTickets, adminOrders);
  const deviceStats = getDeviceStats(adminDevices);

  // Estados y lógica para exportador de correos de usuarios
  const [emailExportFormat, setEmailExportFormat] = useState<'lines' | 'comma' | 'detailed'>('lines');
  const [emailSegmentFilter, setEmailSegmentFilter] = useState<'all' | 'users' | 'organizers' | 'admins'>('all');
  const [copiedEmails, setCopiedEmails] = useState(false);

  // Recopilar todos los correos únicos
  const allUserEmailsMap = new Map<string, { email: string; name: string; role: string; rawRole: 'admin' | 'organizer' | 'user'; isBuyer: boolean; source: string }>();

  // 1. Usuarios registrados
  usersList.forEach((u) => {
    if (u.email && u.email.trim()) {
      const emailNorm = u.email.trim().toLowerCase();
      const rawRole = u.role === 'admin' ? 'admin' : u.role === 'organizer' ? 'organizer' : 'user';
      allUserEmailsMap.set(emailNorm, {
        email: emailNorm,
        name: u.full_name || (rawRole === 'admin' ? 'Administrador' : rawRole === 'organizer' ? 'Organizador' : 'Usuario'),
        role: rawRole === 'admin' ? 'Administrador' : rawRole === 'organizer' ? 'Organizador' : 'Usuario',
        rawRole,
        isBuyer: false,
        source: 'Registro en App',
      });
    }
  });

  // 2. Compradores de entradas
  adminOrders.forEach((o) => {
    if (o.buyer_email && o.buyer_email.trim()) {
      const emailNorm = o.buyer_email.trim().toLowerCase();
      const existing = allUserEmailsMap.get(emailNorm);
      if (existing) {
        existing.isBuyer = true;
      } else {
        allUserEmailsMap.set(emailNorm, {
          email: emailNorm,
          name: o.buyer_name || 'Comprador de Entradas',
          role: 'Comprador de Entradas',
          rawRole: 'user',
          isBuyer: true,
          source: 'Venta de Tickets',
        });
      }
    }
  });

  const allExtractedEmails = Array.from(allUserEmailsMap.values());

  const filteredEmails = allExtractedEmails.filter((u) => {
    if (emailSegmentFilter === 'organizers') return u.rawRole === 'organizer';
    if (emailSegmentFilter === 'admins') return u.rawRole === 'admin';
    if (emailSegmentFilter === 'users') return u.rawRole === 'user';
    return true;
  });

  const formattedEmailText = React.useMemo(() => {
    if (emailExportFormat === 'lines') {
      return filteredEmails.map((u) => u.email).join('\n');
    }
    if (emailExportFormat === 'comma') {
      return filteredEmails.map((u) => u.email).join(', ');
    }
    return filteredEmails
      .map((u, i) => `${i + 1}. ${u.name} <${u.email}> - [${u.role}] (${u.source})`)
      .join('\n');
  }, [filteredEmails, emailExportFormat]);

  const handleCopyEmails = async () => {
    if (!formattedEmailText) return;
    try {
      await navigator.clipboard.writeText(formattedEmailText);
      setCopiedEmails(true);
      setTimeout(() => setCopiedEmails(false), 3000);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.8 } });
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  const handleDownloadTxt = () => {
    if (!formattedEmailText) return;
    const roleSlug = emailSegmentFilter === 'all' ? 'todos' : emailSegmentFilter === 'organizers' ? 'organizadores' : emailSegmentFilter === 'admins' ? 'administradores' : 'usuarios';
    const blob = new Blob([formattedEmailText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `correos_${roleSlug}_salebaile_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  };

  const pendingEvents = events.filter((e) => e.status === 'pendiente');
  const featuredEvents = events.filter((e) => e.is_featured && e.status === 'publicado');
  const activeReports = reports.filter((r) => !r.is_resolved);
  const pendingOrganizers = usersList.filter((u) => u.organizer_status === 'pending');
  const approvedOrganizers = usersList.filter((u) => u.role === 'organizer');
  const totalPendingActions = pendingOrganizers.length + pendingEvents.length + ticketStats.pendingOrdersCount;

  const handleApprove = (id: string, makeFeatured: boolean = false) => {
    onApproveEvent(id, makeFeatured);
    try {
      confetti({
        particleCount: makeFeatured ? 100 : 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: makeFeatured
          ? ['#f59e0b', '#fbbf24', '#f43f5e', '#10b981']
          : ['#f43f5e', '#fb923c', '#f59e0b', '#10b981'],
      });
    } catch (e) {}
  };

  const handleApproveOrganizer = (userId: string) => {
    approveOrganizer(userId);
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#fb923c', '#f43f5e'],
      });
    } catch (e) {}
  };

  const handleConfirmReject = (id: string) => {
    onRejectEvent(id, rejectReason);
    setRejectingId(null);
  };

  const handleApproveOrder = async (orderId: string) => {
    await approveTicketOrder(orderId);
    try {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b'],
      });
    } catch (e) {}
    await loadAdminTicketData();
  };

  const handleRejectOrder = async (orderId: string) => {
    await rejectTicketOrder(orderId);
    await loadAdminTicketData();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-28 space-y-5">
      {/* Header minimalista */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
              <Shield className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-zinc-100">Centro de Control</h1>
            {totalPendingActions > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-400 text-[10px] font-medium border border-zinc-700/40">
                {totalPendingActions} pendientes
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 ml-10">Gestión de organizadores, eventos, entradas y pagos</p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2 flex-wrap">
          {onCreateEvent && (
            <button
              onClick={() => setIsCreateEventModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 text-xs font-medium transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Publicar Evento
            </button>
          )}
          <button
            onClick={() => setIsManualSaleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 text-xs font-medium transition-all cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Cargar Venta
          </button>
          <button
            onClick={() => setIsAddOrgModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Habilitar Org.
          </button>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* KPIs minimalistas */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Entradas', value: ticketStats.totalTicketsSold, sub: `$${ticketStats.totalGrossRevenue.toLocaleString('es-AR')}`, icon: <Ticket className="w-3.5 h-3.5" />, active: activeTab === 'tickets', onClick: () => setActiveTab('tickets') },
          { label: 'Pagos Rev.', value: ticketStats.pendingOrdersCount, sub: `$${ticketStats.pendingGrossAmount.toLocaleString('es-AR')}`, icon: <CreditCard className="w-3.5 h-3.5" />, active: activeTab === 'tickets', alert: ticketStats.pendingOrdersCount > 0, onClick: () => setActiveTab('tickets') },
          { label: 'Comisiones', value: `$${ticketStats.totalPlatformCommissions.toLocaleString('es-AR')}`, sub: 'Ganancia neta', icon: <DollarSign className="w-3.5 h-3.5" />, active: false, onClick: () => setActiveTab('tickets') },
          { label: 'Evt. Pend.', value: pendingEvents.length, sub: 'Por autorizar', icon: <Calendar className="w-3.5 h-3.5" />, active: activeTab === 'pending', alert: pendingEvents.length > 0, onClick: () => setActiveTab('pending') },
          { label: 'Org. Pend.', value: pendingOrganizers.length, sub: 'Solicitudes', icon: <Users className="w-3.5 h-3.5" />, active: activeTab === 'users', alert: pendingOrganizers.length > 0, onClick: () => { setActiveTab('users'); setUserFilter('pending'); } },
          { label: 'Destacados', value: featuredEvents.length, sub: 'Portada', icon: <Star className="w-3.5 h-3.5" />, active: activeTab === 'all', onClick: () => { setActiveTab('all'); setEventFilter('featured'); } },
        ].map((kpi, i) => (
          <button
            key={i}
            onClick={kpi.onClick}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              kpi.active
                ? 'bg-zinc-800/60 border-zinc-600/60'
                : kpi.alert
                ? 'bg-amber-950/20 border-amber-700/30'
                : 'bg-zinc-850/40 border-zinc-800/40 hover:border-zinc-700/50'
            }`}
          >
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1">
              {kpi.icon}
              <span>{kpi.label}</span>
            </div>
            <div className={`text-lg font-bold ${kpi.alert ? 'text-amber-400' : 'text-zinc-200'}`}>{kpi.value}</div>
            <div className="text-[9px] text-zinc-600 mt-0.5 truncate">{kpi.sub}</div>
          </button>
        ))}
      </div>

      {/* Notificación de sync — discreta */}
      {syncNotice && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[11px] text-zinc-400">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Alerta de tareas pendientes — minimalista */}
      {totalPendingActions > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-amber-950/20 border border-amber-700/30">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500/60 shrink-0" />
            <div className="text-[11px] text-zinc-400">
              <span className="font-medium text-zinc-200">{totalPendingActions} tareas pendientes</span>
              <span className="text-zinc-500 ml-2">
                {ticketStats.pendingOrdersCount > 0 && `${ticketStats.pendingOrdersCount} pagos · `}
                {pendingEvents.length > 0 && `${pendingEvents.length} eventos · `}
                {pendingOrganizers.length > 0 && `${pendingOrganizers.length} organizadores`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {ticketStats.pendingOrdersCount > 0 && (
              <button
                onClick={() => setActiveTab('tickets')}
                className="px-2.5 py-1 rounded-md bg-zinc-800/60 text-zinc-300 text-[11px] font-medium hover:bg-zinc-700/50 transition-all cursor-pointer"
              >
                Verificar pagos
              </button>
            )}
            {(pendingOrganizers.length > 0 || pendingEvents.length > 0) && (
              <button
                onClick={() => setActiveTab('pending')}
                className="px-2.5 py-1 rounded-md bg-zinc-800/60 text-zinc-300 text-[11px] font-medium hover:bg-zinc-700/50 transition-all cursor-pointer"
              >
                Revisar solicitudes
              </button>
            )}
          </div>
        </div>
      )}

      {/* Menú de navegación — tabs estilo underline */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-800/50 pb-px -mb-px flex-wrap">
        {([
          { id: 'pending' as const, label: 'Solicitudes', icon: <Clock className="w-3.5 h-3.5" />, count: pendingOrganizers.length + pendingEvents.length },
          { id: 'tickets' as const, label: 'Ventas', icon: <DollarSign className="w-3.5 h-3.5" />, count: ticketStats.pendingOrdersCount > 0 ? ticketStats.pendingOrdersCount : undefined },
          { id: 'devices' as const, label: 'Equipos', icon: <Smartphone className="w-3.5 h-3.5" />, count: undefined },
          { id: 'users' as const, label: 'Organizadores', icon: <Users className="w-3.5 h-3.5" />, count: usersList.length },
          { id: 'all' as const, label: 'Cartelera', icon: <Calendar className="w-3.5 h-3.5" />, count: events.length },
          { id: 'reports' as const, label: 'Denuncias', icon: <Flag className="w-3.5 h-3.5" />, count: activeReports.length > 0 ? activeReports.length : undefined },
          { id: 'bots' as const, label: 'Bots IA', icon: <Bot className="w-3.5 h-3.5" />, count: 10 },
          { id: 'outreach' as const, label: 'Campañas', icon: <MessageCircle className="w-3.5 h-3.5" />, count: undefined },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'users') setUserFilter('all');
              if (tab.id === 'all') setEventFilter('all');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-zinc-300 text-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                activeTab === tab.id ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800/60 text-zinc-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Solicitudes Pendientes */}
      {activeTab === 'pending' && (
        <div className="space-y-5">
          {/* Sub-Sección 1: Solicitudes de Alta de Organizadores */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-semibold text-zinc-200">
                  Solicitudes de Alta como Organizador
                </h3>
                <span className="text-[10px] text-zinc-600">({pendingOrganizers.length})</span>
              </div>
              <button
                onClick={() => setIsAddOrgModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 hover:bg-zinc-700/40 text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Habilitar Organizador Manualmente</span>
              </button>
            </div>

            {pendingOrganizers.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5">
                {pendingOrganizers.map((u) => (
                  <div
                    key={u.id}
                    className="bg-zinc-900/50 border border-zinc-800/40 hover:border-zinc-700/50 rounded-lg p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-700/40 shrink-0"
                      />
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-zinc-100">{u.full_name}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300/90 border border-amber-500/20">
                            Solicitud de Alta
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono">{u.email}</p>
                        {u.organizer_request_notes && (
                          <p className="text-xs text-zinc-400 bg-zinc-850/60 p-2.5 rounded-lg border border-zinc-800/40 mt-1">
                            <strong className="text-zinc-300">Propuesta:</strong> "{u.organizer_request_notes}"
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
                          {u.whatsapp_phone && (
                            <a
                              href={`https://wa.me/${u.whatsapp_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${u.full_name}, te escribo desde la administración de Sale Baile sobre tu solicitud de organizador.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300/90 font-medium text-xs border border-emerald-500/20 flex items-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp: {u.whatsapp_phone}</span>
                            </a>
                          )}
                          {u.instagram_handle && (
                            <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-300/90 font-medium text-xs border border-pink-500/20">
                              {u.instagram_handle}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-600">
                          Fecha de solicitud: {u.organizer_request_date ? new Date(u.organizer_request_date).toLocaleString('es-AR') : 'Reciente'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto flex-wrap">
                      <button
                        onClick={() => handleApproveOrganizer(u.id)}
                        className="flex-1 md:flex-initial py-2 px-3 bg-zinc-700/50 hover:bg-emerald-700/40 text-emerald-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Aprobar</span>
                      </button>
                      <button
                        onClick={() => rejectOrganizer(u.id)}
                        className="py-2 px-3 bg-zinc-800/40 hover:bg-rose-900/40 text-rose-400 text-xs font-medium rounded-lg border border-zinc-700/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`¿Estás seguro de eliminar la solicitud / registro de ${u.full_name} (${u.email})?`)) {
                            await deleteUser(u.id || u.email);
                          }
                        }}
                        className="py-2 px-3 bg-zinc-800/40 hover:bg-rose-900/40 text-rose-400 text-xs font-medium rounded-lg border border-zinc-700/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-lg text-center text-xs text-zinc-500">
                No hay solicitudes pendientes de organizadores en este momento.
              </div>
            )}
          </div>

          {/* Sub-Sección 2: Solicitudes de Publicación de Eventos / Flyers */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/50">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-semibold text-zinc-200">
                Solicitudes de Publicación de Eventos
              </h3>
              <span className="text-[10px] text-zinc-600">({pendingEvents.length})</span>
            </div>

            {pendingEvents.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5">
                {pendingEvents.map((evt) => {
                  const sched = formatEventSchedule(evt.start_time, evt.end_time);
                  const advPrice = evt.advance_ticket_price || evt.price || 0;
                  const resalePrice = evt.admin_resale_price || advPrice;
                  const profitPerTicket = Math.max(0, advPrice - resalePrice);
                  const profitPct = advPrice > 0 ? ((profitPerTicket / advPrice) * 100).toFixed(0) : '0';

                  return (
                    <div
                      key={evt.id}
                      className="bg-zinc-900/50 border border-zinc-800/40 hover:border-zinc-700/50 rounded-lg p-3.5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row gap-3.5 items-start min-w-0 flex-1">
                        <div className="w-16 sm:w-20 aspect-[3/4] rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-zinc-800/40">
                          <img src={evt.flyer_url} alt="" className="w-full h-full object-cover" />
                        </div>

                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300/90 border border-amber-500/20">
                              En Revisión
                            </span>
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                              {evt.category}
                            </span>
                          </div>

                          <h3 className="text-sm font-semibold text-zinc-100 leading-tight">{evt.title}</h3>

                          <div className="text-xs text-zinc-400 flex items-center gap-2.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-600" />
                              {sched.dateLabel} ({sched.timeRange})
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-600" />
                              {evt.venue_name} ({evt.city})
                            </span>
                          </div>

                          {/* CUADRO DEL ACUERDO COMERCIAL Y REVENTA PARA EL ADMIN */}
                          {!evt.is_free && (
                            <div className="p-2.5 rounded-lg bg-zinc-850/60 border border-zinc-800/40 space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <DollarSign className="w-3 h-3 text-zinc-500" />
                                  Propuesta Comercial de Reventa
                                </span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300/90 text-[10px] font-medium border border-emerald-500/20">
                                  +${profitPerTicket.toLocaleString('es-AR')} ({profitPct}%)
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/40">
                                  <span className="text-zinc-600 text-[10px] block">Público (Puerta / Anticipada)</span>
                                  <strong className="text-zinc-200">${advPrice.toLocaleString('es-AR')} ARS</strong>
                                </div>
                                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/40">
                                  <span className="text-zinc-600 text-[10px] block">Costo Reventa Admin</span>
                                  <strong className="text-amber-300/80">${resalePrice.toLocaleString('es-AR')} ARS</strong>
                                </div>
                                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/40 col-span-2 sm:col-span-1">
                                  <span className="text-zinc-600 text-[10px] block">Ganancia Neta Admin</span>
                                  <strong className="text-emerald-300/90">+${profitPerTicket.toLocaleString('es-AR')} / ticket</strong>
                                </div>
                              </div>

                              {evt.organizer_notes_to_admin && (
                                <p className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/40">
                                  <strong className="text-zinc-300">Mensaje del Organizador:</strong> {evt.organizer_notes_to_admin}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-zinc-400 flex items-center justify-between flex-wrap gap-2 pt-0.5">
                            <div>
                              Organizador: <strong className="text-zinc-300">{evt.organizer_name}</strong>
                            </div>

                            {evt.organizer_whatsapp && (
                              <a
                                href={`https://wa.me/${evt.organizer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${evt.organizer_name}, te escribo desde la Administración de Sale Baile sobre tu solicitud para "${evt.title}".`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300/90 font-medium text-xs border border-emerald-500/20 flex items-center gap-1.5 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col gap-1.5 w-full md:w-auto shrink-0">
                        {/* Editar antes de Aprobar */}
                        <button
                          onClick={() => setEditingPendingEvent(evt)}
                          className="py-2 px-3 bg-zinc-800/60 border border-zinc-700/40 hover:bg-zinc-700/40 text-zinc-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Editar flyer, precios, comisión y detalles antes de publicar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        {/* Aprobar Normal */}
                        <button
                          onClick={() => handleApprove(evt.id, false)}
                          className="py-2 px-3 bg-zinc-700/50 hover:bg-emerald-700/40 text-emerald-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Publicar en la lista estándar de eventos"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Aprobar (Cartelera)</span>
                        </button>

                        {/* Aprobar + Destacar */}
                        <button
                          onClick={() => handleApprove(evt.id, true)}
                          className="py-2 px-3 bg-zinc-700/50 hover:bg-amber-700/40 text-amber-300 text-xs font-medium rounded-lg border border-zinc-700/40 hover:border-amber-600/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Publicar y ubicar en la cabecera de Destacados (Hero Carousel)"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Aprobar + Destacar</span>
                        </button>

                        <button
                          onClick={() => onSelectEventPreview(evt)}
                          className="py-2 px-3 bg-zinc-800/40 border border-zinc-700/40 hover:bg-zinc-700/40 text-zinc-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Detalle
                        </button>

                        <button
                          onClick={() => setRejectingId(evt.id)}
                          className="py-2 px-3 bg-zinc-800/40 border border-zinc-700/40 hover:bg-rose-900/40 text-rose-400 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rechazar
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de ELIMINAR definitivamente el flyer "${evt.title}"?`)) {
                              if (onDeleteEvent) {
                                onDeleteEvent(evt.id);
                              }
                            }
                          }}
                          className="py-2 px-3 bg-zinc-800/40 border border-zinc-700/40 hover:bg-rose-900/40 text-rose-400 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Borrar flyer definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>

                      {rejectingId === evt.id && (
                        <div className="w-full mt-2 p-3 bg-zinc-900/80 border border-zinc-700/50 rounded-lg space-y-2">
                          <label className="block text-[11px] font-medium text-zinc-300">
                            Motivo del rechazo (se notificará al organizador):
                          </label>
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700/40 rounded-lg text-xs text-zinc-200 focus:border-zinc-600 outline-none"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => setRejectingId(null)}
                              className="px-2.5 py-1.5 bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 text-xs rounded-lg hover:bg-zinc-700/40 transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleConfirmReject(evt.id)}
                              className="px-3 py-1.5 bg-rose-900/50 hover:bg-rose-800/60 border border-rose-700/40 text-rose-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              Confirmar Rechazo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-lg text-center text-xs text-zinc-500">
                No hay eventos pendientes de revisión en este momento.
              </div>
            )}
          </div>

          {/* Sub-Sección 3: Pagos de Entradas Pendientes de Verificación */}
            {ticketStats.pendingOrders.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-sm font-semibold text-zinc-200">
                      Pagos de Entradas Pendientes
                    </h3>
                    <span className="text-[10px] text-zinc-600">({ticketStats.pendingOrders.length})</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 text-[11px] font-medium">
                    Total: ${ticketStats.pendingGrossAmount.toLocaleString('es-AR')} ARS
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {ticketStats.pendingOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-zinc-900/50 border border-zinc-800/40 hover:border-zinc-700/50 rounded-lg p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800/60 text-zinc-300 border border-zinc-700/40">
                            Orden {ord.id}
                          </span>
                          <span className="text-xs text-zinc-400 truncate">
                            {ord.event_title}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs">
                          <div className="text-zinc-400">
                            Comprador: <strong className="text-zinc-200">{ord.buyer_name}</strong> (DNI: <strong className="text-zinc-300 font-mono">{ord.buyer_dni}</strong>)
                          </div>
                          <div className="text-emerald-300/90 font-medium text-sm">
                            ${(ord.total_amount_paid || ord.total_amount || 0).toLocaleString('es-AR')} ARS ({ord.quantity} {ord.quantity === 1 ? 'pase' : 'pases'})
                          </div>
                        </div>

                        {ord.payment_reference && (
                          <div className="p-2 rounded-lg bg-zinc-850/60 border border-zinc-800/40 text-zinc-300 text-xs font-mono w-fit">
                            <span className="text-zinc-600">Ref:</span> <strong className="text-zinc-200">{ord.payment_reference}</strong>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0 flex-wrap">
                        {ord.buyer_whatsapp && (
                          <button
                            onClick={() => {
                              const text = `Hola ${ord.buyer_name}! Nos comunicamos de Sale Baile respecto a tu compra de entrada para "${ord.event_title}" (Orden ${ord.id}).`;
                              window.open(`https://wa.me/${ord.buyer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300/90 border border-emerald-500/20 cursor-pointer transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleApproveOrder(ord.id)}
                          className="flex-1 md:flex-initial py-2 px-3 bg-zinc-700/50 hover:bg-emerald-700/40 text-emerald-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprobar Pago</span>
                        </button>
                        <button
                          onClick={() => handleRejectOrder(ord.id)}
                          className="py-2 px-3 bg-zinc-800/40 hover:bg-rose-900/40 text-rose-400 text-xs font-medium rounded-lg border border-zinc-700/40 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          title="Rechazar pago"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Tab: Gestión de Organizadores & Usuarios */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Banner de Control y Monetización Futura */}
          <div className="bg-gradient-to-r from-dance-coral/15 via-[#121622] to-dance-crimson/15 border border-dance-coral/30 rounded-3xl p-5 shadow-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-dance-coral/20 border border-dance-coral/40 flex items-center justify-center text-dance-coral shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                Control de Permisos y Futura Monetización
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Los usuarios comunes solo pueden explorar y agendar eventos. Únicamente los usuarios autorizados como <strong className="text-dance-coral font-bold">Organizadores</strong> por la administración tienen habilitado el botón y formulario de publicación. Próximamente podrás activar cobros por evento o planes mensuales.
              </p>
            </div>
          </div>

          {/* Sub-filtros de Usuarios y Organizadores */}
          <div className="flex items-center gap-2 flex-wrap pb-1">
            <button
              onClick={() => setUserFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                userFilter === 'all'
                  ? 'bg-dance-coral text-white shadow-md'
                  : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-700'
              }`}
            >
              Todos los Usuarios ({usersList.length})
            </button>
            <button
              onClick={() => setUserFilter('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                userFilter === 'pending'
                  ? 'bg-amber-500 text-dark-950 shadow-md font-black'
                  : 'bg-dark-850 text-amber-400 hover:text-amber-300 border border-dark-700'
              }`}
            >
              <span>🔥 Solicitudes Pendientes ({pendingOrganizers.length})</span>
            </button>
            <button
              onClick={() => setUserFilter('approved')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                userFilter === 'approved'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-dark-850 text-emerald-400 hover:text-emerald-300 border border-dark-700'
              }`}
            >
              <span>✅ Organizadores Habilitados ({approvedOrganizers.length})</span>
            </button>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Sincronizar solicitudes en vivo desde la nube"
              className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-dance-coral ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Actualizar en Vivo'}</span>
            </button>
          </div>

          {/* Sección 1: Solicitudes Pendientes de Aprobación */}
          {(userFilter === 'all' || userFilter === 'pending') && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  <span>Solicitudes Pendientes para ser Organizador ({pendingOrganizers.length})</span>
                </h3>
                <button
                  onClick={() => setIsAddOrgModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-dance-coral hover:bg-dance-coral/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md self-start sm:self-auto cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Habilitar Organizador Manualmente</span>
                </button>
              </div>

            {/* Modal para Habilitar Organizador Manualmente */}
            {isAddOrgModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                <div className="fixed inset-0" onClick={() => setIsAddOrgModalOpen(false)} />
                <div className="relative w-full max-w-md bg-[#0e111a] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-dance-coral" />
                      Habilitar Nuevo Organizador
                    </h3>
                    <button
                      onClick={() => setIsAddOrgModalOpen(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300">
                    Registra o habilita a un productor que se comunicó contigo directamente por WhatsApp o Instagram para que pueda publicar flyers.
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newOrgName.trim() || !newOrgEmail.trim()) return;
                      registerOrganizerDirectly({
                        full_name: newOrgName,
                        email: newOrgEmail,
                        whatsapp: newOrgWhatsapp,
                        instagram: newOrgInsta,
                      });
                      setIsAddOrgModalOpen(false);
                      setNewOrgName('');
                      setNewOrgEmail('');
                      setNewOrgWhatsapp('');
                      setNewOrgInsta('');
                      try {
                        confetti({
                          particleCount: 70,
                          spread: 70,
                          origin: { y: 0.6 },
                          colors: ['#10b981', '#fb923c', '#f43f5e'],
                        });
                      } catch (err) {}
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Nombre / Productora *
                      </label>
                      <input
                        type="text"
                        required
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="Ej: Bachata Palermo"
                        className="w-full px-3 py-2 bg-[#151a27] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Email del Organizador *
                      </label>
                      <input
                        type="text"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        required
                        value={newOrgEmail}
                        onChange={(e) => setNewOrgEmail(e.target.value)}
                        onBlur={() => {
                          if (newOrgEmail.trim() && !newOrgEmail.includes('@')) {
                            setNewOrgEmail(`${newOrgEmail.trim().replace(/\s+/g, '')}@gmail.com`);
                          } else if (newOrgEmail.startsWith('@') && !newOrgEmail.slice(1).includes('@')) {
                            setNewOrgEmail(`${newOrgEmail.replace(/^@+/, '').trim().replace(/\s+/g, '')}@gmail.com`);
                          }
                        }}
                        placeholder="organizador@gmail.com"
                        className="w-full px-3 py-2 bg-[#151a27] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          WhatsApp
                        </label>
                        <input
                          type="text"
                          value={newOrgWhatsapp}
                          onChange={(e) => setNewOrgWhatsapp(e.target.value)}
                          placeholder="+54911..."
                          className="w-full px-3 py-2 bg-[#151a27] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Instagram (@)
                        </label>
                        <input
                          type="text"
                          value={newOrgInsta}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val.trim() && !val.trim().startsWith('@') && !val.includes('instagram.com/')) {
                              val = `@${val.trim()}`;
                            }
                            setNewOrgInsta(val);
                          }}
                          placeholder="@productora"
                          className="w-full px-3 py-2 bg-[#151a27] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddOrgModalOpen(false)}
                        className="flex-1 py-2 px-3 bg-[#151a27] hover:bg-[#1f2638] text-slate-300 text-xs font-semibold rounded-xl border border-white/10 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
                      >
                        Habilitar Organizador
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {pendingOrganizers.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {pendingOrganizers.map((u) => (
                  <div
                    key={u.id}
                    className="bg-dark-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{u.full_name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SOLICITANTE
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{u.email}</p>
                        {u.organizer_request_notes && (
                          <p className="text-xs text-slate-200 bg-dark-850 p-2 rounded-xl border border-dark-750 mt-1">
                            "{u.organizer_request_notes}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
                          {u.whatsapp_phone && (
                            <a
                              href={`https://wa.me/${u.whatsapp_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${u.full_name}, te escribo desde la administración de Sale Baile sobre tu solicitud de organizador.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30 flex items-center gap-1 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>{u.whatsapp_phone}</span>
                            </a>
                          )}
                          {u.instagram_handle && (
                            <span className="px-2 py-1 rounded-lg bg-pink-500/15 text-pink-300 font-semibold text-[11px] border border-pink-500/30">
                              📷 {u.instagram_handle}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Solicitado: {u.organizer_request_date ? new Date(u.organizer_request_date).toLocaleString('es-AR') : 'Reciente'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto flex-wrap">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="py-2 px-3 bg-purple-900/50 hover:bg-purple-800 text-purple-200 text-xs font-bold rounded-xl border border-purple-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Editar nombre, apellido, teléfono, Instagram y Facebook"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Perfil</span>
                      </button>
                      <button
                        onClick={() => handleApproveOrganizer(u.id)}
                        className="flex-1 md:flex-initial py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        Aprobar Organizador
                      </button>
                      <button
                        onClick={() => rejectOrganizer(u.id)}
                        className="py-2 px-3 bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-medium rounded-xl border border-dark-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-slate-400" />
                        Rechazar
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`¿Estás seguro de eliminar la solicitud / registro de ${u.full_name} (${u.email})?`)) {
                            await deleteUser(u.id || u.email);
                          }
                        }}
                        className="py-2 px-3 bg-rose-950/50 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-xl border border-rose-800/60 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Eliminar registro"
                      >
                        <span>🗑️ Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-dark-900 border border-dark-800 rounded-2xl text-center text-xs text-slate-400">
                No hay solicitudes pendientes de organizadores en este momento.
              </div>
            )}
          </div>
        )}

          {/* Sección 2: Base de Usuarios & Modificación de Roles */}
          {(userFilter === 'all' || userFilter === 'approved') && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-dance-coral" />
                <span>
                  {userFilter === 'approved'
                    ? `Organizadores Habilitados (${approvedOrganizers.length})`
                    : `Todos los Usuarios y Roles Activos (${usersList.length})`}
                </span>
              </h3>

              <div className="bg-dark-900 border border-dark-750 rounded-3xl p-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-dark-750 text-slate-400 uppercase tracking-wider">
                      <th className="p-3">Usuario</th>
                      <th className="p-3">Email</th>
                      <th className="p-3 text-center">Rol</th>
                      <th className="p-3 text-center">Publicar</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {(userFilter === 'approved'
                      ? usersList.filter((u) => u.role === 'organizer')
                      : usersList
                    ).map((u) => {
                      const canPublish = u.role === 'organizer' || u.role === 'admin';
                      return (
                        <tr key={u.id} className="hover:bg-dark-850/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                              />
                              <div className="space-y-0.5">
                                <span className="font-bold text-white block">{u.full_name}</span>
                                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                  {u.instagram_handle && (
                                    <a
                                      href={`https://instagram.com/${u.instagram_handle.replace('@', '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-1.5 py-0.2 bg-pink-500/15 text-pink-300 rounded font-semibold hover:underline"
                                    >
                                      📷 {u.instagram_handle}
                                    </a>
                                  )}
                                  {(u.phone || u.whatsapp_phone) && (
                                    <span className="px-1.5 py-0.2 bg-emerald-500/15 text-emerald-300 rounded font-semibold">
                                      📱 {u.phone || u.whatsapp_phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 font-mono">{u.email}</td>
                          <td className="p-3 text-center">
                            {u.role === 'admin' ? (
                              <span title="Administrador" className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center justify-center text-sm shadow-sm">
                                <Shield className="w-4 h-4" />
                              </span>
                            ) : u.role === 'organizer' ? (
                              <span title="Organizador" className="w-8 h-8 rounded-xl bg-dance-coral/20 text-dance-coral border border-dance-coral/30 inline-flex items-center justify-center text-base shadow-sm">
                                🤵
                              </span>
                            ) : (
                              <span title="Bailarín" className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center justify-center text-base shadow-sm">
                                🕺
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {canPublish ? (
                              <span title="Habilitado para publicar flyers" className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center justify-center">
                                <CheckCircle className="w-4 h-4" />
                              </span>
                            ) : (
                              <span title="Sin permiso de publicación" className="w-8 h-8 rounded-xl bg-white/5 text-slate-600 border border-white/5 inline-flex items-center justify-center">
                                <XCircle className="w-4 h-4" />
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Lapicito de editar perfil */}
                              <button
                                onClick={() => setEditingUser(u)}
                                className="w-8 h-8 rounded-xl bg-purple-900/40 hover:bg-purple-800 text-purple-200 border border-purple-500/40 transition-all cursor-pointer flex items-center justify-center shadow-sm active:scale-95"
                                title="Editar Perfil"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Si es organizador: Muñequito bailando para bajar a bailarín */}
                              {u.role === 'organizer' && (
                                <button
                                  onClick={() => setUserRole(u.id, 'user')}
                                  className="w-8 h-8 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all cursor-pointer flex items-center justify-center text-base shadow-sm active:scale-95"
                                  title="Bajar a Bailarín"
                                >
                                  <span>🕺</span>
                                </button>
                              )}

                              {/* Si es bailarín: Muñeco con traje para promover a organizador */}
                              {u.role === 'user' && (
                                <button
                                  onClick={() => setUserRole(u.id, 'organizer')}
                                  className="w-8 h-8 rounded-xl bg-dance-coral/15 hover:bg-dance-coral/25 text-dance-coral border border-dance-coral/30 transition-all cursor-pointer flex items-center justify-center text-base active:scale-95"
                                  title="Promover a Organizador"
                                >
                                  <span>🤵</span>
                                </button>
                              )}

                              {/* Escudo para hacer admin */}
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => setUserRole(u.id, 'admin')}
                                  className="w-8 h-8 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                                  title="Hacer Administrador"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              )}

                              {/* Tachito de basura para borrar */}
                              {u.role !== 'admin' && (
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`¿Estás seguro de eliminar permanentemente al usuario "${u.full_name}" (${u.email})?`)) {
                                      await deleteUser(u.id || u.email);
                                    }
                                  }}
                                  className="w-8 h-8 rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                                  title="Eliminar Usuario"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Denuncias */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {activeReports.length > 0 ? (
            <div className="grid grid-cols-1 gap-3.5">
              {activeReports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-dark-900 border border-dark-750 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {rep.reason}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(rep.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white">{rep.event_title || 'Evento Denunciado'}</h4>
                    {rep.details && (
                      <p className="text-xs text-slate-300 bg-dark-850 p-2 rounded-xl border border-dark-800">
                        "{rep.details}"
                      </p>
                    )}
                    {rep.reporter_email && (
                      <p className="text-[11px] text-slate-400">Reportado por: {rep.reporter_email}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onResolveReport(rep.id)}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Marcar Resuelta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-dark-900 border border-dark-800 rounded-3xl p-10 text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-white text-base">Sin denuncias pendientes</h3>
              <p className="text-xs text-slate-400">
                Todos los reportes de la comunidad han sido atendidos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Bots IA — Panel de Control de Agentes */}
      {activeTab === 'bots' && (
        <BotsPanel />
      )}

      {activeTab === 'outreach' && (
        <OutreachCampaignPanel />
      )}

      {/* Tab: Todos los eventos */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Sub-filtros de Eventos */}
          <div className="flex items-center gap-2 flex-wrap pb-1">
            <button
              onClick={() => setEventFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                eventFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-700'
              }`}
            >
              Todos ({events.length})
            </button>
            <button
              onClick={() => setEventFilter('featured')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                eventFilter === 'featured'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-dark-850 text-amber-400 hover:text-amber-300 border border-dark-700'
              }`}
            >
              ⭐ Hero ({featuredEvents.length})
            </button>
            <button
              onClick={() => setEventFilter('standard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                eventFilter === 'standard'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-dark-850 text-sky-400 hover:text-sky-300 border border-dark-700'
              }`}
            >
              Estándar ({events.length - featuredEvents.length})
            </button>
          </div>

          <div className="bg-dark-900 border border-dark-750 rounded-3xl p-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-dark-750 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="p-2.5">Evento</th>
                  <th className="p-2.5 text-center">Estado</th>
                  <th className="p-2.5 text-center">Hero</th>
                  <th className="p-2.5">Categoría</th>
                  <th className="p-2.5">Lugar</th>
                  <th className="p-2.5">Organizador</th>
                  <th className="p-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {events
                  .filter((e) => {
                    if (eventFilter === 'featured') return e.is_featured && e.status === 'publicado';
                    if (eventFilter === 'standard') return !e.is_featured && e.status === 'publicado';
                    return true;
                  })
                  .map((e) => (
                    <tr key={e.id} className="hover:bg-dark-850/50">
                      <td className="p-2.5 font-semibold text-white max-w-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={e.flyer_url}
                            alt=""
                            className="w-8 h-10 rounded-lg object-cover border border-dark-700 shrink-0"
                          />
                          <span className="truncate">{e.title}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            e.is_cancelled
                              ? 'bg-red-900/40 text-red-400 border-red-800'
                              : e.status === 'publicado'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : e.status === 'pendiente'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-dark-800 text-slate-400 border-dark-700'
                          }`}
                          title={e.is_cancelled ? 'Cancelado' : e.status}
                        >
                          {e.is_cancelled ? (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">Cancelado</span>
                            </>
                          ) : e.status === 'publicado' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">Publicado</span>
                            </>
                          ) : e.status === 'pendiente' ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span className="hidden sm:inline">Pendiente</span>
                            </>
                          ) : (
                            <span>{e.status}</span>
                          )}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {e.status === 'publicado' && !e.is_cancelled ? (
                          <button
                            onClick={() => onToggleFeatured(e.id)}
                            className={`w-8 h-8 mx-auto rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                              e.is_featured
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow-amber hover:bg-amber-500/30'
                                : 'bg-dark-800 text-slate-500 border-dark-700 hover:text-amber-300 hover:border-amber-500/30'
                            }`}
                            title={e.is_featured ? 'Destacado en portada (Click para quitar)' : 'Click para destacar en portada'}
                          >
                            <Star className={`w-4 h-4 transition-transform ${e.is_featured ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-400'}`} />
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-2.5 capitalize">{e.category}</td>
                      <td className="p-2.5 truncate max-w-[150px]">{e.venue_name}</td>
                      <td className="p-2.5">{e.organizer_name}</td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {e.status === 'pendiente' && (
                            <>
                              <button
                                onClick={() => handleApprove(e.id, false)}
                                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
                                title="Aprobar evento"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleApprove(e.id, true)}
                                className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-sm transition-colors cursor-pointer border border-amber-300"
                                title="Aprobar y destacar en portada"
                              >
                                <Star className="w-3.5 h-3.5 fill-slate-950" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setEditingPendingEvent(e)}
                            className="p-2 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-xl border border-purple-500/40 transition-colors cursor-pointer"
                            title="Editar evento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectEventPreview(e)}
                            className="p-2 bg-dark-800 hover:bg-dark-750 text-slate-200 rounded-xl border border-dark-700 transition-colors cursor-pointer"
                            title="Ver flyer / detalle"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de ELIMINAR definitivamente el flyer "${e.title}"? Esta acción borrará el evento de la cartelera y del mapa.`)) {
                                if (onDeleteEvent) {
                                  onDeleteEvent(e.id);
                                }
                              }
                            }}
                            className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl border border-rose-800/50 transition-colors cursor-pointer"
                            title="Borrar flyer definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
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

      {/* Tab: Ventas & Comisiones */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {/* Banner de Acción Rápida: Venta Manual por WhatsApp */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-[#101924] to-[#121624] border-2 border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <MessageCircle className="w-6 h-6 fill-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-white text-base">Cargar Venta Manual / WhatsApp</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Emisión Instantánea
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  ¿Concretaste una venta por chat de WhatsApp o transferencia? Ingresá los datos del cliente, generá su entrada con código QR oficial al instante y envíasela en un solo clic.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsManualSaleModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Cargar Venta y Generar QR</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#121624] border border-emerald-500/20 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
              <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span>Volumen Acreditado</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
                ${ticketStats.totalGrossRevenue.toLocaleString('es-AR')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Total verificado y cobrado</p>
            </div>

            <div className="bg-[#121624] border border-dance-coral/30 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
              <div className="text-[11px] text-dance-coral font-bold uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span>Comisión Sale Baile</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-dance-coral mt-2">
                ${ticketStats.totalPlatformCommissions.toLocaleString('es-AR')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Ganancia neta plataforma (20% Fijo)</p>
            </div>

            <div className="bg-[#121624] border border-amber-500/30 bg-amber-950/20 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
              <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Pagos en Revisión</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
                {ticketStats.pendingOrdersCount} <span className="text-xs font-normal text-amber-300/80">(${ticketStats.pendingGrossAmount.toLocaleString('es-AR')})</span>
              </div>
              <p className="text-[10px] text-amber-300/70 mt-1">Órdenes esperando acreditación</p>
            </div>

            <div className="bg-[#121624] border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
              <div className="text-[11px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-4 h-4" />
                <span>Total Entradas QR</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-2">
                {ticketStats.totalTicketsSold}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Tickets habilitados en puerta</p>
            </div>
          </div>

          {/* Sección Especial: Órdenes Pendientes de Aprobación */}
          {ticketStats.pendingOrders.length > 0 && (
            <div className="bg-amber-950/20 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">
                      Pagos Pendientes de Verificación ({ticketStats.pendingOrders.length})
                    </h3>
                    <p className="text-xs text-amber-200/80">
                      Revisá la transferencia en tu cuenta de Mercado Pago o banco y aprobá el pago para habilitar el código QR al comprador.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/40">
                  Total Pendiente: ${ticketStats.pendingGrossAmount.toLocaleString('es-AR')} ARS
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-amber-500/20 text-amber-200/70 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-3">Orden / Fecha</th>
                      <th className="pb-3 px-3">Comprador</th>
                      <th className="pb-3 px-3">Evento</th>
                      <th className="pb-3 px-3">Monto & Pases</th>
                      <th className="pb-3 px-3">Comprobante / Ref</th>
                      <th className="pb-3 pl-3 text-right">Acción de Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/15 text-slate-200">
                    {ticketStats.pendingOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="py-3 pr-3 font-mono text-[11px]">
                          <div className="text-white font-bold">{ord.id}</div>
                          <div className="text-slate-400 text-[10px]">{new Date(ord.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white flex items-center gap-1">
                            <span>{ord.buyer_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-300">DNI: <strong className="text-amber-300 font-mono">{ord.buyer_dni}</strong></div>
                          <div className="text-[10px] text-slate-400">{ord.buyer_whatsapp || ord.buyer_email}</div>
                        </td>
                        <td className="py-3 px-3 truncate max-w-[160px]">
                          <span className="font-semibold text-slate-200">{ord.event_title}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-black text-emerald-400 text-sm">
                            ${(ord.total_amount_paid || ord.total_amount || 0).toLocaleString('es-AR')}
                          </div>
                          <div className="text-[10px] text-slate-400">{ord.quantity} {ord.quantity === 1 ? 'entrada' : 'entradas'}</div>
                        </td>
                        <td className="py-3 px-3">
                          {ord.payment_reference ? (
                            <span className="px-2 py-1 bg-black/40 rounded-lg border border-amber-500/30 text-amber-300 font-mono font-bold text-[11px] block w-fit">
                              {ord.payment_reference}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Sin nro informado</span>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {ord.buyer_whatsapp && (
                              <button
                                onClick={() => {
                                  const text = `Hola ${ord.buyer_name}! Nos comunicamos de Sale Baile respecto a tu compra de entrada para "${ord.event_title}" (Orden ${ord.id}).`;
                                  window.open(`https://wa.me/${ord.buyer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                title="Contactar por WhatsApp"
                                className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleApproveOrder(ord.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aprobar Pago</span>
                            </button>

                            <button
                              onClick={() => handleRejectOrder(ord.id)}
                              className="px-2.5 py-1.5 bg-dark-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs rounded-xl border border-white/10 cursor-pointer transition-all"
                              title="Rechazar y anular orden"
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

          {/* Tabla General de Órdenes y Entradas */}
          <div className="bg-dark-900 border border-dark-750 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Ticket className="w-5 h-5 text-dance-coral" />
                <span>Registro Histórico de Órdenes y Entradas</span>
              </h3>
              <span className="text-xs text-slate-400">{ticketStats.allOrders.length} órdenes registradas</span>
            </div>

            {ticketStats.allOrders.length === 0 ? (
              <div className="text-center py-12 bg-[#121624] border border-white/5 rounded-2xl p-6 text-slate-400 text-xs">
                No hay órdenes de compra registradas aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4">Orden / Fecha</th>
                      <th className="pb-3 px-4">Comprador / DNI</th>
                      <th className="pb-3 px-4">Evento</th>
                      <th className="pb-3 px-4">Cantidad</th>
                      <th className="pb-3 px-4">Total</th>
                      <th className="pb-3 px-4">Comisión Admin</th>
                      <th className="pb-3 pl-4 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {ticketStats.allOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4 font-mono text-[11px]">
                          <div className="text-white font-bold">{ord.id}</div>
                          <div className="text-slate-400">{new Date(ord.created_at).toLocaleString('es-AR')}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{ord.buyer_name}</div>
                          <div className="text-[11px] text-slate-400">{ord.buyer_email} • DNI {ord.buyer_dni}</div>
                        </td>
                        <td className="py-3 px-4 truncate max-w-[180px]">
                          {ord.event_title}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {ord.quantity} {ord.quantity === 1 ? 'entrada' : 'entradas'}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          ${(ord.total_amount_paid || ord.total_amount || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-4 font-bold text-dance-coral">
                          ${(ord.total_admin_commission || ord.platform_commission || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                              ord.payment_status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : ord.payment_status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {ord.payment_status === 'approved'
                              ? 'Acreditado'
                              : ord.payment_status === 'pending'
                              ? 'En Revisión'
                              : 'Rechazado'}
                          </span>
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

      {/* Tab: Control de Equipos y Descargas de la Aplicación */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Header de la pestaña */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-950/70 via-[#10172e] to-[#0c1020] border-2 border-blue-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-blue-500/30 shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Conteo de Equipos & Descargas de la App
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 flex items-center gap-1">
                      <DownloadCloud className="w-3 h-3" />
                      Registro en Tiempo Real
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
                    Monitoreo automático de todos los teléfonos, tablets y computadoras que han descargado la app (PWA / Standalone) o que ingresan desde la web.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={async () => {
                    setIsSyncing(true);
                    try {
                      const updated = await fetchCloudDevices();
                      setAdminDevices(updated);
                      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  disabled={isSyncing}
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Actualizar Equipos'}</span>
                </button>
              </div>
            </div>

            {/* 4 Tarjetas de Métricas de Equipos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {/* Tarjeta 1: Total Descargas PWA */}
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 space-y-1">
                <div className="flex items-center justify-between text-blue-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">App Descargada</span>
                  <DownloadCloud className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {deviceStats.installedDevices}
                </div>
                <div className="text-[10px] text-blue-300 flex items-center justify-between">
                  <span>Instaladas en inicio / Standalone</span>
                  <span className="font-bold">
                    {deviceStats.totalDevices > 0 ? Math.round((deviceStats.installedDevices / deviceStats.totalDevices) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Tarjeta 2: Android */}
              <div className="p-4 rounded-2xl bg-[#0e1628] border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">Android</span>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {deviceStats.androidCount}
                </div>
                <div className="text-[10px] text-slate-400">
                  Móviles y tablets Android
                </div>
              </div>

              {/* Tarjeta 3: iPhone / iPad */}
              <div className="p-4 rounded-2xl bg-[#0e1628] border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-slate-200">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">iPhone / iOS</span>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {deviceStats.iosCount}
                </div>
                <div className="text-[10px] text-slate-400">
                  Dispositivos Apple iOS
                </div>
              </div>

              {/* Tarjeta 4: Computadoras */}
              <div className="p-4 rounded-2xl bg-[#0e1628] border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-indigo-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">Computadoras</span>
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {deviceStats.windowsCount + deviceStats.macCount + deviceStats.otherCount}
                </div>
                <div className="text-[10px] text-slate-400">
                  {deviceStats.windowsCount} Windows • {deviceStats.macCount} Mac
                </div>
              </div>
            </div>
          </div>

          {/* Tabla y Filtros de Dispositivos Registrados (Desplegable) */}
          <div className="bg-dark-900 border border-dark-750 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsDevicesHistoryOpen(!isDevicesHistoryOpen)}
                className="flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/25 transition-colors">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2 group-hover:text-blue-300 transition-colors">
                    <span>Historial de Equipos Conectados</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      {adminDevices.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isDevicesHistoryOpen ? 'Toca la flechita para esconder el historial' : 'Toca para desplegar la lista de equipos'}
                  </p>
                </div>
              </button>

              {/* Botón flechita para desplegar / reducir */}
              <button
                type="button"
                onClick={() => setIsDevicesHistoryOpen(!isDevicesHistoryOpen)}
                className="p-2.5 rounded-2xl bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
                title={isDevicesHistoryOpen ? "Reducir / Ocultar historial" : "Desplegar historial"}
              >
                {isDevicesHistoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {isDevicesHistoryOpen && (
              <>
                {/* Filtro de Dispositivos */}
                <div className="flex items-center gap-1.5 p-1 bg-dark-800 rounded-xl border border-white/10 overflow-x-auto max-w-full text-xs">
                  <button
                    onClick={() => setDeviceFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      deviceFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({adminDevices.length})
                  </button>
                  <button
                    onClick={() => setDeviceFilter('installed')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      deviceFilter === 'installed'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Descargados ({deviceStats.installedDevices})
                  </button>
                  <button
                    onClick={() => setDeviceFilter('android')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      deviceFilter === 'android'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Android ({deviceStats.androidCount})
                  </button>
                  <button
                    onClick={() => setDeviceFilter('ios')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      deviceFilter === 'ios'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    iOS ({deviceStats.iosCount})
                  </button>
                  <button
                    onClick={() => setDeviceFilter('desktop')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      deviceFilter === 'desktop'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PC / Mac ({deviceStats.windowsCount + deviceStats.macCount})
                  </button>
                </div>

            {/* Listado de equipos */}
            {adminDevices.length === 0 ? (
              <div className="text-center py-12 bg-[#121624] border border-white/5 rounded-2xl p-6 text-slate-400 text-xs">
                No hay equipos registrados todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4">Dispositivo / SO</th>
                      <th className="pb-3 px-4">Navegador & Pantalla</th>
                      <th className="pb-3 px-4">Estado de Instalación</th>
                      <th className="pb-3 px-4">Primer Ingreso</th>
                      <th className="pb-3 px-4">Última Conexión</th>
                      <th className="pb-3 pl-4 text-right">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {adminDevices
                      .filter((d) => {
                        if (deviceFilter === 'installed') return d.is_installed || d.install_status === 'installed';
                        if (deviceFilter === 'android') return d.os === 'Android';
                        if (deviceFilter === 'ios') return d.os === 'iOS';
                        if (deviceFilter === 'desktop') return d.os === 'Windows' || d.os === 'macOS' || d.os === 'Linux';
                        return true;
                      })
                      .map((dev) => (
                        <tr key={dev.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                                {dev.device_type === 'desktop' ? (
                                  <Laptop className="w-4 h-4 text-indigo-400" />
                                ) : (
                                  <Smartphone className="w-4 h-4 text-blue-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{dev.os}</span>
                                  <span className="text-[10px] text-slate-400 font-normal capitalize">
                                    ({dev.device_type === 'mobile' ? 'Móvil' : dev.device_type === 'tablet' ? 'Tablet' : 'Escritorio'})
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                                  {dev.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{dev.browser}</div>
                            <div className="text-[10px] text-slate-400">{dev.screen_resolution} • {dev.language}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            {dev.is_installed || dev.install_status === 'installed' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                                <DownloadCloud className="w-3.5 h-3.5" />
                                <span>App Descargada</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-white/10 text-[11px] font-medium">
                                <Globe className="w-3.5 h-3.5" />
                                <span>Navegador Web</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">
                            {dev.first_seen ? new Date(dev.first_seen).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Reciente'}
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">
                            {dev.last_active ? new Date(dev.last_active).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                          </td>

                          <td className="py-3.5 pl-4 text-right">
                            {dev.user_email ? (
                              <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                                {dev.user_email}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">Sin cuenta</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ESPACIO FINAL: Directorio y Exportador de Correos de Usuarios por Roles */}
      {!showEmailDirectory ? (
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={() => setShowEmailDirectory(true)}
            className="p-3.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 shadow-lg shadow-purple-900/20 transition-all cursor-pointer active:scale-95"
            title="Directorio & Exportador de Correos Electrónicos"
          >
            <Mail className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#121626] via-[#101320] to-[#0d0f1a] border-2 border-purple-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 mt-8 relative">
          {/* Botón para cerrar y dejar solo el icono de correo */}
          <button
            type="button"
            onClick={() => setShowEmailDirectory(false)}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer z-10"
            title="Ocultar y dejar solo el icono"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10 pr-10">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 flex items-center justify-center text-white font-black shadow-lg shadow-purple-500/30 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-white">
                  Directorio & Exportador de Correos Electrónicos
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black border border-purple-500/40 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {filteredEmails.length} correos en esta pestaña
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Copia o descarga todos los correos electrónicos filtrados por rol en un archivo de texto para campañas de email, avisos de eventos o difusión masiva.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleCopyEmails}
              disabled={filteredEmails.length === 0}
              className={`px-4 py-2.5 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                copiedEmails
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
              }`}
            >
              {copiedEmails ? (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span>¡Copiado al Portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Correos ({filteredEmails.length})</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadTxt}
              disabled={filteredEmails.length === 0}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Archivo .TXT</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Roles y Selector de Formato */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          {/* Pestañas de Roles */}
          <div className="flex items-center gap-1.5 p-1 bg-dark-800/90 rounded-2xl border border-white/10 overflow-x-auto max-w-full">
            <button
              onClick={() => setEmailSegmentFilter('all')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                emailSegmentFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Todos ({allExtractedEmails.length})</span>
            </button>

            <button
              onClick={() => setEmailSegmentFilter('users')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                emailSegmentFilter === 'users'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Usuarios ({allExtractedEmails.filter(u => u.rawRole === 'user').length})</span>
            </button>

            <button
              onClick={() => setEmailSegmentFilter('organizers')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                emailSegmentFilter === 'organizers'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Organizadores ({allExtractedEmails.filter(u => u.rawRole === 'organizer').length})</span>
            </button>

            <button
              onClick={() => setEmailSegmentFilter('admins')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                emailSegmentFilter === 'admins'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Administradores ({allExtractedEmails.filter(u => u.rawRole === 'admin').length})</span>
            </button>
          </div>

          {/* Selector de formato de exportación */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-slate-400 text-[11px] font-bold">Formato:</span>
            <div className="flex items-center gap-1 p-1 bg-dark-800/90 rounded-xl border border-white/10">
              <button
                onClick={() => setEmailExportFormat('lines')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  emailExportFormat === 'lines'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Un correo por cada línea"
              >
                1 por Línea
              </button>
              <button
                onClick={() => setEmailExportFormat('comma')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  emailExportFormat === 'comma'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Separados por coma para correos masivos (CCO / BCC)"
              >
                Por Comas
              </button>
              <button
                onClick={() => setEmailExportFormat('detailed')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  emailExportFormat === 'detailed'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Listado completo con nombres y roles"
              >
                Detallado
              </button>
            </div>
          </div>
        </div>

        {/* Visor de texto interactivo / Caja para copiar */}
        <div className="relative rounded-2xl bg-[#080a10] border border-white/10 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5 text-[11px] text-slate-400 font-mono">
            <span>
              correos_{emailSegmentFilter === 'all' ? 'todos' : emailSegmentFilter === 'organizers' ? 'organizadores' : emailSegmentFilter === 'admins' ? 'administradores' : 'usuarios'}_salebaile.txt ({filteredEmails.length} correos)
            </span>
            <span className="text-purple-400 font-sans font-bold">Haz clic adentro para seleccionar todo</span>
          </div>
          <textarea
            readOnly
            value={formattedEmailText}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            rows={Math.min(8, Math.max(3, filteredEmails.length))}
            className="w-full p-4 bg-transparent text-slate-200 font-mono text-xs focus:outline-none resize-y selection:bg-purple-500 selection:text-white leading-relaxed"
            placeholder="No se encontraron correos para este rol."
          />
        </div>
      </div>
    )}

      {/* Modal de Carga de Venta Manual por WhatsApp */}
      <ManualTicketSaleModal
        isOpen={isManualSaleModalOpen}
        onClose={() => setIsManualSaleModalOpen(false)}
        events={events}
        onSuccess={() => {
          loadAdminTicketData();
          if (onRefreshAll) onRefreshAll();
        }}
      />

      {/* Modal de Edición de Evento/Flyer previo o posterior a aprobación */}
      <AdminEditEventModal
        isOpen={Boolean(editingPendingEvent)}
        onClose={() => setEditingPendingEvent(null)}
        event={editingPendingEvent}
        onSave={(updatedData, autoApprove, makeFeatured) => {
          if (editingPendingEvent) {
            if (onUpdateEvent) {
              onUpdateEvent(editingPendingEvent.id, updatedData, false);
            }
            if (autoApprove) {
              handleApprove(editingPendingEvent.id, makeFeatured);
            }
            setEditingPendingEvent(null);
          }
        }}
        onDelete={(eventId) => {
          if (onDeleteEvent) {
            onDeleteEvent(eventId);
          }
          setEditingPendingEvent(null);
        }}
      />

      {/* Modal de Edición de Perfil de Usuario por el Administrador */}
      <EditProfileModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        title={`Editar Perfil: ${editingUser?.full_name || 'Usuario'}`}
        subtitle="Edita nombre, apellido, teléfono, Instagram y Facebook de este usuario."
        onSave={async (updates) => {
          if (editingUser) {
            await updateUserById(editingUser.id || editingUser.email, updates);
            setEditingUser(null);
          }
        }}
      />

      {/* Modal de Publicación Manual de Evento para el Administrador */}
      {isCreateEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#0b0e17] border border-white/10 rounded-3xl p-5 sm:p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative my-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-dance-coral" />
                Publicar Nuevo Evento (Administrador)
              </h3>
              <button
                onClick={() => setIsCreateEventModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <EventForm
              onSubmit={(eventData, isDraft) => {
                if (onCreateEvent) {
                  onCreateEvent(eventData, isDraft);
                }
                setIsCreateEventModalOpen(false);
              }}
              onCancel={() => setIsCreateEventModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
