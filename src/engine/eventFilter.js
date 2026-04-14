export function applyEventFilter(raw, multidata) {
  // Build a name → slot_id map from the raw spoiler players.
  // We correlate by player name (which appears both in the spoiler parse and in multidata.slot_info).
  const slotByName = new Map()
  for (const [slotId, info] of multidata.slot_info) {
    slotByName.set(info.name, slotId)
  }

  // Build a name → game map from the same source.
  const gameByName = new Map()
  for (const [slotId, info] of multidata.slot_info) {
    gameByName.set(info.name, info.game)
  }

  function isRealLocation(name, locationOwner) {
    const slotId = slotByName.get(locationOwner)
    if (slotId == null) return false
    const game = gameByName.get(locationOwner)
    const dp = multidata.datapackage.get(game)
    if (!dp) return false
    const locId = dp.location_name_to_id[name]
    if (locId == null) return false
    const slotLocations = multidata.locations.get(slotId)
    if (!slotLocations) return false
    return slotLocations.has(locId)
  }

  function isRealItem(name, itemOwner) {
    const game = gameByName.get(itemOwner)
    if (!game) return false
    const dp = multidata.datapackage.get(game)
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
