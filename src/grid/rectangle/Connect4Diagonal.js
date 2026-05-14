import { ConnectBase } from './ConnectBase.js'

export class Connect4Diagonal extends ConnectBase {
  /**
   * @param {import('./RectIndex.js').RectIndex} rectIndex
   */
  constructor (rectIndex) {
    super(rectIndex, Connect4Diagonal.diagonalNeighborOffsets)
  }
}
