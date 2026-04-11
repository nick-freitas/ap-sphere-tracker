import { useRef } from 'react'
import './InputSection.css'

export default function InputSection({
  onSpoilerParsed,
  onTrackerUrlSet,
  trackerUrl,
  trackerStatus,
  hasSpoiler,
}) {
  const fileInputRef = useRef(null)

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      onSpoilerParsed(event.target.result)
    }
    reader.readAsText(file)
  }

  function handleUrlSubmit(e) {
    e.preventDefault()
    const url = e.target.elements.trackerUrl.value.trim()
    if (url) onTrackerUrlSet(url)
  }

  return (
    <div className="input-section">
      <div className="input-row">
        <div className="input-group">
          <label htmlFor="spoiler-upload">Spoiler Log</label>
          <div className="file-upload">
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              {hasSpoiler ? 'Spoiler Loaded' : 'Upload Spoiler Log'}
            </button>
            <input
              ref={fileInputRef}
              id="spoiler-upload"
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              hidden
            />
          </div>
        </div>

        <form className="input-group" onSubmit={handleUrlSubmit}>
          <label htmlFor="tracker-url">Tracker Log URL</label>
          <div className="url-input-row">
            <input
              id="tracker-url"
              name="trackerUrl"
              type="url"
              placeholder="https://example.com/tracker.txt"
              defaultValue={trackerUrl}
            />
            <button type="submit">Load</button>
          </div>
        </form>
      </div>

      {trackerStatus && (
        <div className={`tracker-status ${trackerStatus.error ? 'error' : ''}`}>
          {trackerStatus.error
            ? `Error: ${trackerStatus.error}`
            : `Last updated: ${trackerStatus.lastFetch} ${trackerStatus.usingProxy ? '(via CORS proxy)' : ''}`}
          {trackerStatus.nextRefresh != null && (
            <span className="refresh-countdown">
              {' '}| Next refresh: {trackerStatus.nextRefresh}s
            </span>
          )}
        </div>
      )}
    </div>
  )
}
