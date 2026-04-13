export function buildPlayerTracker(playerName, spoilerData, checkedLocations) {
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
  }))

  rows.sort((a, b) => a.location.localeCompare(b.location))

  const totalCount = rows.length
  const foundCount = rows.filter((r) => r.found).length

  return { rows, totalCount, foundCount }
}

export function buildPlayerHints(playerName, hints, checkedLocations) {
  const playerChecks = checkedLocations.get(playerName) || new Set()

  // Outgoing (sending): hinted items in this player's world that other players
  // are waiting for. The owner column shows the receiving player.
  const outgoing = hints
    .filter((h) => h.locationOwner === playerName && h.receiver !== playerName)
    .map((h) => ({
      location: h.location,
      item: h.item,
      itemOwner: h.receiver,
      found: playerChecks.has(h.location),
      direction: 'sending',
    }))

  // Incoming (receiving): hinted items in other players' worlds that this
  // player will receive. The owner column shows the location owner (whose
  // world has the item) so the player knows where to find it.
  const incoming = hints
    .filter((h) => h.receiver === playerName && h.locationOwner !== playerName)
    .map((h) => {
      const ownerChecks = checkedLocations.get(h.locationOwner) || new Set()
      return {
        location: h.location,
        item: h.item,
        itemOwner: h.locationOwner,
        found: ownerChecks.has(h.location),
        direction: 'receiving',
      }
    })

  const rows = [...outgoing, ...incoming]
  rows.sort((a, b) => a.location.localeCompare(b.location))

  const totalCount = rows.length
  const foundCount = rows.filter((r) => r.found).length

  return { rows, totalCount, foundCount }
}
