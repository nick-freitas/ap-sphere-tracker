import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { parseSpoilerLogRaw } from './spoilerParser'

const SAMPLE_SPOILER_WITH_COUNTS = `Archipelago Version 0.6.5  -  Seed: 12345

Players:                         3

Player 1: Alice
Game:                            Ocarina of Time
Location Count:                  271
Logic Rules:                     Glitchless

Player 2: Bob
Game:                            Super Metroid
Location Count:                  643
Logic Rules:                     Glitchless

Player 3: Charlie
Game:                            A Link to the Past
Location Count:                  100
Logic Rules:                     Glitchless


Locations:


Playthrough:

0: {
}

Paths:
`

const SAMPLE_SPOILER = `Archipelago Version 0.6.5  -  Seed: 12345

Filling Algorithm:               balanced
Players:                         3

Player 1: Alice
Game:                            Ocarina of Time
Logic Rules:                     Glitchless

Player 2: Bob
Game:                            Super Metroid
Logic Rules:                     Glitchless

Player 3: Charlie
Game:                            A Link to the Past
Logic Rules:                     Glitchless


Entrances:


Locations:

KF Kokiri Sword Chest (Alice): Kokiri Sword (Alice)
Morphing Ball (Bob): Morph Ball (Bob)
Sanctuary (Charlie): Big Key (Hyrule Castle) (Charlie)


Playthrough:

0: {

}
1: {
  KF Links House Pot (Alice): Hookshot (Bob)
  Location B (Alice): Bombs (5) (Alice)
  Morphing Ball (Bob): Progressive Sword (Charlie)
  Missile (blue Brinstar middle) (Bob): Red Rupee (Alice)
}
2: {
  Sanctuary (Charlie): Bow (Alice)
  Small Key Chest (Charlie): Small Key (Forest Temple) (Alice)
}

Paths:
`

describe('parseSpoilerLogRaw', () => {
  describe('player parsing', () => {
    it('extracts all players with slot, name, and game', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.players).toHaveLength(3)
      expect(result.players[0]).toMatchObject({ slot: 1, name: 'Alice', game: 'Ocarina of Time' })
      expect(result.players[1]).toMatchObject({ slot: 2, name: 'Bob', game: 'Super Metroid' })
      expect(result.players[2]).toMatchObject({ slot: 3, name: 'Charlie', game: 'A Link to the Past' })
    })
  })

  describe('sphere parsing', () => {
    it('parses sphere 0 with precollected items', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.spheres[0].number).toBe(0)
      expect(result.spheres[0].entries).toEqual([])
      expect(result.spheres[0].precollected).toBeDefined()
    })

    it('parses sphere 1 entries with correct fields', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.spheres[1].number).toBe(1)
      expect(result.spheres[1].entries).toContainEqual({
        location: 'KF Links House Pot',
        locationOwner: 'Alice',
        item: 'Hookshot',
        itemOwner: 'Bob',
      })
    })

    it('handles items with parentheses in their name', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.spheres[1].entries).toContainEqual({
        location: 'Location B',
        locationOwner: 'Alice',
        item: 'Bombs (5)',
        itemOwner: 'Alice',
      })
    })

    it('handles locations with parentheses in their name', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.spheres[1].entries).toContainEqual({
        location: 'Missile (blue Brinstar middle)',
        locationOwner: 'Bob',
        item: 'Red Rupee',
        itemOwner: 'Alice',
      })
    })

    it('handles items like Small Key (DungeonName)', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.spheres[2].entries).toContainEqual({
        location: 'Small Key Chest',
        locationOwner: 'Charlie',
        item: 'Small Key (Forest Temple)',
        itemOwner: 'Alice',
      })
    })

    it('filters out non-item entries where location equals item', () => {
      const spoilerWithSubrule = `Archipelago Version 0.6.5  -  Seed: 99

Players:                         1

Player 1: Alice
Game:                            Ocarina of Time


Playthrough:

1: {
  Real Location (Alice): Real Item (Alice)
  Some Subrule 1 (Alice): Some Subrule 1 (Alice)
}

Paths:
`
      const result = parseSpoilerLogRaw(spoilerWithSubrule)
      expect(result.spheres[0].entries).toHaveLength(1)
      expect(result.spheres[0].entries[0].location).toBe('Real Location')
    })

    it('returns correct number of spheres', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.spheres).toHaveLength(3)
    })

    it('returns correct entry count per sphere', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.spheres[1].entries).toHaveLength(4)
      expect(result.spheres[2].entries).toHaveLength(2)
    })
  })

  describe('header counts', () => {
    it('extracts Location Count per player from the header', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER_WITH_COUNTS)
      expect(result.headerCounts).toBeInstanceOf(Map)
      expect(result.headerCounts.get('Alice')).toBe(271)
      expect(result.headerCounts.get('Bob')).toBe(643)
      expect(result.headerCounts.get('Charlie')).toBe(100)
    })

    it('returns an empty Map when no Location Count lines are present', () => {
      const result = parseSpoilerLogRaw(SAMPLE_SPOILER)
      expect(result.headerCounts).toBeInstanceOf(Map)
      expect(result.headerCounts.size).toBe(0)
    })
  })
})

