export function parseTrackerLog(text) {
  const checkedLocations = new Map()

  if (!text) return checkedLocations

  const lines = text.split('\n')

  for (const line of lines) {
    const parsed = parseSendLine(line)
    if (!parsed) continue

    const { sender, location } = parsed

    if (!checkedLocations.has(sender)) {
      checkedLocations.set(sender, new Set())
    }
    checkedLocations.get(sender).add(location)
  }

  return checkedLocations
}

function parseSendLine(line) {
  // Match: [timestamp]: (Team #N) Sender sent Item to Receiver (Location)
  const match = line.match(
    /\(Team #\d+\) (.+?) sent .+ to .+? \((.+)\)$/
  )

  if (!match) return null

  return {
    sender: match[1],
    location: match[2],
  }
}
