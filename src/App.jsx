import { useState, useMemo } from 'react'
import { parseSpoilerLog } from './parsers/spoilerParser'
import { analyzeSpheres } from './engine/sphereAnalyzer'
import { useTrackerAutoRefresh } from './hooks/useTrackerAutoRefresh'
import Header from './components/Header'
import InputSection from './components/InputSection'
import SphereCard from './components/SphereCard'
import './App.css'

const PLAYER_COLOR_VARS = Array.from({ length: 10 }, (_, i) => `var(--player-${i})`)

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

  const sphereResults = useMemo(() => {
    if (!spoilerData) return []
    return analyzeSpheres(spoilerData, checkedLocations)
  }, [spoilerData, checkedLocations])

  const playerColors = useMemo(() => {
    if (!spoilerData) return {}
    const colors = {}
    spoilerData.players.forEach((p, i) => {
      colors[p.name] = PLAYER_COLOR_VARS[i % PLAYER_COLOR_VARS.length]
    })
    return colors
  }, [spoilerData])

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
      <div className="sphere-list">
        {sphereResults.map((result, i) => (
          <SphereCard
            key={result.sphereNumber}
            result={result}
            threshold={threshold}
            extended={extended}
            nextResult={sphereResults[i + 1] || null}
            playerColors={playerColors}
            hiddenPlayers={null}
          />
        ))}
      </div>
    </div>
  )
}

export default App
