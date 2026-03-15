/* eslint-env jest */

/* global describe, it, expect */
import {
  drawRay,
  drawSegmentTo,
  drawSegmentUpTo,
  drawSegmentFor,
  drawPie
} from './maskShape.js'

class MockCanvas {
  constructor (w, h) {
    this.width = w
    this.height = h
    this._sets = new Map()
  }
  set (x, y, color = 1) {
    this._sets.set(`${x},${y}`, color)
  }
  test (x, y) {
    return this._sets.has(`${x},${y}`)
  }
  count () {
    return this._sets.size
  }
  entries () {
    return Array.from(this._sets.keys()).map(k => k.split(',').map(Number))
  }
}

describe('maskShape basic drawing', () => {
  it('drawRay draws across the canvas horizonally', () => {
    const c = new MockCanvas(10, 10)
    drawRay(1, 0, 4, 0, c)
    // should draw from x=0 to x=9 inclusive
    expect(c.count()).toBe(9)
    for (let x = 1; x < 10; x++) expect(c.test(x, 0)).toBe(true)
  })
  it('drawRay draws across the canvas in diagonally', () => {
    const c = new MockCanvas(5, 5)
    drawRay(1, 1, 3, 3, c)
    // should draw from x=0 to x=9 inclusive
    expect(c.count()).toBe(4)
    for (let x = 1; x < 5; x++) expect(c.test(x, x)).toBe(true)
  })
  it('drawRay draws across the canvas vertocally', () => {
    const c = new MockCanvas(10, 10)
    drawRay(0, 1, 0, 5, c)
    // should draw from x=0 to x=9 inclusive
    expect(c.count()).toBe(9)
    for (let x = 1; x < 10; x++) expect(c.test(0, x)).toBe(true)
  })
  it('drawSegmentTo draws only up to the target', () => {
    const c = new MockCanvas(10, 10)
    drawSegmentTo(0, 0, 3, 0, c, 1)
    for (let x = 0; x <= 3; x++) expect(c.test(x, 0)).toBe(true)
    expect(c.test(4, 0)).toBe(false)
  })
  it('drawSegmentTo draws only up to the target', () => {
    const c = new MockCanvas(10, 10)
    drawSegmentUpTo(0, 0, 3, 0, c, 1)
    for (let x = 0; x < 3; x++) expect(c.test(x, 0)).toBe(true)
    expect(c.test(3, 0)).toBe(false)
  })

  it('drawSegmentFor respects distance parameter', () => {
    const c = new MockCanvas(10, 10)
    // distance counts starting cell; distance=3 should draw x=0,1,2
    drawSegmentFor(0, 0, 9, 0, 3, c, 1)
    expect(c.test(0, 0)).toBe(true)
    expect(c.test(1, 0)).toBe(true)
    expect(c.test(2, 0)).toBe(true)
    expect(c.test(3, 0)).toBe(false)
  })

  it('drawPie produces at least one set cell within radius', () => {
    const c = new MockCanvas(10, 10)
    drawPie(4, 4, 6, 4, 2, c, 22.5, 1)
    expect(c.count()).toBeGreaterThan(0)
    // every set cell should be within radius 2 of (4,4)
    for (const [x, y] of c.entries()) {
      const dx = x - 4
      const dy = y - 4
      expect(dx * dx + dy * dy).toBeLessThanOrEqual(4)
    }
  })
})
