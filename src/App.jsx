import { useState } from 'react'
import { parseSpoilerLog } from './parsers/spoilerParser'
import InputSection from './components/InputSection'
import './App.css'

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [trackerUrl, setTrackerUrl] = useState('')
  const [trackerStatus, setTrackerStatus] = useState(null)

  function handleSpoilerText(text) {
    const parsed = parseSpoilerLog(text)
    setSpoilerData(parsed)
  }

  return (
    <div className="app">
      <h1>Archipelago Sphere Analyzer</h1>
      <InputSection
        onSpoilerParsed={handleSpoilerText}
        onTrackerUrlSet={setTrackerUrl}
        trackerUrl={trackerUrl}
        trackerStatus={trackerStatus}
        hasSpoiler={!!spoilerData}
      />
      {spoilerData && (
        <p>{spoilerData.players.length} players loaded, {spoilerData.spheres.length} spheres found</p>
      )}
    </div>
  )
}

export default App
