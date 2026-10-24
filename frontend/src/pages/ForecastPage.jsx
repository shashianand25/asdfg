import { useState, useEffect, useCallback } from 'react'
import { Download, Wind, Zap, TrendingUp, TrendingDown, Hash } from 'lucide-react'
import TopBar from '../components/TopBar'
import PageHeader from '../components/PageHeader'
import MetricCard from '../components/MetricCard'
import ForecastChart from '../components/ForecastChart'
import { LoadingSpinner, ErrorState, CardSkeleton } from '../components/States'
import { getCachedLatestForecast, getLatestForecast } from '../api/client'

const DEFAULT_DATE = '2026-01-15'

function calcStats(slots) {
  const valid = (slots || []).filter((s) => s.latest_generation != null)
  if (valid.length === 0) return {}
  const values = valid.map((s) => s.latest_generation)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const peak = valid.reduce((a, b) => (b.latest_generation > a.latest_generation ? b : a))
  const min  = valid.reduce((a, b) => (b.latest_generation < a.latest_generation ? b : a))
  const energy = values.reduce((a, b) => a + b, 0) * 1 // 1h per slot
  return { mean, peak, min, energy, count: valid.length }
}

function fmtTime(iso) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date(iso))
  } catch { return iso }
}

function fmtMW(v) {
  if (v == null || isNaN(v)) return '—'
  return Math.round(v).toLocaleString()
}

