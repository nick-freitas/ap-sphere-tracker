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
