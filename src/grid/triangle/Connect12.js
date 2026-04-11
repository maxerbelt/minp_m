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

  neighbors (r, c) {
    const seen = new Map()
    const addNeighbors = neighbors => {
      for (const [nr, nc, bit] of neighbors) {
        const key = `${nr},${nc}`
        if (!seen.has(key)) {
          seen.set(key, [nr, nc, bit])
        }
      }
    }

    addNeighbors(this.edgeConnection.neighbors(r, c))
    addNeighbors(this.vertexConnection.neighbors(r, c))
    addNeighbors(this.extendedConnection.neighbors(r, c))

    return Array.from(seen.values())
  }
}