function exportCSV(slots, date) {
  const rows = [
    ['Delivery Time', 'Settlement Period (approx)', 'Latest Forecast (MW)', 'Day-Ahead Forecast (MW)', 'Revision (MW)'],
    ...slots.map((s, i) => {
      const rev = s.latest_generation != null && s.da_generation != null
        ? (s.latest_generation - s.da_generation).toFixed(0)
        : ''
      return [
        fmtTime(s.startTime),
        i + 1,
        s.latest_generation != null ? Math.round(s.latest_generation) : '',
        s.da_generation != null ? Math.round(s.da_generation) : '',
        rev,
      ]
    }),
  ]
  const csv = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `windtrader_forecast_${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ForecastPage({ onMenuClick, selectedDate, onDateChange }) {
  const initialDate = selectedDate || DEFAULT_DATE
  const initialData = getCachedLatestForecast(initialDate)
  const [date, setDateState] = useState(initialDate)

  useEffect(() => {
    if (selectedDate && selectedDate !== date) {
      setDateState(selectedDate)
    }
  }, [selectedDate])

  const setDate = (newDate) => {
    setDateState(newDate)
    onDateChange?.(newDate)
  }

  const [slots, setSlots] = useState(initialData?.slots || [])
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sortField, setSortField] = useState('time')
  const [sortDir, setSortDir] = useState('asc')

  const load = useCallback(async (isRefresh = false) => {
    const cached = !isRefresh ? getCachedLatestForecast(date) : null
    if (cached) {
      setSlots(cached.slots || [])
      setError(null)
      setLoading(false)
      return
    }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await getLatestForecast(date, { force: isRefresh })
      setSlots(res.slots || [])
    } catch {
      setError('Failed to load data. Is the backend running?')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const stats = calcStats(slots)

  // Sorted table data
  const tableData = [...slots].sort((a, b) => {
    let aVal, bVal
    if (sortField === 'time')    { aVal = a.startTime;          bVal = b.startTime }
    if (sortField === 'latest')  { aVal = a.latest_generation;  bVal = b.latest_generation }
    if (sortField === 'da')      { aVal = a.da_generation;       bVal = b.da_generation }
    if (sortField === 'rev') {
      aVal = (a.latest_generation != null && a.da_generation != null) ? a.latest_generation - a.da_generation : null
      bVal = (b.latest_generation != null && b.da_generation != null) ? b.latest_generation - b.da_generation : null
    }
    if (aVal == null) return 1
    if (bVal == null) return -1
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-content-tertiary ml-1">↕</span>
    return <span className="text-electric-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        breadcrumb="WindTrader"
        title="Forecast Explorer"
        subtitle={`Delivery date: ${date}`}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        onMenuClick={onMenuClick}
      >
        <input
          type="date"
          value={date}
          min="2026-01-01"
          max="2026-01-31"
          onChange={(e) => setDate(e.target.value)}
          className="wt-input text-xs py-1.5"
        />
        <button
          onClick={() => exportCSV(slots, date)}
          disabled={slots.length === 0}
          className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs disabled:opacity-40"
        >
          <Download size={13} />
          Export CSV
        </button>
      </TopBar>

      <div className="page-content flex-1">
        <PageHeader
          eyebrow="FORECAST EXPLORER"
          title="Forecast Explorer"
          description="Inspect forecast vintages and settlement-period changes in expected wind generation."
        />

        {/* Summary metrics */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {[...Array(5)].map((_, i) => <CardSkeleton key={i} height="h-28" />)}
          </div>
        ) : !error && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <MetricCard
              label="Mean Forecast"
              value={stats.mean != null ? fmtMW(stats.mean) : null}
              unit="MW"
              description="Average across valid periods"
              accentColor="electric"
              icon={Wind}
            />
            <MetricCard
              label="Peak Generation"
              value={stats.peak?.latest_generation != null ? fmtMW(stats.peak.latest_generation) : null}
              unit="MW"
              description={stats.peak ? `At ${fmtTime(stats.peak.startTime)}` : ''}
              accentColor="amber"
              icon={TrendingUp}
            />
            <MetricCard
              label="Minimum Generation"
              value={stats.min?.latest_generation != null ? fmtMW(stats.min.latest_generation) : null}
              unit="MW"
              description={stats.min ? `At ${fmtTime(stats.min.startTime)}` : ''}
              accentColor="teal"
              icon={TrendingDown}
            />
            <MetricCard
              label="Est. Wind Energy"
              value={stats.energy != null ? fmtMW(stats.energy) : null}
              unit="MWh"
              description="Sum over valid hourly slots"
              accentColor="navy"
              icon={Zap}
            />
            <MetricCard
              label="Valid Periods"
              value={stats.count != null ? stats.count : null}
              unit="slots"
              description="With valid forecast data"
              accentColor="electric"
              icon={Hash}
            />
          </div>
        )}

        {/* Chart */}
        <div className="chart-card mb-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-content-primary">Generation by Settlement Period</h3>
            <p className="text-xs text-content-secondary mt-0.5">
              Latest and day-ahead forecasts for {date}
            </p>
          </div>

          {loading ? (
            <LoadingSpinner height="h-80" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => load()} height="h-80" />
          ) : (
            <ForecastChart data={slots} />
          )}
        </div>

        {/* Forecast revision analysis context */}
        <div className="wt-card mb-6 p-5">
          <h3 className="text-sm font-semibold text-content-primary mb-1">Forecast Vintage Context</h3>
          <p className="text-xs text-content-secondary leading-relaxed">
            The <span className="text-electric-600 font-medium">latest forecast</span> represents
            the most recently published WINDFOR record for each delivery slot.
            The <span className="text-amber-600 font-medium">day-ahead forecast</span> is the
            latest publication available at least 24 hours before delivery. This fixed decision cutoff
            is also used for the primary accuracy score. The <code className="text-xs bg-surface-bg px-1 py-0.5 rounded">/api/forecast/history</code> endpoint
            contains all publication vintages; a full revision timeline requires that the data was
            captured across multiple publication timestamps.
          </p>
        </div>

        {/* Settlement period table */}
        <div className="wt-card mb-6">
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-content-primary">Settlement Period Detail</h3>
              <p className="text-xs text-content-secondary mt-0.5">
                All periods for {date}. Click column headers to sort.
              </p>
            </div>
            <button
              onClick={() => exportCSV(slots, date)}
              disabled={slots.length === 0}
              className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs disabled:opacity-40"
            >
              <Download size={13} />
              Export
            </button>
          </div>

          {loading ? (
            <div className="p-6"><LoadingSpinner height="h-32" /></div>
          ) : error ? (
            <div className="p-6"><ErrorState message={error} /></div>
          ) : tableData.length === 0 ? (
            <div className="p-8 text-center text-sm text-content-secondary">
              No forecast data available for this date. Try selecting a date in January 2026.
            </div>
          ) : (
            <div className="table-scroll">
              <table className="wt-table">
                <thead>
                  <tr>
                    <th className="cursor-pointer select-none" onClick={() => handleSort('time')}>
                      Delivery Time <SortIcon field="time" />
                    </th>
                    <th className="right cursor-pointer select-none" onClick={() => handleSort('da')}>
                      Day-Ahead (MW) <SortIcon field="da" />
                    </th>
                    <th className="right cursor-pointer select-none" onClick={() => handleSort('latest')}>
                      Latest (MW) <SortIcon field="latest" />
                    </th>
                    <th className="right cursor-pointer select-none" onClick={() => handleSort('rev')}>
                      Revision (MW) <SortIcon field="rev" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((s, i) => {
                    const rev = s.latest_generation != null && s.da_generation != null
                      ? s.latest_generation - s.da_generation
                      : null
                    const up = rev != null && rev > 0
                    const neutral = rev != null && Math.abs(rev) < 1
                    return (
                      <tr key={i} className="hover:bg-surface-bg transition-colors">
                        <td className="text-sm font-medium text-content-primary">{fmtTime(s.startTime)}</td>
                        <td className="right text-content-secondary">{fmtMW(s.da_generation)}</td>
                        <td className="right text-content-primary font-medium">{fmtMW(s.latest_generation)}</td>
                        <td className="right">
                          {rev != null ? (
                            <span className={neutral ? 'text-content-secondary' : up ? 'text-electric-600' : 'text-amber-600'}>
                              {!neutral && (up ? '+' : '')}{fmtMW(rev)}
                            </span>
                          ) : (
                            <span className="text-content-tertiary">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="source-note text-center pb-4">
          Source: Elexon BMRS — WINDFOR. National wind generation. Data covers January 2026.
        </p>
      </div>
    </div>
  )
}
