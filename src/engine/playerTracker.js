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
