import { Menu, RefreshCw } from 'lucide-react'

export default function TopBar({
  title,
  subtitle,
  breadcrumb,
  onMenuClick,
  onRefresh,
  refreshing = false,
  children,
}) {
  return (
    <header className="top-bar">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden btn-ghost p-2 -ml-1"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          {breadcrumb && (
            <p className="text-xs text-content-secondary font-medium mb-0.5 hidden sm:block">
              {breadcrumb}
            </p>
          )}
          <h1 className="text-base font-semibold text-content-primary leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-content-secondary mt-0.5 hidden md:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {children}

        {/* Elexon badge */}
        <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-bg border border-surface-border text-[11px] text-content-secondary font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
          Elexon BMRS
        </span>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-1.5 py-1.5"
            aria-label="Refresh data"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline text-xs">Refresh</span>
          </button>
        )}
      </div>
    </header>
  )
}
