export const DEFAULT_IGNORE_ITEMS = `# Game logic events (not real items)
Time Travel
Child Can Pass Time
Adult Can Pass Time
Can Access Fish
Jabu Jabus Belly Ruto In 1F Rescued
Open Floodgate
Dodongos Cavern Eyes Lit
Kakariko Village Gate Open
GC Woods Warp Open
Dodongos Cavern Stairs Room Door
GC Stop Rolling Goron As Adult`

export const DEFAULT_IGNORE_LOCATIONS = `# Non-item locations
Links Pocket
Master Sword Pedestal
Market ToT Master Sword
Flute Activation Spot

# Glitched
(100Acre) Rabbit's House Mythril Crystal
Kak Potion Shop Item 1
ZD Shop Item 1`

export function parseIgnoreList(text) {
  if (!text) return new Set()
  return new Set(
    text.split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//') && !line.startsWith('#'))
  )
}

export function validateIgnoreLists(spoilerText, ignoreItems, ignoreLocations) {
  // Collect all item names and location names from the Locations section
  const allItems = new Set()
  const allLocations = new Set()

  const locationsIdx = spoilerText.indexOf('\nLocations:\n')
  if (locationsIdx !== -1) {
    const locText = spoilerText.substring(locationsIdx)
    const nextSection = locText.substring(1).match(/\n[A-Z][a-z]+:\n/)
    const end = nextSection ? nextSection.index + 1 : locText.length
    const block = locText.substring(0, end)

    for (const line of block.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.includes(': ')) continue
      const sepIdx = trimmed.indexOf('): ')
      if (sepIdx === -1) continue
      const locSide = trimmed.substring(0, sepIdx + 1)
      const itemSide = trimmed.substring(sepIdx + 3)
      const loc = parseNameAndPlayer(locSide)
      const item = parseNameAndPlayer(itemSide)
      if (loc) allLocations.add(loc.name)
      if (item) allItems.add(item.name)
    }
  }

  const invalidItems = [...ignoreItems].filter((name) => !allItems.has(name))
  const invalidLocations = [...ignoreLocations].filter((name) => !allLocations.has(name))

  return { invalidItems, invalidLocations }
}

export function parseSpoilerLog(text, ignoreItems, ignoreLocations) {
  const nonItems = ignoreItems || new Set()
  const nonLocations = ignoreLocations || new Set()
  const players = parsePlayers(text)
  const spheres = parseSpheres(text, nonItems, nonLocations)
  const playerLocations = parseLocations(text, nonItems, nonLocations)
  return { players, spheres, playerLocations }
}

function parsePlayers(text) {
  const players = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const playerMatch = lines[i].match(/^Player (\d+): (.+)$/)
    if (playerMatch) {
      const slot = parseInt(playerMatch[1], 10)
      const name = playerMatch[2]
      let game = ''
      const config = []

      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j]
        // Stop at next player, blank line before a section, or major section header
        if (line.match(/^Player \d+:/) || line.match(/^Entrances:/) || line.match(/^Locations:/)) break

        const settingMatch = line.match(/^([^:]+):\s*(.*)$/)
        if (settingMatch) {
          const key = settingMatch[1].trim()
          const value = settingMatch[2].trim()
          if (key === 'Game') {
            game = value
          }
          if (value) {
            config.push({ key, value })
          }
        }
      }

      players.push({ slot, name, game, config })
    }
  }

  return players
}

function parseSpheres(text, nonItems, nonLocations) {
  const playthroughIdx = text.indexOf('\nPlaythrough:\n')
  if (playthroughIdx === -1) return []

  const playthroughText = text.substring(playthroughIdx)

  const nextSectionMatch = playthroughText.substring(1).match(/\n[A-Z][a-z]+:\n/)
  const playthroughEnd = nextSectionMatch
    ? nextSectionMatch.index + 1
    : playthroughText.length
  const playthroughBlock = playthroughText.substring(0, playthroughEnd)

  const spheres = []
  const sphereRegex = /(\d+): \{([^}]*)\}/g
  let match

  while ((match = sphereRegex.exec(playthroughBlock)) !== null) {
    const number = parseInt(match[1], 10)
    const block = match[2]
    if (number === 0) {
      spheres.push({ number, entries: [], precollected: parsePrecollected(block) })
    } else {
      const entries = parseSphereEntries(block, nonItems, nonLocations)
      spheres.push({ number, entries })
    }
  }

  return spheres
}

