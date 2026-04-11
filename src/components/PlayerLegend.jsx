import './PlayerLegend.css'

export default function PlayerLegend({ players, playerColors, hiddenPlayers, onTogglePlayer }) {
  if (!players || players.length === 0) return null

  return (
    <div className="player-legend">
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
