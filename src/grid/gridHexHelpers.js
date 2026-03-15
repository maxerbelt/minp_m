//Rotation / reflection using D₆ transforms

// transforms[k][i] = index after transform k
// k = 0..5 rotations, 6..11 reflections

export function normalizeHexShape (cells) {
  let minQ = Infinity
  let minR = Infinity
  let minS = Infinity

  for (const [q, r, s] of cells) {
    if (
      q < minQ ||
      (q === minQ && r < minR) ||
      (q === minQ && r === minR && s < minS)
    ) {
      minQ = q
      minR = r
      minS = s
    }
  }

  return cells.map(([q, r, s]) => [q - minQ, r - minR, s - minS])
}
