import { bh } from '../../terrains/all/js/bh.js'
import { RectangleShape } from './RectangleShape.js'
import { ListCanvas } from '../listCanvas.js'

export class RectListCanvas extends ListCanvas {
  constructor (width, height, list) {
    super(RectangleShape(width, height), list || [])
  }
  static BhMapList () {
    const map = bh.map
    const points = new RectListCanvas(map.cols, map.rows, [])
    return points
  }
}
