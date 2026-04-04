/* eslint-env jest */

/* global describe, it, expect,  beforeEach, afterEach, jest */

import { RectDrawColor } from './rectdrawcolor.js'

describe('RectDrawColor - Multi-Color Support', () => {
  // Mock canvas context for jsdom environment
  function mockCanvasContext () {
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {}
    }

    HTMLCanvasElement.prototype.getContext = () => mockCtx
    return mockCtx
  }

  // Helper to create test canvas
  function createTestCanvas () {
    mockCanvasContext()
    const canvas = document.createElement('canvas')
    canvas.id = 'test-color-canvas'
    canvas.width = 500
    canvas.height = 500
    document.body.appendChild(canvas)
    return canvas
  }

  function removeTestCanvas () {
    const canvas = document.getElementById('test-color-canvas')
    if (canvas) canvas.remove()
  }

  // Test 2-Color (1 bit per cell)
  describe('2-Color Mode (1 bit)', () => {
    let rectDraw
    const canvasId = 'test-color-canvas'

    beforeEach(() => {
      createTestCanvas()
      rectDraw = new RectDrawColor(canvasId, 5, 5, 50, 0, 0, 2)
    })

    afterEach(() => {
      removeTestCanvas()
    })

    it('should initialize with 1 bit per cell', () => {
      expect(rectDraw.bitsPerCell).toBe(1)
      expect(rectDraw.maxColor).toBe(1)
    })

    it('should have 2-color palette', () => {
      const palette = rectDraw.getPalette()
      expect(palette.length).toBe(2)
      expect(palette[0]).toBe('#000000') // Black
      expect(palette[1]).toBe('#FFFFFF') // White
    })

    it('should set color values 0-1', () => {
      rectDraw.setColorValue(2, 2, 0)
      expect(rectDraw._getCellValue(2, 2)).toBe(0)

      rectDraw.setColorValue(2, 2, 1)
      expect(rectDraw._getCellValue(2, 2)).toBe(1)
    })

    it('should clamp invalid color values', () => {
      rectDraw.setColorValue(0, 0, 5) // Out of range
      expect(rectDraw._getCellValue(0, 0)).toBe(1) // Clamped to max
    })

    it('should cycle colors with wraparound', () => {
      rectDraw.setColorValue(1, 1, 0)
      rectDraw.cycleColor(1, 1)
      expect(rectDraw._getCellValue(1, 1)).toBe(1)

      rectDraw.cycleColor(1, 1)
      expect(rectDraw._getCellValue(1, 1)).toBe(0) // Wraps back to 0
    })

    it('should fill grid with color', () => {
      rectDraw.fillWithColor(1)
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw._getCellValue(x, y)).toBe(1)
        }
      }
    })

    it('should get hex color for value', () => {
      const color0 = rectDraw._getHexColor(0)
      const color1 = rectDraw._getHexColor(1)
      expect(color0).toBe('#000000')
      expect(color1).toBe('#FFFFFF')
    })

    it('should return color info string', () => {
      rectDraw.setColorValue(0, 0, 1)
      const info = rectDraw.getColorInfo(0, 0)
      expect(info).toContain('Color 1/1')
      expect(info).toContain('#FFFFFF')
    })
  })

  // Test 4-Color (2 bits per cell)
  describe('4-Color Mode (2 bits)', () => {
    let rectDraw
    const canvasId = 'test-color-canvas'

    beforeEach(() => {
      createTestCanvas()
      rectDraw = new RectDrawColor(canvasId, 5, 5, 50, 0, 0, 4)
    })

    afterEach(() => {
      removeTestCanvas()
    })

    it('should initialize with 2 bits per cell', () => {
      expect(rectDraw.bitsPerCell).toBe(2)
      expect(rectDraw.maxColor).toBe(3)
    })

    it('should have 4-color palette (primary colors)', () => {
      const palette = rectDraw.getPalette()
      expect(palette.length).toBe(4)
      expect(palette[0]).toBe('#000000') // Black
      expect(palette[1]).toBe('#FF0000') // Red
      expect(palette[2]).toBe('#00FF00') // Green
      expect(palette[3]).toBe('#0000FF') // Blue
    })

    it('should set and read all 4 color values', () => {
      for (let color = 0; color <= 3; color++) {
        rectDraw.setColorValue(0, 0, color)
        expect(rectDraw._getCellValue(0, 0)).toBe(color)
      }
    })

    it('should cycle through all 4 colors', () => {
      rectDraw.setColorValue(3, 3, 0)
      for (let i = 0; i < 5; i++) {
        rectDraw.cycleColor(3, 3)
        const expected = (i + 1) % 4
        expect(rectDraw._getCellValue(3, 3)).toBe(expected)
      }
    })

    it('should fill entire grid with specified color', () => {
      rectDraw.fillWithColor(2)
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw._getCellValue(x, y)).toBe(2)
        }
      }
    })

    it('should handle color value clamping', () => {
      rectDraw.setColorValue(1, 1, 10) // Way out of range
      expect(rectDraw._getCellValue(1, 1)).toBe(3) // Clamped to maxColor
    })
  })

  // Test 16-Color (4 bits per cell)
  describe('16-Color Mode (4 bits)', () => {
    let rectDraw
    const canvasId = 'test-color-canvas'

    beforeEach(() => {
      createTestCanvas()
      rectDraw = new RectDrawColor(canvasId, 5, 5, 50, 0, 0, 16)
    })

    afterEach(() => {
      removeTestCanvas()
    })

    it('should initialize with 4 bits per cell', () => {
      expect(rectDraw.bitsPerCell).toBe(4)
      expect(rectDraw.maxColor).toBe(15)
    })

    it('should have 16-color palette', () => {
      const palette = rectDraw.getPalette()
      expect(palette.length).toBe(16)
      expect(palette[0]).toBe('#000000') // Black
      expect(palette[7]).toBe('#FFFFFF') // White
    })

    it('should set and read all 16 color values', () => {
      for (let color = 0; color < 16; color++) {
        rectDraw.setColorValue(0, 0, color)
        expect(rectDraw.mask.at(0, 0)).toBe(color)
      }
    })

    it('should cycle correctly through 16 colors', () => {
      rectDraw.setColorValue(2, 2, 14)
      rectDraw.cycleColor(2, 2)
      expect(rectDraw.mask.at(2, 2)).toBe(15)

      rectDraw.cycleColor(2, 2)
      expect(rectDraw.mask.at(2, 2)).toBe(0) // Wraps to 0
    })

    it('should return valid hex colors for all palette entries', () => {
      const palette = rectDraw.getPalette()
      palette.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })
  })

  // Test 256-Color (8 bits per cell)
  describe('256-Color Mode (8 bits)', () => {
    let rectDraw
    const canvasId = 'test-color-canvas'

    beforeEach(() => {
      createTestCanvas()
      rectDraw = new RectDrawColor(canvasId, 5, 5, 50, 0, 0, 256)
    })

    afterEach(() => {
      removeTestCanvas()
    })

    it('should initialize with 8 bits per cell', () => {
      expect(rectDraw.bitsPerCell).toBe(8)
      expect(rectDraw.maxColor).toBe(255)
    })

    it('should have 256-color palette', () => {
      const palette = rectDraw.getPalette()
      expect(palette.length).toBe(256)
    })

    it('should set and read max color values', () => {
      rectDraw.setColorValue(0, 0, 0)
      expect(rectDraw._getCellValue(0, 0)).toBe(0)

      rectDraw.setColorValue(1, 1, 255)
      expect(rectDraw._getCellValue(1, 1)).toBe(255)

      rectDraw.setColorValue(2, 2, 128)
      expect(rectDraw._getCellValue(2, 2)).toBe(128)
    })

    it('should cycle through colors with wraparound at 255', () => {
      rectDraw.setColorValue(0, 0, 255)
      rectDraw.cycleColor(0, 0)
      expect(rectDraw._getCellValue(0, 0)).toBe(0) // Wraps to 0
    })

    it('should clamp colors beyond 255', () => {
      rectDraw.setColorValue(0, 0, 300)
      expect(rectDraw._getCellValue(0, 0)).toBe(255)
    })

    it('should return valid hex colors with RGB cube', () => {
      const palette = rectDraw.getPalette()
      // Check first RGB cube color (should be #000000)
      expect(palette[0]).toBe('#000000')
      // Check some colors are valid hex
      palette.slice(0, 50).forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i)
      })
    })

    it('should have sufficiently unique colors in palette', () => {
      const palette = rectDraw.getPalette()
      const unique = new Set(palette)
      // RGB cube (216) + grayscale (40) may have some overlaps, at least 250+ unique
      expect(unique.size).toBeGreaterThanOrEqual(250)
      expect(palette.length).toBe(256)
    })
  })

  // Test cross-bit-depth functionality
  describe('Cross-Mode Compatibility', () => {
    it('should throw error for unsupported bit depths', () => {
      createTestCanvas()
      expect(() => {
        new RectDrawColor('test-color-canvas', 5, 5, 50, 0, 0, 3)
      }).toThrow(/Unsupported depth/)
      removeTestCanvas()
    })

    it('should support all valid bit depths', () => {
      createTestCanvas()
      const validDepths = [2, 4, 16, 256]
      const expectedBitsPerCell = [1, 2, 4, 8]
      validDepths.forEach((depth, index) => {
        const rectDraw = new RectDrawColor(
          'test-color-canvas',
          5,
          5,
          50,
          0,
          0,
          depth
        )
        expect(rectDraw.bitsPerCell).toBe(expectedBitsPerCell[index])
        expect(rectDraw.maxColor).toBe((1 << expectedBitsPerCell[index]) - 1)
      })
      removeTestCanvas()
    })
  })

  // Test grid fill operations
  describe('Grid Fill Operations', () => {
    let rectDraw
    const canvasId = 'test-color-canvas'

    beforeEach(() => {
      createTestCanvas()
      rectDraw = new RectDrawColor(canvasId, 5, 5, 50, 0, 0, 16)
    })

    afterEach(() => {
      removeTestCanvas()
    })

    it('should fill grid with different colors', () => {
      const colors = [0, 5, 10, 15]
      colors.forEach(color => {
        rectDraw.fillWithColor(color)
        for (let y = 0; y < 5; y++) {
          for (let x = 0; x < 5; x++) {
            expect(rectDraw._getCellValue(x, y)).toBe(color)
          }
        }
      })
    })

    it('should clear grid (fill with 0)', () => {
      rectDraw.fillWithColor(10)
      rectDraw.clear()
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw._getCellValue(x, y)).toBe(0)
        }
      }
    })

    it('should overwrite previous colors when filling', () => {
      rectDraw.fillWithColor(5)
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw._getCellValue(x, y)).toBe(5)
        }
      }

      rectDraw.fillWithColor(10)
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw._getCellValue(x, y)).toBe(10)
        }
      }
    })
  })

  // Test color cycling with wrap-around
  describe('Color Cycling', () => {
    let rectDraw
    const canvasId = 'test-color-canvas'

    beforeEach(() => {
      createTestCanvas()
      rectDraw = new RectDrawColor(canvasId, 5, 5, 50, 0, 0, 2)
    })

    afterEach(() => {
      removeTestCanvas()
    })

    it('should cycle correctly from 0 to maxColor', () => {
      const sequence = []
      rectDraw.setColorValue(0, 0, 0)

      for (let i = 0; i < 5; i++) {
        sequence.push(rectDraw._getCellValue(0, 0))
        rectDraw.cycleColor(0, 0)
      }

      expect(sequence).toEqual([0, 1, 0, 1, 0])
    })

    it('should handle multiple cells independently', () => {
      rectDraw.setColorValue(0, 0, 0)
      rectDraw.setColorValue(1, 1, 1)

      rectDraw.cycleColor(0, 0)
      rectDraw.cycleColor(1, 1)

      expect(rectDraw._getCellValue(0, 0)).toBe(1)
      expect(rectDraw._getCellValue(1, 1)).toBe(0)
    })
  })
})
