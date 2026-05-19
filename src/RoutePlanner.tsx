import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EuropeMap from '../components/EuropeMap';
import BaustelleAlerts from '../components/BaustelleAlerts';
import ParkingIntelligence from '../components/ParkingIntelligence';
import { useGeolocation } from '../hooks/useGeolocation';
import { supabase } from '../lib/supabase';
import {
  Plus,
  X,
  Clock,
  Fuel,
  Zap,
  MapPin,
  Settings2,
  Sliders,
  RotateCcw,
  Check,
  Navigation,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import L from 'leaflet';

interface Waypoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface AutobahnSegment {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  speed_limit: number | null;
  has_speed_limit: boolean;
  advisory_speed: number;
  lanes: number;
  traffic_density: string;
  route_coords: Array<[number, number]>;
}

interface Baustelle {
  id: string;
  autobahn: string;
  description: string;
  lat: number;
  lng: number;
  severity: 'minor' | 'moderate' | 'major';
  speed_limit: number;
  lanes_reduced: number;
  delay_minutes: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
}

interface TrafficPoint {
  lat: number;
  lng: number;
  congestion_level: number;
  average_speed_kmh: number;
  flow_type: string;
  road_name: string;
}

interface ParkingFacility {
  id: string;
  name: string;
  type: 'parkhaus' | 'parkplatz' | 'p_r_metro' | 'rest_stop';
  lat: number;
  lng: number;
  city: string;
  total_spaces: number;
  available_spaces: number;
  ev_charging: boolean;
  ev_chargers_available: number;
  price_per_hour_eur: number;
  is_free: boolean;
  has_disabled_access: boolean;
}

const DEFAULT_WAYPOINTS: Waypoint[] = [
  { id: '1', label: 'Munich', lat: 48.1351, lng: 11.582 },
  { id: '2', label: 'Nuremberg', lat: 49.452, lng: 11.08 },
  { id: '3', label: 'Berlin', lat: 52.52, lng: 13.405 },
];

const SUGGESTED_CITIES = [
  { label: 'Prague', lat: 50.075, lng: 14.437 },
  { label: 'Zurich', lat: 47.376, lng: 8.541 },
  { label: 'Milan', lat: 45.464, lng: 9.19 },
  { label: 'Brussels', lat: 50.85, lng: 4.351 },
  { label: 'Copenhagen', lat: 55.676, lng: 12.568 },
  { label: 'Lyon', lat: 45.757, lng: 4.832 },
];

type RouteProfile = 'fastest' | 'eco' | 'scenic';
type FuelType = 'electric' | 'hybrid' | 'diesel' | 'petrol';

export default function RoutePlanner() {
  const mapRef = useRef<L.Map | null>(null);
  const { position: gpsPosition, watching, startWatch } = useGeolocation(true);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(DEFAULT_WAYPOINTS);
  const [profile, setProfile] = useState<RouteProfile>('fastest');
  const [fuelType, setFuelType] = useState<FuelType>('electric');
  const [showSettings, setShowSettings] = useState(false);
  const [addingWaypoint, setAddingWaypoint] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Driving intelligence data
  const [autobahnSegments, setAutobahnSegments] = useState<AutobahnSegment[]>([]);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [trafficHeatmap, setTrafficHeatmap] = useState<TrafficPoint[]>([]);
  const [parkingFacilities, setParkingFacilities] = useState<ParkingFacility[]>([]);

  // Overlay toggles
  const [showTrafficHeatmap, setShowTrafficHeatmap] = useState(true);
  const [showAutobahnSegments, setShowAutobahnSegments] = useState(true);
  const [showBaustellen, setShowBaustellen] = useState(true);

  useEffect(() => {
    startWatch();
  }, []);

  // Fetch driving intelligence data
  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      const [autobahnRes, baustellenRes, trafficRes, parkingRes] = await Promise.all([
        supabase.from('autobahn_segments').select('*'),
        supabase.from('baustellen').select('*').eq('active', true),
        supabase.from('traffic_heatmap').select('*'),
        supabase.from('parking_facilities').select('*'),
      ]);
      if (autobahnRes.data) setAutobahnSegments(autobahnRes.data as AutobahnSegment[]);
      if (baustellenRes.data) setBaustellen(baustellenRes.data as Baustelle[]);
      if (trafficRes.data) setTrafficHeatmap(trafficRes.data as TrafficPoint[]);
      if (parkingRes.data) setParkingFacilities(parkingRes.data as ParkingFacility[]);
    }
    fetchData();
  }, []);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const routeCoords = waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
  const mapMarkers = waypoints.map((w) => ({ lat: w.lat, lng: w.lng, label: w.label }));

  const addWaypoint = (city: { label: string; lat: number; lng: number }) => {
    const newWp: Waypoint = {
      id: Date.now().toString(),
      label: city.label,
      lat: city.lat,
      lng: city.lng,
    };
    setWaypoints((prev) => [...prev, newWp]);
    setAddingWaypoint(false);
    if (mapRef.current) {
      const allCoords = [...waypoints, newWp].map((w) => L.latLng(w.lat, w.lng));
      const bounds = L.latLngBounds(allCoords);
      mapRef.current.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 1 });
    }
  };

  const removeWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  const resetRoute = () => {
    setWaypoints(DEFAULT_WAYPOINTS);
    setProfile('fastest');
    setFuelType('electric');
    setConfirmed(false);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    if (mapRef.current) {
      const allCoords = waypoints.map((w) => L.latLng(w.lat, w.lng));
      const bounds = L.latLngBounds(allCoords);
      mapRef.current.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.2 });
    }
  };

  const profiles: { key: RouteProfile; label: string; icon: typeof Zap }[] = [
    { key: 'fastest', label: 'Fastest', icon: Zap },
    { key: 'eco', label: 'Eco', icon: Fuel },
    { key: 'scenic', label: 'Scenic', icon: MapPin },
  ];

  const fuelTypes: { key: FuelType; label: string }[] = [
    { key: 'electric', label: 'EV' },
    { key: 'hybrid', label: 'Hybrid' },
    { key: 'diesel', label: 'Diesel' },
    { key: 'petrol', label: 'Petrol' },
  ];

  const totalDistance = waypoints.length > 1 ? '584 km' : '—';
  const totalTime = waypoints.length > 1 ? '5h 40m' : '—';
  const totalStops = fuelType === 'electric' ? '1 charge stop' : fuelType === 'hybrid' ? '0 stops' : '1 fuel stop';
  const totalDelay = baustellen.filter((b) => b.active).reduce((sum, b) => sum + b.delay_minutes, 0);

  return (
    <div className="relative h-full w-full">
      {/* Map with all overlays */}
      <EuropeMap
        markers={mapMarkers}
        route={waypoints.length > 1 ? routeCoords : []}
        onMapReady={handleMapReady}
        interactive={!confirmed}
        gpsPosition={gpsPosition}
        showGps={true}
        centerOnGps={false}
        trafficHeatmap={trafficHeatmap}
        showTrafficHeatmap={showTrafficHeatmap}
        autobahnSegments={autobahnSegments}
        showAutobahnSegments={showAutobahnSegments}
        baustellen={baustellen}
        showBaustellen={showBaustellen}
      />

      {/* GPS status + overlay toggles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-4 right-4 z-20 flex flex-col gap-2"
      >
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-xl text-[10px] ${
          watching && gpsPosition
            ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400'
            : 'bg-amber-400/10 border border-amber-400/20 text-amber-400'
        }`}>
          {watching && gpsPosition ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="uppercase tracking-wider font-medium">
            {watching && gpsPosition ? 'GPS Live' : 'No Signal'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {[
            { label: 'Traffic', state: showTrafficHeatmap, setter: setShowTrafficHeatmap },
            { label: 'Autobahn', state: showAutobahnSegments, setter: setShowAutobahnSegments },
            { label: 'Baustelle', state: showBaustellen, setter: setShowBaustellen },
          ].map(({ label, state, setter }) => (
            <button
              key={label}
              onClick={() => setter(!state)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg backdrop-blur-xl text-[10px] transition-all duration-200 ${
                state
                  ? 'bg-cyan-400/10 border border-cyan-400/20 text-cyan-400'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/30'
              }`}
            >
              {state ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="uppercase tracking-wider font-medium">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Left panel */}
      <div className="absolute top-4 left-4 bottom-4 w-80 z-20 flex flex-col gap-3 overflow-y-auto scrollbar-hide pr-1">
        {/* Waypoints card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#12121a]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase">Route</h2>
            <button
              onClick={resetRoute}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white/30" />
            </button>
          </div>

          <div className="space-y-2">
            {waypoints.map((wp, i) => (
              <motion.div
                key={wp.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${
                    i === 0 ? 'bg-emerald-400' : i === waypoints.length - 1 ? 'bg-red-400' : 'bg-cyan-400'
                  }`} style={{ boxShadow: `0 0 8px ${i === 0 ? '#00e676' : i === waypoints.length - 1 ? '#ff5252' : '#00e5ff'}40` }} />
                  {i < waypoints.length - 1 && <div className="w-px h-4 bg-white/10" />}
                </div>
                <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/70">
                  {wp.label}
                </div>
                {waypoints.length > 2 && i > 0 && i < waypoints.length - 1 && (
                  <button
                    onClick={() => removeWaypoint(wp.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-white/30" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {addingWaypoint ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {SUGGESTED_CITIES.map((city) => (
                    <button
                      key={city.label}
                      onClick={() => addWaypoint(city)}
                      className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg px-2.5 py-2 transition-colors"
                    >
                      <MapPin className="w-3 h-3 text-white/30" />
                      <span className="text-xs text-white/60">{city.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAddingWaypoint(false)}
                  className="w-full mt-2 text-xs text-white/30 hover:text-white/50 transition-colors py-1"
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setAddingWaypoint(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/[0.1] rounded-lg py-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-white/30" />
                <span className="text-xs text-white/30">Add stop</span>
              </button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Route profile */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#12121a]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase">Profile</h2>
          <div className="grid grid-cols-3 gap-2">
            {profiles.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setProfile(key)}
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all duration-300 ${
                  profile === key
                    ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium tracking-wider uppercase">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Baustelle alerts */}
        {baustellen.length > 0 && (
          <BaustelleAlerts
            alerts={baustellen}
            compact={true}
            onAlertClick={(alert) => {
              if (mapRef.current) {
                mapRef.current.setView([alert.lat, alert.lng], 12, { animate: true, duration: 1 });
              }
            }}
          />
        )}

        {/* Parking */}
        {parkingFacilities.length > 0 && (
          <ParkingIntelligence
            facilities={parkingFacilities}
            compact={true}
            onSelect={(facility) => {
              if (mapRef.current) {
                mapRef.current.setView([facility.lat, facility.lng], 14, { animate: true, duration: 1 });
              }
            }}
          />
        )}

        {/* Settings toggle */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between bg-[#12121a]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl px-4 py-3 transition-colors hover:bg-[#12121a]/95"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">Vehicle Settings</span>
            </div>
            <Sliders className="w-3.5 h-3.5 text-white/30" />
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-[#12121a]/90 backdrop-blur-2xl border border-t-0 border-white/[0.06] rounded-b-2xl p-4 space-y-3">
                  <div className="text-xs text-white/40 uppercase tracking-wider">Fuel Type</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {fuelTypes.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setFuelType(key)}
                        className={`py-2 rounded-lg border text-xs font-medium transition-all duration-300 ${
                          fuelType === key
                            ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right bottom: Route summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-4 right-4 z-20"
      >
        <div className="bg-[#12121a]/90 backdrop-blur-2xl border border-white/[0.06] rounded-2xl overflow-hidden min-w-[220px]">
          <div className="h-0.5 bg-gradient-to-r from-cyan-400 via-cyan-400/60 to-transparent" />

          <div className="p-4 space-y-3">
            <div className="text-xs text-white/40 uppercase tracking-wider">Route Summary</div>

            {/* Delay warning */}
            {totalDelay > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/20">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-400">+{totalDelay} min from Baustellen</span>
              </div>
            )}

            <div className="space-y-2">
              {[
                { icon: MapPin, value: totalDistance, label: 'Distance' },
                { icon: Clock, value: totalTime, label: 'Duration' },
                { icon: Zap, value: totalStops, label: 'Stops' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-xs text-white/40">{label}</span>
                  </div>
                  <span className="text-sm font-medium text-white/80 tabular-nums">{value}</span>
                </div>
              ))}
            </div>

            {confirmed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-center gap-2 py-2.5 text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Route Confirmed</span>
                </div>
                <button className="w-full flex items-center justify-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl py-2.5 transition-all duration-300 group">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">Start Driving</span>
                </button>
              </motion.div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={waypoints.length < 2}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all duration-300 group ${
                  waypoints.length >= 2
                    ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20'
                    : 'bg-white/[0.03] border border-white/[0.06] cursor-not-allowed'
                }`}
              >
                <Check className={`w-4 h-4 ${waypoints.length >= 2 ? 'text-cyan-400' : 'text-white/20'}`} />
                <span className={`text-sm font-medium ${waypoints.length >= 2 ? 'text-cyan-400' : 'text-white/20'}`}>
                  Confirm Route
                </span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
