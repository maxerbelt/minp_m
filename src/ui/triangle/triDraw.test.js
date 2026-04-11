/* eslint-env jest */
import { jest } from '@jest/globals'
/* global describe, it, jest, expect, beforeEach, afterEach */

// Variables for dynamically imported modules
let drawTri, triToPixel, pixelToTri, TriDraw

// Implementation of drawTri that can be wrapped in jest.fn
function drawTriImpl (
  ctx,
  cx,
  cy,
  S,
  fill,
  stroke = '#333',
  orientation = 'up'
) {
  const h = (S * Math.sqrt(3)) / 2
  let y0, y1
  if (orientation === 'up') {
    y0 = cy - (2 * h) / 3
    y1 = cy + h / 3
  } else {
    y0 = cy + (2 * h) / 3
    y1 = cy - h / 3
  }
  ctx.beginPath()
  ctx.moveTo(cx, y0)
  ctx.lineTo(cx - S / 2, y1)
  ctx.lineTo(cx + S / 2, y1)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.stroke()
}

// Create a jest-wrapped version of drawTri
const drawTriMock = jest.fn(drawTriImpl)

// We'll set up the mock for triDrawHelper to use our wrapped function
jest.unstable_mockModule('./triDrawHelper.js', () => {
  return {
    triToPixel: (r, c, S) => {
      const h = (S * Math.sqrt(3)) / 2
      const x = (c - r) * (S / 2)
      const y = r * h
      return { x, y }
    },
    pixelToTri: (x, y, S) => {
      const h = (S * Math.sqrt(3)) / 2
      const r = Math.round(y / h)
      const c = Math.round(x / (S / 2) + r)
      return [r, c]
    },
    drawTri: drawTriMock
  }
})

function makeMockCanvas () {
  const mockCtx = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn()
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

describe('TriDraw', () => {
  let td
  let mockCanvas
  let mockCtx

  beforeEach(async () => {
    const triDrawHelperModule = await import('./triDrawHelper.js')
    drawTri = triDrawHelperModule.drawTri
    triToPixel = triDrawHelperModule.triToPixel
    pixelToTri = triDrawHelperModule.pixelToTri

    const triDrawModule = await import('./triDraw.js')
    TriDraw = triDrawModule.TriDraw

    const mocks = makeMockCanvas()
    mockCanvas = mocks.mockCanvas
    mockCtx = mocks.mockCtx
    td = new TriDraw('test-canvas', 4, 100, 100, 20)

    // Clear the mock calls before each test
    drawTriMock.mockClear()
    expect(td.indexer).toBeDefined()
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

  describe('setBits / setBitsFromCoords / clear', () => {
    it('sets bits and redraws', () => {
      td.redraw = jest.fn()
      const coords = [
        [0, 0],
        [1, 0]
      ]
      td.setBitsFromCoords(coords)
      expect(td.redraw).toHaveBeenCalled()
      expect(td.bits).not.toBe(0n)
    })

    it('clear zeroes bits and redraw', () => {
      td.bits = 5n
      td.redraw = jest.fn()
      td.clear()
      expect(td.bits).toBe(0n)
      expect(td.redraw).toHaveBeenCalled()
    })
  })

  describe('redraw / hover', () => {
    it('clears context and calls helpers', () => {
      td._drawGrid = jest.fn()
      td._drawHover = jest.fn()
      td.redraw()
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 600, 600)
      expect(td._drawGrid).toHaveBeenCalled()
      expect(td._drawHover).toHaveBeenCalled()
    })

    it('redrawWithHover stores location', () => {
      td.redraw = jest.fn()
      td.redrawWithHover(2)
      expect(td.hoverLocation).toBe(2)
      expect(td.redraw).toHaveBeenCalled()
    })

    it('draws inverted triangles with upward offset', () => {
      // choose a configuration where second row has a down cell
      td.bits = 0n
      td.redraw()
      const S = td.triSize
      // locate the drawTri call that maps back to r=1,c=1
      let targetCall
      for (const args of drawTri.mock.calls) {
        const px = args[1] - td.offsetX
        const py = args[2] - td.offsetY
        const [rr, cc] = pixelToTri(px, py, S)
        if (rr === 1 && cc === 1) {
          targetCall = args
          break
        }
      }
      expect(targetCall).toBeDefined()
      const { x, y } = triToPixel(1, 1, S)
      const expectedY = y - td.triHeight * 0.3 + td.offsetY
      expect(targetCall[2]).toBeCloseTo(expectedY, 5)
    })
  })

  describe('toggleCell', () => {
    it('toggles a bit', () => {
      const idx = 0
      expect(td.bits).toBe(0n)
      td.toggleCell(idx)
      expect(td.bits !== 0n).toBe(true)
    })
  })

  describe('_hitTest', () => {
    it('returns null outside grid', () => {
      expect(td._hitTest(-5, -5)).toBeNull()
    })
    it('finds index at approximate origin even when cell is empty', () => {
      const hit = td._hitTest(td.offsetX, td.offsetY)
      expect(hit).toBe(0)
    })
    it('still returns index when cell is set', () => {
      td.bits = 1n // set first cell
      const hit = td._hitTest(td.offsetX, td.offsetY)
      expect(hit).toBe(0)
    })
  })
})
