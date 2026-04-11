import { ConnectBase } from './ConnectBase.js'

export class Connect8 extends ConnectBase {
  constructor (rectIndex) {
    super(rectIndex)
    this.setNeighborOffsets(this.constructor.allNeighborOffsets)
  }
}
