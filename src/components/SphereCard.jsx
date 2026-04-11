import MissingChecksTable from './MissingChecksTable'
import './SphereCard.css'

export default function SphereCard({
  result,
  threshold,
  playerColors,
  hiddenPlayers,
  isExtended,
}) {
  const { sphereNumber, totalChecks, completedChecks, completionPercent, missingChecks } = result
  const isComplete = completionPercent === 100
  const meetsThreshold = completionPercent >= threshold

  if (totalChecks === 0) return null

  return (
    <div className={`sphere-card ${isComplete ? 'complete' : ''} ${meetsThreshold ? 'expanded' : 'dimmed'} ${isExtended ? 'extended' : ''}`}>
      <div className="sphere-header">
        <span className="sphere-label">
          {isComplete && <span className="check-icon">&#10003; </span>}
          Sphere {sphereNumber}
          {isExtended && <span className="extended-badge">Extended</span>}
        </span>
        <div className="sphere-progress-container">
          <div className="sphere-progress-bar">
            <div
              className="sphere-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="sphere-progress-text">
            {completedChecks}/{totalChecks} ({completionPercent}%)
          </span>
        </div>
      </div>

      {meetsThreshold && !isComplete && (
        <div className="sphere-body">
          <MissingChecksTable
            missingChecks={missingChecks}
            playerColors={playerColors}
            hiddenPlayers={hiddenPlayers}
          />
        </div>
      )}
    </div>
  )
}
