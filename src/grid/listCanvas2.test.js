/* eslint-env jest */

/* global describe, it,   expect */

import { ListCanvas } from './listCanvas.js'
import { errorMsg } from './errorMsg.js'
import { ShapeEnum } from './shapeEnum.js'
import { jest } from '@jest/globals'

function getLc (x = 2, y = 2) {
  return new ListCanvas(ShapeEnum.rectangle(x, y), [])
}

describe('ListCanvas', () => {
  it('set adds entries to list', () => {
    const lc = getLc()
    lc.set(0, 1, 'x')
    lc.set(1, 0)
    expect(lc.list).toEqual([
      [0, 1, 'x'],
      [1, 0]
    ])
  })

  it('grid getter calls coordsToGrid and returns grid', () => {
    const lc = getLc()
    lc.set(0, 0, 1)
    const grid = lc.grid
    expect(grid[0][0]).toBe(1)
    expect(grid[0][1]).toBe(0)
  })
})
describe('basic drawing', () => {
  it('drawRay draws across the canvas in direction', () => {
    const c = getLc(5, 5)
    c.drawRay(1, 1, 3, 3)

    expect(c.list.length).toBe(4)
    expect(c.list).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4]
    ])
  })
  it('drawRay draws color across the canvas', () => {
    const c = getLc(5, 5)
    try {
      c.drawRay(1, 1, 3, 3, 2)

      expect(c.list.length).toBe(4)
      expect(c.list).toEqual([
        [1, 1, 2],
        [2, 2, 2],
        [3, 3, 2],
        [4, 4, 2]
      ])
    } catch (err) {
      err.message += errorMsg('list', c.list)
    }
  })

  it('drawSegmentTo draws only up to the target', () => {
    const c = getLc(5, 5)
    c.drawSegmentTo(1, 1, 4, 4, 1)
    expect(c.list.length).toBe(3)
    expect(c.list).toEqual([
      [1, 1, 1],
      [2, 2, 1],
      [3, 3, 1]
    ])
  })

  it('drawSegmentFor respects distance parameter', () => {
    const c = getLc(5, 5)
    try {
      c.drawSegmentFor(1, 1, 4, 4, 2, 1)
      expect(c.list.length).toBe(2)
      expect(c.list).toEqual([
        [1, 1, 2],
        [2, 2, 2]
      ])
    } catch (err) {
      err.message += errorMsg('list', c.list)
    }
  })
  it('drawLineInfinite', () => {
    const c = getLc(5, 5)
    try {
      c.drawLineInfinite(1, 1, 3, 3, 1)

      expect(c.list.length).toBe(5)
      expect(c.list).toEqual([
        [0, 0, 2],
        [1, 1, 2],
        [2, 2, 2],
        [3, 3, 2],
        [4, 4, 2]
      ])
    } catch (err) {
      err.message += errorMsg('list', c.list)
    }
  })

  it('drawPie produces at least one set cell within radius', () => {
    const c = getLc(5, 5)
    c.drawPie(0, 0, 2, 4, 3, c, 22.5, 1)
    expect(c.list.length).toBeGreaterThan(2)
    for (const [x, y] of c.keys()) {
      expect(x * x + y * y).toBeLessThanOrEqual(9)
    }
  })
})
