export function parseSpoilerLogRaw(text) {
  const { players, headerCounts } = parsePlayers(text)
  const spheres = parseSpheres(text)
  const playerLocations = parseLocations(text)
  return { players, spheres, playerLocations, headerCounts }
}

function parsePlayers(text) {
  const players = []
  const headerCounts = new Map()
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
          if (key === 'Location Count') {
            const n = parseInt(value, 10)
            if (!Number.isNaN(n)) headerCounts.set(name, n)
          }
          if (value) {
            config.push({ key, value })
          }
        }
      }

      players.push({ slot, name, game, config })
    }
  }

  return { players, headerCounts }
}

function parseSpheres(text) {
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
      const entries = parseSphereEntries(block)
      spheres.push({ number, entries })
    }
  }

  return spheres
}

function parseLocations(text) {
  const result = new Map()

  const locationsIdx = text.indexOf('\nLocations:\n')
  if (locationsIdx === -1) return result

  const locText = text.substring(locationsIdx)
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

    if (locationParsed.name === itemParsed.name) continue

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

function parseSphereEntries(block) {
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
      if (locationParsed.name === itemParsed.name) continue

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
