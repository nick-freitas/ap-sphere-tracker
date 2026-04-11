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

  // A player is "locked" if they have no missing checks in qualifying spheres (0 through lastQualifyingIdx)
  // For locked players, find the next sphere they have checks in
  const lockedPlayers = useMemo(() => {
    if (!sphereResults || lastQualifyingIdx < 0) return {}
    const result = {}
    if (spoilerData) {
      for (const player of spoilerData.players) {
        let hasMissing = false
        for (let i = 0; i <= lastQualifyingIdx && i < sphereResults.length; i++) {
          for (const check of sphereResults[i].missingChecks) {
            if (check.player === player.name) {
              hasMissing = true
              break
            }
          }
          if (hasMissing) break
        }
        if (!hasMissing) {
          // Find next sphere with checks for this player
          let nextSphere = null
          for (let i = lastQualifyingIdx + 1; i < sphereResults.length; i++) {
            for (const check of sphereResults[i].missingChecks) {
              if (check.player === player.name) {
                nextSphere = sphereResults[i].sphereNumber
                break
              }
            }
            if (nextSphere !== null) break
          }
          result[player.name] = nextSphere
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
            {s.name in lockedPlayers && (
              <span className="ps-lock" title="No remaining checks in current spheres - potentially locked/BK'd">
                {'\uD83D\uDD12'}
                {lockedPlayers[s.name] !== null && <span className="ps-next-sphere">S{lockedPlayers[s.name]}</span>}
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
