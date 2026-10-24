import { useState, useEffect, useCallback } from 'react'
import { BarChart2, Target, TrendingUp, Hash, AlertTriangle, Info } from 'lucide-react'
import TopBar from '../components/TopBar'
import PageHeader from '../components/PageHeader'
import MetricCard from '../components/MetricCard'
import AccuracyChart from '../components/AccuracyChart'
import ScatterPlot from '../components/ScatterPlot'
import { LoadingSpinner, ErrorState, CardSkeleton } from '../components/States'
import { getAccuracySummary, getAccuracyByLeadtime, getActualsVsForecast } from '../api/client'

function fmtMW(v) {
  if (v == null || isNaN(v)) return null
  return Math.round(v).toLocaleString()
}

function InterpretationPanel({ summary, leadtimeData }) {
  if (!summary) return null

  const { mae, rmse, bias, count } = summary
  const biasDir = bias != null ? (bias > 0 ? 'over-forecasting' : bias < 0 ? 'under-forecasting' : 'near-zero bias') : null
  const overForecast = bias != null && bias > 0

  // Find highest MAE lead-time bucket (non-null)
  const topBucket = leadtimeData
    ?.filter((b) => b.mae != null)
    .sort((a, b) => b.mae - a.mae)[0]

  return (
    <div className="wt-card p-5">
      <h3 className="text-base font-semibold text-content-primary mb-1">What the Error Tells Us</h3>
      <p className="text-xs text-content-secondary mb-4">
        Evidence-based interpretation of January 2026 forecast accuracy.
      </p>

      <div className="space-y-0">
        {mae != null && (
          <div className="insight-item">
            <div className="w-6 h-6 bg-electric-50 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
              <Target size={12} className="text-electric-600" />
            </div>
            <div>
              <p className="section-eyebrow mb-0.5">AVERAGE ERROR</p>
              <p className="text-xs text-content-primary leading-relaxed">
                Forecasts deviated from actual generation by an average of{' '}
                <strong>{fmtMW(mae)} MW</strong> (MAE) across {count?.toLocaleString() ?? '—'} matched periods.
              </p>
            </div>
          </div>
        )}

        {bias != null && (
          <div className="insight-item">
            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${overForecast ? 'bg-amber-50' : 'bg-teal-50'}`}>
              <TrendingUp size={12} className={overForecast ? 'text-amber-600' : 'text-teal-600'} />
            </div>
            <div>
              <p className="section-eyebrow mb-0.5">FORECAST TENDENCY</p>
              <p className="text-xs text-content-primary leading-relaxed">
                The data shows a tendency toward{' '}
                <strong>{biasDir}</strong> by an average of{' '}
                <strong>{fmtMW(Math.abs(bias))} MW</strong> (positive bias = over-forecast).
              </p>
            </div>
          </div>
        )}

        {rmse != null && mae != null && (
          <div className="insight-item">
            <div className="w-6 h-6 bg-surface-bg rounded flex items-center justify-center flex-shrink-0 mt-0.5">
              <BarChart2 size={12} className="text-content-secondary" />
            </div>
            <div>
              <p className="section-eyebrow mb-0.5">ERROR DISTRIBUTION</p>
              <p className="text-xs text-content-primary leading-relaxed">
                RMSE ({fmtMW(rmse)} MW) exceeds MAE ({fmtMW(mae)} MW), indicating the presence of{' '}
                some larger individual errors that are penalised more heavily by RMSE.
              </p>
            </div>
          </div>
        )}

        {topBucket && (
          <div className="insight-item">
            <div className="w-6 h-6 bg-surface-bg rounded flex items-center justify-center flex-shrink-0 mt-0.5">
              <Hash size={12} className="text-content-secondary" />
            </div>
            <div>
              <p className="section-eyebrow mb-0.5">LEAD TIME</p>
              <p className="text-xs text-content-primary leading-relaxed">
                The <strong>{topBucket.bucket}</strong> lead-time bucket has the highest MAE
                ({fmtMW(topBucket.mae)} MW) in the available evaluation data.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-surface-bg rounded-lg p-3 border border-surface-border">
        <p className="text-[11px] text-content-secondary leading-relaxed">
          <strong>Note:</strong> MAE is not a confidence interval and forecast bias does not directly
          determine an optimal purchase volume. These metrics characterise historical forecast behaviour
          and should be used alongside demand forecasts and other generation sources.
        </p>
      </div>
    </div>
  )
}

export default function AccuracyPage({ onMenuClick }) {
  const [summary, setSummary] = useState(null)
  const [leadtimeData, setLeadtimeData] = useState([])
  const [scatterData, setScatterData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [summaryRes, leadtimeRes, scatterRes] = await Promise.all([
        getAccuracySummary(),
        getAccuracyByLeadtime(),
        getActualsVsForecast(),
      ])
      setSummary(summaryRes)
      setLeadtimeData(leadtimeRes.buckets || [])
      setScatterData(scatterRes.points || [])
    } catch {
      setError('Failed to load accuracy data. Is the backend running on port 8000?')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const isOverForecast = summary?.bias != null && summary.bias > 0

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        breadcrumb="WindTrader"
        title="Forecast Accuracy Analysis"
        subtitle="Evaluation period: January 2026"
        onRefresh={() => load(true)}
        refreshing={refreshing}
        onMenuClick={onMenuClick}
      />

      <div className="page-content flex-1">
        <PageHeader
          eyebrow="ACCURACY ANALYSIS"
          title="Forecast Accuracy Analysis"
          description="Backtest the forecast available 24 hours before delivery, then compare errors across lead-time horizons."
          right={
            <span className="text-xs text-content-secondary bg-surface-bg border border-surface-border px-3 py-1.5 rounded-lg font-medium">
              January 2026
            </span>
          }
        />

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <CardSkeleton key={i} height="h-32" />)}
          </div>
        ) : error ? (
          <div className="wt-card p-6 mb-6">
            <ErrorState message={error} onRetry={() => load()} height="h-32" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              label="Mean Absolute Error"
              value={fmtMW(summary?.mae)}
              unit="MW"
              description="Average error at the 24-hour-ahead decision cutoff"
              accentColor="electric"
              icon={Target}
              tooltip="MAE = mean of |forecast − actual|. Does not penalise large errors more than small ones."
            />
            <MetricCard
              label="Root Mean Square Error"
              value={fmtMW(summary?.rmse)}
              unit="MW"
              description="24-hour-ahead error; penalises large misses more"
              accentColor="amber"
              icon={BarChart2}
              tooltip="RMSE = √(mean of (forecast − actual)²). More sensitive to large individual errors."
            />
            <MetricCard
              label="Forecast Bias"
              value={summary?.bias != null
                ? `${summary.bias > 0 ? '+' : ''}${fmtMW(summary.bias)}`
                : null}
              unit="MW"
              description={summary?.bias != null
                ? (isOverForecast ? 'Positive — tendency to over-forecast' : 'Negative — tendency to under-forecast')
                : '24-hour-ahead error; positive means over-forecast'}
              accentColor={isOverForecast ? 'amber' : 'teal'}
              icon={isOverForecast ? TrendingUp : TrendingUp}
              tooltip="Bias = mean of (forecast − actual). Positive = over-forecast on average. Negative = under-forecast."
            />
            <MetricCard
              label="Matched Observations"
              value={summary?.count != null ? summary.count.toLocaleString() : null}
              unit="periods"
              description="Matched delivery slots with a D-1 forecast and actual"
              accentColor="navy"
              icon={Hash}
              tooltip="Number of settlement periods where both a forecast and an actual generation value were available and matched."
            />
          </div>
        )}

        {/* Lead-time chart */}
        <div className="chart-card mb-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-content-primary">Accuracy Across Forecast Lead Times</h3>
            <p className="text-xs text-content-secondary mt-0.5">
              MAE, RMSE, and bias grouped by forecast lead-time bucket
            </p>
          </div>
          {loading ? (
            <LoadingSpinner height="h-72" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => load()} height="h-72" />
          ) : (
            <AccuracyChart leadtimeData={leadtimeData} />
          )}
        </div>

        {/* Scatter + interpretation */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          {/* Scatter plot */}
          <div className="chart-card">
            <div className="mb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-content-primary">Forecast vs Actual Generation</h3>
                  <p className="text-xs text-content-secondary mt-0.5">
                    Each point is a matched delivery period at the 24-hour-ahead cutoff (up to 200 periods)
                  </p>
                </div>
                <span className="badge badge-blue flex-shrink-0">Sample</span>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner height="h-72" />
            ) : error ? (
              <ErrorState message={error} height="h-72" />
            ) : (
              <>
                <ScatterPlot data={scatterData} />
                <div className="mt-3 px-3 py-2.5 bg-surface-bg rounded-lg border border-surface-border">
                  <p className="text-[11px] text-content-secondary leading-relaxed">
                    Points <strong>above</strong> the diagonal represent over-forecasting (forecast exceeded actual).
                    Points <strong>below</strong> represent under-forecasting. The dashed line is the perfect forecast reference (y = x).
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Interpretation panel */}
          {loading ? (
            <CardSkeleton height="h-full min-h-64" />
          ) : !error && (
            <InterpretationPanel summary={summary} leadtimeData={leadtimeData} />
          )}
        </div>

        {/* Methodology note */}
        <div className="wt-card p-5 mb-6">
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-surface-bg rounded flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info size={13} className="text-content-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-content-primary mb-1">Methodology</p>
              <p className="text-xs text-content-secondary leading-relaxed">
                Error = Forecast − Actual. Positive bias means the forecast overestimated actual generation.
                Negative bias means underestimation. Accuracy metrics use the latest forecast published
                at least 24 hours before each slot, matched against FUELHH actual generation data. The lead-time analysis
                uses the time gap between the matched forecast's <code className="text-xs bg-surface-bg px-1 rounded">publishTime</code> and
                the slot's <code className="text-xs bg-surface-bg px-1 rounded">startTime</code>.
              </p>
            </div>
          </div>
        </div>

        <p className="source-note text-center pb-4">
          Source: Elexon BMRS — WINDFOR and FUELHH. National wind generation. Evaluation period: January 2026.
        </p>
      </div>
    </div>
  )
}
