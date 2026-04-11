import { useState, useEffect, useMemo } from 'react'
import { parseSpoilerLog } from './parsers/spoilerParser'
import { parseTrackerLog } from './parsers/trackerParser'
import { analyzeSpheres } from './engine/sphereAnalyzer'
import Header from './components/Header'
import InputSection from './components/InputSection'
import SphereCard from './components/SphereCard'
import PlayerLegend from './components/PlayerLegend'
import PlayerStats from './components/PlayerStats'
import defaultSpoilerUrl from './default-spoiler.txt?url'
import './App.css'

const PLAYER_COLOR_VARS = Array.from({ length: 10 }, (_, i) => `var(--player-${i})`)

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [checkedLocations, setCheckedLocations] = useState(new Map())
  const [threshold, setThreshold] = useState(60)
  const [extended, setExtended] = useState(false)
  const [hiddenPlayers, setHiddenPlayers] = useState(new Set())

  // Load the bundled default spoiler log on startup
  useEffect(() => {
    fetch(defaultSpoilerUrl)
      .then((res) => res.text())
      .then((text) => {
        const parsed = parseSpoilerLog(text)
        setSpoilerData(parsed)
      })
  }, [])

  function handleSpoilerText(text) {
    const parsed = parseSpoilerLog(text)
    setSpoilerData(parsed)
    setHiddenPlayers(new Set())
  }

  function handleTrackerText(text) {
    const parsed = parseTrackerLog(text)
    setCheckedLocations(parsed)
  }

  function togglePlayer(name) {
    setHiddenPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const sphereResults = useMemo(() => {
    if (!spoilerData) return []
    return analyzeSpheres(spoilerData, checkedLocations)
  }, [spoilerData, checkedLocations])

  // Find the index of the last sphere that meets the threshold — extended only shows the next sphere after that one
  const lastQualifyingIdx = useMemo(() => {
    for (let i = sphereResults.length - 1; i >= 0; i--) {
      if (sphereResults[i].totalChecks > 0 && sphereResults[i].completionPercent >= threshold) {
        return i
      }
    }
    return -1
  }, [sphereResults, threshold])

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
        onTrackerParsed={handleTrackerText}
        hasSpoiler={!!spoilerData}
        hasTracker={checkedLocations.size > 0}
      />
      {spoilerData && (
        <PlayerLegend
          players={spoilerData.players}
          playerColors={playerColors}
          hiddenPlayers={hiddenPlayers}
          onTogglePlayer={togglePlayer}
        />
      )}
      {spoilerData && (
        <PlayerStats
          spoilerData={spoilerData}
          checkedLocations={checkedLocations}
          playerColors={playerColors}
        />
      )}
      <div className="sphere-list">
        {sphereResults.map((result, i) => {
          const isExtended = extended
            && lastQualifyingIdx >= 0
            && i > lastQualifyingIdx
            && i <= lastQualifyingIdx + 2
          return (
            <SphereCard
              key={result.sphereNumber}
              result={result}
              threshold={isExtended ? 0 : threshold}
              playerColors={playerColors}
              hiddenPlayers={hiddenPlayers}
              isExtended={isExtended}
            />
          )
        })}
      </div>
    </div>
  )
}

export default App
