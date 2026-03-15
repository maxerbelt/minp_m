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

  // Handle array-backed bitboards (Uint32Array or Array)
  if (bb && typeof bb.length === 'number') {
    const words = bb.length
    const total = size || words * 32
    for (let i = 0; i < total; i++) {
      const w = bb[i >>> 5] || 0
      if (((w >>> (i & 31)) & 1) === 1) yield i
    }
    return
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

function emptyBB () {
  return 0n
}
const ONE = 1n

function setBit (bb, i) {
  return bb | (ONE << BigInt(i))
}
export function has (bb, i) {
  return (bb >> BigInt(i)) & 1n
}
