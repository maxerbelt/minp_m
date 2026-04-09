// Todo: use or remove this class. It was intended to hold bit manipulation methods for morphological operations like dilation and erosion, but it may not be necessary if those operations can be implemented directly in the mask classes.

class BitMorphology {
  constructor (store) {
    this.store = store
  }

  dilateHorizontal (bitboard, edgeMasks) {
    const srcLeft = this.store.prepareSrcForLeftExpansion(bitboard, edgeMasks)
    const srcRight = this.store.prepareSrcForRightExpansion(bitboard, edgeMasks)

    const left = this.store.shiftBits(srcLeft, -1)
    const right = this.store.shiftBits(srcRight, 1)

    return this.combine(bitboard, left, right)
  }

  combine (...values) {
    const mask = this.store.fullBits
    let result = 0n

    for (const v of values) result |= v
    return result & mask
  }
}
