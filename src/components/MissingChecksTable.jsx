import './MissingChecksTable.css'

export default function MissingChecksTable({ missingChecks, playerColors, hiddenPlayers, showSpoilers }) {
  const filtered = hiddenPlayers
    ? missingChecks.filter((check) => !hiddenPlayers.has(check.player))
    : missingChecks

  if (filtered.length === 0) {
    return <p className="no-missing">All checks complete!</p>
  }

  const blurClass = showSpoilers ? '' : 'spoiler-blur'

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
        {filtered.map((check) => (
          <tr key={`${check.player}-${check.location}`}>
            <td style={{ color: playerColors[check.player] || 'var(--color-text)', fontWeight: 600 }}>
              {check.player}
            </td>
            <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{check.location}</td>
            <td className={blurClass} style={{ color: 'var(--color-moss)', fontWeight: 500 }}>{check.item}</td>
            <td className={blurClass} style={{ color: showSpoilers ? (playerColors[check.itemOwner] || 'var(--color-text)') : 'var(--color-text-muted)', fontWeight: 600 }}>
              {check.itemOwner}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
