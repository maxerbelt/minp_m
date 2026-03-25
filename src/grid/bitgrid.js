export class BitGrid {
  constructor (store, width = null, height = null, fast = false) {
    this.store = store
    this.width = width || this.store.width || 0
    this.height = height || this.store.height || 0
    this.fast = fast
  }
  get area () {
    return this.width * this.height
  }
  forEachCell (fn) {
    for (let i = 0; i < this.area; i++) {
      fn(i)
    }
  }

  forEachSetCell (bitboard, fn) {
    for (let i = 0; i < this.area; i++) {
      if (this.store.hasIdxSet(bitboard, i)) {
        fn(i)
      }
    }
  }

  *indices () {
    for (let i = 0; i < this.area; i++) {
      yield i
    }
  }

  *locations () {
    for (const i of this.indices()) {
      const { x, y } = this.indexToLocation(i)
      yield [x, y]
    }
  }
  *locationsFast (bitboard) {
    for (const [i] of this.idxFilled(bitboard)) {
      const { x, y } = this.indexToLocation(i)
      yield [x, y]
    }
  }

  indexToLocation (i) {
    const x = i % this.width
    const y = Math.floor(i / this.width)
    return { x, y }
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
    if (this.fast && this.store.bitsOccupied) {
      return yield* this.idxFilledFast(bitboard)
    }
    for (const [idx, v] of this.idxCells(bitboard)) {
      if (v !== 0n) {
        yield [idx, v]
      }
    }
  }

  *idxFilledFast (bitboard) {
    for (const i of this.store.bitsOccupied(bitboard, this.area)) {
      yield [i, this.store.getIdx(bitboard, i)]
    }
  }
  *idxBits (bitboard) {
    return yield* this.store.bitsOccupied(bitboard, this.area)
  }

  *idxFilledWith (bitboard, value) {
    for (const [idx, v] of this.idxCells(bitboard)) {
      if (v === value) {
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
