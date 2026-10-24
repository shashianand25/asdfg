import { ExternalLink, Database, Calculator, AlertTriangle, FileText } from 'lucide-react'
import TopBar from '../components/TopBar'
import PageHeader from '../components/PageHeader'

function FormulaCard({ name, formula, description }) {
  return (
    <div className="wt-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 bg-electric-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Calculator size={13} className="text-electric-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-content-primary">{name}</p>
          <code className="text-xs font-mono text-electric-700 bg-electric-50 px-2 py-1 rounded mt-1.5 block">
            {formula}
          </code>
          <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

function DataSourceCard({ title, dataset, description, fields, link }) {
  return (
    <div className="wt-card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-content-primary">{title}</p>
            <code className="text-[11px] text-content-secondary font-mono">{dataset}</code>
          </div>
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-electric-600 hover:text-electric-700 transition-colors flex-shrink-0"
          >
            Docs <ExternalLink size={11} />
          </a>
        )}
      </div>
      <p className="text-xs text-content-secondary leading-relaxed mb-3">{description}</p>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-content-tertiary mb-1.5">Key fields</p>
        <div className="flex flex-wrap gap-1.5">
          {fields.map((f) => (
            <code key={f} className="text-[11px] bg-surface-bg border border-surface-border px-1.5 py-0.5 rounded text-content-secondary">
              {f}
            </code>
          ))}
        </div>
      </div>
    </div>
  )
}

