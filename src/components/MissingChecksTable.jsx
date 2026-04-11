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
          <tr key={`${check.player}-${check.location}`}>
            <td style={{ color: playerColors[check.player] || 'var(--color-text)', fontWeight: 600 }}>
              {check.player}
            </td>
            <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{check.location}</td>
            <td style={{ color: 'var(--color-moss)', fontWeight: 500 }}>{check.item}</td>
            <td style={{ color: playerColors[check.itemOwner] || 'var(--color-text)', fontWeight: 600 }}>
              {check.itemOwner}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
