import { describe, it, expect } from 'vitest'
import { parseTrackerLog } from './trackerParser'

const SAMPLE_TRACKER = `[2026-04-10 23:00:00,000]: Loading embedded data package for game Ocarina of Time
[2026-04-10 23:01:00,000]: Notice (all): Alice (Team #1) playing Ocarina of Time has joined. Client(0.6.5), ['AP'].
[2026-04-10 23:02:00,000]: (Team #1) Alice sent Hookshot to Bob (KF Links House Pot)
[2026-04-10 23:03:00,000]: (Team #1) Bob sent Red Rupee to Alice (Missile (blue Brinstar middle))
[2026-04-10 23:04:00,000]: (Team #1) Alice sent Bombs (5) to Alice (Location B)
[2026-04-10 23:05:00,000]: Notice (Team #1): [Hint]: Alice's Bow is at Sanctuary in Charlie's World. (unspecified)
[2026-04-10 23:06:00,000]: (Team #1) Charlie sent Bow to Alice (Sanctuary)
[2026-04-10 23:07:00,000]: (Team #1) Bob sent Piece of Heart (WINNER) to Bob (Some Location)
`

describe('parseTrackerLog', () => {
  it('returns a map of player names to sets of checked locations', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result).toBeInstanceOf(Map)
  })

  it('extracts checked locations for each player', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.get('Alice')).toEqual(new Set(['KF Links House Pot', 'Location B']))
    expect(result.get('Bob')).toEqual(new Set(['Missile (blue Brinstar middle)', 'Some Location']))
    expect(result.get('Charlie')).toEqual(new Set(['Sanctuary']))
  })

  it('ignores non-send lines (notices, hints, loading)', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.size).toBe(3)
  })

  it('handles items with parentheses like Bombs (5)', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.get('Alice').has('Location B')).toBe(true)
  })

  it('handles items with parentheses like Piece of Heart (WINNER)', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.get('Bob').has('Some Location')).toBe(true)
  })

  it('handles locations with parentheses like Missile (blue Brinstar middle)', () => {
    const result = parseTrackerLog(SAMPLE_TRACKER)
    expect(result.get('Bob').has('Missile (blue Brinstar middle)')).toBe(true)
  })

  it('returns empty map for empty input', () => {
    const result = parseTrackerLog('')
    expect(result.size).toBe(0)
  })
})
