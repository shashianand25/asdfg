export default function PageHeader({ eyebrow, title, description, right }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <p className="section-eyebrow mb-1">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-bold text-content-primary leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-content-secondary mt-1.5 max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {right && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {right}
        </div>
      )}
    </div>
  )
}
