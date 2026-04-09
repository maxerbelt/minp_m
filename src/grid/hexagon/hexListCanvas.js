import { ShapeEnum } from '../shapeEnum.js'
import { ListCanvas } from '../listCanvas.js'

export class HexListCanvas extends ListCanvas {
  constructor (radius, list) {
    super(ShapeEnum.hexagon(radius), list || [])
  }
}
