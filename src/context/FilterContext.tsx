import React, { createContext, useContext, useState } from 'react';
import type { EventCategory, FilterState, QuickDateFilter, SortOption } from '../types';

interface FilterContextType {
  filters: FilterState;
  setDateFilter: (filter: QuickDateFilter, customStart?: string, customEnd?: string) => void;
  setCategory: (category: EventCategory | 'all') => void;
  setGenreFamily: (family: string) => void;
  setSelectedSubgenre: (subgenre?: string) => void;
  setRadiusKm: (radius: number) => void;
  setSortBy: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  setOnlyFree: (onlyFree: boolean) => void;
  resetFilters: () => void;
}

export const DEFAULT_RADIUS = 50;

export const DEFAULT_FILTERS: FilterState = {
  dateFilter: 'all',
  category: 'all',
  genreFamily: 'all',
  selectedSubgenre: undefined,
  radiusKm: DEFAULT_RADIUS,
  sortBy: 'distance',
  searchQuery: '',
  onlyFree: false,
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const setDateFilter = (filter: QuickDateFilter, customStart?: string, customEnd?: string) => {
    setFilters((prev) => ({
      ...prev,
      dateFilter: filter,
      customStartDate: customStart,
      customEndDate: customEnd,
    }));
  };

  const setCategory = (category: EventCategory | 'all') => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const setGenreFamily = (genreFamily: string) => {
    setFilters((prev) => ({ ...prev, genreFamily, selectedSubgenre: undefined }));
  };

  const setSelectedSubgenre = (selectedSubgenre?: string) => {
    setFilters((prev) => ({ ...prev, selectedSubgenre }));
  };

  const setRadiusKm = (radiusKm: number) => {
    setFilters((prev) => ({ ...prev, radiusKm }));
  };

  const setSortBy = (sortBy: SortOption) => {
    setFilters((prev) => ({ ...prev, sortBy }));
  };

  const setSearchQuery = (searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  };

  const setOnlyFree = (onlyFree: boolean) => {
    setFilters((prev) => ({ ...prev, onlyFree }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        setDateFilter,
        setCategory,
        setGenreFamily,
        setSelectedSubgenre,
        setRadiusKm,
        setSortBy,
        setSearchQuery,
        setOnlyFree,
        resetFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider');
  return ctx;
}
