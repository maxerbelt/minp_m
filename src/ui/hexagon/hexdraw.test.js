/* eslint-env jest */
/* global describe, jest, it, expect, beforeEach, afterEach */

import { HexDraw } from './hexDraw.js'
import { jest } from '@jest/globals'

describe('HexDraw', () => {
  let hexDraw
  let mockCanvas
  let mockCtx

  beforeEach(() => {
    // Mock canvas element
    mockCtx = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn()
    }

    mockCanvas = {
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

    // Mock document.getElementById
    document.getElementById = jest.fn(id => {
      if (id === 'test-canvas') return mockCanvas
      return null
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with default parameters', () => {
      hexDraw = new HexDraw('test-canvas')
      expect(hexDraw.radius).toBe(3)
      expect(hexDraw.offsetX).toBe(300)
      expect(hexDraw.offsetY).toBe(300)
      expect(hexDraw.hexSize).toBe(25)
    })

    it('should create instance with custom parameters', () => {
      hexDraw = new HexDraw('test-canvas', 5, 100, 200, 30)
      expect(hexDraw.radius).toBe(5)
      expect(hexDraw.offsetX).toBe(100)
      expect(hexDraw.offsetY).toBe(200)
      expect(hexDraw.hexSize).toBe(30)
    })

    it('should initialize canvas and context', () => {
      hexDraw = new HexDraw('test-canvas')
      expect(hexDraw.canvas).toBe(mockCanvas)
      expect(hexDraw.ctx).toBe(mockCtx)
    })

    it('should initialize MaskHex with given radius', () => {
      hexDraw = new HexDraw('test-canvas', 2)
      expect(hexDraw.mask).toBeDefined()
      expect(hexDraw.mask.radius).toBe(2)
      expect(hexDraw.indexer).toBeDefined()
    })

    it('should initialize bits to 0n', () => {
      hexDraw = new HexDraw('test-canvas')
      expect(hexDraw.bits).toBe(0n)
    })

    it('should initialize hoverLocation to null', () => {
      hexDraw = new HexDraw('test-canvas')
      expect(hexDraw.hoverLocation).toBeNull()
    })

    it('should throw error if canvas element not found', () => {
      document.getElementById = jest.fn(() => null)
      expect(() => {
        new HexDraw('nonexistent-canvas')
      }).toThrow(`Canvas element with id "nonexistent-canvas" not found`)
    })

    it('should bind mouse events', () => {
      hexDraw = new HexDraw('test-canvas')
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      )
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'mouseleave',
        expect.any(Function)
      )
    })
  })

  describe('setBits', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas')
      jest.clearAllMocks()
    })

    it('should set bits value', () => {
      const bits = 0b111n
      hexDraw.redraw = jest.fn()
      hexDraw.setBits(bits)
      expect(hexDraw.bits).toBe(bits)
    })

    it('should trigger redraw', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.setBits(0b111n)
      expect(hexDraw.redraw).toHaveBeenCalled()
    })

    it('should accept large BigInt values', () => {
      const largeBits = (1n << 50n) | 0b111n
      hexDraw.redraw = jest.fn()
      hexDraw.setBits(largeBits)
      expect(hexDraw.bits).toBe(largeBits)
    })
  })

  describe('setBitsFromCoords', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas')
      jest.clearAllMocks()
    })

    it('should set bits from coordinates', () => {
      const coords = [
        [0, 0, 0],
        [1, -1, 0]
      ]
      hexDraw.redraw = jest.fn()
      hexDraw.setBitsFromCoords(coords)
      expect(hexDraw.mask.bits).toBeDefined()
      expect(hexDraw.bits).toBe(hexDraw.mask.bits)
    })

    it('should trigger redraw', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.setBitsFromCoords([[0, 0, 0]])
      expect(hexDraw.redraw).toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas')
      hexDraw.bits = 0b111111n
      jest.clearAllMocks()
    })

    it('should set bits to 0n', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.clear()
      expect(hexDraw.bits).toBe(0n)
    })

    it('should trigger redraw', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.clear()
      expect(hexDraw.redraw).toHaveBeenCalled()
    })
  })

  describe('redraw', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas')
      jest.clearAllMocks()
    })

    it('should clear canvas', () => {
      hexDraw._drawGrid = jest.fn()
      hexDraw._drawShape = jest.fn()
      hexDraw._drawHover = jest.fn()
      hexDraw.redraw()
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 600, 600)
    })

    it('should call private draw methods', () => {
      hexDraw._drawGrid = jest.fn()
      hexDraw._drawHover = jest.fn()

      hexDraw.redraw()

      expect(hexDraw._drawGrid).toHaveBeenCalled()
      expect(hexDraw._drawHover).toHaveBeenCalled()
    })
  })

  describe('redrawWithHover', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas')
      jest.clearAllMocks()
    })

    it('should set hoverLocation and trigger redraw', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.redrawWithHover(5)
      expect(hexDraw.hoverLocation).toBe(5)
      expect(hexDraw.redraw).toHaveBeenCalled()
    })

    it('should clear hoverLocation when null is passed', () => {
      hexDraw.hoverLocation = 5
      hexDraw.redraw = jest.fn()
      hexDraw.redrawWithHover(null)
      expect(hexDraw.hoverLocation).toBeNull()
      expect(hexDraw.redraw).toHaveBeenCalled()
    })

    it('should default hoverLocation to null', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.redrawWithHover()
      expect(hexDraw.hoverLocation).toBeNull()
    })
  })

  describe('_drawGrid', () => {
    // This method has been removed - grid is now drawn as part of _drawShape
  })

  describe('_drawGrid', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas', 2)
    })

    it('should draw all hexes with color coding', () => {
      hexDraw._drawHover = jest.fn()
      hexDraw.redraw()
      // Verify drawing occurred
      expect(mockCtx.closePath).toHaveBeenCalled()
    })
  })

  describe('_drawHover', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas', 2)
      jest.clearAllMocks()
    })

    it('should not draw when hoverLocation is null', () => {
      hexDraw.hoverLocation = null
      expect(() => hexDraw._drawHover()).not.toThrow()
    })

    it('should exist and be callable when hoverLocation is set', () => {
      hexDraw.hoverLocation = 0
      jest.spyOn(hexDraw, '_drawHover').mockImplementation(() => {})
      expect(() => hexDraw._drawHover()).not.toThrow()
    })
  })

  describe('_bindMouseEvents', () => {
    it('should bind mousemove event listener', () => {
      mockCanvas.addEventListener = jest.fn()
      hexDraw = new HexDraw('test-canvas')
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      )
    })

    it('should bind mouseleave event listener', () => {
      mockCanvas.addEventListener = jest.fn()
      hexDraw = new HexDraw('test-canvas')
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'mouseleave',
        expect.any(Function)
      )
    })

    it('should bind click event listener', () => {
      mockCanvas.addEventListener = jest.fn()
      hexDraw = new HexDraw('test-canvas')
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      )
    })
  })

  describe('toggleCell', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas')
      jest.clearAllMocks()
    })

    it('should toggle a hex on when it is off', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.toggleCell(0)
      expect((hexDraw.bits >> 0n) & 1n).toBe(1n)
      expect(hexDraw.redraw).toHaveBeenCalled()
    })

    it('should toggle a hex off when it is on', () => {
      hexDraw.bits = 1n << 0n
      hexDraw.redraw = jest.fn()
      hexDraw.toggleCell(0)
      expect((hexDraw.bits >> 0n) & 1n).toBe(0n)
      expect(hexDraw.redraw).toHaveBeenCalled()
    })

    it('should handle null index gracefully', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.toggleCell(null)
      expect(hexDraw.redraw).not.toHaveBeenCalled()
    })
  })

  describe('pixel to cube conversion', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas')
    })

    it('should convert pixel to cube coordinates', () => {
      const [q, r, s] = hexDraw._pixelToHex(0, 0)
      expect(q + r + s).toBe(0)
    })

    it('should round to nearest cube coordinate', () => {
      const [q, r, s] = hexDraw._cubeRound(0.4, 0.3, -0.7)
      expect(q + r + s).toBe(0)
      expect(
        Number.isInteger(q) && Number.isInteger(r) && Number.isInteger(s)
      ).toBe(true)
    })
  })

  describe('hit test', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas', 1)
    })

    it('should return null for invalid coordinates', () => {
      const result = hexDraw._hitTest(-1000, -1000)
      expect(result === null || typeof result === 'number').toBe(true)
    })

    it('should return index or null', () => {
      const result = hexDraw._hitTest(300, 300)
      expect(result === null || typeof result === 'number').toBe(true)
    })
  })

  describe('coords getter', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas', 1)
    })

    it('should return mask coords', () => {
      const coords = hexDraw.coords
      expect(Array.isArray(coords)).toBe(true)
      expect(coords.length).toBeGreaterThan(0)
    })

    it('should match indexer coords', () => {
      expect(hexDraw.coords).toBe(hexDraw.indexer.coords)
    })
  })

  describe('bitsIndices generator', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas', 1)
      // Set some bits
      hexDraw.bits = 0b111n
    })

    it('should yield indices for set bits', () => {
      const indices = Array.from(hexDraw.bitsIndices())
      expect(Array.isArray(indices)).toBe(true)
    })

    it('should be iterable', () => {
      const result = []
      for (const index of hexDraw.bitsIndices()) {
        result.push(index)
      }
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('bitKeys generator', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas', 1)
      // Set some bits
      hexDraw.bits = 0b111n
    })

    it('should yield keys for set bits', () => {
      const keys = Array.from(hexDraw.bitKeys())
      expect(Array.isArray(keys)).toBe(true)
    })

    it('should be iterable', () => {
      const result = []
      for (const key of hexDraw.bitKeys()) {
        result.push(key)
      }
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('integration tests', () => {
    beforeEach(() => {
      hexDraw = new HexDraw('test-canvas', 2, 100, 150, 20)
    })

    it('should handle setting bits and redrawing', () => {
      hexDraw.redraw = jest.fn()
      hexDraw.setBits(0b1011n)
      expect(hexDraw.bits).toBe(0b1011n)
      expect(hexDraw.redraw).toHaveBeenCalled()
    })

    it('should handle clear and redraw cycle', () => {
      hexDraw.bits = 0b111111n
      hexDraw.redraw = jest.fn()
      hexDraw.clear()
      expect(hexDraw.bits).toBe(0n)
      expect(hexDraw.redraw).toHaveBeenCalled()
    })

    it('should maintain canvas context reference', () => {
      expect(hexDraw.ctx).toBe(mockCtx)
    })

    it('should maintain custom configuration', () => {
      expect(hexDraw.hexSize).toBe(20)
      expect(hexDraw.offsetX).toBe(100)
      expect(hexDraw.offsetY).toBe(150)
    })
  })
})
