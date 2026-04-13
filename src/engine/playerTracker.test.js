import { describe, it, expect } from 'vitest'
import { computePrioritySet } from './playerTracker'
import { buildPlayerTracker } from './playerTracker'

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
