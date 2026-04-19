import { HexagonShape } from './hexagon/HexagonShape.js'
import { RectangleShape } from './rectangle/RectangleShape.js'
import { TriangleShape } from './triangle/TriangleShape'
import { TriRectIndex } from './TriRectIndex.js'

export const TriangleRect = (height, width) => ({
  type: 'triangle-rect',
  height,
  width,
  get indexer () {
    return new TriRectIndex(this.height, this.width)
  }
})
//   const TriIndexModule = await import('./triangle/TriIndex.js')
export const ShapeEnum = {
  triangle: TriangleShape,
  rectangle: RectangleShape,
  hexagon: HexagonShape,
  //
  triangleRect: TriangleRect
}