function parseLocations(text, nonItems, nonLocations) {
  const result = new Map()

  const locationsIdx = text.indexOf('\nLocations:\n')
  if (locationsIdx === -1) return result

  const locText = text.substring(locationsIdx)
  // Find the next top-level section header (e.g. "Playthrough:")
  const nextSectionMatch = locText.substring(1).match(/\n[A-Z][a-z]+:\n/)
  const end = nextSectionMatch ? nextSectionMatch.index + 1 : locText.length
  const block = locText.substring(0, end)

  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.includes(': ')) continue

    const separatorIdx = findSeparatorIndex(trimmed)
    if (separatorIdx === -1) continue

    const locationSide = trimmed.substring(0, separatorIdx + 1)
    const itemSide = trimmed.substring(separatorIdx + 3)

    const locationParsed = parseNameAndPlayer(locationSide)
    const itemParsed = parseNameAndPlayer(itemSide)
    if (!locationParsed || !itemParsed) continue

    // Match the exact filter discipline used by parseSphereEntries
    if (locationParsed.name === itemParsed.name) continue
    if (nonItems.has(itemParsed.name)) continue
    if (nonLocations.has(locationParsed.name)) continue

    if (!result.has(locationParsed.player)) {
      result.set(locationParsed.player, [])
    }
    result.get(locationParsed.player).push({
      location: locationParsed.name,
      item: itemParsed.name,
      itemOwner: itemParsed.player,
    })
  }

  return result
}

function parsePrecollected(block) {
  const items = []
  const lines = block.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parsed = parseNameAndPlayer(trimmed)
    if (parsed) {
      items.push({ item: parsed.name, player: parsed.player })
    }
  }
  return items
}

function parseSphereEntries(block, nonItems, nonLocations) {
  const entries = []
  const lines = block.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.includes(': ')) continue

    const separatorIdx = findSeparatorIndex(trimmed)
    if (separatorIdx === -1) continue

    const locationSide = trimmed.substring(0, separatorIdx + 1)
    const itemSide = trimmed.substring(separatorIdx + 3)

    const locationParsed = parseNameAndPlayer(locationSide)
    const itemParsed = parseNameAndPlayer(itemSide)

    if (locationParsed && itemParsed) {
      // Skip non-item entries (subrules, logic events)
      if (locationParsed.name === itemParsed.name) continue
      if (nonItems.has(itemParsed.name)) continue
      if (nonLocations.has(locationParsed.name)) continue

      entries.push({
        location: locationParsed.name,
        locationOwner: locationParsed.player,
        item: itemParsed.name,
        itemOwner: itemParsed.player,
      })
    }
  }

  return entries
}

function findSeparatorIndex(line) {
  let searchFrom = 0

  while (true) {
    const found = line.indexOf('): ', searchFrom)
    if (found === -1) break

    const locationSide = line.substring(0, found + 1)
    const itemSide = line.substring(found + 3)

    if (parseNameAndPlayer(locationSide) && parseNameAndPlayer(itemSide)) {
      return found
    }

    searchFrom = found + 1
  }

  return -1
}

function parseNameAndPlayer(str) {
  const lastParenOpen = str.lastIndexOf(' (')
  if (lastParenOpen === -1) return null
  if (!str.endsWith(')')) return null

  const name = str.substring(0, lastParenOpen)
  const player = str.substring(lastParenOpen + 2, str.length - 1)

  if (!name || !player) return null
  return { name, player }
}
