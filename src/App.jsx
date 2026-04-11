import { useState } from 'react'
import { parseSpoilerLog } from './parsers/spoilerParser'
import { useTrackerAutoRefresh } from './hooks/useTrackerAutoRefresh'
import Header from './components/Header'
import InputSection from './components/InputSection'
import './App.css'

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [trackerUrl, setTrackerUrl] = useState('')
  const [threshold, setThreshold] = useState(75)
  const [extended, setExtended] = useState(false)
  const { checkedLocations, status: trackerStatus } = useTrackerAutoRefresh(trackerUrl)

  function handleSpoilerText(text) {
    const parsed = parseSpoilerLog(text)
    setSpoilerData(parsed)
  }

  return (
    <div className="app">
      <Header
        threshold={threshold}
        onThresholdChange={setThreshold}
        extended={extended}
        onExtendedChange={setExtended}
      />
      <InputSection
        onSpoilerParsed={handleSpoilerText}
        onTrackerUrlSet={setTrackerUrl}
        trackerUrl={trackerUrl}
        trackerStatus={trackerStatus}
        hasSpoiler={!!spoilerData}
      />
    </div>
  )
}

export default App
