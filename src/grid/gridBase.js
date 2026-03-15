import { CanvasGrid } from './canvasGrid.js'

export class GridBase extends CanvasGrid {
  constructor (shape) {
    super(shape)
    if (new.target === GridBase) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
  }

  at (_x, _y) {
    throw new Error('at method in derived class must be implemented')
  }

  *entries () {
    for (const [x, y, i] of this.keys()) {
      yield [x, y, this.at(x, y), i, this]
    }
  }

  *values () {
    for (const [x, y] of this.keys()) {
      yield this.at(x, y)
    }
  }
}
