/**
 * Build the filtered, reverse-chronological list of log events for one player.
 *
 * @param {string} playerName — the player to filter events for
 * @param {Array<object>} events — output of parseTrackerLog().events
 * @param {object} options
 * @param {boolean} options.receiving — include events where playerName is the receiver
 * @param {boolean} options.sending — include events where playerName is the sender
 * @param {string} options.searchQuery — case-insensitive substring match against location + item
 * @returns {Array<object>} filtered events, newest first
 */
export function buildPlayerLog(playerName, events, { receiving, sending, searchQuery }) {
  if (!receiving && !sending) return []
  if (!events || events.length === 0) return []

  const trimmedQuery = (searchQuery || '').trim().toLowerCase()
  const filtered = []

  for (const evt of events) {
    const matchesReceiving = receiving && evt.receiver === playerName
    const matchesSending = sending && evt.sender === playerName
    if (!matchesReceiving && !matchesSending) continue

    if (trimmedQuery) {
      const locationMatch = evt.location && evt.location.toLowerCase().includes(trimmedQuery)
      const itemMatch = evt.item && evt.item.toLowerCase().includes(trimmedQuery)
      if (!locationMatch && !itemMatch) continue
    }

    filtered.push(evt)
  }

  filtered.reverse()
  return filtered
}

/**
 * Build a Set of "locationOwner\u0000location" keys for every entry that
 * appears in a playthrough sphere (spheres 1..N). Sphere 0 is skipped
 * because it holds precollected / starting items, not game locations.
 *
 * Consumers look up `set.has(`${event.sender}\u0000${event.location}`)` to
 * decide whether a tracker event should be marked as a progression item.
 *
 * @param {Array<{number: number, entries: Array<{location: string, locationOwner: string}>}>} spheres
 * @returns {Set<string>}
 */
export function computeProgressionSet(spheres) {
  const set = new Set()
  if (!spheres) return set
  for (const sphere of spheres) {
    if (sphere.number === 0) continue
    for (const entry of sphere.entries) {
      set.add(`${entry.locationOwner}\u0000${entry.location}`)
    }
  }
  return set
}