function LimitationItem({ title, description }) {
  return (
    <div className="flex gap-3 py-3 border-b border-surface-border last:border-0">
      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-content-primary">{title}</p>
        <p className="text-xs text-content-secondary mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

export default function MethodologyPage({ onMenuClick }) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        breadcrumb="WindTrader"
        title="Methodology & Data"
        subtitle="Source data, forecast selection, and calculation reference"
        onMenuClick={onMenuClick}
      />

      <div className="page-content flex-1">
        <PageHeader
          eyebrow="DOCUMENTATION"
          title="Methodology & Data"
          description="Understand the source data, forecast selection logic, and calculations behind the WindTrader analysis."
        />

        {/* Data sources */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-content-secondary" />
            <h3 className="text-base font-semibold text-content-primary">Data Sources</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DataSourceCard
              title="Wind Forecast Data"
              dataset="WINDFOR"
              description="National wind generation forecast published by Elexon on the BMRS platform. Each record represents a half-hourly delivery slot with an associated publication timestamp."
              fields={['startTime', 'publishTime', 'generation']}
              link="https://developer.data.elexon.co.uk/api-documentation/ref/get/datasets/WINDFOR"
            />
            <DataSourceCard
              title="Actual Generation"
              dataset="FUELHH"
              description="Half-hourly actual fuel-type generation data from Elexon BMRS, filtered to fuelType = WIND. Used as the ground truth for forecast accuracy evaluation."
              fields={['startTime', 'fuelType', 'generation']}
              link="https://developer.data.elexon.co.uk/api-documentation/ref/get/datasets/FUELHH"
            />
          </div>
          <p className="text-xs text-content-secondary mt-3 flex items-center gap-1.5">
            <span>All data covers</span>
            <strong className="text-content-primary">January 2026</strong>
            <span>and is sourced exclusively from</span>
            <a
              href="https://developer.data.elexon.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric-600 hover:underline inline-flex items-center gap-0.5"
            >
              Elexon BMRS <ExternalLink size={10} />
            </a>
          </p>
        </section>

        {/* Forecast selection */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-content-secondary" />
            <h3 className="text-base font-semibold text-content-primary">Forecast Selection</h3>
          </div>
          <div className="wt-card p-5">
            <div className="space-y-0">
              {[
                {
                  label: 'DELIVERY TIME',
                  text: (
                    <>
                      The <code className="text-xs bg-surface-bg px-1 rounded">startTime</code> field in
                      WINDFOR and FUELHH identifies the half-hourly (or hourly) delivery slot. All matching
                      is performed on UTC-normalised timestamps.
                    </>
                  ),
                },
                {
                  label: 'PUBLICATION TIME',
                  text: (
                    <>
                      The <code className="text-xs bg-surface-bg px-1 rounded">publishTime</code> field in
                      WINDFOR identifies when the forecast was published. Multiple forecasts may exist
                      for the same delivery slot, each from a different publication vintage.
                    </>
                  ),
                },
                {
                  label: 'LATEST FORECAST',
                  text: (
                    <>
                      For each delivery slot, the backend selects the record with the highest
                      <code className="text-xs bg-surface-bg px-1 rounded ml-1">publishTime</code> — i.e.,
                      the most recently published forecast available. This is used for the primary chart line
                      and for the latest outlook, not the day-ahead backtest.
                    </>
                  ),
                },
                {
                  label: 'DAY-AHEAD FORECAST',
                  text: (
                    <>
                      The day-ahead forecast is the most recently published forecast whose
                      <code className="text-xs bg-surface-bg px-1 rounded mx-1">publishTime</code>
                      is at least 24 hours before delivery. The most recent forecast available at
                      that cutoff is used for the day-ahead outlook and the primary accuracy score.
                    </>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="flex gap-3 py-3 border-b border-surface-border last:border-0">
                  <div className="w-6 flex-shrink-0" />
                  <div>
                    <p className="section-eyebrow mb-1">{item.label}</p>
                    <p className="text-xs text-content-primary leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Accuracy metrics */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={16} className="text-content-secondary" />
            <h3 className="text-base font-semibold text-content-primary">Accuracy Metrics</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <FormulaCard
              name="Forecast Error"
              formula="error = forecast − actual"
              description="Signed difference between the forecast and actual generation for each matched settlement period. Positive = over-forecast."
            />
            <FormulaCard
              name="Mean Absolute Error (MAE)"
              formula="MAE = mean(|error|)"
              description="Average magnitude of the forecast error. Treats all errors equally regardless of sign or magnitude."
            />
            <FormulaCard
              name="Root Mean Square Error (RMSE)"
              formula="RMSE = √(mean(error²))"
              description="Square root of the mean squared error. Penalises larger individual errors more heavily than MAE."
            />
            <FormulaCard
              name="Forecast Bias"
              formula="Bias = mean(error)"
              description="Average signed error. Positive bias indicates a systematic tendency to over-forecast. Negative indicates under-forecasting."
            />
            <FormulaCard
              name="Lead Time"
              formula="lead_time = startTime − publishTime"
              description="Time gap between the forecast's publication and the delivery slot. Computed per matched pair. Grouped into buckets: 0–6h, 6–12h, 12–24h, 24–36h, 36h+."
            />
            <FormulaCard
              name="Estimated Wind Energy"
              formula="energy = Σ(generation × interval_hours)"
              description="Estimated wind energy across the delivery period. Each slot duration is 1 hour. Missing periods are excluded rather than treated as zero."
            />
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-base font-semibold text-content-primary">Limitations</h3>
          </div>
          <div className="wt-card p-5">
            <LimitationItem
              title="National wind generation only"
              description="This analysis covers aggregate national wind generation. It does not account for regional wind patterns, curtailment, or individual site-level forecasts."
            />
            <LimitationItem
              title="No total electricity demand data"
              description="The application does not include half-hourly national demand data (DEMANDOUTTURN or equivalent). Wind's contribution to the energy mix cannot be calculated from this dataset alone."
            />
            <LimitationItem
              title="No wholesale electricity prices"
              description="Day-ahead and intraday wholesale power prices are not included. Procurement cost optimisation requires price data that is outside this analysis."
            />
            <LimitationItem
              title="No thermal or other generation availability"
              description="The balance of generation sources (gas, nuclear, solar, hydro, interconnectors) is not available. Total procurement requirements cannot be determined from wind data alone."
            />
            <LimitationItem
              title="Historical accuracy does not guarantee future outcomes"
              description="Forecast errors from January 2026 characterise past performance. Weather conditions and forecast model improvements mean future error patterns may differ."
            />
            <LimitationItem
              title="Lead-time data availability"
              description="Accuracy uses the latest forecast available at least 24 hours before each delivery slot. Periods without a qualifying forecast are excluded; the matched-period count shows coverage. Lead-time buckets are calculated separately from all available forecast vintages."
            />
          </div>
        </section>

        <p className="source-note text-center pb-4">
          WindTrader — Wind Generation Intelligence Platform. Source data: Elexon BMRS (WINDFOR, FUELHH). January 2026.
        </p>
      </div>
    </div>
  )
}
