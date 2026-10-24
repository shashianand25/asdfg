import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, Gauge, Wind } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getLatestForecast } from '../api/client'

const SAMPLE_DATE = '2026-01-15'

const workflows = [
  {
    number: '01',
    label: 'See the signal',
    title: 'Know what the wind is doing next.',
    text: 'Move from a national generation outlook to the settlement periods that matter for the next decision.',
    link: '/forecast',
  },
  {
    number: '02',
    label: 'Read the drift',
    title: 'Understand how the forecast moved.',
    text: 'Put the latest outlook beside day-ahead expectations and see where the position changed most.',
    link: '/forecast',
  },
  {
    number: '03',
    label: 'Act with context',
    title: 'Use accuracy to calibrate confidence.',
    text: 'Historical error gives the current signal a useful frame before procurement or trading decisions.',
    link: '/accuracy',
  },
]

const surfaces = [
  {
    number: '01',
    eyebrow: 'Short horizon',
    title: 'Forecast Explorer',
    text: 'Latest and day-ahead national wind forecasts for every delivery period.',
    link: '/forecast',
  },
  {
    number: '02',
    eyebrow: 'Signal quality',
    title: 'Accuracy Analysis',
    text: 'MAE, RMSE, bias, and lead-time performance for the January evaluation period.',
    link: '/accuracy',
  },
  {
    number: '03',
    eyebrow: 'Traceable inputs',
    title: 'Methodology',
    text: 'The data sources and selection logic behind every forecast comparison.',
    link: '/methodology',
  },
]

function formatGW(value) {
  return value == null ? '—' : `${(value / 1000).toFixed(1)} GW`
}

function formatUKTime(value) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

function getSeries(slots, field) {
  return (slots || [])
    .filter((slot) => slot[field] != null)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((slot) => ({ time: slot.startTime, value: slot[field] }))
}

function linePoints(series, min, max) {
  if (!series.length) return ''
  const span = max - min || 1
  return series.map(({ value }, index) => {
    const x = 12 + (index / Math.max(series.length - 1, 1)) * 476
    const y = 8 + ((max - value) / span) * 72
    return `${x},${y}`
  }).join(' ')
}

