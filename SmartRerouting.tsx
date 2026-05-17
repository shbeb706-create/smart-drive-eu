import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, Gauge, Zap, Route } from 'lucide-react';

interface RouteAlternative {
  id: string;
  label: string;
  autobahn: string;
  distance: string;
  duration: string;
  delaySaved: number;
  avgSpeed: number;
  trafficLevel: 'free' | 'moderate' | 'heavy';
  isRecommended: boolean;
}

interface SmartReroutingProps {
  alternatives: RouteAlternative[];
  onSelect?: (route: RouteAlternative) => void;
  currentDelay: number;
  visible: boolean;
}

const TRAFFIC_COLORS = {
  free: 'text-emerald-400',
  moderate: 'text-amber-400',
  heavy: 'text-red-400',
};

const TRAFFIC_BG = {
  free: 'bg-emerald-400/10',
  moderate: 'bg-amber-400/10',
  heavy: 'bg-red-400/10',
};

export default function SmartRerouting({ alternatives, onSelect, currentDelay, visible }: SmartReroutingProps) {
  if (!visible || alternatives.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="glass-heavy rounded-2xl overflow-hidden shadow-2xl shadow-black/40"
        >
          <div className="h-0.5 bg-gradient-to-r from-amber-400 via-amber-400/60 to-transparent" />

          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <Route className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/80">Smart Rerouting</div>
                  <div className="text-[10px] text-white/30">
                    {currentDelay > 0 ? `${currentDelay} min delay detected` : 'Faster routes available'}
                  </div>
                </div>
              </div>
              {currentDelay > 0 && (
                <span className="text-xs text-red-400 font-medium tabular-nums">
                  -{currentDelay} min
                </span>
              )}
            </div>

            {/* Alternatives */}
            <div className="space-y-2">
              {alternatives.map((alt, i) => (
                <motion.button
                  key={alt.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => onSelect?.(alt)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 group ${
                    alt.isRecommended
                      ? 'bg-cyan-400/[0.06] border-cyan-400/20 hover:border-cyan-400/40'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Recommended badge */}
                  {alt.isRecommended && (
                    <div className="absolute -top-1.5 -left-1">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white/80">{alt.label}</span>
                      {alt.isRecommended && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 font-medium uppercase tracking-wider">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {alt.autobahn}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Gauge className="w-2.5 h-2.5" />
                        {alt.avgSpeed} km/h avg
                      </span>
                      <span className={`flex items-center gap-0.5 ${TRAFFIC_COLORS[alt.trafficLevel]}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${TRAFFIC_BG[alt.trafficLevel]}`} />
                        {alt.trafficLevel}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-white/80 tabular-nums">{alt.duration}</div>
                    <div className="text-[10px] text-white/30">{alt.distance}</div>
                    {alt.delaySaved > 0 && (
                      <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                        Save {alt.delaySaved} min
                      </div>
                    )}
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
