# Archipelago Sphere Analyzer — Design Spec

## Overview

A single-page, client-side React web app that cross-references an Archipelago multiworld randomizer spoiler log with a live tracker log to show each player's missing checks per sphere. Missing checks are only revealed when a sphere meets a configurable completion threshold (default 75%). An "extended" toggle shows the next sphere's missing checks alongside qualifying spheres.

Deployed to GitHub Pages. No backend.

## Data Inputs

### Spoiler Log (file upload)

- User uploads the Archipelago spoiler log file (plain text `.txt` format).
- Structured with sections separated by blank lines: header, per-player settings, `Entrances:`, `Locations:`, `Playthrough:`, `Paths:`.
- Player info in header: `Player N: Name` followed by `Game: GameName`.
- Locations section format: `Location Name (PlayerName): Item Name (OwnerPlayerName)` — one per line.
- Playthrough section defines spheres: numbered blocks `N: { ... }` containing location:item entries in the same format as Locations. Sphere 0 may be empty or contain precollected items.
- Parsed to extract:
  - All players and their slot numbers
  - Sphere entries from the Playthrough section: location, location owner, item, item owner
- This is the source of truth for what exists in the game.
- Game-agnostic: no hardcoded game knowledge. The parser works entirely from the spoiler log structure.

### Tracker Log (URL fetch)

- User pastes a URL pointing to a `.txt` tracker log file.
- The app fetches it immediately on entry, then auto-refreshes every 60 seconds.
- A status indicator shows: last successful fetch time, countdown to next fetch, and error state if a fetch fails.
- The tracker log is an Archipelago server event log. Each line is timestamped.
- Item send lines (the ones we care about) have the format: `[timestamp]: (Team #N) SenderPlayer sent ItemName to ReceiverPlayer (LocationName)`
- The sender is the player who checked the location (it's in their world). This is how we determine which locations have been checked.
- Other lines (notices, hints, join/leave messages) are ignored by the parser.
- Parsed to produce a map of checked locations per player: `Map<playerName, Set<locationName>>`.
- **CORS handling:** The app attempts a direct fetch first. If blocked by CORS, it falls back to a public CORS proxy (e.g., `corsproxy.io`). A small note is shown when the proxy is in use.

## Sphere Analysis Engine

The engine is the core logic layer. It takes the parsed spoiler data and parsed tracker data and produces the display model.

### Per-Sphere Completion

- For each sphere, count the total locations and how many have been checked (per the tracker log).
- Completion percentage = checked locations / total locations in that sphere.
- Compare against the user's threshold setting (configurable slider, default 75%).

### Threshold Behavior

- **Below threshold:** Sphere card is shown but collapsed/dimmed. Displays only the sphere number and a progress bar with completion percentage. No missing checks revealed.
- **At or above threshold:** Sphere card expands to show the missing checks table.
- **100% complete:** Sphere card is collapsed with a "complete" indicator (e.g., green checkmark).

### Missing Checks Table

For each missing check in a qualifying sphere, the table shows:

| Column     | Description                                      |
| ---------- | ------------------------------------------------ |
| Player     | The player who needs to perform the check        |
| Location   | The location name that hasn't been checked       |
| Item       | The item found at that location                  |
| Item Owner | The player who owns/receives that item           |

### Extended Toggle

- A toggle switch in the header bar.
- When enabled: for each sphere that meets the threshold, the next sphere's missing checks are also displayed, regardless of that next sphere's own completion percentage.
- The next sphere's data is visually distinct (different background/border, labeled "Next Sphere: Sphere N").

## UI Layout

### Header Bar (always visible)

- App title
- Threshold slider with percentage label (0%–100%, default 75%)
- Extended toggle switch

### Input Section

- File upload button for the spoiler log
- Text input for the tracker log URL
- Once both inputs are provided, this section can collapse/minimize to save vertical space
- Status indicator for auto-refresh (countdown, last fetch time, error state)

### Sphere List

- Vertical stack of sphere cards, ordered Sphere 0, 1, 2, ...
- Each card has:
  - Header: sphere number + progress bar with completion percentage
  - Body (if above threshold): missing checks table
  - Extended section (if toggle is on and sphere qualifies): next sphere's missing checks in a visually distinct sub-section
- Rows in the missing checks table are color-coded by player for readability

### Player Legend / Filter

- Small bar showing player names with colored indicators matching the table row colors
- Doubles as a filter: click a player to show/hide their missing checks across all spheres

## Tech Stack & Project Structure

- **React + Vite** — fast dev server, clean build
- **Plain CSS or CSS modules** — no heavy UI framework
- **GitHub Pages** deployment via `gh-pages` branch or GitHub Actions

### Directory Structure

```
src/
  components/
    Header.jsx          — title, threshold slider, extended toggle
    InputSection.jsx    — file upload, URL input, status indicator
    SphereCard.jsx      — single sphere: header, progress bar, missing checks
    MissingChecksTable.jsx — table of missing checks for a sphere
    PlayerLegend.jsx    — player color legend and filter
  parsers/
    spoilerParser.js    — parse spoiler log text into structured game data
    trackerParser.js    — parse tracker log text into checked locations
  engine/
    sphereAnalyzer.js   — compute completion %, filter by threshold, produce missing checks
  hooks/
    useTrackerAutoRefresh.js — fetch tracker URL on interval, manage state
  App.jsx               — single-page layout, wires components + state together
  main.jsx              — Vite entry point
```

### State Flow

1. Spoiler log upload -> `spoilerParser` -> structured game data (players, locations, items, spheres)
2. Tracker URL entry -> `useTrackerAutoRefresh` -> `trackerParser` -> set of checked locations per player
3. Both feed into `sphereAnalyzer` -> per-sphere results (completion %, missing checks list)
4. UI renders sphere cards based on results, filtered by threshold slider and extended toggle

## Constraints

- Fully client-side. No server, no database.
- Game-agnostic. Works with any Archipelago game, including unofficial ones.
- Handles up to ~10 players comfortably.
- Auto-refresh interval: 60 seconds (not configurable in v1).
