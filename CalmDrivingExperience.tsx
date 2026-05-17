import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Music, VolumeX, Volume2, Wind, Droplets, Sun, Moon } from 'lucide-react';

interface CalmDrivingExperienceProps {
  active: boolean;
  musicGenre: string;
  voiceGuidance: string;
  onToggle: () => void;
  onChangeMusic: (genre: string) => void;
  onChangeVoice: (level: string) => void;
}

const AMBIENT_THEMES = {
  forest: { label: 'Forest', icon: Leaf, color: 'text-emerald-400', bg: 'bg-emerald-400/[0.08]' },
  rain: { label: 'Rain', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-400/[0.08]' },
  ocean: { label: 'Ocean', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-400/[0.08]' },
  sunset: { label: 'Sunset', icon: Sun, color: 'text-amber-400', bg: 'bg-amber-400/[0.08]' },
  night: { label: 'Night', icon: Moon, color: 'text-white/50', bg: 'bg-white/[0.04]' },
};

type AmbientTheme = keyof typeof AMBIENT_THEMES;

const MUSIC_OPTIONS = [
  { key: 'ambient', label: 'Ambient' },
  { key: 'jazz', label: 'Jazz' },
  { key: 'classical', label: 'Classical' },
  { key: 'lofi', label: 'Lo-Fi' },
  { key: 'nature', label: 'Nature' },
  { key: 'none', label: 'Silent' },
];

const VOICE_OPTIONS = [
  { key: 'full', label: 'Full', desc: 'All announcements' },
  { key: 'minimal', label: 'Minimal', desc: 'Turns only' },
  { key: 'alerts_only', label: 'Quiet', desc: 'Alerts only' },
];

export default function CalmDrivingExperience({
  active,
  musicGenre,
  voiceGuidance,
  onToggle,
  onChangeMusic,
  onChangeVoice,
}: CalmDrivingExperienceProps) {
  const [ambientTheme, setAmbientTheme] = useState<AmbientTheme>('forest');
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');

  // Breathing animation cycle
  useEffect(() => {
    if (!breathingActive) return;
    const cycle = () => {
      setBreathPhase('in');
      setTimeout(() => setBreathPhase('hold'), 4000);
      setTimeout(() => setBreathPhase('out'), 7000);
    };
    cycle();
    const interval = setInterval(cycle, 11000);
    return () => clearInterval(interval);
  }, [breathingActive]);

  if (!active) {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onToggle}
        className="touch-target w-full flex items-center gap-3 px-4 py-3 rounded-xl glass-light hover:bg-emerald-400/[0.08] border-emerald-400/15 transition-all duration-300 group"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
          <Leaf className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-emerald-400">Calm Mode</div>
          <div className="text-[10px] text-white/25">Reduce stress, enjoy the drive</div>
        </div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Leaf className="w-4 h-4 text-emerald-400/40" />
        </motion.div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="glass rounded-2xl overflow-hidden border-emerald-400/15"
    >
      <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-400/60 to-transparent" />

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center"
            >
              <Leaf className="w-4 h-4 text-emerald-400" />
            </motion.div>
            <div>
              <div className="text-sm font-medium text-emerald-400">Calm Mode Active</div>
              <div className="text-[10px] text-white/25">Stress-free driving enabled</div>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors px-2 py-1"
          >
            Exit
          </button>
        </div>

        {/* Breathing guide */}
        <div className="flex flex-col items-center py-2">
          <button
            onClick={() => setBreathingActive(!breathingActive)}
            className="relative"
          >
            <motion.div
              animate={{
                scale: breathPhase === 'in' ? 1.3 : breathPhase === 'hold' ? 1.3 : 0.8,
                opacity: breathingActive ? 1 : 0.3,
              }}
              transition={{
                duration: breathPhase === 'in' ? 4 : breathPhase === 'hold' ? 3 : 4,
                ease: 'easeInOut',
              }}
              className="w-16 h-16 rounded-full border-2 border-emerald-400/30 flex items-center justify-center"
            >
              <motion.div
                animate={{
                  scale: breathPhase === 'in' ? 0.8 : breathPhase === 'hold' ? 0.8 : 0.3,
                }}
                transition={{ duration: breathPhase === 'in' ? 4 : breathPhase === 'hold' ? 3 : 4, ease: 'easeInOut' }}
                className="w-8 h-8 rounded-full bg-emerald-400/20"
              />
            </motion.div>
          </button>
          {breathingActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-[10px] text-emerald-400/60 uppercase tracking-widest"
            >
              {breathPhase === 'in' ? 'Breathe in' : breathPhase === 'hold' ? 'Hold' : 'Breathe out'}
            </motion.div>
          )}
          {!breathingActive && (
            <span className="mt-2 text-[9px] text-white/20">Tap to start breathing guide</span>
          )}
        </div>

        {/* Ambient theme */}
        <div className="space-y-2">
          <div className="text-[10px] text-white/25 uppercase tracking-wider">Ambient Theme</div>
          <div className="flex gap-1.5">
            {(Object.entries(AMBIENT_THEMES) as [AmbientTheme, typeof AMBIENT_THEMES.forest][]).map(([key, theme]) => {
              const Icon = theme.icon;
              return (
                <button
                  key={key}
                  onClick={() => setAmbientTheme(key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border transition-all duration-200 ${
                    ambientTheme === key
                      ? `${theme.bg} ${theme.color} border-white/10`
                      : 'bg-white/[0.02] border-white/[0.04] text-white/20 hover:text-white/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[8px] font-medium">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Music selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] text-white/25 uppercase tracking-wider">
            <Music className="w-3 h-3" />
            Sound
          </div>
          <div className="flex gap-1 flex-wrap">
            {MUSIC_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onChangeMusic(key)}
                className={`px-2.5 py-1.5 rounded-md border text-[9px] font-medium transition-all duration-200 ${
                  musicGenre === key
                    ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/25 hover:text-white/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice guidance */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] text-white/25 uppercase tracking-wider">
            {voiceGuidance === 'alerts_only' ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            Guidance
          </div>
          <div className="flex gap-1.5">
            {VOICE_OPTIONS.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => onChangeVoice(key)}
                className={`flex-1 py-2 rounded-lg border text-center transition-all duration-200 ${
                  voiceGuidance === key
                    ? 'bg-emerald-400/10 border-emerald-400/20'
                    : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div className={`text-[10px] font-medium ${voiceGuidance === key ? 'text-emerald-400' : 'text-white/30'}`}>
                  {label}
                </div>
                <div className="text-[8px] text-white/15 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Calm stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Stress Level', value: 'Low', color: 'text-emerald-400' },
            { label: 'Route Calm', value: '92%', color: 'text-emerald-400' },
            { label: 'Noise', value: 'Minimal', color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/[0.02] rounded-lg p-2 text-center border border-white/[0.03]">
              <div className={`text-xs font-medium ${color}`}>{value}</div>
              <div className="text-[8px] text-white/15 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
