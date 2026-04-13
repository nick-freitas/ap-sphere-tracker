import { useEffect, useMemo } from 'react'
import PlayerSidebar from './PlayerSidebar'
import { buildPlayerLog } from '../engine/playerLog'
import './PlayerLogTab.css'

function formatTime(timestamp) {
  // timestamp format is "YYYY-MM-DD HH:MM:SS,mmm"
  if (!timestamp || timestamp.length < 19) return ''
  return timestamp.slice(11, 19)
}

function LogControls({ receiving, onReceivingChange, sending, onSendingChange, searchQuery, onSearchQueryChange }) {
  return (
    <div className="player-log-controls">
      <button
        type="button"
        className={`player-log-toggle ${receiving ? 'active' : ''}`}
        onClick={() => onReceivingChange(!receiving)}
        aria-pressed={receiving}
      >
        Receiving
      </button>
      <button
        type="button"
        className={`player-log-toggle ${sending ? 'active' : ''}`}
        onClick={() => onSendingChange(!sending)}
        aria-pressed={sending}
      >
        Sending
      </button>
      <input
        type="text"
        className="player-log-search"
        placeholder="Search location or item..."
        aria-label="Search location or item"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
      />
    </div>
  )
}

function EventRow({ row, playerColors }) {
  const time = formatTime(row.timestamp)
  const rowColor = row.type === 'hint'
    ? (playerColors[row.receiver] || 'var(--color-text)')
    : (playerColors[row.sender] || 'var(--color-text)')

  const wrap = (value) => (row.type === 'hint' ? `[${value}]` : value)

  return (
    <tr
      className={`player-log-row ${row.type}`}
      style={{ '--row-color': rowColor }}
    >
      <td className="player-log-cell-time" title={row.timestamp}>{wrap(time)}</td>
      <td
        className="player-log-cell-owner"
        style={{ color: playerColors[row.sender] || 'var(--color-text)' }}
      >
        {wrap(row.sender)}
      </td>
      <td className="player-log-cell-location">{wrap(row.location)}</td>
      <td className="player-log-cell-item">{wrap(row.item)}</td>
      <td
        className="player-log-cell-owner"
        style={{ color: playerColors[row.receiver] || 'var(--color-text)' }}
      >
        {wrap(row.receiver)}
      </td>
    </tr>
  )
}

export default function PlayerLogTab({
  spoilerData,
  logEvents,
  playerColors,
  selectedPlayer,
  onSelectedPlayerChange,
  receiving,
  onReceivingChange,
  sending,
  onSendingChange,
  searchQuery,
  onSearchQueryChange,
}) {
  // Re-run only when spoilerData changes: if the new spoiler doesn't include
  // the currently-selected player, fall back to the first player. Deps
  // intentionally omit selectedPlayer/onSelectedPlayerChange — the closure
  // captures the current value at fire time, and we don't want a selection
  // change to re-trigger this recovery check. Mirrors TrackerTab's pattern.
  useEffect(() => {
    if (!spoilerData) return
    const names = spoilerData.players.map((p) => p.name)
    if (!selectedPlayer || !names.includes(selectedPlayer)) {
      onSelectedPlayerChange(names[0] || null)
    }
  }, [spoilerData]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    if (!selectedPlayer) return []
    return buildPlayerLog(selectedPlayer, logEvents, { receiving, sending, searchQuery })
  }, [selectedPlayer, logEvents, receiving, sending, searchQuery])

  if (!spoilerData) return null

  const neitherToggle = !receiving && !sending
  const noEvents = !logEvents || logEvents.length === 0

  return (
    <div className="player-log-tab">
      <PlayerSidebar
        players={spoilerData.players}
        playerColors={playerColors}
        selectedPlayer={selectedPlayer}
        onSelectedPlayerChange={onSelectedPlayerChange}
        showPercent={false}
      />
      <div className="player-log-main">
        <LogControls
          receiving={receiving}
          onReceivingChange={onReceivingChange}
          sending={sending}
          onSendingChange={onSendingChange}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
        />
        {noEvents ? (
          <p className="player-log-empty">No tracker log loaded.</p>
        ) : neitherToggle ? (
          <p className="player-log-empty">Toggle Receiving or Sending to see events.</p>
        ) : filteredRows.length === 0 ? (
          <p className="player-log-empty">No events match the current filters.</p>
        ) : (
          <div className="player-log-table-wrap">
            <table className="player-log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Check Owner</th>
                  <th>Location</th>
                  <th>Item</th>
                  <th>Item Owner</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <EventRow
                    key={`${row.type}-${row.timestamp}-${row.location}-${row.item}-${i}`}
                    row={row}
                    playerColors={playerColors}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
