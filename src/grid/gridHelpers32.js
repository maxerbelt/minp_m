function get2 (bb, i) {
  const word = i >>> 4
  const shift = (i & 15) << 1
  return (bb[word] >>> shift) & 3
}

function set2 (bb, i, v) {
  const word = i >>> 4
  const shift = (i & 15) << 1
  bb[word] |= (v & 3) << shift
}

export function rectToSquare2Bit (bb, h, w) {
  const N = Math.max(h, w)
  const cells = N * N
  const words = Math.ceil(cells / 16)

  const out = new Uint32Array(words)

  for (let r = 0; r < h; r++) {
    const rowBaseSrc = r * w
    const rowBaseDst = r * N

    for (let c = 0; c < w; c++) {
      const v = get2(bb, rowBaseSrc + c)
      if (v !== 0) {
        set2(out, rowBaseDst + c, v)
      }
    }
  }

  return { bb: out, n: N }
}

export function normalize2Bit (bb, h, w) {
  // Pass 1: find topmost + leftmost non-zero cell
  const { minRow, minCol, found } = boundingBox(h, w, bb)

  // Empty board → nothing to normalize
  if (!found) {
    return new Uint32Array(bb.length)
  }

  // Pass 2: rebuild shifted board
  const out = shiftBoard(bb, minRow, h, minCol, w)

  return out
}
function shiftBoard (bb, minRow, h, minCol, w) {
  const out = new Uint32Array(bb.length)

  for (let r = minRow; r < h; r++) {
    for (let c = minCol; c < w; c++) {
      const v = get2(bb, r * w + c)
      if (v !== 0) {
        set2(out, (r - minRow) * w + (c - minCol), v)
      }
    }
  }
  return out
}

function boundingBox (h, w, bb) {
  let minRow = h
  let minCol = w
  let found = false

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (get2(bb, r * w + c) !== 0) {
        minRow = Math.min(minRow, r)
        minCol = Math.min(minCol, c)
        found = true
      }
    }
  }
  return { minRow, minCol, found }
}
