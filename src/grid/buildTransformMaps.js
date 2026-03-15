const cache = new Map()

export function buildTransformMaps (W, H) {
  const size = W * H

  if (W === H && cache.has(W)) {
    return cache.get(W)
  }

  const maps = {
    id: new Array(size),
    r90: new Array(size),
    r180: new Array(size),
    r270: new Array(size),
    fx: new Array(size),
    fy: new Array(size),
    fd1: new Array(size),
    fd2: new Array(size)
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x

      // identity
      maps.id[i] = i

      // rotations
      maps.r90[i] = x * H + (H - 1 - y)
      maps.r180[i] = (H - 1 - y) * W + (W - 1 - x)
      maps.r270[i] = (W - 1 - x) * H + y

      // reflections
      maps.fx[i] = y * W + (W - 1 - x) // vertical
      maps.fy[i] = (H - 1 - y) * W + x // horizontal
      maps.fd1[i] = x * W + y // main diagonal
      maps.fd2[i] = (W - 1 - x) * W + (H - 1 - y) // other diagonal
    }
  }

  if (W === H) {
    cache.set(W, maps)
  }

  return maps
}
