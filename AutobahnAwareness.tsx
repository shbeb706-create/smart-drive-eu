import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, AlertCircle, ChevronRight } from 'lucide-react';

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
}

interface AutobahnAwarenessProps {
  segments: AutobahnSegment[];
  currentSegment?: AutobahnSegment;
  onSegmentClick?: (segment: AutobahnSegment) => void;
  compact?: boolean;
}

const DENSITY_COLORS: Record<string, string> = {
  low: 'text-emerald-400',
  moderate: 'text-amber-400',
  high: 'text-red-400',
  standstill: 'text-red-500',
};

const DENSITY_BG: Record<string, string> = {
  low: 'bg-emerald-400/10',
  moderate: 'bg-amber-400/10',
  high: 'bg-red-400/10',
  standstill: 'bg-red-500/10',
};

const DENSITY_LABELS: Record<string, string> = {
  low: 'Free flow',
  moderate: 'Moderate',
  high: 'Dense',
  standstill: 'Standstill',
};

export default function AutobahnAwareness({
  segments,
  currentSegment,
  onSegmentClick,
  compact = false,
}: AutobahnAwarenessProps) {
  if (compact && currentSegment) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="h-px bg-gradient-to-r from-cyan-400/40 via-cyan-400/20 to-transparent" />
        <div className="p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-cyan-400/[0.08] flex items-center justify-center flex-shrink-0">
            <Gauge className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-driving font-medium text-white/90">{currentSegment.name}</div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-medium ${DENSITY_COLORS[currentSegment.traffic_density]}`}>
                {DENSITY_LABELS[currentSegment.traffic_density]}
              </span>
              <span className="text-[11px] text-white/20">{currentSegment.lanes} lanes</span>
            </div>
          </div>
          {currentSegment.has_speed_limit ? (
            <div className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{currentSegment.speed_limit}</span>
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full border-2 border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white/40">∞</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {segments.map((segment, i) => (
          <motion.button
            key={segment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSegmentClick?.(segment)}
            className={`touch-target w-full text-left glass rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group ${
              currentSegment?.id === segment.id ? 'border-cyan-400/25' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${DENSITY_BG[segment.traffic_density]} flex items-center justify-center`}>
                <Gauge className="w-4 h-4 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-driving-sm font-medium text-white/80">{segment.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] font-medium ${DENSITY_COLORS[segment.traffic_density]}`}>
                    {DENSITY_LABELS[segment.traffic_density]}
                  </span>
                  {segment.has_speed_limit && (
                    <span className="text-[11px] text-red-400/70 flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" />
                      {segment.speed_limit} km/h
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {segment.has_speed_limit ? (
                  <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{segment.speed_limit}</span>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white/30">∞</span>
                  </div>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
              </div>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
