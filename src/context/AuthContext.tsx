import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '../types';
import { MOCK_ADMIN, isAuthorizedOrganizer } from '../lib/mockData';
import type { GoogleUserPayload } from '../lib/googleAuth';

import {
  fetchCloudOrganizerRequests,
  submitCloudOrganizerRequest,
  updateCloudOrganizerStatus,
  deleteCloudOrganizerRequest,
  syncChannel,
} from '../lib/cloudRequests';

export const MASTER_ADMIN_EMAIL = 'jesushidalgo25@gmail.com';
export const MASTER_ADMIN_EMAILS = [
  'jesushidalgo25@gmail.com',
  'bretdesing@gmail.com',
  'admin@salebaile.com',
  'admin@hoybailamos.com',
];
export const MASTER_ADMIN_WHATSAPP = '+5491155551234';

export const isAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  const norm = email.toLowerCase().trim();
  return (
    MASTER_ADMIN_EMAILS.includes(norm) ||
    norm.startsWith('admin@') ||
    norm.startsWith('administrador@') ||
    norm.includes('admin') ||
    norm === 'salebaile@gmail.com' ||
    norm === 'hoybailamos@gmail.com'
  );
};

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  usersList: UserProfile[];
  loginWithEmail: (email: string, fullName?: string, zone?: string) => void;
  loginAs: (role: UserRole, email?: string) => void;
  loginWithGooglePayload: (payload: GoogleUserPayload, zone?: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void> | void;
  updateUserById: (userIdOrEmail: string, updates: Partial<UserProfile>) => Promise<void> | void;
  requestOrganizerStatus: (notes?: string, extra?: { producerName?: string; whatsapp?: string; instagram?: string }) => void;
  approveOrganizer: (userId: string) => void;
  rejectOrganizer: (userId: string) => void;
  registerOrganizerDirectly: (data: { full_name: string; email: string; whatsapp?: string; instagram?: string }) => void;
  setUserRole: (userId: string, newRole: UserRole) => void;
  deleteUser: (userIdOrEmail: string) => Promise<void>;
  syncFromCloud: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authModalMode: 'login' | 'register' | 'organizer';
  setAuthModalMode: (mode: 'login' | 'register' | 'organizer') => void;
  showPreferencesModal: boolean;
  setShowPreferencesModal: (show: boolean) => void;
}

const STORAGE_AUTH_USER = 'sale_baile_auth_user_v4';
const STORAGE_USERS_DB = 'sale_baile_users_db_v4';
const STORAGE_ONBOARDED_EMAILS = 'sale_baile_onboarded_emails_v4';

export const getOnboardedEmails = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_ONBOARDED_EMAILS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const markEmailOnboarded = (email?: string) => {
  if (!email) return;
  try {
    const norm = email.toLowerCase().trim();
    const current = getOnboardedEmails();
    if (!current.includes(norm)) {
      localStorage.setItem(STORAGE_ONBOARDED_EMAILS, JSON.stringify([...current, norm]));
    }
  } catch (e) {}
};

