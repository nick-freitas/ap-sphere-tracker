import { useMemo } from 'react'
import './PlayerSidebar.css'

export default function PlayerSidebar({
  players,
  playerColors,
  selectedPlayer,
  onSelectedPlayerChange,
  allPlayerProgress,
  showPercent = true,
}) {
  const progressByName = useMemo(() => {
    if (!showPercent || !allPlayerProgress) return {}
    const map = {}
    for (const p of allPlayerProgress) map[p.name] = p.percent
    return map
  }, [allPlayerProgress, showPercent])

  return (
    <div className="player-sidebar">
      {players.map((p) => {
        const isActive = p.name === selectedPlayer
        const color = playerColors[p.name]
        return (
          <button
            key={p.slot}
            type="button"
            className={`player-sidebar-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectedPlayerChange(p.name)}
          >
            <span className="player-sidebar-dot" style={{ background: color }} />
            <span className="player-sidebar-name" style={{ color }}>{p.name}</span>
            {showPercent && (
              <span className="player-sidebar-pct">{progressByName[p.name] ?? 0}%</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
