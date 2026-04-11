# Archipelago Sphere Analyzer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side React web app that cross-references an Archipelago spoiler log with a live tracker log to show missing checks per sphere, gated by a configurable completion threshold.

**Architecture:** Single-page React app with three layers: parsers (spoiler + tracker text parsing), engine (sphere analysis logic), and UI components. All processing is client-side. The tracker log is fetched via URL with 60-second auto-refresh and CORS proxy fallback.

**Tech Stack:** React 18, Vite, Vitest, plain CSS, deployed to GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-04-11-sphere-analyzer-design.md`

---

## File Structure

```
src/
  parsers/
    spoilerParser.js          — parse spoiler log text → players + spheres
    spoilerParser.test.js     — tests for spoiler parser
    trackerParser.js          — parse tracker log text → checked locations per player
    trackerParser.test.js     — tests for tracker parser
  engine/
    sphereAnalyzer.js         — cross-reference parsed data → sphere results
    sphereAnalyzer.test.js    — tests for sphere analyzer
  components/
    Header.jsx                — app title, threshold slider, extended toggle
    Header.css
    InputSection.jsx          — spoiler file upload, tracker URL input, status
    InputSection.css
    SphereCard.jsx            — single sphere card with progress bar + missing checks
    SphereCard.css
    MissingChecksTable.jsx    — table rendering missing checks for a sphere
    MissingChecksTable.css
    PlayerLegend.jsx          — player color legend and filter
    PlayerLegend.css
  hooks/
    useTrackerAutoRefresh.js  — fetch tracker URL, auto-refresh every 60s, CORS fallback
  App.jsx                     — root component, state management, wiring
  App.css                     — app-level layout styles
  index.css                   — global styles, CSS variables
  main.jsx                    — Vite entry point
index.html                    — Vite HTML template
vite.config.js                — Vite config with base path for GitHub Pages
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `src/App.css`

- [ ] **Step 1: Initialize Vite + React project**

Run:
```bash
cd /Users/nickfreitas/dev/archipelago-sphere
npm create vite@latest . -- --template react
```

If prompted about non-empty directory, confirm yes.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install
npm install -D vitest
```

- [ ] **Step 3: Add Vitest config to vite.config.js**

Replace `vite.config.js` with:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/archipelago-sphere/',
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Clean up default App**

Replace `src/App.jsx` with:

```jsx
function App() {
  return (
    <div className="app">
      <h1>Archipelago Sphere Analyzer</h1>
    </div>
  )
}

export default App
```

Replace `src/App.css` with:

```css
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}
```

Replace `src/index.css` with:

```css
:root {
  --color-bg: #1a1a2e;
  --color-surface: #16213e;
  --color-surface-alt: #0f3460;
  --color-text: #e0e0e0;
  --color-text-muted: #a0a0a0;
  --color-accent: #e94560;
  --color-success: #4ecca3;
  --color-warning: #f0a500;
  --color-border: #2a2a4a;

  --player-0: #e94560;
  --player-1: #4ecca3;
  --player-2: #f0a500;
  --player-3: #3498db;
  --player-4: #9b59b6;
  --player-5: #e67e22;
  --player-6: #1abc9c;
  --player-7: #e74c3c;
  --player-8: #2ecc71;
  --player-9: #f39c12;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
}
```

Delete `src/assets/` directory and any default Vite logo/SVG files if present.

- [ ] **Step 6: Verify dev server starts**

Run:
```bash
npm run dev
```
Expected: Dev server starts, page shows "Archipelago Sphere Analyzer" at `http://localhost:5173/archipelago-sphere/`.

- [ ] **Step 7: Commit**

```bash
git init
echo "node_modules\ndist\n.DS_Store" > .gitignore
git add .
git commit -m "feat: scaffold Vite + React project with Vitest"
```

---

### Task 2: Spoiler Log Parser

**Files:**
- Create: `src/parsers/spoilerParser.js`, `src/parsers/spoilerParser.test.js`

The spoiler log is plain text with this structure:
- Header: `Player N: Name` lines followed by `Game: GameName`
- `Playthrough:` section with numbered sphere blocks `N: { entries }`
- Each sphere entry: `  Location Name (PlayerName): Item Name (OwnerPlayerName)`
- Location and item names can contain parentheses (e.g., `Missile (blue Brinstar bottom)`, `Small Key (Forest Temple)`)
- The LAST parenthetical on each side of `: ` is always the player/owner name

- [ ] **Step 1: Write failing tests for player parsing**

Create `src/parsers/spoilerParser.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { parseSpoilerLog } from './spoilerParser'

const SAMPLE_SPOILER = `Archipelago Version 0.6.5  -  Seed: 12345

Filling Algorithm:               balanced
Players:                         3

