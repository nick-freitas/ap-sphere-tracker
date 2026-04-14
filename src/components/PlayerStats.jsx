import { useMemo } from 'react'
import './PlayerStats.css'

export default function PlayerStats({
  spoilerData,
  checkedLocations,
  playerColors,
  hiddenPlayers,
  sphereResults,
  lastQualifyingIdx,
  playerCompletionTime,
  playerLastSphere,
}) {
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

    // Sort by highest percentage when tracker data is available. Among
    // 100%-complete players, rank them by the moment they finished — the
    // earliest to collect their final check appears first. This is derived
    // from the last "sent" event per player in the tracker log (via
    // playerCompletionTime). If a player has no tracker timestamp (e.g. all
    // their checks were precollected), fall back to their lowest max sphere
    // as a secondary tiebreaker so they still land in a deterministic spot.
    if (checkedLocations.size > 0) {
      result.sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct
        if (a.pct !== 100) return 0
        const aTime = playerCompletionTime?.[a.name]
        const bTime = playerCompletionTime?.[b.name]
        if (aTime && bTime) return aTime < bTime ? -1 : aTime > bTime ? 1 : 0
        if (aTime && !bTime) return -1
        if (!aTime && bTime) return 1
        const aMax = playerLastSphere?.[a.name] ?? Number.POSITIVE_INFINITY
        const bMax = playerLastSphere?.[b.name] ?? Number.POSITIVE_INFINITY
        return aMax - bMax
      })
    }

    return result
  }, [spoilerData, checkedLocations, playerCompletionTime, playerLastSphere])

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
              const earliest = playerInfo[s.name].earliestUnchecked
              if (earliest == null) {
                const rawTimestamp = playerCompletionTime?.[s.name]
                let completedTooltip = `${s.name} completed ${s.game}`
                if (rawTimestamp) {
                  const date = new Date(rawTimestamp.replace(',', '.'))
                  if (!Number.isNaN(date.getTime())) {
                    completedTooltip = `${s.name} completed ${s.game} on ${date.toLocaleString()}`
                  }
                }
                return (
                  <span className="ps-lock-circle green" data-tip={completedTooltip}>
                    {'\u2B50'}
                  </span>
                )
              }
              const currentSphereNum = lastQualifyingIdx >= 0 && sphereResults[lastQualifyingIdx]
                ? sphereResults[lastQualifyingIdx].sphereNumber : 0
              const isNextSphere = earliest === currentSphereNum + 1
              const spheresAway = earliest - currentSphereNum
              const circleClass = isNextSphere ? 'ps-lock-circle yellow' : 'ps-lock-circle red'
              const tooltip = isNextSphere
                ? `Possibly locked. Your next progression check is in the next sphere (Sphere ${earliest}), which might not be reachable yet. Non-progression checks may still be available. Keep playing!`
                : `Likely locked. Your next progression checks are ${spheresAway} sphere${spheresAway > 1 ? 's' : ''} away (Sphere ${earliest}). Non-progression checks may still be available. Keep playing!`
              return (
                <span className={circleClass} data-tip={tooltip}>
                  {'\uD83D\uDD12'} S{earliest}
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
