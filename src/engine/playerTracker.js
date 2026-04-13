export function computePrioritySet(spheres) {
  const set = new Set()
  for (const sphere of spheres) {
    if (sphere.number === 0) continue
    for (const entry of sphere.entries) {
      set.add(`${entry.locationOwner}\u0000${entry.location}`)
    }
  }
  return set
}
