import { useMemo, useState } from 'react'
import MissingChecksTable from './MissingChecksTable'
import { parseTrackerTimestamp } from '../parsers/trackerParser'
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
  isGoalSphere,
  spheresBehind,
  capInfo,
  sphereEntries,
  checkedLocations,
  playerLastSphere,
  showSpoilers,
  displayThreshold,
  completionTimestamp,
}) {
  const { sphereNumber, totalChecks, completedChecks, completionPercent, missingChecks } = result
  // Treat empty goal spheres (0 surviving entries after the event filter,
  // e.g. Andrew's sphere 37 where `Ganon → Triforce` was the only entry) as
  // "not complete" so they don't render a misleading ✓ completion badge or
  // `complete` styling. completionPercent comes through as 100 for empty
  // spheres per the analyzer, which is fine for regular empty spheres but
  // wrong for goal spheres where completion depends on game state we can't
  // observe from the tracker log.
  const isEffectivelyEmpty = totalChecks === 0
  const isComplete = !isEffectivelyEmpty && completionPercent === 100
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

  // Players whose very-last playthrough entry is in THIS sphere. For each
  // of them we want a row with a star — even if they have no surviving real
  // entries (in which case playerBreakdown won't include them and we render
  // a synthetic goal-only row below).
  const goalOwnersHere = useMemo(() => {
    if (!playerLastSphere || !isGoalSphere) return []
    return Object.keys(playerLastSphere).filter(
      (p) => playerLastSphere[p] === sphereNumber,
    )
  }, [playerLastSphere, isGoalSphere, sphereNumber])

  // Hide spheres with no real checks UNLESS they're a goal sphere — in
  // which case we still want to render the card (minus the progress bar)
  // so the goal is visible on the sphere board.
  if (totalChecks === 0 && !isGoalSphere) return null

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
          {isComplete && (() => {
            const completionDate = parseTrackerTimestamp(completionTimestamp)
            const tip = completionDate
              ? `Completed ${completionDate.toLocaleString()}`
              : 'Completed'
            return <span className="check-icon" data-tip={tip}>&#10003;</span>
          })()}
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
          <span>{isGoalSphere ? 'Goal Sphere' : 'Sphere'} {sphereNumber}</span>
          {isCurrent && (
            <span className={`current-badge ${capInfo ? 'current-badge-capped' : ''}`}>Current</span>
          )}
          {isExtended && <span className="extended-badge">Upcoming</span>}
        </div>
        {!isEffectivelyEmpty && (
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
        )}
      </div>

      {(playerBreakdown.length > 0 || goalOwnersHere.length > 0) && (
        <div className="sphere-players">
          {playerBreakdown.filter((p) => !hiddenPlayers || !hiddenPlayers.has(p.name)).map((p) => (
            <div className="sp-row" key={p.name}>
              <span className="sp-dot" style={{ background: playerColors[p.name] }} />
              <span className="sp-name" style={{ color: playerColors[p.name] }}>
                {p.name}
                {playerLastSphere?.[p.name] === sphereNumber && (
                  <span
                    className="sp-star tooltip-host"
                    data-tip="Last sphere for this player"
                    style={{ '--tooltip-width': '180px' }}
                  >&#9733;</span>
                )}
              </span>
              <span className="sp-count">{p.done}/{p.total}</span>
              <div className="sp-bar">
                <div className="sp-fill" style={{ width: `${p.pct}%`, background: playerColors[p.name] }} />
              </div>
              <span className="sp-pct">{p.pct}%</span>
            </div>
          ))}
          {/* Goal-only rows: players whose very-last playthrough entry is
              this sphere but who have no surviving real entries here (so
              playerBreakdown doesn't already include them). Used for empty
              goal spheres like Andrew's sphere 37. */}
          {goalOwnersHere
            .filter((name) => !playerBreakdown.some((p) => p.name === name))
            .filter((name) => !hiddenPlayers || !hiddenPlayers.has(name))
            .map((name) => (
              <div className="sp-row" key={`goal-${name}`}>
                <span className="sp-dot" style={{ background: playerColors[name] }} />
                <span className="sp-name" style={{ color: playerColors[name] }}>
                  {name}
                  <span
                    className="sp-star tooltip-host"
                    data-tip="Last sphere for this player"
                    style={{ '--tooltip-width': '180px' }}
                  >&#9733;</span>
                </span>
              </div>
            ))}
          {displayThreshold != null && playerBreakdown.length > 0 && (() => {
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