const INITIAL_USERS: UserProfile[] = [
  MOCK_ADMIN,
  {
    id: 'admin-rodwil',
    email: 'bretdesing@gmail.com',
    full_name: 'Rodwil Angulo (Admin)',
    role: 'admin',
    organizer_status: 'approved',
    favorite_genres: ['salsa-y-bachata', 'bachata', 'salsa', 'rock', 'cachengue', 'tango', 'folklore', 'urbano'],
    onboarding_completed: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

/**
 * Garantiza de forma estricta que NUNCA existan dos organizadores o usuarios con el mismo correo electrónico.
 * Si hay correos repetidos, se fusionan en un único registro unificado con los datos más recientes.
 */
export function deduplicateUsers(list: UserProfile[]): UserProfile[] {
  const map = new Map<string, UserProfile>();
  const onboardedList = getOnboardedEmails();

  for (const item of list) {
    if (!item || !item.email) continue;
    const normEmail = item.email.toLowerCase().trim();
    // Excluir únicamente los correos con error de tipeo previo
    if (normEmail === 'cursoplati2022@gmail.com' || normEmail === 'cursoplaxi2022@gmail.com') continue;

    const existing = map.get(normEmail);
    const isMasterAdmin = isAdminEmail(normEmail);
    const isOrg = isAuthorizedOrganizer(normEmail) || item.role === 'organizer' || existing?.role === 'organizer';
    const hasCompletedOnboarding = item.onboarding_completed === true || isMasterAdmin || isOrg || onboardedList.includes(normEmail);

    if (!existing) {
      map.set(normEmail, {
        ...item,
        email: normEmail,
        role: isMasterAdmin ? 'admin' : (item.role || 'user'),
        organizer_status: isMasterAdmin
          ? 'approved'
          : (item.organizer_status || (item.role === 'organizer' ? 'approved' : 'none')),
        onboarding_completed: hasCompletedOnboarding,
        favorite_genres: item.favorite_genres && item.favorite_genres.length > 0 ? item.favorite_genres.map(g => g === 'caribeno' ? 'salsa-y-bachata' : g) : ['salsa-y-bachata', 'bachata', 'salsa'],
      });
    } else {
      // Unificar y fusionar
      let mergedRole: UserRole = 'user';
      if (isMasterAdmin || item.role === 'admin' || existing.role === 'admin') {
        mergedRole = 'admin';
      } else if (item.role === 'organizer' || existing.role === 'organizer') {
        mergedRole = 'organizer';
      }

      // Prioridad máxima a las solicitudes pendientes para que NUNCA se pisen con 'none'
      let mergedStatus: 'none' | 'pending' | 'approved' | 'rejected' = 'none';
      if (isMasterAdmin) {
        mergedStatus = 'approved';
      } else if (item.organizer_status === 'pending' || existing.organizer_status === 'pending') {
        mergedStatus = 'pending';
      } else if (mergedRole === 'organizer' || item.organizer_status === 'approved' || existing.organizer_status === 'approved') {
        mergedStatus = 'approved';
      } else if (item.organizer_status === 'rejected' || existing.organizer_status === 'rejected') {
        mergedStatus = 'rejected';
      }

      // Preservar onboarding y géneros favoritos
      const mergedOnboarding = Boolean(
        existing.onboarding_completed ||
        item.onboarding_completed ||
        isMasterAdmin ||
        isOrg ||
        onboardedList.includes(normEmail) ||
        (existing.favorite_genres && existing.favorite_genres.length > 0) ||
        (item.favorite_genres && item.favorite_genres.length > 0)
      );

      const mergedGenres = (item.favorite_genres && item.favorite_genres.length > 0)
        ? item.favorite_genres.map(g => g === 'caribeno' ? 'salsa-y-bachata' : g)
        : (existing.favorite_genres && existing.favorite_genres.length > 0)
        ? existing.favorite_genres.map(g => g === 'caribeno' ? 'salsa-y-bachata' : g)
        : ['salsa-y-bachata', 'bachata', 'salsa'];

      const mergedUser: UserProfile = {
        ...item, // base secundaria
        ...existing, // prioridad al elemento prioritario (primero en el array)
        id: existing.id || item.id,
        email: normEmail,
        first_name: existing.first_name !== undefined && existing.first_name !== '' ? existing.first_name : (item.first_name || ''),
        last_name: existing.last_name !== undefined && existing.last_name !== '' ? existing.last_name : (item.last_name || ''),
        full_name: existing.full_name || item.full_name || (mergedRole === 'admin' ? (normEmail.includes('bretdesing') ? 'Rodwil Angulo (Admin)' : 'Jesús Hidalgo (Admin)') : 'Organizador'),
        zone: existing.zone !== undefined && existing.zone !== '' ? existing.zone : (item.zone || ''),
        profile_type: existing.profile_type || item.profile_type || 'bailarin',
        teacher_academy: existing.teacher_academy !== undefined && existing.teacher_academy !== '' ? existing.teacher_academy : (item.teacher_academy || ''),
        teacher_genres: (existing.teacher_genres && existing.teacher_genres.length > 0) ? existing.teacher_genres : (item.teacher_genres || []),
        teacher_days: (existing.teacher_days && existing.teacher_days.length > 0) ? existing.teacher_days : (item.teacher_days || []),
        teacher_levels: (existing.teacher_levels && existing.teacher_levels.length > 0) ? existing.teacher_levels : (item.teacher_levels || []),
        venue_name_registered: existing.venue_name_registered !== undefined && existing.venue_name_registered !== '' ? existing.venue_name_registered : (item.venue_name_registered || ''),
        venue_capacity: existing.venue_capacity !== undefined ? existing.venue_capacity : item.venue_capacity,
        venue_address: existing.venue_address !== undefined && existing.venue_address !== '' ? existing.venue_address : (item.venue_address || ''),
        venue_features: (existing.venue_features && existing.venue_features.length > 0) ? existing.venue_features : (item.venue_features || []),
        role: mergedRole,
        organizer_status: mergedStatus,
        phone: existing.phone || item.phone || existing.whatsapp_phone || item.whatsapp_phone || '',
        whatsapp_phone: existing.whatsapp_phone || item.whatsapp_phone || existing.phone || item.phone || '',
        instagram_handle: existing.instagram_handle !== undefined && existing.instagram_handle !== '' ? existing.instagram_handle : (item.instagram_handle || ''),
        facebook_url: existing.facebook_url !== undefined && existing.facebook_url !== '' ? existing.facebook_url : (item.facebook_url || ''),
        organizer_request_notes: existing.organizer_request_notes || item.organizer_request_notes,
        organizer_request_date: existing.organizer_request_date || item.organizer_request_date,
        avatar_url: existing.avatar_url || item.avatar_url,
        favorite_genres: mergedGenres,
        onboarding_completed: mergedOnboarding,
        created_at: item.created_at || existing.created_at,
      };

      map.set(normEmail, mergedUser);
    }
  }

  // Garantizar que los administradores principales estén siempre presentes
  for (const adminEmail of MASTER_ADMIN_EMAILS) {
    if (!map.has(adminEmail.toLowerCase())) {
      map.set(adminEmail.toLowerCase(), {
        id: `admin-${adminEmail.split('@')[0]}`,
        email: adminEmail.toLowerCase(),
        full_name: adminEmail.includes('bretdesing') ? 'Rodwil Angulo (Admin)' : 'Jesús Hidalgo (Admin)',
        role: 'admin',
        organizer_status: 'approved',
        favorite_genres: ['salsa-y-bachata', 'bachata', 'salsa', 'rock', 'cachengue', 'tango', 'folklore', 'urbano'],
        onboarding_completed: true,
        created_at: '2026-01-01T00:00:00Z',
      });
    }
  }

  return Array.from(map.values());
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_DB);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return deduplicateUsers(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading saved users DB:', e);
    }
    return deduplicateUsers(INITIAL_USERS);
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading current auth user:', e);
    }
    return null;
  });

  const [showAuthModal, setShowAuthModal] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_USER);
      return !saved; // Solicita registro / login al abrir si no ha iniciado sesión
    } catch (e) {
      return true;
    }
  });
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'organizer'>('register');
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Guardar siempre el usuario actual en localStorage ante cambios
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_AUTH_USER);
      }
    } catch (e) {}
  }, [user]);

  // Guardar siempre la lista de usuarios en localStorage ante cambios
  useEffect(() => {
    try {
      if (usersList && usersList.length > 0) {
        localStorage.setItem(STORAGE_USERS_DB, JSON.stringify(usersList));
      }
    } catch (e) {}
  }, [usersList]);

  // Sincronización en tiempo real con la nube (Cross-Device)
  const syncFromCloud = async () => {
    try {
      const cloudReqs = await fetchCloudOrganizerRequests();
      if (cloudReqs && Array.isArray(cloudReqs)) {
        setUsersList((prev) => {
          const cloudProfiles: UserProfile[] = cloudReqs.map((cr) => ({
            id: cr.id,
            email: cr.email.toLowerCase().trim(),
            full_name: cr.full_name,
            first_name: cr.first_name,
            last_name: cr.last_name,
            zone: cr.zone,
            profile_type: cr.profile_type,
            teacher_academy: cr.teacher_academy,
            teacher_genres: cr.teacher_genres,
            teacher_days: cr.teacher_days,
            teacher_levels: cr.teacher_levels,
            venue_name_registered: cr.venue_name_registered,
            venue_capacity: cr.venue_capacity,
            venue_address: cr.venue_address,
            venue_features: cr.venue_features,
            role: isAdminEmail(cr.email) ? 'admin' : cr.role,
            organizer_status: isAdminEmail(cr.email) ? 'approved' : cr.organizer_status,
            organizer_request_date: cr.organizer_request_date,
            organizer_request_notes: cr.organizer_request_notes,
            phone: cr.phone,
            whatsapp_phone: cr.whatsapp_phone,
            instagram_handle: cr.instagram_handle,
            facebook_url: cr.facebook_url,
            favorite_genres: cr.favorite_genres,
            onboarding_completed: cr.onboarding_completed,
            avatar_url: cr.avatar_url,
            created_at: cr.created_at,
          }));

          return deduplicateUsers([...prev, ...cloudProfiles]);
        });

        // Si el usuario actual fue modificado o aprobado en la nube, actualizar su sesión
        setUser((current) => {
          if (!current) return null;
          const isMasterAdmin = isAdminEmail(current.email) || current.role === 'admin';
          const match = cloudReqs.find((cr) => cr.email.toLowerCase() === current.email.toLowerCase());
          if (match) {
            let changed = false;
            const updated: UserProfile = { ...current };
            const effectiveRole: UserRole = isMasterAdmin ? 'admin' : (match.role || current.role);
            if (effectiveRole !== current.role) {
              updated.role = effectiveRole;
              changed = true;
            }
            const effectiveStatus = isMasterAdmin ? 'approved' : (match.organizer_status || current.organizer_status);
            if (effectiveStatus !== current.organizer_status) {
              updated.organizer_status = effectiveStatus;
              changed = true;
            }
            // Solo sincronizar zona o tipo de perfil de la nube si el usuario local aún no los tiene definidos
            if (match.zone && !current.zone) {
              updated.zone = match.zone;
              changed = true;
            }
            if (match.profile_type && !current.profile_type) {
              updated.profile_type = match.profile_type;
              changed = true;
            }
            if (match.onboarding_completed && !current.onboarding_completed) {
              updated.onboarding_completed = true;
              changed = true;
            }
            if (match.favorite_genres && match.favorite_genres.length > 0 && (!current.favorite_genres || current.favorite_genres.length === 0)) {
              updated.favorite_genres = match.favorite_genres;
              changed = true;
            }
            return changed ? updated : current;
          } else if (isMasterAdmin && current.role !== 'admin') {
            return { ...current, role: 'admin', organizer_status: 'approved' };
          }
          return current;
        });
      }
    } catch (e) {
      console.warn('Sync cloud requests warning:', e);
    }
  };

  useEffect(() => {
    // Sincronización inicial y polling cada 4 segundos para recibir solicitudes en vivo
    syncFromCloud();
    const interval = setInterval(syncFromCloud, 4000);

    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_UPDATE') {
        syncFromCloud();
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

  const loginWithGooglePayload = (payload: GoogleUserPayload, zone?: string) => {
    const userEmail = (payload.email || '').toLowerCase().trim();
    const isMasterAdmin = isAdminEmail(userEmail);
    const isOrg = isAuthorizedOrganizer(userEmail);
    const onboardedList = getOnboardedEmails();

    const existing = usersList.find((u) => u.email.toLowerCase() === userEmail);
    
    let loggedUser: UserProfile;
    if (existing) {
      const alreadyCompleted = Boolean(
        existing.onboarding_completed ||
        isMasterAdmin ||
        isOrg ||
        onboardedList.includes(userEmail) ||
        (existing.favorite_genres && existing.favorite_genres.length > 0)
      );

      loggedUser = {
        ...existing,
        role: isMasterAdmin ? 'admin' : isOrg ? 'organizer' : existing.role,
        organizer_status: isMasterAdmin || isOrg ? 'approved' : existing.organizer_status,
        avatar_url: payload.picture || existing.avatar_url,
        full_name: payload.name || existing.full_name || (isMasterAdmin ? (userEmail.includes('bretdesing') ? 'Rodwil Angulo (Admin)' : 'Jesús Hidalgo (Admin)') : isOrg ? 'Organizador' : 'Bailarín de Sale Baile'),
        zone: zone?.trim() || existing.zone,
        onboarding_completed: alreadyCompleted,
        favorite_genres: (existing.favorite_genres && existing.favorite_genres.length > 0) ? existing.favorite_genres.map(g => g === 'caribeno' ? 'salsa-y-bachata' : g) : ['salsa-y-bachata', 'bachata', 'salsa'],
      };
      setUsersList((prev) => deduplicateUsers([loggedUser, ...prev.filter((u) => u.email.toLowerCase() !== userEmail)]));
    } else {
      const alreadyCompleted = Boolean(
        isMasterAdmin ||
        isOrg ||
        onboardedList.includes(userEmail)
      );

      loggedUser = {
        id: payload.sub ? `google-${payload.sub}` : `user-${Date.now()}`,
        email: userEmail || 'usuario@google.com',
        full_name: payload.name || (isMasterAdmin ? (userEmail.includes('bretdesing') ? 'Rodwil Angulo (Admin)' : 'Jesús Hidalgo (Admin)') : isOrg ? 'Organizador' : 'Bailarín de Sale Baile'),
        zone: zone?.trim(),
        role: isMasterAdmin ? 'admin' : isOrg ? 'organizer' : 'user',
        avatar_url: payload.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        favorite_genres: ['salsa-y-bachata', 'bachata', 'salsa'],
        onboarding_completed: alreadyCompleted,
        organizer_status: isMasterAdmin || isOrg ? 'approved' : 'none',
        created_at: new Date().toISOString(),
      };
      setUsersList((prev) => deduplicateUsers([loggedUser, ...prev]));
    }

    if (loggedUser.onboarding_completed) {
      markEmailOnboarded(userEmail);
    }

    setUser(loggedUser);
    setShowAuthModal(false);
    if (!loggedUser.onboarding_completed) {
      setShowPreferencesModal(true);
    }

    // Sincronizar usuario con la nube para que aparezca de inmediato en el panel de administración
    submitCloudOrganizerRequest(loggedUser).catch((err) => console.warn('Cloud user sync warning:', err));
  };

  const loginWithEmail = (inputEmail: string, fullName?: string, zone?: string) => {
    let emailNorm = (inputEmail || '').toLowerCase().trim();
    if (!emailNorm.includes('@')) {
      emailNorm = `${emailNorm.replace(/\s+/g, '')}@gmail.com`;
    } else if (emailNorm.startsWith('@') && !emailNorm.slice(1).includes('@')) {
      emailNorm = `${emailNorm.replace(/^@+/, '').replace(/\s+/g, '')}@gmail.com`;
    }
    const isMasterAdmin = isAdminEmail(emailNorm);
    const isOrg = isAuthorizedOrganizer(emailNorm);
    const onboardedList = getOnboardedEmails();

    const existing = usersList.find((u) => u.email.toLowerCase() === emailNorm);
    let loggedUser: UserProfile;

    if (existing) {
      const alreadyCompleted = Boolean(
        existing.onboarding_completed ||
        isMasterAdmin ||
        isOrg ||
        onboardedList.includes(emailNorm) ||
        (existing.favorite_genres && existing.favorite_genres.length > 0)
      );

      loggedUser = {
        ...existing,
        role: isMasterAdmin ? 'admin' : isOrg ? 'organizer' : existing.role,
        organizer_status: isMasterAdmin || isOrg ? 'approved' : existing.organizer_status,
        full_name: fullName || existing.full_name || (isMasterAdmin ? (emailNorm.includes('bretdesing') ? 'Rodwil Angulo (Admin)' : 'Jesús Hidalgo (Admin)') : 'Bailarín de Sale Baile'),
        zone: zone?.trim() || existing.zone,
        onboarding_completed: alreadyCompleted,
        favorite_genres: (existing.favorite_genres && existing.favorite_genres.length > 0) ? existing.favorite_genres.map(g => g === 'caribeno' ? 'salsa-y-bachata' : g) : ['salsa-y-bachata', 'bachata', 'salsa'],
      };
      setUsersList((prev) => deduplicateUsers(prev.map((u) => (u.email.toLowerCase() === emailNorm ? loggedUser : u))));
    } else if (isMasterAdmin) {
      loggedUser = {
        id: `admin-${emailNorm.split('@')[0]}`,
        email: emailNorm,
        full_name: fullName || (emailNorm.includes('bretdesing') ? 'Rodwil Angulo (Admin)' : 'Jesús Hidalgo (Admin)'),
        zone: zone?.trim(),
        role: 'admin',
        organizer_status: 'approved',
        favorite_genres: ['salsa-y-bachata', 'bachata', 'salsa', 'rock', 'cachengue', 'tango', 'folklore', 'urbano'],
        onboarding_completed: true,
        created_at: new Date().toISOString(),
      };
      setUsersList((prev) => deduplicateUsers([loggedUser, ...prev]));
    } else {
      const alreadyCompleted = Boolean(
        isOrg ||
        onboardedList.includes(emailNorm)
      );

      loggedUser = {
        id: `user-${Date.now()}`,
        email: emailNorm,
        full_name: fullName || (isOrg ? 'Organizador' : 'Bailarín de Sale Baile'),
        zone: zone?.trim(),
        role: isOrg ? 'organizer' : 'user',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        favorite_genres: ['salsa-y-bachata', 'bachata', 'salsa'],
        onboarding_completed: alreadyCompleted,
        organizer_status: isOrg ? 'approved' : 'none',
        created_at: new Date().toISOString(),
      };
      setUsersList((prev) => deduplicateUsers([loggedUser, ...prev]));
    }

    if (loggedUser.onboarding_completed) {
      markEmailOnboarded(emailNorm);
    }

    setUser(loggedUser);
    setShowAuthModal(false);
    if (!loggedUser.onboarding_completed) {
      setShowPreferencesModal(true);
    }

    // Sincronizar usuario con la nube para que aparezca de inmediato en el panel de administración
    submitCloudOrganizerRequest(loggedUser).catch((err) => console.warn('Cloud user sync warning:', err));
  };

  const loginAs = (_targetRole: UserRole, email?: string) => {
    loginWithEmail(email || 'usuario@hoybailamos.com');
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    
    // Auto-calculate full_name if first_name / last_name are updated
    let computedFullName = updates.full_name;
    if (!computedFullName && updates.first_name) {
      computedFullName = `${updates.first_name.trim()} ${updates.last_name?.trim() || ''}`.trim();
    }

    const updated: UserProfile = {
      ...user,
      ...updates,
      full_name: computedFullName || updates.full_name || user.full_name,
      phone: updates.phone || updates.whatsapp_phone || user.phone,
      whatsapp_phone: updates.whatsapp_phone || updates.phone || user.whatsapp_phone,
    };

    if (updates.onboarding_completed || (updates.favorite_genres && updates.favorite_genres.length > 0)) {
      updated.onboarding_completed = true;
      markEmailOnboarded(user.email);
    }

    setUser(updated);
    setUsersList((prev) => {
      const nextList = [updated, ...prev.filter((u) => u.email.toLowerCase() !== user.email.toLowerCase())];
      const deduped = deduplicateUsers(nextList);
      try {
        localStorage.setItem(STORAGE_USERS_DB, JSON.stringify(deduped));
      } catch (e) {}
      return deduped;
    });

    try {
      localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(updated));
    } catch (e) {}

    // Sincronizar perfil y preferencias en la nube
    try {
      await submitCloudOrganizerRequest(updated);
    } catch (err) {
      console.warn('Cloud user sync warning:', err);
    }
  };

  const updateUserById = async (userIdOrEmail: string, updates: Partial<UserProfile>) => {
    const target = (userIdOrEmail || '').toLowerCase().trim();
    if (!target) return;

    let updatedRecord: UserProfile | null = null;

    // Auto-calculate full_name if first_name / last_name are provided
    let computedFullName = updates.full_name;
    if (!computedFullName && updates.first_name) {
      computedFullName = `${updates.first_name.trim()} ${updates.last_name?.trim() || ''}`.trim();
    }

    setUsersList((prev) => {
      const nextList = prev.map((u) => {
        if (u.id.toLowerCase() === target || u.email.toLowerCase() === target) {
          const merged: UserProfile = {
            ...u,
            ...updates,
            full_name: computedFullName || updates.full_name || u.full_name,
            phone: updates.phone || updates.whatsapp_phone || u.phone,
            whatsapp_phone: updates.whatsapp_phone || updates.phone || u.whatsapp_phone,
          };
          updatedRecord = merged;
          return merged;
        }
        return u;
      });
      const deduped = deduplicateUsers(nextList);
      try {
        localStorage.setItem(STORAGE_USERS_DB, JSON.stringify(deduped));
      } catch (e) {}
      return deduped;
    });

    if (user && (user.id.toLowerCase() === target || user.email.toLowerCase() === target)) {
      setUser((prev) => {
        if (!prev) return null;
        const nextUser: UserProfile = {
          ...prev,
          ...updates,
          full_name: computedFullName || updates.full_name || prev.full_name,
          phone: updates.phone || updates.whatsapp_phone || prev.phone,
          whatsapp_phone: updates.whatsapp_phone || updates.phone || prev.whatsapp_phone,
        };
        try {
          localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(nextUser));
        } catch (e) {}
        return nextUser;
      });
    }

    if (updatedRecord) {
      submitCloudOrganizerRequest(updatedRecord).catch((err) => console.warn('Cloud user update error:', err));
    }
  };

  const requestOrganizerStatus = (notes?: string, extra?: { producerName?: string; whatsapp?: string; instagram?: string }) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      full_name: extra?.producerName || user.full_name,
      whatsapp_phone: extra?.whatsapp || user.whatsapp_phone,
      instagram_handle: extra?.instagram || user.instagram_handle,
      organizer_status: 'pending',
      organizer_request_date: new Date().toISOString(),
      organizer_request_notes: notes || 'Solicitud de cuenta organizador para publicar eventos y clases.',
    };
    setUser(updated);
    setUsersList((prev) => {
      const nextList = [updated, ...prev.filter((u) => u.email.toLowerCase() !== updated.email.toLowerCase())];
      const deduped = deduplicateUsers(nextList);
      try {
        localStorage.setItem(STORAGE_USERS_DB, JSON.stringify(deduped));
      } catch (e) {}
      return deduped;
    });
    try {
      localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(updated));
    } catch (e) {}

    // Sincronizar con la nube para que llegue de inmediato al Administrador en cualquier dispositivo
    submitCloudOrganizerRequest(updated).catch(err => console.warn('Cloud submit error:', err));
  };

  const approveOrganizer = (userId: string) => {
    let targetUser: UserProfile | undefined;
    setUsersList((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId || (targetUser && u.email.toLowerCase() === targetUser.email.toLowerCase())) {
          targetUser = u;
          return { ...u, role: 'organizer' as UserRole, organizer_status: 'approved' as const };
        }
        return u;
      });
      return deduplicateUsers(updated);
    });
    if (user?.id === userId || (targetUser && user?.email.toLowerCase() === (targetUser as UserProfile).email.toLowerCase())) {
      setUser((prev) => (prev ? { ...prev, role: 'organizer', organizer_status: 'approved' } : null));
    }

    // Actualizar en la nube
    const idOrEmail = targetUser?.email || userId;
    updateCloudOrganizerStatus(idOrEmail, 'approved').catch(err => console.warn('Cloud approve error:', err));
  };

  const rejectOrganizer = (userId: string) => {
    let targetUser: UserProfile | undefined;
    setUsersList((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId || (targetUser && u.email.toLowerCase() === targetUser.email.toLowerCase())) {
          targetUser = u;
          return { ...u, role: 'user' as UserRole, organizer_status: 'rejected' as const };
        }
        return u;
      });
      return deduplicateUsers(updated);
    });
    if (user?.id === userId || (targetUser && user?.email.toLowerCase() === (targetUser as UserProfile).email.toLowerCase())) {
      setUser((prev) => (prev ? { ...prev, role: 'user', organizer_status: 'rejected' } : null));
    }

    // Actualizar en la nube
    const idOrEmail = targetUser?.email || userId;
    updateCloudOrganizerStatus(idOrEmail, 'rejected').catch(err => console.warn('Cloud reject error:', err));
  };

  const registerOrganizerDirectly = (data: { full_name: string; email: string; whatsapp?: string; instagram?: string }) => {
    const normEmail = data.email.trim().toLowerCase();
    const newOrg: UserProfile = {
      id: `org-${Date.now()}`,
      email: normEmail,
      full_name: data.full_name.trim(),
      role: 'organizer',
      whatsapp_phone: data.whatsapp || '+5491155551234',
      instagram_handle: data.instagram || '@productora',
      organizer_status: 'approved',
      organizer_request_date: new Date().toISOString(),
      organizer_request_notes: 'Habilitado directamente por la Administración.',
      created_at: new Date().toISOString(),
    };

    setUsersList((prev) => {
      const existsIndex = prev.findIndex((u) => u.email.toLowerCase() === normEmail);
      let updated: UserProfile[];
      if (existsIndex >= 0) {
        updated = prev.map((u, i) => (i === existsIndex ? { ...u, ...newOrg, id: u.id } : u));
      } else {
        updated = [newOrg, ...prev];
      }
      const deduped = deduplicateUsers(updated);
      try {
        localStorage.setItem(STORAGE_USERS_DB, JSON.stringify(deduped));
      } catch (e) {}
      return deduped;
    });

    // Guardar en la nube como organizador habilitado
    submitCloudOrganizerRequest(newOrg).catch(err => console.warn('Cloud register error:', err));
  };

  const setUserRole = (userId: string, newRole: UserRole) => {
    let targetUser: UserProfile | undefined;
    setUsersList((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId || (targetUser && u.email.toLowerCase() === (targetUser as UserProfile).email.toLowerCase())) {
          targetUser = u;
          return {
            ...u,
            role: newRole,
            organizer_status: newRole === 'organizer' ? ('approved' as const) : ('none' as const),
          };
        }
        return u;
      });
      const deduped = deduplicateUsers(updated);
      try {
        localStorage.setItem(STORAGE_USERS_DB, JSON.stringify(deduped));
      } catch (e) {}
      return deduped;
    });

    if (user?.id === userId || (targetUser && user?.email.toLowerCase() === (targetUser as UserProfile).email.toLowerCase())) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              role: newRole,
              organizer_status: newRole === 'organizer' ? 'approved' : 'none',
            }
          : null
      );
    }

    if (targetUser) {
      const targetEmail = (targetUser as UserProfile).email || userId;
      updateCloudOrganizerStatus(targetEmail, newRole === 'organizer' ? 'approved' : 'none').catch((err) =>
        console.warn('Cloud role update error:', err)
      );
    }
  };

  const deleteUser = async (userIdOrEmail: string) => {
    const target = (userIdOrEmail || '').toLowerCase().trim();
    if (!target) return;

    setUsersList((prev) => {
      const filtered = prev.filter(
        (u) => u.id.toLowerCase() !== target && u.email.toLowerCase() !== target
      );
      const deduped = deduplicateUsers(filtered);
      try {
        localStorage.setItem(STORAGE_USERS_DB, JSON.stringify(deduped));
      } catch (e) {}
      return deduped;
    });

    if (user && (user.id.toLowerCase() === target || user.email.toLowerCase() === target)) {
      setUser(null);
    }

    try {
      await deleteCloudOrganizerRequest(target);
    } catch (e) {
      console.warn('Error deleting user from cloud:', e);
    }
  };

  const isUserAdmin = Boolean(user && (isAdminEmail(user.email) || user.role === 'admin'));
  const effectiveRole: UserRole | null = user
    ? (isUserAdmin ? 'admin' : (user.role || 'user'))
    : null;
  const effectiveUser: UserProfile | null = user
    ? {
        ...user,
        role: effectiveRole || user.role,
        organizer_status: isUserAdmin ? 'approved' : user.organizer_status,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        role: effectiveRole,
        isAuthenticated: Boolean(user),
        usersList,
        loginWithEmail,
        loginAs,
        loginWithGooglePayload,
        logout,
        updateProfile,
        updateUserById,
        requestOrganizerStatus,
        approveOrganizer,
        rejectOrganizer,
        registerOrganizerDirectly,
        setUserRole,
        deleteUser,
        syncFromCloud,
        showAuthModal,
        setShowAuthModal,
        authModalMode,
        setAuthModalMode,
        showPreferencesModal,
        setShowPreferencesModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
