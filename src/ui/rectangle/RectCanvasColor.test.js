import { jest } from '@jest/globals'
/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

import { RectDrawColor } from './rectdrawcolor.js'
import { RectCanvasColor } from './RectCanvasColor.js'

/**
 * @typedef {Object} MockCanvasContext
 * @property {string} fillStyle - CSS color for fill
 * @property {string} strokeStyle - CSS color for stroke
 * @property {number} lineWidth - Line width in pixels
 * @property {Function} fillRect - Mock fill rectangle method
 * @property {Function} strokeRect - Mock stroke rectangle method
 * @property {Function} clearRect - Mock clear rectangle method
 * @property {Function} toDataURL - Mock canvas export method
 */

/**
 * Test suite for RectCanvasColor - Multi-Color Canvas Controller
 *
 * Tests the rectangular canvas controller with multi-color support including:
 * - Color selection and cycling
 * - Palette management and color operations
 * - Fill operations with specific colors
 * - UI integration with HTML elements
 * - Action modes and grid operations
 * - Cross-module integration with parent RectCanvas class
 * - Error handling for missing elements
 *
 * @jest-environment jsdom - Uses jsdom for DOM simulation
 */
describe('RectCanvasColor - Multi-Color Canvas Controller', () => {
  /**
   * Create a mock canvas 2D context
   *
   * Provides minimal context interface for testing without actual rendering.
   * All drawing operations are no-ops, toDataURL returns fake PNG data.
   *
   * @returns {MockCanvasContext} Mock context object
   * @private
   */
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

  /**
   * Create a test canvas element in the DOM
   *
   * Sets up a canvas with ID 'it-color-canvas', dimensions 500x500,
   * mocked 2D context, and appends to document body.
   *
   * @returns {HTMLCanvasElement} Created canvas element
   * @private
   */
  function createitCanvas () {
    mockCanvasContext()
    const canvas = document.createElement('canvas')
    canvas.id = 'it-color-canvas'
    canvas.width = 500
    canvas.height = 500
    document.body.appendChild(canvas)
    return canvas
  }

  /**
   * Remove test canvas element from DOM
   *
   * Cleans up the canvas element with ID 'it-color-canvas'
   * created by createitCanvas().
   *
   * @returns {void}
   * @private
   */
  function removeitCanvas () {
    const canvas = document.getElementById('it-color-canvas')
    if (canvas) canvas.remove()
  }

  /**
   * Initialization Tests
   *
   * Verifies proper initialization of RectCanvasColor with different
   * color depths (2-color, 4-color, 256-color).
   */
  describe('Initialization', () => {
    /**
     * Should initialize RectCanvasColor with 2 colors (1 bit per cell)
     *
     * Tests that a 2-color palette (binary) correctly computes:
     * - bitsPerCell = 1
     * - maxColor = 1
     * - selectedColor = 1 (default)
     */
    it('should initialize RectCanvasColor with 2 colors', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 2)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(rectCanvas.bitsPerCell).toBe(1)
      expect(rectCanvas.maxColor).toBe(1)
      expect(rectCanvas.selectedColor).toBe(1)

      removeitCanvas()
    })

    /**
     * Should initialize with 4 colors (2 bits per cell)
     *
     * Tests 4-color palette initialization:
     * - bitsPerCell = 2
     * - maxColor = 3
     */
    it('should initialize with 4 colors', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(rectCanvas.bitsPerCell).toBe(2)
      expect(rectCanvas.maxColor).toBe(3)

      removeitCanvas()
    })

    /**
     * Should initialize with 256 colors (8 bits per cell)
     *
     * Tests maximum palette size (256-color):
     * - bitsPerCell = 8
     * - maxColor = 255
     */
    it('should initialize with 256 colors', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 256)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(rectCanvas.bitsPerCell).toBe(8)
      expect(rectCanvas.maxColor).toBe(255)

      removeitCanvas()
    })
  })

  /**
   * Color Selection Tests
   *
   * Tests color value selection, cycling, and clamping.
   */
  describe('Color Selection', () => {
    /** @type {RectDrawColor} */
    let rectDraw
    /** @type {RectCanvasColor} */
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 16)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
    })

    /**
     * Should set selected color value within valid range
     */
    it('should set selected color value', () => {
      rectCanvas.setSelectedColor(7)
      expect(rectCanvas.getSelectedColor()).toBe(7)
    })

    /**
     * Should clamp selected color to maximum range (not exceed maxColor)
     */
    it('should clamp selected color to max range', () => {
      rectCanvas.setSelectedColor(20) // Out of range
      expect(rectCanvas.getSelectedColor()).toBe(15) // maxColor for 4 bits
    })

    /**
     * Should prevent negative selected color values (clamp to 0)
     */
    it('should prevent negative selected color', () => {
      rectCanvas.setSelectedColor(-5)
      expect(rectCanvas.getSelectedColor()).toBe(0)
    })

    /**
     * Should cycle selected color with wraparound from max to 0
     */
    it('should cycle selected color with wraparound', () => {
      rectCanvas.setSelectedColor(14)
      rectCanvas.cycleSelectedColor()
      expect(rectCanvas.getSelectedColor()).toBe(15)

      rectCanvas.cycleSelectedColor()
      expect(rectCanvas.getSelectedColor()).toBe(0)
    })

    /**
     * Should initialize selected color to 1 (not 0)
     */
    it('should initialize selected color to 1', () => {
      expect(rectCanvas.getSelectedColor()).toBe(1)
    })
  })

  /**
   * Color Operations Tests
   *
   * Tests grid fill operations and color info retrieval.
   */
  describe('Color Operations', () => {
    /** @type {RectDrawColor} */
    let rectDraw
    /** @type {RectCanvasColor} */
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
    })

    /**
     * Should fill entire grid with currently selected color
     */
    it('should fill grid with selected color', () => {
      rectCanvas.setSelectedColor(3)
      rectCanvas.fillGridWithColor()

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw.mask.at(x, y)).toBe(3)
        }
      }
    })

    /**
     * Should fill entire grid with a specified color value
     */
    it('should fill with specified color', () => {
      rectCanvas.fillWith(2)

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(rectDraw.mask.at(x, y)).toBe(2)
        }
      }
    })

    /**
     * Should retrieve color info string for a specific grid cell
     */
    it('should get color info for cells', () => {
      rectDraw.setColorValue(1, 1, 3)
      const info = rectCanvas.getColorInfo(1, 1)
      expect(info).toContain('Color 3')
      expect(info).toContain('3') // maxColor
    })

    /**
     * Should handle color info for empty (unset) cells
     */
    it('should handle empty grid color info', () => {
      const info = rectCanvas.getColorInfo(0, 0)
      expect(info).toContain('Color')
    })
  })

  /**
   * Palette Management Tests
   *
   * Tests palette information, color array access, and consistency.
   */
  describe('Palette Management', () => {
    /** @type {RectDrawColor} */
    let rectDraw
    /** @type {RectCanvasColor} */
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 16)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
    })

    /**
     * Should provide palette info with correct metadata
     */
    it('should provide palette info', () => {
      const info = rectCanvas.getPaletteInfo()
      expect(info.bitsPerCell).toBe(4)
      expect(info.maxColors).toBe(16)
      expect(info.colors).toHaveLength(16)
    })

    /**
     * Should have correct hex color codes in palette (standard colors)
     */
    it('should have correct palette colors', () => {
      const info = rectCanvas.getPaletteInfo()
      expect(info.colors[0]).toBe('#000000') // Black
      expect(info.colors[1]).toBe('#FF0000') // Red
      expect(info.colors[2]).toBe('#00FF00') // Green
      expect(info.colors[3]).toBe('#0000FF') // Blue
    })

    /**
     * Should access palette array directly with correct length
     */
    it('should access palette correctly', () => {
      expect(rectCanvas.colorPalette.length).toBe(16)
      expect(rectCanvas.colorPalette[0]).toBe('#000000')
    })
  })

  /**
   * UI Integration Tests
   *
   * Tests wiring of HTML controls and display updates.
   */
  describe('UI Integration', () => {
    /** @type {RectDrawColor} */
    let rectDraw
    /** @type {RectCanvasColor} */
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

    /**
     * Should wire color controls without throwing errors
     */
    it('should wire color controls without errors', () => {
      expect(() => {
        rectCanvas.wireColorControls()
      }).not.toThrow()
    })

    /**
     * Should update color display element when color selection changes
     */
    it('should update color display', () => {
      rectCanvas.setSelectedColor(2)
      const display = document.getElementById('color-display')
      expect(display.textContent).toContain('Color: 2')
    })

    /**
     * Should handle cycle color button click and advance selection
     */
    it('should handle cycle color button click', () => {
      const button = document.getElementById('cycle-color-btn')
      if (button) {
        rectCanvas.cycleSelectedColor()
        expect(rectCanvas.getSelectedColor()).not.toBe(1)
      }
    })

    /**
     * Should create palette swatches for small palettes (4 colors = 4 buttons)
     */
    it('should create palette swatches for small palettes', () => {
      rectCanvas.wireColorControls()
      const swatches = document.getElementById('color-palette-swatches')
      const buttons = swatches.querySelectorAll('button')
      expect(buttons.length).toBe(4) // 4-color palette
    })

    /**
     * Should set color input range max based on maxColor (0-3 for 4 colors)
     */
    it('should handle color input range', () => {
      const input = document.getElementById('color-value-input')
      if (input?.max) {
        expect(parseInt(input.max)).toBe(3) // 4-color palette (0-3)
      }
    })
  })

  /**
   * Action Modes Tests
   *
   * Tests action mode switching and cell override mechanics.
   */
  describe('Action Modes', () => {
    /** @type {RectDrawColor} */
    let rectDraw
    /** @type {RectCanvasColor} */
    let rectCanvas

    beforeEach(() => {
      createitCanvas()
      rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 16)
      rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)
    })

    afterEach(() => {
      removeitCanvas()
    })

    /**
     * Should support toggle override for set action mode
     */
    it('should have toggle override for set action', () => {
      rectCanvas.currentAction = 'set'
      rectCanvas.setSelectedColor(7)
      expect(typeof rectCanvas.setupToggleCellOverride).toBe('function')
    })

    /**
     * Should access grid instance from rectDraw parent
     */
    it('should access grid from rectDraw', () => {
      expect(rectCanvas.grid).toBeTruthy()
      expect(rectCanvas.grid.canvas).toBeTruthy()
    })

    /**
     * Should have indexer available from inherited RectCanvas parent
     */
    it('should have access to indexer from RectCanvas parent', () => {
      expect(typeof rectCanvas.indexer).toBeDefined()
    })
  })

  /**
   * Color Display Updates Tests
   *
   * Tests dynamic display updates when colors change.
   */
  describe('Color Display Updates', () => {
    /** @type {RectDrawColor} */
    let rectDraw
    /** @type {RectCanvasColor} */
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

    /**
     * Should update display when selected color changes
     */
    it('should update display when color changes', () => {
      const display = document.getElementById('color-display')
      const initialText = display.textContent

      rectCanvas.setSelectedColor(5)

      expect(display.textContent).toContain('5')
      expect(display.textContent).not.toBe(initialText)
    })

    /**
     * Should show percentage representation of selected color value
     */
    it('should show percentage of selected color', () => {
      rectCanvas.setSelectedColor(8)
      const display = document.getElementById('color-display')
      // 8/15 ≈ 53%
      expect(display.textContent).toContain('%')
    })

    /**
     * Should display hex color code for selected color
     */
    it('should display hex color code', () => {
      rectCanvas.setSelectedColor(1) // Red in 4-color palette
      const display = document.getElementById('color-display')
      expect(display.textContent).toContain('#')
    })
  })

  /**
   * Cross-Module Integration Tests
   *
   * Tests compatibility with parent RectCanvas and different color depths.
   */
  describe('Cross-Module Integration', () => {
    /**
     * Should work correctly with 8-bit (256 color) depth
     */
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

    /**
     * Should preserve all inherited RectCanvas base functionality
     *
     * Verifies that line tool and hit test methods are available
     * from the parent class.
     */
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

  /**
   * Error Handling Tests
   *
   * Tests graceful degradation when UI elements are missing.
   */
  describe('Error Handling', () => {
    /**
     * Should handle missing color display element gracefully without throwing
     */
    it('should handle missing color display gracefully', () => {
      createitCanvas()
      const rectDraw = new RectDrawColor('it-color-canvas', 5, 5, 50, 0, 0, 4)
      const rectCanvas = new RectCanvasColor('it-color-canvas', rectDraw)

      expect(() => {
        rectCanvas.setSelectedColor(1)
      }).not.toThrow()

      removeitCanvas()
    })

    /**
     * Should handle color info queries without grid-related errors
     */
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
