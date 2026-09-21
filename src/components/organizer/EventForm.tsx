import React, { useState } from 'react';
import type { EventCategory, EventItem, EventMediaItem } from '../../types';
import { MediaGalleryUploader } from './MediaGalleryUploader';
import { searchAddressGeocode } from '../../lib/geo';
import { DANCE_GENRE_FAMILIES, getGenreFamilyById } from '../../lib/danceCategories';
import { MASTER_ADMIN_WHATSAPP, useAuth } from '../../context/AuthContext';
import { createFeaturedEventPreference } from '../../lib/mercadopago';
import {
  Calendar,
  MapPin,
  Search,
  Save,
  Send,
  AlertCircle,
  Loader2,
  Check,
  Music,
  MessageCircle,
  Lock,
  Star,
  Clock,
  Copy,
  Sparkles,
  CreditCard,
  Info,
  Ticket,
  Image as ImageIcon,
} from 'lucide-react';

interface EventFormProps {
  initialEvent?: Partial<EventItem>;
  onSubmit: (eventData: Partial<EventItem>, isDraft: boolean) => void;
  onCancel: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({ initialEvent, onSubmit, onCancel }) => {
  const { user } = useAuth();

  const isUserAdmin = Boolean(user?.role === 'admin' || (user?.email && user.email === 'jesushidalgo25@gmail.com'));
  const isVerifiedOrg = user?.organizer_status === 'approved' || user?.role === 'organizer';
  const isTeacher = user?.profile_type === 'profesor';

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [flyerUrl, setFlyerUrl] = useState(initialEvent?.flyer_url || '');

  const initialGallery: EventMediaItem[] =
    initialEvent?.gallery && initialEvent.gallery.length > 0
      ? initialEvent.gallery
      : initialEvent?.flyer_url
      ? [{ id: 'init-1', type: 'image', url: initialEvent.flyer_url, thumbnail_url: initialEvent.flyer_url }]
      : [];
  const [gallery, setGallery] = useState<EventMediaItem[]>(initialGallery);

  const [category, setCategory] = useState<EventCategory>(initialEvent?.category || (isTeacher ? 'clase' : 'social'));
  const [genreFamily, setGenreFamily] = useState<string>(
    initialEvent?.genre_family === 'caribeno'
      ? 'salsa-y-bachata'
      : initialEvent?.genre_family || 'salsa-y-bachata'
  );
  const [subgenres, setSubgenres] = useState<string[]>(
    initialEvent?.subgenres || ['social-salsa-bachata']
  );

  // Clases recurrentes para profesores
  const [isRecurringWeekly, setIsRecurringWeekly] = useState<boolean>(initialEvent?.is_recurring_weekly || false);
  const [selectedClassDays, setSelectedClassDays] = useState<string[]>(
    initialEvent?.class_days || (user?.teacher_days && user.teacher_days.length > 0 ? user.teacher_days : ['Lunes', 'Miércoles'])
  );
  const [classLevel, setClassLevel] = useState<string>(
    initialEvent?.class_level || (user?.teacher_levels && user.teacher_levels.length > 0 ? user.teacher_levels[0] : 'Multinivel')
  );

  // Fechas y horarios
  const defaultStartDate = initialEvent?.start_time
    ? new Date(initialEvent.start_time).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const defaultStartTime = initialEvent?.start_time
    ? new Date(initialEvent.start_time).toTimeString().slice(0, 5)
    : '22:00';
  const defaultEndTime = initialEvent?.end_time
    ? new Date(initialEvent.end_time).toTimeString().slice(0, 5)
    : '05:00';

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [crossesMidnight, setCrossesMidnight] = useState(true);

  // Cierre de Venta de Anticipadas (Fecha y Hora Límite)
  const [hasAdvanceDeadline, setHasAdvanceDeadline] = useState<boolean>(
    Boolean(initialEvent?.advance_sales_end_date || initialEvent?.advance_sales_end_time)
  );
  const [advanceEndDate, setAdvanceEndDate] = useState<string>(
    initialEvent?.advance_sales_end_date || defaultStartDate
  );
  const [advanceEndTime, setAdvanceEndTime] = useState<string>(
    initialEvent?.advance_sales_end_time || '20:00'
  );

  // Espacio Promocionado en Destacados ($3.500 ARS)
  const [requestFeatured, setRequestFeatured] = useState<boolean>(initialEvent?.is_featured || false);
  const [featuredPaymentRef, setFeaturedPaymentRef] = useState<string>('');
  const [copiedMpAlias, setCopiedMpAlias] = useState(false);
  const [isPayingFeaturedMp, setIsPayingFeaturedMp] = useState(false);
  const [featuredMpError, setFeaturedMpError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);

  const handlePayFeaturedWithMercadoPago = async () => {
    try {
      setIsPayingFeaturedMp(true);
      setFeaturedMpError(null);
      const pref = await createFeaturedEventPreference({
        eventTitle: title.trim() || 'Evento Sale Baile',
        organizerEmail: user?.email,
        eventId: initialEvent?.id,
      });
      window.location.href = pref.init_point;
    } catch (err: any) {
      console.error('Error al generar cobro de destacado:', err);
      setFeaturedMpError(err?.message || 'No se pudo conectar con Mercado Pago. Intenta nuevamente.');
      setIsPayingFeaturedMp(false);
    }
  };

  // Ubicación
  const [venueName, setVenueName] = useState(initialEvent?.venue_name || '');
  const [address, setAddress] = useState(initialEvent?.address || '');
  const [city, setCity] = useState(initialEvent?.city || 'Buenos Aires (Palermo)');
  const [latitude, setLatitude] = useState(initialEvent?.latitude || -34.5828);
  const [longitude, setLongitude] = useState(initialEvent?.longitude || -58.4326);
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressResults, setAddressResults] = useState<any[]>([]);

