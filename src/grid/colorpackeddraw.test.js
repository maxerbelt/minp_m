/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */

import { ColorPackedDraw } from './colorpackeddraw.js'
import { jest } from '@jest/globals'

// minimal canvas/context stub factory
function makeMockCanvas () {
  const mockCtx = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn()
  }
  const mockCanvas = {
    id: 'test-canvas',
    width: 600,
    height: 600,
    getContext: jest.fn(() => mockCtx),
    addEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      left: 0,
      top: 0,
      width: 600,
      height: 600
    }))
  }
  document.getElementById = jest.fn(id => {
    if (id === 'test-canvas') return mockCanvas
    return null
  })
  return { mockCanvas, mockCtx }
}

describe('ColorPackedDraw', () => {
  let draw
  let mockCtx

  beforeEach(() => {
    const mocks = makeMockCanvas()
    mockCtx = mocks.mockCtx
    draw = new ColorPackedDraw('test-canvas', 5, 5, 20, 0, 0, 4)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('constructs with correct defaults and properties', () => {
    expect(draw.width).toBe(5)
    expect(draw.height).toBe(5)
    expect(draw.depth).toBe(4)
    expect(draw.maxValue).toBe(4 - 1)
  })

  it('setCellValue and getCellValue operate and redraw', () => {
    draw.redraw = jest.fn()
    draw.setCellValue(1, 1, 2)
    expect(draw.getCellValue(1, 1)).toBe(2)
    expect(draw.redraw).toHaveBeenCalled()
    expect(draw.getCellValue(-1, -1)).toBe(0)
  })

  it('setBitsFromCoords fills to maxValue when color omitted', () => {
    draw.redraw = jest.fn()
    draw.setBitsFromCoords([
      [0, 0],
      [1, 1, 3]
    ])
    expect(draw.getCellValue(0, 0)).toBe(draw.maxValue)
    expect(draw.getCellValue(1, 1)).toBe(3)
    expect(draw.redraw).toHaveBeenCalled()
  })

  it('toggleCell cycles values and redraws', () => {
    draw.redraw = jest.fn()
    // initial 0
    draw.toggleCell([0, 0])
    expect(draw.getCellValue(0, 0)).toBe(1)
    draw.toggleCell([0, 0])
    expect(draw.getCellValue(0, 0)).toBe(2)
    draw.toggleCell([0, 0])
    expect(draw.getCellValue(0, 0)).toBe(3)
    draw.toggleCell([0, 0])
    expect(draw.getCellValue(0, 0)).toBe(0)
    expect(draw.redraw).toHaveBeenCalled()
  })

  it('_hitTest returns null/out-of-bounds or cell coords', () => {
    expect(draw._hitTest(-1, -1)).toBeNull()
    const res = draw._hitTest(10, 10)
    expect(Array.isArray(res)).toBe(true)
  })
})
