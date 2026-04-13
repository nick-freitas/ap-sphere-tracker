export function applyEventFilter(raw, datapackages) {
  const playerGame = new Map(raw.players.map((p) => [p.name, p.game]))

  function isRealLocation(name, locationOwner) {
    const game = playerGame.get(locationOwner)
    const dp = datapackages.get(game)
    if (!dp) return false
    return Object.prototype.hasOwnProperty.call(dp.location_name_to_id, name)
  }

  function isRealItem(name, itemOwner) {
    const game = playerGame.get(itemOwner)
    const dp = datapackages.get(game)
    if (!dp) return false
    return Object.prototype.hasOwnProperty.call(dp.item_name_to_id, name)
  }

  function keepEntry(entry, locationOwner) {
    return isRealLocation(entry.location, locationOwner) && isRealItem(entry.item, entry.itemOwner)
  }

  const spheres = raw.spheres.map((sphere) => {
    if (sphere.number === 0) return sphere // precollected items, no filtering needed
    return {
      ...sphere,
      entries: sphere.entries.filter((entry) => keepEntry(entry, entry.locationOwner)),
    }
  })

  const playerLocations = new Map()
  for (const [owner, entries] of raw.playerLocations) {
    const kept = entries.filter((entry) => keepEntry(entry, owner))
    playerLocations.set(owner, kept)
  }

  // Header-count validation: compare filtered playerLocations count per player to headerCounts.
  const warnings = []
  for (const [player, expected] of raw.headerCounts) {
    const actual = (playerLocations.get(player) || []).length
    if (actual !== expected) {
      warnings.push({ player, expected, actual })
    }
  }

  return {
    players: raw.players,
    spheres,
    playerLocations,
    headerCounts: raw.headerCounts,
    warnings,
  }
}
