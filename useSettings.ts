import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  accentColor: 'cyan' | 'emerald' | 'amber' | 'rose';
  mapStyle: 'dark' | 'satellite' | 'terrain';
  voiceGuidance: 'full' | 'minimal' | 'alerts_only';
  voiceVolume: number;
  speedWarnings: boolean;
  speedWarningOffset: number;
  units: 'metric' | 'imperial';
  calmModeDefault: boolean;
  calmAutoEnable: boolean;
  calmMaxSpeed: number;
  calmMusicGenre: string;
  privacyShareLocation: boolean;
  privacyShareSpeed: boolean;
  privacyAnalytics: boolean;
  privacyCrashReports: boolean;
  routeAvoidHighways: boolean;
  routeAvoidTolls: boolean;
  routeAvoidFerries: boolean;
  routeAvoidUnpaved: boolean;
  routePreferScenic: boolean;
  routeFuelEfficiency: boolean;
  vehicleType: 'car' | 'ev' | 'motorcycle' | 'truck' | 'rv';
  vehicleFuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  vehicleConsumption: number;
  vehicleMaxSpeed: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'cyan',
  mapStyle: 'dark',
  voiceGuidance: 'minimal',
  voiceVolume: 70,
  speedWarnings: true,
  speedWarningOffset: 5,
  units: 'metric',
  calmModeDefault: false,
  calmAutoEnable: false,
  calmMaxSpeed: 120,
  calmMusicGenre: 'ambient',
  privacyShareLocation: true,
  privacyShareSpeed: false,
  privacyAnalytics: false,
  privacyCrashReports: false,
  routeAvoidHighways: false,
  routeAvoidTolls: false,
  routeAvoidFerries: true,
  routeAvoidUnpaved: true,
  routePreferScenic: false,
  routeFuelEfficiency: false,
  vehicleType: 'car',
  vehicleFuelType: 'gasoline',
  vehicleConsumption: 7.5,
  vehicleMaxSpeed: 250,
};

const STORAGE_KEY = 'autobahn_settings';

function loadFromStorage(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveToStorage(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  updateSettings: () => {},
  resetSettings: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export { SettingsContext };

export function useSettingsProvider() {
  const [settings, setSettings] = useState<AppSettings>(loadFromStorage);
  // Load from Supabase on mount (if available)
  useEffect(() => {
    async function loadFromDB() {
      if (!supabase) return;
      try {
        const { data } = await supabase.from('user_settings').select('*').maybeSingle();
        if (data) {
          const mapped: AppSettings = {
            theme: data.theme,
            accentColor: data.accent_color,
            mapStyle: data.map_style,
            voiceGuidance: data.voice_guidance,
            voiceVolume: data.voice_volume,
            speedWarnings: data.speed_warnings,
            speedWarningOffset: data.speed_warning_offset,
            units: data.units,
            calmModeDefault: data.calm_mode_default,
            calmAutoEnable: data.calm_auto_enable,
            calmMaxSpeed: data.calm_max_speed,
            calmMusicGenre: data.calm_music_genre,
            privacyShareLocation: data.privacy_share_location,
            privacyShareSpeed: data.privacy_share_speed,
            privacyAnalytics: data.privacy_analytics,
            privacyCrashReports: data.privacy_crash_reports,
            routeAvoidHighways: data.route_avoid_highways,
            routeAvoidTolls: data.route_avoid_tolls,
            routeAvoidFerries: data.route_avoid_ferries,
            routeAvoidUnpaved: data.route_avoid_unpaved,
            routePreferScenic: data.route_prefer_scenic,
            routeFuelEfficiency: data.route_fuel_efficiency,
            vehicleType: data.vehicle_type,
            vehicleFuelType: data.vehicle_fuel_type,
            vehicleConsumption: data.vehicle_consumption,
            vehicleMaxSpeed: data.vehicle_max_speed,
          };
          setSettings(mapped);
          saveToStorage(mapped);
        }
      } catch { /* ignore */ }
    }
    loadFromDB();
  }, []);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveToStorage(next);
      syncToDB(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveToStorage(next);
      syncToDB(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    saveToStorage(DEFAULT_SETTINGS);
    syncToDB(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, updateSettings, resetSettings };
}

async function syncToDB(settings: AppSettings) {
  if (!supabase) return;
  try {
    const row = {
      theme: settings.theme,
      accent_color: settings.accentColor,
      map_style: settings.mapStyle,
      voice_guidance: settings.voiceGuidance,
      voice_volume: settings.voiceVolume,
      speed_warnings: settings.speedWarnings,
      speed_warning_offset: settings.speedWarningOffset,
      units: settings.units,
      calm_mode_default: settings.calmModeDefault,
      calm_auto_enable: settings.calmAutoEnable,
      calm_max_speed: settings.calmMaxSpeed,
      calm_music_genre: settings.calmMusicGenre,
      privacy_share_location: settings.privacyShareLocation,
      privacy_share_speed: settings.privacyShareSpeed,
      privacy_analytics: settings.privacyAnalytics,
      privacy_crash_reports: settings.privacyCrashReports,
      route_avoid_highways: settings.routeAvoidHighways,
      route_avoid_tolls: settings.routeAvoidTolls,
      route_avoid_ferries: settings.routeAvoidFerries,
      route_avoid_unpaved: settings.routeAvoidUnpaved,
      route_prefer_scenic: settings.routePreferScenic,
      route_fuel_efficiency: settings.routeFuelEfficiency,
      vehicle_type: settings.vehicleType,
      vehicle_fuel_type: settings.vehicleFuelType,
      vehicle_consumption: settings.vehicleConsumption,
      vehicle_max_speed: settings.vehicleMaxSpeed,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('user_settings').upsert(row, { onConflict: 'user_id' });
  } catch { /* ignore */ }
}

export { DEFAULT_SETTINGS };
