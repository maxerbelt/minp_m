import { TriConnectBase } from './TriConnectBase.js'

export class TriConnect6Extended extends TriConnectBase {
  constructor (triIndex) {
    super(triIndex)

    this.setParityNeighborOffsets(
      TriConnect6Extended.up,
      TriConnect6Extended.down
    )
  }
  static up = [
    [-1, -2, 0],
    [-1, 0, 0],
    [0, -2, 0],
    [0, 2, 0],
    [1, 0, 0],
    [1, 2, 0]
  ]
  static down = TriConnect6Extended.up
}