Player 1: Alice
Game:                            Ocarina of Time
Logic Rules:                     Glitchless

Player 2: Bob
Game:                            Super Metroid
Logic Rules:                     Glitchless

Player 3: Charlie
Game:                            A Link to the Past
Logic Rules:                     Glitchless


Entrances:


Locations:

KF Kokiri Sword Chest (Alice): Kokiri Sword (Alice)
Morphing Ball (Bob): Morph Ball (Bob)
Sanctuary (Charlie): Big Key (Hyrule Castle) (Charlie)


Playthrough:

0: {

}
1: {
  KF Links House Pot (Alice): Hookshot (Bob)
  Location B (Alice): Bombs (5) (Alice)
  Morphing Ball (Bob): Progressive Sword (Charlie)
  Missile (blue Brinstar middle) (Bob): Red Rupee (Alice)
}
2: {
  Sanctuary (Charlie): Bow (Alice)
  Small Key Chest (Charlie): Small Key (Forest Temple) (Alice)
}

Paths:
`

describe('parseSpoilerLog', () => {
  describe('player parsing', () => {
    it('extracts all players with slot, name, and game', () => {
      const result = parseSpoilerLog(SAMPLE_SPOILER)
      expect(result.players).toEqual([
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'Super Metroid' },
        { slot: 3, name: 'Charlie', game: 'A Link to the Past' },
      ])
    })
  })

  describe('sphere parsing', () => {
    it('parses sphere 0 as empty', () => {
      const result = parseSpoilerLog(SAMPLE_SPOILER)
      expect(result.spheres[0]).toEqual({
        number: 0,
        entries: [],
      })
    })

    it('parses sphere 1 entries with correct fields', () => {
      const result = parseSpoilerLog(SAMPLE_SPOILER)
      expect(result.spheres[1].number).toBe(1)
      expect(result.spheres[1].entries).toContainEqual({
        location: 'KF Links House Pot',
        locationOwner: 'Alice',
        item: 'Hookshot',
        itemOwner: 'Bob',
      })
    })

    it('handles items with parentheses in their name', () => {
      const result = parseSpoilerLog(SAMPLE_SPOILER)
      expect(result.spheres[1].entries).toContainEqual({
        location: 'Location B',
        locationOwner: 'Alice',
        item: 'Bombs (5)',
        itemOwner: 'Alice',
      })
    })

    it('handles locations with parentheses in their name', () => {
      const result = parseSpoilerLog(SAMPLE_SPOILER)
      expect(result.spheres[1].entries).toContainEqual({
        location: 'Missile (blue Brinstar middle)',
        locationOwner: 'Bob',
        item: 'Red Rupee',
        itemOwner: 'Alice',
      })
    })

    it('handles items like Small Key (DungeonName)', () => {
      const result = parseSpoilerLog(SAMPLE_SPOILER)
      expect(result.spheres[2].entries).toContainEqual({
        location: 'Small Key Chest',
        locationOwner: 'Charlie',
        item: 'Small Key (Forest Temple)',
        itemOwner: 'Alice',
      })
    })

    it('returns correct number of spheres', () => {
      const result = parseSpoilerLog(SAMPLE_SPOILER)
      expect(result.spheres).toHaveLength(3)
    })

    it('returns correct entry count per sphere', () => {
      const result = parseSpoilerLog(SAMPLE_SPOILER)
      expect(result.spheres[1].entries).toHaveLength(4)
      expect(result.spheres[2].entries).toHaveLength(2)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/parsers/spoilerParser.test.js`
Expected: FAIL — `parseSpoilerLog` is not defined / module not found.

- [ ] **Step 3: Implement the spoiler parser**

Create `src/parsers/spoilerParser.js`:

