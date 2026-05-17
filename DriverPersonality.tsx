import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Zap, Compass, Gauge, Check, ChevronRight, Volume2, VolumeX } from 'lucide-react';

export type PersonalityType = 'calm' | 'efficient' | 'explorer' | 'sporty';
export type SpeedPreference = 'relaxed' | 'moderate' | 'fast';
export type MusicGenre = 'ambient' | 'jazz' | 'classical' | 'lofi' | 'nature' | 'none';
export type VoiceGuidance = 'full' | 'minimal' | 'alerts_only';

export interface DriverProfile {
  id: string;
  name: string;
  personality_type: PersonalityType;
  preferred_speed: SpeedPreference;
  avoid_highways: boolean;
  avoid_tolls: boolean;
  eco_priority: boolean;
  calm_mode: boolean;
  music_genre: MusicGenre;
  voice_guidance: VoiceGuidance;
}

interface DriverPersonalityProps {
  profiles: DriverProfile[];
  activeProfile: DriverProfile | null;
  onSelectProfile: (profile: DriverProfile) => void;
  onUpdateProfile: (profile: DriverProfile) => void;
  compact?: boolean;
}

const PERSONALITY_CONFIG: Record<PersonalityType, {
  label: string;
  germanLabel: string;
  icon: typeof Leaf;
  color: string;
  bg: string;
  border: string;
  description: string;
}> = {
  calm: { label: 'Calm', germanLabel: 'Ruhefahrer', icon: Leaf, color: 'text-emerald-400', bg: 'bg-emerald-400/[0.08]', border: 'border-emerald-400/25', description: 'Peaceful routes, scenic roads' },
  efficient: { label: 'Efficient', germanLabel: 'Effizienter', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-400/[0.08]', border: 'border-cyan-400/25', description: 'Fastest routes, optimized' },
  explorer: { label: 'Explorer', germanLabel: 'Entdecker', icon: Compass, color: 'text-amber-400', bg: 'bg-amber-400/[0.08]', border: 'border-amber-400/25', description: 'Scenic detours, hidden gems' },
  sporty: { label: 'Sporty', germanLabel: 'Sportfahrer', icon: Gauge, color: 'text-red-400', bg: 'bg-red-400/[0.08]', border: 'border-red-400/25', description: 'Autobahn, dynamic driving' },
};

const MUSIC_LABELS: Record<MusicGenre, string> = {
  ambient: 'Ambient', jazz: 'Jazz', classical: 'Classical', lofi: 'Lo-Fi', nature: 'Nature', none: 'Silent',
};

export { PERSONALITY_CONFIG };

export default function DriverPersonality({
  profiles,
  activeProfile,
  onSelectProfile,
  onUpdateProfile,
  compact = false,
}: DriverPersonalityProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (compact && activeProfile) {
    const config = PERSONALITY_CONFIG[activeProfile.personality_type];
    const Icon = config.icon;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl overflow-hidden">
        <div className={`h-px bg-gradient-to-r ${activeProfile.personality_type === 'calm' ? 'from-emerald-400/40 via-emerald-400/20' : activeProfile.personality_type === 'efficient' ? 'from-cyan-400/40 via-cyan-400/20' : activeProfile.personality_type === 'explorer' ? 'from-amber-400/40 via-amber-400/20' : 'from-red-400/40 via-red-400/20'} to-transparent`} />
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-driving font-semibold text-white/90">{config.germanLabel}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${config.bg} ${config.color} font-medium uppercase tracking-wider`}>{config.label}</span>
              </div>
              <div className="text-[11px] text-white/25 mt-0.5">{config.description}</div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            {[
              { key: 'calm_mode' as const, label: 'Calm', icon: Leaf, activeColor: 'emerald' },
              { key: 'eco_priority' as const, label: 'Eco', icon: Zap, activeColor: 'cyan' },
              { key: 'voice_guidance' as const, label: activeProfile.voice_guidance === 'alerts_only' ? 'Quiet' : 'Voice', icon: activeProfile.voice_guidance === 'alerts_only' ? VolumeX : Volume2, activeColor: 'amber' },
            ].map(({ key, label, icon: ToggleIcon, activeColor }) => {
              const isActive = key === 'voice_guidance' ? activeProfile.voice_guidance === 'alerts_only' : activeProfile[key];
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'voice_guidance') {
                      onUpdateProfile({ ...activeProfile, voice_guidance: activeProfile.voice_guidance === 'minimal' ? 'alerts_only' : 'minimal' });
                    } else {
                      onUpdateProfile({ ...activeProfile, [key]: !activeProfile[key] });
                    }
                  }}
                  className={`touch-target flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    isActive
                      ? activeColor === 'emerald' ? 'bg-emerald-400/[0.08] text-emerald-400 border border-emerald-400/15'
                        : activeColor === 'cyan' ? 'bg-cyan-400/[0.08] text-cyan-400 border border-cyan-400/15'
                        : 'bg-amber-400/[0.08] text-amber-400 border border-amber-400/15'
                      : 'bg-white/[0.02] text-white/20 border border-white/[0.04]'
                  }`}
                >
                  <ToggleIcon className="w-3 h-3" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="text-[11px] text-white/25 uppercase tracking-wider font-medium">Driver Personality</div>

        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(PERSONALITY_CONFIG) as [PersonalityType, typeof PERSONALITY_CONFIG.calm][]).map(([key, config]) => {
            const Icon = config.icon;
            const isActive = activeProfile?.personality_type === key;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.97 }}
                onClick={() => { const profile = profiles.find((p) => p.personality_type === key); if (profile) onSelectProfile(profile); }}
                className={`touch-target relative flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all duration-300 ${isActive ? `${config.bg} ${config.border}` : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'}`}
              >
                {isActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center"><Check className={`w-2.5 h-2.5 ${config.color}`} /></motion.div>}
                <Icon className={`w-5 h-5 ${isActive ? config.color : 'text-white/25'}`} />
                <div className="text-center">
                  <div className={`text-[11px] font-semibold ${isActive ? config.color : 'text-white/40'}`}>{config.germanLabel}</div>
                  <div className="text-[9px] text-white/15 mt-0.5">{config.label}</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {activeProfile && showDetails && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-3 pt-3 border-t border-white/[0.04]">
                <div className="flex gap-1.5">
                  {(['relaxed', 'moderate', 'fast'] as SpeedPreference[]).map((speed) => (
                    <button key={speed} onClick={() => onUpdateProfile({ ...activeProfile, preferred_speed: speed })}
                      className={`touch-target flex-1 py-2 rounded-lg border text-[11px] font-medium transition-all duration-200 capitalize ${activeProfile.preferred_speed === speed ? 'bg-cyan-400/[0.08] border-cyan-400/25 text-cyan-400' : 'bg-white/[0.02] border-white/[0.04] text-white/25'}`}>
                      {speed}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.entries(MUSIC_LABELS) as [MusicGenre, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => onUpdateProfile({ ...activeProfile, music_genre: key })}
                      className={`touch-target px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all duration-200 ${activeProfile.music_genre === key ? 'bg-cyan-400/[0.08] border-cyan-400/25 text-cyan-400' : 'bg-white/[0.02] border-white/[0.04] text-white/20'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  {[
                    { key: 'avoid_highways' as const, label: 'Avoid Highways' },
                    { key: 'avoid_tolls' as const, label: 'Avoid Tolls' },
                    { key: 'eco_priority' as const, label: 'Eco Priority' },
                    { key: 'calm_mode' as const, label: 'Calm Mode' },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => onUpdateProfile({ ...activeProfile, [key]: !activeProfile[key] })} className="touch-target w-full flex items-center justify-between py-2">
                      <span className="text-[11px] text-white/35">{label}</span>
                      <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${activeProfile[key] ? 'bg-cyan-400/25' : 'bg-white/[0.04]'}`}>
                        <motion.div className="w-4 h-4 rounded-full bg-white/50 mt-0.5" animate={{ x: activeProfile[key] ? 16 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => setShowDetails(!showDetails)} className="touch-target w-full flex items-center justify-center gap-1 text-[10px] text-white/20 hover:text-white/35 transition-colors py-1">
          <span>{showDetails ? 'Less' : 'Customize'}</span>
          <ChevronRight className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </button>
      </div>
    </div>
  );
}
