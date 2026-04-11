import { describe, it, expect } from 'vitest'
import { analyzeSpheres } from './sphereAnalyzer'

const spoilerData = {
  players: [
    { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
    { slot: 2, name: 'Bob', game: 'Super Metroid' },
    { slot: 3, name: 'Charlie', game: 'A Link to the Past' },
  ],
  spheres: [
    { number: 0, entries: [] },
    {
      number: 1,
      entries: [
        { location: 'Loc A', locationOwner: 'Alice', item: 'Hookshot', itemOwner: 'Bob' },
        { location: 'Loc B', locationOwner: 'Alice', item: 'Bombs', itemOwner: 'Alice' },
        { location: 'Loc C', locationOwner: 'Bob', item: 'Sword', itemOwner: 'Charlie' },
        { location: 'Loc D', locationOwner: 'Bob', item: 'Shield', itemOwner: 'Alice' },
      ],
    },
    {
      number: 2,
      entries: [
        { location: 'Loc E', locationOwner: 'Charlie', item: 'Bow', itemOwner: 'Alice' },
        { location: 'Loc F', locationOwner: 'Charlie', item: 'Lamp', itemOwner: 'Bob' },
      ],
    },
  ],
}

describe('analyzeSpheres', () => {
  it('calculates completion percentage correctly', () => {
    const checked = new Map([
      ['Alice', new Set(['Loc A', 'Loc B'])],
      ['Bob', new Set(['Loc C'])],
    ])

    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].completionPercent).toBe(75)
    expect(results[2].completionPercent).toBe(0)
  })

  it('returns missing checks for each sphere', () => {
    const checked = new Map([
      ['Alice', new Set(['Loc A', 'Loc B'])],
      ['Bob', new Set(['Loc C'])],
    ])

    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].missingChecks).toEqual([
      { player: 'Bob', location: 'Loc D', item: 'Shield', itemOwner: 'Alice' },
    ])
  })

  it('returns empty missing checks for 100% complete sphere', () => {
    const checked = new Map([
      ['Alice', new Set(['Loc A', 'Loc B'])],
      ['Bob', new Set(['Loc C', 'Loc D'])],
    ])

    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].missingChecks).toEqual([])
    expect(results[1].completionPercent).toBe(100)
  })

  it('handles sphere 0 (empty) correctly', () => {
    const checked = new Map()
    const results = analyzeSpheres(spoilerData, checked)
    expect(results[0].completionPercent).toBe(100)
    expect(results[0].missingChecks).toEqual([])
    expect(results[0].totalChecks).toBe(0)
  })

  it('handles no tracker data (empty map)', () => {
    const checked = new Map()
    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].completionPercent).toBe(0)
    expect(results[1].missingChecks).toHaveLength(4)
  })

  it('returns totalChecks and completedChecks counts', () => {
    const checked = new Map([
      ['Alice', new Set(['Loc A'])],
    ])

    const results = analyzeSpheres(spoilerData, checked)
    expect(results[1].totalChecks).toBe(4)
    expect(results[1].completedChecks).toBe(1)
  })

  it('preserves sphere number in results', () => {
    const checked = new Map()
    const results = analyzeSpheres(spoilerData, checked)
    expect(results[0].sphereNumber).toBe(0)
    expect(results[1].sphereNumber).toBe(1)
    expect(results[2].sphereNumber).toBe(2)
  })
})
