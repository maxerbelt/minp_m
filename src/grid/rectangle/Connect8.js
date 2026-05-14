import { ConnectBase } from './ConnectBase.js'

export class Connect8 extends ConnectBase {
  /**
   * @param {import('./RectIndex.js').RectIndex} rectIndex
   */
  constructor (rectIndex) {
    super(rectIndex, Connect8.allNeighborOffsets)
  }
}
