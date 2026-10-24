import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length < 2) return null
  const actual = payload.find(p => p.name === 'actual')?.value
  const forecast = payload.find(p => p.name === 'forecast')?.value
  const error = forecast != null && actual != null ? forecast - actual : null
  return (
    <div className="chart-tooltip min-w-[160px]">
      <p className="text-xs font-semibold text-content-primary mb-2 pb-2 border-b border-surface-border">
        Settlement period
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
            <span className="text-xs text-content-secondary">Actual</span>
          </div>
          <span className="text-xs font-semibold text-content-primary font-tabular">
            {actual != null ? `${Math.round(actual).toLocaleString()} MW` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-electric-500 flex-shrink-0" />
            <span className="text-xs text-content-secondary">Forecast</span>
          </div>
          <span className="text-xs font-semibold text-content-primary font-tabular">
            {forecast != null ? `${Math.round(forecast).toLocaleString()} MW` : '—'}
          </span>
        </div>
        {error != null && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-surface-border mt-1">
            <span className="text-xs text-content-secondary">Error</span>
            <span className={`text-xs font-semibold font-tabular ${error > 0 ? 'text-amber-600' : error < 0 ? 'text-electric-600' : 'text-content-primary'}`}>
              {error > 0 ? '+' : ''}{Math.round(error).toLocaleString()} MW
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ScatterPlot({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-60 text-content-tertiary text-sm">
        No matched forecast/actual data available.
      </div>
    )
  }

  const allValues = data.flatMap((d) => [d.actual, d.forecast]).filter((v) => v != null)
  const minVal = Math.floor(Math.min(...allValues) / 1000) * 1000
  const maxVal = Math.ceil(Math.max(...allValues) / 1000) * 1000

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 8, right: 24, left: 8, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" />
        <XAxis
          dataKey="actual"
          name="actual"
          type="number"
          domain={[minVal, maxVal]}
          tick={{ fontSize: 11, fill: '#707B8E' }}
          tickLine={false}
          axisLine={{ stroke: '#E5EAF1' }}
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
        >
          <Label
            value="Actual Generation (MW)"
            position="insideBottom"
            offset={-16}
            fill="#707B8E"
            fontSize={11}
          />
        </XAxis>
        <YAxis
          dataKey="forecast"
          name="forecast"
          type="number"
          domain={[minVal, maxVal]}
          tick={{ fontSize: 11, fill: '#707B8E' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          width={44}
        >
          <Label
            value="Forecast (MW)"
            angle={-90}
            position="insideLeft"
            offset={12}
            fill="#707B8E"
            fontSize={11}
          />
        </YAxis>
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#E5EAF1' }} />

        {/* Perfect forecast reference line y = x */}
        <ReferenceLine
          segment={[{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }]}
          stroke="#9cb8a2"
          strokeDasharray="6 3"
          strokeWidth={1.5}
          label={{
            value: 'Perfect',
            position: 'insideTopLeft',
            fill: '#9cb8a2',
            fontSize: 10,
          }}
        />

        <Scatter
          data={data}
          fill="#39845c"
          fillOpacity={0.45}
          r={4}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
