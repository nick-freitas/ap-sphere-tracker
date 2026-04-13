import { describe, it, expect } from 'vitest'
import { applyEventFilter } from './eventFilter'

// Small helper to build a datapackage fixture with the shape the filter expects.
function dp(itemNames, locationNames) {
  return {
    item_name_to_id: Object.fromEntries(itemNames.map((n, i) => [n, i + 1])),
    location_name_to_id: Object.fromEntries(locationNames.map((n, i) => [n, i + 1])),
  }
}

const OOT = dp(
  ['Kokiri Sword', 'Progressive Bow', 'Bombs', 'Hookshot'],
  ['KF Kokiri Sword Chest', 'HF Southeast Grotto Chest', 'LW Gift From Saria'],
)

const ALTTP = dp(
  ['Hookshot', 'Big Key (Hyrule Castle)', 'Moon Pearl'],
  ['Sanctuary', "Link's Uncle", 'Desert Ledge'],
)

const DATAPACKAGES = new Map([
  ['Ocarina of Time', OOT],
  ['A Link to the Past', ALTTP],
])

function raw(overrides = {}) {
  return {
    players: [
      { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
      { slot: 2, name: 'Bob', game: 'A Link to the Past' },
    ],
    spheres: [],
    playerLocations: new Map(),
    headerCounts: new Map(),
    ...overrides,
  }
}

describe('applyEventFilter', () => {
  it('keeps entries where both location and item exist in their datapackages', () => {
    const input = raw({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'KF Kokiri Sword Chest', locationOwner: 'Alice', item: 'Kokiri Sword', itemOwner: 'Alice' },
          ],
        },
      ],
    })
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.spheres[0].entries).toHaveLength(1)
  })

  it('filters entries where the item name is absent from the item owner\'s datapackage', () => {
    const input = raw({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'KF Kokiri Sword Chest', locationOwner: 'Alice', item: 'Time Travel', itemOwner: 'Alice' },
          ],
        },
      ],
    })
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.spheres[0].entries).toHaveLength(0)
  })

  it('filters entries where the location name is absent from the location owner\'s datapackage', () => {
    const input = raw({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'Chamber of Sages', locationOwner: 'Alice', item: 'Kokiri Sword', itemOwner: 'Alice' },
          ],
        },
      ],
    })
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.spheres[0].entries).toHaveLength(0)
  })

  it('filters entries where both sides are absent (e.g., same-name subrules)', () => {
    const input = raw({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'Some Subrule 1', locationOwner: 'Alice', item: 'Some Subrule 1', itemOwner: 'Alice' },
          ],
        },
      ],
    })
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.spheres[0].entries).toHaveLength(0)
  })

  it('verifies cross-game items against the item owner\'s datapackage, not the location owner\'s', () => {
    // Alice (OoT) has a location; the item belongs to Bob (ALTTP). The item name 'Moon Pearl' exists in ALTTP
    // but not in OoT. It should be kept because the check is "is the item in Bob's (ALTTP) datapackage?"
    const input = raw({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'KF Kokiri Sword Chest', locationOwner: 'Alice', item: 'Moon Pearl', itemOwner: 'Bob' },
          ],
        },
      ],
    })
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.spheres[0].entries).toHaveLength(1)
  })

  it('filters entries in playerLocations identically to sphere entries', () => {
    const input = raw({
      playerLocations: new Map([
        [
          'Alice',
          [
            { location: 'KF Kokiri Sword Chest', item: 'Kokiri Sword', itemOwner: 'Alice' },
            { location: 'Chamber of Sages', item: 'Time Travel', itemOwner: 'Alice' },
          ],
        ],
      ]),
    })
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.playerLocations.get('Alice')).toHaveLength(1)
    expect(result.playerLocations.get('Alice')[0].location).toBe('KF Kokiri Sword Chest')
  })

  it('emits a warning when filtered playerLocations count differs from headerCounts', () => {
    const input = raw({
      playerLocations: new Map([
        [
          'Alice',
          [
            { location: 'KF Kokiri Sword Chest', item: 'Kokiri Sword', itemOwner: 'Alice' },
            { location: 'HF Southeast Grotto Chest', item: 'Progressive Bow', itemOwner: 'Alice' },
          ],
        ],
      ]),
      headerCounts: new Map([['Alice', 3]]),
    })
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.warnings).toContainEqual({ player: 'Alice', expected: 3, actual: 2 })
  })

  it('emits no warnings when filtered counts match headerCounts', () => {
    const input = raw({
      playerLocations: new Map([
        [
          'Alice',
          [
            { location: 'KF Kokiri Sword Chest', item: 'Kokiri Sword', itemOwner: 'Alice' },
            { location: 'HF Southeast Grotto Chest', item: 'Progressive Bow', itemOwner: 'Alice' },
          ],
        ],
      ]),
      headerCounts: new Map([['Alice', 2]]),
    })
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.warnings).toEqual([])
  })

  it('preserves player list and other fields unchanged', () => {
    const input = raw()
    const result = applyEventFilter(input, DATAPACKAGES)
    expect(result.players).toBe(input.players)
    expect(result.headerCounts).toBe(input.headerCounts)
  })
})
