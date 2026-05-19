import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Clock, Star, X, Loader2 } from 'lucide-react';

interface Destination {
  id: string;
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
  eta?: string;
  starred?: boolean;
}

interface SearchDestinationProps {
  onSelect: (dest: Destination) => void;
  onClear?: () => void;
  placeholder?: string;
  recentDestinations?: Destination[];
}

const POPULAR_DESTINATIONS: Destination[] = [
  { id: '1', label: 'Berlin', sublabel: 'Brandenburg Gate, Germany', lat: 52.516, lng: 13.377, eta: '1h 45m' },
  { id: '2', label: 'Paris', sublabel: 'Eiffel Tower, France', lat: 48.858, lng: 2.294, eta: '4h 20m' },
  { id: '3', label: 'Vienna', sublabel: 'Stephansplatz, Austria', lat: 48.208, lng: 16.373, eta: '3h 10m' },
  { id: '4', label: 'Amsterdam', sublabel: 'Central Station, Netherlands', lat: 52.367, lng: 4.904, eta: '2h 55m' },
  { id: '5', label: 'Zurich', sublabel: 'Bahnhofstrasse, Switzerland', lat: 47.376, lng: 8.541, eta: '2h 15m' },
  { id: '6', label: 'Prague', sublabel: 'Old Town Square, Czech Republic', lat: 50.075, lng: 14.437, eta: '2h 40m' },
  { id: '7', label: 'Rome', sublabel: 'Colosseum, Italy', lat: 41.89, lng: 12.492, eta: '6h 30m' },
  { id: '8', label: 'Barcelona', sublabel: 'Sagrada Familia, Spain', lat: 41.403, lng: 2.174, eta: '7h 10m' },
];

const RECENT: Destination[] = [
  { id: 'r1', label: 'Munich Airport', sublabel: 'Terminal 2, Germany', lat: 48.353, lng: 11.786, eta: '35m', starred: true },
  { id: 'r2', label: 'Ingolstadt', sublabel: 'Audi Forum, Germany', lat: 48.763, lng: 11.425, eta: '50m' },
  { id: 'r3', label: 'Garmisch-Partenkirchen', sublabel: 'Bavaria, Germany', lat: 47.492, lng: 11.095, eta: '1h 10m', starred: true },
];

export default function SearchDestination({
  onSelect,
  onClear,
  placeholder = 'Search destination...',
  recentDestinations = RECENT,
}: SearchDestinationProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Destination[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      const filtered = POPULAR_DESTINATIONS.filter(
        (d) =>
          d.label.toLowerCase().includes(q) ||
          d.sublabel.toLowerCase().includes(q)
      );
      setResults(filtered);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const showResults = focused && (query.length > 0 || recentDestinations.length > 0);
  const displayList = query.length > 0 ? results : recentDestinations;

  return (
    <div className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className="w-full bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-cyan-400/30 focus:bg-white/[0.08] transition-all duration-300"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              onClear?.();
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/[0.1] transition-colors"
          >
            <X className="w-3 h-3 text-white/40" />
          </button>
        )}
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: 'top' }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#12121a]/95 backdrop-blur-2xl border border-white/[0.06] rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/40"
          >
            {/* Section label */}
            <div className="px-4 pt-3 pb-1.5">
              <span className="text-[10px] text-white/25 uppercase tracking-widest font-medium">
                {query.length > 0 ? 'Search Results' : 'Recent Destinations'}
              </span>
            </div>

            {displayList.length === 0 && !searching && (
              <div className="px-4 py-6 text-center text-sm text-white/30">
                No destinations found
              </div>
            )}

            {displayList.map((dest, i) => (
              <motion.button
                key={dest.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  onSelect(dest);
                  setQuery(dest.label);
                  setFocused(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-cyan-400/10 flex items-center justify-center transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-white/30 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/80 group-hover:text-white transition-colors truncate">
                      {dest.label}
                    </span>
                    {dest.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  </div>
                  <div className="text-[11px] text-white/30 truncate">{dest.sublabel}</div>
                </div>
                {dest.eta && (
                  <div className="flex items-center gap-1 text-[11px] text-white/30 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span className="tabular-nums">{dest.eta}</span>
                  </div>
                )}
              </motion.button>
            ))}

            {/* Click-away hint */}
            <div
              className="h-8 cursor-pointer"
              onMouseDown={() => setFocused(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