function WindSnapshot({ data, status }) {
  const latest = getSeries(data?.slots, 'latest_generation')
  const dayAhead = getSeries(data?.slots, 'da_generation')
  const allValues = [...latest, ...dayAhead].map((point) => point.value)
  const min = allValues.length ? Math.min(...allValues) : 0
  const max = allValues.length ? Math.max(...allValues) : 1
  const latestMean = latest.length
    ? latest.reduce((sum, point) => sum + point.value, 0) / latest.length
    : null
  const dayAheadMean = dayAhead.length
    ? dayAhead.reduce((sum, point) => sum + point.value, 0) / dayAhead.length
    : null
  const peak = latest.reduce((best, point) => !best || point.value > best.value ? point : best, null)
  const peakDayAhead = peak && data?.slots?.find((slot) => slot.startTime === peak.time)?.da_generation
  const peakRevision = peak && peakDayAhead != null ? peak.value - peakDayAhead : null
  const latestPoints = linePoints(latest, min, max)
  const dayAheadPoints = linePoints(dayAhead, min, max)
  const fillPoints = latestPoints ? `12,88 ${latestPoints} 488,88` : ''

  return (
    <div className="signal-preview" aria-label="Historical January 2026 wind forecast sample">
      <div className="snapshot-topline">
        <span className="preview-status"><span className="signal-dot teal" />Elexon BMRS</span>
        <span className="snapshot-badge"><span />Historical sample</span>
      </div>

      <div className="snapshot-heading">
        <div>
          <p className="preview-eyebrow">UK national wind · delivery day</p>
          <h2>15 January 2026</h2>
        </div>
        <div className="snapshot-date-icon"><CalendarDays size={18} /></div>
      </div>

      <div className="snapshot-chart-head">
        <div>
          <p className="preview-eyebrow">Mean latest forecast</p>
          <strong className="snapshot-primary-value">
            {status === 'ready' ? formatGW(latestMean) : status === 'loading' ? 'Loading…' : 'Unavailable'}
          </strong>
        </div>
        {status === 'ready' && peak && (
          <div className="snapshot-peak">
            <span>Peak</span>
            <strong>{formatGW(peak.value)}</strong>
            <small>{formatUKTime(peak.time)} GMT</small>
          </div>
        )}
      </div>

      <div className={`snapshot-chart ${status !== 'ready' ? 'is-empty' : ''}`}>
        {status === 'ready' ? (
          <svg viewBox="0 0 500 100" role="img" aria-label="Latest and day-ahead wind forecast across the delivery day">
            <defs>
              <linearGradient id="snapshotArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#438b5c" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#438b5c" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`M ${fillPoints} Z`} fill="url(#snapshotArea)" />
            <polyline points={dayAheadPoints} fill="none" stroke="#9cb8b0" strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={latestPoints} fill="none" stroke="#39845c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="snapshot-empty-state">
            {status === 'loading' ? 'Loading the Elexon sample…' : 'The forecast sample is unavailable.'}
          </div>
        )}
        <div className="snapshot-axis"><span>00:00</span><span>12:00</span><span>23:00 GMT</span></div>
      </div>

      <div className="snapshot-legend">
        <span><i className="legend-mark latest" />Latest</span>
        <span><i className="legend-mark day-ahead" />Day-ahead</span>
        <span>{data?.slots?.filter((slot) => slot.latest_generation != null).length || 0} periods</span>
      </div>

      <div className="snapshot-stats">
        <div>
          <span>Day-ahead mean</span>
          <strong>{status === 'ready' ? formatGW(dayAheadMean) : '—'}</strong>
        </div>
        <div>
          <span>Revision at peak</span>
          <strong className={peakRevision != null && peakRevision >= 0 ? 'revision-up' : 'revision-down'}>
            {status === 'ready' && peakRevision != null
              ? `${peakRevision > 0 ? '+' : ''}${Math.round(peakRevision).toLocaleString('en-GB')} MW`
              : '—'}
          </strong>
          {peak && <small>{formatUKTime(peak.time)} GMT</small>}
        </div>
      </div>

      <p className="snapshot-footnote">Historical illustration · values shown in MW and GW</p>
    </div>
  )
}

function EnergySignalArt() {
  return (
    <div className="energy-art" aria-hidden="true">
      <svg viewBox="0 0 620 500" role="presentation">
        <defs>
          <linearGradient id="signalStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fbd8c" />
            <stop offset="100%" stopColor="#63bca0" />
          </linearGradient>
        </defs>
        <circle cx="324" cy="250" r="150" fill="none" stroke="#6c9f74" strokeOpacity="0.24" strokeDasharray="2 12" />
        <circle cx="324" cy="250" r="94" fill="none" stroke="#6c9f74" strokeOpacity="0.2" strokeDasharray="1 9" />
        <path d="M67 350C118 315 128 219 183 210C230 202 238 282 292 264C322 254 339 208 356 188" fill="none" stroke="url(#signalStroke)" strokeWidth="2.5" />
        <path d="M72 369C138 338 140 263 190 257C245 250 248 318 300 300C325 291 340 252 350 230" fill="none" stroke="#9fc79d" strokeOpacity="0.52" strokeWidth="1.2" strokeDasharray="5 8" />
        <path d="M324 42V458M115 250H533" stroke="#6c9f74" strokeOpacity="0.14" />
        <path d="M324 206L344 244L324 285L304 244Z" fill="none" stroke="#6c9f74" strokeOpacity="0.46" />
        <circle cx="324" cy="250" r="6" fill="#63bca0" />
      </svg>
    </div>
  )
}

