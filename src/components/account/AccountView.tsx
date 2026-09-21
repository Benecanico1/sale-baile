import React, { useState } from 'react';
import { useAuth, isAdminEmail } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useFollowing } from '../../context/FollowingContext';
import { RequestOrganizerModal } from '../organizer/RequestOrganizerModal';
import { TicketScannerModal } from '../organizer/TicketScannerModal';
import { EditProfileModal } from './EditProfileModal';
import { TeacherClassModal } from '../teacher/TeacherClassModal';
import { VenueModal } from '../venue/VenueModal';
import { FollowingOrganizersModal } from './FollowingOrganizersModal';
import { isUserAssignedAsStaff, getLocalTickets } from '../../lib/tickets';
import { getLocalEvents } from '../../lib/supabase';
import { compressAvatarFile } from '../../lib/mediaProcessor';
import type { EventItem } from '../../types';
import {
  User,
  Shield,
  Building,
  LogOut,
  LogIn,
  Heart,
  ChevronRight,
  Ticket,
  QrCode,
  Edit3,
  Crown,
  Sparkles,
  GraduationCap,
  Calendar,
  Camera,
  Loader2,
} from 'lucide-react';

interface AccountViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenPrivacyPolicy?: () => void;
  onCreateEvent?: (eventData: Partial<EventItem>, isDraft: boolean) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  onNavigateTab,
  onOpenPrivacyPolicy,
  onCreateEvent,
}) => {
  const { user, role, logout, updateProfile, setShowAuthModal, setAuthModalMode } = useAuth();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const quickAvatarInputRef = React.useRef<HTMLInputElement>(null);

  const { favorites } = useFavorites();
  const { followingCount } = useFollowing();

  const handleQuickAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUpdatingAvatar(true);
    try {
      const compressedUrl = await compressAvatarFile(file);
      await updateProfile({ avatar_url: compressedUrl });
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Error al actualizar la foto de perfil.');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const isUserAdmin = Boolean(role === 'admin' || (user?.email && isAdminEmail(user.email)));
  const staffCheck = user?.email ? isUserAssignedAsStaff(user.email) : { isStaff: false, staffRecords: [] };
  const isStaffUser = Boolean(user && (role === 'staff' || isUserAdmin || staffCheck.isStaff));
  const isTeacher = Boolean(user?.profile_type === 'profesor');
  const isVenueOwner = Boolean(user?.profile_type === 'dueno_local');
  const allTickets = getLocalTickets();
  const myTickets = allTickets.filter(t => 
    (user?.email && t.buyer_email?.toLowerCase() === user.email.toLowerCase()) ||
    (user?.id && t.buyer_user_id === user.id) ||
    (user?.full_name && t.buyer_name?.toLowerCase().includes(user.full_name.toLowerCase()))
  );
  const myTicketsCount = myTickets.length;

  // Cálculo de eventos reales: tickets/pases comprados + eventos publicados por el usuario
  const allEvents = getLocalEvents();
  const myCreatedEvents = allEvents.filter(e => 
    (user?.id && e.organizer_id === user.id) ||
    (user?.full_name && e.organizer_name?.toLowerCase() === user.full_name.toLowerCase())
  );
  const realEventsCount = myTicketsCount + (isStaffUser || isTeacher || role === 'organizer' || isUserAdmin ? myCreatedEvents.length : 0);

  const handleLogout = () => {
    logout();
    onNavigateTab('explore');
    setAuthModalMode('login');
    setShowAuthModal(true);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 pb-28 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-dance-crimson/20 to-dance-coral/10 border border-dance-crimson/30 flex items-center justify-center text-dance-coral mx-auto shadow-glow-crimson">
          <User className="w-10 h-10 text-dance-coral" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Iniciá sesión en Sale Baile</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            Accedé con tu cuenta para ver tus entradas digitales con código QR, tus eventos favoritos y gestionar tu perfil.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('login');
              setShowAuthModal(true);
            }}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-glow-crimson flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Iniciar Sesión con Google o Correo
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('explore')}
            className="w-full py-3 px-5 bg-oled-900 hover:bg-oled-850 text-slate-300 hover:text-white font-bold text-xs rounded-2xl border border-white/10 transition-colors cursor-pointer"
          >
            Volver a la cartelera de eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Perfil Header (Pantalla 7 de la Maqueta) */}
      <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Avatar Circular con Borde Neón y Cambio Rápido de Foto */}
        <div className="relative w-20 h-20 mx-auto">
          <input
            ref={quickAvatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleQuickAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => quickAvatarInputRef.current?.click()}
            disabled={isUpdatingAvatar}
            className="w-full h-full rounded-full bg-gradient-to-tr from-dance-crimson to-dance-coral p-0.5 shadow-glow-crimson overflow-hidden block cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
            title="Toca para cambiar tu foto de perfil"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#050508] rounded-full flex items-center justify-center text-white">
                <User className="w-9 h-9 text-dance-coral" />
              </div>
            )}
          </button>

          {/* Botón flotante de cámara */}
          <button
            type="button"
            onClick={() => quickAvatarInputRef.current?.click()}
            disabled={isUpdatingAvatar}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-dance-crimson to-dance-coral text-white flex items-center justify-center shadow-lg border-2 border-oled-900 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
            title="Cambiar foto de perfil"
          >
            {isUpdatingAvatar ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Nombre, Handle y Bio */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {user.full_name || 'Bailarín de Sale Baile'}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            @{user.email ? user.email.split('@')[0] : 'usuario'}
          </p>
          <p className="text-xs sm:text-sm text-slate-300 font-semibold pt-1">
            {user.bio || 'La pasión por bailar nos une ✨'}
          </p>
        </div>

        {/* 3 Contadores de Métricas Reales */}
        <div className="grid grid-cols-3 divide-x divide-white/10 py-3 border-y border-white/10 max-w-sm mx-auto">
          {/* 1. Eventos */}
          <button
            type="button"
            onClick={() => onNavigateTab(myTicketsCount > 0 ? 'tickets' : 'agenda')}
            className="text-center px-2 hover:opacity-80 transition-opacity cursor-pointer group"
            title="Ver mis eventos y entradas"
          >
            <span className="block text-base sm:text-lg font-black text-white group-hover:text-dance-coral transition-colors">
              {realEventsCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Eventos</span>
          </button>

          {/* 2. Favoritos */}
          <button
            type="button"
            onClick={() => onNavigateTab('favorites')}
            className="text-center px-2 hover:opacity-80 transition-opacity cursor-pointer group"
            title="Ver mis favoritos guardados"
          >
            <span className="block text-base sm:text-lg font-black text-white group-hover:text-dance-crimson transition-colors">
              {favorites.length}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Favoritos</span>
          </button>

          {/* 3. Siguiendo */}
          <button
            type="button"
            onClick={() => setIsFollowingModalOpen(true)}
            className="text-center px-2 hover:opacity-80 transition-opacity cursor-pointer group"
            title="Ver organizadores que sigo"
          >
            <span className="block text-base sm:text-lg font-black text-white group-hover:text-purple-400 transition-colors">
              {followingCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Siguiendo</span>
          </button>
        </div>

        {/* Botón Editar Perfil */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsEditProfileOpen(true)}
            className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-md inline-flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-dance-coral" />
            <span>Editar perfil</span>
          </button>
        </div>
      </div>

        {/* Espacio Exclusivo para Profesores de Baile */}
        {user && (isTeacher || isUserAdmin) && (
          <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-dark-900 to-teal-950/30 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider block">
                    Espacio de Profesores de Baile
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Activo
                  </span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Publica tus clases regulares, talleres, días de la semana y precios para captar nuevos alumnos.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Publicar Mis Clases</span>
            </button>
          </div>
        )}

        {/* Espacio Exclusivo para Dueños de Local / Salón */}
        {user && (isVenueOwner || isUserAdmin) && (
          <div className="p-4 bg-gradient-to-r from-amber-950/40 via-dark-900 to-orange-950/30 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                    Espacio Dueños de Local & Salones
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    Radar
                  </span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Promociona tu salón, capacidad y servicios en el Radar para alquiler de clases y sociales.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsVenueModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Building className="w-4 h-4" />
              <span>Promocionar Mi Salón</span>
            </button>
          </div>
        )}

        {/* Acceso Destacado al Panel de Coordinador / Organizador */}
        {role === 'organizer' && !isUserAdmin && (
          <div className="p-3.5 bg-gradient-to-r from-dance-crimson/20 via-dance-coral/10 to-dark-900 border border-dance-crimson/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-dance-crimson/20 border border-dance-crimson/40 flex items-center justify-center text-dance-coral shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-dance-coral uppercase tracking-wider block">
                  Cuenta de Coordinador Activa
                </span>
                <span className="text-[11px] text-slate-300">
                  Gestiona tus eventos, publica nuevos flyers y coordina tu equipo de puerta.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('organizer')}
              className="px-4 py-2 bg-gradient-to-r from-dance-crimson to-dance-coral hover:opacity-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-dance-crimson/20 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Abrir Panel de Coordinador</span>
            </button>
          </div>
        )}

        {/* Acceso Destacado al Panel Admin */}
        {isUserAdmin && (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-dark-900 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                  Cuenta de Administrador Activa
                </span>
                <span className="text-[11px] text-slate-300">
                  Tenés permisos completos para moderar eventos, comisiones y organizadores.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('admin')}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Abrir Panel de Control Admin</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-2.5 px-4 bg-[#151a27] hover:bg-[#1f2638] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          Cerrar Sesión
        </button>
      {/* Tarjeta de Solicitud de Organizador (Solo para usuarios regulares) */}
      {user && role === 'user' && (
        <div className="bg-gradient-to-br from-[#121622] via-[#0e111a] to-[#161320] border border-dance-coral/30 rounded-3xl p-5 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-dance-coral uppercase tracking-wider">
            <Building className="w-4 h-4" />
            <span>¿Sos Organizador o Profesor de Baile?</span>
          </div>

          {user.organizer_status === 'pending' ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>Solicitud de Organizador enviada al Administrador</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu solicitud está registrada y pendiente de revisión por el Administrador. Una vez aprobada, se habilitará tu panel de organizador para enviar propuestas de flyers y eventos.
              </p>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="text-[11px] text-amber-400 font-bold hover:underline pt-1 cursor-pointer"
              >
                Actualizar datos de mi solicitud →
              </button>
            </div>
          ) : user.organizer_status === 'rejected' ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                <span>Tu solicitud previa no fue aprobada</span>
              </div>
              <p className="text-xs text-slate-300">
                Puedes volver a enviar una solicitud indicando tus redes sociales o ciclo de baile.
              </p>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="px-4 py-2 bg-dance-coral hover:bg-dance-crimson text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Solicitar ser Organizador
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Las publicaciones de flyers y sociales son moderadas y autorizadas por la administración. Solicita tu cuenta de organizador para acordar la difusión de tus eventos.
              </p>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-dance-coral via-dance-crimson to-dance-amber hover:opacity-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-glow-crimson flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <Building className="w-4 h-4" />
                <span>Solicitar ser Organizador</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de Navegación del Perfil (Pantalla 7 de la Maqueta) */}
      <div className="space-y-2">
        <div className="bg-oled-900/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/8 shadow-xl">
          {/* 1. Mis favoritos */}
          <button
            onClick={() => onNavigateTab('favorites')}
            className="w-full p-4 hover:bg-white/5 transition-colors flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-dance-crimson/15 text-dance-crimson flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Mis favoritos</span>
                {favorites.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-dance-crimson text-white text-[10px] font-black">
                    {favorites.length}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* 2. Mi agenda */}
          <button
            onClick={() => onNavigateTab('agenda')}
            className="w-full p-4 hover:bg-white/5 transition-colors flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-dance-coral/15 text-dance-coral flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-white">Mi agenda</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* 3. Eventos a los que voy (Mis entradas y pases QR) */}
          <button
            onClick={() => onNavigateTab('tickets')}
            className="w-full p-4 hover:bg-white/5 transition-colors flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-dance-crimson to-dance-coral text-white flex items-center justify-center shadow-glow-crimson">
                <Ticket className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Eventos a los que voy</span>
                {myTicketsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-dance-crimson text-white text-[10px] font-black">
                    {myTicketsCount}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* 4. Organizadores que sigo */}
          <button
            type="button"
            onClick={() => setIsFollowingModalOpen(true)}
            className="w-full p-4 hover:bg-white/5 transition-colors flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Organizadores que sigo</span>
                {followingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black border border-purple-500/30">
                    {followingCount}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* 5. Notificaciones */}
          <div className="w-full p-4 hover:bg-white/5 transition-colors flex items-center justify-between text-left cursor-pointer opacity-90">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-white">Notificaciones</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>

          {/* 6. Configuración */}
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="w-full p-4 hover:bg-white/5 transition-colors flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-white">Configuración</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Herramientas de Gestión Profesional (Admin, Staff, Organizador) */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Herramientas de Gestión
        </h3>

        <div className="bg-oled-900/90 border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/8 shadow-xl">
          {isStaffUser && (
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="w-full p-4 hover:bg-white/5 transition-colors flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    Escanear Entradas QR
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                      Staff Activo
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">Validar pases y tickets de asistentes en la puerta</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          )}

          {onOpenPrivacyPolicy && (
            <button
              onClick={onOpenPrivacyPolicy}
              className="w-full p-4 hover:bg-[#151a27] transition-colors flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-dance-coral" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Política de Privacidad</h4>
                  <p className="text-xs text-slate-400">Términos de privacidad y datos de la app</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      <RequestOrganizerModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />

      <TicketScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        staffName={user?.full_name || 'Control de Puerta'}
      />

      {/* Modal para Editar Perfil */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        onSave={async (updates) => {
          await updateProfile(updates);
        }}
      />

      {/* Modal para Profesores de Baile */}
      <TeacherClassModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onSubmit={(eventData, isDraft) => {
          if (onCreateEvent) {
            onCreateEvent(eventData, isDraft);
          }
        }}
      />

      {/* Modal para Dueños de Local / Salón */}
      <VenueModal
        isOpen={isVenueModalOpen}
        onClose={() => setIsVenueModalOpen(false)}
        onSubmit={(eventData, isDraft) => {
          if (onCreateEvent) {
            onCreateEvent(eventData, isDraft);
          }
        }}
      />

      {/* Modal de Organizadores y Profesores que Sigo */}
      <FollowingOrganizersModal
        isOpen={isFollowingModalOpen}
        onClose={() => setIsFollowingModalOpen(false)}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};
