import { useState } from 'react'
import './PlayerConfigs.css'

export default function PlayerConfigs({ players, playerColors }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null)

  if (!players || players.length === 0) return null

  return (
    <div className="player-configs">
      {players.map((player) => {
        const isOpen = expandedPlayer === player.slot
        return (
          <div className="pc-card" key={player.slot}>
            <button
              className="pc-header"
              onClick={() => setExpandedPlayer(isOpen ? null : player.slot)}
            >
              <div className="pc-title">
                <span className="pc-dot" style={{ background: playerColors[player.name] }} />
                <span className="pc-name" style={{ color: playerColors[player.name] }}>{player.name}</span>
                <span className="pc-game">{player.game}</span>
              </div>
              <span className="pc-arrow">{isOpen ? '\u25BC' : '\u25B6'}</span>
            </button>
            {isOpen && player.config && (
              <div className="pc-body">
                <table className="pc-table">
                  <tbody>
                    {player.config.map((c) => (
                      <tr key={c.key}>
                        <td className="pc-key">{c.key}</td>
                        <td className="pc-value">{c.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
