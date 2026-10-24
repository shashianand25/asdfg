import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  LineChart,
  BarChart3,
  BookOpen,
  Zap,
  Database,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/forecast', label: 'Forecast Explorer', icon: LineChart },
  { to: '/accuracy', label: 'Accuracy Analysis', icon: BarChart3 },
  { to: '/methodology', label: 'Methodology & Data', icon: BookOpen },
]

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${mobileOpen ? 'open' : ''}`}
        style={{ transition: 'transform 0.2s ease' }}
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-electric-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight leading-none block">
                WindTrader
              </span>
              <span className="text-blue-400 text-[9px] font-semibold uppercase tracking-widest leading-none block mt-0.5">
                Energy Intelligence
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-500 px-1 mb-2">
              Navigation
            </p>
          </div>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={16} strokeWidth={1.75} className="flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-navy-800">
          <div className="flex items-center gap-2">
            <Database size={12} className="text-navy-500" />
            <span className="text-[10px] text-navy-500 font-medium">
              Elexon BMRS
            </span>
          </div>
          <p className="text-[10px] text-navy-600 mt-0.5">January 2026 data</p>
        </div>
      </aside>
    </>
  )
}
