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
          <label htmlFor="spoiler-upload">Spoiler Log</label>
          <div className="file-upload">
            <button
              className="upload-btn"
              onClick={() => spoilerInputRef.current?.click()}
            >
              {hasSpoiler ? 'Spoiler Loaded' : 'Upload Spoiler Log'}
            </button>
            <input
              ref={spoilerInputRef}
              id="spoiler-upload"
              type="file"
              accept=".txt"
              onChange={handleFileUpload(onSpoilerParsed)}
              hidden
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="tracker-upload">Tracker Log</label>
          <div className="file-upload">
            <button
              className="upload-btn"
              onClick={() => trackerInputRef.current?.click()}
            >
              {hasTracker ? 'Tracker Loaded' : 'Upload Tracker Log'}
            </button>
            <input
              ref={trackerInputRef}
              id="tracker-upload"
              type="file"
              accept=".txt"
              onChange={handleFileUpload(onTrackerParsed)}
              hidden
            />
          </div>
        </div>
      </div>
    </div>
  )
}
