import { ConnectBase } from './ConnectBase.js'

const DIAG_NEIGHBOR_VALUES = [
  [+1, +1],
  [-1, -1],
  [-1, +1],
  [+1, -1]
]

export class Connect4Diagonal extends ConnectBase {
  constructor (rectIndex) {
    super(rectIndex)
    this.values = DIAG_NEIGHBOR_VALUES
  }
}
