import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'

const COLORS = {
  mae:  '#367CF5',
  rmse: '#F59E35',
  bias: '#0F9F91',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="chart-tooltip min-w-[160px]">
      <p className="text-xs font-semibold text-content-primary mb-2 pb-2 border-b border-surface-border">
        Lead time: {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-xs text-content-secondary">{entry.name}</span>
          </div>
          <span className="text-xs font-semibold text-content-primary font-tabular">
            {entry.value != null ? `${Number(entry.value).toFixed(0)} MW` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AccuracyChart({ leadtimeData }) {
  if (!leadtimeData || leadtimeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-60 text-content-tertiary text-sm">
        No lead-time data available.
      </div>
    )
  }

  // Replace nulls with undefined so recharts doesn't render them as 0
  const chartData = leadtimeData.map((d) => ({
    ...d,
    mae:  d.mae  ?? undefined,
    rmse: d.rmse ?? undefined,
    bias: d.bias ?? undefined,
  }))

  // Check if we have any non-null data beyond 0-6h
  const hasLimitedData = chartData.every((d, i) => i === 0 || (d.mae == null && d.rmse == null && d.bias == null))

  return (
    <div>
      {hasLimitedData && (
        <div className="mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
          <span className="text-amber-600 text-xs font-medium flex-shrink-0 mt-0.5">ℹ</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            Data is only available for the <strong>0–6h</strong> lead-time bucket. This occurs because the
            matched dataset uses the latest published forecast per slot, most of which were published very
            close to delivery time. Forecasts published 6–36 hours before delivery were not captured in the
            matched pairs for this evaluation period.
          </p>
        </div>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          barGap={4}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11, fill: '#707B8E' }}
            tickLine={false}
            axisLine={{ stroke: '#E5EAF1' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#707B8E' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${Math.round(v).toLocaleString()}`}
            label={{
              value: 'MW',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              fill: '#707B8E',
              fontSize: 11,
            }}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(54, 124, 245, 0.04)' }} />
          <Legend
            wrapperStyle={{ paddingTop: '12px' }}
            formatter={(value) => (
              <span className="text-xs text-content-secondary">{value}</span>
            )}
          />
          <ReferenceLine y={0} stroke="#E5EAF1" strokeWidth={1.5} />

          <Bar dataKey="mae" name="MAE" fill={COLORS.mae} radius={[3, 3, 0, 0]} maxBarSize={36} />
          <Bar dataKey="rmse" name="RMSE" fill={COLORS.rmse} radius={[3, 3, 0, 0]} maxBarSize={36} />
          <Bar dataKey="bias" name="Bias" fill={COLORS.bias} radius={[3, 3, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
