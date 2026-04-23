import { describe, it, expect } from 'vitest'
import { parseTrackerLog, parseTrackerTimestamp } from './trackerParser'

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
  it('returns checkedLocations map and lastCheckTime', () => {
    const { checkedLocations } = parseTrackerLog(SAMPLE_TRACKER)
    expect(checkedLocations).toBeInstanceOf(Map)
  })

  it('extracts checked locations for each player', () => {
    const { checkedLocations } = parseTrackerLog(SAMPLE_TRACKER)
    expect(checkedLocations.get('Alice')).toEqual(new Set(['KF Links House Pot', 'Location B']))
    expect(checkedLocations.get('Bob')).toEqual(new Set(['Missile (blue Brinstar middle)', 'Some Location']))
    expect(checkedLocations.get('Charlie')).toEqual(new Set(['Sanctuary']))
  })

  it('ignores non-send lines (notices, hints, loading)', () => {
    const { checkedLocations } = parseTrackerLog(SAMPLE_TRACKER)
    expect(checkedLocations.size).toBe(3)
  })

  it('handles items with parentheses like Bombs (5)', () => {
    const { checkedLocations } = parseTrackerLog(SAMPLE_TRACKER)
    expect(checkedLocations.get('Alice').has('Location B')).toBe(true)
  })

  it('handles items with parentheses like Piece of Heart (WINNER)', () => {
    const { checkedLocations } = parseTrackerLog(SAMPLE_TRACKER)
    expect(checkedLocations.get('Bob').has('Some Location')).toBe(true)
  })

  it('handles locations with parentheses like Missile (blue Brinstar middle)', () => {
    const { checkedLocations } = parseTrackerLog(SAMPLE_TRACKER)
    expect(checkedLocations.get('Bob').has('Missile (blue Brinstar middle)')).toBe(true)
  })

  it('returns empty map for empty input', () => {
    const { checkedLocations } = parseTrackerLog('')
    expect(checkedLocations.size).toBe(0)
  })

  it('returns the last check timestamp', () => {
    const { lastCheckTime } = parseTrackerLog(SAMPLE_TRACKER)
    expect(lastCheckTime).toBe('2026-04-10 23:07:00,000')
  })
})

describe('parseTrackerLog goal events', () => {
  const SAMPLE_WITH_GOAL = `[2026-04-13 02:42:50,493]: Notice (all): TNNPE (Team #1) has completed their goal.
[2026-04-13 02:42:50,493]: Notice (all): TNNPE (Team #1) has collected their items from other worlds.
[2026-04-13 02:42:50,528]: Notice (all): TNNPE (Team #1) has released all remaining items from their world.
[2026-04-14 00:29:46,713]: Notice (all): Nick (Team #1) has completed their goal.
`

  it('emits a goal event for each "has completed their goal" line', () => {
    const { events } = parseTrackerLog(SAMPLE_WITH_GOAL)
    const goals = events.filter((e) => e.type === 'goal')
    expect(goals).toHaveLength(2)
    expect(goals[0]).toMatchObject({
      type: 'goal',
      sender: 'TNNPE',
      timestamp: '2026-04-13 02:42:50,493',
    })
    expect(goals[1]).toMatchObject({
      type: 'goal',
      sender: 'Nick',
      timestamp: '2026-04-14 00:29:46,713',
    })
  })

  it('does not treat "collected" or "released" notices as goal events', () => {
    const { events } = parseTrackerLog(SAMPLE_WITH_GOAL)
    expect(events.filter((e) => e.type === 'goal')).toHaveLength(2)
  })
})

