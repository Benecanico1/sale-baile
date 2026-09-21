import React, { useState } from 'react';
import type { EventItem, EventMediaItem } from '../../types';
import { MediaGalleryUploader } from '../organizer/MediaGalleryUploader';
import { searchAddressGeocode } from '../../lib/geo';
import { DANCE_GENRE_FAMILIES } from '../../lib/danceCategories';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Search,
  Loader2,
  DollarSign,
  Send,
  AlertCircle,
} from 'lucide-react';

interface TeacherClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: Partial<EventItem>, isDraft: boolean) => void;
}

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CLASS_LEVELS = ['Principiante / Desde Cero', 'Intermedio', 'Avanzado', 'Multinivel'];

export const TeacherClassModal: React.FC<TeacherClassModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { user } = useAuth();

  const [title, setTitle] = useState(
    user?.full_name ? `Clases de Baile con ${user.full_name}` : 'Clase de Baile'
  );
  const [description, setDescription] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [gallery, setGallery] = useState<EventMediaItem[]>([]);

  // Ritmo de la clase
  const [genreFamily, setGenreFamily] = useState<string>('salsa-y-bachata');

  // Días de clase (Lunes a Domingo)
  const [selectedDays, setSelectedDays] = useState<string[]>(
    user?.teacher_days && user.teacher_days.length > 0 ? user.teacher_days : ['Lunes', 'Miércoles']
  );

  // Nivel
  const [classLevel, setClassLevel] = useState<string>('Multinivel');

  // Horario habitual
  const [startTime, setStartTime] = useState('19:30');
  const [endTime, setEndTime] = useState('21:00');

  // Lugar / Estudio / Salón
  const [venueName, setVenueName] = useState(user?.teacher_academy || '');
  const [address, setAddress] = useState(user?.zone || '');
  const [city, setCity] = useState(user?.zone || 'Buenos Aires');
  const [latitude, setLatitude] = useState(-34.5828);
  const [longitude, setLongitude] = useState(-58.4326);
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressResults, setAddressResults] = useState<any[]>([]);

  // Precio y Contacto
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('4000');
  const [advancePrice, setAdvancePrice] = useState('');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp_phone || user?.phone || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSearchAddress = async () => {
    if (!geocodeQuery.trim()) return;
    setIsSearchingAddress(true);
    try {
      const results = await searchAddressGeocode(geocodeQuery);
      setAddressResults(results);
    } catch {
      setAddressResults([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSelectAddress = (res: any) => {
    setAddress(res.display_name);
    setVenueName(res.name || venueName || 'Estudio de Baile');
    setLatitude(res.lat);
    setLongitude(res.lon);
    setCity(res.address?.city || res.address?.town || res.address?.suburb || 'Buenos Aires');
    setAddressResults([]);
    setGeocodeQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Por favor indica un título o nombre para tus clases.');
      return;
    }

    if (selectedDays.length === 0) {
      setError('Por favor selecciona al menos un día de la semana (ej: Lunes, Martes...).');
      return;
    }

    if (!address.trim()) {
      setError('Por favor indica la dirección o zona donde dictas las clases.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const eventDateStr = now.toISOString().split('T')[0];
    const fullStart = `${eventDateStr}T${startTime}:00`;
    const fullEnd = `${eventDateStr}T${endTime}:00`;

    const daysSummary = selectedDays.join(', ');
    const autoDescription = description.trim()
      ? description
      : `Clases regulares de ${genreFamily.replace('-', ' ')}. Días: ${daysSummary}. Horario: ${startTime} a ${endTime} hs. Nivel: ${classLevel}. ¡No hace falta venir en pareja!`;

    const eventPayload: Partial<EventItem> = {
      title: title.trim(),
      description: autoDescription,
      category: 'clase',
      genre_family: genreFamily,
      subgenres: [`clase-${genreFamily}`],
      class_days: selectedDays,
      class_level: classLevel,
      event_target: 'clase_profesor',
      start_time: fullStart,
      end_time: fullEnd,
      venue_name: venueName.trim() || 'Estudio de Baile',
      address: address.trim(),
      city: city.trim() || 'Buenos Aires',
      latitude,
      longitude,
      flyer_url: flyerUrl || (gallery[0]?.url || ''),
      gallery,
      is_free: isFree,
      price: isFree ? 0 : Number(price) || undefined,
      advance_ticket_price: advancePrice ? Number(advancePrice) : undefined,
      advance_tickets_whatsapp: whatsapp.trim() || undefined,
      organizer_name: user?.full_name || 'Profesor de Baile',
      organizer_whatsapp: whatsapp.trim() || undefined,
      organizer_instagram: user?.instagram_handle || undefined,
      organizer_notes_to_admin: `Publicado por Profesor: ${user?.full_name || ''}. Días: ${daysSummary}`,
    };

    onSubmit(eventPayload, false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 my-auto max-h-[95vh]">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/80 via-[#121624] to-[#0e111a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Espacio de Profesores: Publicar Clase</span>
              </h2>
              <p className="text-xs text-emerald-300">
                Llega a miles de alumnos y difunde tus días y horarios de baile.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-semibold">{error}</span>
            </div>
          )}

          {/* 1. Flyer / Fotos de la clase */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-white/10 space-y-2">
            <label className="block text-xs font-bold text-white">
              Flyer o Foto de tus Clases
            </label>
            <MediaGalleryUploader
              items={gallery}
              onChange={(items) => {
                setGallery(items);
                if (items.length > 0 && !flyerUrl) {
                  setFlyerUrl(items[0].url);
                }
              }}
            />
          </div>

          {/* 2. Título y Ritmo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-white mb-1.5">
                Nombre de la Clase / Taller *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Clases de Bachata Sensual con Laura & Maxi"
                className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-emerald-400 rounded-2xl text-xs sm:text-sm text-white font-semibold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Ritmo Principal
              </label>
              <select
                value={genreFamily}
                onChange={(e) => setGenreFamily(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-emerald-400 rounded-2xl text-xs sm:text-sm text-white font-semibold outline-none"
              >
                {DANCE_GENRE_FAMILIES.map((fam) => (
                  <option key={fam.id} value={fam.id}>
                    {fam.icon} {fam.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Días de la Semana (Lunes a Domingo) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/20 via-dark-900 to-teal-950/20 border border-emerald-500/30 space-y-2.5">
            <label className="block text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>¿Qué días de la semana dictas la clase? *</span>
              </span>
              <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Seleccioná los días
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/40 scale-105'
                        : 'bg-dark-950 text-slate-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Horario & Nivel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hora Inicio</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-white/15 focus:border-emerald-400 rounded-xl text-xs sm:text-sm text-white font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hora Fin</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-white/15 focus:border-emerald-400 rounded-xl text-xs sm:text-sm text-white font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nivel de la Clase
              </label>
              <select
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-white/15 focus:border-emerald-400 rounded-xl text-xs sm:text-sm text-white font-semibold outline-none"
              >
                {CLASS_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Ubicación / Estudio */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>Ubicación y Lugar donde se dicta *</span>
              </label>
              <span className="text-[10px] text-sky-300 font-bold">Aparecerá en el Radar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Estudio, Salón o Local
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Ej: Estudio Dance Flow / Melany"
                  className="w-full px-3 py-2 bg-dark-950 border border-white/10 focus:border-sky-400 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Dirección o Zona
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Corrientes 1500, CABA"
                  className="w-full px-3 py-2 bg-dark-950 border border-white/10 focus:border-sky-400 rounded-xl text-xs text-white outline-none"
                  required
                />
              </div>
            </div>

            {/* Buscador inteligente de mapa */}
            <div className="pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={geocodeQuery}
                  onChange={(e) => setGeocodeQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchAddress();
                    }
                  }}
                  placeholder="Buscar dirección en el mapa para ubicarla exacto..."
                  className="flex-1 px-3 py-1.5 bg-dark-950 border border-white/10 focus:border-sky-400 rounded-xl text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isSearchingAddress}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSearchingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Ubicar</span>
                </button>
              </div>

              {addressResults.length > 0 && (
                <div className="mt-2 divide-y divide-white/5 bg-dark-950 rounded-xl border border-white/10 max-h-36 overflow-y-auto">
                  {addressResults.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectAddress(r)}
                      className="p-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{r.display_name}</span>
                      <span className="text-[10px] text-sky-400 font-bold ml-2 shrink-0">Seleccionar</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 6. Precios & WhatsApp de contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>Precio por Clase</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFree(!isFree)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isFree ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-dark-950 text-slate-400 border-white/10'
                  }`}
                >
                  {isFree ? 'Gratis' : 'Paga'}
                </button>
                {!isFree && (
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ej: 4000"
                    className="w-full px-3 py-2 bg-dark-900 border border-white/15 focus:border-amber-400 rounded-xl text-xs sm:text-sm text-amber-300 font-bold outline-none"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Mensualidad / Pase Promo (Opcional)
              </label>
              <input
                type="number"
                value={advancePrice}
                onChange={(e) => setAdvancePrice(e.target.value)}
                placeholder="Ej: 14000 mensual"
                className="w-full px-3 py-2 bg-dark-900 border border-white/15 focus:border-amber-400 rounded-xl text-xs sm:text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                WhatsApp para Inscripciones
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej: +54 9 11 1234-5678"
                className="w-full px-3 py-2 bg-dark-900 border border-white/15 focus:border-emerald-400 rounded-xl text-xs sm:text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* 7. Descripción / Información Adicional */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Detalle de la Clase / Programa
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="¿Qué van a aprender? ¿Se necesita experiencia previa? ¿Hay promos para parejas o grupos?"
              className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-emerald-400 rounded-2xl text-xs text-white outline-none resize-none"
            />
          </div>

          {/* Botones */}
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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Publicando...' : 'Publicar Clase en Sale Baile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
