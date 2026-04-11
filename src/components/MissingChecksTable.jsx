import './MissingChecksTable.css'

export default function MissingChecksTable({ missingChecks, playerColors, hiddenPlayers }) {
  const filtered = hiddenPlayers
    ? missingChecks.filter((check) => !hiddenPlayers.has(check.player))
    : missingChecks

  if (filtered.length === 0) {
    return <p className="no-missing">All checks complete!</p>
  }

  return (
    <table className="missing-checks-table">
      <thead>
        <tr>
          <th>Player</th>
          <th>Location</th>
          <th>Item</th>
          <th>Item Owner</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((check, i) => (
          <tr key={`${check.player}-${check.location}`} style={{ borderLeftColor: playerColors[check.player] || '#888' }}>
            <td style={{ color: playerColors[check.player] || '#888' }}>
              {check.player}
            </td>
            <td>{check.location}</td>
            <td>{check.item}</td>
            <td style={{ color: playerColors[check.itemOwner] || '#888' }}>
              {check.itemOwner}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
