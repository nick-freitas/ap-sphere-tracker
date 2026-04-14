import { describe, it, expect } from 'vitest'
import { applyEventFilter } from './eventFilter'

// Build a small multidata fixture with specified game datapackages and per-slot checks.
function buildMultidata({ players, gameItems, gameLocations, checks }) {
  const datapackage = new Map()
  for (const game of Object.keys(gameItems)) {
    datapackage.set(game, {
      item_name_to_id: Object.fromEntries(gameItems[game].map((n, i) => [n, i + 1])),
      location_name_to_id: Object.fromEntries(gameLocations[game].map((n, i) => [n, i + 1])),
    })
  }

  const slot_info = new Map(players.map((p) => [p.slot, { name: p.name, game: p.game, type: 0, group_members: [] }]))

  const locations = new Map()
  for (const p of players) {
    const inner = new Map()
    const playerChecks = checks[p.name] || []
    for (const locName of playerChecks) {
      const id = datapackage.get(p.game).location_name_to_id[locName]
      if (id != null) inner.set(id, [0, 0, 0])
    }
    locations.set(p.slot, inner)
  }

  return { datapackage, locations, slot_info, slot_data: new Map(), seed_name: 'test', version: '0.6.7' }
}

const OOT_ITEMS = ['Kokiri Sword', 'Progressive Bow', 'Bombs', 'Hookshot', 'Master Sword']
const OOT_LOCATIONS = ['KF Kokiri Sword Chest', 'HF Southeast Grotto Chest', 'LW Gift From Saria', 'Market ToT Master Sword']
const ALTTP_ITEMS = ['Hookshot', 'Big Key (Hyrule Castle)', 'Moon Pearl']
const ALTTP_LOCATIONS = ['Sanctuary', "Link's Uncle", 'Desert Ledge']

function rawSeed(overrides = {}) {
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

describe('applyEventFilter (multidata-driven)', () => {
  it('keeps entries where location id is in the per-slot multidata locations AND item is in its game', () => {
    const raw = rawSeed({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'KF Kokiri Sword Chest', locationOwner: 'Alice', item: 'Kokiri Sword', itemOwner: 'Alice' },
          ],
        },
      ],
    })
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      checks: { Alice: ['KF Kokiri Sword Chest'], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.spheres[0].entries).toHaveLength(1)
  })

  it('filters entries whose item name is not in the item owner\'s datapackage', () => {
    const raw = rawSeed({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'KF Kokiri Sword Chest', locationOwner: 'Alice', item: 'Time Travel', itemOwner: 'Alice' },
          ],
        },
      ],
    })
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      checks: { Alice: ['KF Kokiri Sword Chest'], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.spheres[0].entries).toHaveLength(0)
  })

  it('filters entries whose location name is not in the location owner\'s datapackage', () => {
    const raw = rawSeed({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'Chamber of Sages', locationOwner: 'Alice', item: 'Kokiri Sword', itemOwner: 'Alice' },
          ],
        },
      ],
    })
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      checks: { Alice: ['KF Kokiri Sword Chest'], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.spheres[0].entries).toHaveLength(0)
  })

  it('filters a location that resolves to an id but is NOT in the per-slot checks (un-shuffled slot)', () => {
    // Market ToT Master Sword resolves in the OoT datapackage (id 4), but if Alice's
    // un-shuffled settings excluded it, multidata.locations.get(1) does not contain id 4.
    const raw = rawSeed({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'Market ToT Master Sword', locationOwner: 'Alice', item: 'Master Sword', itemOwner: 'Alice' },
          ],
        },
      ],
    })
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      // Alice's checks deliberately EXCLUDE 'Market ToT Master Sword'
      checks: { Alice: ['KF Kokiri Sword Chest', 'HF Southeast Grotto Chest'], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.spheres[0].entries).toHaveLength(0)
  })

  it('verifies cross-game items against the item owner\'s datapackage', () => {
    // Alice (OoT) has a location; the item belongs to Bob (ALTTP). Moon Pearl is in ALTTP, not OoT.
    // The filter should keep the entry because it verifies the item side against Bob's game.
    const raw = rawSeed({
      spheres: [
        {
          number: 1,
          entries: [
            { location: 'KF Kokiri Sword Chest', locationOwner: 'Alice', item: 'Moon Pearl', itemOwner: 'Bob' },
          ],
        },
      ],
    })
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      checks: { Alice: ['KF Kokiri Sword Chest'], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.spheres[0].entries).toHaveLength(1)
  })

  it('filters playerLocations identically to sphere entries', () => {
    const raw = rawSeed({
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
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      checks: { Alice: ['KF Kokiri Sword Chest'], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.playerLocations.get('Alice')).toHaveLength(1)
    expect(result.playerLocations.get('Alice')[0].location).toBe('KF Kokiri Sword Chest')
  })

  it('emits a warning when the spoiler header count differs from the multidata count', () => {
    // The spoiler header claims Alice has 3 checks, but multidata says she has 1.
    // This is the ALTTP-style case: the header's Location Count field lies
    // about some games, and we surface the discrepancy for the user.
    const raw = rawSeed({
      playerLocations: new Map(),
      headerCounts: new Map([['Alice', 3]]),
    })
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      checks: { Alice: ['KF Kokiri Sword Chest'], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.warnings).toContainEqual({ player: 'Alice', spoilerCount: 3, gameCount: 1 })
  })

  it('emits no warnings when the spoiler header count matches multidata', () => {
    const raw = rawSeed({
      playerLocations: new Map(),
      headerCounts: new Map([['Alice', 1]]),
    })
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      checks: { Alice: ['KF Kokiri Sword Chest'], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.warnings).toEqual([])
  })

  it('preserves player list and header counts by reference', () => {
    const raw = rawSeed()
    const multidata = buildMultidata({
      players: [
        { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
        { slot: 2, name: 'Bob', game: 'A Link to the Past' },
      ],
      gameItems: { 'Ocarina of Time': OOT_ITEMS, 'A Link to the Past': ALTTP_ITEMS },
      gameLocations: { 'Ocarina of Time': OOT_LOCATIONS, 'A Link to the Past': ALTTP_LOCATIONS },
      checks: { Alice: [], Bob: [] },
    })
    const result = applyEventFilter(raw, multidata)
    expect(result.players).toBe(raw.players)
    expect(result.headerCounts).toBe(raw.headerCounts)
  })
})
