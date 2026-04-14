import trackerMeta from '../tracker-meta.json'
import { parseTrackerTimestamp } from '../parsers/trackerParser'
import './Header.css'

function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '(just now)'
  if (diffMin < 60) return `(${diffMin} minute${diffMin === 1 ? '' : 's'} ago)`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `(${diffHr} hour${diffHr === 1 ? '' : 's'} ago)`
  const diffDay = Math.floor(diffHr / 24)
  return `(${diffDay} day${diffDay === 1 ? '' : 's'} ago)`
}

export default function Header({
  threshold,
  onThresholdChange,
  extended,
  onExtendedChange,
  showSpoilers,
  onSpoilerToggle,
  darkMode,
  onDarkModeToggle,
  lastCheckTime,
  currentSphere,
  totalSpheres,
}) {
  const lastUpdated = trackerMeta?.fetchedAt
    ? new Date(trackerMeta.fetchedAt).toLocaleString()
    : null
  const lastUpdatedAgo = trackerMeta?.fetchedAt ? timeAgo(trackerMeta.fetchedAt) : null

  const lastCheckDate = parseTrackerTimestamp(lastCheckTime)
  const lastCheckFormatted = lastCheckDate ? lastCheckDate.toLocaleString() : null
  const lastCheckAgo = lastCheckDate ? timeAgo(lastCheckDate) : null

  return (
    <header className="header">
      <div className="brand">
        <h1 className="header-title">AP Sphere Tracker</h1>
        {totalSpheres > 0 && (
          <div className="header-subtitle">
            Current Sphere: {currentSphere} of {totalSpheres} ({Math.round((currentSphere / totalSpheres) * 100)}%)
          </div>
        )}

        {(lastUpdated || lastCheckFormatted) && (
          <div className="brand-sub">
            {lastUpdated && <span className="last-updated">Log updated {lastUpdated} {lastUpdatedAgo}</span>}
            {lastUpdated && lastCheckFormatted && <span className="last-updated"> | </span>}
            {lastCheckFormatted && <span className="last-updated">Last Check {lastCheckFormatted} {lastCheckAgo}</span>}
          </div>
        )}
      </div>

      <button
        className="theme-toggle tooltip-host"
        onClick={onDarkModeToggle}
        data-tip={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{ '--tooltip-width': '160px' }}
      >
        {darkMode ? '\u2600' : '\u263D'}
      </button>

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
