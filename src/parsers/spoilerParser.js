const NON_ITEMS = new Set([
  'Time Travel',
  'Child Can Pass Time',
  'Adult Can Pass Time',
  'Can Access Fish',
])

const NON_LOCATIONS = new Set([
  'Links Pocket',
  'Master Sword Pedestal',
  'Flute Activation Spot',
])

export function parseSpoilerLog(text) {
  const players = parsePlayers(text)
  const spheres = parseSpheres(text)
  return { players, spheres }
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
      for (let j = i + 1; j < lines.length && j < i + 20; j++) {
        const gameMatch = lines[j].match(/^Game:\s+(.+)$/)
        if (gameMatch) {
          game = gameMatch[1]
          break
        }
      }
      players.push({ slot, name, game })
    }
  }

  return players
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
    const entries = parseSphereEntries(block)
    spheres.push({ number, entries })
  }

  return spheres
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
      // Skip non-item entries (subrules, logic events)
      if (locationParsed.name === itemParsed.name) continue
      if (NON_ITEMS.has(itemParsed.name)) continue
      if (NON_LOCATIONS.has(locationParsed.name)) continue

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