```javascript
export function parseSpoilerLog(text) {
  const players = parsePlayers(text)
  const spheres = parseSpheres(text)
  return { players, spheres }
}

function parsePlayers(text) {
  const players = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const playerMatch = lines[i].match(/^Player (\d+): (.+)$/)
    if (playerMatch) {
      const slot = parseInt(playerMatch[1], 10)
      const name = playerMatch[2]
      // Find the next "Game:" line
      let game = ''
      for (let j = i + 1; j < lines.length && j < i + 20; j++) {
        const gameMatch = lines[j].match(/^Game:\s+(.+)$/)
        if (gameMatch) {
          game = gameMatch[1]
          break
        }
      }
      players.push({ slot, name, game })
    }
  }

  return players
}

function parseSpheres(text) {
  // Find the Playthrough section
  const playthroughIdx = text.indexOf('\nPlaythrough:\n')
  if (playthroughIdx === -1) return []

  const playthroughText = text.substring(playthroughIdx)

  // Find where Playthrough ends (next major section or end of file)
  const nextSectionMatch = playthroughText.substring(1).match(/\n[A-Z][a-z]+:\n/)
  const playthroughEnd = nextSectionMatch
    ? nextSectionMatch.index + 1
    : playthroughText.length
  const playthroughBlock = playthroughText.substring(0, playthroughEnd)

  const spheres = []
  const sphereRegex = /(\d+): \{([^}]*)\}/g
  let match

  while ((match = sphereRegex.exec(playthroughBlock)) !== null) {
    const number = parseInt(match[1], 10)
    const block = match[2]
    const entries = parseSphereEntries(block)
    spheres.push({ number, entries })
  }

  return spheres
}

function parseSphereEntries(block) {
  const entries = []
  const lines = block.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.includes(': ')) continue

    // Split on ): to separate location(player) from item(owner)
    // Find the ): that separates the two halves
    const separatorIdx = findSeparatorIndex(trimmed)
    if (separatorIdx === -1) continue

    const locationSide = trimmed.substring(0, separatorIdx + 1) // includes closing paren
    const itemSide = trimmed.substring(separatorIdx + 3) // skip "): "

    const locationParsed = parseNameAndPlayer(locationSide)
    const itemParsed = parseNameAndPlayer(itemSide)

    if (locationParsed && itemParsed) {
      entries.push({
        location: locationParsed.name,
        locationOwner: locationParsed.player,
        item: itemParsed.name,
        itemOwner: itemParsed.player,
      })
    }
  }

  return entries
}

function findSeparatorIndex(line) {
  // Find "): " where it separates location(player) from item(owner)
  // The separator is always "): " — the closing paren of the player name followed by ": "
  // We need the correct one: it's the ): that is followed by the item side
  // Strategy: find all "): " occurrences, the correct one separates into two valid "Name (Player)" halves
  let idx = -1
  let searchFrom = 0

  while (true) {
    const found = line.indexOf('): ', searchFrom)
    if (found === -1) break

    const locationSide = line.substring(0, found + 1)
    const itemSide = line.substring(found + 3)

    if (parseNameAndPlayer(locationSide) && parseNameAndPlayer(itemSide)) {
      return found
    }

    searchFrom = found + 1
  }

  return -1
}

function parseNameAndPlayer(str) {
  // Parse "SomeName (PlayerName)" — the last " (" opens the player name paren
  const lastParenOpen = str.lastIndexOf(' (')
  if (lastParenOpen === -1) return null
  if (!str.endsWith(')')) return null

  const name = str.substring(0, lastParenOpen)
  const player = str.substring(lastParenOpen + 2, str.length - 1)

  if (!name || !player) return null
  return { name, player }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/parsers/spoilerParser.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parsers/spoilerParser.js src/parsers/spoilerParser.test.js
git commit -m "feat: add spoiler log parser with TDD tests"
```

---

### Task 3: Tracker Log Parser

**Files:**
- Create: `src/parsers/trackerParser.js`, `src/parsers/trackerParser.test.js`

The tracker log is a server event log. Lines we care about match:
`[timestamp]: (Team #N) SenderPlayer sent ItemName to ReceiverPlayer (LocationName)`

The sender is the player who checked the location. We build a `Map<playerName, Set<locationName>>`.

- [ ] **Step 1: Write failing tests**

