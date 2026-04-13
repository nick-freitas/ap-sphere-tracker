export function parseTrackerLog(text) {
  const checkedLocations = new Map()
  let lastCheckTime = null
  const hintMap = new Map()

  if (!text) return { checkedLocations, lastCheckTime, hints: [] }

  const lines = text.split('\n')

  for (const line of lines) {
    const sendParsed = parseSendLine(line)
    if (sendParsed) {
      const { sender, location, timestamp } = sendParsed
      if (!checkedLocations.has(sender)) {
        checkedLocations.set(sender, new Set())
      }
      checkedLocations.get(sender).add(location)
      if (timestamp) lastCheckTime = timestamp
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
    }
  }

  return { checkedLocations, lastCheckTime, hints: Array.from(hintMap.values()) }
}

function parseSendLine(line) {
  // Match: [timestamp]: (Team #N) Sender sent Item to Receiver (Location)
  const match = line.match(
    /^\[([^\]]+)\].*\(Team #\d+\) (.+?) sent .+ to .+? \((.+)\)$/
  )

  if (!match) return null

  return {
    timestamp: match[1],
    sender: match[2],
    location: match[3],
  }
}

function parseHintLine(line) {
  // Match: [timestamp]: Notice (Team #N): [Hint]: <receiver>'s <item> is at <location> in <locationOwner>'s World[ at <entrance>]. (<status>)
  const match = line.match(
    /^\[([^\]]+)\].*?\[Hint\]: (.+?)'s (.+?) is at (.+?) in (.+?)'s World(?: at (.+?))?\. \((\w+)\)$/
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
