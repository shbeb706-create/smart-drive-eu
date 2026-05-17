import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Fuel, Zap, ArrowRight, Navigation } from 'lucide-react';

interface ETACardProps {
  destination: string;
  distance: string;
  duration: string;
  arrivalTime: string;
  fuelOrCharge: string;
  stops: string;
  active: boolean;
  onDismiss?: () => void;
}

export default function ETACard({
  destination,
  distance,
  duration,
  arrivalTime,
  fuelOrCharge,
  stops,
  active,
  onDismiss,
}: ETACardProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="glass-heavy rounded-2xl overflow-hidden shadow-2xl shadow-black/40"
        >
          {/* Top accent line */}
          <div className="h-0.5 bg-gradient-to-r from-cyan-400 via-cyan-400/60 to-transparent" />

          <div className="p-4 space-y-4">
            {/* Destination header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-base font-medium text-white/90">{destination}</div>
                  <div className="flex items-center gap-1.5 text-xs text-white/40 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>Route active</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1"
                >
                  Hide
                </button>
              )}
            </div>

            {/* Primary ETA */}
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-light text-white/90 tabular-nums tracking-wide">
                  {arrivalTime}
                </div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
                  Estimated arrival
                </div>
              </div>
              <div className="flex items-center gap-1 text-cyan-400">
                <ArrowRight className="w-4 h-4" />
                <span className="text-lg font-light tabular-nums">{duration}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: MapPin, value: distance, label: 'Distance' },
                { icon: Fuel, value: fuelOrCharge, label: 'Fuel' },
                { icon: Zap, value: stops, label: 'Stops' },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="bg-white/[0.03] rounded-xl px-3 py-2.5 text-center border border-white/[0.03]"
                >
                  <Icon className="w-3.5 h-3.5 text-white/25 mx-auto mb-1.5" />
                  <div className="text-sm font-medium text-white/80 tabular-nums">{value}</div>
                  <div className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-white/30">
                <span>Progress</span>
                <span>38%</span>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/60 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '38%' }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