  // Precios y Modalidad de Entradas (anticipada, puerta, ambas)
  const [isFree, setIsFree] = useState(initialEvent?.is_free || false);
  const getInitialSaleType = (): 'anticipada' | 'puerta' | 'ambas' => {
    if (initialEvent) {
      const hasAdv = Boolean(initialEvent.advance_ticket_price && initialEvent.advance_ticket_price > 0);
      const hasDoor = Boolean(initialEvent.price && initialEvent.price > 0);
      if (hasAdv && hasDoor) return 'ambas';
      if (hasAdv && !hasDoor) return 'anticipada';
      if (!hasAdv && hasDoor) return 'puerta';
    }
    return 'ambas';
  };
  const [ticketSaleType, setTicketSaleType] = useState<'anticipada' | 'puerta' | 'ambas'>(getInitialSaleType);
  const [price, setPrice] = useState(initialEvent?.price ? String(initialEvent.price) : '6000');
  const [advancePrice, setAdvancePrice] = useState(
    initialEvent?.advance_ticket_price ? String(initialEvent.advance_ticket_price) : '5000'
  );
  const [organizerNotesToAdmin, setOrganizerNotesToAdmin] = useState(
    initialEvent?.organizer_notes_to_admin || ''
  );
  const ticketsUrl = initialEvent?.tickets_url || '';

  // Contactos (tomados automáticamente del perfil del organizador)
  const organizerName =
    initialEvent?.organizer_name ||
    user?.full_name ||
    'Bachata Producciones';

  const instagram =
    initialEvent?.organizer_instagram ||
    user?.instagram_handle ||
    (user?.email ? `@${user.email.split('@')[0]}` : '@organizador_oficial');

  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedFamily = getGenreFamilyById(genreFamily);

