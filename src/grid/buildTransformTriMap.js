const cache = new Map()

export function buildTransformTriMap (N) {
  if (N && cache.has(N)) {
    return cache.get(N)
  }

  const cellCount = N * N

  // --- index helpers ---
  const idx = (r, c) => r * r + c
  const rcFromIndex = i => {
    const r = Math.floor(Math.sqrt(i))
    const c = i - r * r
    return [r, c]
  }

  // --- precompute pixel coordinates for each cell (unit side length) ---
  const h = Math.sqrt(3) / 2 // triangle height for S=1
  const coords = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= 2 * r; c++) {
      const x = (c - r) * 0.5
      const y = r * h
      coords.push({ r, c, x, y, i: idx(r, c) })
    }
  }

  // compute centroid of all points to use as rotation/reflection center
  let sumX = 0
  let sumY = 0
  for (const p of coords) {
    sumX += p.x
    sumY += p.y
  }
  const centerX = sumX / coords.length
  const centerY = sumY / coords.length

  // --- geometric transform factories ---
  const rotate = angle => (x, y) => {
    const dx = x - centerX
    const dy = y - centerY
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle)
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle)
    return [rx + centerX, ry + centerY]
  }

  const reflectV = (x, y) => [2 * centerX - x, y]

  const compose = (f, g) => (x, y) => {
    const [x1, y1] = g(x, y)
    return f(x1, y1)
  }

  const id = (x, y) => [x, y]
  const r120 = rotate((2 * Math.PI) / 3)
  const r240 = rotate((4 * Math.PI) / 3)
  const f0 = reflectV
  const f1 = compose(f0, r120)
  const f2 = compose(f0, r240)

  const transforms = { id, r120, r240, f0, f1, f2 }

  // --- build maps by nearest-neighbor matching ---
  const maps = {}

  for (const key in transforms) {
    const t = transforms[key]
    const map = new Array(cellCount)

    for (const p of coords) {
      const [x2, y2] = t(p.x, p.y)
      // find closest original point
      let bestIdx = null
      let bestDist = Infinity
      for (const q of coords) {
        const dx = q.x - x2
        const dy = q.y - y2
        const d = dx * dx + dy * dy
        if (d < bestDist) {
          bestDist = d
          bestIdx = q.i
        }
      }
      map[p.i] = bestIdx
    }

    maps[key] = map
  }

  const tmap = {
    size: N,
    count: cellCount,
    maps
  }
  cache.set(N, tmap)
  return tmap
}
