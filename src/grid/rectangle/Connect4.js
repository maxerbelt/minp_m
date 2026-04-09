import { ConnectBase } from './ConnectBase.js'

const ORTHO_NEIGHBOR_VALUES = [
  [+1, 0],
  [-1, 0],
  [0, +1],
  [0, -1]
]

export class Connect4 extends ConnectBase {
  constructor (rectIndex) {
    super(rectIndex)
    this.values = ORTHO_NEIGHBOR_VALUES
  }
}