Create `src/parsers/trackerParser.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { parseTrackerLog } from './trackerParser'

const SAMPLE_TRACKER = `[2026-04-10 23:00:00,000]: Loading embedded data package for game Ocarina of Time
[2026-04-10 23:01:00,000]: Notice (all): Alice (Team #1) playing Ocarina of Time has joined. Client(0.6.5), ['AP'].
[2026-04-10 23:02:00,000]: (Team #1) Alice sent Hookshot to Bob (KF Links House Pot)
[2026-04-10 23:03:00,000]: (Team #1) Bob sent Red Rupee to Alice (Missile (blue Brinstar middle))
[2026-04-10 23:04:00,000]: (Team #1) Alice sent Bombs (5) to Alice (Location B)
[2026-04-10 23:05:00,000]: Notice (Team #1): [Hint]: Alice's Bow is at Sanctuary in Charlie's World. (unspecified)
[2026-04-10 23:06:00,000]: (Team #1) Charlie sent Bow to Alice (Sanctuary)
[2026-04-10 23:07:00,000]: (Team #1) Bob sent Piece of Heart (WINNER) to Bob (Some Location)
`

describe('parseTrackerLog', () => {
  it('returns a map of player names to sets of checked locations', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result).toBeInstanceOf(Map)
  })

  it('extracts checked locations for each player', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.get('Alice')).toEqual(new Set(['KF Links House Pot', 'Location B']))
    expect(result.get('Bob')).toEqual(new Set(['Missile (blue Brinstar middle)', 'Some Location']))
    expect(result.get('Charlie')).toEqual(new Set(['Sanctuary']))
  })

  it('ignores non-send lines (notices, hints, loading)', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    // Should only have 3 players, not entries from notice/hint lines
    expect(result.size).toBe(3)
  })

  it('handles items with parentheses like Bombs (5)', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.get('Alice').has('Location B')).toBe(true)
  })

  it('handles items with parentheses like Piece of Heart (WINNER)', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.get('Bob').has('Some Location')).toBe(true)
  })

  it('handles locations with parentheses like Missile (blue Brinstar middle)', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.get('Bob').has('Missile (blue Brinstar middle)')).toBe(true)
  })

  it('returns empty map for empty input', () => {
    const result = parseTrackerLog('')
    expect(result.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/parsers/trackerParser.test.js`
Expected: FAIL — `parseTrackerLog` is not defined.

- [ ] **Step 3: Implement the tracker parser**

Create `src/parsers/trackerParser.js`:

```javascript
export function parseTrackerLog(text) {
  const checkedLocations = new Map()

  if (!text) return checkedLocations

  const lines = text.split('\n')

  for (const line of lines) {
    const parsed = parseSendLine(line)
    if (!parsed) continue

    const { sender, location } = parsed

    if (!checkedLocations.has(sender)) {
      checkedLocations.set(sender, new Set())
    }
    checkedLocations.get(sender).add(location)
  }

  return checkedLocations
}

function parseSendLine(line) {
  // Match: [timestamp]: (Team #N) Sender sent Item to Receiver (Location)
  // The timestamp prefix is optional (handle both with and without)
  const match = line.match(
    /\(Team #\d+\) (.+?) sent .+ to .+? \((.+)\)$/
  )

  if (!match) return null

  return {
    sender: match[1],
    location: match[2],
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/parsers/trackerParser.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parsers/trackerParser.js src/parsers/trackerParser.test.js
git commit -m "feat: add tracker log parser with TDD tests"
```

---

### Task 4: Sphere Analyzer Engine

**Files:**
- Create: `src/engine/sphereAnalyzer.js`, `src/engine/sphereAnalyzer.test.js`

The engine takes the parsed spoiler data (players + spheres) and the checked locations map, and produces an array of sphere results with completion percentage and missing checks.

- [ ] **Step 1: Write failing tests**

Create `src/engine/sphereAnalyzer.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { analyzeSpheres } from './sphereAnalyzer'

const spoilerData = {
  players: [
    { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
    { slot: 2, name: 'Bob', game: 'Super Metroid' },
    { slot: 3, name: 'Charlie', game: 'A Link to the Past' },
  ],
  spheres: [
    { number: 0, entries: [] },
    {
      number: 1,
      entries: [
        { location: 'Loc A', locationOwner: 'Alice', item: 'Hookshot', itemOwner: 'Bob' },
        { location: 'Loc B', locationOwner: 'Alice', item: 'Bombs', itemOwner: 'Alice' },
        { location: 'Loc C', locationOwner: 'Bob', item: 'Sword', itemOwner: 'Charlie' },
        { location: 'Loc D', locationOwner: 'Bob', item: 'Shield', itemOwner: 'Alice' },
      ],
    },
    {
      number: 2,
      entries: [
        { location: 'Loc E', locationOwner: 'Charlie', item: 'Bow', itemOwner: 'Alice' },
        { location: 'Loc F', locationOwner: 'Charlie', item: 'Lamp', itemOwner: 'Bob' },
      ],
    },
  ],
}

describe('analyzeSpheres', () => {
  it('calculates completion percentage correctly', () => {
    const checked = new Map([
      ['Alice', new Set(['Loc A', 'Loc B'])],
      ['Bob', new Set(['Loc C'])],
    ])

    const results = analyzeSpheres(spoilerData, checked)
    // Sphere 1: 3 of 4 checked = 75%
    expect(results[1].completionPercent).toBe(75)
    // Sphere 2: 0 of 2 checked = 0%
    expect(results[2].completionPercent).toBe(0)
  })

  it('returns missing checks for each sphere', () => {
    const checked = new Map([
      ['Alice', new Set(['Loc A', 'Loc B'])],
      ['Bob', new Set(['Loc C'])],
    ])

    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].missingChecks).toEqual([
      { player: 'Bob', location: 'Loc D', item: 'Shield', itemOwner: 'Alice' },
    ])
  })

  it('returns empty missing checks for 100% complete sphere', () => {
    const checked = new Map([
      ['Alice', new Set(['Loc A', 'Loc B'])],
      ['Bob', new Set(['Loc C', 'Loc D'])],
    ])

    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].missingChecks).toEqual([])
    expect(results[1].completionPercent).toBe(100)
  })

  it('handles sphere 0 (empty) correctly', () => {
    const checked = new Map()
    const results = analyzeSpheres(spoilerData, checked)
    expect(results[0].completionPercent).toBe(100)
    expect(results[0].missingChecks).toEqual([])
    expect(results[0].totalChecks).toBe(0)
  })

  it('handles no tracker data (empty map)', () => {
    const checked = new Map()
    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].completionPercent).toBe(0)
    expect(results[1].missingChecks).toHaveLength(4)
  })

  it('returns totalChecks and completedChecks counts', () => {
    const checked = new Map([
      ['Alice', new Set(['Loc A'])],
    ])

    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].totalChecks).toBe(4)
    expect(results[1].completedChecks).toBe(1)
  })

  it('preserves sphere number in results', () => {
    const checked = new Map()
    const results = analyzeSpheres(spoilerData, checked)
    expect(results[0].sphereNumber).toBe(0)
    expect(results[1].sphereNumber).toBe(1)
    expect(results[2].sphereNumber).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/sphereAnalyzer.test.js`
Expected: FAIL — `analyzeSpheres` is not defined.

- [ ] **Step 3: Implement the sphere analyzer**

Create `src/engine/sphereAnalyzer.js`:

```javascript
export function analyzeSpheres(spoilerData, checkedLocations) {
  return spoilerData.spheres.map((sphere) => {
    const totalChecks = sphere.entries.length
    let completedChecks = 0
    const missingChecks = []

    for (const entry of sphere.entries) {
      const playerChecks = checkedLocations.get(entry.locationOwner)
      const isChecked = playerChecks && playerChecks.has(entry.location)

      if (isChecked) {
        completedChecks++
      } else {
        missingChecks.push({
          player: entry.locationOwner,
          location: entry.location,
          item: entry.item,
          itemOwner: entry.itemOwner,
        })
      }
    }

    const completionPercent =
      totalChecks === 0 ? 100 : Math.round((completedChecks / totalChecks) * 100)

    return {
      sphereNumber: sphere.number,
      totalChecks,
      completedChecks,
      completionPercent,
      missingChecks,
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/sphereAnalyzer.test.js`
Expected: All 7 tests PASS.

- [ ] **Step 5: Run all tests together**

Run: `npx vitest run`
Expected: All tests across all 3 test files PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/sphereAnalyzer.js src/engine/sphereAnalyzer.test.js
git commit -m "feat: add sphere analyzer engine with TDD tests"
```

---

### Task 5: InputSection Component

**Files:**
- Create: `src/components/InputSection.jsx`, `src/components/InputSection.css`
- Modify: `src/App.jsx`

This component handles spoiler log file upload and tracker URL input.

- [ ] **Step 1: Create InputSection component**

Create `src/components/InputSection.jsx`:

```jsx
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
          {trackerStatus.nextRefresh && (
            <span className="refresh-countdown">
              {' '}| Next refresh: {trackerStatus.nextRefresh}s
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Style the InputSection**

Create `src/components/InputSection.css`:

```css
.input-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.input-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.input-group {
  flex: 1;
  min-width: 250px;
}

.input-group label {
  display: block;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.upload-btn {
  background: var(--color-surface-alt);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  width: 100%;
  font-size: 0.9rem;
}

.upload-btn:hover {
  background: var(--color-accent);
}

.url-input-row {
  display: flex;
  gap: 0.5rem;
}

.url-input-row input {
  flex: 1;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.9rem;
}

.url-input-row button {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.tracker-status {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.tracker-status.error {
  color: var(--color-accent);
}

.refresh-countdown {
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: Wire InputSection into App**

Replace `src/App.jsx`:

```jsx
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
```

- [ ] **Step 4: Verify in browser**

Run dev server (`npm run dev`) and test:
1. Upload a spoiler log `.txt` file — should show player/sphere count.
2. Enter a URL and click Load — should set the URL (no fetch logic yet).

- [ ] **Step 5: Commit**

```bash
git add src/components/InputSection.jsx src/components/InputSection.css src/App.jsx
git commit -m "feat: add InputSection component with file upload and URL input"
```

---

### Task 6: Tracker Auto-Refresh Hook

**Files:**
- Create: `src/hooks/useTrackerAutoRefresh.js`
- Modify: `src/App.jsx`

Fetches the tracker URL, parses the response, retries via CORS proxy if direct fetch fails, and refreshes every 60 seconds.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useTrackerAutoRefresh.js`:

```javascript
import { useState, useEffect, useRef, useCallback } from 'react'
import { parseTrackerLog } from '../parsers/trackerParser'

const REFRESH_INTERVAL = 60000
const CORS_PROXY = 'https://corsproxy.io/?'

export function useTrackerAutoRefresh(url) {
  const [checkedLocations, setCheckedLocations] = useState(new Map())
  const [status, setStatus] = useState(null)
  const [usingProxy, setUsingProxy] = useState(false)
  const intervalRef = useRef(null)
  const countdownRef = useRef(null)
  const [countdown, setCountdown] = useState(null)

  const fetchTracker = useCallback(async () => {
    if (!url) return

    try {
      let response
      const fetchUrl = usingProxy ? `${CORS_PROXY}${encodeURIComponent(url)}` : url

      try {
        response = await fetch(fetchUrl)
      } catch (err) {
        if (!usingProxy) {
          // Try with CORS proxy
          setUsingProxy(true)
          response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`)
        } else {
          throw err
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const text = await response.text()
      const parsed = parseTrackerLog(text)
      setCheckedLocations(parsed)
      setStatus({
        lastFetch: new Date().toLocaleTimeString(),
        usingProxy,
        error: null,
      })
      setCountdown(60)
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        error: err.message,
      }))
    }
  }, [url, usingProxy])

  useEffect(() => {
    if (!url) {
      setStatus(null)
      setCountdown(null)
      return
    }

    // Initial fetch
    fetchTracker()

    // Set up refresh interval
    intervalRef.current = setInterval(fetchTracker, REFRESH_INTERVAL)

    // Set up countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 60))
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
    }
  }, [url, fetchTracker])

  const statusWithCountdown = status
    ? { ...status, nextRefresh: countdown }
    : null

  return { checkedLocations, status: statusWithCountdown }
}
```

- [ ] **Step 2: Wire the hook into App**

Update `src/App.jsx`:

```jsx
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
```

- [ ] **Step 3: Test in browser with a real tracker URL**

Run dev server. Upload a spoiler log and enter a tracker log URL. Verify:
1. Status shows last fetch time
2. Countdown ticks down from 60
3. CORS proxy fallback works if direct fetch fails
4. Player count updates after fetch

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTrackerAutoRefresh.js src/App.jsx
git commit -m "feat: add tracker auto-refresh hook with CORS proxy fallback"
```

