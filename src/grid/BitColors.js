export class BitColors {
  constructor (store) {
    this.store = store
  }

  extractLayer (bitboard, color, width, height) {
    const colorValue = BigInt(color)
    let result = 0n

    for (let i = 0; i < width * height; i++) {
      if (this.store.getIdx(bitboard, i) === colorValue) {
        result = this.store.singleBitStore.setIdx(result, i, 1n)
      }
    }

    return result
  }
}
