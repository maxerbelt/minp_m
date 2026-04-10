import { TriConnectBase } from './TriConnectBase.js'

export class Connect3Vertex extends TriConnectBase {
  constructor (triIndex) {
    super(triIndex)
    this.valuesUp = [
      [0, 1, 1],
      [-1, 0, 1],
      [-1, -1, 1]
    ]
    this.valuesDown = [
      [0, -1, 0],
      [1, 0, 0],
      [1, 1, 0]
    ]
  }
}
