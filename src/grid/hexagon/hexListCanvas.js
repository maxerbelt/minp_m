import { HexagonShape } from './HexagonShape.js'
import { ListCanvas } from '../listCanvas.js'

export class HexListCanvas extends ListCanvas {
  constructor (radius, list) {
    super(HexagonShape(radius), list || [])
  }
}
