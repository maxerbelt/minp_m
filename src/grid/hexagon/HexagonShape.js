import { CubeIndex } from './CubeIndex.js'

export const HexagonShape = radius => ({
  type: 'hexagon',
  radius,
  get indexer () {
    return CubeIndex.getInstance(this.radius)
  }
})
