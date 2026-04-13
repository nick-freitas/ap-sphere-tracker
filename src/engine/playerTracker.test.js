import { describe, it, expect } from 'vitest'
import { buildPlayerTracker } from './playerTracker'
import { buildPlayerHints } from './playerTracker'

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

  it('returns empty result for an unknown player', () => {
    const result = buildPlayerTracker('NotAPlayer', spoilerData, new Map())
    expect(result).toEqual({ rows: [], totalCount: 0, foundCount: 0 })
  })

  it('sorts all rows alphabetically by location name (case-insensitive)', () => {
    const result = buildPlayerTracker('Alice', spoilerData, new Map())
    expect(result.rows.map((r) => r.location)).toEqual([
      'apple Loc',
      'Banana Loc',
      'Cherry Loc',
      'Zebra Loc',
    ])
  })

  it('marks found flag from checkedLocations', () => {
    const checked = new Map([
      ['Alice', new Set(['Zebra Loc', 'apple Loc'])],
    ])
    const result = buildPlayerTracker('Alice', spoilerData, checked)
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
    const result = buildPlayerTracker('Alice', spoilerData, checked)
    expect(result.totalCount).toBe(4)
    expect(result.foundCount).toBe(2)
  })

  it('treats missing checkedLocations entry for a player as all unfound', () => {
    const result = buildPlayerTracker('Alice', spoilerData, new Map())
    expect(result.foundCount).toBe(0)
    expect(result.rows.every((r) => r.found === false)).toBe(true)
  })

  it('carries item and itemOwner through to rows without a priority flag', () => {
    const result = buildPlayerTracker('Bob', spoilerData, new Map())
    expect(result.rows).toEqual([
      {
        location: 'Solo Loc',
        item: 'Morph Ball',
        itemOwner: 'Bob',
        found: false,
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
      direction: 'sending',
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
        item: 'Boomerang',
        itemOwner: 'Nick',
        found: false,
        direction: 'receiving',
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
    expect(desert.item).toBe('Bombs')
    expect(desert.itemOwner).toBe('Alice')
    expect(result.totalCount).toBe(3)
  })
})
