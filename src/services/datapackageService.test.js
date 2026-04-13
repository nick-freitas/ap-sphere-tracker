import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveDatapackages, clearDatapackageCache } from './datapackageService'

describe('resolveDatapackages (index manifest)', () => {
  beforeEach(() => {
    clearDatapackageCache()
    vi.restoreAllMocks()
  })

  function mockFetch(responses) {
    global.fetch = vi.fn(async (url) => {
      for (const [matcher, body] of responses) {
        if (url.includes(matcher)) {
          return {
            ok: true,
            status: 200,
            json: async () => body,
            text: async () => JSON.stringify(body),
          }
        }
      }
      return { ok: false, status: 404, json: async () => ({}), text: async () => '' }
    })
  }

  it('returns an empty missingGames list when all games are in the index', async () => {
    mockFetch([
      ['index.json', { 'Ocarina of Time': 'oot123', 'A Link to the Past': 'alttp456' }],
      ['oot123.json', { item_name_to_id: {}, location_name_to_id: {} }],
      ['alttp456.json', { item_name_to_id: {}, location_name_to_id: {} }],
    ])
    const players = [
      { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
      { slot: 2, name: 'Bob', game: 'A Link to the Past' },
    ]
    const result = await resolveDatapackages(players)
    expect(result.missingGames).toEqual([])
    expect(result.datapackages.get('Ocarina of Time')).toBeDefined()
    expect(result.datapackages.get('A Link to the Past')).toBeDefined()
  })

  it('returns a missingGames entry for any game absent from the index', async () => {
    mockFetch([
      ['index.json', { 'Ocarina of Time': 'oot123' }],
      ['oot123.json', { item_name_to_id: {}, location_name_to_id: {} }],
    ])
    const players = [
      { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
      { slot: 2, name: 'Bob', game: 'Super Custom Z' },
    ]
    const result = await resolveDatapackages(players)
    expect(result.missingGames).toEqual(['Super Custom Z'])
    expect(result.datapackages.get('Ocarina of Time')).toBeDefined()
    expect(result.datapackages.has('Super Custom Z')).toBe(false)
  })

  it('returns all games as missing when index fetch fails', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 404 }))
    const players = [
      { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
      { slot: 2, name: 'Bob', game: 'A Link to the Past' },
    ]
    const result = await resolveDatapackages(players)
    expect(result.missingGames).toEqual(['Ocarina of Time', 'A Link to the Past'])
  })

  it('deduplicates games across players', async () => {
    mockFetch([
      ['index.json', { 'Ocarina of Time': 'oot123' }],
      ['oot123.json', { item_name_to_id: {}, location_name_to_id: {} }],
    ])
    const players = [
      { slot: 1, name: 'Alice', game: 'Ocarina of Time' },
      { slot: 2, name: 'Bob', game: 'Ocarina of Time' },
    ]
    const result = await resolveDatapackages(players)
    expect(result.missingGames).toEqual([])
    expect(result.datapackages.size).toBe(1)
  })

  it('returns a missingGames entry when the per-package fetch fails', async () => {
    mockFetch([
      ['index.json', { 'Ocarina of Time': 'oot123' }],
      // Deliberately no mock for oot123.json — mockFetch default returns 404.
    ])
    const players = [{ slot: 1, name: 'Alice', game: 'Ocarina of Time' }]
    const result = await resolveDatapackages(players)
    expect(result.missingGames).toEqual(['Ocarina of Time'])
    expect(result.datapackages.has('Ocarina of Time')).toBe(false)
  })

  it('caches index and per-package fetches across calls within a session', async () => {
    mockFetch([
      ['index.json', { 'Ocarina of Time': 'oot123' }],
      ['oot123.json', { item_name_to_id: {}, location_name_to_id: {} }],
    ])
    const players = [{ slot: 1, name: 'Alice', game: 'Ocarina of Time' }]
    await resolveDatapackages(players)
    await resolveDatapackages(players)
    // index.json fetched once, oot123.json fetched once — total 2 fetch calls for 2 resolves.
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
