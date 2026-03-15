export function shiftBoardUp (mask, width) {
  let rows = 0
  while (mask !== 0n && (mask & ((1n << BigInt(width)) - 1n)) === 0n) {
    mask >>= BigInt(width)
    rows++
  }
  return { mask, rows }
}
export function shiftBoardLeft (mask, width, height) {
  let colShift = width

  for (let y = 0; y < height; y++) {
    const row = (mask >> BigInt(y * width)) & ((1n << BigInt(width)) - 1n)
    if (row !== 0n) {
      const tz =
        row.toString(2).length - row.toString(2).replace(/^0+/, '').length
      colShift = Math.min(colShift, tz)
    }
  }

  if (colShift === 0) return mask

  let out = 0n
  for (let y = 0; y < height; y++) {
    const row = (mask >> BigInt(y * width)) & ((1n << BigInt(width)) - 1n)
    out |= (row >> BigInt(colShift)) << BigInt(y * width)
  }

  return out
}

export function normalizeBitboard (mask, width, height) {
  const { mask: up } = shiftBoardUp(mask, width)
  return shiftBoardLeft(up, width, height)
}

function ctz (x) {
  let n = 0
  while ((x & 1n) === 0n) {
    x >>= 1n
    n++
  }
  return n
}

function msbIndex (x) {
  let n = -1
  while (x > 0n) {
    x >>= 1n
    n++
  }
  return n
}
export function normalizeUpLeft (bb, h, w) {
  if (bb === 0n) return bb

  var { minRow, minCol } = boundingBox(w, h, bb)

  return shiftTo(w, minRow, h, bb, minCol)
}

function shiftTo (w, minRow, h, bb, minCol) {
  let out = 0n
  let dstRow = 0
  const rowMask = (1n << BigInt(w)) - 1n
  for (let r = minRow; r < h; r++) {
    const row = (bb >> BigInt(r * w)) & rowMask
    if (row === 0n) continue

    const shifted = row >> BigInt(minCol)
    out |= shifted << BigInt(dstRow * w)
    dstRow++
  }
  return out
}

function boundingBox (w, h, bb) {
  const rowMask = (1n << BigInt(w)) - 1n

  let minRow = h
  let minCol = w

  // Pass 1: find bounding box
  for (let r = 0; r < h; r++) {
    const row = (bb >> BigInt(r * w)) & rowMask
    if (row === 0n) continue

    minRow = Math.min(minRow, r)

    // find leftmost bit in this row
    const col = ctz(row)
    minCol = Math.min(minCol, col)
  }
  return { minRow, minCol }
}
