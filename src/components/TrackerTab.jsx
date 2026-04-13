import { useEffect, useMemo, useState } from 'react'
import { buildPlayerTracker, buildPlayerHints } from '../engine/playerTracker'
import './TrackerTab.css'

function PlayerProgressList({ rows, selectedPlayer, playerColors, onSelectedPlayerChange }) {
  const totalFound = rows.reduce((sum, r) => sum + r.found, 0)
  const totalAll = rows.reduce((sum, r) => sum + r.total, 0)
  const totalPercent = totalAll === 0 ? 0 : Math.round((totalFound / totalAll) * 100)

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
      {rows.length > 0 && (
        <div className="tracker-progress-row tracker-progress-total">
          <span className="tracker-progress-name">Total</span>
          <div className="tracker-progress-bar">
            <div
              className="tracker-progress-fill"
              style={{ width: `${totalPercent}%`, background: 'var(--color-moss)' }}
            />
          </div>
          <span className="tracker-progress-count">
            {totalFound}/{totalAll} ({totalPercent}%)
          </span>
        </div>
      )}
    </div>
  )
}

function LocationRow({ row, playerColors, alwaysShowItem }) {
  const showItem = alwaysShowItem || row.found
  return (
    <tr className={row.found ? 'tracker-row found' : 'tracker-row'}>
      <td className="tracker-cell-check">
        <span className={`tracker-check ${row.found ? 'filled' : ''}`} aria-label={row.found ? 'Found' : 'Not found'}>
          {row.found ? '\u2713' : ''}
        </span>
      </td>
      <td className="tracker-cell-location">{row.location}</td>
      <td className="tracker-cell-item">{showItem ? row.item : ''}</td>
      <td
        className="tracker-cell-owner"
        style={showItem ? { color: playerColors[row.itemOwner] || 'var(--color-text)', fontWeight: 600 } : undefined}
      >
        {showItem ? row.itemOwner : ''}
      </td>
    </tr>
  )
}

function LocationTable({ rows, allRows, hintRows, allHintRows, playerColors }) {
  const [hintsCollapsed, setHintsCollapsed] = useState(false)
  const [priorityCollapsed, setPriorityCollapsed] = useState(false)
  const [remainingCollapsed, setRemainingCollapsed] = useState(false)

  const priorityRows = rows.filter((r) => r.priority)
  const remainingRows = rows.filter((r) => !r.priority)

  let priorityTotal = 0
  let priorityFound = 0
  let remainingTotal = 0
  let remainingFound = 0
  for (const row of allRows) {
    if (row.priority) {
      priorityTotal++
      if (row.found) priorityFound++
    } else {
      remainingTotal++
      if (row.found) remainingFound++
    }
  }
  const priorityPercent = priorityTotal === 0 ? 0 : Math.round((priorityFound / priorityTotal) * 100)
  const remainingPercent = remainingTotal === 0 ? 0 : Math.round((remainingFound / remainingTotal) * 100)

  const hintsTotal = allHintRows.length
  const hintsFound = allHintRows.filter((r) => r.found).length
  const hintsPercent = hintsTotal === 0 ? 0 : Math.round((hintsFound / hintsTotal) * 100)

  return (
    <div className="tracker-table-wrap">
      {allHintRows.length > 0 && (
        <>
          <h3 className="tracker-section-heading">
            <button
              type="button"
              className="tracker-section-toggle"
              aria-expanded={!hintsCollapsed}
              onClick={() => setHintsCollapsed((v) => !v)}
            >
              <span className="tracker-caret" aria-hidden="true">{hintsCollapsed ? '▶' : '▼'}</span>
              {' '}Hints — {hintsFound} / {hintsTotal} ({hintsPercent}%)
            </button>
          </h3>
          {!hintsCollapsed && hintRows.length > 0 && (
            <table className="tracker-table">
              <tbody>
                {hintRows.map((row) => (
                  <LocationRow
                    key={`h-${row.location}`}
                    row={row}
                    playerColors={playerColors}
                    alwaysShowItem
                  />
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      {priorityRows.length > 0 && (
        <>
          <h3 className="tracker-section-heading">
            <button
              type="button"
              className="tracker-section-toggle"
              aria-expanded={!priorityCollapsed}
              onClick={() => setPriorityCollapsed((v) => !v)}
            >
              <span className="tracker-caret" aria-hidden="true">{priorityCollapsed ? '▶' : '▼'}</span>
              {' '}Priority — {priorityFound} / {priorityTotal} ({priorityPercent}%)
            </button>
          </h3>
          {!priorityCollapsed && (
            <table className="tracker-table">
              <tbody>
                {priorityRows.map((row) => (
                  <LocationRow key={`p-${row.location}`} row={row} playerColors={playerColors} />
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      {remainingRows.length > 0 && (
        <>
          <h3 className="tracker-section-heading">
            <button
              type="button"
              className="tracker-section-toggle"
              aria-expanded={!remainingCollapsed}
              onClick={() => setRemainingCollapsed((v) => !v)}
            >
              <span className="tracker-caret" aria-hidden="true">{remainingCollapsed ? '▶' : '▼'}</span>
              {' '}Remaining — {remainingFound} / {remainingTotal} ({remainingPercent}%)
            </button>
          </h3>
          {!remainingCollapsed && (
            <table className="tracker-table">
              <tbody>
                {remainingRows.map((row) => (
                  <LocationRow key={`r-${row.location}`} row={row} playerColors={playerColors} />
                ))}
              </tbody>
            </table>
          )}
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
            type="button"
            className={`tracker-sidebar-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectedPlayerChange(p.name)}
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
  hints,
  prioritySet,
  playerColors,
  selectedPlayer,
  onSelectedPlayerChange,
  searchQuery,
  onSearchQueryChange,
  hideFound,
  onHideFoundChange,
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

  const currentPlayerHints = useMemo(() => {
    if (!selectedPlayer) return { rows: [], totalCount: 0, foundCount: 0 }
    return buildPlayerHints(selectedPlayer, hints || [], checkedLocations)
  }, [selectedPlayer, hints, checkedLocations])

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return currentPlayerTracker.rows.filter((row) => {
      if (hideFound && row.found) return false
      if (query && !row.location.toLowerCase().includes(query)) return false
      return true
    })
  }, [currentPlayerTracker.rows, searchQuery, hideFound])

  const filteredHintRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return currentPlayerHints.rows.filter((row) => {
      if (hideFound && row.found) return false
      if (query && !row.location.toLowerCase().includes(query)) return false
      return true
    })
  }, [currentPlayerHints.rows, searchQuery, hideFound])

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
        <div className="tracker-controls">
          <input
            type="text"
            className="tracker-search"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
          <label className="tracker-hide-found">
            <input
              type="checkbox"
              checked={hideFound}
              onChange={(e) => onHideFoundChange(e.target.checked)}
            />
            Hide found
          </label>
        </div>
        {filteredRows.length === 0 && filteredHintRows.length === 0 ? (
          <p className="tracker-placeholder">No locations match the current filter.</p>
        ) : (
          <LocationTable
            rows={filteredRows}
            allRows={currentPlayerTracker.rows}
            hintRows={filteredHintRows}
            allHintRows={currentPlayerHints.rows}
            playerColors={playerColors}
          />
        )}
      </div>
    </div>
  )
}
