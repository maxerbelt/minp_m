import { ConnectBase } from './ConnectBase.js'

export class Connect4 extends ConnectBase {
  constructor (rectIndex) {
    super(rectIndex)
    this.setNeighborOffsets(this.constructor.orthogonalNeighborOffsets)
  }
}
