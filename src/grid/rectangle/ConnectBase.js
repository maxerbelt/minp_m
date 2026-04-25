export class ConnectBase {
  constructor (rectIndex, neighborOffsets = []) {
    this.rectIndex = rectIndex
    this.neighborOffsets = neighborOffsets
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

  neighbors (x, y) {
    return this.neighborOffsets.map(([dx, dy]) => [x + dx, y + dy])
  }

  area (x, y) {
    return [[x, y], ...this.neighbors(x, y)]
  }
}
