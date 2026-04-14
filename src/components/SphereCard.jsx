import { useMemo, useState } from 'react'
import MissingChecksTable from './MissingChecksTable'
import './SphereCard.css'

function formatIncompleteList(numbers) {
  if (!numbers || numbers.length === 0) return ''
  if (numbers.length === 1) return `${numbers[0]}`
  if (numbers.length === 2) return `${numbers[0]} and ${numbers[1]}`
  return `${numbers.slice(0, -1).join(', ')}, and ${numbers[numbers.length - 1]}`
}

export default function SphereCard({
  result,
  threshold,
  playerColors,
  hiddenPlayers,
  isExtended,
  isCurrent,
  spheresBehind,
  capInfo,
  sphereEntries,
  checkedLocations,
  playerLastSphere,
  showSpoilers,
  displayThreshold,
}) {
  const { sphereNumber, totalChecks, completedChecks, completionPercent, missingChecks } = result
  const isComplete = completionPercent === 100
  const meetsThreshold = completionPercent >= threshold
  const isFallingBehind = spheresBehind >= 4 && !isComplete
  const [showCompleted, setShowCompleted] = useState(false)

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

  const completedItems = useMemo(() => {
    if (!sphereEntries || !checkedLocations || checkedLocations.size === 0) return []
    return sphereEntries.filter((entry) => {
      const playerChecks = checkedLocations.get(entry.locationOwner)
      return playerChecks && playerChecks.has(entry.location)
    })
  }, [sphereEntries, checkedLocations])

  if (totalChecks === 0) return null

  const cardClasses = [
    'sphere-card',
    isComplete ? 'complete' : '',
    meetsThreshold ? 'expanded' : 'dimmed',
    isExtended ? 'extended' : '',
    isCurrent ? 'current' : '',
    isFallingBehind ? 'falling-behind' : '',
    capInfo ? 'current-capped' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClasses}>
      <div className="sphere-header">
        <div className="sphere-label">
          <span className="sphere-num">{sphereNumber}</span>
          {isComplete && <span className="check-icon">&#10003;</span>}
          {isFallingBehind && (
            <span
              className="warning-icon"
              data-tip={`${spheresBehind} spheres behind current and not complete`}
            >&#9888;</span>
          )}
          {capInfo && (
            <span
              className="caution-icon"
              data-tip={
                `This sphere is marked as current because Spheres ${formatIncompleteList(capInfo.incompleteNumbers)} `
                + `are incomplete. The actual current sphere would be Sphere ${capInfo.thresholdSphereNumber}. `
                + `Complete prior incomplete spheres to progress.`
              }
            >&#9888;</span>
          )}
          <span>Sphere {sphereNumber}</span>
          {isCurrent && (
            <span className={`current-badge ${capInfo ? 'current-badge-capped' : ''}`}>Current</span>
          )}
          {isExtended && <span className="extended-badge">Upcoming</span>}
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
          {playerBreakdown.filter((p) => !hiddenPlayers || !hiddenPlayers.has(p.name)).map((p) => (
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
          {displayThreshold != null && (() => {
            const playersAbove = playerBreakdown.filter((p) => p.pct >= displayThreshold).length
            const totalPlayers = playerBreakdown.length
            return (
              <div className="sp-summary">
                {playersAbove} of {totalPlayers} players at or above {displayThreshold}%
              </div>
            )
          })()}
        </div>
      )}

      {meetsThreshold && !isComplete && (
        <div className="sphere-body">
          <MissingChecksTable
            missingChecks={missingChecks}
            playerColors={playerColors}
            hiddenPlayers={hiddenPlayers}
            showSpoilers={showSpoilers}
          />
        </div>
      )}

      {completedItems.length > 0 && (
        <div className="completed-section">
          <button
            className="completed-toggle"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <span className="completed-arrow">{showCompleted ? '\u25BC' : '\u25B6'}</span>
            Completed ({completedItems.length})
          </button>
          {showCompleted && (
            <div className="completed-body">
              <table className="missing-checks-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Location</th>
                    <th>Item</th>
                    <th>Sent To</th>
                  </tr>
                </thead>
                <tbody>
                  {completedItems.map((entry) => (
                    <tr key={`${entry.locationOwner}-${entry.location}`}>
                      <td style={{ color: playerColors[entry.locationOwner], fontWeight: 600 }}>
                        {entry.locationOwner}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                        {entry.location}
                      </td>
                      <td style={{ color: 'var(--color-moss)', fontWeight: 500 }}>
                        {entry.item}
                      </td>
                      <td style={{ color: playerColors[entry.itemOwner], fontWeight: 600 }}>
                        {entry.itemOwner}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
