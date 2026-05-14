/**
 * @typedef {[number, number]} NeighborOffset
 * @typedef {[number, number]} Coordinate
 */

export class ConnectBase {
  /**
   * @param {import('./RectIndex.js').RectIndex} rectIndex
   * @param {NeighborOffset[]} neighborOffsets
   */
  constructor (
    rectIndex,
    neighborOffsets = ConnectBase.orthogonalNeighborOffsets
  ) {
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
    return ConnectBase.combineNeighborOffsetGroups(
      this.orthogonalNeighborOffsets,
      this.diagonalNeighborOffsets
    )
  }

  /**
   * Combine multiple neighbor offset groups into a single offset list.
   * @param {NeighborOffset[][]} groups
   * @returns {NeighborOffset[]}
   */
  static combineNeighborOffsetGroups (...groups) {
    return groups.flat()
  }

  /**
   * Translate relative neighbor offsets into absolute grid coordinates.
   * @param {number} x
   * @param {number} y
   * @param {NeighborOffset[]} offsets
   * @returns {Coordinate[]}
   */
  translateOffsets (x, y, offsets) {
    return offsets.map(([dx, dy]) => [x + dx, y + dy])
  }

  /**
   * Return the coordinates of all neighboring cells.
   * @param {number} x
   * @param {number} y
   * @returns {Coordinate[]}
   */
  neighbors (x, y) {
    return this.translateOffsets(x, y, this.neighborOffsets)
  }

  /**
   * Return the center cell plus its neighbors.
   * @param {number} x
   * @param {number} y
   * @returns {Coordinate[]}
   */
  area (x, y) {
    return [[x, y], ...this.neighbors(x, y)]
  }
}
