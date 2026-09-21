import React, { useState } from 'react';
import { useLocation } from '../../context/LocationContext';
import { ARGENTINA_CITY_PRESETS, searchAddressGeocode } from '../../lib/geo';
import { MapPin, Navigation, Search, X, Loader2, Check } from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ isOpen, onClose }) => {
  const { location, isLocating, locationError, requestCurrentLocation, selectManualCity, setCustomCoordinates } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchAddressGeocode(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectSearchResult = (res: any) => {
    setCustomCoordinates(
      res.lat,
      res.lon,
      res.road ? `${res.road}, ${res.city || ''}` : res.display_name.split(',')[0]
    );
    onClose();
  };

  const handleSelectPreset = (preset: typeof ARGENTINA_CITY_PRESETS[0]) => {
    selectManualCity(preset);
    onClose();
  };

  const handleGpsClick = async () => {
    setGpsSuccess(false);
    const success = await requestCurrentLocation();
    if (success) {
      setGpsSuccess(true);
      setTimeout(() => {
        setGpsSuccess(false);
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Background overlay click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#121622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dance-crimson/15 border border-dance-crimson/30 flex items-center justify-center text-dance-crimson">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Elegir Ubicación</h2>
              <p className="text-xs text-slate-400">¿Dónde quieres descubrir bachatas y bailes?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-[#0e111a]">
          {/* Alerta de Error de Ubicación si ocurre */}
          {locationError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5 animate-fadeIn">
              <span className="text-base">⚠️</span>
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">Aviso de Ubicación:</p>
                <p className="text-[11px] leading-relaxed text-rose-300">{locationError}</p>
              </div>
            </div>
          )}

          {/* Opción 1: GPS Automático */}
          <div className="bg-[#151a27] border border-white/10 p-4 rounded-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-dance-crimson" />
                  Ubicación actual por GPS
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Muestra eventos calculando los kilómetros exactos a tu alrededor.
                </p>
              </div>
            </div>
            <button
              onClick={handleGpsClick}
              disabled={isLocating}
              className="w-full py-3 px-4 bg-dance-crimson hover:bg-dance-crimson/90 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-dance-crimson/20 cursor-pointer"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Obteniendo ubicación del dispositivo...</span>
                </>
              ) : gpsSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                  <span>¡Ubicación Detectada!</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Usar mi GPS</span>
                </>
              )}
            </button>
          </div>

          {/* Opción 2: Buscador libre */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Buscar dirección o barrio
            </label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej: Palermo, Morón, Quilmes..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-[#1f2638] hover:bg-[#283148] text-white text-sm font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
              </button>
            </form>

            {/* Resultados de búsqueda */}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1.5 bg-[#151a27] p-2 rounded-xl border border-white/10 max-h-48 overflow-y-auto">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-white/10 transition-colors text-xs text-slate-200 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{res.display_name}</span>
                    <MapPin className="w-3.5 h-3.5 text-dance-coral shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Opción 3: Ciudades populares de Argentina */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Ciudades y Zonas Frecuentes
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ARGENTINA_CITY_PRESETS.map((preset) => {
                const isSelected = location.cityName.toLowerCase().includes(preset.name.toLowerCase()) ||
                  preset.name.toLowerCase().includes(location.cityName.toLowerCase());

                return (
                  <button
                    key={preset.name}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-dance-crimson/15 border-dance-crimson text-white font-bold ring-1 ring-dance-crimson/40'
                        : 'bg-[#151a27] border-white/10 text-slate-200 hover:bg-[#1e2436] hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate">{preset.name}</div>
                      <div className="text-xs text-slate-400">{preset.province}</div>
                    </div>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-dance-crimson flex items-center justify-center text-white shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121622] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#1f2638] hover:bg-[#283148] text-slate-200 text-sm font-semibold rounded-xl transition-colors border border-white/10"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