describe('parseLocations (via parseSpoilerLogRaw)', () => {
  const LOCATIONS_SPOILER = `Archipelago Version 0.6.5  -  Seed: 42

Players:                         2

Player 1: Alice
Game:                            Ocarina of Time

Player 2: Bob
Game:                            A Link to the Past


Entrances:


Locations:

KF Kokiri Sword Chest (Alice): Kokiri Sword (Alice)
HF Open Grotto (Alice): Bombs (5) (Bob)
Links Pocket (Alice): Spirit Medallion (Alice)
Some Subrule (Alice): Some Subrule (Alice)
Floodgate (Alice): Open Floodgate (Alice)
Mushroom (Bob): Retaliating Slash (Bob)
Missile (blue Brinstar middle) (Bob): Small Key (Forest Temple) (Alice)


Playthrough:

0: {
  Starting Item (Alice)
}
1: {
  KF Kokiri Sword Chest (Alice): Kokiri Sword (Alice)
}

Paths:
`

  it('returns a Map keyed by locationOwner', () => {
    const result = parseSpoilerLogRaw(LOCATIONS_SPOILER)
    expect(result.playerLocations).toBeInstanceOf(Map)
    expect(result.playerLocations.size).toBe(2)
    expect(result.playerLocations.has('Alice')).toBe(true)
    expect(result.playerLocations.has('Bob')).toBe(true)
  })

  it('extracts each entry with location, item, and itemOwner', () => {
    const result = parseSpoilerLogRaw(LOCATIONS_SPOILER)
    const bob = result.playerLocations.get('Bob')
    expect(bob).toContainEqual({
      location: 'Mushroom',
      item: 'Retaliating Slash',
      itemOwner: 'Bob',
    })
    expect(bob).toContainEqual({
      location: 'Missile (blue Brinstar middle)',
      item: 'Small Key (Forest Temple)',
      itemOwner: 'Alice',
    })
  })

  it('skips self-reference entries where location equals item', () => {
    const result = parseSpoilerLogRaw(LOCATIONS_SPOILER)
    const alice = result.playerLocations.get('Alice')
    expect(alice.find((l) => l.location === 'Some Subrule')).toBeUndefined()
  })

  it('stops at Playthrough: section boundary', () => {
    const result = parseSpoilerLogRaw(LOCATIONS_SPOILER)
    // If parsing bled into Playthrough, we'd get duplicate Kokiri Sword Chest entries
    const alice = result.playerLocations.get('Alice')
    const matches = alice.filter((l) => l.location === 'KF Kokiri Sword Chest')
    expect(matches).toHaveLength(1)
  })

  it('returns an empty Map when no Locations section exists', () => {
    const noLocations = `Archipelago Version 0.6.5

Players:                         1

Player 1: Alice
Game:                            Ocarina of Time


Playthrough:

1: {
  Loc (Alice): Item (Alice)
}

Paths:
`
    const result = parseSpoilerLogRaw(noLocations)
    expect(result.playerLocations).toBeInstanceOf(Map)
    expect(result.playerLocations.size).toBe(0)
  })

  it('handles the real-world test-data fixture (7 players, non-empty rows)', () => {
    const fixturePath = new URL('../../test-data/AP_30073646564439677477_Spoiler.txt', import.meta.url)
    const text = readFileSync(fixturePath, 'utf8')
    const result = parseSpoilerLogRaw(text)
    expect(result.playerLocations.size).toBe(7)
    const totalRows = [...result.playerLocations.values()].reduce((sum, arr) => sum + arr.length, 0)
    expect(totalRows).toBeGreaterThan(0)
  })
})
