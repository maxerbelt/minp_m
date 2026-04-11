import { TriConnectBase } from './TriConnectBase.js'

export class Connect3Vertex extends TriConnectBase {
  constructor (triIndex) {
    super(triIndex)
    this.setParityNeighborOffsets(
      [
        [0, 1, 1],
        [-1, 0, 1],
        [-1, -1, 1]
      ],
      [
        [0, -1, 0],
        [1, 0, 0],
        [1, 1, 0]
      ]
    )
  }
}
