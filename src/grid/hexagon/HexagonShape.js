import { CubeIndex } from './CubeIndex'

export const HexagonShape = radius => ({
  type: 'hexagon',
  radius,
  get indexer () {
    return CubeIndex.getInstance(this.radius)
  }
})
