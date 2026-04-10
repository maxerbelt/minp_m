export class TriConnectBase {
  constructor (triIndex) {
    this.triIndex = triIndex
    this.valuesUp = []
    this.valuesDown = []
  }

  neighbors (r, c) {
    const parity = this.triIndex.parity(r, c)
    const values = parity === 0 ? this.valuesUp : this.valuesDown
    return values.map(([dr, dc, bit]) => [r + dr, c + dc, bit])
  }

  area (r, c) {
    return [[r, c, this.triIndex.parity(r, c)], ...this.neighbors(r, c)]
  }
}
