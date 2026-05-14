import { ConnectBase } from './ConnectBase.js'

export class Connect4 extends ConnectBase {
  /**
   * @param {import('./RectIndex.js').RectIndex} rectIndex
   */
  constructor (rectIndex) {
    super(rectIndex, Connect4.orthogonalNeighborOffsets)
  }
}