  const toggleSubgenre = (subId: string) => {
    setSubgenres((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleFamilyChange = (famId: string) => {
    setGenreFamily(famId);
    const fam = getGenreFamilyById(famId);
    if (fam && fam.subgenres.length > 0) {
      setSubgenres([fam.subgenres[0].id]);
    } else {
      setSubgenres([]);
    }
  };

  const handleSearchAddress = async () => {
    if (!geocodeQuery.trim()) return;
    setIsSearchingAddress(true);
    const res = await searchAddressGeocode(geocodeQuery);
    setAddressResults(res);
    setIsSearchingAddress(false);
  };

  const handleSelectGeocodeResult = (res: any) => {
    setAddress(res.road || res.display_name.split(',')[0]);
    setCity(res.city || 'Buenos Aires');
    setLatitude(res.lat);
    setLongitude(res.lon);
    setAddressResults([]);
  };

  const handleGalleryChange = (newGallery: EventMediaItem[]) => {
    setGallery(newGallery);
    if (newGallery.length > 0) {
      const cover = newGallery[0];
      setFlyerUrl(cover.thumbnail_url || cover.url);
    } else {
      setFlyerUrl('');
    }
  };

  const handleSubmit = (isDraft: boolean) => {
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('El título del evento es obligatorio.');
      return;
    }
    if (gallery.length === 0 && !flyerUrl) {
      setValidationError('Debes subir al menos una foto o video para el flyer del evento.');
      return;
    }
    if (!venueName.trim() || !address.trim()) {
      setValidationError('El nombre del lugar y la dirección son obligatorios.');
      return;
    }

    const startObj = new Date(`${startDate}T${startTime}:00`);
    const endObj = new Date(`${startDate}T${endTime}:00`);
    if (crossesMidnight || endTime <= startTime) {
      endObj.setDate(endObj.getDate() + 1);
    }

    if (endObj.getTime() <= startObj.getTime()) {
      setValidationError('El horario de finalización debe ser posterior al inicio.');
      return;
    }

    const currentCover = gallery[0]?.thumbnail_url || gallery[0]?.url || flyerUrl;
    const numPrice = (!isFree && (ticketSaleType === 'puerta' || ticketSaleType === 'ambas'))
      ? (parseFloat(price) || undefined)
      : undefined;
    const numAdvance = (!isFree && (ticketSaleType === 'anticipada' || ticketSaleType === 'ambas'))
      ? (parseFloat(advancePrice) || undefined)
      : undefined;

    if (!isFree) {
      if (ticketSaleType === 'anticipada' && !numAdvance) {
        setValidationError('Por favor ingresa el precio de venta anticipada.');
        return;
      }
      if (ticketSaleType === 'puerta' && !numPrice) {
        setValidationError('Por favor ingresa el precio de entrada en puerta.');
        return;
      }
      if (ticketSaleType === 'ambas' && (!numPrice || !numAdvance)) {
        setValidationError('Por favor ingresa tanto el precio en puerta como el precio de venta anticipada.');
        return;
      }
    }

    // Si el organizador o profesor ya está verificado, o es admin, auto-publicar directo
    const shouldAutoPublish = isUserAdmin || isVerifiedOrg || (isTeacher && category === 'clase');

    const payload: Partial<EventItem> = {
      title,
      description: description || '¡Gran noche de baile y diversión!',
      flyer_url: currentCover,
      gallery: gallery.length > 0 ? gallery : [{ id: `med-${Date.now()}`, type: 'image', url: currentCover, thumbnail_url: currentCover }],
      category,
      genre_family: genreFamily,
      subgenres,
      class_days: category === 'clase' && isRecurringWeekly ? selectedClassDays : undefined,
      class_level: category === 'clase' ? classLevel : undefined,
      is_recurring_weekly: category === 'clase' ? isRecurringWeekly : false,
      start_time: startObj.toISOString(),
      end_time: endObj.toISOString(),
      timezone: 'America/Argentina/Buenos_Aires',
      venue_name: venueName,
      address,
      city,
      province: 'Capital Federal',
      country: 'Argentina',
      latitude,
      longitude,
      is_free: isFree,
      price: isFree ? undefined : (numPrice || (ticketSaleType === 'anticipada' ? numAdvance : undefined)),
      advance_ticket_price: isFree ? undefined : numAdvance,
      advance_sales_end_date: (!isFree && hasAdvanceDeadline && advanceEndDate) ? advanceEndDate : undefined,
      advance_sales_end_time: (!isFree && hasAdvanceDeadline && advanceEndTime) ? advanceEndTime : undefined,
      organizer_notes_to_admin: (requestFeatured ? `[SOLICITUD DESTACADO $3500 - Ref: ${featuredPaymentRef || 'Pendiente'}] ` : '') + (organizerNotesToAdmin || ''),
      currency: 'ARS',
      tickets_url: ticketsUrl || undefined,
      advance_tickets_whatsapp: MASTER_ADMIN_WHATSAPP,
      organizer_name: organizerName,
      organizer_whatsapp: undefined,
      organizer_instagram: instagram || undefined,
      is_featured: requestFeatured,
      featured_fee_paid: requestFeatured ? Boolean(featuredPaymentRef.trim()) : false,
      status: isDraft ? 'borrador' : (shouldAutoPublish ? 'publicado' : 'pendiente'),
    };

    onSubmit(payload, isDraft);
  };

  return (
    <div className="bg-[#0e111a] border border-white/10 rounded-3xl p-5 sm:p-8 space-y-6 max-w-3xl mx-auto shadow-2xl">
      <div className="border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-dance-coral/15 text-dance-coral text-[11px] font-black uppercase tracking-wider border border-dance-coral/30">
            Canal de Publicación & Moderación
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          {initialEvent?.id
            ? 'Editar Evento o Clase'
            : isVerifiedOrg || isTeacher
            ? 'Publicar Flyer o Clase (Auto-publicación Habilitada)'
            : 'Solicitar Publicación de Flyer & Evento'}
        </h2>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          {isVerifiedOrg || isTeacher
            ? 'Como organizador verificado o profesor, tu publicación se subirá de forma directa a la cartelera oficial.'
            : 'Completá la información de tu fiesta o clase para la revisión y publicación oficial de tu flyer en Sale Baile.'}
        </p>

        {/* Alerta informativa sobre Auto-Publicación o Moderación */}
        {isVerifiedOrg || isTeacher ? (
          <div className="mt-3.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200/90 leading-relaxed flex items-start gap-2.5">
            <span className="text-base shrink-0">⚡</span>
            <div>
              <strong className="text-emerald-300 font-bold block mb-0.5">Auto-Publicación Activada:</strong>
              Estás verificado por la administración. Al presionar <strong>"Publicar Flyer Inmediatamente"</strong> tu flyer quedará visible al instante para todos los bailarines sin necesidad de autorización previa.
            </div>
          </div>
        ) : (
          <div className="mt-3.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
            <span className="text-base shrink-0">⭐</span>
            <div>
              <strong className="text-amber-300 font-bold block mb-0.5">Proceso de Moderación:</strong>
              Al ser tu primera publicación, se revisará brevemente para verificar los datos de locación y asegurar la calidad de la cartelera.
            </div>
          </div>
        )}
      </div>

      {/* Stepper Visual 1 - 2 - 3 - 4 (Pantalla 10 de la Maqueta) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-1.5 bg-black/50 border border-white/10 rounded-2xl shadow-inner">
        {[
          { step: 1, label: 'Info Básica', icon: Info },
          { step: 2, label: 'Lugar & Fecha', icon: MapPin },
          { step: 3, label: 'Entradas', icon: Ticket },
          { step: 4, label: 'Flyer & Difusión', icon: ImageIcon },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.step;
          const isDone = activeStep > s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setActiveStep(s.step)}
              className={`py-2 px-1.5 sm:px-3 rounded-xl text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white font-black shadow-glow-crimson'
                  : isDone
                  ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                isActive
                  ? 'bg-white text-slate-950 shadow-sm'
                  : isDone
                  ? 'bg-emerald-400 text-slate-950 font-black'
                  : 'bg-white/10 text-slate-300'
              }`}>
                {isDone ? '✓' : s.step}
              </div>
              <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <span className="text-[10px] sm:text-xs truncate">{s.label}</span>
            </button>
          );
        })}
      </div>

      {validationError && (
        <div className="p-3.5 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <MediaGalleryUploader items={gallery} onChange={handleGalleryChange} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Título del Evento <span className="text-dance-crimson">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Noche Caribeña • Bachata Dominicana & Salsa"
            className="w-full px-4 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Formato</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className="w-full px-3.5 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-dance-crimson"
          >
            <option value="social">🍸 Social / Matiné</option>
            <option value="clase">🕺 Clase</option>
            <option value="taller">🎯 Taller</option>
            <option value="festival">🎪 Festival</option>
            <option value="practica">🎧 Práctica</option>
          </select>
        </div>
      </div>

      {/* Selector de Género de Baile & Subgéneros */}
      <div className="p-4 bg-[#151a27] rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-dance-coral uppercase tracking-wider">
          <Music className="w-4 h-4" />
          <span>Categoría de Baile & Ritmos Musicales</span>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-2">Selecciona la Familia Principal:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DANCE_GENRE_FAMILIES.map((fam) => {
              const isSelected = genreFamily === fam.id;
              return (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => handleFamilyChange(fam.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs font-bold flex items-center gap-2 ${
                    isSelected
                      ? `${fam.badgeBg} ${fam.badgeText} ${fam.border} ring-2 ring-current scale-102`
                      : 'bg-[#1a2030] border-white/10 text-slate-300 hover:bg-[#252e44]'
                  }`}
                >
                  <span className="text-base">{fam.icon}</span>
                  <span className="truncate">{fam.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedFamily && selectedFamily.subgenres.length > 0 && (
          <div className="pt-2 border-t border-white/5 space-y-2">
            <label className="block text-xs text-slate-400">
              ¿Qué ritmos específicos sonarán? (marca todos los que apliquen):
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedFamily.subgenres.map((sub) => {
                const isChecked = subgenres.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleSubgenre(sub.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      isChecked
                        ? 'bg-dance-crimson text-white border-dance-crimson shadow-sm'
                        : 'bg-[#1a2030] text-slate-300 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span>{isChecked ? '✓' : '+'}</span>
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modalidad de Clases Fijas / Recurrentes para Profesores */}
      {(category === 'clase' || isTeacher) && (
        <div className="p-4 bg-gradient-to-br from-indigo-950/30 via-[#151a27] to-[#121624] rounded-2xl border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <span className="text-base">🎓</span>
              <span>Modalidad de Clases Semanales</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-black border border-indigo-500/30">
              Profesor / Academia
            </span>
          </div>

          <label className="flex items-start gap-3 p-3 bg-black/30 border border-indigo-500/20 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurringWeekly}
              onChange={(e) => setIsRecurringWeekly(e.target.checked)}
              className="mt-0.5 rounded bg-dark-800 border-indigo-400 text-indigo-500 focus:ring-indigo-500"
            />
            <div>
              <span className="text-xs font-bold text-white block">
                ¿Es una clase fija todas las semanas? (Recurrente sin caducidad)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Al activar esta opción, <strong>no necesitarás subir flyers todas las semanas</strong>. La clase se mantendrá activa automáticamente para los días elegidos en la cartelera y agenda oficial.
              </p>
            </div>
          </label>

          {isRecurringWeekly && (
            <div className="space-y-3 pt-1 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ¿Qué días de la semana dictas esta clase?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => {
                    const isSelected = selectedClassDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSelectedClassDays((prev) =>
                            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md scale-102'
                            : 'bg-[#1a2030] text-slate-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {isSelected ? `✓ ${day}` : day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nivel de la Clase
                </label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 bg-dark-800 border border-indigo-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="Inicial / Principiantes">Inicial / Principiantes (Desde cero)</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                  <option value="Multinivel">Multinivel (Todos los niveles)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-dark-850 rounded-2xl border border-dark-750 space-y-4">
        <h3 className="text-xs font-bold text-dance-crimson uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          Fecha y Horarios
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Día del Evento</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Hora Inicio</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Hora Fin</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
          <input
            type="checkbox"
            checked={crossesMidnight}
            onChange={(e) => setCrossesMidnight(e.target.checked)}
            className="rounded bg-dark-800 border-dark-700 text-dance-crimson focus:ring-dance-crimson"
          />
          <span>El evento termina después de medianoche (madrugada del día siguiente)</span>
        </label>
      </div>

      <div className="p-4 bg-dark-850 rounded-2xl border border-dark-750 space-y-4">
        <h3 className="text-xs font-bold text-dance-orange uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          Lugar y Dirección Exacta
        </h3>

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-400">Buscar dirección para autocompletar coordenadas</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={geocodeQuery}
              onChange={(e) => setGeocodeQuery(e.target.value)}
              placeholder="Ej: Humboldt 1980 Palermo, Av Corrientes 5200..."
              className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSearchAddress}
              disabled={isSearchingAddress}
              className="px-3.5 py-2 bg-dark-750 hover:bg-dark-700 text-slate-200 text-xs font-medium rounded-xl border border-dark-700 flex items-center gap-1.5"
            >
              {isSearchingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Buscar
            </button>
          </div>

          {addressResults.length > 0 && (
            <div className="p-2 bg-dark-800 rounded-xl border border-dark-700 space-y-1">
              {addressResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectGeocodeResult(r)}
                  className="w-full text-left p-2 rounded-lg text-xs text-slate-200 hover:bg-dark-700 flex items-center justify-between"
                >
                  <span className="truncate pr-2">{r.display_name}</span>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre del Lugar / Boliche</label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Ej: Club Palermo Groove"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Dirección (Calle y Número)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Humboldt 1980"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Ciudad o Localidad</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej: Buenos Aires (Palermo)"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Latitud</label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full px-2.5 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Longitud</label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full px-2.5 py-2 bg-dark-800 border border-dark-700 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Entradas y Precios al Público */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-[#121624] via-dark-850 to-[#181a26] rounded-2xl border border-emerald-500/20 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <span className="text-base">🎟️</span>
          <span>Precios de Entradas al Público</span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="rounded bg-dark-800 border-dark-700 text-emerald-500 focus:ring-emerald-500"
          />
          <span>¿Es un evento con entrada gratuita?</span>
        </label>

        {!isFree && (
          <div className="space-y-4 pt-1">
            {/* 3 Botones de Modalidad de Venta */}
            <div className="p-4 bg-dark-800/90 rounded-2xl border border-white/10 space-y-3">
              <div>
                <span className="text-xs font-bold text-white block uppercase tracking-wider">
                  ¿Cómo se venderán las entradas?
                </span>
                <span className="text-[11px] text-slate-400">
                  {ticketSaleType === 'anticipada' && '🎟️ Solo Anticipada: El evento únicamente se accede con entrada anticipada.'}
                  {ticketSaleType === 'puerta' && '🚪 Solo en Puerta: El público abonará su entrada en la boletería la noche del evento.'}
                  {ticketSaleType === 'ambas' && '✨ Ambas Opciones: Habrá venta de anticipadas con descuento y cobro general en puerta.'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTicketSaleType('anticipada')}
                  className={`py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    ticketSaleType === 'anticipada'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400'
                      : 'bg-dark-900 text-slate-400 hover:text-white border border-dark-700'
                  }`}
                >
                  <span>🎟️ Solo Anticipada</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketSaleType('puerta')}
                  className={`py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    ticketSaleType === 'puerta'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400'
                      : 'bg-dark-900 text-slate-400 hover:text-white border border-dark-700'
                  }`}
                >
                  <span>🚪 Solo en Puerta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketSaleType('ambas')}
                  className={`py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    ticketSaleType === 'ambas'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400'
                      : 'bg-dark-900 text-slate-400 hover:text-white border border-dark-700'
                  }`}
                >
                  <span>✨ Ambas (Anticipada + Puerta)</span>
                </button>
              </div>
            </div>

            {/* Inputs de Precios según modalidad */}
            <div className={`grid grid-cols-1 ${ticketSaleType === 'ambas' ? 'sm:grid-cols-2' : ''} gap-3`}>
              {(ticketSaleType === 'puerta' || ticketSaleType === 'ambas') && (
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    Precio de Entrada en Puerta (Venta al Público ARS $) <span className="text-dance-crimson">*</span>
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="6500"
                    className="w-full px-3.5 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm text-white focus:border-dance-crimson focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Valor que pagará la persona que compre directo en boletería.
                  </span>
                </div>
              )}

              {(ticketSaleType === 'anticipada' || ticketSaleType === 'ambas') && (
                <div>
                  <label className="block text-xs text-emerald-300 font-semibold mb-1">
                    Precio de Venta Anticipada (ARS $) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={advancePrice}
                    onChange={(e) => setAdvancePrice(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 bg-dark-800 border border-emerald-500/40 rounded-xl text-sm text-emerald-300 font-bold focus:border-emerald-400 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Precio promocional de venta anticipada al público.
                  </span>
                </div>
              )}
            </div>

            {/* Fecha y Hora de Cierre de Venta de Anticipadas */}
            {(ticketSaleType === 'anticipada' || ticketSaleType === 'ambas') && (
              <div className="p-3.5 rounded-2xl bg-[#0b0e17] border border-emerald-500/30 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAdvanceDeadline}
                    onChange={(e) => setHasAdvanceDeadline(e.target.checked)}
                    className="mt-0.5 rounded bg-dark-800 border-emerald-400 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Programar Fecha y Hora de Cierre de Anticipadas</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Al cumplirse el horario, <strong>se cierra automáticamente la venta de anticipadas</strong> y se muestra el aviso de compra en puerta.
                    </p>
                  </div>
                </label>

                {hasAdvanceDeadline && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pl-6 animate-fadeIn">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Día de Cierre de Venta
                      </label>
                      <input
                        type="date"
                        value={advanceEndDate}
                        onChange={(e) => setAdvanceEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-800 border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Hora Límite de Cierre (Corte)
                      </label>
                      <input
                        type="time"
                        value={advanceEndTime}
                        onChange={(e) => setAdvanceEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-800 border border-emerald-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notas / Condiciones para el Administrador (Cupo de entradas, listas, accesos)
              </label>
              <input
                type="text"
                value={organizerNotesToAdmin}
                onChange={(e) => setOrganizerNotesToAdmin(e.target.value)}
                placeholder="Ej: Lote inicial de 50 anticipadas, acreditación con DNI en puerta, etc."
                className="w-full px-3.5 py-2 bg-[#0c0f17] border border-dark-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Banner Informativo de Gestión Oficial de Ventas */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Gestión de Ventas y Consultas Centralizada</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Todas las consultas y compras de entradas por WhatsApp se canalizan automáticamente a través de la Administración de Sale Baile para garantizar la emisión oficial de tickets.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-300">Descripción detallada del evento</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cronograma de la noche, profesores invitados, ritmos de la pista, promociones..."
          className="w-full px-4 py-2.5 bg-dark-850 border border-dark-700 rounded-xl text-xs text-white focus:border-dance-crimson focus:outline-none"
        />
      </div>

      {/* Datos del Organizador (Cargados automáticamente y Bloqueados) */}
      <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <span>👤</span>
            <span>Identificación del Organizador</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-bold border border-white/10 flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Datos Verificados de tu Perfil</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre Organizador / Productora</label>
            <input
              type="text"
              readOnly
              value={organizerName}
              className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-xs text-slate-300 cursor-not-allowed select-none opacity-80"
              title="Este campo se toma automáticamente de tu perfil verificado"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Instagram Oficial (@)</label>
            <input
              type="text"
              readOnly
              value={instagram}
              className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-xs text-slate-300 cursor-not-allowed select-none opacity-80"
              title="Este campo se toma automáticamente de tu perfil verificado"
            />
          </div>
        </div>
      </div>

      {/* Espacio Promocionado en Destacados ($3.500 ARS) */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-950/30 via-[#151a27] to-[#121624] rounded-2xl border border-amber-500/30 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Star className="w-4 h-4 fill-current text-amber-400" />
            <span>Espacio de Promoción • Destacados en Portada</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">
            $3.500 ARS
          </span>
        </div>

        <label className="flex items-start gap-3 p-3.5 bg-black/40 border border-amber-500/25 rounded-2xl cursor-pointer hover:border-amber-400/50 transition-colors">
          <input
            type="checkbox"
            checked={requestFeatured}
            onChange={(e) => setRequestFeatured(e.target.checked)}
            className="mt-1 rounded bg-dark-800 border-amber-400 text-amber-500 focus:ring-amber-500"
          />
          <div className="space-y-1">
            <span className="text-xs font-black text-white block">
              ⭐ ¿Querés que tu evento aparezca en la Portada / Sección de Destacados?
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Tu flyer se mostrará en las <strong>primeras posiciones del carrusel superior</strong> frente a miles de bailarines de toda la comunidad durante toda la semana.
            </p>
          </div>
        </label>

        {requestFeatured && (
          <div className="p-4 bg-black/50 border border-amber-500/30 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Abonar Espacio Destacado:</span>
              <span className="text-base font-black text-amber-300">$3.500 ARS</span>
            </div>

            <div className="p-3 bg-[#0d111a] rounded-xl border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Alias Mercado Pago:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('salebaile.mp');
                    setCopiedMpAlias(true);
                    setTimeout(() => setCopiedMpAlias(false), 2000);
                  }}
                  className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedMpAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                </button>
              </div>
              <div className="font-mono text-base font-black text-amber-300 tracking-wider">
                salebaile.mp
              </div>
              <p className="text-[10px] text-slate-400">
                Titular: <strong>Sale Baile Oficial</strong> • Monto: <strong>$3.500 ARS</strong>
              </p>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isPayingFeaturedMp}
                  onClick={handlePayFeaturedWithMercadoPago}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  {isPayingFeaturedMp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Conectando con Mercado Pago...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pagar $3.500 con Mercado Pago (Acreditación Inmediata)</span>
                    </>
                  )}
                </button>

                {featuredMpError && (
                  <div className="p-2 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-[11px]">
                    {featuredMpError}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nro de Comprobante / Operación de Mercado Pago (Opcional si ya abonaste)
              </label>
              <input
                type="text"
                value={featuredPaymentRef}
                onChange={(e) => setFeaturedPaymentRef(e.target.value)}
                placeholder="Ej: 94821034 o últimos dígitos de transferencia"
                className="w-full px-3.5 py-2 bg-[#0e121c] border border-amber-500/30 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-dark-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 bg-dark-800 hover:bg-dark-750 text-slate-300 font-semibold text-xs rounded-xl border border-dark-700 transition-colors cursor-pointer"
        >
          Cancelar
        </button>

        <div className="flex-1 flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="flex-1 py-3 px-4 bg-dark-800 hover:bg-dark-750 text-slate-200 font-semibold text-xs rounded-xl border border-dark-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Guardar Borrador
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-orange hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-glow-crimson transition-all cursor-pointer"
          >
            {isVerifiedOrg || isTeacher || isUserAdmin ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Publicar Flyer Inmediatamente</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Solicitud al Administrador</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
