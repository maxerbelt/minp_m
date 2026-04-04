/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach, jest */

import { RectDraw } from './rectdraw.js'
import { jest } from '@jest/globals'

describe('RectDraw', () => {
  let rectDraw
  let mockCanvas
  let mockCtx

  beforeEach(() => {
    // Mock canvas element
    mockCtx = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
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

    rectDraw = new RectDraw('test-canvas', 10, 10, 25, 0, 0)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with default parameters', () => {
      const draw = new RectDraw('test-canvas')
      expect(draw.width).toBe(10)
      expect(draw.height).toBe(10)
      expect(draw.cellSize).toBe(25)
      expect(draw.offsetX).toBe(0)
      expect(draw.offsetY).toBe(0)
    })

    it('should create instance with custom parameters', () => {
      const draw = new RectDraw('test-canvas', 8, 12, 30, 50, 100)
      expect(draw.width).toBe(8)
      expect(draw.height).toBe(12)
      expect(draw.cellSize).toBe(30)
      expect(draw.offsetX).toBe(50)
      expect(draw.offsetY).toBe(100)
    })

    it('should initialize Mask instance', () => {
      expect(rectDraw.mask).toBeDefined()
      expect(rectDraw.mask.width).toBe(10)
      expect(rectDraw.mask.height).toBe(10)
    })

    it('should initialize canvas and context', () => {
      expect(rectDraw.canvas).toBe(mockCanvas)
      expect(rectDraw.ctx).toBe(mockCtx)
    })

    it('should initialize hoverLocation to null', () => {
      expect(rectDraw.hoverLocation).toBeNull()
    })

    it('should throw error if canvas element not found', () => {
      document.getElementById = jest.fn(() => null)
      expect(() => {
        new RectDraw('nonexistent-canvas')
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

  describe('setBitsFromCoords', () => {
    it('should set cells from array of [x, y] coordinates', () => {
      const coords = [
        [0, 0],
        [1, 1],
        [2, 2]
      ]
      rectDraw.redraw = jest.fn()
      rectDraw.setBitsFromCoords(coords)
      expect(rectDraw.mask.at(0, 0)).toBe(1)
      expect(rectDraw.mask.at(1, 1)).toBe(1)
      expect(rectDraw.mask.at(2, 2)).toBe(1)
    })

    it('should trigger redraw after setting coordinates', () => {
      rectDraw.redraw = jest.fn()
      rectDraw.setBitsFromCoords([[0, 0]])
      expect(rectDraw.redraw).toHaveBeenCalled()
    })

    it('should handle empty coordinate array', () => {
      rectDraw.redraw = jest.fn()
      rectDraw.setBitsFromCoords([])
      expect(rectDraw.redraw).toHaveBeenCalled()
      expect(rectDraw.mask.bits).toBe(0n)
    })

    it('should skip invalid coordinates', () => {
      const coords = [
        [0, 0],
        [10, 5],
        [5, 10],
        [5, 5]
      ]
      rectDraw.setBitsFromCoords(coords)
      expect(rectDraw.mask.at(0, 0)).toBe(1)
      expect(rectDraw.mask.at(5, 5)).toBe(1)
      expect(rectDraw.mask.at(10, 5)).toBe(0)
      expect(rectDraw.mask.at(5, 10)).toBe(0)
    })

    it('should overwrite existing bits', () => {
      rectDraw.mask.set(0, 0, 1)
      rectDraw.setBitsFromCoords([[1, 1]])
      expect(rectDraw.mask.at(0, 0)).toBe(0)
      expect(rectDraw.mask.at(1, 1)).toBe(1)
    })
  })

  describe('clear', () => {
    beforeEach(() => {
      rectDraw.mask.set(0, 0, 1)
      rectDraw.mask.set(5, 5, 1)
      rectDraw.mask.set(9, 9, 1)
    })

    it('should clear all cells', () => {
      rectDraw.redraw = jest.fn()
      rectDraw.clear()
      expect(rectDraw.mask.at(0, 0)).toBe(0)
      expect(rectDraw.mask.at(5, 5)).toBe(0)
      expect(rectDraw.mask.at(9, 9)).toBe(0)
    })

    it('should trigger redraw after clearing', () => {
      rectDraw.redraw = jest.fn()
      rectDraw.clear()
      expect(rectDraw.redraw).toHaveBeenCalled()
    })

    it('should empty bits completely', () => {
      rectDraw.clear()
      expect(rectDraw.mask.bits).toBe(0n)
    })
  })

  describe('toggleCell', () => {
    it('should set cell to 1 when currently 0', () => {
      rectDraw.mask.set(2, 2, 0)
      rectDraw.redraw = jest.fn()
      rectDraw.toggleCell([2, 2])
      expect(rectDraw.mask.at(2, 2)).toBe(1)
    })

    it('should set cell to 0 when currently 1', () => {
      rectDraw.mask.set(3, 3, 1)
      rectDraw.redraw = jest.fn()
      rectDraw.toggleCell([3, 3])
      expect(rectDraw.mask.at(3, 3)).toBe(0)
    })

    it('should toggle between 0 and 1 repeatedly', () => {
      rectDraw.mask.set(1, 1, 0)
      rectDraw.toggleCell([1, 1])
      expect(rectDraw.mask.at(1, 1)).toBe(1)
      rectDraw.toggleCell([1, 1])
      expect(rectDraw.mask.at(1, 1)).toBe(0)
      rectDraw.toggleCell([1, 1])
      expect(rectDraw.mask.at(1, 1)).toBe(1)
    })

    it('should trigger redraw after toggling', () => {
      rectDraw.redraw = jest.fn()
      rectDraw.toggleCell([0, 0])
      expect(rectDraw.redraw).toHaveBeenCalled()
    })

    it('should skip null location without redraw', () => {
      rectDraw.redraw = jest.fn()
      rectDraw.toggleCell(null)
      expect(rectDraw.redraw).not.toHaveBeenCalled()
    })
  })

  describe('_hitTest', () => {
    it('should identify cell at pixel coordinate', () => {
      // cellSize=25, so pixel 100-124 is column 4
      const result = rectDraw._hitTest(100, 50)
      expect(result).toEqual([4, 2])
    })

    it('should handle offset coordinates', () => {
      const draw = new RectDraw('test-canvas', 10, 10, 25, 50, 50)
      // (100 - 50) / 25 = 2, (75 - 50) / 25 = 1
      const result = draw._hitTest(100, 75)
      expect(result).toEqual([2, 1])
    })

    it('should return null for out-of-bounds pixel on right', () => {
      const result = rectDraw._hitTest(300, 50)
      expect(result).toBeNull()
    })

    it('should return null for out-of-bounds pixel on bottom', () => {
      const result = rectDraw._hitTest(50, 300)
      expect(result).toBeNull()
    })

    it('should return null for negative pixel coordinates', () => {
      const result = rectDraw._hitTest(-10, 50)
      expect(result).toBeNull()
    })

    it('should identify top-left cell', () => {
      const result = rectDraw._hitTest(0, 0)
      expect(result).toEqual([0, 0])
    })

    it('should identify bottom-right valid cell', () => {
      // 9 * 25 = 225, so pixel 225-249 is column/row 9
      const result = rectDraw._hitTest(225, 225)
      expect(result).toEqual([9, 9])
    })

    it('should handle fractional pixel coordinates', () => {
      const result = rectDraw._hitTest(37.5, 62.5)
      expect(result).toEqual([1, 2])
    })
  })

  describe('_drawGrid', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should draw all cells', () => {
      rectDraw._drawGrid()
      expect(mockCtx.fillRect).toHaveBeenCalled()
      expect(mockCtx.strokeRect).toHaveBeenCalled()
    })

    it('should call _drawCell for each grid cell', () => {
      const _drawCell = jest.spyOn(rectDraw, '_drawCell')
      rectDraw._drawGrid()
      expect(_drawCell).toHaveBeenCalledTimes(100) // 10x10 grid
      _drawCell.mockRestore()
    })

    it('should apply correct colors based on cell state', () => {
      rectDraw.mask.set(0, 0, 1)
      rectDraw.mask.set(1, 1, 0)
      const _drawCell = jest.spyOn(rectDraw, '_drawCell')
      rectDraw._drawGrid()
      // Verify set cell gets green color
      expect(_drawCell).toHaveBeenCalledWith(0, 0, '#4caf50', '#333')
      // Verify unset cell gets blue color
      expect(_drawCell).toHaveBeenCalledWith(1, 1, '#2196F3', '#333')
      _drawCell.mockRestore()
    })

    it('should draw blue for unset cells', () => {
      jest.clearAllMocks()
      rectDraw._drawGrid()
      // The unset cells should use blue color
      expect(mockCtx.fillRect).toHaveBeenCalled()
    })

    it('should use correct pixel coordinates', () => {
      rectDraw.mask.set(1, 2, 1)
      jest.clearAllMocks()
      rectDraw._drawGrid()
      // Cell [1, 2] should be at pixel [25, 50] with cellSize 25
      expect(mockCtx.fillRect).toHaveBeenCalledWith(25, 50, 25, 25)
    })
  })

  describe('_drawCell', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should fill and stroke a cell', () => {
      rectDraw._drawCell(2, 2, '#4caf50')
      expect(mockCtx.fillRect).toHaveBeenCalledWith(50, 50, 25, 25)
      expect(mockCtx.strokeRect).toHaveBeenCalledWith(50, 50, 25, 25)
    })

    it('should use specified color', () => {
      rectDraw._drawCell(1, 1, '#FF9800')
      expect(mockCtx.fillStyle).toBe('#FF9800')
    })

    it('should use specified stroke color', () => {
      rectDraw._drawCell(1, 1, '#4caf50', '#000')
      expect(mockCtx.strokeStyle).toBe('#000')
    })

    it('should use default stroke color', () => {
      rectDraw._drawCell(0, 0, '#4caf50')
      expect(mockCtx.strokeStyle).toBe('#333')
    })

    it('should handle offsets correctly', () => {
      const draw = new RectDraw('test-canvas', 10, 10, 25, 50, 100)
      draw._drawCell(2, 2, '#4caf50')
      // (2 * 25 + 50, 2 * 25 + 100) = (100, 150)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(100, 150, 25, 25)
    })

    it('should handle different cell sizes', () => {
      const draw = new RectDraw('test-canvas', 10, 10, 30)
      draw._drawCell(1, 1, '#4caf50')
      expect(mockCtx.fillRect).toHaveBeenCalledWith(30, 30, 30, 30)
    })
  })

  describe('_drawHover', () => {
    it('should do nothing when no hover', () => {
      rectDraw.hoverLocation = null
      jest.clearAllMocks()
      rectDraw._drawHover()
      expect(mockCtx.fillRect).not.toHaveBeenCalled()
    })

    it('should draw hover cell with orange color', () => {
      rectDraw.hoverLocation = [3, 4]
      jest.clearAllMocks()
      rectDraw._drawHover()
      expect(mockCtx.fillRect).toHaveBeenCalled()
    })

    it('should draw at correct pixel location', () => {
      rectDraw.hoverLocation = [2, 1]
      jest.clearAllMocks()
      rectDraw._drawHover()
      // x=2, y=1, cellSize=25, offset=0
      expect(mockCtx.fillRect).toHaveBeenCalledWith(50, 25, 25, 25)
    })

    it('should use orange color for hover', () => {
      rectDraw.hoverLocation = [0, 0]
      jest.clearAllMocks()
      rectDraw._drawHover()
      expect(mockCtx.fillStyle).toBe('#FF9800')
    })

    it('should handle multiple hovers (last one wins)', () => {
      rectDraw.hoverLocation = [5, 5]
      jest.clearAllMocks()
      rectDraw._drawHover()
      expect(mockCtx.fillRect).toHaveBeenCalledWith(125, 125, 25, 25)
    })
  })

  describe('redraw', () => {
    it('should clear canvas', () => {
      rectDraw.redraw()
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 300, 300)
    })

    it('should call _drawGrid and _drawHover', () => {
      const _drawGrid = jest.spyOn(rectDraw, '_drawGrid')
      const _drawHover = jest.spyOn(rectDraw, '_drawHover')
      rectDraw.redraw()
      expect(_drawGrid).toHaveBeenCalled()
      expect(_drawHover).toHaveBeenCalled()
      _drawGrid.mockRestore()
      _drawHover.mockRestore()
    })

    it('should redraw in correct order: grid then hover', () => {
      const callOrder = []
      const _drawGrid = jest
        .spyOn(rectDraw, '_drawGrid')
        .mockImplementation(() => callOrder.push('grid'))
      const _drawHover = jest
        .spyOn(rectDraw, '_drawHover')
        .mockImplementation(() => callOrder.push('hover'))

      rectDraw.redraw()

      expect(callOrder).toEqual(['grid', 'hover'])
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

      const draw = new RectDraw('test-canvas')
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

      const draw = new RectDraw('test-canvas')
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

      const draw = new RectDraw('test-canvas', 10, 10, 25)
      draw.mask.set(2, 2, 0)

      const clickEvent = new MouseEvent('click', {
        clientX: 50,
        clientY: 50
      })
      listeners['click'](clickEvent)

      expect(draw.mask.at(2, 2)).toBe(1)
    })
  })

  describe('integration', () => {
    it('should handle complete workflow: set, toggle, clear', () => {
      // Set some cells
      rectDraw.setBitsFromCoords([
        [1, 1],
        [2, 2],
        [3, 3]
      ])
      expect(rectDraw.mask.at(1, 1)).toBe(1)
      expect(rectDraw.mask.at(2, 2)).toBe(1)

      // Toggle one
      rectDraw.toggleCell([1, 1])
      expect(rectDraw.mask.at(1, 1)).toBe(0)
      expect(rectDraw.mask.at(2, 2)).toBe(1)

      // Clear all
      rectDraw.clear()
      expect(rectDraw.mask.at(1, 1)).toBe(0)
      expect(rectDraw.mask.at(2, 2)).toBe(0)
      expect(rectDraw.mask.at(3, 3)).toBe(0)
    })

    it('should maintain consistency in mask and display', () => {
      rectDraw.setBitsFromCoords([
        [0, 0],
        [5, 5],
        [9, 9]
      ])
      const coords = rectDraw.mask.toCoords
      expect(coords).toHaveLength(3)
      expect(coords.some(c => c[0] === 0 && c[1] === 0)).toBe(true)
      expect(coords.some(c => c[0] === 5 && c[1] === 5)).toBe(true)
      expect(coords.some(c => c[0] === 9 && c[1] === 9)).toBe(true)
    })
  })
})
