// Module-level in-session caches. Cleared by clearDatapackageCache() in tests.
let indexCache = null
const packageCache = new Map()

const BASE_PATH = '/ap-sphere-tracker/datapackages'

async function loadIndex() {
  if (indexCache !== null) return indexCache
  try {
    const res = await fetch(`${BASE_PATH}/index.json`)
    if (!res.ok) {
      indexCache = {}
      return indexCache
    }
    indexCache = await res.json()
    return indexCache
  } catch {
    indexCache = {}
    return indexCache
  }
}

async function loadPackage(checksum) {
  if (packageCache.has(checksum)) return packageCache.get(checksum)
  try {
    const res = await fetch(`${BASE_PATH}/${checksum}.json`)
    if (!res.ok) return null
    const pkg = await res.json()
    packageCache.set(checksum, pkg)
    return pkg
  } catch {
    return null
  }
}

export async function resolveDatapackages(players) {
  const index = await loadIndex()
  const games = new Set(players.map((p) => p.game).filter(Boolean))

  const datapackages = new Map()
  const missingGames = []

  for (const game of games) {
    const checksum = index[game]
    if (!checksum) {
      missingGames.push(game)
      continue
    }
    const pkg = await loadPackage(checksum)
    if (!pkg) {
      missingGames.push(game)
      continue
    }
    datapackages.set(game, pkg)
  }

  return { datapackages, missingGames }
}

export function clearDatapackageCache() {
  indexCache = null
  packageCache.clear()
}
