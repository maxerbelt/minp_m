import { CubeIndex } from './hexagon/CubeIndex.js'
import { RectIndex } from './rectangle/RectIndex.js'
import { TriIndex } from './triangle/TriIndex.js'
import { TriRectIndex } from './TriRectIndex.js'
//   const TriIndexModule = await import('./triangle/TriIndex.js')
export const ShapeEnum = {
  triangle: side => ({
    type: 'triangle',
    side,
    get indexer () {
      return new TriIndex(this.side)
    }
  }),
  rectangle: (width, height) => ({
    type: 'rectangle',
    width,
    height,
    get indexer () {
      return new RectIndex(this.width, this.height)
    }
  }),
  hexagon: radius => ({
    type: 'hexagon',
    radius,
    get indexer () {
      return CubeIndex.getInstance(this.radius)
    }
  }),
  //
  triangleRect: (height, width) => ({
    type: 'triangle-rect',
    height,
    width,
    get indexer () {
      return new TriRectIndex(this.height, this.width)
    }
  })
}
