import { useMemo } from 'react'
import MissingChecksTable from './MissingChecksTable'
import './SphereCard.css'

export default function SphereCard({
  result,
  threshold,
  playerColors,
  hiddenPlayers,
  isExtended,
  sphereEntries,
  checkedLocations,
  playerLastSphere,
}) {
  const { sphereNumber, totalChecks, completedChecks, completionPercent, missingChecks } = result
  const isComplete = completionPercent === 100
  const meetsThreshold = completionPercent >= threshold

  const playerBreakdown = useMemo(() => {
    if (!sphereEntries || sphereEntries.length === 0) return []
    const totals = {}
    const checked = {}
    for (const entry of sphereEntries) {
      const owner = entry.locationOwner
      totals[owner] = (totals[owner] || 0) + 1
      const playerChecks = checkedLocations?.get(owner)
      if (playerChecks && playerChecks.has(entry.location)) {
        checked[owner] = (checked[owner] || 0) + 1
      }
    }
    return Object.keys(totals)
      .map((name) => {
        const total = totals[name]
        const done = checked[name] || 0
        const pct = Math.round((done / total) * 100)
        return { name, total, done, pct }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [sphereEntries, checkedLocations])

  if (totalChecks === 0) return null

  return (
    <div className={`sphere-card ${isComplete ? 'complete' : ''} ${meetsThreshold ? 'expanded' : 'dimmed'} ${isExtended ? 'extended' : ''}`}>
      <div className="sphere-header">
        <div className="sphere-label">
          <span className="sphere-num">{sphereNumber}</span>
          {isComplete && <span className="check-icon">&#10003;</span>}
          <span>Sphere {sphereNumber}</span>
          {isExtended && <span className="extended-badge">Extended</span>}
        </div>
        <div className="sphere-progress-container">
          <div className="sphere-progress-bar">
            <div
              className="sphere-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="sphere-progress-text">
            {completedChecks}/{totalChecks} ({completionPercent}%)
          </span>
        </div>
      </div>

      {playerBreakdown.length > 0 && (
        <div className="sphere-players">
          {playerBreakdown.map((p) => (
            <div className="sp-row" key={p.name}>
              <span className="sp-dot" style={{ background: playerColors[p.name] }} />
              <span className="sp-name" style={{ color: playerColors[p.name] }}>
                {p.name}
                {playerLastSphere?.[p.name] === sphereNumber && <span className="sp-star" title="Last sphere for this player">&#9733;</span>}
              </span>
              <span className="sp-count">{p.done}/{p.total}</span>
              <div className="sp-bar">
                <div className="sp-fill" style={{ width: `${p.pct}%`, background: playerColors[p.name] }} />
              </div>
              <span className="sp-pct">{p.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {meetsThreshold && !isComplete && (
        <div className="sphere-body">
          <MissingChecksTable
            missingChecks={missingChecks}
            playerColors={playerColors}
            hiddenPlayers={hiddenPlayers}
          />
        </div>
      )}
    </div>
  )
}
