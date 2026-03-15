export class ForLocation {
  constructor (pos, bits, store) {
    this.pos = pos
    this.bits = bits
    this.store = store
  }
  set (color = 1) {
    this.store.check(color)

    const pos = this.pos
    const mask = this.store.bitMaskByPos(pos)
    this.bits =
      this.store.clearBits(this.bits, mask) | this.store.setMask(pos, color)
    return this.bits
  }
  at () {
    const pos = this.pos
    return this.store.numValue(this.bits, pos)
  }
  clearBits (mask) {
    return this.store.clearBits(this.bits, mask)
  }

  test (color = 1) {
    return this.at() === color
  }

  isNonZero () {
    const pos = this.pos
    return this.store.value(this.bits, pos) !== this.store.empty
  }
}
