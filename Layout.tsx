import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Navigation, Route, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/navigation', icon: Navigation, label: 'Drive' },
  { to: '/route-planner', icon: Route, label: 'Plan' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden font-['Inter',system-ui,sans-serif]">
      {/* Top status bar */}
      <header className="relative z-50 flex items-center justify-between px-6 h-12 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Gauge className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-semibold tracking-widest uppercase text-white/90">
            Smart Drive EU
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span className="hidden sm:inline">v2.4.1</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom navigation */}
      <nav className="relative z-50 flex items-center justify-center gap-1 px-4 h-16 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/[0.06]">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'text-cyan-400'
                  : 'text-white/40 hover:text-white/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.5} />
                <span className="text-[10px] font-medium tracking-wider uppercase">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-px left-3 right-3 h-0.5 bg-cyan-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
