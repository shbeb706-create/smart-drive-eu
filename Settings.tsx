import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../hooks/useSettings';
import {
  Palette,
  Volume2,
  Gauge,
  Leaf,
  Shield,
  MapPin,
  Route,
  Car,
  ChevronRight,
  RotateCw,
  Check,
} from 'lucide-react';

type Section = 'appearance' | 'voice' | 'navigation' | 'units' | 'calm' | 'privacy' | 'route' | 'vehicle';

interface SettingsPageProps {
  onBack: () => void;
}

const SECTIONS: { key: Section; label: string; icon: typeof Palette }[] = [
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'voice', label: 'Voice & Sound', icon: Volume2 },
  { key: 'navigation', label: 'Navigation', icon: Route },
  { key: 'units', label: 'Units & Speed', icon: Gauge },
  { key: 'calm', label: 'Calm Mode', icon: Leaf },
  { key: 'privacy', label: 'Privacy', icon: Shield },
  { key: 'route', label: 'Route Prefs', icon: MapPin },
  { key: 'vehicle', label: 'Vehicle', icon: Car },
];

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${value ? 'bg-cyan-400/30' : 'bg-white/[0.06]'}`}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white/70"
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function SegmentedControl<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl">
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`touch-target flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
            value === key ? 'bg-cyan-400/[0.08] text-cyan-400 border border-cyan-400/15' : 'text-white/25 hover:text-white/40'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Slider({ value, onChange, min, max, step, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative h-6 flex items-center">
        <div className="w-full h-1 bg-white/[0.06] rounded-full">
          <motion.div className="h-full bg-cyan-400/60 rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.15 }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <motion.div
          className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white/80 shadow-lg shadow-cyan-400/20 pointer-events-none"
          animate={{ left: `calc(${pct}% - 8px)` }}
          transition={{ duration: 0.15 }}
          style={{ position: 'absolute' }}
        />
      </div>
      <span className="text-xs text-white/40 tabular-nums w-12 text-right">{value}{unit ?? ''}</span>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-driving-sm text-white/70">{label}</div>
        {description && <div className="text-[11px] text-white/25 mt-0.5">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Palette; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-cyan-400/[0.08] flex items-center justify-center">
        <Icon className="w-5 h-5 text-cyan-400" />
      </div>
      <div>
        <div className="text-driving font-semibold text-white/90">{title}</div>
        <div className="text-[11px] text-white/25">{subtitle}</div>
      </div>
    </div>
  );
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [activeSection, setActiveSection] = useState<Section>('appearance');

  return (
    <div className="h-full flex flex-col bg-[#08080c]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
        <button onClick={onBack} className="touch-target w-10 h-10 flex items-center justify-center rounded-xl glass hover:bg-white/[0.06] transition-colors">
          <ChevronRight className="w-5 h-5 text-white/50 rotate-180" />
        </button>
        <div className="flex-1">
          <div className="text-driving-lg font-semibold text-white/90">Settings</div>
          <div className="text-[11px] text-white/25">Personalize your driving experience</div>
        </div>
        <button onClick={resetSettings} className="touch-target flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-white/25 hover:text-white/40 hover:bg-white/[0.04] transition-all">
          <RotateCw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-white/[0.04] overflow-y-auto scrollbar-hide py-2 px-2">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`touch-target w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 mb-0.5 ${
                activeSection === key ? 'bg-cyan-400/[0.06] text-cyan-400' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeSection === 'appearance' && (
                <div className="space-y-5">
                  <SectionHeader icon={Palette} title="Appearance" subtitle="Theme, colors, and map style" />

                  <div className="glass rounded-2xl p-4 space-y-1">
                    <SettingRow label="Theme" description="Interface color scheme">
                      <SegmentedControl
                        options={[
                          { key: 'dark' as const, label: 'Dark' },
                          { key: 'light' as const, label: 'Light' },
                          { key: 'auto' as const, label: 'Auto' },
                        ]}
                        value={settings.theme}
                        onChange={(v) => updateSetting('theme', v)}
                      />
                    </SettingRow>

                    <SettingRow label="Accent Color" description="Primary highlight color">
                      <div className="flex gap-2">
                        {(['cyan', 'emerald', 'amber', 'rose'] as const).map((color) => {
                          const colorMap = { cyan: '#00e5ff', emerald: '#00e676', amber: '#ffc107', rose: '#ff5252' };
                          return (
                            <button
                              key={color}
                              onClick={() => updateSetting('accentColor', color)}
                              className={`touch-target w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${settings.accentColor === color ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-[#08080c] scale-110' : 'hover:scale-105'}`}
                              style={{ background: colorMap[color] }}
                            >
                              {settings.accentColor === color && <Check className="w-3.5 h-3.5 text-black" />}
                            </button>
                          );
                        })}
                      </div>
                    </SettingRow>

                    <SettingRow label="Map Style" description="Base map appearance">
                      <SegmentedControl
                        options={[
                          { key: 'dark' as const, label: 'Dark' },
                          { key: 'satellite' as const, label: 'Satellite' },
                          { key: 'terrain' as const, label: 'Terrain' },
                        ]}
                        value={settings.mapStyle}
                        onChange={(v) => updateSetting('mapStyle', v)}
                      />
                    </SettingRow>
                  </div>
                </div>
              )}

              {activeSection === 'voice' && (
                <div className="space-y-5">
                  <SectionHeader icon={Volume2} title="Voice & Sound" subtitle="Navigation prompts and audio" />

                  <div className="glass rounded-2xl p-4 space-y-1">
                    <SettingRow label="Voice Guidance" description="How often to announce directions">
                      <SegmentedControl
                        options={[
                          { key: 'full' as const, label: 'Full' },
                          { key: 'minimal' as const, label: 'Minimal' },
                          { key: 'alerts_only' as const, label: 'Alerts' },
                        ]}
                        value={settings.voiceGuidance}
                        onChange={(v) => updateSetting('voiceGuidance', v)}
                      />
                    </SettingRow>

                    <SettingRow label="Volume" description="Voice prompt volume">
                      <div className="w-40">
                        <Slider value={settings.voiceVolume} onChange={(v) => updateSetting('voiceVolume', v)} min={0} max={100} step={5} unit="%" />
                      </div>
                    </SettingRow>

                    <SettingRow label="Speed Warnings" description="Alert when exceeding speed limit">
                      <Toggle value={settings.speedWarnings} onChange={(v) => updateSetting('speedWarnings', v)} />
                    </SettingRow>

                    {settings.speedWarnings && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <SettingRow label="Warning Offset" description="How far over the limit before alerting">
                          <div className="w-40">
                            <Slider value={settings.speedWarningOffset} onChange={(v) => updateSetting('speedWarningOffset', v)} min={0} max={20} step={1} unit=" km/h" />
                          </div>
                        </SettingRow>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'navigation' && (
                <div className="space-y-5">
                  <SectionHeader icon={Route} title="Navigation" subtitle="How routes are calculated and displayed" />

                  <div className="glass rounded-2xl p-4 space-y-1">
                    <SettingRow label="Default Zoom" description="Map zoom level during navigation">
                      <SegmentedControl
                        options={[
                          { key: 'follow' as const, label: 'Follow' },
                          { key: 'heading' as const, label: '3D' },
                        ]}
                        value={'heading'}
                        onChange={() => {}}
                      />
                    </SettingRow>

                    <SettingRow label="Show Traffic Overlay" description="Display real-time traffic conditions">
                      <Toggle value={true} onChange={() => {}} />
                    </SettingRow>

                    <SettingRow label="Show Speed Limits" description="Display current speed limit">
                      <Toggle value={true} onChange={() => {}} />
                    </SettingRow>

                    <SettingRow label="Auto-Zoom on Turns" description="Zoom in when approaching turns">
                      <Toggle value={true} onChange={() => {}} />
                    </SettingRow>
                  </div>
                </div>
              )}

              {activeSection === 'units' && (
                <div className="space-y-5">
                  <SectionHeader icon={Gauge} title="Units & Speed" subtitle="Measurement system preferences" />

                  <div className="glass rounded-2xl p-4 space-y-1">
                    <SettingRow label="Distance Units" description="Kilometers or miles">
                      <SegmentedControl
                        options={[
                          { key: 'metric' as const, label: 'Metric' },
                          { key: 'imperial' as const, label: 'Imperial' },
                        ]}
                        value={settings.units}
                        onChange={(v) => updateSetting('units', v)}
                      />
                    </SettingRow>

                    <div className="py-3">
                      <div className="text-[11px] text-white/15 uppercase tracking-wider mb-2">Preview</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Distance', metric: '142 km', imperial: '88 mi' },
                          { label: 'Speed', metric: '130 km/h', imperial: '81 mph' },
                          { label: 'Temp', metric: '18°C', imperial: '64°F' },
                        ].map(({ label, metric, imperial }) => (
                          <div key={label} className="bg-white/[0.02] rounded-xl p-3 text-center">
                            <div className="text-[10px] text-white/20 mb-1">{label}</div>
                            <div className="text-driving-sm font-medium text-white/60 tabular-nums">
                              {settings.units === 'metric' ? metric : imperial}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'calm' && (
                <div className="space-y-5">
                  <SectionHeader icon={Leaf} title="Calm Mode" subtitle="Relaxed driving experience" />

                  <div className="glass rounded-2xl p-4 space-y-1">
                    <SettingRow label="Default Calm Mode" description="Start navigation in calm mode">
                      <Toggle value={settings.calmModeDefault} onChange={(v) => updateSetting('calmModeDefault', v)} />
                    </SettingRow>

                    <SettingRow label="Auto-Enable at Night" description="Automatically activate calm mode after sunset">
                      <Toggle value={settings.calmAutoEnable} onChange={(v) => updateSetting('calmAutoEnable', v)} />
                    </SettingRow>

                    <SettingRow label="Max Speed in Calm" description="Speed cap when calm mode is active">
                      <div className="w-40">
                        <Slider value={settings.calmMaxSpeed} onChange={(v) => updateSetting('calmMaxSpeed', v)} min={60} max={160} step={10} unit=" km/h" />
                      </div>
                    </SettingRow>

                    <SettingRow label="Music Genre" description="Ambient sounds during calm driving">
                      <div className="flex gap-1 flex-wrap justify-end max-w-[200px]">
                        {['ambient', 'jazz', 'classical', 'lofi', 'nature', 'none'].map((genre) => (
                          <button
                            key={genre}
                            onClick={() => updateSetting('calmMusicGenre', genre)}
                            className={`touch-target px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 capitalize ${
                              settings.calmMusicGenre === genre ? 'bg-cyan-400/[0.08] text-cyan-400 border border-cyan-400/15' : 'bg-white/[0.02] text-white/20 border border-white/[0.04]'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </SettingRow>
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-5">
                  <SectionHeader icon={Shield} title="Privacy" subtitle="Control what data is shared" />

                  <div className="glass rounded-2xl p-4 space-y-1">
                    <SettingRow label="Share Location" description="Allow location data for routing and traffic">
                      <Toggle value={settings.privacyShareLocation} onChange={(v) => updateSetting('privacyShareLocation', v)} />
                    </SettingRow>

                    <SettingRow label="Share Speed Data" description="Contribute anonymous speed data for traffic">
                      <Toggle value={settings.privacyShareSpeed} onChange={(v) => updateSetting('privacyShareSpeed', v)} />
                    </SettingRow>

                    <SettingRow label="Usage Analytics" description="Help improve the app with anonymous analytics">
                      <Toggle value={settings.privacyAnalytics} onChange={(v) => updateSetting('privacyAnalytics', v)} />
                    </SettingRow>

                    <SettingRow label="Crash Reports" description="Automatically send crash reports">
                      <Toggle value={settings.privacyCrashReports} onChange={(v) => updateSetting('privacyCrashReports', v)} />
                    </SettingRow>
                  </div>

                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <div className="flex-1">
                        <div className="text-driving-sm text-white/60">Privacy Score</div>
                        <div className="text-[11px] text-white/25 mt-0.5">Based on your current settings</div>
                      </div>
                      <div className="text-driving-lg font-light text-emerald-400 tabular-nums">
                        {[
                          settings.privacyShareLocation,
                          settings.privacyShareSpeed,
                          settings.privacyAnalytics,
                          settings.privacyCrashReports,
                        ].filter(Boolean).length === 0 ? 'Max' : [
                          settings.privacyShareLocation,
                          settings.privacyShareSpeed,
                          settings.privacyAnalytics,
                          settings.privacyCrashReports,
                        ].filter(Boolean).length <= 1 ? 'High' : 'Medium'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'route' && (
                <div className="space-y-5">
                  <SectionHeader icon={MapPin} title="Route Preferences" subtitle="How routes are calculated" />

                  <div className="glass rounded-2xl p-4 space-y-1">
                    <SettingRow label="Avoid Highways" description="Prefer local roads over Autobahn">
                      <Toggle value={settings.routeAvoidHighways} onChange={(v) => updateSetting('routeAvoidHighways', v)} />
                    </SettingRow>

                    <SettingRow label="Avoid Tolls" description="Skip toll roads and Vignette sections">
                      <Toggle value={settings.routeAvoidTolls} onChange={(v) => updateSetting('routeAvoidTolls', v)} />
                    </SettingRow>

                    <SettingRow label="Avoid Ferries" description="Skip ferry crossings">
                      <Toggle value={settings.routeAvoidFerries} onChange={(v) => updateSetting('routeAvoidFerries', v)} />
                    </SettingRow>

                    <SettingRow label="Avoid Unpaved Roads" description="Skip gravel and dirt roads">
                      <Toggle value={settings.routeAvoidUnpaved} onChange={(v) => updateSetting('routeAvoidUnpaved', v)} />
                    </SettingRow>

                    <SettingRow label="Prefer Scenic Routes" description="Choose beautiful roads when possible">
                      <Toggle value={settings.routePreferScenic} onChange={(v) => updateSetting('routePreferScenic', v)} />
                    </SettingRow>

                    <SettingRow label="Fuel Efficiency" description="Optimize routes for lower fuel consumption">
                      <Toggle value={settings.routeFuelEfficiency} onChange={(v) => updateSetting('routeFuelEfficiency', v)} />
                    </SettingRow>
                  </div>
                </div>
              )}

              {activeSection === 'vehicle' && (
                <div className="space-y-5">
                  <SectionHeader icon={Car} title="Vehicle" subtitle="Your vehicle profile" />

                  <div className="glass rounded-2xl p-4 space-y-1">
                    <SettingRow label="Vehicle Type" description="Affects route calculations and speed limits">
                      <SegmentedControl
                        options={[
                          { key: 'car' as const, label: 'Car' },
                          { key: 'ev' as const, label: 'EV' },
                          { key: 'motorcycle' as const, label: 'Moto' },
                          { key: 'truck' as const, label: 'Truck' },
                        ]}
                        value={settings.vehicleType === 'rv' ? 'car' : settings.vehicleType}
                        onChange={(v) => updateSetting('vehicleType', v)}
                      />
                    </SettingRow>

                    <SettingRow label="Fuel Type" description="Affects fuel stops and efficiency calculations">
                      <SegmentedControl
                        options={[
                          { key: 'gasoline' as const, label: 'Gas' },
                          { key: 'diesel' as const, label: 'Diesel' },
                          { key: 'electric' as const, label: 'Electric' },
                          { key: 'hybrid' as const, label: 'Hybrid' },
                        ]}
                        value={settings.vehicleFuelType}
                        onChange={(v) => updateSetting('vehicleFuelType', v)}
                      />
                    </SettingRow>

                    <SettingRow
                      label="Consumption"
                      description={settings.vehicleFuelType === 'electric' ? 'kWh per 100 km' : 'Liters per 100 km'}
                    >
                      <div className="w-40">
                        <Slider
                          value={settings.vehicleConsumption}
                          onChange={(v) => updateSetting('vehicleConsumption', v)}
                          min={settings.vehicleFuelType === 'electric' ? 10 : 3}
                          max={settings.vehicleFuelType === 'electric' ? 40 : 25}
                          step={0.5}
                          unit={settings.vehicleFuelType === 'electric' ? ' kWh' : ' L'}
                        />
                      </div>
                    </SettingRow>

                    <SettingRow label="Max Speed" description="Vehicle top speed for route planning">
                      <div className="w-40">
                        <Slider value={settings.vehicleMaxSpeed} onChange={(v) => updateSetting('vehicleMaxSpeed', v)} min={80} max={350} step={10} unit=" km/h" />
                      </div>
                    </SettingRow>
                  </div>

                  {/* Vehicle summary card */}
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Car className="w-5 h-5 text-cyan-400" />
                      <div className="text-driving-sm font-medium text-white/70">Vehicle Summary</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Type', value: settings.vehicleType.toUpperCase() },
                        { label: 'Fuel', value: settings.vehicleFuelType },
                        { label: 'Consumption', value: `${settings.vehicleConsumption} ${settings.vehicleFuelType === 'electric' ? 'kWh' : 'L'}/100km` },
                        { label: 'Top Speed', value: `${settings.vehicleMaxSpeed} km/h` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white/[0.02] rounded-xl p-3">
                          <div className="text-[10px] text-white/20 uppercase tracking-wider">{label}</div>
                          <div className="text-driving-sm font-medium text-white/60 mt-0.5 tabular-nums">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
