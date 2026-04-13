import { describe, it, expect } from 'vitest'
import { buildPlayerLog } from './playerLog'

const sentEvent = (overrides = {}) => ({
  type: 'sent',
  timestamp: '2026-04-10 23:00:00,000',
  sender: 'Alice',
  receiver: 'Bob',
  item: 'Hookshot',
  location: 'KF Links House Pot',
  ...overrides,
})

const hintEvent = (overrides = {}) => ({
  type: 'hint',
  timestamp: '2026-04-10 23:00:00,000',
  sender: 'Alice',
  receiver: 'Bob',
  item: 'Hookshot',
  location: 'KF Links House Pot',
  status: 'priority',
  ...overrides,
})

describe('buildPlayerLog', () => {
  it('returns [] when both toggles are off', () => {
    const events = [
      sentEvent({ timestamp: 't1' }),
      sentEvent({ timestamp: 't2' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: false, sending: false, searchQuery: '' })
    expect(result).toEqual([])
  })

  it('returns [] for an empty events array', () => {
    const result = buildPlayerLog('Alice', [], { receiving: true, sending: true, searchQuery: '' })
    expect(result).toEqual([])
  })

  it('receiving only: returns events where the player is the receiver', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Charlie', receiver: 'Alice', item: 'A' }),
      sentEvent({ timestamp: 't2', sender: 'Alice', receiver: 'Bob', item: 'B' }),
      sentEvent({ timestamp: 't3', sender: 'Dave', receiver: 'Alice', item: 'C' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: false, searchQuery: '' })
    expect(result.map((e) => e.item)).toEqual(['C', 'A'])
  })

  it('sending only: returns events where the player is the sender', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Alice', receiver: 'Bob', item: 'A' }),
      sentEvent({ timestamp: 't2', sender: 'Charlie', receiver: 'Alice', item: 'B' }),
      sentEvent({ timestamp: 't3', sender: 'Alice', receiver: 'Dave', item: 'C' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: false, sending: true, searchQuery: '' })
    expect(result.map((e) => e.item)).toEqual(['C', 'A'])
  })

  it('both toggles: returns a union of receiver-match and sender-match, newest first', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Alice', receiver: 'Bob', item: 'A' }),
      sentEvent({ timestamp: 't2', sender: 'Charlie', receiver: 'Alice', item: 'B' }),
      sentEvent({ timestamp: 't3', sender: 'Dave', receiver: 'Eve', item: 'C' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: true, searchQuery: '' })
    expect(result.map((e) => e.item)).toEqual(['B', 'A'])
  })

  it('self-send events appear exactly once when both toggles are on', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Alice', receiver: 'Alice', item: 'Self' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: true, searchQuery: '' })
    expect(result).toHaveLength(1)
    expect(result[0].item).toBe('Self')
  })

  it('search query is case-insensitive and matches the location column', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Charlie', receiver: 'Alice', location: 'KF Kokiri Sword Chest' }),
      sentEvent({ timestamp: 't2', sender: 'Charlie', receiver: 'Alice', location: 'Sanctuary' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: false, searchQuery: 'SANCT' })
    expect(result).toHaveLength(1)
    expect(result[0].location).toBe('Sanctuary')
  })

  it('search query matches the item column', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Charlie', receiver: 'Alice', item: 'Kokiri Sword' }),
      sentEvent({ timestamp: 't2', sender: 'Charlie', receiver: 'Alice', item: 'Bow' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: false, searchQuery: 'sword' })
    expect(result).toHaveLength(1)
    expect(result[0].item).toBe('Kokiri Sword')
  })

  it('search query does NOT match sender or receiver names', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Charlie', receiver: 'Alice', item: 'Bow', location: 'Sanctuary' }),
      sentEvent({ timestamp: 't2', sender: 'Charlie', receiver: 'Alice', item: 'Hookshot', location: 'Grotto' }),
    ]
    // "Charlie" is a sender name — should match zero rows because we only
    // search location + item.
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: false, searchQuery: 'Charlie' })
    expect(result).toHaveLength(0)
  })

  it('empty/whitespace search query is treated as no filter', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Charlie', receiver: 'Alice', item: 'A' }),
      sentEvent({ timestamp: 't2', sender: 'Dave', receiver: 'Alice', item: 'B' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: false, searchQuery: '   ' })
    expect(result).toHaveLength(2)
  })

  it('hint events are filtered by the same receiver/sender semantics', () => {
    const events = [
      hintEvent({ timestamp: 't1', sender: 'Alice', receiver: 'Bob', item: 'A' }),        // sending-side (Alice's location)
      hintEvent({ timestamp: 't2', sender: 'Charlie', receiver: 'Alice', item: 'B' }),    // receiving-side (Alice gets the hint)
      hintEvent({ timestamp: 't3', sender: 'Dave', receiver: 'Eve', item: 'C' }),         // neither
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: true, searchQuery: '' })
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.item)).toEqual(['B', 'A'])
  })

  it('mixed sent and hint events are included together when filters match', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Charlie', receiver: 'Alice', item: 'Sent-A' }),
      hintEvent({ timestamp: 't2', sender: 'Dave', receiver: 'Alice', item: 'Hint-A' }),
      sentEvent({ timestamp: 't3', sender: 'Eve', receiver: 'Alice', item: 'Sent-B' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: false, searchQuery: '' })
    expect(result).toHaveLength(3)
    expect(result.map((e) => e.item)).toEqual(['Sent-B', 'Hint-A', 'Sent-A'])
  })

  it('returned rows are in reverse chronological order (newest first)', () => {
    const events = [
      sentEvent({ timestamp: 't1', sender: 'Charlie', receiver: 'Alice', item: 'oldest' }),
      sentEvent({ timestamp: 't2', sender: 'Charlie', receiver: 'Alice', item: 'middle' }),
      sentEvent({ timestamp: 't3', sender: 'Charlie', receiver: 'Alice', item: 'newest' }),
    ]
    const result = buildPlayerLog('Alice', events, { receiving: true, sending: false, searchQuery: '' })
    expect(result[0].item).toBe('newest')
    expect(result[1].item).toBe('middle')
    expect(result[2].item).toBe('oldest')
  })
})
