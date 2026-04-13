import { describe, it, expect } from 'vitest'
import { computePrioritySet } from './playerTracker'
import { buildPlayerTracker } from './playerTracker'
import { buildPlayerHints } from './playerTracker'

describe('computePrioritySet', () => {
  it('returns an empty set when spheres array is empty', () => {
    const result = computePrioritySet([])
    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('ignores sphere 0 (precollected items)', () => {
    const spheres = [
      {
        number: 0,
        entries: [
          { location: 'Ghost Loc', locationOwner: 'Alice', item: 'X', itemOwner: 'Alice' },
        ],
      },
    ]
    const result = computePrioritySet(spheres)
    expect(result.size).toBe(0)
  })

  it('includes entries from non-zero spheres keyed by player and location', () => {
    const spheres = [
      { number: 0, entries: [] },
      {
        number: 1,
        entries: [
          { location: 'Loc A', locationOwner: 'Alice', item: 'X', itemOwner: 'Bob' },
          { location: 'Loc B', locationOwner: 'Bob', item: 'Y', itemOwner: 'Alice' },
        ],
      },
      {
        number: 2,
        entries: [
          { location: 'Loc C', locationOwner: 'Alice', item: 'Z', itemOwner: 'Alice' },
        ],
      },
    ]
    const result = computePrioritySet(spheres)
    expect(result.size).toBe(3)
    expect(result.has('Alice\u0000Loc A')).toBe(true)
    expect(result.has('Bob\u0000Loc B')).toBe(true)
    expect(result.has('Alice\u0000Loc C')).toBe(true)
  })

  it('distinguishes same location name across different players', () => {
    const spheres = [
      { number: 0, entries: [] },
      {
        number: 1,
        entries: [
          { location: 'Shared Loc', locationOwner: 'Alice', item: 'X', itemOwner: 'Alice' },
          { location: 'Shared Loc', locationOwner: 'Bob', item: 'Y', itemOwner: 'Bob' },
        ],
      },
    ]
    const result = computePrioritySet(spheres)
    expect(result.has('Alice\u0000Shared Loc')).toBe(true)
    expect(result.has('Bob\u0000Shared Loc')).toBe(true)
    expect(result.size).toBe(2)
  })
})

describe('buildPlayerTracker', () => {
  const spoilerData = {
    playerLocations: new Map([
      ['Alice', [
        { location: 'Zebra Loc', item: 'Sword', itemOwner: 'Bob' },
        { location: 'apple Loc', item: 'Bombs', itemOwner: 'Alice' },
        { location: 'Banana Loc', item: 'Hookshot', itemOwner: 'Alice' },
        { location: 'Cherry Loc', item: 'Bow', itemOwner: 'Charlie' },
      ]],
      ['Bob', [
        { location: 'Solo Loc', item: 'Morph Ball', itemOwner: 'Bob' },
      ]],
    ]),
  }

  // Priority set: Alice/Zebra Loc and Alice/Banana Loc are priority.
  const prioritySet = new Set([
    'Alice\u0000Zebra Loc',
    'Alice\u0000Banana Loc',
  ])

  it('returns empty result for an unknown player', () => {
    const checked = new Map()
    const result = buildPlayerTracker('NotAPlayer', spoilerData, checked, prioritySet)
    expect(result).toEqual({ rows: [], totalCount: 0, foundCount: 0 })
  })

  it('sorts priority rows before non-priority rows', () => {
    const result = buildPlayerTracker('Alice', spoilerData, new Map(), prioritySet)
    expect(result.rows.map((r) => r.location)).toEqual([
      'Banana Loc',  // priority, alphabetical within priority
      'Zebra Loc',   // priority
      'apple Loc',   // non-priority, alphabetical within non-priority
      'Cherry Loc',  // non-priority
    ])
  })

  it('marks priority flag correctly on each row', () => {
    const result = buildPlayerTracker('Alice', spoilerData, new Map(), prioritySet)
    const byLocation = Object.fromEntries(result.rows.map((r) => [r.location, r.priority]))
    expect(byLocation['Zebra Loc']).toBe(true)
    expect(byLocation['Banana Loc']).toBe(true)
    expect(byLocation['apple Loc']).toBe(false)
    expect(byLocation['Cherry Loc']).toBe(false)
  })

  it('marks found flag from checkedLocations', () => {
    const checked = new Map([
      ['Alice', new Set(['Zebra Loc', 'apple Loc'])],
    ])
    const result = buildPlayerTracker('Alice', spoilerData, checked, prioritySet)
    const byLocation = Object.fromEntries(result.rows.map((r) => [r.location, r.found]))
    expect(byLocation['Zebra Loc']).toBe(true)
    expect(byLocation['apple Loc']).toBe(true)
    expect(byLocation['Banana Loc']).toBe(false)
    expect(byLocation['Cherry Loc']).toBe(false)
  })

  it('returns totalCount and foundCount counts', () => {
    const checked = new Map([
      ['Alice', new Set(['Zebra Loc', 'apple Loc'])],
    ])
    const result = buildPlayerTracker('Alice', spoilerData, checked, prioritySet)
    expect(result.totalCount).toBe(4)
    expect(result.foundCount).toBe(2)
  })

  it('treats missing checkedLocations entry for a player as all unfound', () => {
    const checked = new Map()
    const result = buildPlayerTracker('Alice', spoilerData, checked, prioritySet)
    expect(result.foundCount).toBe(0)
    expect(result.rows.every((r) => r.found === false)).toBe(true)
  })

  it('carries item and itemOwner through to rows', () => {
    const result = buildPlayerTracker('Bob', spoilerData, new Map(), prioritySet)
    expect(result.rows).toEqual([
      {
        location: 'Solo Loc',
        item: 'Morph Ball',
        itemOwner: 'Bob',
        found: false,
        priority: false,
      },
    ])
  })
})

describe('buildPlayerHints', () => {
  // Naizak's Boomerang is at Nick's Market Guard House Pot 30 → shows on Nick's tab
  // Brian's Sword is at Nick's Kakariko Potion Shop → shows on Nick's tab
  // Dan's Arrows is at Alice's Sanctuary → does NOT show on Nick's tab
  const hints = [
    {
      receiver: 'Naizak',
      item: 'Boomerang',
      location: 'Market Guard House Pot 30',
      locationOwner: 'Nick',
      entrance: null,
      status: 'priority',
      timestamp: 't1',
    },
    {
      receiver: 'Brian',
      item: 'Master Sword',
      location: 'Kakariko Potion Shop',
      locationOwner: 'Nick',
      entrance: null,
      status: 'unspecified',
      timestamp: 't2',
    },
    {
      receiver: 'Dan',
      item: 'Arrows',
      location: 'Sanctuary',
      locationOwner: 'Alice',
      entrance: null,
      status: 'priority',
      timestamp: 't3',
    },
  ]

  it('returns empty array for a player with no hints in their world', () => {
    const result = buildPlayerHints('Charlie', hints, new Map())
    expect(result).toEqual({ rows: [], totalCount: 0, foundCount: 0 })
  })

  it('returns only hints where locationOwner matches the player', () => {
    const result = buildPlayerHints('Nick', hints, new Map())
    expect(result.rows).toHaveLength(2)
    expect(result.rows.every((r) => ['Market Guard House Pot 30', 'Kakariko Potion Shop'].includes(r.location))).toBe(true)
  })

  it('carries location, item, and itemOwner (the receiver) through to rows', () => {
    const result = buildPlayerHints('Nick', hints, new Map())
    const boomerang = result.rows.find((r) => r.location === 'Market Guard House Pot 30')
    expect(boomerang).toEqual({
      location: 'Market Guard House Pot 30',
      item: 'Boomerang',
      itemOwner: 'Naizak',
      found: false,
    })
  })

  it('marks hints as found when the location appears in checkedLocations for that player', () => {
    const checked = new Map([
      ['Nick', new Set(['Market Guard House Pot 30'])],
    ])
    const result = buildPlayerHints('Nick', hints, checked)
    const byLocation = Object.fromEntries(result.rows.map((r) => [r.location, r.found]))
    expect(byLocation['Market Guard House Pot 30']).toBe(true)
    expect(byLocation['Kakariko Potion Shop']).toBe(false)
  })

  it('keeps found hints in the list (does not drop them)', () => {
    const checked = new Map([
      ['Nick', new Set(['Market Guard House Pot 30', 'Kakariko Potion Shop'])],
    ])
    const result = buildPlayerHints('Nick', hints, checked)
    expect(result.rows).toHaveLength(2)
    expect(result.rows.every((r) => r.found)).toBe(true)
  })

  it('sorts rows alphabetically by location name', () => {
    const result = buildPlayerHints('Nick', hints, new Map())
    expect(result.rows.map((r) => r.location)).toEqual([
      'Kakariko Potion Shop',
      'Market Guard House Pot 30',
    ])
  })

  it('returns totalCount and foundCount counts', () => {
    const checked = new Map([
      ['Nick', new Set(['Market Guard House Pot 30'])],
    ])
    const result = buildPlayerHints('Nick', hints, checked)
    expect(result.totalCount).toBe(2)
    expect(result.foundCount).toBe(1)
  })

  it('returns empty for an empty hints array', () => {
    const result = buildPlayerHints('Nick', [], new Map())
    expect(result).toEqual({ rows: [], totalCount: 0, foundCount: 0 })
  })

  it('includes incoming hints where receiver matches the player', () => {
    const result = buildPlayerHints('Naizak', hints, new Map())
    expect(result.rows).toEqual([
      {
        location: 'Market Guard House Pot 30',
        item: '',
        itemOwner: 'Nick',
        found: false,
      },
    ])
  })

  it('marks incoming hints as found using the location owner\'s checkedLocations', () => {
    const checked = new Map([
      ['Nick', new Set(['Market Guard House Pot 30'])],
    ])
    const result = buildPlayerHints('Naizak', hints, checked)
    expect(result.rows[0].found).toBe(true)
  })

  it('merges outgoing and incoming hints for a player into one sorted list', () => {
    const extra = {
      receiver: 'Nick',
      item: 'Bombs',
      location: 'Desert Temple',
      locationOwner: 'Alice',
      entrance: null,
      status: 'priority',
      timestamp: 't4',
    }
    const result = buildPlayerHints('Nick', [...hints, extra], new Map())
    expect(result.rows.map((r) => r.location)).toEqual([
      'Desert Temple',            // incoming, alphabetically first
      'Kakariko Potion Shop',     // outgoing
      'Market Guard House Pot 30', // outgoing
    ])
    const desert = result.rows.find((r) => r.location === 'Desert Temple')
    expect(desert.item).toBe('')
    expect(desert.itemOwner).toBe('Alice')
    expect(result.totalCount).toBe(3)
  })
})
