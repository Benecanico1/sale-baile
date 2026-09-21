import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile } from '../../types';
import { compressAvatarFile } from '../../lib/mediaProcessor';
import {
  X,
  User,
  Phone,
  Save,
  CheckCircle,
  AlertCircle,
  MapPin,
  Camera,
  Trash2,
  Loader2,
} from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSave: (updates: {
    first_name: string;
    last_name: string;
    full_name: string;
    zone?: string;
    profile_type?: 'bailarin' | 'profesor' | 'organizador' | 'dueno_local';
    phone: string;
    whatsapp_phone: string;
    instagram_handle: string;
    facebook_url: string;
    teacher_academy?: string;
    teacher_days?: string[];
    teacher_levels?: string[];
    venue_name_registered?: string;
    venue_capacity?: number;
    venue_address?: string;
    avatar_url?: string;
  }) => Promise<void> | void;
  title?: string;
  subtitle?: string;
}

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CLASS_LEVELS = ['Principiante / Desde Cero', 'Intermedio', 'Avanzado', 'Multinivel'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  title = 'Editar Datos de Mi Perfil',
  subtitle = 'Mantén tu información de contacto, rol y presencia en la comunidad.',
}) => {
  // Infer initial first name & last name from existing profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [zone, setZone] = useState('');
  const [profileType, setProfileType] = useState<'bailarin' | 'profesor' | 'organizador' | 'dueno_local'>('bailarin');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados específicos para Profesor
  const [teacherAcademy, setTeacherAcademy] = useState('');
  const [teacherDays, setTeacherDays] = useState<string[]>([]);
  const [teacherLevels, setTeacherLevels] = useState<string[]>([]);

  // Estados específicos para Dueño de Local
  const [venueNameRegistered, setVenueNameRegistered] = useState('');
  const [venueCapacity, setVenueCapacity] = useState<number | ''>('');
  const [venueAddress, setVenueAddress] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const prevIsOpenRef = React.useRef(false);

  useEffect(() => {
    // Solo inicializar los campos cuando el modal pasa de cerrado a abierto
    if (isOpen && !prevIsOpenRef.current) {
      setError(null);
      setSavedSuccess(false);

      if (user?.first_name || user?.last_name) {
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
      } else if (user?.full_name) {
        const parts = user.full_name.trim().split(' ');
        if (parts.length > 1) {
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(' '));
        } else {
          setFirstName(user.full_name);
          setLastName('');
        }
      } else {
        setFirstName('');
        setLastName('');
      }

      setZone(user?.zone || '');
      setProfileType(user?.profile_type || (user?.role === 'organizer' ? 'organizador' : 'bailarin'));
      setPhone(user?.phone || user?.whatsapp_phone || '');
      setInstagram(user?.instagram_handle || '');
      setFacebook(user?.facebook_url || '');
      setAvatarUrl(user?.avatar_url || '');

      setTeacherAcademy(user?.teacher_academy || '');
      setTeacherDays(user?.teacher_days || []);
      setTeacherLevels(user?.teacher_levels || []);

      setVenueNameRegistered(user?.venue_name_registered || '');
      setVenueCapacity(user?.venue_capacity || '');
      setVenueAddress(user?.venue_address || '');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsProcessingAvatar(true);
    setError(null);
    try {
      const compressed = await compressAvatarFile(file);
      setAvatarUrl(compressed);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo procesar la imagen seleccionada.');
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanZone = zone.trim();
    let cleanInstagram = instagram.trim();
    const cleanPhone = phone.trim();
    let cleanFacebook = facebook.trim();

    // Normalizar formato de Instagram (@usuario) si fue provisto
    if (cleanInstagram) {
      if (cleanInstagram.includes('instagram.com/')) {
        const match = cleanInstagram.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
        if (match && match[1]) {
          cleanInstagram = `@${match[1]}`;
        }
      } else if (!cleanInstagram.startsWith('@')) {
        cleanInstagram = `@${cleanInstagram}`;
      }
    }

    // Normalizar formato de Facebook si fue provisto
    if (cleanFacebook && !cleanFacebook.startsWith('http://') && !cleanFacebook.startsWith('https://') && !cleanFacebook.includes('facebook.com')) {
      cleanFacebook = `https://facebook.com/${cleanFacebook.replace('@', '')}`;
    }

    const effectiveFirstName = cleanFirstName || user?.first_name || user?.full_name?.split(' ')[0] || 'Bailarín';
    const computedFullName = `${effectiveFirstName} ${cleanLastName}`.trim();

    setIsSaving(true);
    try {
      await onSave({
        first_name: effectiveFirstName,
        last_name: cleanLastName,
        full_name: computedFullName,
        zone: cleanZone,
        profile_type: profileType,
        phone: cleanPhone,
        whatsapp_phone: cleanPhone,
        instagram_handle: cleanInstagram,
        facebook_url: cleanFacebook,
        teacher_academy: teacherAcademy.trim(),
        teacher_days: teacherDays,
        teacher_levels: teacherLevels,
        venue_name_registered: venueNameRegistered.trim(),
        venue_capacity: typeof venueCapacity === 'number' ? venueCapacity : undefined,
        venue_address: venueAddress.trim(),
        avatar_url: avatarUrl,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Ocurrió un error al guardar los cambios.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 my-auto max-h-[95vh]"
      >
        {/* Cabecera del Modal */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/80 via-[#121624] to-[#0e111a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-dance-crimson to-pink-600 flex items-center justify-center text-white shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{title}</span>
              </h2>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con scroll si es pantalla chica */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-semibold">{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">¡Perfil actualizado correctamente!</span>
            </div>
          )}

          {/* Email Info (Read-only) */}
          {user?.email && (
            <div className="p-3 rounded-2xl bg-dark-950/80 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cuenta Asociada (Email)</span>
                <span className="text-xs font-mono text-slate-200">{user.email}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-400 border border-white/10 uppercase">
                {user.role}
              </span>
            </div>
          )}

          {/* Editor de Foto de Perfil */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-dark-900 via-[#101422] to-dark-950 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
            {/* Previsualización del Avatar */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-dance-crimson to-dance-coral p-0.5 shadow-glow-crimson overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#050508] rounded-full flex items-center justify-center text-white">
                    <User className="w-9 h-9 text-dance-coral" />
                  </div>
                )}
              </div>

              {/* Botón rápido sobre el avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-dance-crimson text-white flex items-center justify-center shadow-lg border-2 border-[#0e111a] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                title="Elegir foto"
              >
                {isProcessingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Controles de Foto */}
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-white">Foto de Perfil</span>
                <span className="text-[10px] text-dance-coral font-bold bg-dance-crimson/15 px-2 py-0.5 rounded-full border border-dance-crimson/30">
                  Visible en la comunidad
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sube o cambia tu foto desde la cámara o galería. Se recortará y optimizará automáticamente.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingAvatar}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Camera className="w-3.5 h-3.5 text-dance-coral" />
                  <span>{avatarUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    disabled={isProcessingAvatar}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 1. Nombre & Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                <span>Nombre</span>
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/20">
                  * Obligatorio
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej: Laura"
                  className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-dance-crimson focus:ring-1 focus:ring-dance-crimson rounded-2xl text-xs sm:text-sm text-white font-semibold transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Apellido</span>
                <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej: González"
                className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-dance-crimson focus:ring-1 focus:ring-dance-crimson rounded-2xl text-xs sm:text-sm text-white font-semibold transition-all outline-none"
              />
            </div>
          </div>

          {/* Selector de Rol en la Comunidad */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/25 via-dark-900 to-indigo-950/25 border border-purple-500/30 space-y-2.5">
            <label className="block text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-purple-400 font-black">🌟</span>
                <span>¿Cuál es tu rol principal en el baile?</span>
              </span>
              <span className="text-[10px] text-purple-300 font-bold bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-500/20">
                Comunidad
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'bailarin', label: 'Bailarín / Alumno', icon: '💃', desc: 'Bailo en sociales' },
                { id: 'profesor', label: 'Profesor / Instructor', icon: '🎓', desc: 'Doy clases y talleres' },
                { id: 'organizador', label: 'Organizador / RRPP', icon: '🎪', desc: 'Produzco eventos' },
                { id: 'dueno_local', label: 'Dueño de Local', icon: '🏢', desc: 'Tengo salón / pista' },
              ].map((r) => {
                const isSelected = profileType === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setProfileType(r.id as any)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-purple-900/60 to-purple-950/80 border-purple-400 text-white shadow-md shadow-purple-950/50 scale-[1.02]'
                        : 'bg-dark-950/60 border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <span className="text-lg block mb-1">{r.icon}</span>
                      <span className="text-xs font-extrabold block leading-tight">{r.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sección condicional: Profesor / Instructor de Baile */}
          {profileType === 'profesor' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/25 via-dark-900 to-teal-950/25 border border-emerald-500/40 space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>🎓</span> Datos de Profesor de Baile
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Visible en Clases
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Academia, Estudio o Escuela donde enseñas
                </label>
                <input
                  type="text"
                  value={teacherAcademy}
                  onChange={(e) => setTeacherAcademy(e.target.value)}
                  placeholder="Ej: Estudio Dance Flow / Clases Particulares"
                  className="w-full px-3 py-2 bg-dark-950 border border-emerald-500/30 focus:border-emerald-400 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Días que das clases habitualmente
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((day) => {
                    const isChecked = teacherDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setTeacherDays(teacherDays.filter((d) => d !== day));
                          } else {
                            setTeacherDays([...teacherDays, day]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isChecked
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                            : 'bg-dark-950/80 text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Niveles que impartes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CLASS_LEVELS.map((lvl) => {
                    const isChecked = teacherLevels.includes(lvl);
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setTeacherLevels(teacherLevels.filter((l) => l !== lvl));
                          } else {
                            setTeacherLevels([...teacherLevels, lvl]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isChecked
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-dark-950/80 text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sección condicional: Dueño de Local / Salón */}
          {profileType === 'dueno_local' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/25 via-dark-900 to-orange-950/25 border border-amber-500/40 space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>🏢</span> Datos del Local o Salón de Baile
                </span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Radar y Eventos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Nombre del Local / Salón
                  </label>
                  <input
                    type="text"
                    value={venueNameRegistered}
                    onChange={(e) => setVenueNameRegistered(e.target.value)}
                    placeholder="Ej: Melany Resto Bar / Club Social"
                    className="w-full px-3 py-2 bg-dark-950 border border-amber-500/30 focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Capacidad aprox.
                  </label>
                  <input
                    type="number"
                    value={venueCapacity}
                    onChange={(e) => setVenueCapacity(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ej: 250 personas"
                    className="w-full px-3 py-2 bg-dark-950 border border-amber-500/30 focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Dirección exacta del Local
                </label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Ej: Av. Presidente Perón 4500, José C. Paz"
                  className="w-full px-3 py-2 bg-dark-950 border border-amber-500/30 focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          {/* 2. Zona / Región (Zona Norte, Zona Sur, Zona Oeste, CABA, Provincias de Argentina) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/20 via-dark-900 to-sky-950/20 border border-sky-500/30 space-y-2.5">
            <label className="block text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>¿De qué zona o parte de Argentina eres?</span>
              </span>
              <span className="text-[10px] text-sky-300 font-bold bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/20">
                Tu Zona
              </span>
            </label>

            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-950 border border-sky-500/40 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-2xl text-xs sm:text-sm text-white font-bold transition-all outline-none"
            >
              <option value="">Selecciona tu zona o provincia...</option>
              <optgroup label="Buenos Aires & Conurbano (GBA)">
                <option value="Zona Norte (GBA)">📍 Zona Norte (GBA - San Isidro, Vicente López, San Martín, Tigre, Pilar, José C. Paz, etc.)</option>
                <option value="Zona Sur (GBA)">📍 Zona Sur (GBA - Quilmes, Lanús, Lomas de Zamora, Avellaneda, etc.)</option>
                <option value="Zona Oeste (GBA)">📍 Zona Oeste (GBA - Morón, Merlo, Moreno, Castelar, Ramos Mejía, etc.)</option>
                <option value="CABA / Capital Federal">🏙️ CABA / Capital Federal (Palermo, Almagro, Belgrano, Centro, etc.)</option>
                <option value="La Plata & Gran La Plata">🏛️ La Plata & Gran La Plata</option>
                <option value="Costa Atlántica">🌊 Costa Atlántica (Mar del Plata, etc.)</option>
                <option value="Interior de Buenos Aires">🌾 Interior de la Provincia de Buenos Aires</option>
              </optgroup>
              <optgroup label="Provincias de Argentina">
                <option value="Córdoba">🎸 Córdoba (Capital / Sierras / Villa María)</option>
                <option value="Santa Fe (Rosario / Santa Fe)">🚢 Santa Fe (Rosario / Santa Fe Capital)</option>
                <option value="Mendoza & Cuyo">🍇 Mendoza & Cuyo</option>
                <option value="Tucumán & NOA">☀️ Tucumán & NOA</option>
                <option value="Salta & Jujuy">🏔️ Salta & Jujuy</option>
                <option value="Entre Ríos & Litoral">🌿 Entre Ríos & Litoral</option>
                <option value="Chaco & Corrientes">🌴 Chaco & Corrientes</option>
                <option value="Patagonia">❄️ Patagonia (Neuquén, Río Negro, Chubut, etc.)</option>
                <option value="Otra zona / Exterior">🌎 Otra zona / Exterior</option>
              </optgroup>
            </select>

            {/* Opción de escribir ciudad o barrio específico */}
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="O escribe tu ciudad o barrio (ej: José C. Paz, Quilmes, Palermo...)"
              className="w-full px-3 py-2 bg-dark-950/80 border border-white/10 focus:border-sky-400 rounded-xl text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
            />
            <p className="text-[11px] text-slate-400">
              Nos ayuda a mostrarte los bailes, pistas y eventos más cercanos a tu ubicación.
            </p>
          </div>

          {/* 3. Instagram (@) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-950/20 via-dark-900 to-purple-950/20 border border-pink-500/30 space-y-2">
            <label className="block text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-pink-400 font-black">📷</span>
                <span>Instagram Oficial / Personal</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Opcional
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                onBlur={() => {
                  let val = instagram.trim();
                  if (val && !val.startsWith('@') && !val.includes('instagram.com/')) {
                    setInstagram(`@${val}`);
                  }
                }}
                placeholder="Ej: @laura_bachata"
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-pink-500/40 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 rounded-2xl text-xs sm:text-sm text-pink-300 font-bold transition-all outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Permite a los asistentes y organizadores identificarte en la pista y coordinar entradas.
            </p>
          </div>

          {/* 3. Teléfono / WhatsApp (Opcional) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Teléfono de Contacto / WhatsApp</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: +54 9 11 1234-5678"
              className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-2xl text-xs sm:text-sm text-white font-semibold transition-all outline-none"
            />
          </div>

          {/* 4. Facebook (Opcional) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-blue-400 font-black">📘</span>
                <span>Facebook (Perfil o Página)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </label>
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="Ej: facebook.com/laurabachata o laurabachata"
              className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-2xl text-xs sm:text-sm text-white font-semibold transition-all outline-none"
            />
          </div>

          {/* Pie de Acciones */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-dance-crimson via-dance-coral to-rose-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-dance-crimson/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : '💾 Guardar Datos del Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
