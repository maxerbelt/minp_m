export class TriConnectBase {
  /**
   * Base class for triangle grid connectivity with parity-based neighbor offsets.
   * Triangles alternate parity (up=0, down=1) in rows, requiring different neighbor offsets.
   * @param {Object} triIndex - Triangle indexer instance
   * @param {Array<Array>} upOffsets - Neighbor offsets for parity 0 (up-pointing) triangles
   * @param {Array<Array>} downOffsets - Neighbor offsets for parity 1 (down-pointing) triangles
   */
  constructor (triIndex, upOffsets = [], downOffsets = []) {
    this.triIndex = triIndex
    this.neighborOffsets = {
      up: upOffsets,
      down: downOffsets
    }
  }

  /**
   * Gets neighbors of a cell, using parity to determine correct offset set
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Array<Array>} List of [r, c, bit] neighbor coordinates
   */
  neighbors (r, c) {
    const parity = this.triIndex.parity(r, c)
    const values =
      parity === 0 ? this.neighborOffsets.up : this.neighborOffsets.down
    return values.map(([dr, dc, bit]) => [r + dr, c + dc, bit])
  }

  /**
   * Gets area (cell + all neighbors) of a cell
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Array<Array>} List of [r, c, bit] coordinates for cell and neighbors
   */
  area (r, c) {
    return [[r, c, this.triIndex.parity(r, c)], ...this.neighbors(r, c)]
  }
}
