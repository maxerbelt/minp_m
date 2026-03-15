/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */

import { PackedDraw } from './packeddraw.js'
import { jest } from '@jest/globals'

describe('PackedDraw', () => {
  let packedDraw
  let mockCanvas
  let mockCtx

  beforeEach(() => {
    // Mock canvas element
    mockCtx = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn()
    }

    mockCanvas = {
      id: 'test-canvas',
      width: 300,
      height: 300,
      getContext: jest.fn(() => mockCtx),
      addEventListener: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 300,
        height: 300
      }))
    }

    // Mock document.getElementById
    document.getElementById = jest.fn(id => {
      if (id === 'test-canvas') return mockCanvas
      return null
    })

    packedDraw = new PackedDraw('test-canvas', 10, 10, 25, 0, 0, 4)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with default parameters', () => {
      const draw = new PackedDraw('test-canvas')
      expect(draw.width).toBe(10)
      expect(draw.height).toBe(10)
      expect(draw.cellSize).toBe(25)
      expect(draw.offsetX).toBe(0)
      expect(draw.offsetY).toBe(0)
      expect(draw.depth).toBe(4)
    })

    it('should create instance with custom parameters', () => {
      const draw = new PackedDraw('test-canvas', 8, 12, 30, 50, 100, 8)
      expect(draw.width).toBe(8)
      expect(draw.height).toBe(12)
      expect(draw.cellSize).toBe(30)
      expect(draw.offsetX).toBe(50)
      expect(draw.offsetY).toBe(100)
      expect(draw.depth).toBe(8)
    })

    it('should initialize maxValue as depth - 1', () => {
      expect(packedDraw.maxValue).toBe(3)
    })

    it('should initialize Packed grid instance', () => {
      expect(packedDraw.packed).toBeDefined()
      expect(packedDraw.packed.width).toBe(10)
      expect(packedDraw.packed.height).toBe(10)
    })

    it('should initialize canvas and context', () => {
      expect(packedDraw.canvas).toBe(mockCanvas)
      expect(packedDraw.ctx).toBe(mockCtx)
    })

    it('should throw error if canvas element not found', () => {
      document.getElementById = jest.fn(() => null)
      expect(() => {
        new PackedDraw('nonexistent-canvas')
      }).toThrow(`Canvas element with id "nonexistent-canvas" not found`)
    })

    it('should bind mouse events', () => {
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

  describe('setCellValue', () => {
    it('should set cell value at valid coordinate', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.setCellValue(0, 0, 2)
      expect(packedDraw.packed.at(0, 0)).toBe(2)
    })

    it('should trigger redraw after setting value', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.setCellValue(5, 5, 1)
      expect(packedDraw.redraw).toHaveBeenCalled()
    })

    it('should not set value at out-of-bounds x coordinate', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.setCellValue(10, 5, 2)
      expect(packedDraw.redraw).not.toHaveBeenCalled()
    })

    it('should not set value at out-of-bounds y coordinate', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.setCellValue(5, 10, 2)
      expect(packedDraw.redraw).not.toHaveBeenCalled()
    })

    it('should not set value at negative coordinates', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.setCellValue(-1, 5, 2)
      expect(packedDraw.redraw).not.toHaveBeenCalled()
    })

    it('should set value to max depth - 1', () => {
      packedDraw.setCellValue(2, 2, 3)
      expect(packedDraw.packed.at(2, 2)).toBe(3)
    })

    it('should set value to 0 (clear)', () => {
      packedDraw.setCellValue(3, 3, 2)
      packedDraw.setCellValue(3, 3, 0)
      expect(packedDraw.packed.at(3, 3)).toBe(0)
    })
  })

  describe('getCellValue', () => {
    it('should get cell value at valid coordinate', () => {
      packedDraw.packed.set(2, 3, 2)
      expect(packedDraw.getCellValue(2, 3)).toBe(2)
    })

    it('should return 0 for unset cell', () => {
      expect(packedDraw.getCellValue(0, 0)).toBe(0)
    })

    it('should return 0 for out-of-bounds x coordinate', () => {
      expect(packedDraw.getCellValue(10, 5)).toBe(0)
    })

    it('should return 0 for out-of-bounds y coordinate', () => {
      expect(packedDraw.getCellValue(5, 10)).toBe(0)
    })

    it('should return 0 for negative coordinates', () => {
      expect(packedDraw.getCellValue(-1, 5)).toBe(0)
    })
  })

  describe('setBitsFromCoords', () => {
    it('should set cells from array of [x, y] coordinates', () => {
      const coords = [
        [0, 0],
        [1, 1],
        [2, 2]
      ]
      packedDraw.redraw = jest.fn()
      packedDraw.setBitsFromCoords(coords)
      expect(packedDraw.packed.at(0, 0)).toBe(3)
      expect(packedDraw.packed.at(1, 1)).toBe(3)
      expect(packedDraw.packed.at(2, 2)).toBe(3)
    })

    it('should set cells with explicit colors', () => {
      const coords = [
        [0, 0, 1],
        [1, 1, 2],
        [2, 2, 3]
      ]
      packedDraw.setBitsFromCoords(coords)
      expect(packedDraw.packed.at(0, 0)).toBe(1)
      expect(packedDraw.packed.at(1, 1)).toBe(2)
      expect(packedDraw.packed.at(2, 2)).toBe(3)
    })

    it('should use maxValue for omitted colors', () => {
      const coords = [
        [0, 0],
        [1, 1, 1]
      ]
      packedDraw.setBitsFromCoords(coords)
      expect(packedDraw.packed.at(0, 0)).toBe(packedDraw.maxValue)
      expect(packedDraw.packed.at(1, 1)).toBe(1)
    })

    it('should skip out-of-bounds coordinates', () => {
      const coords = [
        [0, 0, 2],
        [10, 5, 3],
        [5, 10, 1],
        [5, 5, 2]
      ]
      packedDraw.setBitsFromCoords(coords)
      expect(packedDraw.packed.at(0, 0)).toBe(2)
      expect(packedDraw.packed.at(5, 5)).toBe(2)
      expect(packedDraw.packed.at(10, 5)).toBe(0)
      expect(packedDraw.packed.at(5, 10)).toBe(0)
    })

    it('should trigger redraw', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.setBitsFromCoords([[0, 0, 1]])
      expect(packedDraw.redraw).toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    beforeEach(() => {
      packedDraw.setBitsFromCoords([
        [0, 0, 2],
        [5, 5, 1],
        [9, 9, 3]
      ])
    })

    it('should clear all cells', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.clear()
      expect(packedDraw.packed.at(0, 0)).toBe(0)
      expect(packedDraw.packed.at(5, 5)).toBe(0)
      expect(packedDraw.packed.at(9, 9)).toBe(0)
    })

    it('should trigger redraw', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.clear()
      expect(packedDraw.redraw).toHaveBeenCalled()
    })
  })

  describe('toggleCell', () => {
    it('should increment cell value on toggle', () => {
      packedDraw.packed.set(2, 2, 0)
      packedDraw.redraw = jest.fn()
      packedDraw.toggleCell([2, 2])
      expect(packedDraw.packed.at(2, 2)).toBe(1)
    })

    it('should wrap around from maxValue to 0', () => {
      packedDraw.packed.set(3, 3, packedDraw.maxValue)
      packedDraw.toggleCell([3, 3])
      expect(packedDraw.packed.at(3, 3)).toBe(0)
    })

    it('should cycle through all values', () => {
      packedDraw.packed.set(1, 1, 0)
      for (let i = 1; i <= packedDraw.maxValue + 1; i++) {
        packedDraw.toggleCell([1, 1])
        expect(packedDraw.packed.at(1, 1)).toBe(i % (packedDraw.maxValue + 1))
      }
    })

    it('should trigger redraw', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.toggleCell([0, 0])
      expect(packedDraw.redraw).toHaveBeenCalled()
    })

    it('should skip null location without redraw', () => {
      packedDraw.redraw = jest.fn()
      packedDraw.toggleCell(null)
      expect(packedDraw.redraw).not.toHaveBeenCalled()
    })
  })

  describe('_hitTest', () => {
    it('should identify cell at pixel coordinate', () => {
      // cellSize = 25, so pixel 100-124 is column 4
      const result = packedDraw._hitTest(100, 50)
      expect(result).toEqual([4, 2])
    })

    it('should handle offset coordinates', () => {
      const draw = new PackedDraw('test-canvas', 10, 10, 25, 50, 50)
      // (100 - 50) / 25 = 2, (75 - 50) / 25 = 1
      const result = draw._hitTest(100, 75)
      expect(result).toEqual([2, 1])
    })

    it('should return null for out-of-bounds pixel on right', () => {
      const result = packedDraw._hitTest(300, 50)
      expect(result).toBeNull()
    })

    it('should return null for out-of-bounds pixel on bottom', () => {
      const result = packedDraw._hitTest(50, 300)
      expect(result).toBeNull()
    })

    it('should return null for negative pixel coordinates', () => {
      const result = packedDraw._hitTest(-10, 50)
      expect(result).toBeNull()
    })

    it('should identify top-left cell', () => {
      const result = packedDraw._hitTest(0, 0)
      expect(result).toEqual([0, 0])
    })

    it('should identify bottom-right valid cell', () => {
      // 9 * 25 = 225, so pixel 225-249 is column/row 9
      const result = packedDraw._hitTest(225, 225)
      expect(result).toEqual([9, 9])
    })
  })

  describe('_valueToColor', () => {
    it('should return blue for value 0', () => {
      expect(packedDraw._valueToColor(0)).toBe('#2196F3')
    })

    it('should return green-tinted color for max value', () => {
      const color = packedDraw._valueToColor(packedDraw.maxValue)
      // Max value should have lower red, higher green
      expect(color).toMatch(/^rgb\(\d+, \d+, 50\)$/)
    })

    it('should scale intensity with value', () => {
      const color1 = packedDraw._valueToColor(1)
      const color2 = packedDraw._valueToColor(2)
      // Both should be rgb format
      expect(color1).toMatch(/^rgb\(\d+, \d+, 50\)$/)
      expect(color2).toMatch(/^rgb\(\d+, \d+, 50\)$/)
    })

    it('should produce consistent colors for same value', () => {
      const color1 = packedDraw._valueToColor(2)
      const color2 = packedDraw._valueToColor(2)
      expect(color1).toBe(color2)
    })

    it('should increase green with increasing value', () => {
      const extractGreen = color => {
        const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/)
        return match ? parseInt(match[2]) : 0
      }

      const green1 = extractGreen(packedDraw._valueToColor(1))
      const green2 = extractGreen(packedDraw._valueToColor(2))

      expect(green2).toBeGreaterThanOrEqual(green1)
    })
  })

  describe('_drawGrid', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should draw all cells', () => {
      packedDraw.redraw = jest.fn()
      packedDraw._drawGrid()
      expect(mockCtx.fillRect).toHaveBeenCalled()
      expect(mockCtx.strokeRect).toHaveBeenCalled()
    })

    it('should call _drawCell for each grid cell', () => {
      const _drawCell = jest.spyOn(packedDraw, '_drawCell')
      packedDraw._drawGrid()
      expect(_drawCell).toHaveBeenCalledTimes(100) // 10x10 grid
      _drawCell.mockRestore()
    })

    it('should not display text for small cells', () => {
      const draw = new PackedDraw('test-canvas', 5, 5, 15)
      draw.packed.set(0, 0, 2)
      jest.clearAllMocks()
      draw._drawGrid()
      expect(mockCtx.fillText).not.toHaveBeenCalled()
    })

    it('should display text for large cells with values', () => {
      packedDraw.packed.set(0, 0, 2)
      jest.clearAllMocks()
      packedDraw._drawGrid()
      expect(mockCtx.fillText).toHaveBeenCalled()
    })
  })

  describe('_drawHover', () => {
    it('should do nothing when no hover', () => {
      packedDraw.hoverLocation = null
      jest.clearAllMocks()
      packedDraw._drawHover()
      expect(mockCtx.fillRect).not.toHaveBeenCalled()
    })

    it('should draw hover cell with orange color', () => {
      packedDraw.hoverLocation = [3, 4]
      jest.clearAllMocks()
      packedDraw._drawHover()
      expect(mockCtx.fillRect).toHaveBeenCalled()
    })

    it('should draw at correct pixel location', () => {
      packedDraw.hoverLocation = [2, 1]
      jest.clearAllMocks()
      packedDraw._drawHover()
      // x=2, y=1, cellSize=25, offset=0
      expect(mockCtx.fillRect).toHaveBeenCalledWith(50, 25, 25, 25)
    })
  })

  describe('redraw', () => {
    it('should clear canvas', () => {
      packedDraw.redraw()
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 300, 300)
    })

    it('should call _drawGrid and _drawHover', () => {
      const _drawGrid = jest.spyOn(packedDraw, '_drawGrid')
      const _drawHover = jest.spyOn(packedDraw, '_drawHover')
      packedDraw.redraw()
      expect(_drawGrid).toHaveBeenCalled()
      expect(_drawHover).toHaveBeenCalled()
      _drawGrid.mockRestore()
      _drawHover.mockRestore()
    })
  })

  describe('mouse interactions', () => {
    it('should update hover on mousemove', () => {
      const listeners = {}
      mockCanvas.addEventListener.mockImplementation((event, handler) => {
        listeners[event] = handler
      })

      const draw = new PackedDraw('test-canvas')
      jest.clearAllMocks()

      const redraw = jest.spyOn(draw, 'redraw')
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 50,
        clientY: 50
      })
      listeners['mousemove'](moveEvent)

      expect(redraw).toHaveBeenCalled()
    })

    it('should clear hover on mouseleave', () => {
      const listeners = {}
      mockCanvas.addEventListener.mockImplementation((event, handler) => {
        listeners[event] = handler
      })

      const draw = new PackedDraw('test-canvas')
      draw.hoverLocation = [1, 1]

      const leaveEvent = new MouseEvent('mouseleave')
      listeners['mouseleave'](leaveEvent)

      expect(draw.hoverLocation).toBeNull()
    })

    it('should toggle cell on click', () => {
      const listeners = {}
      mockCanvas.addEventListener.mockImplementation((event, handler) => {
        listeners[event] = handler
      })

      const draw = new PackedDraw('test-canvas', 10, 10, 25)
      draw.packed.set(2, 2, 0)

      const clickEvent = new MouseEvent('click', {
        clientX: 50,
        clientY: 50
      })
      listeners['click'](clickEvent)

      expect(draw.packed.at(2, 2)).toBe(1)
    })
  })
})
