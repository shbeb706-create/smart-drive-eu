import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EuropeMap from '../components/EuropeMap';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  Navigation,
  Route,
  Cloud,
  Thermometer,
  Wind,
  MapPin,
  Clock,
  Zap,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react';

const QUICK_DESTINATIONS = [
  { city: 'Berlin', country: 'DE', lat: 52.52, lng: 13.405, eta: '1h 45m' },
  { city: 'Paris', country: 'FR', lat: 48.856, lng: 2.352, eta: '4h 20m' },
  { city: 'Vienna', country: 'AT', lat: 48.208, lng: 16.373, eta: '3h 10m' },
  { city: 'Amsterdam', country: 'NL', lat: 52.367, lng: 4.904, eta: '2h 55m' },
];

const MAP_MARKERS = QUICK_DESTINATIONS.map((d) => ({
  lat: d.lat,
  lng: d.lng,
  label: `${d.city}, ${d.country}`,
}));

export default function Home() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const { position: gpsPosition, watching, startWatch } = useGeolocation(true);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    startWatch();
    return () => clearInterval(interval);
  }, []);

  const locationLabel = gpsPosition
    ? `${gpsPosition.lat.toFixed(4)}, ${gpsPosition.lng.toFixed(4)}`
    : 'Munich, Germany';

  return (
    <div className="relative h-full w-full">
      {/* Fullscreen map with GPS */}
      <EuropeMap
        markers={MAP_MARKERS}
        interactive={false}
        gpsPosition={gpsPosition}
        showGps={true}
        centerOnGps={false}
      />

      {/* Overlay gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-transparent pointer-events-none" />

      {/* Top-left: Time & GPS Location */}
      <div className="absolute top-5 left-5 z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="text-4xl font-extralight tracking-wider text-white/90 tabular-nums">
            {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <MapPin className="w-3 h-3" />
            <span>{locationLabel}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] w-fit ${
            watching && gpsPosition
              ? 'bg-emerald-400/10 text-emerald-400'
              : 'bg-white/[0.04] text-white/30'
          }`}>
            {watching && gpsPosition ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
            <span className="uppercase tracking-wider font-medium">
              {watching && gpsPosition ? 'GPS Live' : 'Searching...'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Top-right: Weather widget */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-5 right-5 z-10"
      >
        <div className="bg-white/[0.04] backdrop-blur-2xl rounded-2xl border border-white/[0.06] p-4 space-y-3 min-w-[160px]">
          <div className="flex items-center justify-between">
            <Cloud className="w-5 h-5 text-white/50" />
            <span className="text-2xl font-light text-white/90">14°</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-white/30">
            <div className="flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              <span>12° / 16°</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              <span>18 km/h</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Center: Vehicle status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border border-cyan-400/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-cyan-400/60" />
            </div>
            <div className="absolute inset-0 rounded-full border border-cyan-400/10 animate-ping" />
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-white/70">87%</div>
            <div className="text-[10px] text-white/30 tracking-wider uppercase">Battery</div>
          </div>
          {gpsPosition?.speed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-1"
            >
              <div className="text-lg font-light text-white/60 tabular-nums">
                {Math.round(gpsPosition.speed)} km/h
              </div>
              <div className="text-[9px] text-white/25 uppercase tracking-wider">Speed</div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Bottom: Quick destinations + Actions */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {/* Quick destinations */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_DESTINATIONS.map((dest, i) => (
              <motion.button
                key={dest.city}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                onClick={() => navigate('/navigation', { state: { destination: dest } })}
                className="flex-shrink-0 group bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-2xl rounded-xl border border-white/[0.06] px-4 py-3 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      {dest.city}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white/30">
                      <Clock className="w-2.5 h-2.5" />
                      {dest.eta}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-cyan-400 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/navigation')}
              className="flex-1 flex items-center justify-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl py-3 transition-all duration-300 group"
            >
              <Navigation className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-cyan-400">Start Driving</span>
            </button>
            <button
              onClick={() => navigate('/route-planner')}
              className="flex-1 flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl py-3 transition-all duration-300 group"
            >
              <Route className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors" />
              <span className="text-sm font-medium text-white/50 group-hover:text-white/80 transition-colors">Plan Route</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
