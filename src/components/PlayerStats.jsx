import { useMemo } from 'react'
import './PlayerStats.css'

export default function PlayerStats({ spoilerData, checkedLocations, playerColors, hiddenPlayers, sphereResults, lastQualifyingIdx }) {
  const stats = useMemo(() => {
    if (!spoilerData) return []

    // Count total locations per player across all spheres (as locationOwner)
    const totals = {}
    const checked = {}

    for (const sphere of spoilerData.spheres) {
      for (const entry of sphere.entries) {
        const owner = entry.locationOwner
        totals[owner] = (totals[owner] || 0) + 1

        const playerChecks = checkedLocations.get(owner)
        if (playerChecks && playerChecks.has(entry.location)) {
          checked[owner] = (checked[owner] || 0) + 1
        }
      }
    }

    const result = spoilerData.players.map((p) => {
      const total = totals[p.name] || 0
      const done = checked[p.name] || 0
      const pct = total === 0 ? 100 : Math.round((done / total) * 100)
      return { name: p.name, game: p.game, total, done, pct }
    })

    // Sort by highest percentage when tracker data is available
    if (checkedLocations.size > 0) {
      result.sort((a, b) => b.pct - a.pct)
    }

    return result
  }, [spoilerData, checkedLocations])

  // For each player, find their earliest sphere with unchecked items
  // Also determine if they're "locked" (no missing checks in qualifying spheres)
  const playerInfo = useMemo(() => {
    if (!sphereResults || sphereResults.length === 0) return {}
    const result = {}
    if (spoilerData) {
      for (const player of spoilerData.players) {
        let earliestUnchecked = null
        let hasCheckInQualifying = false

        for (let i = 0; i < sphereResults.length; i++) {
          for (const check of sphereResults[i].missingChecks) {
            if (check.player === player.name) {
              if (earliestUnchecked === null) {
                earliestUnchecked = sphereResults[i].sphereNumber
              }
              if (lastQualifyingIdx >= 0 && i <= lastQualifyingIdx) {
                hasCheckInQualifying = true
              }
              break
            }
          }
        }

        result[player.name] = {
          earliestUnchecked,
          locked: lastQualifyingIdx >= 0 && !hasCheckInQualifying,
        }
      }
    }
    return result
  }, [spoilerData, sphereResults, lastQualifyingIdx])

  const visible = stats.filter((s) => !hiddenPlayers || !hiddenPlayers.has(s.name))

  const totalDone = visible.reduce((sum, s) => sum + s.done, 0)
  const totalAll = stats.reduce((sum, s) => sum + s.total, 0)
  const totalPct = totalAll === 0 ? 100 : Math.round((totalDone / totalAll) * 100)

  if (stats.length === 0) return null

  return (
    <div className="player-stats">
      {visible.map((s) => (
        <div className="ps-row" key={s.name}>
          <div className="ps-info">
            <span className="ps-dot" style={{ background: playerColors[s.name] }} />
            <span className="ps-name">{s.name}</span>
            {playerInfo[s.name]?.locked && (() => {
              const currentSphereNum = lastQualifyingIdx >= 0 && sphereResults[lastQualifyingIdx]
                ? sphereResults[lastQualifyingIdx].sphereNumber : 0
              const earliest = playerInfo[s.name].earliestUnchecked
              const isNextSphere = earliest === currentSphereNum + 1
              const spheresAway = earliest != null ? earliest - currentSphereNum : null
              const circleClass = isNextSphere ? 'ps-lock-circle yellow' : 'ps-lock-circle red'
              const tooltip = isNextSphere
                ? `Possibly locked — next progression checks are in Sphere ${earliest} (next sphere). These checks may or may not be reachable yet. Non-progression checks may still be available in-game, keep playing!`
                : `Likely locked — next progression checks are ${spheresAway} sphere${spheresAway > 1 ? 's' : ''} away (Sphere ${earliest}). Non-progression checks may still be available in-game, keep playing!`
              return (
                <span className={circleClass} data-tip={tooltip}>
                  {'\uD83D\uDD12'}{earliest != null ? ` S${earliest}` : ''}
                </span>
              )
            })()}
            {!playerInfo[s.name]?.locked && playerInfo[s.name]?.earliestUnchecked != null && (
              <span className="ps-earliest" title="Earliest sphere with unchecked items">
                S{playerInfo[s.name].earliestUnchecked}
              </span>
            )}
            <span className="ps-count">{s.done}/{s.total}</span>
          </div>
          <div className="ps-bar">
            <div
              className="ps-fill"
              style={{
                width: `${s.pct}%`,
                background: playerColors[s.name],
              }}
            />
          </div>
          <span className="ps-pct">{s.pct}%</span>
        </div>
      ))}
      <div className="ps-row ps-total">
        <div className="ps-info">
          <span className="ps-dot" style={{ background: 'var(--color-moss)' }} />
          <span className="ps-name">Total</span>
          <span className="ps-count">{totalDone}/{totalAll}</span>
        </div>
        <div className="ps-bar">
          <div
            className="ps-fill"
            style={{
              width: `${totalPct}%`,
              background: 'var(--color-moss)',
              opacity: 1,
            }}
          />
        </div>
        <span className="ps-pct">{totalPct}%</span>
      </div>
    </div>
  )
}
