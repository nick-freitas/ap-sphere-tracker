import { useState, useEffect, useMemo, useRef } from 'react'
import { parseSpoilerLog, parseIgnoreList, validateIgnoreLists, DEFAULT_IGNORE_ITEMS, DEFAULT_IGNORE_LOCATIONS } from './parsers/spoilerParser'
import { parseTrackerLog } from './parsers/trackerParser'
import { analyzeSpheres } from './engine/sphereAnalyzer'
import Header from './components/Header'
import InputSection from './components/InputSection'
import SphereCard from './components/SphereCard'
import PlayerLegend from './components/PlayerLegend'
import PlayerStats from './components/PlayerStats'
import PlayerConfigs from './components/PlayerConfigs'
import OptionsPage from './components/OptionsPage'
import TrackerTab from './components/TrackerTab'
import defaultSpoilerUrl from './default-spoiler.txt?url'
import defaultTrackerUrl from './default-tracker.txt?url'
import './App.css'

const PLAYER_COLOR_VARS = Array.from({ length: 10 }, (_, i) => `var(--player-${i})`)

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [checkedLocations, setCheckedLocations] = useState(new Map())
  const [hints, setHints] = useState([])
  const [lastCheckTime, setLastCheckTime] = useState(null)
  const [threshold, setThreshold] = useState(70)
  const [extended, setExtended] = useState(false)
  const [hiddenPlayers, setHiddenPlayers] = useState(new Set())
  const [activeTab, setActiveTab] = useState('spheres')
  const [rawTrackerText, setRawTrackerText] = useState('')
  const [showSpoilers, setShowSpoilers] = useState(false)
  const [showSpoilerConfirm, setShowSpoilerConfirm] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [trackerSelectedPlayer, setTrackerSelectedPlayer] = useState(null)
  const [trackerSearchQuery, setTrackerSearchQuery] = useState('')
  const [trackerHideFound, setTrackerHideFound] = useState(false)

  // Ignore lists — load from localStorage or use defaults
  const [ignoreItemsText, setIgnoreItemsText] = useState(() => {
    return localStorage.getItem('ap-ignore-items') || DEFAULT_IGNORE_ITEMS
  })
  const [ignoreLocationsText, setIgnoreLocationsText] = useState(() => {
    return localStorage.getItem('ap-ignore-locations') || DEFAULT_IGNORE_LOCATIONS
  })
  const [validationErrors, setValidationErrors] = useState(null)

  // Keep raw spoiler text for re-parsing and validation
  const rawSpoilerTextRef = useRef('')

  const ignoreItems = useMemo(() => parseIgnoreList(ignoreItemsText), [ignoreItemsText])
  const ignoreLocations = useMemo(() => parseIgnoreList(ignoreLocationsText), [ignoreLocationsText])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  function toggleDarkMode() {
    setDarkMode((prev) => !prev)
  }

  function parseSpoilerWithIgnores(text) {
    return parseSpoilerLog(text, ignoreItems, ignoreLocations)
  }

  // Load the bundled default spoiler and tracker logs on startup
  useEffect(() => {
    fetch(defaultSpoilerUrl)
      .then((res) => res.text())
      .then((text) => {
        rawSpoilerTextRef.current = text
        const parsed = parseSpoilerWithIgnores(text)
        setSpoilerData(parsed)
        const errors = validateIgnoreLists(text, ignoreItems, ignoreLocations)
        if (errors.invalidItems.length > 0 || errors.invalidLocations.length > 0) {
          setValidationErrors(errors)
        }
      })
    fetch(defaultTrackerUrl)
      .then((res) => res.text())
      .then((text) => {
        setRawTrackerText(text)
        const { checkedLocations: parsed, lastCheckTime: lct, hints: parsedHints } = parseTrackerLog(text)
        setCheckedLocations(parsed)
        setLastCheckTime(lct)
        setHints(parsedHints)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSpoilerText(text) {
    rawSpoilerTextRef.current = text
    const parsed = parseSpoilerWithIgnores(text)
    setSpoilerData(parsed)
    setHiddenPlayers(new Set())
    const errors = validateIgnoreLists(text, ignoreItems, ignoreLocations)
    if (errors.invalidItems.length > 0 || errors.invalidLocations.length > 0) {
      setValidationErrors(errors)
    } else {
      setValidationErrors(null)
    }
  }

  function handleTrackerText(text) {
    setRawTrackerText(text)
    const { checkedLocations: parsed, lastCheckTime: lct, hints: parsedHints } = parseTrackerLog(text)
    setCheckedLocations(parsed)
    setLastCheckTime(lct)
    setHints(parsedHints)
  }

  function handleOptionsSave(itemsText, locationsText) {
    // Validate against the raw spoiler
    const items = parseIgnoreList(itemsText)
    const locations = parseIgnoreList(locationsText)

    if (rawSpoilerTextRef.current) {
      const errors = validateIgnoreLists(rawSpoilerTextRef.current, items, locations)
      if (errors.invalidItems.length > 0 || errors.invalidLocations.length > 0) {
        setValidationErrors(errors)
        // Still save — just show warnings
      } else {
        setValidationErrors(null)
      }
    }

    // Save to localStorage
    localStorage.setItem('ap-ignore-items', itemsText)
    localStorage.setItem('ap-ignore-locations', locationsText)
    setIgnoreItemsText(itemsText)
    setIgnoreLocationsText(locationsText)

    // Re-parse spoiler with new ignore lists
    if (rawSpoilerTextRef.current) {
      const parsed = parseSpoilerLog(rawSpoilerTextRef.current, items, locations)
      setSpoilerData(parsed)
    }
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

  // Find the highest sphere in a continuous chain where the majority of players
  // meet the threshold. "Majority" = more than half, or half if even number.
  // Sphere 0 (starting items) always qualifies as fallback.
  const lastQualifyingIdx = useMemo(() => {
    if (!spoilerData || sphereResults.length === 0) return -1
    let last = 0

    for (let i = 1; i < sphereResults.length; i++) {
      const sphere = spoilerData.spheres[i]
      if (!sphere || sphere.entries.length === 0) break

      const playerTotals = {}
      const playerDone = {}
      for (const entry of sphere.entries) {
        const owner = entry.locationOwner
        playerTotals[owner] = (playerTotals[owner] || 0) + 1
        const checks = checkedLocations.get(owner)
        if (checks && checks.has(entry.location)) {
          playerDone[owner] = (playerDone[owner] || 0) + 1
        }
      }

      const playerNames = Object.keys(playerTotals)
      const totalPlayers = playerNames.length
      const majorityNeeded = Math.ceil(totalPlayers / 2)

      let playersAbove = 0
      for (const name of playerNames) {
        const pct = Math.round(((playerDone[name] || 0) / playerTotals[name]) * 100)
        if (pct >= threshold) playersAbove++
      }

      if (playersAbove >= majorityNeeded) {
        last = i
      } else {
        break
      }
    }

    return last
  }, [spoilerData, sphereResults, checkedLocations, threshold])

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

  const reversedRawTrackerText = useMemo(
    () => rawTrackerText.trimEnd().split('\n').reverse().join('\n'),
    [rawTrackerText]
  )

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
        lastCheckTime={lastCheckTime}
        currentSphere={lastQualifyingIdx >= 0 && sphereResults[lastQualifyingIdx] ? sphereResults[lastQualifyingIdx].sphereNumber : 0}
        totalSpheres={sphereResults.length > 0 ? sphereResults[sphereResults.length - 1].sphereNumber : 0}
      />
      {showSpoilerConfirm && (
        <div className="modal-overlay" onClick={() => setShowSpoilerConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">Are you sure you want to reveal which player receives items at missing check locations?</p>
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
      <div className="tabs">
        <button className={`tab ${activeTab === 'spheres' ? 'active' : ''}`} onClick={() => setActiveTab('spheres')}>Spheres</button>
        <button className={`tab ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>Tracker</button>
        <button className={`tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>Raw Log</button>
        <button className={`tab ${activeTab === 'configs' ? 'active' : ''}`} onClick={() => setActiveTab('configs')}>Player Configs</button>
        <div className="tab-spacer" />
        <button className={`tab ${activeTab === 'options' ? 'active' : ''}`} onClick={() => setActiveTab('options')}>Options</button>
      </div>

      {activeTab === 'spheres' && (
        <>
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
              sphereResults={sphereResults}
              lastQualifyingIdx={lastQualifyingIdx}
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
                  threshold={withinThreshold || isExtended ? 0 : 101}
                  playerColors={playerColors}
                  hiddenPlayers={hiddenPlayers}
                  isExtended={isExtended}
                  isCurrent={i === lastQualifyingIdx}
                  sphereEntries={spoilerData.spheres[i]?.entries || []}
                  checkedLocations={checkedLocations}
                  playerLastSphere={playerLastSphere}
                  showSpoilers={showSpoilers}
                  precollected={spoilerData.spheres[i]?.precollected}
                  displayThreshold={threshold}
                />
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'tracker' && spoilerData && (
        <TrackerTab
          spoilerData={spoilerData}
          checkedLocations={checkedLocations}
          hints={hints}
          playerColors={playerColors}
          selectedPlayer={trackerSelectedPlayer}
          onSelectedPlayerChange={setTrackerSelectedPlayer}
          searchQuery={trackerSearchQuery}
          onSearchQueryChange={setTrackerSearchQuery}
          hideFound={trackerHideFound}
          onHideFoundChange={setTrackerHideFound}
        />
      )}

      {activeTab === 'configs' && spoilerData && (
        <PlayerConfigs
          players={spoilerData.players}
          playerColors={playerColors}
        />
      )}

      {activeTab === 'options' && (
        <OptionsPage
          ignoreItemsText={ignoreItemsText}
          ignoreLocationsText={ignoreLocationsText}
          onSave={handleOptionsSave}
          validationErrors={validationErrors}
        />
      )}

      {activeTab === 'log' && (
        <div className="raw-log">
          {rawTrackerText
            ? <pre className="log-content">{reversedRawTrackerText}</pre>
            : <p className="log-empty">No tracker log loaded</p>
          }
        </div>
      )}
    </div>
  )
}

export default App
