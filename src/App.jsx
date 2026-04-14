import { useState, useEffect, useMemo, useRef } from 'react'
import { parseSpoilerLogRaw } from './parsers/spoilerParser'
import { parseTrackerLog } from './parsers/trackerParser'
import { analyzeSpheres } from './engine/sphereAnalyzer'
import { parseMultidata } from './services/multidataParser'
import { applyEventFilter } from './engine/eventFilter'
import Header from './components/Header'
import InputSection from './components/InputSection'
import SphereCard from './components/SphereCard'
import PlayerLegend from './components/PlayerLegend'
import PlayerStats from './components/PlayerStats'
import PlayerConfigs from './components/PlayerConfigs'
import TrackerTab from './components/TrackerTab'
import PlayerLogTab from './components/PlayerLogTab'
import ErrorCard from './components/ErrorCard'
import './App.css'

const PLAYER_COLOR_VARS = Array.from({ length: 10 }, (_, i) => `var(--player-${i})`)

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [loadingMultidata, setLoadingMultidata] = useState(true)
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
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [logEvents, setLogEvents] = useState([])
  const [playerLogReceiving, setPlayerLogReceiving] = useState(true)
  const [playerLogSending, setPlayerLogSending] = useState(true)
  const [playerLogSearchQuery, setPlayerLogSearchQuery] = useState('')
  const [trackerSearchQuery, setTrackerSearchQuery] = useState('')
  const [trackerHideFound, setTrackerHideFound] = useState(false)
  const [rawParsed, setRawParsed] = useState(null)
  const [multidata, setMultidata] = useState(null)

  // Keep raw spoiler text for re-parsing
  const rawSpoilerTextRef = useRef('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  function toggleDarkMode() {
    setDarkMode((prev) => !prev)
  }

  // Load the default spoiler and tracker logs on startup from public/
  useEffect(() => {
    fetch('/ap-sphere-tracker/default-spoiler.txt')
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (text == null) return
        handleSpoilerText(text)
      })
      .catch(() => {})

    fetch('/ap-sphere-tracker/default-tracker.txt')
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (text == null) return
        handleTrackerText(text)
      })
      .catch(() => {})

    fetch('/ap-sphere-tracker/default-seed.archipelago')
      .then(async (res) => {
        if (!res.ok) {
          setLoadingMultidata(false)
          return
        }
        const buffer = await res.arrayBuffer()
        await handleMultidataFile(new Uint8Array(buffer))
      })
      .catch(() => {
        setLoadingMultidata(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMultidataFile(bytes) {
    setLoadingMultidata(true)
    try {
      const md = await parseMultidata(bytes)
      setMultidata(md)
    } catch (err) {
      console.error('Failed to parse seed file:', err)
      setMultidata(null)
    } finally {
      setLoadingMultidata(false)
    }
  }

  function handleSpoilerText(text) {
    rawSpoilerTextRef.current = text
    const parsed = parseSpoilerLogRaw(text)
    setRawParsed(parsed)
    setHiddenPlayers(new Set())
  }

  function handleTrackerText(text) {
    setRawTrackerText(text)
    const { checkedLocations: parsed, lastCheckTime: lct, hints: parsedHints, events } = parseTrackerLog(text)
    setCheckedLocations(parsed)
    setLastCheckTime(lct)
    setHints(parsedHints)
    setLogEvents(events)
  }

  useEffect(() => {
    if (!rawParsed || !multidata) {
      setSpoilerData(null)
      return
    }
    const filtered = applyEventFilter(rawParsed, multidata)
    setSpoilerData(filtered)
  }, [rawParsed, multidata])

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
  //
  // Then apply a second constraint: cap the current sphere so that no more
  // than 5 incomplete spheres sit strictly before it. If the threshold-based
  // current would leave more than 5 incompletes in its wake, walk backwards
  // until the count drops back to ≤ 5. This bounds the "in flight" workload
  // shown to the user.
  //
  // Returns an object exposing both the threshold-based index (what the
  // current would be without the cap) and the capped index (what actually
  // gets rendered), plus the list of incomplete sphere numbers that sit
  // before the capped current. The capped sphere's tooltip uses this list
  // to explain why it was pinned there.
  const sphereProgressState = useMemo(() => {
    if (!spoilerData || sphereResults.length === 0) {
      return {
        cappedIdx: -1,
        thresholdIdx: -1,
        isCapped: false,
        incompleteNumbersBeforeCapped: [],
      }
    }

    // Phase 1 — threshold-based walk forward
    let thresholdIdx = 0
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
        thresholdIdx = i
      } else {
        break
      }
    }

    // Phase 2 — apply the "≤ 5 incomplete before current" cap.
    let cappedIdx = thresholdIdx
    let incompleteBefore = 0
    for (let j = 0; j < cappedIdx; j++) {
      if (sphereResults[j].completionPercent < 100) incompleteBefore++
    }
    while (cappedIdx > 0 && incompleteBefore > 5) {
      cappedIdx--
      if (sphereResults[cappedIdx].completionPercent < 100) incompleteBefore--
    }

    // Collect the incomplete sphere numbers that sit strictly before the
    // capped current. If the cap kicked in, this list has exactly 5 entries.
    const incompleteNumbersBeforeCapped = []
    for (let j = 0; j < cappedIdx; j++) {
      if (sphereResults[j].completionPercent < 100) {
        incompleteNumbersBeforeCapped.push(sphereResults[j].sphereNumber)
      }
    }

    return {
      cappedIdx,
      thresholdIdx,
      isCapped: thresholdIdx !== cappedIdx,
      incompleteNumbersBeforeCapped,
    }
  }, [spoilerData, sphereResults, checkedLocations, threshold])

  const lastQualifyingIdx = sphereProgressState.cappedIdx

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

  // Map each player to the timestamp of their most recent "sent" event. For
  // a player at 100%, this is their completion moment. Used by PlayerStats to
  // rank completed players in the order they finished (earliest first).
  // Timestamps are strings like "2026-04-10 22:59:01,934" which sort correctly
  // with standard string comparison since the format is fixed-width left-to-right.
  const playerCompletionTime = useMemo(() => {
    const latest = {}
    for (const event of logEvents) {
      if (event.type !== 'sent' || !event.timestamp || !event.sender) continue
      const current = latest[event.sender]
      if (!current || event.timestamp > current) {
        latest[event.sender] = event.timestamp
      }
    }
    return latest
  }, [logEvents])

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
        onMultidataFile={handleMultidataFile}
        hasSpoiler={!!spoilerData}
        hasTracker={checkedLocations.size > 0}
        hasMultidata={multidata !== null}
      />
      <div className="tabs">
        <button className={`tab ${activeTab === 'spheres' ? 'active' : ''}`} onClick={() => setActiveTab('spheres')}>Spheres</button>
        <button className={`tab ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>Tracker</button>
        <button className={`tab ${activeTab === 'player-log' ? 'active' : ''}`} onClick={() => setActiveTab('player-log')}>Player Log</button>
        <button className={`tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>Raw Log</button>
        <button className={`tab ${activeTab === 'configs' ? 'active' : ''}`} onClick={() => setActiveTab('configs')}>Player Configs</button>
      </div>

      {loadingMultidata && (
        <div style={{ textAlign: 'center', padding: '4rem' }} aria-live="polite">
          <p>Loading game data…</p>
        </div>
      )}

      {!loadingMultidata && !multidata && (
        <ErrorCard
          title="No seed file loaded"
          body="Upload the .archipelago file (or the generator output .zip) for this seed to begin analysis."
        />
      )}

      {!loadingMultidata && multidata && spoilerData === null && (
        <ErrorCard
          title="No spoiler log loaded"
          body="Upload a spoiler log (AP_*_Spoiler.txt) to begin analysis."
        />
      )}

      {!loadingMultidata && multidata && spoilerData !== null && activeTab === 'spheres' && (
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
              playerCompletionTime={playerCompletionTime}
              playerLastSphere={playerLastSphere}
            />
          )}
          <div className="sphere-list">
            {sphereResults.map((result, i) => {
              // Sphere 0 is the precollected/starting items pseudo-sphere.
              // We don't render it — it didn't fit visually on the sphere
              // board. The data is still in the parse tree via
              // spoilerData.spheres[0].precollected if anything ever wants
              // to display it again.
              if (result.sphereNumber === 0) return null
              const withinThreshold = lastQualifyingIdx >= 0 && i <= lastQualifyingIdx
              const isExtended = extended
                && lastQualifyingIdx >= 0
                && i === lastQualifyingIdx + 1
              // How many positions behind the current sphere this sphere
              // is. 0 for the current sphere, positive for past, negative
              // for future. SphereCard uses this to decide whether to show
              // the red "falling behind" indicator and to render a tooltip
              // with the exact count (e.g. "7 spheres behind current").
              const spheresBehind = lastQualifyingIdx >= 0 ? lastQualifyingIdx - i : 0
              const isCurrentCard = i === lastQualifyingIdx
              // Pass cap-info only to the current sphere, and only when the
              // cap actually pulled it back. Contains the threshold-based
              // "real" target sphere number + the incomplete sphere numbers
              // blocking progress.
              const capInfo = isCurrentCard && sphereProgressState.isCapped
                ? {
                    thresholdSphereNumber:
                      sphereResults[sphereProgressState.thresholdIdx]?.sphereNumber,
                    incompleteNumbers: sphereProgressState.incompleteNumbersBeforeCapped,
                  }
                : null
              return (
                <SphereCard
                  key={result.sphereNumber}
                  result={result}
                  threshold={withinThreshold || isExtended ? 0 : 101}
                  playerColors={playerColors}
                  hiddenPlayers={hiddenPlayers}
                  isExtended={isExtended}
                  isCurrent={isCurrentCard}
                  spheresBehind={spheresBehind}
                  capInfo={capInfo}
                  sphereEntries={spoilerData.spheres[i]?.entries || []}
                  checkedLocations={checkedLocations}
                  playerLastSphere={playerLastSphere}
                  showSpoilers={showSpoilers}
                  displayThreshold={threshold}
                />
              )
            })}
          </div>
        </>
      )}

      {!loadingMultidata && multidata && spoilerData !== null && activeTab === 'tracker' && (
        <TrackerTab
          spoilerData={spoilerData}
          checkedLocations={checkedLocations}
          hints={hints}
          playerColors={playerColors}
          selectedPlayer={selectedPlayer}
          onSelectedPlayerChange={setSelectedPlayer}
          searchQuery={trackerSearchQuery}
          onSearchQueryChange={setTrackerSearchQuery}
          hideFound={trackerHideFound}
          onHideFoundChange={setTrackerHideFound}
        />
      )}

      {!loadingMultidata && multidata && spoilerData !== null && activeTab === 'player-log' && (
        <PlayerLogTab
          spoilerData={spoilerData}
          logEvents={logEvents}
          playerColors={playerColors}
          selectedPlayer={selectedPlayer}
          onSelectedPlayerChange={setSelectedPlayer}
          receiving={playerLogReceiving}
          onReceivingChange={setPlayerLogReceiving}
          sending={playerLogSending}
          onSendingChange={setPlayerLogSending}
          searchQuery={playerLogSearchQuery}
          onSearchQueryChange={setPlayerLogSearchQuery}
        />
      )}

      {!loadingMultidata && multidata && spoilerData !== null && activeTab === 'configs' && (
        <PlayerConfigs
          players={spoilerData.players}
          playerColors={playerColors}
          warnings={spoilerData.warnings}
        />
      )}

      {!loadingMultidata && multidata && spoilerData !== null && activeTab === 'log' && (
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
