import { bh } from '../../terrains/all/js/bh.js'
import { ShapeEnum } from '../shapeEnum.js'
import { ListCanvas } from '../listCanvas.js'

export class RectListCanvas extends ListCanvas {
  constructor (x, y, list) {
    super(ShapeEnum.rectangle(x, y), list || [])
  }
  static BhMapList () {
    const map = bh.map
    const points = ListCanvas.Rect(map.cols, map.rows)
    return points
  }
}
