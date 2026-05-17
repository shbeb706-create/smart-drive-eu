import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Gauge, X, ChevronDown, ChevronUp } from 'lucide-react';

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

interface BaustelleAlertsProps {
  alerts: Baustelle[];
  onDismiss?: (id: string) => void;
  onAlertClick?: (alert: Baustelle) => void;
  compact?: boolean;
}

const SEVERITY_CONFIG = {
  minor: { color: 'text-amber-400', bg: 'bg-amber-400/[0.06]', border: 'border-amber-400/15', label: 'Gering' },
  moderate: { color: 'text-orange-400', bg: 'bg-orange-400/[0.06]', border: 'border-orange-400/15', label: 'Mittel' },
  major: { color: 'text-red-400', bg: 'bg-red-400/[0.06]', border: 'border-red-400/15', label: 'Schwer' },
};

export default function BaustelleAlerts({ alerts, onDismiss, onAlertClick, compact = false }: BaustelleAlertsProps) {
  const [expanded, setExpanded] = useState(true);
  const activeAlerts = alerts.filter((a) => a.active);

  if (activeAlerts.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-2">
        {activeAlerts.slice(0, 3).map((alert, i) => {
          const sev = SEVERITY_CONFIG[alert.severity];
          return (
            <motion.button
              key={alert.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onAlertClick?.(alert)}
              className={`touch-target w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl ${sev.bg} border ${sev.border} transition-all hover:brightness-110`}
            >
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${sev.color}`} />
              <div className="flex-1 min-w-0">
                <div className="text-driving-sm text-white/70 truncate">{alert.autobahn} — +{alert.delay_minutes} min</div>
              </div>
              <span className="text-[11px] text-white/20 flex-shrink-0 tabular-nums">{alert.speed_limit} km/h</span>
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="touch-target w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/[0.08] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-driving-sm font-medium text-white/80">Baustellen</div>
            <div className="text-[11px] text-white/25">{activeAlerts.length} active</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-driving-sm text-amber-400 font-medium tabular-nums">+{activeAlerts.reduce((sum, a) => sum + a.delay_minutes, 0)} min</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">
              {activeAlerts.map((alert, i) => {
                const sev = SEVERITY_CONFIG[alert.severity];
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => onAlertClick?.(alert)}
                    className={`touch-target group flex items-start gap-3 p-3 rounded-xl ${sev.bg} border ${sev.border} cursor-pointer hover:brightness-110 transition-all`}
                  >
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${sev.color}`} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-driving-sm font-semibold text-white/80">{alert.autobahn}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${sev.bg} ${sev.color} font-medium uppercase tracking-wider`}>{sev.label}</span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-white/25">
                        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{alert.speed_limit} km/h</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />+{alert.delay_minutes} min</span>
                        {alert.lanes_reduced > 0 && <span className="text-amber-400/60">{alert.lanes_reduced} closed</span>}
                      </div>
                    </div>
                    {onDismiss && (
                      <button onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3 text-white/25" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
