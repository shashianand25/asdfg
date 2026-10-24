import { Info } from 'lucide-react'
import { useState } from 'react'

export default function MetricCard({
  label,
  value,
  unit,
  description,
  tooltip,
  accentColor = 'electric',
  icon: Icon,
  badge,
  className = '',
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const accentMap = {
    electric: 'border-electric-500',
    amber:    'border-amber-500',
    teal:     'border-teal-500',
    error:    'border-error-500',
    navy:     'border-navy-700',
  }

  const iconBgMap = {
    electric: 'bg-electric-50 text-electric-600',
    amber:    'bg-amber-50 text-amber-600',
    teal:     'bg-teal-50 text-teal-600',
    error:    'bg-error-50 text-error-500',
    navy:     'bg-navy-50 text-navy-700',
  }

  return (
    <div className={`metric-card border-t-2 ${accentMap[accentColor]} ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${iconBgMap[accentColor]}`}>
              <Icon size={14} strokeWidth={2} />
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
            {label}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="badge badge-blue">{badge}</span>
          )}
          {tooltip && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                className="text-content-tertiary hover:text-content-secondary transition-colors"
                aria-label="More information"
              >
                <Info size={13} />
              </button>
              {showTooltip && (
                <div className="absolute right-0 top-5 w-56 chart-tooltip text-xs text-content-secondary z-50 leading-relaxed">
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-content-primary font-tabular leading-none">
          {value ?? '—'}
        </span>
        {unit && value != null && (
          <span className="text-sm font-medium text-content-secondary">{unit}</span>
        )}
      </div>

      {description && (
        <p className="text-xs text-content-secondary mt-2 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
