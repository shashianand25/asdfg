import { AlertCircle, RefreshCw } from 'lucide-react'

export function LoadingSpinner({ height = 'h-64' }) {
  return (
    <div className={`flex items-center justify-center ${height}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-electric-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-content-secondary">Loading data…</p>
      </div>
    </div>
  )
}

export function LoadingSkeleton({ rows = 3, height = 'h-4' }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton ${height} rounded`} style={{ width: `${80 - i * 10}%` }} />
      ))}
    </div>
  )
}

export function CardSkeleton({ height = 'h-64' }) {
  return (
    <div className={`wt-card ${height} animate-pulse bg-gray-100`} />
  )
}

export function ErrorState({ message, onRetry, height = 'h-64' }) {
  return (
    <div className={`flex items-center justify-center ${height}`}>
      <div className="text-center max-w-sm">
        <div className="w-10 h-10 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle size={20} className="text-error-500" />
        </div>
        <p className="text-sm font-medium text-content-primary mb-1">
          Unable to load data
        </p>
        <p className="text-xs text-content-secondary mb-4">
          {message || 'Check that the backend server is running on port 8000.'}
        </p>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary flex items-center gap-2 mx-auto">
            <RefreshCw size={14} />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ title, message, icon: Icon, action }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center max-w-sm">
        {Icon && (
          <div className="w-10 h-10 bg-surface-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon size={20} className="text-content-tertiary" />
          </div>
        )}
        <p className="text-sm font-medium text-content-primary mb-1">{title}</p>
        {message && (
          <p className="text-xs text-content-secondary mb-4">{message}</p>
        )}
        {action}
      </div>
    </div>
  )
}
