import { useEffect, useMemo } from 'react'
import { buildPlayerTracker } from '../engine/playerTracker'
import './TrackerTab.css'

function PlayerProgressList({ rows, selectedPlayer, playerColors, onSelectedPlayerChange }) {
  return (
    <div className="tracker-progress-list">
      {rows.map((row) => {
        const isActive = row.name === selectedPlayer
        const color = playerColors[row.name]
        return (
          <button
            key={row.name}
            type="button"
            className={`tracker-progress-row ${isActive ? 'active' : 'muted'}`}
            onClick={() => onSelectedPlayerChange(row.name)}
          >
            <span
              className="tracker-progress-name"
              style={{ color: isActive ? color : 'var(--color-text-muted)' }}
            >
              {row.name}
            </span>
            <div className="tracker-progress-bar">
              <div
                className="tracker-progress-fill"
                style={{
                  width: `${row.percent}%`,
                  background: isActive ? color : 'var(--color-text-muted)',
                }}
              />
            </div>
            <span className="tracker-progress-count">
              {row.found}/{row.total} ({row.percent}%)
            </span>
          </button>
        )
      })}
    </div>
  )
}

function LocationRow({ row, playerColors }) {
  return (
    <tr className={row.found ? 'tracker-row found' : 'tracker-row'}>
      <td className="tracker-cell-check">
        <span className={`tracker-check ${row.found ? 'filled' : ''}`} aria-label={row.found ? 'Found' : 'Not found'}>
          {row.found ? '\u2713' : ''}
        </span>
      </td>
      <td className="tracker-cell-location">{row.location}</td>
      <td className="tracker-cell-item">{row.found ? row.item : ''}</td>
      <td
        className="tracker-cell-owner"
        style={row.found ? { color: playerColors[row.itemOwner] || 'var(--color-text)', fontWeight: 600 } : undefined}
      >
        {row.found ? row.itemOwner : ''}
      </td>
    </tr>
  )
}

function LocationTable({ rows, playerColors }) {
  const priorityRows = rows.filter((r) => r.priority)
  const remainingRows = rows.filter((r) => !r.priority)

  return (
    <div className="tracker-table-wrap">
      {priorityRows.length > 0 && (
        <>
          <h3 className="tracker-section-heading">— Priority —</h3>
          <table className="tracker-table">
            <tbody>
              {priorityRows.map((row) => (
                <LocationRow key={`p-${row.location}`} row={row} playerColors={playerColors} />
              ))}
            </tbody>
          </table>
        </>
      )}
      {remainingRows.length > 0 && (
        <>
          <h3 className="tracker-section-heading">— Remaining —</h3>
          <table className="tracker-table">
            <tbody>
              {remainingRows.map((row) => (
                <LocationRow key={`r-${row.location}`} row={row} playerColors={playerColors} />
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

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
        <PlayerProgressList
          rows={allPlayerProgress}
          selectedPlayer={selectedPlayer}
          playerColors={playerColors}
          onSelectedPlayerChange={onSelectedPlayerChange}
        />
        {currentPlayerTracker.rows.length === 0 ? (
          <p className="tracker-placeholder">No locations for this player.</p>
        ) : (
          <LocationTable rows={currentPlayerTracker.rows} playerColors={playerColors} />
        )}
      </div>
    </div>
  )
}
