import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import EuropeMap from '../components/EuropeMap';
import SearchDestination from '../components/SearchDestination';
import AutobahnAwareness from '../components/AutobahnAwareness';
import BaustelleAlerts from '../components/BaustelleAlerts';
import SmartRerouting from '../components/SmartRerouting';
import ParkingIntelligence from '../components/ParkingIntelligence';
import DriverPersonality, { type DriverProfile, type PersonalityType } from '../components/DriverPersonality';
import PredictiveNavigation from '../components/PredictiveNavigation';
import SmartRouteSuggestions from '../components/SmartRouteSuggestions';
import CalmDrivingExperience from '../components/CalmDrivingExperience';
import TurnByTurnNav from '../components/TurnByTurnNav';
import VoicePrompts from '../components/VoicePrompts';
import { useGeolocation } from '../hooks/useGeolocation';
import { useDrivingSimulation, type TurnInstruction } from '../hooks/useDrivingSimulation';
import { useSettings } from '../hooks/useSettings';
import { fetchRoute, type RouteResult } from '../lib/routing';
import { fetchWeather, weatherToPredictiveEvents, fetchRoadIncidents, type WeatherCondition, type TrafficIncident, type WeatherAlert } from '../lib/trafficWeather';
import { fetchNearbyParking, type ParkingFacility as RealParkingFacility } from '../lib/parking';
import { supabase } from '../lib/supabase';
import SettingsPage from './Settings';
import {
  Crosshair,
  Navigation,
  Fuel,
  Clock,
  MapPin,
  X,
  Wifi,
  WifiOff,
  EyeOff,
  Leaf,
  Compass,
  Car,
  Zap,
  TrendingUp,
  AlertTriangle,
  Settings,
  Cloud,
} from 'lucide-react';
import L from 'leaflet';

interface Destination { id: string; label: string; sublabel: string; lat: number; lng: number; eta?: string }
interface AutobahnSegment { id: string; name: string; description: string; lat: number; lng: number; speed_limit: number | null; has_speed_limit: boolean; advisory_speed: number; lanes: number; traffic_density: string; route_coords: Array<[number, number]> }
interface Baustelle { id: string; autobahn: string; description: string; lat: number; lng: number; severity: 'minor' | 'moderate' | 'major'; speed_limit: number; lanes_reduced: number; delay_minutes: number; active: boolean; start_date: string | null; end_date: string | null }
interface TrafficPoint { lat: number; lng: number; congestion_level: number; average_speed_kmh: number; flow_type: string; road_name: string }
interface ParkingFacility { id: string; name: string; type: 'parkhaus' | 'parkplatz' | 'p_r_metro' | 'rest_stop'; lat: number; lng: number; city: string; total_spaces: number; available_spaces: number; ev_charging: boolean; ev_chargers_available: number; price_per_hour_eur: number; is_free: boolean; has_disabled_access: boolean }
interface RouteAlternative { id: string; label: string; autobahn: string; distance: string; duration: string; delaySaved: number; avgSpeed: number; trafficLevel: 'free' | 'moderate' | 'heavy'; isRecommended: boolean }
interface PredictiveEvent { id: string; event_type: 'traffic_surge' | 'weather_change' | 'rest_stop' | 'fuel_stop' | 'scenic_point' | 'speed_trap'; road_name: string; lat: number; lng: number; probability: number; impact_minutes: number; description: string; time_horizon: string; severity: 'info' | 'warning' | 'critical' }
interface RouteSuggestion { id: string; personality_type: PersonalityType; label: string; description: string; from_lat: number; from_lng: number; to_lat: number; to_lng: number; distance_km: number; duration_minutes: number; scenic_score: number; calm_score: number; efficiency_score: number; fun_score: number; avoid_baustellen: boolean; has_rest_stops: boolean; ev_friendly: boolean }
interface VoicePrompt { id: string; text: string; type: 'turn' | 'alert' | 'info' | 'reroute'; priority: 'high' | 'medium' | 'low' }

function generateFallbackRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const points: Array<{ lat: number; lng: number }> = [from];
  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const jitter = (1 - Math.pow(2 * t - 1, 2)) * 0.6;
    points.push({ lat: from.lat + (to.lat - from.lat) * t + (Math.random() - 0.5) * jitter, lng: from.lng + (to.lng - from.lng) * t + (Math.random() - 0.5) * jitter });
  }
  points.push(to);
  return points;
}

function calcETA(distanceKm: number, speedKmh: number) {
  const hours = distanceKm / speedKmh;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const now = new Date();
  now.setMinutes(now.getMinutes() + h * 60 + m);
  return { duration: `${h}h ${m.toString().padStart(2, '0')}m`, arrival: now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) };
}

type FollowMode = 'none' | 'follow' | 'heading';
type BottomTab = 'drive' | 'route' | 'park' | 'alerts' | 'more';

export default function NavigationPage() {
  const routerLocation = useLocation();
  const mapRef = useRef<L.Map | null>(null);
  const { position: realGpsPosition, watching, isRealGPS, startWatch, stopWatch } = useGeolocation();
  const { position: simPosition, isSimulating, routeProgress, currentInstruction, upcomingInstructions, distanceRemaining, speedProfile, startSimulation, stopSimulation, setSpeedProfile } = useDrivingSimulation();

  const gpsPosition = isSimulating && simPosition ? { lat: simPosition.lat, lng: simPosition.lng, heading: simPosition.heading, speed: simPosition.speed, accuracy: simPosition.accuracy } : realGpsPosition;

  const [navigating, setNavigating] = useState(false);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [route, setRoute] = useState<Array<{ lat: number; lng: number }>>([]);
  const [locatePressed, setLocatePressed] = useState(false);
  const [followMode, setFollowMode] = useState<FollowMode>('none');
  const [calmMode, setCalmMode] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('drive');
  const [showSettings, setShowSettings] = useState(false);
  useSettings(); // Initialize settings context
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo');

  const [autobahnSegments, setAutobahnSegments] = useState<AutobahnSegment[]>([]);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [trafficHeatmap, setTrafficHeatmap] = useState<TrafficPoint[]>([]);
  const [parkingFacilities, setParkingFacilities] = useState<ParkingFacility[]>([]);
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);

  const [driverProfiles, setDriverProfiles] = useState<DriverProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<DriverProfile | null>(null);
  const [predictiveEvents, setPredictiveEvents] = useState<PredictiveEvent[]>([]);
  const [routeSuggestions, setRouteSuggestions] = useState<RouteSuggestion[]>([]);
  const [voicePrompts, setVoicePrompts] = useState<VoicePrompt[]>([]);

  const [showTrafficHeatmap, setShowTrafficHeatmap] = useState(true);
  const [showAutobahnSegments, setShowAutobahnSegments] = useState(true);
  const [showBaustellen, setShowBaustellen] = useState(true);
  const [currentSegment, setCurrentSegment] = useState<AutobahnSegment | undefined>();

  const routerDest = routerLocation.state?.destination;

  useEffect(() => { startWatch(); return () => stopWatch(); }, []);

  useEffect(() => {
    if (routerDest && !selectedDest) {
      setSelectedDest({ id: 'router', label: routerDest.city, sublabel: `${routerDest.city}, ${routerDest.country}`, lat: routerDest.lat, lng: routerDest.lng, eta: routerDest.eta });
    }
  }, [routerDest]);

  // Load base data from Supabase (fallback)
  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      const [a, b, t, p, pr, e, s] = await Promise.all([
        supabase.from('autobahn_segments').select('*'),
        supabase.from('baustellen').select('*').eq('active', true),
        supabase.from('traffic_heatmap').select('*'),
        supabase.from('parking_facilities').select('*'),
        supabase.from('driver_profiles').select('*'),
        supabase.from('predictive_events').select('*'),
        supabase.from('route_suggestions').select('*'),
      ]);
      if (a.data) setAutobahnSegments(a.data as AutobahnSegment[]);
      if (b.data) setBaustellen(b.data as Baustelle[]);
      if (t.data) setTrafficHeatmap(t.data as TrafficPoint[]);
      if (p.data) setParkingFacilities(p.data as ParkingFacility[]);
      if (e.data) setPredictiveEvents(e.data as PredictiveEvent[]);
      if (s.data) setRouteSuggestions(s.data as RouteSuggestion[]);
      if (pr.data && pr.data.length > 0) { const profiles = pr.data as DriverProfile[]; setDriverProfiles(profiles); setActiveProfile(profiles[1] ?? profiles[0]); }
    }
    fetchData();
  }, []);

  // Fetch real data when GPS position is available
  useEffect(() => {
    if (!gpsPosition) return;
    const lat = gpsPosition.lat;
    const lng = gpsPosition.lng;

    // Fetch real weather
    fetchWeather(lat, lng).then((w) => {
      if (w) {
        setWeather(w);
        setDataSource('live');
        // Convert weather to predictive events
        const weatherEvents = weatherToPredictiveEvents(w, lat, lng);
        setPredictiveEvents((prev) => {
          const nonWeather = prev.filter((e) => !e.id.startsWith('weather-'));
          const mapped = weatherEvents.map((we: WeatherAlert): PredictiveEvent => ({
            id: we.id,
            event_type: 'weather_change' as const,
            road_name: we.road_name,
            lat: we.lat,
            lng: we.lng,
            probability: we.probability,
            impact_minutes: we.impact_minutes,
            description: we.description,
            time_horizon: we.time_horizon,
            severity: we.severity,
          }));
          return [...mapped, ...nonWeather];
        });
      }
    });

    // Fetch real road incidents from Overpass
    fetchRoadIncidents(lat, lng, 50).then((incidents: TrafficIncident[]) => {
      if (incidents.length > 0) {
        setDataSource('live');
        const mapped: Baustelle[] = incidents.map((inc) => ({
          id: inc.id,
          autobahn: inc.road,
          description: inc.description,
          lat: inc.lat,
          lng: inc.lng,
          severity: inc.severity,
          speed_limit: inc.speed_limit,
          lanes_reduced: 0,
          delay_minutes: inc.delay_minutes,
          active: true,
          start_date: null,
          end_date: null,
        }));
        setBaustellen((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          const newOnes = mapped.filter((m) => !existingIds.has(m.id));
          return [...prev, ...newOnes];
        });
      }
    });

    // Fetch real parking from Overpass
    fetchNearbyParking(lat, lng, 20).then((parking: RealParkingFacility[]) => {
      if (parking.length > 0) {
        setDataSource('live');
        setParkingFacilities(parking as unknown as ParkingFacility[]);
      }
    });
  }, [gpsPosition?.lat, gpsPosition?.lng]); // Only re-fetch when position changes significantly

  // Determine current autobahn segment
  useEffect(() => {
    if (!gpsPosition || autobahnSegments.length === 0) return;
    const nearest = autobahnSegments.reduce((closest, seg) => {
      const dist = Math.sqrt(Math.pow(gpsPosition.lat - seg.lat, 2) + Math.pow(gpsPosition.lng - seg.lng, 2));
      return dist < closest.dist ? { seg, dist } : closest;
    }, { seg: autobahnSegments[0], dist: Infinity });
    setCurrentSegment(nearest.seg);
  }, [gpsPosition, autobahnSegments]);

  // Generate route alternatives
  useEffect(() => {
    if (!selectedDest || baustellen.length === 0) { setRouteAlternatives([]); return; }
    const totalDelay = baustellen.filter((b) => b.active).reduce((sum, b) => sum + b.delay_minutes, 0);
    if (totalDelay === 0) { setRouteAlternatives([]); return; }
    setRouteAlternatives([
      { id: 'alt-a3', label: 'Via A3 Frankfurt', autobahn: 'A3', distance: '612 km', duration: '4h 50m', delaySaved: Math.round(totalDelay * 0.6), avgSpeed: 115, trafficLevel: 'moderate', isRecommended: true },
      { id: 'alt-a7', label: 'Via A7 Hannover', autobahn: 'A7', distance: '645 km', duration: '5h 10m', delaySaved: Math.round(totalDelay * 0.4), avgSpeed: 105, trafficLevel: 'free', isRecommended: false },
    ]);
  }, [selectedDest, baustellen]);

  useEffect(() => {
    if (!currentInstruction || !navigating) return;
    setVoicePrompts((prev) => [{ id: `vp-${currentInstruction.id}`, text: currentInstruction.instruction, type: 'turn' as const, priority: 'high' as const }, ...prev].slice(0, 4));
  }, [currentInstruction, navigating]);

  const handleMapReady = useCallback((map: L.Map) => { mapRef.current = map; }, []);

  const handleSelectDestination = async (dest: Destination) => {
    setSelectedDest(dest);
    const from = gpsPosition ? { lat: gpsPosition.lat, lng: gpsPosition.lng } : { lat: 48.1351, lng: 11.582 };

    // Try real OSRM routing first
    const realRoute = await fetchRoute(from, { lat: dest.lat, lng: dest.lng });
    if (realRoute) {
      setRoute(realRoute.geometry);
      setRouteResult(realRoute);
      setDataSource('live');
    } else {
      // Fallback to generated route
      const fallback = generateFallbackRoute(from, { lat: dest.lat, lng: dest.lng });
      setRoute(fallback);
      setRouteResult(null);
    }

    if (mapRef.current) {
      const routePoints = realRoute ? realRoute.geometry : generateFallbackRoute(from, { lat: dest.lat, lng: dest.lng });
      const bounds = L.latLngBounds(routePoints.map((p) => [p.lat, p.lng]));
      mapRef.current.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.2 });
    }
  };

  const startNavigation = () => {
    setNavigating(true);
    setFollowMode('heading');
    if (route.length > 1) startSimulation(route);
    if (mapRef.current && gpsPosition) mapRef.current.setView([gpsPosition.lat, gpsPosition.lng], 16, { animate: true, duration: 1.5 });
  };

  const endNavigation = () => {
    setNavigating(false); setRoute([]); setSelectedDest(null); setFollowMode('none'); setRouteResult(null); stopSimulation();
  };

  const handleLocate = () => {
    if (!gpsPosition || !mapRef.current) return;
    setLocatePressed(true);
    mapRef.current.setView([gpsPosition.lat, gpsPosition.lng], 16, { animate: true, duration: 1.2 });
    setTimeout(() => setLocatePressed(false), 1500);
  };

  const handleSelectAlternative = (_alt: RouteAlternative) => { setRouteAlternatives([]); };
  const handleUpdateProfile = (profile: DriverProfile) => { setActiveProfile(profile); setCalmMode(profile.calm_mode); };

  const handleSelectSuggestion = async (suggestion: RouteSuggestion) => {
    const dest: Destination = { id: suggestion.id, label: suggestion.label, sublabel: suggestion.description, lat: suggestion.to_lat, lng: suggestion.to_lng };
    setSelectedDest(dest);

    const from = { lat: suggestion.from_lat, lng: suggestion.from_lng };
    const to = { lat: suggestion.to_lat, lng: suggestion.to_lng };
    const realRoute = await fetchRoute(from, to);
    if (realRoute) {
      setRoute(realRoute.geometry);
      setRouteResult(realRoute);
    } else {
      const fallback = generateFallbackRoute(from, to);
      setRoute(fallback);
      setRouteResult(null);
    }

    if (mapRef.current) {
      const pts = realRoute ? realRoute.geometry : generateFallbackRoute(from, to);
      const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng]));
      mapRef.current.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.2 });
    }
  };

  const dismissVoicePrompt = (id: string) => { setVoicePrompts((prev) => prev.filter((p) => p.id !== id)); };

  const markers = selectedDest ? [{ lat: selectedDest.lat, lng: selectedDest.lng, label: selectedDest.label }] : [];

  // Use real route distance/duration if available
  const distanceKm = routeResult ? Math.round(routeResult.distance / 1000) : (selectedDest ? Math.round(Math.sqrt(Math.pow((gpsPosition?.lat ?? 48.1351) - selectedDest.lat, 2) + Math.pow((gpsPosition?.lng ?? 11.582) - selectedDest.lng, 2)) * 111) : 0);
  const durationMin = routeResult ? Math.round(routeResult.duration / 60) : 0;
  const effectiveSpeed = calmMode && activeProfile?.preferred_speed === 'relaxed' ? 100 : 130;
  const eta = routeResult ? (() => {
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;
    const now = new Date();
    now.setMinutes(now.getMinutes() + durationMin);
    return { duration: `${h}h ${m.toString().padStart(2, '0')}m`, arrival: now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) };
  })() : calcETA(distanceKm, effectiveSpeed);

  const totalDelay = baustellen.filter((b) => b.active).reduce((sum, b) => sum + b.delay_minutes, 0);
  const displayDistance = isSimulating ? `${Math.round(distanceRemaining / 1000)} km` : `${distanceKm} km`;
  const totalAlerts = baustellen.filter((b) => b.active).length + predictiveEvents.filter((e) => e.severity !== 'info').length;

  const TAB_CONFIG: { key: BottomTab; icon: typeof Navigation; label: string; badge?: number }[] = [
    { key: 'drive', icon: Navigation, label: 'Drive' },
    { key: 'route', icon: Compass, label: 'Routes' },
    { key: 'park', icon: Car, label: 'Park' },
    { key: 'alerts', icon: AlertTriangle, label: 'Alerts', badge: totalAlerts || undefined },
    { key: 'more', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={`relative h-full w-full transition-all duration-700 ${calmMode ? 'hue-rotate-[10deg] saturate-[0.7]' : ''}`}>
      <EuropeMap
        markers={markers} route={route} onMapReady={handleMapReady} interactive={!navigating}
        gpsPosition={gpsPosition} showGps={true} centerOnGps={false} followMode={navigating ? followMode : 'none'}
        trafficHeatmap={trafficHeatmap} showTrafficHeatmap={showTrafficHeatmap}
        autobahnSegments={autobahnSegments} showAutobahnSegments={showAutobahnSegments}
        baustellen={baustellen} showBaustellen={showBaustellen}
        routeProgress={routeProgress} showRouteProgress={isSimulating}
      />

      <AnimatePresence>
        {calmMode && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className="absolute inset-0 pointer-events-none z-10" style={{ background: 'radial-gradient(ellipse at center, rgba(0,230,118,0.02) 0%, transparent 70%)' }} />}
      </AnimatePresence>

      <VoicePrompts prompts={voicePrompts} voiceLevel={activeProfile?.voice_guidance ?? 'minimal'} onDismiss={dismissVoicePrompt} />

      {/* Top bar */}
      <div className="absolute top-3 left-3 right-3 z-20">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          <div className="flex-1 max-w-sm">
            <SearchDestination onSelect={handleSelectDestination} placeholder={selectedDest ? `To ${selectedDest.label}...` : 'Where to?'} />
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleLocate} className={`touch-target w-11 h-11 flex items-center justify-center glass rounded-xl transition-all duration-300 ${locatePressed ? 'bg-cyan-400/15 border-cyan-400/30' : ''}`}>
              <Crosshair className={`w-[18px] h-[18px] ${locatePressed ? 'text-cyan-400' : 'text-white/50'}`} />
            </button>
            <button onClick={() => setCalmMode(!calmMode)} className={`touch-target w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 ${calmMode ? 'glass bg-emerald-400/10 border-emerald-400/25' : 'glass'}`}>
              <Leaf className={`w-[18px] h-[18px] ${calmMode ? 'text-emerald-400' : 'text-white/50'}`} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Right side: status + toggles */}
      <div className="absolute top-16 right-3 z-20 flex flex-col gap-1.5">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg glass text-[9px] ${watching && gpsPosition ? 'text-emerald-400' : 'text-amber-400'}`}>
          {watching && gpsPosition ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
          <span className="uppercase tracking-wider font-medium">{isSimulating ? 'SIM' : isRealGPS ? 'GPS' : 'DEMO'}</span>
        </div>

        {/* Data source indicator */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg glass text-[9px] ${dataSource === 'live' ? 'text-cyan-400' : 'text-white/20'}`}>
          {dataSource === 'live' ? <Zap className="w-2.5 h-2.5" /> : <Cloud className="w-2.5 h-2.5" />}
          <span className="uppercase tracking-wider font-medium">{dataSource === 'live' ? 'LIVE' : 'DEMO'}</span>
        </div>

        {/* Weather indicator */}
        {weather && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg glass text-[9px] text-white/30">
            <Cloud className="w-2.5 h-2.5" />
            <span className="tabular-nums">{Math.round(weather.temp_c)}°</span>
          </div>
        )}

        {navigating && (
          <div className="flex flex-col gap-1">
            {([['heading', Navigation], ['follow', Crosshair], ['none', EyeOff]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setFollowMode(mode as FollowMode)}
                className={`touch-target w-9 h-9 flex items-center justify-center rounded-lg text-[8px] transition-all duration-200 ${followMode === mode ? 'glass bg-cyan-400/10 border-cyan-400/20 text-cyan-400' : 'glass-light text-white/25'}`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1">
          {[
            { state: showTrafficHeatmap, setter: setShowTrafficHeatmap, Icon: TrendingUp },
            { state: showAutobahnSegments, setter: setShowAutobahnSegments, Icon: Zap },
            { state: showBaustellen, setter: setShowBaustellen, Icon: AlertTriangle },
          ].map(({ state, setter, Icon }) => (
            <button key={Icon.displayName} onClick={() => setter(!state)}
              className={`touch-target w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${state ? 'glass bg-cyan-400/10 border-cyan-400/20 text-cyan-400' : 'glass-light text-white/20'}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Turn-by-turn */}
      {navigating && currentInstruction && (
        <div className="absolute top-16 left-3 right-14 z-20">
          <TurnByTurnNav currentInstruction={currentInstruction} upcomingInstructions={upcomingInstructions as unknown as TurnInstruction[]} distanceToNext={currentInstruction.distance} navigating={navigating} />
        </div>
      )}

      {/* Bottom navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <AnimatePresence mode="wait">
          {!navigating && (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }} className="mx-3 mb-2">
              {activeTab === 'drive' && (
                <div className="glass-heavy rounded-2xl p-5 space-y-4">
                  {selectedDest ? (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                          <Navigation className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-driving-lg font-medium text-white/90 truncate">{selectedDest.label}</div>
                          <div className="text-driving-sm text-white/35">{selectedDest.sublabel}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-driving-lg font-light text-cyan-400 tabular-nums">{eta.duration}</div>
                          <div className="text-xs text-white/30">{eta.arrival}</div>
                        </div>
                      </div>
                      {totalDelay > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-400/[0.06] border border-amber-400/15">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="text-driving-sm text-amber-400">+{totalDelay} min from Baustellen</span>
                        </div>
                      )}
                      {routeResult && (
                        <div className="flex items-center gap-2 text-[11px] text-white/20">
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span>Real route via OSRM — {Math.round(routeResult.distance / 1000)} km, {Math.round(routeResult.duration / 60)} min</span>
                        </div>
                      )}
                      <button onClick={startNavigation} className="touch-target w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/15 border border-cyan-400/20 transition-all duration-300">
                        <Navigation className="w-5 h-5 text-cyan-400" />
                        <span className="text-driving font-medium text-cyan-400">Start Navigation</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-driving text-white/30">Select a destination to begin</div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'route' && activeProfile && (
                <div className="glass-heavy rounded-2xl p-4 space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide">
                  <DriverPersonality profiles={driverProfiles} activeProfile={activeProfile} onSelectProfile={setActiveProfile} onUpdateProfile={handleUpdateProfile} compact={true} />
                  {routeSuggestions.length > 0 && <SmartRouteSuggestions suggestions={routeSuggestions} personalityType={activeProfile.personality_type} compact={true} onSelect={handleSelectSuggestion} />}
                </div>
              )}

              {activeTab === 'park' && (
                <div className="glass-heavy rounded-2xl p-4 space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide">
                  {parkingFacilities.length > 0 && <ParkingIntelligence facilities={parkingFacilities} compact={true} onSelect={(f) => { if (mapRef.current) mapRef.current.setView([f.lat, f.lng], 14, { animate: true, duration: 1 }); }} />}
                </div>
              )}

              {activeTab === 'alerts' && (
                <div className="glass-heavy rounded-2xl p-4 space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide">
                  {baustellen.length > 0 && <BaustelleAlerts alerts={baustellen} compact={true} onAlertClick={(a) => { if (mapRef.current) mapRef.current.setView([a.lat, a.lng], 12, { animate: true, duration: 1 }); }} />}
                  {predictiveEvents.length > 0 && <PredictiveNavigation events={predictiveEvents} compact={true} onEventClick={(e) => { if (mapRef.current) mapRef.current.setView([e.lat, e.lng], 12, { animate: true, duration: 1 }); }} />}
                  {routeAlternatives.length > 0 && <SmartRerouting alternatives={routeAlternatives} onSelect={handleSelectAlternative} currentDelay={totalDelay} visible={true} />}
                </div>
              )}

              {activeTab === 'more' && (
                <div className="glass-heavy rounded-2xl p-4 space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide">
                  <button onClick={() => setShowSettings(true)} className="touch-target w-full flex items-center gap-3 px-4 py-3 rounded-xl glass-light hover:bg-white/[0.06] transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/[0.08] flex items-center justify-center">
                      <Settings className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-driving-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">All Settings</div>
                      <div className="text-[11px] text-white/20">Theme, voice, privacy, vehicle, and more</div>
                    </div>
                    <Compass className="w-4 h-4 text-white/10 group-hover:text-white/25 transition-colors rotate-90" />
                  </button>
                  {activeProfile && <CalmDrivingExperience active={calmMode} musicGenre={activeProfile.music_genre} voiceGuidance={activeProfile.voice_guidance} onToggle={() => { setCalmMode(!calmMode); if (activeProfile) setActiveProfile({ ...activeProfile, calm_mode: !calmMode }); }} onChangeMusic={(g) => { if (activeProfile) setActiveProfile({ ...activeProfile, music_genre: g as DriverProfile['music_genre'] }); }} onChangeVoice={(l) => { if (activeProfile) setActiveProfile({ ...activeProfile, voice_guidance: l as DriverProfile['voice_guidance'] }); }} />}
                  {currentSegment && <AutobahnAwareness segments={autobahnSegments} currentSegment={currentSegment} compact={true} />}
                  {weather && (
                    <div className="glass rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-400/[0.08] flex items-center justify-center">
                          <Cloud className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="text-driving-sm font-medium text-white/80">{weather.condition}</div>
                          <div className="text-[11px] text-white/25">{Math.round(weather.temp_c)}°C — Feels like {Math.round(weather.feelslike_c)}°C</div>
                        </div>
                        <div className="text-right">
                          <div className="text-driving-lg font-light text-white/60 tabular-nums">{Math.round(weather.temp_c)}°</div>
                          <div className="text-[10px] text-white/20">Wind {Math.round(weather.wind_kph)} km/h</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {navigating && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-3 mb-2">
              <div className={`glass-heavy rounded-2xl p-5 transition-colors duration-500 ${calmMode ? 'border-emerald-400/15' : ''}`}>
                <div className="flex items-center gap-5 mb-4">
                  <div className="text-center">
                    <div className={`text-4xl font-extralight tabular-nums tracking-tight ${calmMode ? 'text-emerald-400' : 'text-cyan-400'}`}>
                      {gpsPosition?.speed ? Math.round(gpsPosition.speed) : '—'}
                    </div>
                    <div className="text-[10px] text-white/25 uppercase tracking-widest mt-0.5">km/h</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-driving-lg font-medium text-white/90 truncate">
                      {currentSegment ? `${currentSegment.name} — ${currentSegment.description}` : 'Head northeast'}
                    </div>
                    <div className="text-driving-sm text-white/35 mt-0.5">
                      {currentSegment ? `${currentSegment.lanes} lanes — ${currentSegment.traffic_density} traffic` : `A9 toward ${selectedDest?.label ?? 'destination'}`}
                    </div>
                  </div>
                  {currentSegment && (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentSegment.has_speed_limit ? 'bg-red-500 border-2 border-white' : 'border-2 border-white/25'}`}>
                      <span className={`text-sm font-bold ${currentSegment.has_speed_limit ? 'text-white' : 'text-white/40'}`}>{currentSegment.has_speed_limit ? currentSegment.speed_limit : '∞'}</span>
                    </div>
                  )}
                </div>

                {calmMode && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-400/[0.05] border border-emerald-400/15 mb-4">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}><Leaf className="w-4 h-4 text-emerald-400" /></motion.div>
                    <span className="text-driving-sm text-emerald-400 font-medium">Calm mode</span>
                  </div>
                )}

                {isSimulating && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-white/20 mb-1"><span>Progress</span><span className="tabular-nums">{Math.round(routeProgress * 100)}%</span></div>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${calmMode ? 'bg-emerald-400' : 'bg-cyan-400'}`} animate={{ width: `${routeProgress * 100}%` }} transition={{ duration: 0.3 }} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: Clock, value: eta.arrival, label: 'ETA' },
                    { icon: Fuel, value: '72%', label: 'Fuel' },
                    { icon: MapPin, value: displayDistance, label: 'Dist' },
                  ].map(({ icon: Icon, value, label }) => (
                    <div key={label} className="bg-white/[0.02] rounded-xl p-3 text-center">
                      <Icon className="w-4 h-4 text-white/20 mx-auto mb-1" />
                      <div className="text-driving font-medium text-white/75 tabular-nums">{value}</div>
                      <div className="text-[9px] text-white/20 uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {isSimulating && (
                    <div className="flex gap-1">
                      {(['city', 'highway', 'autobahn'] as const).map((p) => (
                        <button key={p} onClick={() => setSpeedProfile(p)} className={`touch-target px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${speedProfile === p ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'bg-white/[0.02] text-white/20 border border-white/[0.04]'}`}>
                          {p === 'city' ? '50' : p === 'highway' ? '100' : '130'}
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={endNavigation} className="touch-target flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/[0.06] hover:bg-red-500/10 border border-red-500/15 transition-colors">
                    <X className="w-4 h-4 text-red-400" />
                    <span className="text-driving-sm font-medium text-red-400">End</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab bar */}
        <div className="glass-heavy border-t border-white/[0.04]">
          <div className="flex items-center justify-around px-2 py-1">
            {TAB_CONFIG.map(({ key, icon: Icon, label, badge }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`touch-target flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-all duration-200 relative ${activeTab === key ? 'text-cyan-400' : 'text-white/25'}`}>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge ? <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-[8px] font-bold text-black flex items-center justify-center">{badge > 9 ? '9+' : badge}</span> : null}
                </div>
                <span className="text-[9px] font-medium uppercase tracking-wider">{label}</span>
                {activeTab === key && <motion.div layoutId="tab-indicator" className="absolute -bottom-1 w-5 h-0.5 rounded-full bg-cyan-400" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-50"
          >
            <SettingsPage onBack={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default NavigationPage