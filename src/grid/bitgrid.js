export class BitGrid {
  constructor (store, width = null, height = null) {
    this.store = store
    this.width = width || this.store.width || 0
    this.height = height || this.store.height || 0
  }
  get area () {
    return this.width * this.height
  }
  forEachCell (fn) {
    const total = this.width * this.height
    for (let i = 0; i < total; i++) {
      fn(i)
    }
  }
  *indices () {
    for (let i = 0; i < this.area; i++) {
      yield i
    }
  }
  *locations () {
    for (let i = 0; i < this.area; i++) {
      const x = i % this.width
      const y = Math.floor(i / this.width)
      yield [x, y]
    }
  }
  *values (bitboard) {
    for (const i of this.indices()) {
      yield this.store.getIdx(bitboard, i)
    }
  }
  *idxCells (bitboard) {
    for (const i of this.indices()) {
      yield [i, this.store.getIdx(bitboard, i)]
    }
  }
  *idxFilled (bitboard) {
    for (const [idx, v] of this.idxCells(bitboard)) {
      if (v !== 0n) {
        yield [idx, v]
      }
    }
  }
  maxValue (bitboard) {
    let maxColor = 0n
    for (const color of this.values(bitboard)) {
      if (color > maxColor) {
        maxColor = color
      }
    }
    return maxColor
  }
  maxNumber (bitboard) {
    return Number(this.maxValue(bitboard))
  }

  minValue (bitboard) {
    let minColor = Infinity
    for (const color of this.values(bitboard)) {
      if (color < minColor) {
        minColor = color
      }
    }
    return minColor
  }
  minNumber (bitboard) {
    return Number(this.minValue(bitboard))
  }
  forEachRow (fn) {
    for (let r = 0; r < this.height; r++) {
      fn(r)
    }
  }
  *rows () {
    for (let r = 0; r < this.height; r++) {
      yield r
    }
  }
  rowMask () {
    return this.store.rowMaskForWidth(this.width)
  }
}
