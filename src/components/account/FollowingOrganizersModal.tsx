import React, { useState, useMemo } from 'react';
import { X, Building, UserCheck, UserPlus, Sparkles, Calendar } from 'lucide-react';
import { useFollowing } from '../../context/FollowingContext';
import { getLocalEvents } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { EventItem } from '../../types';

interface FollowingOrganizersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface OrganizerItem {
  id: string;
  name: string;
  instagram?: string;
  eventsCount: number;
  genre?: string;
  avatar_url?: string;
  upcomingEvents: EventItem[];
}

export const FollowingOrganizersModal: React.FC<FollowingOrganizersModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { following, isFollowing, toggleFollow } = useFollowing();
  const { usersList } = useAuth();
  const [activeTab, setActiveTab] = useState<'following' | 'discover'>('following');

  // Obtener lista completa de organizadores y profesores del sistema
  const allOrganizers = useMemo<OrganizerItem[]>(() => {
    const events = getLocalEvents();
    const map = new Map<string, OrganizerItem>();

    // 1. Extraer organizadores de los eventos publicados
    events.forEach((evt) => {
      const orgName = evt.organizer_name?.trim();
      if (!orgName) return;
      const key = orgName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: orgName,
          instagram: evt.organizer_instagram,
          eventsCount: 1,
          genre: evt.genre_family,
          avatar_url: evt.flyer_url,
          upcomingEvents: [evt],
        });
      } else {
        const item = map.get(key)!;
        item.eventsCount += 1;
        item.upcomingEvents.push(evt);
        if (!item.instagram && evt.organizer_instagram) {
          item.instagram = evt.organizer_instagram;
        }
      }
    });

    // 2. Extraer profesores y organizadores de la base de usuarios
    usersList.forEach((u) => {
      if (u.role === 'organizer' || u.profile_type === 'profesor' || u.profile_type === 'organizador') {
        const name = u.full_name?.trim() || u.teacher_academy?.trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name: name,
            instagram: u.instagram_handle,
            eventsCount: 0,
            genre: u.teacher_genres?.[0] || 'baile',
            avatar_url: u.avatar_url,
            upcomingEvents: [],
          });
        }
      }
    });

    return Array.from(map.values());
  }, [usersList]);

  if (!isOpen) return null;

  const followedList = allOrganizers.filter((org) => isFollowing(org.name));
  const discoverList = allOrganizers.filter((org) => !isFollowing(org.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 my-auto max-h-[90vh]"
      >
        {/* Cabecera */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/80 via-[#121624] to-[#0e111a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Organizadores que Sigo</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {following.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Entérate de nuevas fechas, clases y sociales de tus ciclos favoritos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas: Siguiendo vs Descubrir */}
        <div className="flex border-b border-white/10 bg-dark-900/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Siguiendo ({followedList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'discover'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Descubrir ({discoverList.length})</span>
          </button>
        </div>

        {/* Lista con scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'following' && (
            <>
              {followedList.length === 0 ? (
                <div className="text-center py-8 px-4 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                    <Building className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Todavía no sigues a ningún organizador
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Sigue a tus productores y escuelas favoritas para no perderte ningún social.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Ver organizadores recomendados
                  </button>
                </div>
              ) : (
                followedList.map((org) => (
                  <div
                    key={org.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden shadow-md">
                        {org.avatar_url ? (
                          <img src={org.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          org.name.charAt(0)
                        )}
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{org.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                          {org.eventsCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                if (onNavigateTab) onNavigateTab('explore');
                              }}
                              className="text-purple-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Calendar className="w-3 h-3" />
                              {org.eventsCount} evento(s)
                            </button>
                          ) : (
                            <span>Organizador activo</span>
                          )}
                          {org.instagram && (
                            <span className="text-slate-400 truncate">{org.instagram}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFollow(org.name)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-500/20 hover:bg-rose-500/20 text-purple-300 hover:text-rose-300 border border-purple-500/30 hover:border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Siguiendo</span>
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'discover' && (
            <div className="space-y-3">
              {discoverList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  ¡Ya estás siguiendo a todos los organizadores disponibles! 🎉
                </div>
              ) : (
                discoverList.map((org) => (
                  <div
                    key={org.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-dance-crimson to-dance-coral flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden shadow-md">
                        {org.avatar_url ? (
                          <img src={org.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          org.name.charAt(0)
                        )}
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{org.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                          {org.eventsCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                if (onNavigateTab) onNavigateTab('explore');
                              }}
                              className="text-dance-coral hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Calendar className="w-3 h-3" />
                              {org.eventsCount} evento(s)
                            </button>
                          ) : (
                            <span>Organizador activo</span>
                          )}
                          {org.instagram && (
                            <span className="text-slate-400 truncate">{org.instagram}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFollow(org.name)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Seguir</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-white/10 bg-dark-950/80 text-center">
          <p className="text-[11px] text-slate-400">
            Recibirás novedades en tu agenda y cartelera de los organizadores que sigas.
          </p>
        </div>
      </div>
    </div>
  );
};
