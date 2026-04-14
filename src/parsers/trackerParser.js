// Archipelago server tracker logs use Python's default logging format, which
// emits local time on whatever machine the server runs on. In practice every
// seed hosted by archipelago.gg is logged in UTC (their infrastructure is
// UTC-based). The raw strings look like "2026-04-14 01:11:33,970" with no
// timezone marker, so passing them directly to `new Date()` makes the JS
// engine parse them as LOCAL time — shifting every timestamp forward by the
// user's full timezone offset and producing tooltips that read "in the
// future." This helper converts the raw string into a proper Date by
// reshaping it into an ISO-8601 UTC literal before parsing. Use it anywhere
// in the UI that displays a tracker-log timestamp; never call `new Date()`
// on these strings directly.
export function parseTrackerTimestamp(raw) {
  if (!raw) return null
  // "YYYY-MM-DD HH:MM:SS,mmm" → "YYYY-MM-DDTHH:MM:SS.mmmZ"
  const isoUtc = raw.replace(' ', 'T').replace(',', '.') + 'Z'
  const date = new Date(isoUtc)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseTrackerLog(text) {
  const checkedLocations = new Map()
  let lastCheckTime = null
  const hintMap = new Map()
  const events = []

  if (!text) return { checkedLocations, lastCheckTime, hints: [], events }

  const lines = text.split('\n')

  for (const line of lines) {
    const sendParsed = parseSendLine(line)
    if (sendParsed) {
      const { sender, item, receiver, location, timestamp } = sendParsed
      if (!checkedLocations.has(sender)) {
        checkedLocations.set(sender, new Set())
      }
      checkedLocations.get(sender).add(location)
      if (timestamp) lastCheckTime = timestamp
      events.push({
        type: 'sent',
        timestamp,
        sender,
        item,
        receiver,
        location,
      })
      continue
    }

    const hintParsed = parseHintLine(line)
    if (hintParsed) {
      const key = `${hintParsed.receiver}\u0000${hintParsed.item}\u0000${hintParsed.location}\u0000${hintParsed.locationOwner}`
      if (hintMap.has(key)) {
        // Preserve original insertion order; update status + timestamp to the latest occurrence
        const existing = hintMap.get(key)
        existing.status = hintParsed.status
        existing.timestamp = hintParsed.timestamp
      } else {
        hintMap.set(key, hintParsed)
      }
      events.push({
        type: 'hint',
        timestamp: hintParsed.timestamp,
        sender: hintParsed.locationOwner,
        item: hintParsed.item,
        receiver: hintParsed.receiver,
        location: hintParsed.location,
        status: hintParsed.status,
      })
    }
  }

  return { checkedLocations, lastCheckTime, hints: Array.from(hintMap.values()), events }
}

function parseSendLine(line) {
  // Match: [timestamp]: (Team #N) Sender sent Item to Receiver (Location)
  // Uses the final ' (' before the trailing ')' as the location boundary so
  // items or receiver names that happen to contain ' (' are preserved.
  const match = line.match(
    /^\[([^\]]+)\].*\(Team #\d+\) (.+?) sent (.+) to (.+?) \((.+)\)$/
  )

  if (!match) return null

  return {
    timestamp: match[1],
    sender: match[2],
    item: match[3],
    receiver: match[4],
    location: match[5],
  }
}

function parseHintLine(line) {
  // Match: [timestamp]: Notice (Team #N): [Hint]: <receiver>'s <item> is at <location> in <locationOwner>'s World[ at <entrance>]. (<status>)
  // The location group is GREEDY so it backtracks to the LAST " in " before
  // "'s World" — necessary when a location name itself contains " in " as a
  // substring (e.g. "FS: Exile Mask - shop after killing NPCs in RS").
  const match = line.match(
    /^\[([^\]]+)\].*?\[Hint\]: (.+?)'s (.+?) is at (.+) in (.+?)'s World(?: at (.+?))?\. \((\w+)\)$/
  )

  if (!match) return null

  return {
    timestamp: match[1],
    receiver: match[2],
    item: match[3],
    location: match[4],
    locationOwner: match[5],
    entrance: match[6] || null,
    status: match[7],
  }
}
