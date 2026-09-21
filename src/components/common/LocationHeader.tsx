import React from 'react';
import { useLocation } from '../../context/LocationContext';
import { Navigation, MapPin, SlidersHorizontal, Loader2 } from 'lucide-react';

interface LocationHeaderProps {
  onOpenLocationModal: () => void;
}

export const LocationHeader: React.FC<LocationHeaderProps> = ({ onOpenLocationModal }) => {
  const { location, isLocating, requestCurrentLocation } = useLocation();

  if (location.hasPermission) {
    return (
      <div className="bg-dark-900/60 border-b border-dark-800 py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Eventos ordenados por cercanía a <strong className="text-slate-200">{location.cityName}</strong></span>
          </div>
          <button
            onClick={onOpenLocationModal}
            className="text-dance-crimson hover:underline font-medium"
          >
            Cambiar zona
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border-b border-dark-800/80 py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dance-crimson/15 border border-dance-crimson/30 flex items-center justify-center text-dance-crimson shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-white">
              Explorando en: <span className="text-dance-orange">{location.cityName}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Usa tu ubicación para calcular distancias exactas y descubrir sociales a tu alrededor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => requestCurrentLocation()}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dance-crimson/20 hover:bg-dance-crimson/30 text-dance-crimson text-xs font-semibold rounded-xl border border-dance-crimson/40 transition-colors"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Ubicando...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                <span>Usar mi ubicación</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenLocationModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-medium rounded-xl border border-dark-700 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Elegir ciudad</span>
          </button>
        </div>
      </div>
    </div>
  );
};
