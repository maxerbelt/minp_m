import { ShapeEnum } from '../shapeEnum.js'
import { ListCanvas } from '../listCanvas.js'

export class TriListCanvas extends ListCanvas {
  constructor (s, list) {
    super(ShapeEnum.triangle(s), list || [])
  }
}
