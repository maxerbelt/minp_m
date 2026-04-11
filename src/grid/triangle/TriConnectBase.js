export class TriConnectBase {
  constructor (triIndex) {
    this.triIndex = triIndex
    this.neighborOffsets = {
      up: [],
      down: []
    }
  }

  setParityNeighborOffsets (upOffsets, downOffsets) {
    this.neighborOffsets = {
      up: upOffsets,
      down: downOffsets
    }
  }

  neighbors (r, c) {
    const parity = this.triIndex.parity(r, c)
    const values =
      parity === 0 ? this.neighborOffsets.up : this.neighborOffsets.down
    return values.map(([dr, dc, bit]) => [r + dr, c + dc, bit])
  }

  area (r, c) {
    return [[r, c, this.triIndex.parity(r, c)], ...this.neighbors(r, c)]
  }
}
