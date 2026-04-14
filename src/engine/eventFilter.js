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

  // Surface header-vs-multidata discrepancies. The spoiler's "Location Count: N"
  // field is what Archipelago's generator wrote into the header. Multidata is the
  // authoritative per-slot check list. These two sources disagree for some games:
  // ALTTP's header counts 10 dungeon Prize slots (Desert Palace - Prize, etc.)
  // that aren't real checks, so it reports +10 above the actual count. This
  // isn't a bug in our filter — it's a quirk of the spoiler generator. The UI
  // renders this discrepancy inline with the Location Count row in PlayerConfigs
  // so users see "271 ⚠ spoiler indicates 271 but game contains 261".
  const warnings = []
  for (const [player, spoilerCount] of raw.headerCounts) {
    const slotId = slotByName.get(player)
    if (slotId == null) continue
    const slotLocations = multidata.locations.get(slotId)
    if (!slotLocations) continue
    const gameCount = slotLocations.size
    if (spoilerCount !== gameCount) {
      warnings.push({ player, spoilerCount, gameCount })
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
