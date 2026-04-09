const ONE = 1n

function bit (i) {
  return ONE << BigInt(i)
}

export function coordsToOccBig (list, W) {
  let occ = 0n
  for (const [x, y] of list) {
    occ |= bit(y * W + x)
  }
  return occ
}
export function occBigToCoords_const (occ, W, H, color) {
  const out = []
  for (let i = 0; i < W * H; i++)
    if (occ & bit(i)) out.push([i % W, Math.trunc(i / W), color])
  return out
}
export function occBigToCoords_fn (occ, W, H, fn) {
  const out = []
  for (let i = 0; i < W * H; i++)
    if (occ & bit(i)) {
      const x = i % W,
        y = Math.trunc(i / W)
      out.push([x, y, fn(x, y, i) & 3])
    }
  return out
}
export function coordsToGrid (coords, W, H) {
  const g = Array.from({ length: H }, () => new Array(W).fill(0))
  for (const [x, y, c] of coords) g[y][x] = c
  return g
}
export function gridToCoords (grid, W, H) {
  const out = []
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (grid[y][x]) out.push([x, y, grid[y][x]])
  return out
}
