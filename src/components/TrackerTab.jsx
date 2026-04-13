import { useEffect, useMemo } from 'react'
import { buildPlayerTracker } from '../engine/playerTracker'
import './TrackerTab.css'

function PlayerSidebar({ players, playerColors, selectedPlayer, onSelectedPlayerChange, allPlayerProgress }) {
  const progressByName = useMemo(() => {
    const map = {}
    for (const p of allPlayerProgress) map[p.name] = p.percent
    return map
  }, [allPlayerProgress])

  return (
    <div className="tracker-sidebar">
      {players.map((p) => {
        const isActive = p.name === selectedPlayer
        const color = playerColors[p.name]
        return (
          <button
            key={p.slot}
            className={`tracker-sidebar-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectedPlayerChange(p.name)}
            style={isActive ? { borderLeftColor: color } : undefined}
          >
            <span className="tracker-sidebar-dot" style={{ background: color }} />
            <span className="tracker-sidebar-name" style={{ color }}>{p.name}</span>
            <span className="tracker-sidebar-pct">{progressByName[p.name] ?? 0}%</span>
          </button>
        )
      })}
    </div>
  )
}

export default function TrackerTab({
  spoilerData,
  checkedLocations,
  prioritySet,
  playerColors,
  selectedPlayer,
  onSelectedPlayerChange,
  searchQuery, // eslint-disable-line no-unused-vars
  onSearchQueryChange, // eslint-disable-line no-unused-vars
  hideFound, // eslint-disable-line no-unused-vars
  onHideFoundChange, // eslint-disable-line no-unused-vars
}) {
  // Default / recover selectedPlayer when the spoiler changes.
  useEffect(() => {
    if (!spoilerData) return
    const names = spoilerData.players.map((p) => p.name)
    if (!selectedPlayer || !names.includes(selectedPlayer)) {
      onSelectedPlayerChange(names[0] || null)
    }
  }, [spoilerData]) // eslint-disable-line react-hooks/exhaustive-deps

  const allPlayerProgress = useMemo(() => {
    if (!spoilerData) return []
    return spoilerData.players.map((p) => {
      const locations = spoilerData.playerLocations.get(p.name) || []
      const checks = checkedLocations.get(p.name) || new Set()
      const total = locations.length
      const found = locations.filter((l) => checks.has(l.location)).length
      const percent = total === 0 ? 0 : Math.round((found / total) * 100)
      return { name: p.name, found, total, percent }
    })
  }, [spoilerData, checkedLocations])

  const currentPlayerTracker = useMemo(() => {
    if (!spoilerData || !selectedPlayer) return { rows: [], totalCount: 0, foundCount: 0 }
    return buildPlayerTracker(selectedPlayer, spoilerData, checkedLocations, prioritySet)
  }, [spoilerData, selectedPlayer, checkedLocations, prioritySet])

  if (!spoilerData) return null

  return (
    <div className="tracker-tab">
      <PlayerSidebar
        players={spoilerData.players}
        playerColors={playerColors}
        selectedPlayer={selectedPlayer}
        onSelectedPlayerChange={onSelectedPlayerChange}
        allPlayerProgress={allPlayerProgress}
      />
      <div className="tracker-main">
        <p className="tracker-placeholder">
          Selected: {selectedPlayer || '(none)'} — {currentPlayerTracker.foundCount}/{currentPlayerTracker.totalCount} locations found
        </p>
      </div>
    </div>
  )
}
