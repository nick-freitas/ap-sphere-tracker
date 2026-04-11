import trackerMeta from '../tracker-meta.json'
import './Header.css'

export default function Header({
  threshold,
  onThresholdChange,
  extended,
  onExtendedChange,
  showSpoilers,
  onSpoilerToggle,
  darkMode,
  onDarkModeToggle,
}) {
  const lastUpdated = trackerMeta?.fetchedAt
    ? new Date(trackerMeta.fetchedAt).toLocaleString()
    : null

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-top">
          <h1 className="header-title">AP Sphere Tracker</h1>
          <button className="theme-toggle" onClick={onDarkModeToggle} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? '\u2600' : '\u263D'}
          </button>
        </div>
        {lastUpdated && (
          <div className="brand-sub">
            <span className="last-updated">Log updated {lastUpdated}</span>
          </div>
        )}
      </div>

      <div className="header-controls">
        <div className="threshold-control">
          <label htmlFor="threshold-slider">Threshold <span className="info-icon" data-tip="Show missing checks for all spheres up to the highest sphere that meets this completion percentage">?</span></label>
          <input
            id="threshold-slider"
            type="range"
            min="60"
            max="100"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
          />
          <span className="threshold-value">{threshold}%</span>
        </div>

        <div className="toggle-control">
          <label>Upcoming Sphere <span className="info-icon" data-tip="Show one additional sphere beyond the last qualifying sphere">?</span></label>
          <button
            type="button"
            className={`toggle-btn ${extended ? 'on' : ''}`}
            onClick={() => onExtendedChange(!extended)}
            aria-pressed={extended}
          />
        </div>

        <div className="toggle-control">
          <label>Item Owner Spoiler <span className="info-icon" data-tip="Reveal which player receives the item at each missing check location">?</span></label>
          <button
            type="button"
            className={`toggle-btn ${showSpoilers ? 'on danger' : ''}`}
            onClick={onSpoilerToggle}
            aria-pressed={showSpoilers}
          />
        </div>
      </div>
    </header>
  )
}
