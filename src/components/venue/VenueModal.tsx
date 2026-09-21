import React, { useState } from 'react';
import type { EventItem, EventMediaItem } from '../../types';
import { MediaGalleryUploader } from '../organizer/MediaGalleryUploader';
import { searchAddressGeocode } from '../../lib/geo';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Building,
  MapPin,
  Search,
  Loader2,
  Users,
  Send,
  AlertCircle,
  Phone,
  Sparkles,
} from 'lucide-react';

interface VenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: Partial<EventItem>, isDraft: boolean) => void;
}

const VENUE_AMENITIES = [
  'Pista de madera',
  'Aire acondicionado',
  'Barra de tragos y comidas',
  'Sonido profesional e iluminación',
  'Seguridad y guardarropa',
  'Alquiler para clases y talleres',
  'Alquiler para fiestas y sociales',
  'Estacionamiento cercano',
];

export const VenueModal: React.FC<VenueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { user } = useAuth();

  const [venueName, setVenueName] = useState(user?.venue_name_registered || '');
  const [address, setAddress] = useState(user?.venue_address || user?.zone || '');
  const [city, setCity] = useState('Buenos Aires');
  const [capacity, setCapacity] = useState<number | ''>(user?.venue_capacity || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    user?.venue_features && user.venue_features.length > 0
      ? user.venue_features
      : ['Pista de madera', 'Aire acondicionado', 'Barra de tragos y comidas', 'Alquiler para clases y talleres']
  );
  const [description, setDescription] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [gallery, setGallery] = useState<EventMediaItem[]>([]);
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp_phone || user?.phone || '');
  const [latitude, setLatitude] = useState(-34.5828);
  const [longitude, setLongitude] = useState(-58.4326);
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleAmenity = (item: string) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
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
    if (!venueName) {
      setVenueName(res.name || 'Salón de Baile');
    }
    setLatitude(res.lat);
    setLongitude(res.lon);
    setCity(res.address?.city || res.address?.town || res.address?.suburb || 'Buenos Aires');
    setAddressResults([]);
    setGeocodeQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!venueName.trim()) {
      setError('Por favor indica el nombre de tu salón o local.');
      return;
    }

    if (!address.trim()) {
      setError('Por favor indica la dirección de tu local para ubicarlo en el Radar.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const eventDateStr = now.toISOString().split('T')[0];
    const fullStart = `${eventDateStr}T20:00:00`;
    const fullEnd = `${eventDateStr}T23:59:00`;

    const autoDescription = description.trim()
      ? description
      : `Salón y Pista de Baile: ${venueName.trim()}. Servicios: ${selectedAmenities.join(', ')}. Capacidad aprox: ${capacity || 'A consultar'} personas. Disponible para alquiler de clases, talleres y eventos sociales.`;

    const eventPayload: Partial<EventItem> = {
      title: `Salón & Pista: ${venueName.trim()}`,
      description: autoDescription,
      category: 'social',
      genre_family: 'salsa-y-bachata',
      subgenres: ['salon-pista-alquiler'],
      event_target: 'salon_local',
      start_time: fullStart,
      end_time: fullEnd,
      venue_name: venueName.trim(),
      address: address.trim(),
      city: city.trim() || 'Buenos Aires',
      latitude,
      longitude,
      flyer_url: flyerUrl || (gallery[0]?.url || ''),
      gallery,
      is_free: true,
      organizer_name: venueName.trim(),
      organizer_whatsapp: whatsapp.trim() || undefined,
      organizer_instagram: user?.instagram_handle || undefined,
      advance_tickets_whatsapp: whatsapp.trim() || undefined,
      organizer_notes_to_admin: `Espacio de Local / Salón: ${venueName.trim()}. Capacidad: ${capacity || 'N/A'}. WhatsApp: ${whatsapp}`,
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
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/80 via-[#121624] to-[#0e111a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 shadow-md">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Espacio Dueños de Local: Promocionar Salón</span>
              </h2>
              <p className="text-xs text-amber-300">
                Ubica tu salón en el Radar y conecta con organizadores y profesores para alquiler.
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

          {/* 1. Fotos del Salón / Pista */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-white/10 space-y-2">
            <label className="block text-xs font-bold text-white">
              Fotos del Salón, Pista, Barra o Fachada
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

          {/* 2. Nombre del Local y Capacidad */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-white mb-1.5">
                Nombre del Local / Salón / Bar *
              </label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Ej: Melany Resto Bar / Club Social de Baile"
                className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-amber-400 rounded-2xl text-xs sm:text-sm text-white font-semibold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Capacidad aprox.</span>
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ej: 300 pers."
                className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-amber-400 rounded-2xl text-xs sm:text-sm text-white font-semibold outline-none"
              />
            </div>
          </div>

          {/* 3. Ubicación y Geocodificación */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>Ubicación Exacta en el Mapa *</span>
              </label>
              <span className="text-[10px] text-sky-300 font-bold">Imprescindible para el Radar</span>
            </div>

            <div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Presidente Perón 4500, José C. Paz"
                className="w-full px-3.5 py-2 bg-dark-950 border border-white/10 focus:border-sky-400 rounded-xl text-xs text-white outline-none"
                required
              />
            </div>

            {/* Buscador de mapa */}
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
                  placeholder="Buscar en el mapa (ej: Perón 4500 Jose C Paz)..."
                  className="flex-1 px-3 py-1.5 bg-dark-950 border border-white/10 focus:border-sky-400 rounded-xl text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isSearchingAddress}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSearchingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Localizar</span>
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

          {/* 4. Características y Servicios del Salón */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/20 via-dark-900 to-orange-950/20 border border-amber-500/30 space-y-2.5">
            <label className="block text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Instalaciones y Servicios Disponibles</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/20">
                Pistas & Salones
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {VENUE_AMENITIES.map((item) => {
                const isSelected = selectedAmenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/40 scale-105'
                        : 'bg-dark-950 text-slate-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Contacto & WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp de Contacto para Alquiler y Reservas</span>
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ej: +54 9 11 1234-5678"
              className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-emerald-400 rounded-2xl text-xs sm:text-sm text-white outline-none"
            />
          </div>

          {/* 6. Descripción libre */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Descripción, Medidas de la Pista o Condiciones de Alquiler
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ej: Salón con pista flotante de 180m², sonido RCF, aire acondicionado central, habilitado para 300 personas. Alquiler para clases de lunes a viernes por la tarde..."
              className="w-full px-3.5 py-2.5 bg-dark-900 border border-white/15 focus:border-amber-400 rounded-2xl text-xs text-white outline-none resize-none"
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-950/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando...' : 'Publicar Salón en Sale Baile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
