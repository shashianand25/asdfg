import { ArrowRight, ArrowUpRight, Gauge, Network, Wind } from 'lucide-react'
import { Link } from 'react-router-dom'

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

function EnergySignalArt() {
  return (
    <div className="energy-art" aria-hidden="true">
      <div className="energy-art-glow" />
      <svg viewBox="0 0 620 500" role="presentation">
        <defs>
          <linearGradient id="signalStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#64E2D1" />
            <stop offset="100%" stopColor="#3478F6" />
          </linearGradient>
          <radialGradient id="signalCore">
            <stop offset="0%" stopColor="#B5FFF4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#168F86" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="324" cy="250" r="150" fill="none" stroke="#D8FFF8" strokeOpacity="0.13" strokeDasharray="2 12" />
        <circle cx="324" cy="250" r="94" fill="none" stroke="#D8FFF8" strokeOpacity="0.22" strokeDasharray="1 9" />
        <circle cx="324" cy="250" r="60" fill="url(#signalCore)" />
        <path d="M67 350C118 315 128 219 183 210C230 202 238 282 292 264C322 254 339 208 356 188" fill="none" stroke="url(#signalStroke)" strokeWidth="2.5" />
        <path d="M72 369C138 338 140 263 190 257C245 250 248 318 300 300C325 291 340 252 350 230" fill="none" stroke="#F2A23A" strokeOpacity="0.52" strokeWidth="1.2" strokeDasharray="5 8" />
        <path d="M324 42V458M115 250H533" stroke="#D8FFF8" strokeOpacity="0.09" />
        <path d="M324 206L344 244L324 285L304 244Z" fill="none" stroke="#D8FFF8" strokeOpacity="0.7" />
        <circle cx="324" cy="250" r="7" fill="#D8FFF8" />
        <g fill="#D8FFF8">
          <circle cx="118" cy="315" r="4" /><circle cx="182" cy="210" r="4" /><circle cx="238" cy="282" r="4" />
          <circle cx="356" cy="188" r="4" /><circle cx="350" cy="230" r="4" />
        </g>
        <g stroke="#D8FFF8" strokeOpacity="0.2" fill="none">
          <path d="M118 315L182 210L324 250L356 188" />
          <path d="M182 210L238 282L324 250L350 230" />
        </g>
      </svg>
    </div>
  )
}

function SignalPreview() {
  return (
    <div className="signal-preview">
      <div className="signal-preview-topline">
        <span className="preview-status"><span className="signal-dot teal" />Elexon BMRS</span>
        <span>JAN / 2026</span>
      </div>
      <div className="preview-heading">
        <div>
          <p className="preview-eyebrow">National wind outlook</p>
          <p className="preview-title">A signal you can work with.</p>
        </div>
        <Network size={22} strokeWidth={1.5} />
      </div>
      <div className="preview-grid">
        <div><span>Forecast layer</span><strong>Latest + day-ahead</strong></div>
        <div><span>Time horizon</span><strong>Next delivery day</strong></div>
        <div><span>Decision lens</span><strong>Revision + reliability</strong></div>
      </div>
      <div className="preview-footer"><span>Explore the live surface</span><ArrowUpRight size={15} /></div>
    </div>
  )
}

export default function OverviewPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="content-frame landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow"><span className="signal-dot teal" />UK energy markets / wind intelligence</p>
            <h1>Forecast the wind.<br /><em>Move with the signal.</em></h1>
            <p className="landing-lede">
              WindTrader turns national wind generation forecasts into a clearer view of what changed, what matters, and how much confidence to carry into the next procurement decision.
            </p>
            <div className="landing-actions">
              <Link to="/forecast" className="landing-button">Explore the forecast <ArrowRight size={16} /></Link>
              <Link to="/methodology" className="landing-text-link">How it works <ArrowUpRight size={15} /></Link>
            </div>
            <p className="landing-footnote">Built on Elexon BMRS data · January 2026 analysis context</p>
          </div>
          <div className="landing-hero-visual">
            <EnergySignalArt />
            <SignalPreview />
          </div>
        </div>
        <div className="hero-bottom-line content-frame"><span>Forecast</span><span>Interpret</span><span>Decide</span><span className="hero-scroll-cue">Scroll to explore <ArrowRight size={14} /></span></div>
      </section>

      <section className="landing-intro-section">
        <div className="landing-intro content-frame">
          <div className="landing-section-kicker">01 / A clearer decision path</div>
          <div className="landing-intro-body">
            <h2>From a forecast<br /><em>to a decision.</em></h2>
            <p>
              The useful question is rarely just “what is the forecast?” WindTrader brings the outlook, its revisions, and its historical behaviour into one considered workspace—so the signal is easier to read before the market moves.
            </p>
          </div>
        </div>
      </section>

      <section className="workflow-section content-frame">
        {workflows.map((workflow) => (
          <article className="workflow-item" key={workflow.number}>
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
          <div className="surfaces-heading">
            <div>
              <div className="landing-section-kicker">02 / Three views, one decision</div>
              <h2>Everything you need<br /><em>to read the next move.</em></h2>
            </div>
            <p>Forecast detail, historical accuracy, and traceable methodology stay close enough to support the same purchase decision.</p>
          </div>
          <div className="surface-list">
            {surfaces.map((surface) => (
              <Link className="surface-row" to={surface.link} key={surface.number}>
                <span className="surface-number">{surface.number}</span>
                <span className="surface-copy"><span>{surface.eyebrow}</span><strong>{surface.title}</strong></span>
                <span className="surface-description">{surface.text}</span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-close content-frame">
        <div className="close-mark"><Gauge size={26} strokeWidth={1.25} /><Wind size={18} strokeWidth={1.25} /></div>
        <p className="landing-section-kicker">03 / The next decision</p>
        <h2>Better decisions start<br /><em>with a better signal.</em></h2>
        <p>Open the forecast workspace to explore the selected delivery day and see what the latest data is telling you.</p>
        <Link to="/forecast" className="landing-button landing-button-dark">Open Forecast Explorer <ArrowRight size={16} /></Link>
      </section>

      <footer className="landing-footer">
        <div className="content-frame landing-footer-inner">
          <div className="footer-brand"><span className="brand-mark"><span className="footer-zap">↯</span></span><span>WindTrader</span></div>
          <p>Elexon BMRS · National wind generation · January 2026</p>
          <div className="footer-links"><Link to="/forecast">Forecast Explorer</Link><Link to="/accuracy">Accuracy Analysis</Link><Link to="/methodology">Methodology</Link></div>
        </div>
      </footer>
    </main>
  )
}
