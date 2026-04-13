export function computePrioritySet(spheres) {
  const set = new Set()
  for (const sphere of spheres) {
    if (sphere.number === 0) continue
    for (const entry of sphere.entries) {
      set.add(`${entry.locationOwner}\u0000${entry.location}`)
    }
  }
  return set
}

export function buildPlayerTracker(playerName, spoilerData, checkedLocations, prioritySet) {
  const locations = spoilerData.playerLocations.get(playerName)
  if (!locations) {
    return { rows: [], totalCount: 0, foundCount: 0 }
  }

  const playerChecks = checkedLocations.get(playerName) || new Set()

  const rows = locations.map((loc) => ({
    location: loc.location,
    item: loc.item,
    itemOwner: loc.itemOwner,
    found: playerChecks.has(loc.location),
    priority: prioritySet.has(`${playerName}\u0000${loc.location}`),
  }))

  rows.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1
    return a.location.localeCompare(b.location)
  })

  const totalCount = rows.length
  const foundCount = rows.filter((r) => r.found).length

  return { rows, totalCount, foundCount }
}

export function buildPlayerHints(playerName, hints, checkedLocations) {
  const playerChecks = checkedLocations.get(playerName) || new Set()

  // Outgoing: hinted items in this player's world that other players are waiting for.
  // These show the item name and the receiving player in the owner column.
  const outgoing = hints
    .filter((h) => h.locationOwner === playerName && h.receiver !== playerName)
    .map((h) => ({
      location: h.location,
      item: h.item,
      itemOwner: h.receiver,
      found: playerChecks.has(h.location),
    }))

  // Incoming: hinted items in other players' worlds that this player will receive.
  // The item name is hidden (the player already knows what they hinted); the owner
  // column shows the location owner (whose world has the item).
  const incoming = hints
    .filter((h) => h.receiver === playerName && h.locationOwner !== playerName)
    .map((h) => {
      const ownerChecks = checkedLocations.get(h.locationOwner) || new Set()
      return {
        location: h.location,
        item: '',
        itemOwner: h.locationOwner,
        found: ownerChecks.has(h.location),
      }
    })

  const rows = [...outgoing, ...incoming]
  rows.sort((a, b) => a.location.localeCompare(b.location))

  const totalCount = rows.length
  const foundCount = rows.filter((r) => r.found).length

  return { rows, totalCount, foundCount }
}
