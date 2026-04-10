import { CubeConnectBase } from './CubeConnectBase.js'

const HEX_NEIGHBOR_VALUES = [
  [+1, 0],
  [-1, 0],
  [0, +1],
  [0, -1],
  [-1, +1],
  [+1, -1]
]

export class Connect6 extends CubeConnectBase {
  constructor (cubeIndex) {
    super(cubeIndex)
    this.values = HEX_NEIGHBOR_VALUES
  }
}
