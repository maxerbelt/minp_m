import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest
} from '@jest/globals'
import { ColorPackedDraw } from './colorpackeddraw.js'

// Mock canvas context for jsdom environment
function mockCanvasContext () {
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

  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCtx)
  return mockCtx
}

// Helper to create test canvas
function createTestCanvas () {
  mockCanvasContext()
  const canvas = document.createElement('canvas')
  canvas.id = 'test-canvas'
  canvas.width = 600
  canvas.height = 600
  document.body.appendChild(canvas)
  return canvas
}

function removeTestCanvas () {
  const canvas = document.getElementById('test-canvas')
  if (canvas) canvas.remove()
}

describe('ColorPackedDraw', () => {
  let draw

  beforeEach(() => {
    createTestCanvas()
    draw = new ColorPackedDraw('test-canvas', 5, 5, 20, 0, 0, 4)
  })

  afterEach(() => {
    removeTestCanvas()
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
