import { TriConnectBase } from './TriConnectBase.js'

export class TriConnect6 extends TriConnectBase {
  constructor (triIndex) {
    super(triIndex)
    this.setParityNeighborOffsets(
      [
        [1, 0, 1],
        [1, 1, 1],
        [0, -1, 1],
        [0, 1, 1],
        [-1, 0, 1],
        [-1, -1, 1]
      ],
      [
        [-1, -1, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [1, 0, 0],
        [1, 1, 0]
      ]
    )
  }
}
