/* eslint-env jest */
/* global describe, it, expect */

import { CanvasGrid } from './canvasGrid.js'
import { ShapeEnum } from './shapeEnum.js'

// Jest test suite
describe('CanvasGrid constructor', () => {
  it('throws when instantiated directly', () => {
    expect(() => new CanvasGrid(ShapeEnum.rectangle(10, 10))).toThrow(
      'base class cannot be instantiated directly. Please extend it.'
    )
  })

  it('subclass with set can be instantiated and is instance of CanvasGrid', () => {
    class SubGrid extends CanvasGrid {
      constructor (w, h) {
        super(ShapeEnum.rectangle(w, h))
      }
      set () {
        return 'ok'
      }
    }
    const g = new SubGrid(5, 6)
    expect(g).toBeInstanceOf(CanvasGrid)
    expect(typeof g.set).toBe('function')
    expect(g.set()).toBe('ok')
  })

  it('subclass without set inherits set that throws when called', () => {
    class NoSetGrid extends CanvasGrid {
      constructor (w, h) {
        super(ShapeEnum.rectangle(w, h))
      }
    }
    const g = new NoSetGrid(3, 4)
    expect(() => g.set()).toThrow(
      'set method in derived class must be implemented'
    )
  })
})
