#!/usr/bin/env python3
"""Extract per-game datapackages from a local Archipelago install.

Must be run from within an Archipelago install folder (the folder containing
Generate.py and the worlds/ directory), OR with PYTHONPATH pointing at one.

Usage:
    python extract_datapackages.py --output ./datapackages-export
    python extract_datapackages.py --output /path/to/tracker/public/datapackages --merge-index
"""
import argparse
import json
import os
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--output",
        default="./datapackages-export",
        help="Directory to write <checksum>.json files and index.json into. Defaults to ./datapackages-export.",
    )
    parser.add_argument(
        "--merge-index",
        action="store_true",
        help="If set, read the existing index.json in --output and merge new entries into it (most recent run wins on conflict). Otherwise, index.json is written fresh.",
    )
    parser.add_argument(
        "--games",
        nargs="*",
        default=None,
        help="Optional: restrict to specific game names. If omitted, every registered world is exported.",
    )
    args = parser.parse_args()

    try:
        from worlds import AutoWorldRegister
    except ImportError:
        print(
            "error: cannot import 'worlds'. Run this script from inside an Archipelago install folder, "
            "or set PYTHONPATH to point at one.",
            file=sys.stderr,
        )
        return 2

    os.makedirs(args.output, exist_ok=True)

    index_path = os.path.join(args.output, "index.json")
    if args.merge_index and os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            index = json.load(f)
    else:
        index = {}

    game_types = AutoWorldRegister.world_types
    written = 0
    for game_name, world_cls in sorted(game_types.items()):
        if args.games and game_name not in args.games:
            continue

        try:
            pkg = world_cls.get_data_package_data()
        except Exception as exc:  # noqa: BLE001 — want to continue past broken apworlds
            print(f"  skip: {game_name} ({type(exc).__name__}: {exc})", file=sys.stderr)
            continue

        checksum = pkg.get("checksum")
        if not checksum:
            print(f"  skip: {game_name} (no checksum in datapackage)", file=sys.stderr)
            continue

        filename = f"{checksum}.json"
        filepath = os.path.join(args.output, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(pkg, f, indent=2, sort_keys=True)

        # Most-recent run wins: always overwrite the index entry for this game.
        index[game_name] = checksum
        written += 1
        print(f"  wrote: {game_name} -> {filename}")

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, sort_keys=True)

    print(f"\nDone: wrote {written} datapackages and updated index at {index_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
