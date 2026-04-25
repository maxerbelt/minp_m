import { ConnectBase } from './ConnectBase.js'

export class Connect8 extends ConnectBase {
  constructor (rectIndex) {
    super(rectIndex, Connect8.allNeighborOffsets)
  }
}
