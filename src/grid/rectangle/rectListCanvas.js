import { bh } from '../../terrains/all/js/bh.js'
import { ShapeEnum } from '../shapeEnum.js'
import { ListCanvas } from '../listCanvas.js'

export class RectListCanvas extends ListCanvas {
  constructor (width, height, list) {
    super(ShapeEnum.rectangle(width, height), list || [])
  }
  static BhMapList () {
    const map = bh.map
    const points = new RectListCanvas(map.cols, map.rows, [])
    return points
  }
}