describe('parseTrackerTimestamp', () => {
  it('parses a tracker log timestamp as UTC (not local time)', () => {
    // The raw string has no timezone marker. The helper must interpret it
    // as UTC, NOT the browser's local timezone, so tooltips render with the
    // correct wall-clock time for the user via toLocaleString().
    const date = parseTrackerTimestamp('2026-04-14 01:11:33,970')
    expect(date).toBeInstanceOf(Date)
    // If the helper parses as UTC, these getters all return the numbers
    // from the raw string regardless of the machine's timezone.
    expect(date.getUTCFullYear()).toBe(2026)
    expect(date.getUTCMonth()).toBe(3) // April (zero-indexed)
    expect(date.getUTCDate()).toBe(14)
    expect(date.getUTCHours()).toBe(1)
    expect(date.getUTCMinutes()).toBe(11)
    expect(date.getUTCSeconds()).toBe(33)
    expect(date.getUTCMilliseconds()).toBe(970)
  })

  it('returns null for null or undefined input', () => {
    expect(parseTrackerTimestamp(null)).toBeNull()
    expect(parseTrackerTimestamp(undefined)).toBeNull()
    expect(parseTrackerTimestamp('')).toBeNull()
  })

  it('returns null for a malformed timestamp', () => {
    expect(parseTrackerTimestamp('not a timestamp')).toBeNull()
  })
})

describe('parseTrackerLog hint parsing', () => {
  it('returns an empty array when there are no hint lines', () => {
    const log = `[2026-04-10 23:00:00,000]: (Team #1) Alice sent Hookshot to Bob (KF Links House Pot)\n`
    const { hints } = parseTrackerLog(log)
    expect(hints).toEqual([])
  })

  it('returns an empty array for empty input', () => {
    const { hints } = parseTrackerLog('')
    expect(hints).toEqual([])
  })

  it('extracts a basic hint with all fields', () => {
    const log = `[2026-04-11 00:44:02,765]: Notice (Team #1): [Hint]: Dan's Wave Beam is at Water Temple Boss Key Chest in Nick's World. (priority)\n`
    const { hints } = parseTrackerLog(log)
    expect(hints).toHaveLength(1)
    expect(hints[0]).toEqual({
      timestamp: '2026-04-11 00:44:02,765',
      receiver: 'Dan',
      item: 'Wave Beam',
      location: 'Water Temple Boss Key Chest',
      locationOwner: 'Nick',
      entrance: null,
      status: 'priority',
    })
  })

  it('extracts all three known status types', () => {
    const log = [
      `[t1]: Notice (Team #1): [Hint]: A's Sword is at Loc1 in B's World. (priority)`,
      `[t2]: Notice (Team #1): [Hint]: A's Shield is at Loc2 in B's World. (unspecified)`,
      `[t3]: Notice (Team #1): [Hint]: A's Bow is at Loc3 in B's World. (found)`,
    ].join('\n')
    const { hints } = parseTrackerLog(log)
    expect(hints.map((h) => h.status)).toEqual(['priority', 'unspecified', 'found'])
  })

  it('captures optional entrance info', () => {
    const log = `[t]: Notice (Team #1): [Hint]: Andrew's Progressive Sword is at Dodongos Cavern GS Back Room in Naizak's World at Kakariko Village -> Bottom of the Well. (priority)\n`
    const { hints } = parseTrackerLog(log)
    expect(hints[0].entrance).toBe('Kakariko Village -> Bottom of the Well')
  })

  it('captures entrance info that contains parentheses', () => {
    const log = `[t]: Notice (Team #1): [Hint]: Brian's Scimitar is at Skull Woods - Map Chest in Andrew's World at Skull Woods Second Section Door (East). (found)\n`
    const { hints } = parseTrackerLog(log)
    expect(hints[0].entrance).toBe('Skull Woods Second Section Door (East)')
    expect(hints[0].status).toBe('found')
  })

  it('handles items with parentheses like Deku Stick (1)', () => {
    const log = `[t]: Notice (Team #1): [Hint]: Nick's Deku Stick (1) is at FS: Soul Arrow - shop in TNNPE's World. (unspecified)\n`
    const { hints } = parseTrackerLog(log)
    expect(hints[0].item).toBe('Deku Stick (1)')
    expect(hints[0].location).toBe('FS: Soul Arrow - shop')
  })

  it("handles locations containing apostrophe-s like Link's Uncle", () => {
    const log = `[t]: Notice (Team #1): [Hint]: Brian's Membership Card is at Link's Uncle in Andrew's World at Kakariko Well Cave. (found)\n`
    const { hints } = parseTrackerLog(log)
    expect(hints[0].location).toBe("Link's Uncle")
    expect(hints[0].locationOwner).toBe('Andrew')
    expect(hints[0].entrance).toBe('Kakariko Well Cave')
  })

  it('handles locations containing the substring " in " and owners later', () => {
    const log = `[t]: Notice (Team #1): [Hint]: Andrew's Flippers is at FS: Eastern Leggings - Easterner's Ashes in TNNPE's World. (priority)\n`
    const { hints } = parseTrackerLog(log)
    expect(hints[0].location).toBe("FS: Eastern Leggings - Easterner's Ashes")
    expect(hints[0].locationOwner).toBe('TNNPE')
  })

  it('handles locations whose name itself ends with " in <something>" before the world', () => {
    // Real fixture from a Dark Souls 3 randomizer log: location name has " in RS"
    // as a meaningful suffix (Region Snippet abbreviation), and the regex must
    // backtrack to the LAST " in " before "'s World" — not the first.
    const log = `[t]: Notice (Team #1): [Hint]: Nick's Blue Rupee is at FS: Exile Mask - shop after killing NPCs in RS in TNNPE's World. (unspecified)\n`
    const { hints } = parseTrackerLog(log)
    expect(hints[0].location).toBe('FS: Exile Mask - shop after killing NPCs in RS')
    expect(hints[0].locationOwner).toBe('TNNPE')
  })

  it('deduplicates identical hints, keeping the latest status', () => {
    const log = [
      `[t1]: Notice (Team #1): [Hint]: Dan's Wave Beam is at Water Temple Boss Key Chest in Nick's World. (priority)`,
      `[t2]: Notice (Team #1): [Hint]: Dan's Wave Beam is at Water Temple Boss Key Chest in Nick's World. (found)`,
    ].join('\n')
    const { hints } = parseTrackerLog(log)
    expect(hints).toHaveLength(1)
    expect(hints[0].status).toBe('found')
  })

  it('hint parsing does not interfere with send-line parsing in the same log', () => {
    const log = [
      `[t1]: Notice (Team #1): [Hint]: Dan's Wave Beam is at Water Temple Boss Key Chest in Nick's World. (priority)`,
      `[t2]: (Team #1) Alice sent Hookshot to Bob (KF Links House Pot)`,
    ].join('\n')
    const { checkedLocations, hints } = parseTrackerLog(log)
    expect(checkedLocations.size).toBe(1)
    expect(checkedLocations.get('Alice')).toEqual(new Set(['KF Links House Pot']))
    expect(hints).toHaveLength(1)
  })
})

