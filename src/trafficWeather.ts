/**
 * Real API integrations for traffic and weather data.
 * All services fall back to demo data when APIs are unavailable.
 */

export interface TrafficIncident {
  id: string;
  type: string;
  lat: number;
  lng: number;
  road: string;
  description: string;
  delay_minutes: number;
  severity: 'minor' | 'moderate' | 'major';
  speed_limit: number;
  active: boolean;
}

export interface WeatherCondition {
  temp_c: number;
  feelslike_c: number;
  humidity: number;
  wind_kph: number;
  condition: string;
  icon: string;
  visibility_km: number;
  is_day: number;
}

export interface WeatherAlert {
  id: string;
  event: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  road_name: string;
  lat: number;
  lng: number;
  probability: number;
  impact_minutes: number;
  time_horizon: string;
}

// --- Open-Meteo Weather API (free, no key required) ---

export async function fetchWeather(lat: number, lng: number): Promise<WeatherCondition | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current;

    const weatherCode = current.weather_code ?? 0;
    const condition = weatherCodeToText(weatherCode);

    return {
      temp_c: current.temperature_2m,
      feelslike_c: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind_kph: current.wind_speed_10m,
      condition,
      icon: weatherCodeToIcon(weatherCode, current.is_day ?? 1),
      visibility_km: (current.visibility ?? 10000) / 1000,
      is_day: current.is_day ?? 1,
    };
  } catch {
    return null;
  }
}

function weatherCodeToText(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 80: 'Rain showers',
    81: 'Moderate showers', 82: 'Violent showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail',
  };
  return map[code] ?? 'Unknown';
}

function weatherCodeToIcon(code: number, isDay: number): string {
  if (code === 0) return isDay ? 'sun' : 'moon';
  if (code <= 2) return isDay ? 'cloud-sun' : 'cloud-moon';
  if (code === 3) return 'cloud';
  if (code <= 48) return 'fog';
  if (code <= 55) return 'cloud-drizzle';
  if (code <= 65) return 'cloud-rain';
  if (code <= 75) return 'snowflake';
  if (code <= 82) return 'cloud-rain-wind';
  return 'cloud-lightning';
}

export function weatherToPredictiveEvents(weather: WeatherCondition, lat: number, lng: number): WeatherAlert[] {
  const events: WeatherAlert[] = [];

  if (weather.visibility_km < 0.2) {
    events.push({
      id: 'weather-dense-fog',
      event: 'Dense fog',
      severity: 'critical',
      description: `Visibility ${weather.visibility_km.toFixed(1)} km — extreme caution required`,
      road_name: 'Current route',
      lat, lng,
      probability: 0.95,
      impact_minutes: 20,
      time_horizon: '5min',
    });
  } else if (weather.visibility_km < 1) {
    events.push({
      id: 'weather-fog',
      event: 'Fog',
      severity: 'warning',
      description: `Visibility ${weather.visibility_km.toFixed(1)} km — reduce speed`,
      road_name: 'Current route',
      lat, lng,
      probability: 0.85,
      impact_minutes: 10,
      time_horizon: '15min',
    });
  }

  if (weather.wind_kph > 60) {
    events.push({
      id: 'weather-high-wind',
      event: 'High wind',
      severity: 'warning',
      description: `Wind ${Math.round(weather.wind_kph)} km/h — crosswind risk on Autobahn`,
      road_name: 'Current route',
      lat, lng,
      probability: 0.8,
      impact_minutes: 5,
      time_horizon: '30min',
    });
  }

  if (weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('drizzle')) {
    events.push({
      id: 'weather-rain',
      event: 'Rain',
      severity: 'info',
      description: `${weather.condition} — wet road surface, increase following distance`,
      road_name: 'Current route',
      lat, lng,
      probability: 0.7,
      impact_minutes: 5,
      time_horizon: '30min',
    });
  }

  if (weather.condition.toLowerCase().includes('snow') || weather.condition.toLowerCase().includes('thunderstorm')) {
    events.push({
      id: 'weather-severe',
      event: weather.condition,
      severity: 'warning',
      description: `${weather.condition} — consider alternate route or delay departure`,
      road_name: 'Current route',
      lat, lng,
      probability: 0.75,
      impact_minutes: 15,
      time_horizon: '1hr',
    });
  }

  return events;
}

// --- Overpass API for road incidents (construction zones) ---

export async function fetchRoadIncidents(
  lat: number,
  lng: number,
  radiusKm: number = 50
): Promise<TrafficIncident[]> {
  try {
    const radius = radiusKm * 1000;
    const query = `
      [out:json][timeout:10];
      (
        way["highway"="construction"](around:${radius},${lat},${lng});
        way["construction"](around:${radius},${lat},${lng});
        node["barrier"="roadblock"](around:${radius},${lat},${lng});
      );
      out body;
    `;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const elements = data.elements ?? [];

    return elements
      .filter((el: Record<string, unknown>) => el.type === 'way' && (el.tags as Record<string, string>)?.construction)
      .slice(0, 10)
      .map((el: Record<string, unknown>, i: number) => {
        const tags = el.tags as Record<string, string>;
        const center = el.center as { lat: number; lon: number } | undefined;
        return {
          id: `osm-incident-${i}`,
          type: 'construction',
          lat: center?.lat ?? lat,
          lng: center?.lon ?? lng,
          road: tags.name ?? tags.ref ?? 'Unknown road',
          description: tags.construction ?? tags.description ?? 'Road construction',
          delay_minutes: 5 + Math.floor(Math.random() * 15),
          severity: (tags.construction?.includes('major') ? 'major' : tags.construction?.includes('minor') ? 'minor' : 'moderate') as TrafficIncident['severity'],
          speed_limit: 60,
          active: true,
        };
      });
  } catch {
    return [];
  }
}

// --- Nominatim geocoding (free, no key) ---

export interface GeocodingResult {
  display_name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
}

export async function geocodeSearch(query: string): Promise<GeocodingResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=de,at,ch`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en' },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();

    return data.map((item: Record<string, unknown>) => {
      const address = item.address as Record<string, string> ?? {};
      return {
        display_name: item.display_name as string,
        lat: parseFloat(item.lat as string),
        lng: parseFloat(item.lon as string),
        city: address.city ?? address.town ?? address.village ?? address.municipality ?? '',
        country: address.country ?? '',
      };
    });
  } catch {
    return [];
  }
}
