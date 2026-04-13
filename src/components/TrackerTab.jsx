import { useEffect, useMemo, useState } from 'react'
import { buildPlayerTracker, buildPlayerHints } from '../engine/playerTracker'
import './TrackerTab.css'
import PlayerSidebar from './PlayerSidebar'

function parseConfigLocationList(config, key) {
  if (!config) return new Set()
  const entry = config.find((c) => c.key === key)
  if (!entry || !entry.value) return new Set()
  return new Set(entry.value.split(',').map((s) => s.trim()).filter(Boolean))
}

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
      <td className="tracker-cell-location">
        {row.location}
        {row.excluded && <span className="tracker-location-tag tracker-location-tag-excluded"> (excluded)</span>}
        {row.forcedPriority && <span className="tracker-location-tag tracker-location-tag-priority"> (forced priority)</span>}
      </td>
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
  const [locationsCollapsed, setLocationsCollapsed] = useState(false)

  const locationsTotal = allRows.length
  const locationsFound = allRows.filter((r) => r.found).length
  const locationsPercent = locationsTotal === 0 ? 0 : Math.round((locationsFound / locationsTotal) * 100)

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
          {!hintsCollapsed && (() => {
            const receivingRows = hintRows.filter((r) => r.direction === 'receiving')
            const sendingRows = hintRows.filter((r) => r.direction === 'sending')
            return (
              <>
                {receivingRows.length > 0 && (
                  <>
                    <h4 className="tracker-subsection-heading">Receiving</h4>
                    <table className="tracker-table">
                      <tbody>
                        {receivingRows.map((row) => (
                          <LocationRow
                            key={`h-r-${row.location}-${row.itemOwner}`}
                            row={row}
                            playerColors={playerColors}
                            alwaysShowItem
                          />
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {sendingRows.length > 0 && (
                  <>
                    <h4 className="tracker-subsection-heading">Sending</h4>
                    <table className="tracker-table">
                      <tbody>
                        {sendingRows.map((row) => (
                          <LocationRow
                            key={`h-s-${row.location}-${row.itemOwner}`}
                            row={row}
                            playerColors={playerColors}
                            alwaysShowItem
                          />
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )
          })()}
        </>
      )}
      {rows.length > 0 && (
        <>
          <h3 className="tracker-section-heading">
            <button
              type="button"
              className="tracker-section-toggle"
              aria-expanded={!locationsCollapsed}
              onClick={() => setLocationsCollapsed((v) => !v)}
            >
              <span className="tracker-caret" aria-hidden="true">{locationsCollapsed ? '▶' : '▼'}</span>
              {' '}Locations — {locationsFound} / {locationsTotal} ({locationsPercent}%)
            </button>
          </h3>
          {!locationsCollapsed && (
            <table className="tracker-table">
              <tbody>
                {rows.map((row) => (
                  <LocationRow key={`l-${row.location}`} row={row} playerColors={playerColors} />
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}


export default function TrackerTab({
  spoilerData,
  checkedLocations,
  hints,
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
    const result = buildPlayerTracker(selectedPlayer, spoilerData, checkedLocations)
    const player = spoilerData.players.find((p) => p.name === selectedPlayer)
    const excludedSet = parseConfigLocationList(player?.config, 'Excluded Locations')
    const forcedPrioritySet = parseConfigLocationList(player?.config, 'Priority Locations')
    if (excludedSet.size === 0 && forcedPrioritySet.size === 0) return result
    const taggedRows = result.rows.map((row) => ({
      ...row,
      excluded: excludedSet.has(row.location),
      forcedPriority: forcedPrioritySet.has(row.location),
    }))
    return { ...result, rows: taggedRows }
  }, [spoilerData, selectedPlayer, checkedLocations])

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
