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

  // Consistency check: after filtering, each player's count should exactly match
  // their multidata.locations[slotId].size. Multidata is our source of truth — it
  // is what archipelago.gg's tracker reads and what AP's own generator output
  // says. We deliberately do NOT compare against raw.headerCounts: the spoiler
  // header's Location Count field is unreliable for some games (ALTTP reports
  // +10 because it counts the dungeon Prize slots that aren't real checks), so
  // comparing against it produces false-positive warnings on every seed that
  // uses those games. Any mismatch against the multidata count, by contrast,
  // would indicate a real bug in the spoiler parser or the filter itself.
  const warnings = []
  for (const [player, filteredEntries] of playerLocations) {
    const slotId = slotByName.get(player)
    if (slotId == null) continue
    const slotLocations = multidata.locations.get(slotId)
    if (!slotLocations) continue
    const expected = slotLocations.size
    const actual = filteredEntries.length
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
