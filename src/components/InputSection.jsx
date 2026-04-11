import { useRef } from 'react'
import './InputSection.css'

export default function InputSection({
  onSpoilerParsed,
  onTrackerParsed,
  hasSpoiler,
  hasTracker,
}) {
  const spoilerInputRef = useRef(null)
  const trackerInputRef = useRef(null)

  function handleFileUpload(callback) {
    return (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        callback(event.target.result)
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="input-section">
      <div className="input-row">
        <div className="input-group">
          <div className="input-step">
            <span className="step-number">1</span>
            <div>
              <label htmlFor="spoiler-upload">Spoiler Log</label>
              <p className="input-hint">The AP_*_Spoiler.txt from your seed</p>
            </div>
          </div>
          <button
            className={`upload-btn ${hasSpoiler ? 'loaded' : ''}`}
            onClick={() => spoilerInputRef.current?.click()}
          >
            {hasSpoiler ? 'Spoiler Loaded' : 'Upload Spoiler Log'}
          </button>
          <input
            ref={spoilerInputRef}
            id="spoiler-upload"
            type="file"
            accept=".txt,.log,text/plain"
            onChange={handleFileUpload(onSpoilerParsed)}
            hidden
          />
        </div>

        <div className="input-divider" />

        <div className="input-group">
          <div className="input-step">
            <span className="step-number">2</span>
            <div>
              <label htmlFor="tracker-upload">Tracker Log</label>
              <p className="input-hint">The server log .txt file</p>
            </div>
          </div>
          <button
            className={`upload-btn ${hasTracker ? 'loaded' : ''}`}
            onClick={() => trackerInputRef.current?.click()}
          >
            {hasTracker ? 'Tracker Loaded' : 'Upload Tracker Log'}
          </button>
          <input
            ref={trackerInputRef}
            id="tracker-upload"
            type="file"
            accept=".txt,.log,text/plain"
            onChange={handleFileUpload(onTrackerParsed)}
            hidden
          />
        </div>
      </div>
    </div>
  )
}
