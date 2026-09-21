import React, { createContext, useContext, useState } from 'react';
import { getLocalFavorites, toggleLocalFavorite } from '../lib/supabase';

interface FavoritesContextType {
  favorites: string[];
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (eventId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>(() => getLocalFavorites());

  const isFavorite = (eventId: string) => favorites.includes(eventId);

  const toggleFavorite = (eventId: string) => {
    const updated = toggleLocalFavorite(eventId);
    setFavorites(updated);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
