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

## Generating datapackages (maintainer workflow)

To filter out randomizer logic events (like `Time Travel` or `Open Floodgate`), the tracker needs each game's **datapackage** — the canonical map of real item and location names that Archipelago itself uses. Datapackages live in `public/datapackages/` as `<checksum>.json` files, with a single `index.json` manifest mapping game names to checksums.

**End users never run this workflow.** The tracker ships with datapackages committed to `public/datapackages/` by whoever maintains the deployment. If you're just using the live site, skip this section entirely.

If you see a "missing datapackages" error when loading a spoiler, it means the seed uses a game whose datapackage hasn't been committed yet. Ask the tracker maintainer to add it — or, if you maintain the deployment yourself, follow the steps below.

### Requirements

- A **source checkout** of Archipelago (`git clone https://github.com/ArchipelagoMW/Archipelago`). The packaged `.app` / `.exe` builds **cannot** be used — their Python modules are frozen by PyInstaller and can't be imported by an external script. You need actual `.py` source files on disk.
- Any unofficial apworlds you want to bundle should be placed in the source checkout's `custom_worlds/` folder before running the script.

### Running the script

1. Copy any `.apworld` files you want to extract into the source checkout's `custom_worlds/` directory. (On macOS, custom apworlds you installed via the launcher typically live in `~/Library/Application Support/Archipelago/worlds/`.)
2. From the source checkout root (the folder containing `Generate.py`), run:
   ```bash
   python3 /path/to/ap-sphere-tracker/scripts/extract_datapackages.py \
     --output /path/to/ap-sphere-tracker/public/datapackages \
     --merge-index
   ```
   The `--merge-index` flag preserves existing entries in `index.json` and adds new ones. Re-running the script is idempotent — unchanged games overwrite with identical content, changed games get new entries.
3. Commit the new files in `public/datapackages/` and redeploy. The tracker will pick them up on next load.

## Tech stack

React, Vite, plain CSS. No backend — everything runs in the browser. Deployed to GitHub Pages.

## Development

```bash
npm install
npm run dev     # http://localhost:5173/ap-sphere-tracker/
npm test        # run tests
npm run build   # production build
```
