import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  error: string | null;
  watching: boolean;
  isRealGPS: boolean;
  startWatch: () => void;
  stopWatch: () => void;
}

const MUNICH: GeoPosition = { lat: 48.1351, lng: 11.582, heading: null, speed: null, accuracy: 0 };

export function useGeolocation(simulate = false): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(simulate ? MUNICH : null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [isRealGPS, setIsRealGPS] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setWatching(false);
    setIsRealGPS(false);
  }, []);

  const startWatch = useCallback(() => {
    if (watching) return;
    setWatching(true);
    setError(null);

    // Try real GPS first
    if (navigator.geolocation) {
      try {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            setIsRealGPS(true);
            setPosition({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              accuracy: pos.coords.accuracy,
            });
          },
          (err) => {
            // Real GPS failed, fall back to simulation
            if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
              startSimulation();
            } else {
              setError(err.message);
            }
          },
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
        watchIdRef.current = id;
        return;
      } catch {
        // Fall through to simulation
      }
    }

    startSimulation();
  }, [watching]);

  function startSimulation() {
    setIsRealGPS(false);
    let simLat = 48.1351;
    let simLng = 11.582;
    let simHeading = 0;

    const id = setInterval(() => {
      simHeading += (Math.random() - 0.45) * 8;
      const rad = (simHeading * Math.PI) / 180;
      simLat += Math.cos(rad) * 0.0003;
      simLng += Math.sin(rad) * 0.0003;

      setPosition({
        lat: simLat,
        lng: simLng,
        heading: simHeading % 360,
        speed: 85 + Math.random() * 20,
        accuracy: 5,
      });
    }, 1000);

    simIntervalRef.current = id;
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  return { position, error, watching, isRealGPS, startWatch, stopWatch };
}
