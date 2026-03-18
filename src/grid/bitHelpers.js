const BIT_INDEX = (() => {
  const index = new Map()
  for (let i = 0; i < 256; i++) index.set(1n << BigInt(i), i)
  return index
})()

function lsbIndex (b) {
  return BIT_INDEX.get(b)
}
function lsbIndexBig (b) {
  return Math.log2(Number(b))
}

export function* bits (bb) {
  while (bb) {
    const lsb = bb & -bb
    const i = lsbIndex(lsb)
    yield i
    bb ^= lsb
  }
}
export function* bitsBig (bb) {
  while (bb) {
    const lsb = bb & -bb
    const i = lsbIndexBig(lsb)
    yield i
    bb ^= lsb
  }
}

export function* bitsSafe (bb, size) {
  // Handle BigInt bitboards
  if (typeof bb === 'bigint') {
    return yield* bitsSafeBI(size, bb)
  }

  // Handle array-backed bitboards (Uint32Array or Array)
  if (bb && typeof bb.length === 'number') {
    return yield* bitSafeArr(bb, size)
  }

  // Fallback: numeric bitboard (Number)
  if (!bb) return
  let tmpNum = bb
  const lsbIdxNum = lsbIndex
  while (tmpNum) {
    const lsb = tmpNum & -tmpNum
    const i = lsbIdxNum(lsb)
    yield i
    tmpNum ^= lsb
  }
}
export function forEachBitSafeBI (bb, size, fn) {
  const lsbIdx = size > 256 ? lsbIndexBig : lsbIndex
  let tmp = bb
  while (tmp) {
    const lsb = tmp & -tmp
    const i = lsbIdx(lsb)
    fn(i)
    tmp ^= lsb
  }
}
export function* bitSafeArr (bb, size) {
  const words = bb.length
  const total = size || words * 32
  for (let i = 0; i < total; i++) {
    const w = bb[i >>> 5] || 0
    if (((w >>> (i & 31)) & 1) === 1) yield i
  }
}
export function forEachBitSafeArr (bb, size, fn) {
  const words = bb.length
  const total = size || words * 32
  for (let i = 0; i < total; i++) {
    const w = bb[i >>> 5] || 0
    if (((w >>> (i & 31)) & 1) === 1) fn(i)
  }
}

export function* bitsSafeBI (size, bb) {
  const lsbIdx = size > 256 ? lsbIndexBig : lsbIndex
  let tmp = bb
  while (tmp) {
    const lsb = tmp & -tmp
    const i = lsbIdx(lsb)
    yield i
    tmp ^= lsb
  }
  return
}

export function has (bb, i) {
  return (bb >> BigInt(i)) & 1n
}
