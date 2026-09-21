import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { UserLocation, CityPreset } from '../types';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface LocationContextType {
  location: UserLocation;
  isLocating: boolean;
  locationError: string | null;
  requestCurrentLocation: () => Promise<boolean>;
  selectManualCity: (preset: CityPreset) => void;
  setCustomCoordinates: (lat: number, lng: number, name: string) => void;
  showLocationModal: boolean;
  setShowLocationModal: (show: boolean) => void;
}

const DEFAULT_LOCATION: UserLocation = {
  latitude: -34.6037, // Buenos Aires Obelisco
  longitude: -58.3816,
  cityName: 'Buenos Aires (CABA)',
  isManual: true,
  hasPermission: false,
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_LOC_KEY = 'bachata_hoy_user_location';

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<UserLocation>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOC_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_LOCATION;
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOC_KEY, JSON.stringify(location));
    } catch (e) {}
  }, [location]);

  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Auto-geolocalización continua en tiempo real (Nativa en APK y Web)
  useEffect(() => {
    let watchId: string | number | null = null;
    let isCancelled = false;
    let isFetchingGeo = false;

    const updatePosition = async (lat: number, lng: number) => {
      // Si ya tenemos coordenadas, solo actualizar si el usuario se desplazó más de ~500 metros
      if (lastCoordsRef.current) {
        const latDiff = Math.abs(lat - lastCoordsRef.current.lat);
        const lngDiff = Math.abs(lng - lastCoordsRef.current.lng);
        if (latDiff < 0.005 && lngDiff < 0.005) {
          return;
        }
      }

      lastCoordsRef.current = { lat, lng };

      if (isFetchingGeo) return;
      isFetchingGeo = true;

      let detectedName = 'Mi ubicación actual (GPS)';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
          {
            headers: { 'Accept-Language': 'es' },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          const neighborhood = data.address?.suburb || data.address?.neighbourhood || data.address?.city_district;
          const city = data.address?.city || data.address?.town || data.address?.state_district || 'Buenos Aires';
          detectedName = neighborhood ? `${neighborhood}, ${city}` : city;
        }
      } catch (e) {
        // Fallback silencioso
      } finally {
        isFetchingGeo = false;
      }

      if (!isCancelled) {
        setLocation((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          cityName: detectedName || prev.cityName,
          isManual: false,
          hasPermission: true,
        }));
      }
    };

    const startWatcher = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') {
            const req = await Geolocation.requestPermissions();
            if (req.location !== 'granted') return;
          }

          // Obtener posición inmediata nativa
          const current = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
          });
          if (!isCancelled && current?.coords) {
            updatePosition(current.coords.latitude, current.coords.longitude);
          }

          // Iniciar watcher nativo de Capacitor
          const nativeId = await Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (pos, err) => {
              if (!err && pos?.coords && !isCancelled) {
                updatePosition(pos.coords.latitude, pos.coords.longitude);
              }
            }
          );
          watchId = nativeId;
        } catch (err) {
          console.warn('Native GPS watch error:', err);
        }
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          watchId = navigator.geolocation.watchPosition(
            (pos) => updatePosition(pos.coords.latitude, pos.coords.longitude),
            () => {},
            { enableHighAccuracy: false, maximumAge: 60000, timeout: 20000 }
          );
        } catch (e) {}
      }
    };

    startWatcher();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (Capacitor.isNativePlatform()) {
          try {
            const current = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 10000,
            });
            if (!isCancelled && current?.coords) {
              updatePosition(current.coords.latitude, current.coords.longitude);
            }
          } catch (e) {}
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => updatePosition(pos.coords.latitude, pos.coords.longitude),
            () => {},
            { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (watchId !== null) {
        if (typeof watchId === 'string') {
          Geolocation.clearWatch({ id: watchId });
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
        }
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const requestCurrentLocation = async (): Promise<boolean> => {
    setIsLocating(true);
    setLocationError(null);

    let lat: number | null = null;
    let lng: number | null = null;

    try {
      if (Capacitor.isNativePlatform()) {
        // En APK Nativa: solicitar permisos con el diálogo nativo oficial de Android
        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            setIsLocating(false);
            setLocationError(
              'Permiso de ubicación denegado en tu teléfono. Por favor habilítalo en los Ajustes de la App o selecciona tu ciudad manualmente.'
            );
            return false;
          }
        }

        const nativePos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        lat = nativePos.coords.latitude;
        lng = nativePos.coords.longitude;
      } else {
        // En navegador web
        if (!navigator.geolocation) {
          setIsLocating(false);
          setLocationError('Tu navegador no soporta geolocalización GPS. Selecciona tu ciudad en la lista.');
          return false;
        }

        const getWebPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
          return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
          });
        };

        let pos: GeolocationPosition;
        try {
          pos = await getWebPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        } catch (err: any) {
          if (err?.code === 1) throw err;
          pos = await getWebPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
        }
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }

      if (lat === null || lng === null) {
        throw new Error('Coordenadas no disponibles');
      }

      let detectedName = 'Mi ubicación actual (GPS)';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
          {
            headers: { 'Accept-Language': 'es' },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          const neighborhood = data.address?.suburb || data.address?.neighbourhood || data.address?.city_district;
          const city = data.address?.city || data.address?.town || data.address?.state_district || 'Buenos Aires';
          detectedName = neighborhood ? `${neighborhood}, ${city}` : city;
        }
      } catch (e) {
        console.warn('Reverse geocode fallback:', e);
      }

      const newLoc: UserLocation = {
        latitude: lat,
        longitude: lng,
        cityName: detectedName,
        isManual: false,
        hasPermission: true,
      };

      lastCoordsRef.current = { lat, lng };
      setLocation(newLoc);
      setIsLocating(false);
      setLocationError(null);
      return true;
    } catch (err: any) {
      console.warn('Geolocation request error:', err);
      setIsLocating(false);
      if (err?.code === 1 || err?.message?.includes('denegado') || err?.message?.includes('denied')) {
        setLocationError(
          'Permiso de ubicación denegado en tu dispositivo. Puedes habilitarlo en los permisos de la app o seleccionar tu ciudad abajo.'
        );
      } else if (err?.code === 2) {
        setLocationError(
          'No se pudo determinar tu posición. Verifica que el GPS de tu teléfono esté encendido.'
        );
      } else if (err?.code === 3) {
        setLocationError(
          'Tiempo de espera agotado buscando señal satelital GPS. Por favor reintenta.'
        );
      } else {
        setLocationError('No se pudo conectar al GPS. Selecciona tu ciudad en la lista.');
      }
      return false;
    }
  };

  const selectManualCity = (preset: CityPreset) => {
    setLocation({
      latitude: preset.latitude,
      longitude: preset.longitude,
      cityName: preset.name,
      isManual: true,
      hasPermission: false,
    });
    setLocationError(null);
    setShowLocationModal(false);
  };

  const setCustomCoordinates = (lat: number, lng: number, name: string) => {
    setLocation({
      latitude: lat,
      longitude: lng,
      cityName: name,
      isManual: true,
      hasPermission: false,
    });
    setLocationError(null);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        isLocating,
        locationError,
        requestCurrentLocation,
        selectManualCity,
        setCustomCoordinates,
        showLocationModal,
        setShowLocationModal,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within a LocationProvider');
  return ctx;
}
