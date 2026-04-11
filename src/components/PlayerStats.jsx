import { useMemo } from 'react'
import './PlayerStats.css'

export default function PlayerStats({ spoilerData, checkedLocations, playerColors }) {
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

  if (stats.length === 0) return null

  return (
    <div className="player-stats">
      {stats.map((s) => (
        <div className="ps-row" key={s.name}>
          <div className="ps-info">
            <span className="ps-dot" style={{ background: playerColors[s.name] }} />
            <span className="ps-name">{s.name}</span>
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
    </div>
  )
}