export default function OverviewPage() {
  const [sample, setSample] = useState({ status: 'loading', slots: [] })

  useEffect(() => {
    let active = true
    getLatestForecast(SAMPLE_DATE)
      .then((result) => {
        if (active) setSample({ status: 'ready', slots: result.slots || [] })
      })
      .catch(() => {
        if (active) setSample({ status: 'error', slots: [] })
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll('.landing-page .scroll-reveal')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.14, rootMargin: '0px 0px -36px 0px' })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="content-frame landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="home-brand-lockup">
              <img src="/gridsight.svg" alt="" aria-hidden="true" />
              <span className="home-brand-name">GridSight</span>
              <span className="home-brand-divider" />
              <span className="home-brand-descriptor">Wind intelligence</span>
            </div>
            <p className="landing-eyebrow"><span className="signal-dot teal" />UK energy markets / wind intelligence</p>
            <h1>Forecast the wind.<br /><em>Move with the signal.</em></h1>
            <p className="landing-lede">
              Read the latest national wind outlook beside its day-ahead baseline, then put the forecast error in context before the next procurement decision.
            </p>
            <div className="landing-actions">
              <Link to="/forecast" className="landing-button">Explore the forecast <ArrowRight size={16} /></Link>
              <Link to="/methodology" className="landing-text-link">How it works <ArrowUpRight size={15} /></Link>
            </div>
            <p className="landing-footnote">Elexon BMRS data · January 2026 evaluation sample</p>
          </div>
          <div className="landing-hero-visual">
            <EnergySignalArt />
            <WindSnapshot data={sample} status={sample.status} />
          </div>
        </div>
        <div className="hero-bottom-line content-frame"><span>Forecast</span><span>Interpret</span><span>Decide</span><span className="hero-scroll-cue">Scroll to explore <ArrowRight size={14} /></span></div>
      </section>

      <section className="landing-intro-section">
        <div className="landing-intro content-frame scroll-reveal">
          <div className="landing-section-kicker">01 / A clearer decision path</div>
          <div className="landing-intro-body">
            <h2>From a forecast<br /><em>to a decision.</em></h2>
            <p>
              The useful question is rarely just “what is the forecast?” GridSight brings the outlook, its revisions, and its historical behaviour into one considered workspace—so the signal is easier to read before the market moves.
            </p>
          </div>
        </div>
      </section>

      <section className="workflow-section content-frame">
        {workflows.map((workflow, index) => (
          <article className="workflow-item scroll-reveal" style={{ '--reveal-index': index }} key={workflow.number}>
            <span className="workflow-number">{workflow.number}</span>
            <p className="workflow-label">{workflow.label}</p>
            <h3>{workflow.title}</h3>
            <p>{workflow.text}</p>
            <Link to={workflow.link} aria-label={`Open ${workflow.label}`}><ArrowUpRight size={17} /></Link>
          </article>
        ))}
      </section>

      <section className="surfaces-section">
        <div className="content-frame">
          <div className="surfaces-heading scroll-reveal">
            <div>
              <div className="landing-section-kicker">02 / Three views, one decision</div>
              <h2>Everything you need<br /><em>to read the next move.</em></h2>
            </div>
            <p>Forecast detail, historical accuracy, and traceable methodology stay close enough to support the same purchase decision.</p>
          </div>
          <div className="surface-list">
            {surfaces.map((surface, index) => (
              <Link className="surface-row scroll-reveal" style={{ '--reveal-index': index }} to={surface.link} key={surface.number}>
                <span className="surface-number">{surface.number}</span>
                <span className="surface-copy"><span>{surface.eyebrow}</span><strong>{surface.title}</strong></span>
                <span className="surface-description">{surface.text}</span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-close content-frame scroll-reveal">
        <div className="close-mark"><Gauge size={26} strokeWidth={1.25} /><Wind size={18} strokeWidth={1.25} /></div>
        <p className="landing-section-kicker">03 / The next decision</p>
        <h2>Better decisions start<br /><em>with a better signal.</em></h2>
        <p>Open the forecast workspace to explore the selected delivery day and see what the latest data is telling you.</p>
        <Link to="/forecast" className="landing-button landing-button-dark">Open Forecast Explorer <ArrowRight size={16} /></Link>
      </section>

      <footer className="landing-footer">
        <div className="content-frame landing-footer-inner">
          <div className="footer-brand"><img className="brand-mark brand-logo-image" src="/gridsight.svg" alt="" aria-hidden="true" /><span>GridSight</span></div>
          <p>Elexon BMRS · National wind generation · January 2026</p>
          <div className="footer-links"><Link to="/forecast">Forecast Explorer</Link><Link to="/accuracy">Accuracy Analysis</Link><Link to="/methodology">Methodology</Link></div>
        </div>
      </footer>
    </main>
  )
}
