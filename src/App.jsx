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
import defaultTrackerUrl from './default-tracker.txt?url'
import './App.css'

const PLAYER_COLOR_VARS = Array.from({ length: 10 }, (_, i) => `var(--player-${i})`)

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [checkedLocations, setCheckedLocations] = useState(new Map())
  const [threshold, setThreshold] = useState(70)
  const [extended, setExtended] = useState(false)
  const [hiddenPlayers, setHiddenPlayers] = useState(new Set())
  const [showSpoilers, setShowSpoilers] = useState(false)
  const [showSpoilerConfirm, setShowSpoilerConfirm] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  function toggleDarkMode() {
    setDarkMode((prev) => !prev)
  }

  // Load the bundled default spoiler and tracker logs on startup
  useEffect(() => {
    fetch(defaultSpoilerUrl)
      .then((res) => res.text())
      .then((text) => {
        const parsed = parseSpoilerLog(text)
        setSpoilerData(parsed)
      })
    fetch(defaultTrackerUrl)
      .then((res) => res.text())
      .then((text) => {
        const parsed = parseTrackerLog(text)
        setCheckedLocations(parsed)
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

  // Map each player to their highest sphere number
  const playerLastSphere = useMemo(() => {
    if (!spoilerData) return {}
    const last = {}
    for (const sphere of spoilerData.spheres) {
      for (const entry of sphere.entries) {
        last[entry.locationOwner] = sphere.number
      }
    }
    return last
  }, [spoilerData])

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
        showSpoilers={showSpoilers}
        onSpoilerToggle={() => {
          if (showSpoilers) {
            setShowSpoilers(false)
          } else {
            setShowSpoilerConfirm(true)
          }
        }}
        darkMode={darkMode}
        onDarkModeToggle={toggleDarkMode}
      />
      {showSpoilerConfirm && (
        <div className="modal-overlay" onClick={() => setShowSpoilerConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">Are you sure you want to show item spoilers for missing items?</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowSpoilerConfirm(false)}>Cancel</button>
              <button className="modal-btn confirm" onClick={() => { setShowSpoilers(true); setShowSpoilerConfirm(false) }}>Show Spoilers</button>
            </div>
          </div>
        </div>
      )}
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
          onSelectAll={() => setHiddenPlayers(new Set())}
          onSelectNone={() => setHiddenPlayers(new Set(spoilerData.players.map(p => p.name)))}
        />
      )}
      {spoilerData && (
        <PlayerStats
          spoilerData={spoilerData}
          checkedLocations={checkedLocations}
          playerColors={playerColors}
          hiddenPlayers={hiddenPlayers}
        />
      )}
      <div className="sphere-list">
        {sphereResults.map((result, i) => {
          const withinThreshold = lastQualifyingIdx >= 0 && i <= lastQualifyingIdx
          const isExtended = extended
            && lastQualifyingIdx >= 0
            && i === lastQualifyingIdx + 1
          return (
            <SphereCard
              key={result.sphereNumber}
              result={result}
              threshold={withinThreshold || isExtended ? 0 : threshold}
              playerColors={playerColors}
              hiddenPlayers={hiddenPlayers}
              isExtended={isExtended}
              isCurrent={i === lastQualifyingIdx}
              sphereEntries={spoilerData.spheres[i]?.entries || []}
              checkedLocations={checkedLocations}
              playerLastSphere={playerLastSphere}
              showSpoilers={showSpoilers}
            />
          )
        })}
      </div>
    </div>
  )
}

export default App
