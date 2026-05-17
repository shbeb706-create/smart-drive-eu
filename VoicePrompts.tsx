import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Navigation, AlertTriangle, MapPin } from 'lucide-react';

interface VoicePrompt {
  id: string;
  text: string;
  type: 'turn' | 'alert' | 'info' | 'reroute';
  priority: 'high' | 'medium' | 'low';
}

interface VoicePromptsProps {
  prompts: VoicePrompt[];
  voiceLevel: 'full' | 'minimal' | 'alerts_only';
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG = {
  turn: { color: 'text-cyan-400', bg: 'bg-cyan-400/[0.06]', border: 'border-cyan-400/15', icon: Navigation },
  alert: { color: 'text-amber-400', bg: 'bg-amber-400/[0.06]', border: 'border-amber-400/15', icon: AlertTriangle },
  info: { color: 'text-white/50', bg: 'bg-white/[0.04]', border: 'border-white/[0.05]', icon: MapPin },
  reroute: { color: 'text-emerald-400', bg: 'bg-emerald-400/[0.06]', border: 'border-emerald-400/15', icon: Navigation },
};

export default function VoicePrompts({ prompts, voiceLevel, onDismiss }: VoicePromptsProps) {
  const visiblePrompts = prompts.filter((p) => {
    if (voiceLevel === 'alerts_only') return p.type === 'alert' || p.type === 'reroute';
    if (voiceLevel === 'minimal') return p.type !== 'info';
    return true;
  });

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none" style={{ maxWidth: '320px' }}>
      <AnimatePresence>
        {visiblePrompts.map((prompt) => {
          const config = TYPE_CONFIG[prompt.type];
          const Icon = config.icon;
          return (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="pointer-events-auto"
            >
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl glass-heavy ${config.border} shadow-2xl shadow-black/30`}>
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${config.color}`}>{prompt.text}</div>
                </div>
                <button
                  onClick={() => onDismiss(prompt.id)}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <VolumeX className="w-3 h-3 text-white/20" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.04] text-[9px] text-white/20 uppercase tracking-wider">
        {voiceLevel === 'alerts_only' ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
        {voiceLevel === 'full' ? 'All prompts' : voiceLevel === 'minimal' ? 'Turns only' : 'Alerts only'}
      </div>
    </div>
  );
}
