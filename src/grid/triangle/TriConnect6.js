import { Connect3 } from './Connect3.js'
import { Connect3Vertex } from './Connect3Vertex.js'
import { TriConnectBase } from './TriConnectBase.js'

export class TriConnect6 extends TriConnectBase {
  constructor (triIndex) {
    super(triIndex)
    this.setParityNeighborOffsets(
      [...Connect3.up, ...Connect3Vertex.up],
      [...Connect3.down, ...Connect3Vertex.down]
    )
  }
}
