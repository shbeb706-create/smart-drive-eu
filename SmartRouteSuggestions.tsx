import { motion } from 'framer-motion';
import { Zap, Compass, MapPin, Clock, Star, ChevronRight, AlertTriangle } from 'lucide-react';
import type { PersonalityType } from './DriverPersonality';

interface RouteSuggestion {
  id: string;
  personality_type: PersonalityType;
  label: string;
  description: string;
  from_lat: number;
  from_lng: number;
  to_lat: number;
  to_lng: number;
  distance_km: number;
  duration_minutes: number;
  scenic_score: number;
  calm_score: number;
  efficiency_score: number;
  fun_score: number;
  avoid_baustellen: boolean;
  has_rest_stops: boolean;
  ev_friendly: boolean;
}

interface SmartRouteSuggestionsProps {
  suggestions: RouteSuggestion[];
  personalityType: PersonalityType;
  onSelect?: (suggestion: RouteSuggestion) => void;
  compact?: boolean;
}

const SCORE_COLORS: Record<string, string> = {
  scenic: 'text-emerald-400',
  calm: 'text-emerald-400',
  efficiency: 'text-cyan-400',
  fun: 'text-red-400',
};

function scoreBar(label: string, score: number, color: string) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-white/20 w-10 capitalize">{label}</span>
      <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color === 'text-emerald-400' ? 'bg-emerald-400' : color === 'text-cyan-400' ? 'bg-cyan-400' : 'bg-red-400'}`}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[9px] text-white/15 tabular-nums w-5 text-right">{pct}%</span>
    </div>
  );
}

export default function SmartRouteSuggestions({
  suggestions,
  personalityType,
  onSelect,
  compact = false,
}: SmartRouteSuggestionsProps) {
  const filtered = suggestions.filter((s) => s.personality_type === personalityType);
  if (filtered.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-2">
        {filtered.map((suggestion, i) => (
          <motion.button
            key={suggestion.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onSelect?.(suggestion)}
            className="touch-target w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl glass-light hover:bg-white/[0.06] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-400/[0.08] flex items-center justify-center flex-shrink-0">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-driving-sm font-medium text-white/70 group-hover:text-white/90 transition-colors truncate">{suggestion.label}</div>
              <div className="flex items-center gap-2 text-[11px] text-white/20 mt-0.5">
                <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{Math.round(suggestion.distance_km)} km</span>
                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{Math.floor(suggestion.duration_minutes / 60)}h {suggestion.duration_minutes % 60}m</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {suggestion.avoid_baustellen && <div className="w-6 h-6 rounded bg-emerald-400/[0.08] flex items-center justify-center"><AlertTriangle className="w-3 h-3 text-emerald-400" /></div>}
              {suggestion.ev_friendly && <div className="w-6 h-6 rounded bg-cyan-400/[0.08] flex items-center justify-center"><Zap className="w-3 h-3 text-cyan-400" /></div>}
              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/25 transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="h-px bg-gradient-to-r from-amber-400/40 via-amber-400/20 to-transparent" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/[0.08] flex items-center justify-center">
            <Compass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-driving-sm font-medium text-white/80">Smart Routes</div>
            <div className="text-[11px] text-white/25">Personalized for you</div>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((suggestion, i) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelect?.(suggestion)}
              className="touch-target group p-4 rounded-xl glass-light hover:bg-white/[0.06] cursor-pointer transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-400/[0.08] flex items-center justify-center flex-shrink-0">
                  <Compass className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-driving-sm font-semibold text-white/80">{suggestion.label}</span>
                      {suggestion.avoid_baustellen && <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-400/[0.08] text-emerald-400 font-medium">No Baustellen</span>}
                    </div>
                    <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">{suggestion.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/25">
                    <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{Math.round(suggestion.distance_km)} km</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{Math.floor(suggestion.duration_minutes / 60)}h {suggestion.duration_minutes % 60}m</span>
                    {suggestion.ev_friendly && <span className="flex items-center gap-0.5 text-cyan-400/60"><Zap className="w-3 h-3" />EV</span>}
                    {suggestion.has_rest_stops && <span className="flex items-center gap-0.5 text-emerald-400/60"><Star className="w-3 h-3" />Rest</span>}
                  </div>
                  <div className="space-y-1">
                    {scoreBar('scenic', suggestion.scenic_score, SCORE_COLORS.scenic)}
                    {scoreBar('calm', suggestion.calm_score, SCORE_COLORS.calm)}
                    {scoreBar('speed', suggestion.efficiency_score, SCORE_COLORS.efficiency)}
                    {scoreBar('fun', suggestion.fun_score, SCORE_COLORS.fun)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
