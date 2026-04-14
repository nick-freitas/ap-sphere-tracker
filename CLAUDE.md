# AP Sphere Tracker — project notes for Claude

## Tooltips: use `className="tooltip-host"` + `data-tip`, NOT the native `title=""` attribute

This project has its own custom tooltip pattern that looks nothing like the OS-native `title` tooltip. If you write `title="..."` on an element, you will get a plain browser tooltip that doesn't match any other tooltip in the app, and the user will tell you it's broken. This has happened before. Repeatedly.

### Preferred pattern: the shared `.tooltip-host` class

For any new tooltip, use the shared utility class defined in `src/App.css`:

```jsx
<span
  className="tooltip-host"
  data-tip="The tooltip text"
  style={{ '--tooltip-width': '200px' }}  // optional; defaults to 240px
>
  ⚠
</span>
```

That's it. No per-component CSS required. The `.tooltip-host` class already sets `position: relative`, the `::after` pseudo-element with `content: attr(data-tip)`, the absolute positioning below the element, the `:hover::after` reveal, and a sane default width. The width can be overridden per use-case via the `--tooltip-width` CSS custom property.

### Legacy (grandfathered) inline pattern

Several existing components — `Header.jsx` (`.info-icon`), `PlayerStats.jsx` (`.ps-lock-circle`, `.ps-earliest`), `SphereCard.jsx` (`.check-icon`, `.warning-icon`, `.caution-icon`), `PlayerConfigs.jsx` (`.pc-warning`) — have their own inline `::after` CSS predating the shared class. Those work fine and haven't been migrated. **Do not touch them to "match"** unless you're doing a deliberate migration pass; a purely cosmetic refactor risks breaking visual details like widths and z-index stacking that the user has already approved.

For new tooltips: use `.tooltip-host`. Old ones are grandfathered.

### How to verify a tooltip works

Use Playwright's `browser_evaluate` to check four things without a real hover:

```js
const el = document.querySelector('.my-tooltip-trigger')
const parentPos = getComputedStyle(el).position          // must be 'relative'
const afterStyle = getComputedStyle(el, '::after')
afterStyle.content                                        // must be '"the text"' (quoted)
afterStyle.position                                       // must be 'absolute'
afterStyle.opacity                                        // must be '0' initially
```

Then grep the live stylesheet for the hover rule:

```js
[...document.styleSheets]
  .flatMap(s => { try { return [...s.cssRules] } catch { return [] } })
  .find(r => r.selectorText?.includes('.my-tooltip-trigger:hover::after'))
```

If all five check out, the tooltip works — JavaScript can't trigger CSS `:hover`, so a real browser hover is the only other verification path.

### Where to look for prototypes

The `Header.jsx`, `SphereCard.jsx`, `PlayerStats.jsx`, and `PlayerConfigs.jsx` components all use this pattern. If you're adding a new tooltip, copy from the nearest existing one stylistically — they share a visual vocabulary and you should match it.

### Why not `title=""`?

- OS-native tooltips are slow (500ms+ delay) and don't match the rest of the UI.
- They can't be styled (font, color, border, background).
- They don't respect dark mode.
- They can't wrap long text cleanly on macOS.
- The project's existing tooltips all use the `::after` pattern, so a `title=""` tooltip sticks out.

**Rule of thumb:** if you're about to write `title="..."` on a React element in this repo, stop and use `data-tip="..."` instead, plus the CSS above.

## Tracker-log timestamps are UTC. Never `new Date()` them directly.

Raw Archipelago tracker log lines look like `[2026-04-14 01:11:33,970]: ...` with no timezone marker at the end. The timestamps are **UTC** — archipelago.gg's servers log in UTC — but a naive `new Date("2026-04-14 01:11:33.970")` parses the string as the browser's LOCAL time, which is wrong. The result is that every timestamp gets shifted forward by the user's full timezone offset, and "Last Check" readings display as "in the future" (e.g. 2 hours from now, when the check actually happened 2 hours ago).

**Use the helper:** `parseTrackerTimestamp(rawString)` from `src/parsers/trackerParser.js`. It reshapes the string into a proper ISO-8601 UTC literal (`2026-04-14T01:11:33.970Z`) before parsing, so the returned `Date` represents the real moment the event occurred. Then use `.toLocaleString()` on the result to render it in the user's local timezone.

```js
import { parseTrackerTimestamp } from '../parsers/trackerParser'

const lastCheckDate = parseTrackerTimestamp(lastCheckTime)
const display = lastCheckDate ? lastCheckDate.toLocaleString() : null
```

**Do NOT:**
- Call `new Date(rawString)` on a tracker-log timestamp
- Call `new Date(rawString.replace(',', '.'))` — the comma→period substitution is necessary but NOT sufficient; the missing piece is the UTC timezone marker
- Assume the server logs in your local timezone

There is a regression test for this in `src/parsers/trackerParser.test.js` (`describe('parseTrackerTimestamp')`) that verifies the UTC-parsing behavior holds regardless of the machine's local timezone. Don't break it.
