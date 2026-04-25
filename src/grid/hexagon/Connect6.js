import { CubeConnectBase } from './CubeConnectBase.js'

export class Connect6 extends CubeConnectBase {
  constructor (cubeIndex) {
    super(cubeIndex, Connect6.hexNeighborOffsets)
  }
}
