import { useState } from 'react'
import { parseSpoilerLog } from './parsers/spoilerParser'
import { useTrackerAutoRefresh } from './hooks/useTrackerAutoRefresh'
import InputSection from './components/InputSection'
import './App.css'

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [trackerUrl, setTrackerUrl] = useState('')
  const { checkedLocations, status: trackerStatus } = useTrackerAutoRefresh(trackerUrl)

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
      {checkedLocations.size > 0 && (
        <p>{checkedLocations.size} players tracked</p>
      )}
    </div>
  )
}

export default App
