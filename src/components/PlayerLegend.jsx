import './PlayerLegend.css'

export default function PlayerLegend({ players, playerColors, hiddenPlayers, onTogglePlayer, onSelectAll, onSelectNone }) {
  if (!players || players.length === 0) return null

  return (
    <div className="player-legend">
      <div className="legend-actions">
        <button className="legend-btn" onClick={onSelectAll}>All</button>
        <button className="legend-btn" onClick={onSelectNone}>None</button>
      </div>
      {players.map((player) => {
        const isHidden = hiddenPlayers.has(player.name)
        return (
          <button
            key={player.slot}
            className={`player-chip ${isHidden ? 'hidden' : ''}`}
            onClick={() => onTogglePlayer(player.name)}
            style={{
              '--chip-color': playerColors[player.name],
            }}
          >
            <span className="player-dot" />
            <span className="player-name">{player.name}</span>
            <span className="player-game">{player.game}</span>
          </button>
        )
      })}
    </div>
  )
}
