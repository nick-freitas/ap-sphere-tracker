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

// GitHub API endpoint for the most recent successful run of the
// Fetch Tracker Log workflow. Used to power the "Log updated" header
// display: it tells us when the hourly auto-update action last ran,
// even when the run found no tracker changes to commit. This is the
// key signal that distinguishes "action is alive, just no new data"
// from "action has silently broken and stopped running" — a failure
// mode we've hit before and want to make visible going forward.
//
// Hardcoded for this specific deployment. If you fork the repo, update
// the owner/repo/workflow segments to match your own.
const ACTION_RUNS_URL =
  'https://api.github.com/repos/nick-freitas/ap-sphere-tracker' +
  '/actions/workflows/fetch-tracker.yml/runs?status=success&per_page=1'

async function fetchLatestActionRunTime() {
  try {
    const res = await fetch(ACTION_RUNS_URL)
    if (!res.ok) return null
    const data = await res.json()
    const run = data?.workflow_runs?.[0]
    if (!run?.updated_at) return null
    const date = new Date(run.updated_at)
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

// Given any number of nullable Dates, return the latest one, or null if all
// are null. Used when we have multiple independent sources of "when was this
// updated" and want whichever one has the most recent moment.
function latestDate(...dates) {
  let best = null
  for (const d of dates) {
    if (d && (!best || d > best)) best = d
  }
  return best
}

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [loadingMultidata, setLoadingMultidata] = useState(true)
  const [checkedLocations, setCheckedLocations] = useState(new Map())
  const [hints, setHints] = useState([])
  const [lastCheckTime, setLastCheckTime] = useState(null)
  // Date the current tracker log was last "updated." For the default load
  // path, this comes from the HTTP Last-Modified response header on
  // public/default-tracker.txt (set by whatever served the file — GitHub
  // Pages, vite dev, etc.). For user uploads it's new Date() at upload
  // time. Always a Date or null.
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null)
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

    // Default tracker load: combine two independent sources for "when was
    // this last updated" and use whichever is most recent.
    //
    //   1. HTTP Last-Modified header on public/default-tracker.txt — the
    //      file's mtime on whatever serves it (GitHub Pages in prod, Vite
    //      dev locally). Advances only when the file is rewritten and
    //      redeployed, which for GitHub Pages happens on every push.
    //
    //   2. GitHub Actions API: updated_at of the most recent successful
    //      run of the Fetch Tracker Log workflow. Advances on every
    //      scheduled run (every 30 min), including runs that found no
    //      tracker changes and skipped the commit step. This is the
    //      action-health heartbeat — it tells us "the action is alive,"
    //      separate from whether the content actually changed.
    //
    // Taking max(source 1, source 2) means:
    //   - If the action ran recently but found no changes, source 2
    //     advances while source 1 is frozen → we show source 2.
    //   - If someone manually pushes a newer tracker.txt outside the
    //     action flow, source 1 advances while source 2 is frozen at
    //     whenever the action last ran → we show source 1.
    //   - If both are current (normal case), source 1 ≈ source 2 and
    //     either answer is correct.
    Promise.all([
      fetch('/ap-sphere-tracker/default-tracker.txt'),
      fetchLatestActionRunTime(),
    ])
      .then(async ([fileRes, actionTime]) => {
        if (!fileRes.ok) return null
        const lastMod = fileRes.headers.get('last-modified')
        const fileTime = lastMod ? new Date(lastMod) : null
        const text = await fileRes.text()
        const updatedAt = latestDate(fileTime, actionTime) || new Date()
        return { text, updatedAt }
      })
      .then((data) => {
        if (data == null) return
        handleTrackerText(data.text, data.updatedAt)
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

  // updatedAt is an optional Date. Startup passes it from the fetch's
  // HTTP Last-Modified header; user uploads omit it and default to new
  // Date() ("now"). This keeps the "Log updated" header display paired
  // with whatever file is actually loaded — no drift possible.
  function handleTrackerText(text, updatedAt = new Date()) {
    setRawTrackerText(text)
    const { checkedLocations: parsed, lastCheckTime: lct, hints: parsedHints, events } = parseTrackerLog(text)
    setCheckedLocations(parsed)
    setLastCheckTime(lct)
    setLastUpdatedTime(updatedAt)
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

  // Map each player to the sphere number of their very last playthrough
  // entry. Walks the RAW (pre-filter) playthrough so every entry the spoiler
  // generator wrote counts — including goal / win-condition pseudo-entries
  // like `Ganon → Triforce` that the event filter strips out. Without this,
  // a player's "last sphere" would be their highest sphere containing a
  // surviving real check, which misses the goal sphere entirely for games
  // whose goal is a pseudo-location.
  const playerLastSphere = useMemo(() => {
    if (!rawParsed) return {}
    const last = {}
    for (const sphere of rawParsed.spheres) {
      if (sphere.number === 0) continue
      for (const entry of sphere.entries) {
        last[entry.locationOwner] = sphere.number
      }
    }
    return last
  }, [rawParsed])

  // Set of sphere numbers that contain at least one player's very-last
  // playthrough entry. Spheres in this set render with a "Goal Sphere N"
  // label and stay visible even when the event filter emptied them (e.g.
  // Andrew's sphere 37, whose only entry is his goal `Ganon → Triforce`
  // which the filter drops as a pseudo-location).
  const goalSphereNumbers = useMemo(
    () => new Set(Object.values(playerLastSphere)),
    [playerLastSphere],
  )

  // Map of sphere number → array of goal entries to display on that sphere's
  // card. These are the per-player goal/win-condition entries that the event
  // filter *dropped* (pseudo-locations like `Ganon → Triforce`,
  // `Final Xemnas Event Location → Victory`, etc.). We re-surface them as
  // display-only rows so each player's goal is visible on the sphere board
  // even though they aren't trackable checks.
  //
  // Passed as a side-channel prop rather than injected into
  // `spoilerData.spheres` so that analyzeSpheres, the progression walker,
  // sphereCompletionTime, and player breakdowns all keep using their
  // original (tracking-accurate) entry sets.
  //
  // The rule for each player:
  //   1. Walk their raw playthrough entries top-to-bottom; the last one
  //      identifies their "goal sphere" (the sphere containing their
  //      very-last playthrough entry).
  //   2. Within that goal sphere, pick the *last filtered-out* entry they
  //      own as their goal entry. This correctly handles the case where a
  //      player has both a filtered goal entry and a real check in the
  //      same sphere (e.g. Nick's sphere 31, where
  //      `Ganon Defeated → Game Completed` is filtered out but
  //      `Ganon's Castle Fire Trial Pot 2` is a real check listed after
  //      it — we want the former).
  //   3. If no filtered entry for the player exists in their goal sphere
  //      (e.g. Ryot's `Kastle KAOS` in DKC3, which is a real check, or
  //      TNNPE's `Chaos Blade` real check in Dark Souls III), no injection
  //      is needed — the real entry is already visible in the sphere's
  //      normal missing/completed tables.
  const goalEntriesBySphere = useMemo(() => {
    const bySphere = new Map()
    if (!rawParsed || !spoilerData) return bySphere

    // Step 1: find each player's goal sphere (= sphere of their very last
    // raw playthrough entry, regardless of filter status).
    const playerGoalSphere = {}
    for (const sphere of rawParsed.spheres) {
      if (sphere.number === 0) continue
      for (const entry of sphere.entries) {
        playerGoalSphere[entry.locationOwner] = sphere.number
      }
    }

    // Step 2: for each player, within their goal sphere, pick the last
    // entry that was filtered OUT (present in raw, absent from filtered).
    for (const [player, sphereNumber] of Object.entries(playerGoalSphere)) {
      const rawSphere = rawParsed.spheres.find((s) => s.number === sphereNumber)
      const filteredSphere = spoilerData.spheres.find((s) => s.number === sphereNumber)
      if (!rawSphere) continue

      const presentKeys = new Set()
      if (filteredSphere) {
        for (const e of filteredSphere.entries) {
          presentKeys.add(`${e.locationOwner}\u0000${e.location}`)
        }
      }

      let goalEntry = null
      for (const e of rawSphere.entries) {
        if (e.locationOwner !== player) continue
        const key = `${e.locationOwner}\u0000${e.location}`
        if (!presentKeys.has(key)) {
          goalEntry = e
        }
      }

      if (goalEntry) {
        if (!bySphere.has(sphereNumber)) bySphere.set(sphereNumber, [])
        bySphere.get(sphereNumber).push(goalEntry)
      }
    }

    return bySphere
  }, [rawParsed, spoilerData])

  // Map of player name → { done, total, pct } across all filtered
  // playthrough entries. Mirrors the calculation in PlayerStats.jsx so
  // SphereCard can decide whether an empty goal sphere should render as
  // "complete" (i.e. all of its goal owners have finished their games,
  // detectable trivially because done === total).
  const playerPct = useMemo(() => {
    const result = {}
    if (!spoilerData) return result
    const totals = {}
    const checked = {}
    for (const sphere of spoilerData.spheres) {
      for (const entry of sphere.entries) {
        const owner = entry.locationOwner
        totals[owner] = (totals[owner] || 0) + 1
        const playerChecks = checkedLocations.get(owner)
        if (playerChecks && playerChecks.has(entry.location)) {
          checked[owner] = (checked[owner] || 0) + 1
        }
      }
    }
    for (const p of spoilerData.players) {
      const total = totals[p.name] || 0
      const done = checked[p.name] || 0
      const pct = total === 0 ? 100 : Math.round((done / total) * 100)
      result[p.name] = { done, total, pct }
    }
    return result
  }, [spoilerData, checkedLocations])

  // Map each player to the timestamp of their "has completed their goal."
  // notice — i.e. the moment they actually beat the game. Used by PlayerStats
  // to rank completed players in the order they finished (earliest first), and
  // by the ⭐ tooltip / SphereCard's pure-goal-sphere completion timestamp.
  // Take the EARLIEST goal event per player; the line should only appear once,
  // but if a server replays its log we want the original completion moment.
  // Timestamps are strings like "2026-04-10 22:59:01,934" which sort correctly
  // with standard string comparison since the format is fixed-width left-to-right.
  const playerCompletionTime = useMemo(() => {
    const earliest = {}
    for (const event of logEvents) {
      if (event.type !== 'goal' || !event.timestamp || !event.sender) continue
      const current = earliest[event.sender]
      if (!current || event.timestamp < current) {
        earliest[event.sender] = event.timestamp
      }
    }
    return earliest
  }, [logEvents])

  // Map each sphere number to the raw timestamp when its last remaining check
  // was collected — i.e. the moment the sphere went from incomplete to
  // complete. Only populated for spheres where every entry has a matching
  // 'sent' event in the tracker log. Consumed by SphereCard to render a
  // tooltip on the green checkmark.
  const sphereCompletionTime = useMemo(() => {
    const result = new Map()
    if (!spoilerData || logEvents.length === 0) return result

    // Build a (sender, location) → earliest-timestamp index from the log.
    // Use the first occurrence because a location can only be checked once;
    // any later "resend" would be a rehydration artifact, not a new check.
    const checkTs = new Map()
    for (const event of logEvents) {
      if (event.type !== 'sent' || !event.timestamp) continue
      const key = `${event.sender}\u0000${event.location}`
      if (!checkTs.has(key)) checkTs.set(key, event.timestamp)
    }

    for (const sphere of spoilerData.spheres) {
      if (sphere.number === 0 || sphere.entries.length === 0) continue
      let maxTs = null
      let allPresent = true
      for (const entry of sphere.entries) {
        const ts = checkTs.get(`${entry.locationOwner}\u0000${entry.location}`)
        if (!ts) {
          allPresent = false
          break
        }
        if (!maxTs || ts > maxTs) maxTs = ts
      }
      if (allPresent && maxTs) result.set(sphere.number, maxTs)
    }
    return result
  }, [spoilerData, logEvents])

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
        lastUpdatedTime={lastUpdatedTime}
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
                  isGoalSphere={goalSphereNumbers.has(result.sphereNumber)}
                  goalEntries={goalEntriesBySphere.get(result.sphereNumber) || []}
                  playerPct={playerPct}
                  playerCompletionTime={playerCompletionTime}
                  spheresBehind={spheresBehind}
                  capInfo={capInfo}
                  sphereEntries={spoilerData.spheres[i]?.entries || []}
                  checkedLocations={checkedLocations}
                  playerLastSphere={playerLastSphere}
                  showSpoilers={showSpoilers}
                  displayThreshold={threshold}
                  completionTimestamp={sphereCompletionTime.get(result.sphereNumber)}
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