describe('parseTrackerLog events array', () => {
  it('returns an empty events array for empty input', () => {
    const { events } = parseTrackerLog('')
    expect(events).toEqual([])
  })

  it('returns an empty events array when only join/notice lines are present', () => {
    const log = [
      `[2026-04-10 23:00:00,000]: Loading embedded data package for game Ocarina of Time`,
      `[2026-04-10 23:01:00,000]: Notice (all): Alice (Team #1) playing Ocarina of Time has joined. Client(0.6.5), ['AP'].`,
    ].join('\n')
    const { events } = parseTrackerLog(log)
    expect(events).toEqual([])
  })

  it('extracts sent-line events with type, timestamp, sender, item, receiver, location', () => {
    const log = `[2026-04-10 23:02:00,000]: (Team #1) Alice sent Hookshot to Bob (KF Links House Pot)\n`
    const { events } = parseTrackerLog(log)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      type: 'sent',
      timestamp: '2026-04-10 23:02:00,000',
      sender: 'Alice',
      item: 'Hookshot',
      receiver: 'Bob',
      location: 'KF Links House Pot',
    })
  })

  it('extracts hint-line events with type, timestamp, sender (= locationOwner), receiver, item, location, status', () => {
    const log = `[2026-04-10 23:05:00,000]: Notice (Team #1): [Hint]: Alice's Bow is at Sanctuary in Charlie's World. (priority)\n`
    const { events } = parseTrackerLog(log)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      type: 'hint',
      timestamp: '2026-04-10 23:05:00,000',
      sender: 'Charlie',
      item: 'Bow',
      receiver: 'Alice',
      location: 'Sanctuary',
      status: 'priority',
    })
  })

  it('preserves chronological (file) order with interleaved sent and hint lines', () => {
    const log = [
      `[2026-04-10 23:02:00,000]: (Team #1) Alice sent Hookshot to Bob (KF Links House Pot)`,
      `[2026-04-10 23:05:00,000]: Notice (Team #1): [Hint]: Alice's Bow is at Sanctuary in Charlie's World. (priority)`,
      `[2026-04-10 23:06:00,000]: (Team #1) Charlie sent Bow to Alice (Sanctuary)`,
    ].join('\n')
    const { events } = parseTrackerLog(log)
    expect(events.map((e) => e.type)).toEqual(['sent', 'hint', 'sent'])
    expect(events[0].timestamp).toBe('2026-04-10 23:02:00,000')
    expect(events[1].timestamp).toBe('2026-04-10 23:05:00,000')
    expect(events[2].timestamp).toBe('2026-04-10 23:06:00,000')
  })

  it('preserves self-send events (sender === receiver) as a single entry', () => {
    const log = `[2026-04-10 23:04:00,000]: (Team #1) Alice sent Bombs (5) to Alice (Location B)\n`
    const { events } = parseTrackerLog(log)
    expect(events).toHaveLength(1)
    expect(events[0].sender).toBe('Alice')
    expect(events[0].receiver).toBe('Alice')
    expect(events[0].item).toBe('Bombs (5)')
    expect(events[0].location).toBe('Location B')
  })

  it('extracts items that contain parentheses like Piece of Heart (WINNER)', () => {
    const log = `[2026-04-10 23:07:00,000]: (Team #1) Bob sent Piece of Heart (WINNER) to Bob (Some Location)\n`
    const { events } = parseTrackerLog(log)
    expect(events[0].item).toBe('Piece of Heart (WINNER)')
    expect(events[0].location).toBe('Some Location')
  })

  it('extracts locations that contain parentheses like Missile (blue Brinstar middle)', () => {
    const log = `[2026-04-10 23:03:00,000]: (Team #1) Bob sent Red Rupee to Alice (Missile (blue Brinstar middle))\n`
    const { events } = parseTrackerLog(log)
    expect(events[0].location).toBe('Missile (blue Brinstar middle)')
    expect(events[0].item).toBe('Red Rupee')
  })

  it('extracts item names that contain the substring " to "', () => {
    // Contrived but plausible — some custom games have item names with "to" in them.
    // The greedy item capture must find the LAST " to " (the real receiver boundary),
    // not the first one.
    const log = `[2026-04-10 23:08:00,000]: (Team #1) Alice sent Sword of Boots to Gloves to Bob (Chest)\n`
    const { events } = parseTrackerLog(log)
    expect(events).toHaveLength(1)
    expect(events[0].item).toBe('Sword of Boots to Gloves')
    expect(events[0].receiver).toBe('Bob')
    expect(events[0].location).toBe('Chest')
  })

  it('existing checkedLocations and hints outputs are unchanged', () => {
    const { checkedLocations, hints } = parseTrackerLog(SAMPLE_TRACKER)
    expect(checkedLocations.get('Alice')).toEqual(new Set(['KF Links House Pot', 'Location B']))
    expect(checkedLocations.get('Bob')).toEqual(new Set(['Missile (blue Brinstar middle)', 'Some Location']))
    expect(checkedLocations.get('Charlie')).toEqual(new Set(['Sanctuary']))
    expect(hints).toHaveLength(1)
    expect(hints[0].receiver).toBe('Alice')
  })
})
