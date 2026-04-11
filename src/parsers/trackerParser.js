export function parseTrackerLog(text) {
  const checkedLocations = new Map()
  let lastCheckTime = null

  if (!text) return { checkedLocations, lastCheckTime }

  const lines = text.split('\n')

  for (const line of lines) {
    const parsed = parseSendLine(line)
    if (!parsed) continue

    const { sender, location, timestamp } = parsed

    if (!checkedLocations.has(sender)) {
      checkedLocations.set(sender, new Set())
    }
    checkedLocations.get(sender).add(location)
    if (timestamp) lastCheckTime = timestamp
  }

  return { checkedLocations, lastCheckTime }
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
