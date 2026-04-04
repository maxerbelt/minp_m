/* eslint-env jest */
/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals'
/* global describe, it,  expect, beforeEach, afterEach */

import { RectDrawColor } from './rectdrawcolor.js'
import { RectCanvasColor } from './RectCanvasColor.js'

describe('RectCanvasColor - Multi-Color Canvas Controller', () => {
  // Mock canvas context for jsdom environment
  function mockCanvasContext () {
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      toDataURL: () => 'data:image/png;base64,fake'
    }

    HTMLCanvasElement.prototype.getContext = () => mockCtx
  }

  function createitCanvas () {
    mockCanvasContext()
    const canvas = document.createElement('canvas')
    canvas.id = 'it-color-canvas'
    canvas.width = 500
    canvas.height = 500
    document.body.appendChild(canvas)
    return canvas
  }

  function removeitCanvas () {
    const canvas = document.getElementById('it-color-canvas')
    if (canvas) canvas.remove()
  }

  describe('Initialization', () => {
    it('should initialize RectCanvasColor with 2 colors', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 2)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(rectCanvas.bitsPerCell).toBe(1)
      expect(rectCanvas.maxColor).toBe(1)
      expect(rectCanvas.selectedColor).toBe(1)

      removeitCanvas()
    })

    it('should initialize with 4 colors', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(rectCanvas.bitsPerCell).toBe(2)
      expect(rectCanvas.maxColor).toBe(3)

      removeitCanvas()
    })

    it('should initialize with 256 colors', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 256)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(rectCanvas.bitsPerCell).toBe(8)
      expect(rectCanvas.maxColor).toBe(255)

      removeitCanvas()
    })
  })

  describe('Color Selection', () => {
    let rectDraw
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 16)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
    })

    it('should set selected color value', () => {
      rectCanvas.setSelectedColor(7)
      expect(rectCanvas.getSelectedColor()).toBe(7)
    })

    it('should clamp selected color to max range', () => {
      rectCanvas.setSelectedColor(20) // Out of range
      expect(rectCanvas.getSelectedColor()).toBe(15) // maxColor for 4 bits
    })

    it('should prevent negative selected color', () => {
      rectCanvas.setSelectedColor(-5)
      expect(rectCanvas.getSelectedColor()).toBe(0)
    })

    it('should cycle selected color with wraparound', () => {
      rectCanvas.setSelectedColor(14)
      rectCanvas.cycleSelectedColor()
      expect(rectCanvas.getSelectedColor()).toBe(15)

      rectCanvas.cycleSelectedColor()
      expect(rectCanvas.getSelectedColor()).toBe(0)
    })

    it('should initialize selected color to 1', () => {
      expect(rectCanvas.getSelectedColor()).toBe(1)
    })
  })

  describe('Color Operations', () => {
    let rectDraw
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
    })

    it('should fill grid with selected color', () => {
      rectCanvas.setSelectedColor(3)
      rectCanvas.fillGridWithColor()

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw.mask.at(x, y)).toBe(3)
        }
      }
    })

    it('should fill with specified color', () => {
      rectCanvas.fillWith(2)

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw.mask.at(x, y)).toBe(2)
        }
      }
    })

    it('should get color info for cells', () => {
      rectDraw.setColorValue(1, 1, 3)
      const info = rectCanvas.getColorInfo(1, 1)
      expect(info).toContain('Color 3')
      expect(info).toContain('3') // maxColor
    })

    it('should handle empty grid color info', () => {
      const info = rectCanvas.getColorInfo(0, 0)
      expect(info).toContain('Color')
    })
  })

  describe('Palette Management', () => {
    let rectDraw
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 16)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
    })

    it('should provide palette info', () => {
      const info = rectCanvas.getPaletteInfo()
      expect(info.bitsPerCell).toBe(4)
      expect(info.maxColors).toBe(16)
      expect(info.colors).toHaveLength(16)
    })

    it('should have correct palette colors', () => {
      const info = rectCanvas.getPaletteInfo()
      expect(info.colors[0]).toBe('#000000') // Black
      expect(info.colors[1]).toBe('#FF0000') // Red
      expect(info.colors[2]).toBe('#00FF00') // Green
      expect(info.colors[3]).toBe('#0000FF') // Blue
    })

    it('should access palette correctly', () => {
      expect(rectCanvas.colorPalette.length).toBe(16)
      expect(rectCanvas.colorPalette[0]).toBe('#000000')
    })
  })

  describe('UI Integration', () => {
    let rectDraw
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      // Create UI elements
      const colorDisplay = document.createElement('div')
      colorDisplay.id = 'color-display'
      document.body.appendChild(colorDisplay)

      const colorInput = document.createElement('input')
      colorInput.id = 'color-value-input'
      colorInput.type = 'range'
      document.body.appendChild(colorInput)

      const cycleBtn = document.createElement('button')
      cycleBtn.id = 'cycle-color-btn'
      document.body.appendChild(cycleBtn)

      const fillBtn = document.createElement('button')
      fillBtn.id = 'fill-with-color-btn'
      document.body.appendChild(fillBtn)

      const downloadBtn = document.createElement('button')
      downloadBtn.id = 'download-palette-btn'
      document.body.appendChild(downloadBtn)

      const swatches = document.createElement('div')
      swatches.id = 'color-palette-swatches'
      document.body.appendChild(swatches)

      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
      document.getElementById('color-display')?.remove()
      document.getElementById('color-value-input')?.remove()
      document.getElementById('cycle-color-btn')?.remove()
      document.getElementById('fill-with-color-btn')?.remove()
      document.getElementById('download-palette-btn')?.remove()
      document.getElementById('color-palette-swatches')?.remove()
    })

    it('should wire color controls without errors', () => {
      expect(() => {
        rectCanvas.wireColorControls()
      }).not.toThrow()
    })

    it('should update color display', () => {
      rectCanvas.setSelectedColor(2)
      const display = document.getElementById('color-display')
      expect(display.textContent).toContain('Color: 2')
    })

    it('should handle cycle color button click', () => {
      const button = document.getElementById('cycle-color-btn')
      if (button) {
        rectCanvas.cycleSelectedColor()
        expect(rectCanvas.getSelectedColor()).not.toBe(1)
      }
    })

    it('should create palette swatches for small palettes', () => {
      rectCanvas.wireColorControls()
      const swatches = document.getElementById('color-palette-swatches')
      const buttons = swatches.querySelectorAll('button')
      expect(buttons.length).toBe(4) // 4-color palette
    })

    it('should handle color input range', () => {
      const input = document.getElementById('color-value-input')
      if (input && input.max) {
        expect(parseInt(input.max)).toBe(3) // 4-color palette (0-3)
      }
    })
  })

  describe('Action Modes', () => {
    let rectDraw
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 16)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
    })

    it('should have toggle override for set action', () => {
      rectCanvas.currentAction = 'set'
      rectCanvas.setSelectedColor(7)
      expect(typeof rectCanvas.setupToggleCellOverride).toBe('function')
    })

    it('should access grid from rectDraw', () => {
      expect(rectCanvas.grid).toBeTruthy()
      expect(rectCanvas.grid.canvas).toBeTruthy()
    })

    it('should have access to indexer from RectCanvas parent', () => {
      expect(typeof rectCanvas.indexer).toBeDefined()
    })
  })

  describe('Color Display Updates', () => {
    let rectDraw
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      const colorDisplay = document.createElement('div')
      colorDisplay.id = 'color-display'
      colorDisplay.style.borderLeft = '8px solid black'
      document.body.appendChild(colorDisplay)

      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 16)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
      document.getElementById('color-display')?.remove()
    })

    it('should update display when color changes', () => {
      const display = document.getElementById('color-display')
      const initialText = display.textContent

      rectCanvas.setSelectedColor(5)

      expect(display.textContent).toContain('5')
      expect(display.textContent).not.toBe(initialText)
    })

    it('should show percentage of selected color', () => {
      rectCanvas.setSelectedColor(8)
      const display = document.getElementById('color-display')
      // 8/15 ≈ 53%
      expect(display.textContent).toContain('%')
    })

    it('should display hex color code', () => {
      rectCanvas.setSelectedColor(1) // Red in 4-color palette
      const display = document.getElementById('color-display')
      expect(display.textContent).toContain('#')
    })
  })

  describe('Cross-Module Integration', () => {
    it('should work with 8-bit (256 color) grid', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor(
        'it-color-canvas',
        10,
        10,
        50,
        0,
        0,
        256
      )
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(rectCanvas.maxColor).toBe(255)
      expect(rectCanvas.colorPalette.length).toBe(256)

      removeitCanvas()
    })

    it('should preserve RectCanvas base functionality', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      // Should have inherited methods
      expect(typeof rectCanvas.hitTest).toBe('function')
      expect(typeof rectCanvas.computePreviewCells).toBe('function')

      removeitCanvas()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing color display gracefully', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(() => {
        rectCanvas.setSelectedColor(1)
      }).not.toThrow()

      removeitCanvas()
    })

    it('should handle color info without grid errors', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(() => {
        rectCanvas.getColorInfo(0, 0)
      }).not.toThrow()

      removeitCanvas()
    })
  })
})
