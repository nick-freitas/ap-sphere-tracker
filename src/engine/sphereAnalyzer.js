export function analyzeSpheres(spoilerData, checkedLocations) {
  return spoilerData.spheres.map((sphere) => {
    const totalChecks = sphere.entries.length
    let completedChecks = 0
    const missingChecks = []

    for (const entry of sphere.entries) {
      const playerChecks = checkedLocations.get(entry.locationOwner)
      const isChecked = playerChecks && playerChecks.has(entry.location)

      if (isChecked) {
        completedChecks++
      } else {
        missingChecks.push({
          player: entry.locationOwner,
          location: entry.location,
          item: entry.item,
          itemOwner: entry.itemOwner,
        })
      }
    }

    const completionPercent =
      totalChecks === 0 ? 100 : Math.round((completedChecks / totalChecks) * 100)

    return {
      sphereNumber: sphere.number,
      totalChecks,
      completedChecks,
      completionPercent,
      missingChecks,
    }
  })
}
