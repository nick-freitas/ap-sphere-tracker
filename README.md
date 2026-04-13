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

### Why this needs a separate AP source checkout

The extract script imports Archipelago's `worlds` module to enumerate every registered apworld and call each one's `get_data_package_data()` method. That import chain pulls in `BaseClasses`, `NetUtils`, `Options`, and other AP core modules.

The packaged **Archipelago `.app` (macOS) or `.exe` (Windows) builds will not work** for this — PyInstaller inlines those core modules inside the frozen executable binaries, so an external `python3` process has nothing to import from. You need actual `.py` source files on disk. The only way to get them is to clone AP's GitHub repository.

This is a one-time setup that only the tracker maintainer has to do. Your playgroup and everyone else visiting the deployed tracker benefits from whatever datapackages you commit, with zero requirements on their end.

### One-time setup: clone AP source and create a venv

```bash
# Clone a shallow copy of Archipelago somewhere outside this repo
git clone --depth 1 https://github.com/ArchipelagoMW/Archipelago ~/ap-source
cd ~/ap-source

# Create and activate a Python 3.11 virtualenv, then install AP's deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

You can check out a specific AP version tag instead of `main` if you want the datapackage checksums to match a specific AP release — just `git checkout <tag>` after cloning.

### Running the script

From the cloned AP source folder (with the venv activated):

```bash
cd ~/ap-source
source .venv/bin/activate

# (Optional) If you want to bundle unofficial apworlds, drop them into custom_worlds/
# first. On macOS, custom .apworld files installed via the Archipelago launcher
# typically live in ~/Library/Application Support/Archipelago/worlds/
cp ~/Library/Application\ Support/Archipelago/worlds/*.apworld custom_worlds/

# Run the extract script, pointing at this tracker repo's public/datapackages/
python3 /path/to/ap-sphere-tracker/scripts/extract_datapackages.py \
  --output /path/to/ap-sphere-tracker/public/datapackages \
  --merge-index

deactivate
```

The `--merge-index` flag preserves existing entries in `index.json` and adds new ones. Re-running the script is idempotent: unchanged games overwrite with identical content, changed games get new entries.

Then commit the new files in `public/datapackages/` and redeploy. The tracker will pick them up on next load.

## Tech stack

React, Vite, plain CSS. No backend — everything runs in the browser. Deployed to GitHub Pages.

## Development

```bash
npm install
npm run dev     # http://localhost:5173/ap-sphere-tracker/
npm test        # run tests
npm run build   # production build
```
