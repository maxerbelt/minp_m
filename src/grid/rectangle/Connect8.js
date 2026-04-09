import { ConnectBase } from './ConnectBase.js'

const ORTHO_NEIGHBOR_VALUES = [
  [+1, 0],
  [-1, 0],
  [0, +1],
  [0, -1]
]

const DIAG_NEIGHBOR_VALUES = [
  [+1, +1],
  [-1, -1],
  [-1, +1],
  [+1, -1]
]

export class Connect8 extends ConnectBase {
  constructor (rectIndex) {
    super(rectIndex)
    this.values = [...ORTHO_NEIGHBOR_VALUES, ...DIAG_NEIGHBOR_VALUES]
  }
}
