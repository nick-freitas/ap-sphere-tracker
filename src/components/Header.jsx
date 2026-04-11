import './Header.css'

export default function Header({
  threshold,
  onThresholdChange,
  extended,
  onExtendedChange,
}) {
  return (
    <header className="header">
      <h1 className="header-title">Archipelago Sphere Analyzer</h1>

      <div className="header-controls">
        <div className="threshold-control">
          <label htmlFor="threshold-slider">
            Threshold: <span className="threshold-value">{threshold}%</span>
          </label>
          <input
            id="threshold-slider"
            type="range"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
          />
        </div>

        <label className="toggle-control">
          <span>Extended</span>
          <input
            type="checkbox"
            checked={extended}
            onChange={(e) => onExtendedChange(e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>
    </header>
  )
}
