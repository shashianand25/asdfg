import { NavLink } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { Menu, X, Zap } from 'lucide-react'

export default function Navbar({ mobileOpen, onClose, onMenuClick }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const linkClass = ({ isActive }) =>
    `nav-link ${isActive ? 'active' : ''}`

  return (
    <header className={`site-header ${isHome ? 'site-header-home' : ''}`}>
      <div className="site-header-inner">
        <NavLink to="/" end className="brand-lockup" onClick={onClose}>
          <span className="brand-mark" aria-hidden="true"><Zap size={15} strokeWidth={2.5} /></span>
          <span>
            <span className="brand-name">WindTrader</span>
            <span className="brand-descriptor">Energy intelligence</span>
          </span>
        </NavLink>

        <button
          onClick={onMenuClick}
          className="mobile-menu-button"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`site-nav ${mobileOpen ? 'open' : ''}`}>
          <nav aria-label="Primary navigation" className="site-nav-links">
            <NavLink to="/" end className={linkClass} onClick={onClose}>Overview</NavLink>
            <NavLink to="/forecast" className={linkClass} onClick={onClose}>Forecast Explorer</NavLink>
            <NavLink to="/accuracy" className={linkClass} onClick={onClose}>Accuracy Analysis</NavLink>
            <NavLink to="/methodology" className={linkClass} onClick={onClose}>Methodology</NavLink>
          </nav>
          <div className="source-indicator">
            <span className="source-dot" />
            Elexon BMRS
          </div>
        </div>
      </div>
    </header>
  )
}
