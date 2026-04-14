import { useState } from 'react'
import './PlayerConfigs.css'

export default function PlayerConfigs({ players, playerColors, warnings }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null)

  if (!players || players.length === 0) return null

  // Index header-count discrepancies by player name for O(1) lookup per row.
  // A warning entry has shape { player, spoilerCount, gameCount } where spoilerCount
  // is what the spoiler's "Location Count: N" header claims and gameCount is what
  // the seed file actually contains. Games like ALTTP have a header that counts
  // 10 dungeon Prize slots that aren't real checks, producing a discrepancy we
  // surface inline with the Location Count row below.
  const warningByPlayer = new Map(
    (warnings || []).map((w) => [w.player, w]),
  )

  return (
    <div className="player-configs">
      {players.map((player) => {
        const isOpen = expandedPlayer === player.slot
        const warning = warningByPlayer.get(player.name)
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
                    {player.config.map((c) => {
                      const isLocationCount = c.key === 'Location Count'
                      return (
                        <tr key={c.key}>
                          <td className="pc-key">{c.key}</td>
                          <td className="pc-value">
                            {c.value}
                            {isLocationCount && warning && (
                              <span
                                className="pc-warning"
                                title={`Spoiler indicates ${warning.spoilerCount} location checks but game contains ${warning.gameCount}`}
                              >
                                {'\u00A0\u26A0'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
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
