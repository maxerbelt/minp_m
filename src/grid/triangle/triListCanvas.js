import { TriangleShape } from './TriangleShape.js'
import { ListCanvas } from '../listCanvas.js'

export class TriListCanvas extends ListCanvas {
  constructor (s, list) {
    super(TriangleShape(s), list || [])
  }
}
