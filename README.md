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
3. Adjust the **Threshold** slider to control which spheres reveal missing checks
4. Toggle **Upcoming Sphere** to see the next sphere beyond the threshold
5. Toggle **Item Spoilers** to reveal what items are at missing locations
6. Click player names to filter them in/out of the display

## Features

- Game-agnostic — works with any Archipelago game including unofficial ones
- Dark/light mode (defaults to system preference)
- Installable as a PWA for offline use
- Auto-updates tracker data hourly via GitHub Actions
- Filters out non-item entries using per-game Archipelago datapackages
- Player color coding throughout all views

## Generating datapackages

To filter out randomizer logic events (like `Time Travel` or `Open Floodgate`), the tracker needs each game's **datapackage** — the canonical map of real item and location names that Archipelago itself uses. Datapackages live in `public/datapackages/` as `<checksum>.json` files, with a single `index.json` manifest mapping game names to checksums.

The tracker ships with datapackages for whichever games the maintainer has already bundled. If your seed uses a game that isn't bundled, the tracker shows a "missing datapackages" error listing the affected games.

To add a new game's datapackage:

1. Make sure Archipelago is installed on your machine (the same install you used to generate the seed).
2. Copy `scripts/extract_datapackages.py` into your Archipelago install folder (the directory containing `Generate.py`).
3. Run:
   ```bash
   python extract_datapackages.py --output /path/to/ap-sphere-tracker/public/datapackages --merge-index
   ```
   The `--merge-index` flag preserves existing entries in `index.json` and adds new ones. Re-running the script is idempotent.
4. Commit the new files in `public/datapackages/` and redeploy. The tracker will pick them up on next load.

## Tech stack

React, Vite, plain CSS. No backend — everything runs in the browser. Deployed to GitHub Pages.

## Development

```bash
npm install
npm run dev     # http://localhost:5173/ap-sphere-tracker/
npm test        # run tests
npm run build   # production build
```
