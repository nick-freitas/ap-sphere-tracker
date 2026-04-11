import trackerMeta from '../tracker-meta.json'
import './Header.css'

export default function Header({
  threshold,
  onThresholdChange,
  extended,
  onExtendedChange,
}) {
  const lastUpdated = trackerMeta?.fetchedAt
    ? new Date(trackerMeta.fetchedAt).toLocaleString()
    : null

  return (
    <header className="header">
      <div className="brand">
        <h1 className="header-title">Sphere Analyzer</h1>
        <div className="brand-sub">
          Archipelago Multiworld Progression
          {lastUpdated && <span className="last-updated"> · Log updated {lastUpdated}</span>}
        </div>
      </div>

      <div className="header-controls">
        <div className="threshold-control">
          <label htmlFor="threshold-slider">Threshold</label>
          <input
            id="threshold-slider"
            type="range"
            min="50"
            max="100"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
          />
          <span className="threshold-value">{threshold}%</span>
        </div>

        <div className="toggle-control">
          <label>Extended</label>
          <button
            type="button"
            className={`toggle-btn ${extended ? 'on' : ''}`}
            onClick={() => onExtendedChange(!extended)}
            aria-pressed={extended}
          />
        </div>
      </div>
    </header>
  )
}
