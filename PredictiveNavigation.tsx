import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CloudRain,
  Coffee,
  Fuel,
  Camera,
  Gauge,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface PredictiveEvent {
  id: string;
  event_type: 'traffic_surge' | 'weather_change' | 'rest_stop' | 'fuel_stop' | 'scenic_point' | 'speed_trap';
  road_name: string;
  lat: number;
  lng: number;
  probability: number;
  impact_minutes: number;
  description: string;
  time_horizon: string;
  severity: 'info' | 'warning' | 'critical';
}

interface PredictiveNavigationProps {
  events: PredictiveEvent[];
  onEventClick?: (event: PredictiveEvent) => void;
  compact?: boolean;
}

const EVENT_CONFIG: Record<string, {
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  label: string;
}> = {
  traffic_surge: { icon: TrendingUp, color: 'text-red-400', bg: 'bg-red-400/[0.06]', label: 'Traffic' },
  weather_change: { icon: CloudRain, color: 'text-blue-400', bg: 'bg-blue-400/[0.06]', label: 'Weather' },
  rest_stop: { icon: Coffee, color: 'text-emerald-400', bg: 'bg-emerald-400/[0.06]', label: 'Rest' },
  fuel_stop: { icon: Fuel, color: 'text-cyan-400', bg: 'bg-cyan-400/[0.06]', label: 'Fuel' },
  scenic_point: { icon: Camera, color: 'text-amber-400', bg: 'bg-amber-400/[0.06]', label: 'Scenic' },
  speed_trap: { icon: Gauge, color: 'text-orange-400', bg: 'bg-orange-400/[0.06]', label: 'Blitzer' },
};

const SEVERITY_BORDER: Record<string, string> = {
  info: 'border-white/[0.04]',
  warning: 'border-amber-400/15',
  critical: 'border-red-400/20',
};

function probabilityBar(prob: number) {
  const pct = Math.round(prob * 100);
  const color = pct > 70 ? 'bg-red-400' : pct > 40 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full ${color}`} initial={{ width: '0%' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
      </div>
      <span className="text-[9px] text-white/15 tabular-nums">{pct}%</span>
    </div>
  );
}

export default function PredictiveNavigation({
  events,
  onEventClick,
  compact = false,
}: PredictiveNavigationProps) {
  if (events.length === 0) return null;

  const sortedEvents = [...events].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  if (compact) {
    return (
      <div className="space-y-2">
        {sortedEvents.slice(0, 4).map((event, i) => {
          const config = EVENT_CONFIG[event.event_type];
          const Icon = config.icon;
          return (
            <motion.button
              key={event.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onEventClick?.(event)}
              className={`touch-target w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl ${config.bg} border ${SEVERITY_BORDER[event.severity]} hover:brightness-110 transition-all`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <div className="text-driving-sm text-white/60 truncate">{event.description}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3 text-white/15" />
                <span className="text-[10px] text-white/20">{event.time_horizon}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="h-px bg-gradient-to-r from-cyan-400/40 via-cyan-400/20 to-transparent" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/[0.08] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-driving-sm font-medium text-white/80">Predictive AI</div>
            <div className="text-[11px] text-white/25">{events.length} upcoming</div>
          </div>
        </div>

        <div className="space-y-2">
          {sortedEvents.map((event, i) => {
            const config = EVENT_CONFIG[event.event_type];
            const Icon = config.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onEventClick?.(event)}
                className={`touch-target group flex items-start gap-3 p-3 rounded-xl ${config.bg} border ${SEVERITY_BORDER[event.severity]} cursor-pointer hover:brightness-110 transition-all`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.color}`} />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-white/65">{config.label}</span>
                    <span className="text-[10px] text-white/20">{event.road_name}</span>
                    <span className="text-[10px] text-white/15">{event.time_horizon}</span>
                  </div>
                  <p className="text-[11px] text-white/35 leading-relaxed">{event.description}</p>
                  <div className="flex items-center gap-3">
                    {probabilityBar(event.probability)}
                    {event.impact_minutes > 0 && <span className="text-[10px] text-amber-400/60">+{event.impact_minutes} min</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
