import { motion } from 'framer-motion';
import { Car, Zap, Accessibility, ChevronRight } from 'lucide-react';

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

interface ParkingIntelligenceProps {
  facilities: ParkingFacility[];
  onSelect?: (facility: ParkingFacility) => void;
  compact?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  parkhaus: 'Parkhaus',
  parkplatz: 'Parkplatz',
  p_r_metro: 'P+R',
  rest_stop: 'Raststatte',
};

function getAvailabilityColor(available: number, total: number): string {
  const pct = total > 0 ? available / total : 0;
  if (pct > 0.3) return 'text-emerald-400';
  if (pct > 0.1) return 'text-amber-400';
  return 'text-red-400';
}

function getAvailabilityBg(available: number, total: number): string {
  const pct = total > 0 ? available / total : 0;
  if (pct > 0.3) return 'bg-emerald-400/[0.06]';
  if (pct > 0.1) return 'bg-amber-400/[0.06]';
  return 'bg-red-400/[0.06]';
}

export default function ParkingIntelligence({ facilities, onSelect, compact = false }: ParkingIntelligenceProps) {
  if (facilities.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-2">
        {facilities.slice(0, 4).map((facility, i) => {
          return (
            <motion.button
              key={facility.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect?.(facility)}
              className="touch-target w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl glass-light hover:bg-white/[0.06] transition-colors group"
            >
              <div className={`w-10 h-10 rounded-xl ${getAvailabilityBg(facility.available_spaces, facility.total_spaces)} flex items-center justify-center flex-shrink-0`}>
                <Car className="w-4 h-4 text-white/35" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-driving-sm font-medium text-white/70 group-hover:text-white/90 transition-colors truncate">{facility.name}</div>
                <div className="flex items-center gap-2 text-[11px] text-white/20 mt-0.5">
                  <span className={getAvailabilityColor(facility.available_spaces, facility.total_spaces)}>
                    {facility.available_spaces}/{facility.total_spaces}
                  </span>
                  {facility.ev_charging && <Zap className="w-3 h-3 text-cyan-400/60" />}
                  <span>{facility.is_free ? 'Free' : `${facility.price_per_hour_eur.toFixed(2)} EUR`}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/25 transition-colors flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/[0.08] flex items-center justify-center">
            <Car className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-driving-sm font-medium text-white/80">Parking</div>
            <div className="text-[11px] text-white/25">{facilities.length} nearby</div>
          </div>
        </div>

        <div className="space-y-2">
          {facilities.map((facility, i) => {
            const availPct = facility.total_spaces > 0 ? Math.round((facility.available_spaces / facility.total_spaces) * 100) : 0;
            const availColor = getAvailabilityColor(facility.available_spaces, facility.total_spaces);
            return (
              <motion.button
                key={facility.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelect?.(facility)}
                className="touch-target w-full text-left flex items-center gap-3 p-3 rounded-xl glass-light hover:bg-white/[0.06] transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl ${getAvailabilityBg(facility.available_spaces, facility.total_spaces)} flex items-center justify-center flex-shrink-0`}>
                  <Car className="w-5 h-5 text-white/35" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-driving-sm font-medium text-white/75 truncate">{facility.name}</div>
                  <div className="text-[11px] text-white/20 mt-0.5">{TYPE_LABELS[facility.type]} — {facility.city}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${availPct > 30 ? 'bg-emerald-400' : availPct > 10 ? 'bg-amber-400' : 'bg-red-400'}`}
                        initial={{ width: '0%' }}
                        animate={{ width: `${availPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium tabular-nums ${availColor}`}>{facility.available_spaces}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {facility.ev_charging && <div className="w-6 h-6 rounded bg-cyan-400/[0.08] flex items-center justify-center"><Zap className="w-3 h-3 text-cyan-400" /></div>}
                    {facility.has_disabled_access && <div className="w-6 h-6 rounded bg-white/[0.04] flex items-center justify-center"><Accessibility className="w-3 h-3 text-white/25" /></div>}
                  </div>
                  <span className="text-[10px] text-white/15">{facility.is_free ? 'Free' : `${facility.price_per_hour_eur.toFixed(2)} EUR`}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
