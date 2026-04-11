export class ConnectBase {
  constructor (rectIndex) {
    this.rectIndex = rectIndex
    this.neighborOffsets = []
  }

  static get orthogonalNeighborOffsets () {
    return [
      [+1, 0],
      [-1, 0],
      [0, +1],
      [0, -1]
    ]
  }

  static get diagonalNeighborOffsets () {
    return [
      [+1, +1],
      [-1, -1],
      [-1, +1],
      [+1, -1]
    ]
  }

  static get allNeighborOffsets () {
    return [...this.orthogonalNeighborOffsets, ...this.diagonalNeighborOffsets]
  }

  setNeighborOffsets (offsets) {
    this.neighborOffsets = offsets
  }

  neighbors (x, y) {
    return this.neighborOffsets.map(([dx, dy]) => [x + dx, y + dy])
  }

  area (x, y) {
    return [[x, y], ...this.neighbors(x, y)]
  }
}
