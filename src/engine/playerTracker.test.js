import { describe, it, expect } from 'vitest'
import { computePrioritySet } from './playerTracker'

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
