import { TriConnectBase } from './TriConnectBase.js'

export class Connect3 extends TriConnectBase {
  constructor (triIndex) {
    super(triIndex, Connect3.up, Connect3.down)
  }
  static up = [
    [0, -1, 1],
    [1, 1, 1],
    [0, 1, 1]
  ]
  static down = [
    [-1, -1, 0],
    [0, -1, 0],
    [0, 1, 0]
  ]
}
