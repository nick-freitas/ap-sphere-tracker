# AP Sphere Tracker — project notes for Claude

## Tooltips: use `data-tip` + CSS `::after`, NOT the native `title=""` attribute

This project has its own custom tooltip pattern that looks nothing like the OS-native `title` tooltip. If you write `title="..."` on an element, you will get a plain browser tooltip that doesn't match any other tooltip in the app, and the user will tell you it's broken. This has happened before.

**The pattern has four requirements, and all four must be in place or the tooltip silently fails.** They're spread across the JSX and the CSS file for the component, so it's easy to forget one.

### JSX side

Use `data-tip={...}` (a custom data attribute), not `title={...}`:

```jsx
<span className="my-tooltip-trigger" data-tip="This is the tooltip text">
  ⚠
</span>
```

### CSS side

The element needs `position: relative` so the absolutely-positioned `::after` anchors to it. Then add a `::after` pseudo-element rule whose `content` reads the `data-tip` attribute, and a `:hover::after` rule that reveals it by setting opacity to 1.

Minimum viable pattern:

```css
.my-tooltip-trigger {
  position: relative;
  cursor: help; /* optional but conventional */
}

.my-tooltip-trigger::after {
  content: attr(data-tip);
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.68rem;
  font-weight: 400;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  white-space: normal;
  width: 240px; /* adjust per-use-case; most tooltips use 200–260px */
  line-height: 1.4;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 10;
}

.my-tooltip-trigger:hover::after {
  opacity: 1;
}
```

**Do NOT copy-paste blindly:** check the width, font size, and z-index against the component you're working in. Sphere cards use `z-index: 100` because they overlap siblings; simple badges use `10`.

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
