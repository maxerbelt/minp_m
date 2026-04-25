import { TriConnectBase } from './TriConnectBase.js'
import { Connect3 } from './Connect3.js'
import { Connect3Vertex } from './Connect3Vertex.js'
import { TriConnect6Extended } from './TriConnect6Extended.js'

export class Connect12 extends TriConnectBase {
  constructor (triIndex) {
    super(triIndex)
    this.edgeConnection = new Connect3(triIndex)
    this.vertexConnection = new Connect3Vertex(triIndex)
    this.extendedConnection = new TriConnect6Extended(triIndex)
  }

  /**
   * Merge neighbor lists from multiple connections, deduplicating by coordinates
   * @param {Array<Array>} neighborLists - Array of neighbor coordinate lists
   * @returns {Array<Array>} Deduplicated [r, c, bit] tuples
   * @private
   */
  _deduplicateNeighbors (...neighborLists) {
    const seen = new Map()
    for (const neighbors of neighborLists) {
      for (const [nr, nc, bit] of neighbors) {
        const key = `${nr},${nc}`
        if (!seen.has(key)) {
          seen.set(key, [nr, nc, bit])
        }
      }
    }
    return Array.from(seen.values())
  }

  neighbors (r, c) {
    return this._deduplicateNeighbors(
      this.edgeConnection.neighbors(r, c),
      this.vertexConnection.neighbors(r, c),
      this.extendedConnection.neighbors(r, c)
    )
  }
}
