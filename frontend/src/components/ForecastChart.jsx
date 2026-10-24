import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = { latest: '#3478F6', dayAhead: '#F2A23A', actual: '#168F86' }

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date(value))
  } catch { return value }
}

function formatValue(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Math.round(value).toLocaleString('en-GB')} MW`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip min-w-[172px]">
      <p className="tooltip-time">{formatTime(label)}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="tooltip-row">
          <span className="tooltip-series"><span className="tooltip-dot" style={{ backgroundColor: entry.color }} />{entry.name}</span>
          <strong>{formatValue(entry.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function ForecastChart({ data, showActual = false }) {
  if (!data?.length) {
    return <div className="flex h-[420px] items-center justify-center text-sm text-content-secondary">No forecast data available for the selected date.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 10, right: 18, left: 2, bottom: 12 }}>
        <CartesianGrid stroke="#E3E8EF" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="startTime"
          tickFormatter={formatTime}
          tick={{ fontSize: 11, fill: '#6D788A' }}
          tickLine={false}
          axisLine={{ stroke: '#E3E8EF' }}
          minTickGap={28}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6D788A' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${Math.round(value / 1000)}k`}
          width={42}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#B8C2D0', strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="latest_generation"
          name="Latest forecast"
          stroke={COLORS.latest}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: COLORS.latest, stroke: '#fff', strokeWidth: 2 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="da_generation"
          name="Day-ahead forecast"
          stroke={COLORS.dayAhead}
          strokeWidth={1.8}
          strokeDasharray="6 5"
          dot={false}
          activeDot={{ r: 4, fill: COLORS.dayAhead, stroke: '#fff', strokeWidth: 2 }}
          connectNulls={false}
        />
        {showActual && <Line type="monotone" dataKey="actual_generation" name="Actual generation" stroke={COLORS.actual} strokeWidth={1.8} dot={false} activeDot={{ r: 4, fill: COLORS.actual, stroke: '#fff', strokeWidth: 2 }} connectNulls={false} />}
      </LineChart>
    </ResponsiveContainer>
  )
}
