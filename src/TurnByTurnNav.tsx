import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
  RotateCw,
  Merge,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Navigation,
} from 'lucide-react';

export interface TurnInstruction {
  id: string;
  instruction: string;
  detail: string;
  distance: number;
  icon: string;
  triggered: boolean;
}

interface TurnByTurnNavProps {
  currentInstruction: TurnInstruction | null;
  upcomingInstructions: TurnInstruction[];
  distanceToNext: number;
  navigating: boolean;
}

const ICON_MAP: Record<string, typeof ArrowUp> = {
  straight: ArrowUp,
  'slight-right': ChevronRight,
  right: CornerUpRight,
  'sharp-right': CornerUpRight,
  'slight-left': ChevronLeft,
  left: CornerUpLeft,
  'sharp-left': CornerUpLeft,
  roundabout: RotateCw,
  merge: Merge,
  exit: LogOut,
};

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  if (meters >= 100) return `${Math.round(meters / 10) * 10} m`;
  return `${Math.round(meters)} m`;
}

export default function TurnByTurnNav({
  currentInstruction,
  upcomingInstructions,
  distanceToNext,
  navigating,
}: TurnByTurnNavProps) {
  if (!navigating || !currentInstruction) return null;

  const Icon = ICON_MAP[currentInstruction.icon] ?? Navigation;
  const nextUp = upcomingInstructions[0];

  return (
    <div className="space-y-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentInstruction.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="glass-heavy rounded-2xl overflow-hidden"
        >
          <div className="h-px bg-gradient-to-r from-cyan-400/50 via-cyan-400/25 to-transparent" />
          <div className="p-4">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="w-14 h-14 rounded-2xl bg-cyan-400/[0.08] flex items-center justify-center flex-shrink-0"
              >
                <Icon className="w-7 h-7 text-cyan-400" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <motion.div
                  key={currentInstruction.instruction}
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-driving-lg font-semibold text-white/90"
                >
                  {currentInstruction.instruction}
                </motion.div>
                <div className="text-driving-sm text-white/30 mt-0.5">{currentInstruction.detail}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <motion.div
                  key={Math.round(distanceToNext / 10)}
                  className="text-3xl font-extralight text-cyan-400 tabular-nums tracking-tight"
                >
                  {formatDistance(distanceToNext)}
                </motion.div>
              </div>
            </div>
            <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-400/50 rounded-full"
                animate={{ width: `${Math.max(2, Math.min(100, (1 - distanceToNext / 2000) * 100))}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {nextUp && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl glass-light"
        >
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
            {(() => {
              const NextIcon = ICON_MAP[nextUp.icon] ?? Navigation;
              return <NextIcon className="w-4 h-4 text-white/35" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-driving-sm text-white/50">{nextUp.instruction}</div>
          </div>
          <span className="text-[11px] text-white/15 tabular-nums flex-shrink-0">{formatDistance(nextUp.distance)}</span>
        </motion.div>
      )}
    </div>
  );
}