---

### Task 7: Header Component

**Files:**
- Create: `src/components/Header.jsx`, `src/components/Header.css`
- Modify: `src/App.jsx`

Contains app title, threshold slider (default 75%), and extended toggle.

- [ ] **Step 1: Create Header component**

Create `src/components/Header.jsx`:

```jsx
import './Header.css'

export default function Header({
  threshold,
  onThresholdChange,
  extended,
  onExtendedChange,
}) {
  return (
    <header className="header">
      <h1 className="header-title">Archipelago Sphere Analyzer</h1>

      <div className="header-controls">
        <div className="threshold-control">
          <label htmlFor="threshold-slider">
            Threshold: <span className="threshold-value">{threshold}%</span>
          </label>
          <input
            id="threshold-slider"
            type="range"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
          />
        </div>

        <label className="toggle-control">
          <span>Extended</span>
          <input
            type="checkbox"
            checked={extended}
            onChange={(e) => onExtendedChange(e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Style the Header**

Create `src/components/Header.css`:

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 0;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.header-title {
  font-size: 1.3rem;
  color: var(--color-text);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.threshold-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.threshold-control label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.threshold-value {
  color: var(--color-accent);
  font-weight: bold;
  display: inline-block;
  min-width: 2.5em;
}

.threshold-control input[type="range"] {
  width: 120px;
  accent-color: var(--color-accent);
}

.toggle-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.toggle-control input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  width: 40px;
  height: 22px;
  background: var(--color-border);
  border-radius: 11px;
  position: relative;
  transition: background 0.2s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-text);
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.toggle-control input:checked + .toggle-slider {
  background: var(--color-accent);
}

.toggle-control input:checked + .toggle-slider::after {
  transform: translateX(18px);
}
```

