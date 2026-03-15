/* eslint-env jest */
import { jest } from '@jest/globals'
/* global describe, it, expect, beforeEach, afterEach */

import { PackedHexDraw } from './packedHexDraw.js'
import { ColorPackedHexDraw } from './colorpackedhexdraw.js'

// minimal mocks used throughout
function makeMockCanvas () {
  const mockCtx = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
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

describe('PackedHexDraw', () => {
  let phdraw
  let mockCanvas
  let mockCtx

  beforeEach(() => {
    const mocks = makeMockCanvas()
    mockCanvas = mocks.mockCanvas
    mockCtx = mocks.mockCtx
    phdraw = new PackedHexDraw('test-canvas')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('constructor sets defaults', () => {
    expect(phdraw.radius).toBe(3)
    expect(phdraw.offsetX).toBe(300)
    expect(phdraw.offsetY).toBe(300)
    expect(phdraw.hexSize).toBe(25)
    expect(phdraw.depth).toBe(4)
    expect(phdraw.maxValue).toBe(4 - 1)
    expect(phdraw.indexer).toBeDefined()
  })

  it('binds mouse events on canvas', () => {
    expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function)
    )
    expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
      'mouseleave',
      expect.any(Function)
    )
    expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    )
  })

  describe('setHexValue / getHexValue', () => {
    it('sets and retrieves value and redraws', () => {
      phdraw.redraw = jest.fn()
      phdraw.setHexValue(0, 0, 0, 2)
      expect(phdraw.redraw).toHaveBeenCalled()
      expect(phdraw.getHexValue(0, 0, 0)).toBe(2)
    })
  })

  describe('setBitsFromCoords', () => {
    it('applies coordinates and redraw', () => {
      phdraw.redraw = jest.fn()
      phdraw.setBitsFromCoords([[0, 0, 0, 3]])
      expect(phdraw.redraw).toHaveBeenCalled()
      expect(phdraw.getHexValue(0, 0, 0)).toBe(3)
    })
  })

  describe('clear', () => {
    it('zeroes out bits and redraw', () => {
      phdraw.setHexValue(0, 0, 0, 1)
      phdraw.redraw = jest.fn()
      phdraw.clear()
      expect(phdraw.getHexValue(0, 0, 0)).toBe(0)
      expect(phdraw.redraw).toHaveBeenCalled()
    })
  })

  describe('redraw / hover', () => {
    it('clears canvas and invokes draw methods', () => {
      phdraw._drawGrid = jest.fn()
      phdraw._drawHover = jest.fn()
      phdraw.redraw()
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 600, 600)
      expect(phdraw._drawGrid).toHaveBeenCalled()
      expect(phdraw._drawHover).toHaveBeenCalled()
    })

    it('redrawWithHover stores hoverLocation', () => {
      phdraw.redraw = jest.fn()
      phdraw.redrawWithHover(5)
      expect(phdraw.hoverLocation).toBe(5)
      expect(phdraw.redraw).toHaveBeenCalled()
    })
  })

  describe('_valueToColor', () => {
    it('returns blue for zero and gradient for positive', () => {
      expect(phdraw._valueToColor(0)).toBe('#2196F3')
      const greenish = phdraw._valueToColor(phdraw.maxValue)
      expect(greenish).toMatch(/rgb\(/)
    })
  })

  describe('toggleCell', () => {
    it('cycles through values', () => {
      const idx = 0
      // starting at 0
      phdraw.toggleCell(idx)
      expect(
        phdraw.getHexValue(
          ...phdraw.indexer.coords[idx],
          -phdraw.indexer.coords[idx][0] - phdraw.indexer.coords[idx][1]
        )
      ).toBe(1)
      phdraw.toggleCell(idx)
      expect(
        phdraw.getHexValue(
          ...phdraw.indexer.coords[idx],
          -phdraw.indexer.coords[idx][0] - phdraw.indexer.coords[idx][1]
        )
      ).toBe(2)
    })
  })

  describe('_hitTest', () => {
    it('returns null for outside or invalid', () => {
      expect(phdraw._hitTest(-10, -10)).toBeNull()
    })
    it('returns an index for a valid pixel inside first hex', () => {
      // approximate centre (offsetX, offsetY)
      const hit = phdraw._hitTest(phdraw.offsetX, phdraw.offsetY)
      expect(hit).not.toBeNull()
      expect(typeof hit).toBe('number')
    })
  })
})

describe('ColorPackedHexDraw', () => {
  let cphdraw
  let mockCtx
  beforeEach(() => {
    const mocks = makeMockCanvas()
    mockCtx = mocks.mockCtx
    cphdraw = new ColorPackedHexDraw('test-canvas')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('inherits _valueToColor mapping', () => {
    expect(cphdraw._valueToColor(0)).toBe('#2196F3')
    expect(cphdraw._valueToColor(1)).toBe('#4caf50')
    expect(cphdraw._valueToColor(2)).toBe('#FFEB3B')
    expect(cphdraw._valueToColor(3)).toBe('#F0E68C')
  })

  it('behaves like base class for value operations', () => {
    cphdraw.redraw = jest.fn()
    cphdraw.setHexValue(0, 0, 0, 1)
    expect(cphdraw.getHexValue(0, 0, 0)).toBe(1)
    expect(cphdraw.redraw).toHaveBeenCalled()

    cphdraw.setBitsFromCoords([[0, 0, 0, 2]])
    expect(cphdraw.getHexValue(0, 0, 0)).toBe(2)

    cphdraw.clear()
    expect(cphdraw.getHexValue(0, 0, 0)).toBe(0)

    // toggle cycle
    cphdraw.toggleCell(0)
    expect(
      cphdraw.getHexValue(
        ...cphdraw.indexer.coords[0],
        -cphdraw.indexer.coords[0][0] - cphdraw.indexer.coords[0][1]
      )
    ).toBe(1)
  })
})
