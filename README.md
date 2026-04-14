# AP Sphere Tracker

A client-side web app for tracking sphere progression in [Archipelago](https://archipelago.gg/) multiworld randomizer sessions.

**Live:** [nick-freitas.github.io/ap-sphere-tracker](https://nick-freitas.github.io/ap-sphere-tracker/)

## What it does

Cross-references an Archipelago spoiler log with a server tracker log to show:

- **Per-sphere completion** with progress bars and player breakdowns
- **Missing checks** for each sphere above a configurable threshold
- **Per-player stats** sorted by completion percentage
- **Starting items** from Sphere 0 displayed at the top
- **Upcoming sphere** toggle to peek at the next sphere beyond the threshold
- **Item spoiler toggle** with blur protection and confirmation prompt

## How to use

1. Upload your **Spoiler Log** (`AP_*_Spoiler.txt` from your seed)
2. Upload your **Tracker Log** (the server `.txt` log file)
3. Upload your **Seed File** (`.archipelago` or the generator output `.zip` containing it)
4. Adjust the **Threshold** slider to control which spheres reveal missing checks
5. Toggle **Upcoming Sphere** to see the next sphere beyond the threshold
6. Toggle **Item Spoilers** to reveal what items are at missing locations
7. Click player names to filter them in/out of the display

The seed file (`.archipelago`) contains the authoritative per-slot check list for your specific seed, including settings-aware exclusions like un-shuffled slots. The tracker reads it client-side — no server required.

## Features

- Game-agnostic — works with any Archipelago game including unofficial ones
- Dark/light mode (defaults to system preference)
- Installable as a PWA for offline use
- Auto-updates tracker data hourly via GitHub Actions
- Filters out logic events using the authoritative per-slot check list embedded in your seed file
- Player color coding throughout all views

## Tech stack

React, Vite, plain CSS. No backend — everything runs in the browser. Deployed to GitHub Pages.

## Development

```bash
npm install
npm run dev     # http://localhost:5173/ap-sphere-tracker/
npm test        # run tests
npm run build   # production build
```