- [ ] **Step 3: Wire Header into App and add threshold/extended state**

Update `src/App.jsx`:

```jsx
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
```

- [ ] **Step 4: Verify in browser**

Run dev server. Verify:
1. Threshold slider shows value, updates label in real time
2. Extended toggle switch animates between on/off states
3. Layout wraps nicely on smaller screens

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.jsx src/components/Header.css src/App.jsx
git commit -m "feat: add Header with threshold slider and extended toggle"
```

---

### Task 8: SphereCard and MissingChecksTable Components

**Files:**
- Create: `src/components/SphereCard.jsx`, `src/components/SphereCard.css`, `src/components/MissingChecksTable.jsx`, `src/components/MissingChecksTable.css`

SphereCard shows a single sphere with progress bar. If above threshold, it renders MissingChecksTable. If extended is on and this sphere qualifies, it also shows the next sphere's missing checks.

- [ ] **Step 1: Create MissingChecksTable component**

Create `src/components/MissingChecksTable.jsx`:

```jsx
import './MissingChecksTable.css'

export default function MissingChecksTable({ missingChecks, playerColors, hiddenPlayers }) {
  const filtered = hiddenPlayers
    ? missingChecks.filter((check) => !hiddenPlayers.has(check.player))
    : missingChecks

  if (filtered.length === 0) {
    return <p className="no-missing">All checks complete!</p>
  }

  return (
    <table className="missing-checks-table">
      <thead>
        <tr>
          <th>Player</th>
          <th>Location</th>
          <th>Item</th>
          <th>Item Owner</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((check, i) => (
          <tr key={i} style={{ borderLeftColor: playerColors[check.player] || '#888' }}>
            <td style={{ color: playerColors[check.player] || '#888' }}>
              {check.player}
            </td>
            <td>{check.location}</td>
            <td>{check.item}</td>
            <td style={{ color: playerColors[check.itemOwner] || '#888' }}>
              {check.itemOwner}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Style MissingChecksTable**

Create `src/components/MissingChecksTable.css`:

```css
.missing-checks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.missing-checks-table th {
  text-align: left;
  padding: 0.4rem 0.6rem;
  color: var(--color-text-muted);
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.missing-checks-table td {
  padding: 0.35rem 0.6rem;
}

.missing-checks-table tr {
  border-left: 3px solid transparent;
}

.missing-checks-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.no-missing {
  color: var(--color-success);
  font-size: 0.85rem;
  padding: 0.5rem 0;
}
```

- [ ] **Step 3: Create SphereCard component**

Create `src/components/SphereCard.jsx`:

```jsx
import MissingChecksTable from './MissingChecksTable'
import './SphereCard.css'

export default function SphereCard({
  result,
  threshold,
  extended,
  nextResult,
  playerColors,
  hiddenPlayers,
}) {
  const { sphereNumber, totalChecks, completedChecks, completionPercent, missingChecks } = result
  const isComplete = completionPercent === 100
  const meetsThreshold = completionPercent >= threshold

  if (totalChecks === 0) return null

  return (
    <div className={`sphere-card ${isComplete ? 'complete' : ''} ${meetsThreshold ? 'expanded' : 'dimmed'}`}>
      <div className="sphere-header">
        <span className="sphere-label">
          {isComplete && <span className="check-icon">&#10003; </span>}
          Sphere {sphereNumber}
        </span>
        <div className="sphere-progress-container">
          <div className="sphere-progress-bar">
            <div
              className="sphere-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="sphere-progress-text">
            {completedChecks}/{totalChecks} ({completionPercent}%)
          </span>
        </div>
      </div>

      {meetsThreshold && !isComplete && (
        <div className="sphere-body">
          <MissingChecksTable
            missingChecks={missingChecks}
            playerColors={playerColors}
            hiddenPlayers={hiddenPlayers}
          />
        </div>
      )}

      {extended && meetsThreshold && nextResult && nextResult.missingChecks.length > 0 && (
        <div className="sphere-extended">
          <div className="extended-label">Next Sphere: Sphere {nextResult.sphereNumber}</div>
          <MissingChecksTable
            missingChecks={nextResult.missingChecks}
            playerColors={playerColors}
            hiddenPlayers={hiddenPlayers}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Style SphereCard**

Create `src/components/SphereCard.css`:

```css
.sphere-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.sphere-card.dimmed {
  opacity: 0.6;
}

.sphere-card.complete {
  opacity: 0.5;
}

.sphere-card.expanded {
  opacity: 1;
}

.sphere-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  gap: 1rem;
}

.sphere-label {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
}

.check-icon {
  color: var(--color-success);
}

.sphere-progress-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 350px;
}

.sphere-progress-bar {
  flex: 1;
  height: 8px;
  background: var(--color-bg);
  border-radius: 4px;
  overflow: hidden;
}

.sphere-progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.sphere-card.complete .sphere-progress-fill {
  background: var(--color-success);
}

.sphere-progress-text {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.sphere-body {
  padding: 0 1rem 0.75rem;
}

.sphere-extended {
  border-top: 1px dashed var(--color-border);
  background: rgba(233, 69, 96, 0.05);
  padding: 0.75rem 1rem;
}

.extended-label {
  font-size: 0.8rem;
  color: var(--color-warning);
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
```

- [ ] **Step 5: Verify components render (temporary test in App)**

Update `src/App.jsx` to render sphere cards when both data sources are available:

```jsx
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
```

- [ ] **Step 6: Verify in browser**

Run dev server. Upload a spoiler log file. Verify:
1. Sphere cards appear with progress bars (all at 0% if no tracker data)
2. Adjust threshold slider — cards expand/dim based on threshold
3. If connected to a tracker URL, completed checks update the progress

- [ ] **Step 7: Commit**

```bash
git add src/components/SphereCard.jsx src/components/SphereCard.css src/components/MissingChecksTable.jsx src/components/MissingChecksTable.css src/App.jsx
git commit -m "feat: add SphereCard and MissingChecksTable components"
```

---

### Task 9: PlayerLegend Component

**Files:**
- Create: `src/components/PlayerLegend.jsx`, `src/components/PlayerLegend.css`
- Modify: `src/App.jsx`

Shows player names with colored dots. Clicking a player toggles their visibility across all sphere tables.

- [ ] **Step 1: Create PlayerLegend component**

Create `src/components/PlayerLegend.jsx`:

```jsx
import './PlayerLegend.css'

export default function PlayerLegend({ players, playerColors, hiddenPlayers, onTogglePlayer }) {
  if (!players || players.length === 0) return null

  return (
    <div className="player-legend">
      {players.map((player) => {
        const isHidden = hiddenPlayers.has(player.name)
        return (
          <button
            key={player.slot}
            className={`player-chip ${isHidden ? 'hidden' : ''}`}
            onClick={() => onTogglePlayer(player.name)}
            style={{
              '--chip-color': playerColors[player.name],
            }}
          >
            <span className="player-dot" />
            <span className="player-name">{player.name}</span>
            <span className="player-game">{player.game}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Style PlayerLegend**

Create `src/components/PlayerLegend.css`:

```css
.player-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.player-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--color-text);
  transition: opacity 0.2s;
}

.player-chip:hover {
  border-color: var(--chip-color);
}

.player-chip.hidden {
  opacity: 0.35;
}

.player-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--chip-color);
  flex-shrink: 0;
}

.player-name {
  font-weight: 600;
}

.player-game {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}
```

- [ ] **Step 3: Add hiddenPlayers state and wire PlayerLegend into App**

Update `src/App.jsx`:

```jsx
import { useState, useMemo } from 'react'
import { parseSpoilerLog } from './parsers/spoilerParser'
import { analyzeSpheres } from './engine/sphereAnalyzer'
import { useTrackerAutoRefresh } from './hooks/useTrackerAutoRefresh'
import Header from './components/Header'
import InputSection from './components/InputSection'
import SphereCard from './components/SphereCard'
import PlayerLegend from './components/PlayerLegend'
import './App.css'

const PLAYER_COLOR_VARS = Array.from({ length: 10 }, (_, i) => `var(--player-${i})`)

function App() {
  const [spoilerData, setSpoilerData] = useState(null)
  const [trackerUrl, setTrackerUrl] = useState('')
  const [threshold, setThreshold] = useState(75)
  const [extended, setExtended] = useState(false)
  const [hiddenPlayers, setHiddenPlayers] = useState(new Set())
  const { checkedLocations, status: trackerStatus } = useTrackerAutoRefresh(trackerUrl)

  function handleSpoilerText(text) {
    const parsed = parseSpoilerLog(text)
    setSpoilerData(parsed)
    setHiddenPlayers(new Set())
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
      {spoilerData && (
        <PlayerLegend
          players={spoilerData.players}
          playerColors={playerColors}
          hiddenPlayers={hiddenPlayers}
          onTogglePlayer={togglePlayer}
        />
      )}
      <div className="sphere-list">
        {sphereResults.map((result, i) => (
          <SphereCard
            key={result.sphereNumber}
            result={result}
            threshold={threshold}
            extended={extended}
            nextResult={sphereResults[i + 1] || null}
            playerColors={playerColors}
            hiddenPlayers={hiddenPlayers}
          />
        ))}
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 4: Verify in browser**

Run dev server. Upload a spoiler log. Verify:
1. Player chips appear with colored dots and game names
2. Clicking a player dims their chip and hides their rows from all sphere tables
3. Clicking again re-shows them

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayerLegend.jsx src/components/PlayerLegend.css src/App.jsx
git commit -m "feat: add PlayerLegend component with player filtering"
```

---

### Task 10: GitHub Pages Deployment

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/deploy.yml`

Deploy the built app to GitHub Pages via GitHub Actions.

- [ ] **Step 1: Verify build works**

Run:
```bash
npm run build
```
Expected: `dist/` directory created with the built app.

- [ ] **Step 2: Create GitHub Actions workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Run all tests one final time**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions workflow for Pages deployment"
```

- [ ] **Step 5: Push and verify deployment**

Create the GitHub repo and push:
```bash
git remote add origin https://github.com/<username>/archipelago-sphere.git
git branch -M main
git push -u origin main
```

Then enable GitHub Pages in the repo settings (Source: GitHub Actions).

Expected: Site deploys to `https://<username>.github.io/archipelago-sphere/`.
