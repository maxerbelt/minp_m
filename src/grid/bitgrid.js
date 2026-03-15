export class BitGrid {
  constructor (store, width, height) {
    this.store = store
    this.width = width
    this.height = height
  }

  forEachCell (fn) {
    const total = this.width * this.height
    for (let i = 0; i < total; i++) {
      fn(i)
    }
  }

  forEachRow (fn) {
    for (let r = 0; r < this.height; r++) {
      fn(r)
    }
  }

  rowMask () {
    return this.store.rangeMask(this.store.bitPos(this.width))
  }
}
