import { ConnectBase } from './ConnectBase.js'

export class Connect4Diagonal extends ConnectBase {
  constructor (rectIndex) {
    super(rectIndex)
    this.setNeighborOffsets(this.constructor.diagonalNeighborOffsets)
  }
}
