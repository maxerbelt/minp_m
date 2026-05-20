


export class BigBits {

 // Bit shifting operations for BigInt
  static shiftBits (src, shift) {
    if (shift === 0) return src
    if (shift > 0) return src << BigInt(shift)
    return src >> BigInt(-shift)
  }
}


}