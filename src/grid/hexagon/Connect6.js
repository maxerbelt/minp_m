import { CubeConnectBase } from './CubeConnectBase.js'

export class Connect6 extends CubeConnectBase {
  constructor (cubeIndex) {
    super(cubeIndex)
    this.setNeighborOffsets(this.constructor.hexNeighborOffsets)
  }
}
