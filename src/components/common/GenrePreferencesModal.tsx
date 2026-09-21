import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFilters } from '../../context/FilterContext';
import { DANCE_GENRE_FAMILIES } from '../../lib/danceCategories';
import { Check, ArrowRight, X } from 'lucide-react';

interface GenrePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const GenrePreferencesModal: React.FC<GenrePreferencesModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { user, updateProfile } = useAuth();
  const { setGenreFamily } = useFilters();

  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    if (user?.favorite_genres && user.favorite_genres.length > 0) {
      return user.favorite_genres.map((g) => (g === 'caribeno' ? 'salsa-y-bachata' : g));
    }
    return ['salsa-y-bachata', 'bachata', 'salsa'];
  });

  if (!isOpen) return null;

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genreId)) {
        // Prevent unchecking all
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== genreId);
      } else {
        return [...prev, genreId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedGenres(DANCE_GENRE_FAMILIES.map((f) => f.id));
  };

  const handleClose = () => {
    if (user && !user.onboarding_completed) {
      updateProfile({
        favorite_genres: selectedGenres,
        onboarding_completed: true,
      });
    }
    onClose();
  };

  const handleSave = () => {
    updateProfile({
      favorite_genres: selectedGenres,
      onboarding_completed: true,
    });

    // If only one genre is selected, focus feed on it; otherwise show all with prioritized order
    if (selectedGenres.length === 1) {
      setGenreFamily(selectedGenres[0]);
    } else {
      setGenreFamily('all');
    }

    onClose();
    if (onSaved) {
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header (Pantalla 6 de la Maqueta) */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-oled-950">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-dance-coral">
              Paso 1 de 2 • Personalización
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">¿Qué bailás?</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Elegí tus ritmos favoritos para personalizar tu experiencia
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-[#050508]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Seleccionados: <strong className="text-dance-coral">{selectedGenres.length}</strong>
            </span>
            <button
              onClick={handleSelectAll}
              className="text-xs text-dance-crimson hover:underline font-bold cursor-pointer"
            >
              Seleccionar todos
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {DANCE_GENRE_FAMILIES.map((fam) => {
              const isSelected = selectedGenres.includes(fam.id);
              return (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => toggleGenre(fam.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-br from-dance-crimson/20 to-dance-coral/10 border-dance-coral ring-1 ring-dance-coral shadow-glow-coral'
                      : 'bg-oled-900/90 border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl">{fam.icon}</span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-gradient-to-tr from-dance-crimson to-dance-coral text-white shadow-sm' : 'border border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-black text-white">{fam.shortName || fam.name}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{fam.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-oled-950 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Podés cambiar tus ritmos en cualquier momento.
          </span>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto ml-auto px-8 py-3.5 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-glow-crimson flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Continuar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
