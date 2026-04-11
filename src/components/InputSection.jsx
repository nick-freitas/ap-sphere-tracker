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
        <div className="input-group" onClick={() => spoilerInputRef.current?.click()}>
          <div className="input-step">
            <span className="step-number">1</span>
            <div>
              <label>Spoiler Log</label>
              <p className="input-hint">{hasSpoiler ? 'Upload a new one to override' : 'The AP_*_Spoiler.txt from your seed'}</p>
            </div>
          </div>
          <div className={`upload-btn ${hasSpoiler ? 'loaded' : ''}`}>
            {hasSpoiler ? 'Spoiler Loaded' : 'Upload Spoiler Log'}
          </div>
          <input
            ref={spoilerInputRef}
            type="file"
            accept=".txt,.log,text/plain"
            onChange={handleFileUpload(onSpoilerParsed)}
            hidden
          />
        </div>

        <div className="input-divider" />

        <div className="input-group" onClick={() => trackerInputRef.current?.click()}>
          <div className="input-step">
            <span className="step-number">2</span>
            <div>
              <label>Tracker Log</label>
              <p className="input-hint">The server log .txt file</p>
            </div>
          </div>
          <div className={`upload-btn ${hasTracker ? 'loaded' : ''}`}>
            {hasTracker ? 'Tracker Loaded' : 'Upload Tracker Log'}
          </div>
          <input
            ref={trackerInputRef}
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
