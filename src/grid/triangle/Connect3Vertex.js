import { TriConnectBase } from './TriConnectBase.js'

export class Connect3Vertex extends TriConnectBase {
  constructor (triIndex) {
    super(triIndex, Connect3Vertex.up, Connect3Vertex.down)
  }
  static up = [
    [1, 3, 1],
    [1, -1, 1],
    [-1, -1, 1]
  ]
  static down = [
    [-1, -3, 0],
    [-1, 1, 0],
    [1, 1, 0]
  ]
}
