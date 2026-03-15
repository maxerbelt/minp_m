export class ShapeBase {
  constructor (shape) {
    this.shape = shape
    this.indexer = shape.indexer
    this.width = shape.width || 0
    this.height = shape.height || 0
    this.size = shape.size || 0

    if (new.target === ShapeBase) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
  }

  index (x, y) {
    return this.indexer.index(x, y)
  }

  get rowMax () {
    return this.width
  }
  location (index) {
    return this.indexer.location(index)
  }
  isValid (...args) {
    return this.indexer.isValid(...args)
  }

  *keys () {
    const n = this.size
    for (let i = 0; i < n; i++) {
      const lc = this.location(i)
      yield [...lc, i]
    }
  }
}
