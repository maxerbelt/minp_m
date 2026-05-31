/**
 * @fileoverview Hexagonal grid with packed color support (2 colors per cell).
 * Provides drawing, canvas control, and morphology operations for colored hexagonal grids.
 *
 * Color mapping:
 * - 0: Blue (empty)
 * - 1: Green
 * - 2: Yellow
 * - 3: Khaki
 *
 * @module hexcolor
 */

/**
 * @typedef {Object} MorphologyButtonConfig
 * @property {HTMLElement} [dilate] - The dilate button element for morphology operations
 * @property {HTMLElement} [erode] - The erode button element for morphology operations
 * @property {HTMLElement} [cross] - The cross morphology button element for morphology operations
 */

/**
 * @typedef {Object} HexColorCanvasState
 * @property {string|null} currentColor - The currently selected color for drawing operations
 * @property {*} [canvasState] - Additional canvas state properties from the canvas controller
 */

import { ColorPackedHexDraw } from './ui/hexagon/colorpackedhexdraw.js'
import { ColorPackedHexCanvas } from './ui/hexagon/ColorPackedHexCanvas.js'
import {
  createCanvasInitializer,
  updateButtons as updateButtonsCommon,
  setMorphologyButtons as setMorphologyButtonsCommon,
  checkMorphology as checkMorphologyCommon,
  getCanvasState,
  setCanvasState
} from './ui/canvasCommon.js'

/**
 * ColorPackedHexDraw instance for drawing colored hexagonal grids.
 *
 * Manages the rendering and manipulation of a hexagonal grid with packed color support.
 * Configured with:
 * - Canvas ID: 'hexcolor-c'
 * - Orientation: 6 (pointy-top)
 * - Dimensions: 300x300 pixels
 * - Cell size: 25 pixels
 * - Color depth: 2 colors per cell
 *
 * @type {ColorPackedHexDraw}
 * @const
 */
const grid = new ColorPackedHexDraw('hexcolor-c', 6, 300, 300, 25, 2)

/**
 * Canvas controller instance for managing user interactions and rendering.
 *
 * Initialized lazily on module load if DOM APIs are available in the current environment.
 * Handles all canvas-based operations including drawing, morphology operations, and
 * button state management. Returns null in non-DOM environments (e.g., Node.js tests).
 *
 * @type {ColorPackedHexCanvas|null}
 * @const
 */
const hexColorCanvas = (() => {
  if (globalThis.window && globalThis.document) {
    const initializeHexColorCanvas = createCanvasInitializer(
      'hexcolor-c',
      ColorPackedHexCanvas,
      grid
    )
    return initializeHexColorCanvas()
  }
  return null
})()

// ============================================================================
// CONCEPT: DELEGATION TO HEXCANVAS FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Update button states by delegating to the canvas instance.
 *
 * Refreshes the enabled/disabled state of all UI control buttons based on the current
 * canvas state and available operations. Provides backward compatibility for button UI updates.
 *
 * @function
 * @returns {void}
 * @throws {Error} If hexColorCanvas is null (DOM not available)
 * @see updateButtonsCommon
 * @example
 * updateButtons() // Refreshes all button states
 */
function updateButtons () {
  updateButtonsCommon(hexColorCanvas)
}

/**
 * Set morphology operation buttons (dilate, erode, cross) on the canvas instance.
 *
 * Configures the HTML button elements that control morphological operations (dilation,
 * erosion, and cross operations). Provides backward compatibility for morphology button
 * configuration. Updates the canvas instance to enable proper button event handling.
 *
 * @function
 * @param {MorphologyButtonConfig} options - Morphology button configuration object
 * @param {HTMLElement} [options.dilate] - The dilate button element for morphological dilation
 * @param {HTMLElement} [options.erode] - The erode button element for morphological erosion
 * @param {HTMLElement} [options.cross] - The cross morphology button element for cross operations
 * @returns {void}
 * @throws {Error} If hexColorCanvas is null (DOM not available)
 * @see setMorphologyButtonsCommon
 * @example
 * setMorphologyButtons({
 *   dilate: document.getElementById('dilate-btn'),
 *   erode: document.getElementById('erode-btn'),
 *   cross: document.getElementById('cross-btn')
 * })
 */
function setMorphologyButtons ({ dilate, erode, cross }) {
  setMorphologyButtonsCommon(hexColorCanvas, { dilate, erode, cross })
}

/**
 * Check if a morphology operation is valid or enabled on the canvas.
 *
 * Validates whether a specified morphological operation can be performed on the current
 * grid state. Delegates to the canvas instance for operation validation.
 *
 * @function
 * @param {string} op - The morphology operation identifier ('dilate'|'erode'|'cross')
 * @returns {boolean} True if the operation is valid and enabled on the current canvas state
 * @see checkMorphologyCommon
 * @example
 * if (checkMorphology('dilate')) {
 *   // Perform dilation operation
 * }
 */
function checkMorphology (op) {
  return checkMorphologyCommon(hexColorCanvas, op)
}

// ============================================================================
// CONCEPT: LINE TOOL HANDLING
// ============================================================================

/**
 * Current selected color for drawing operations.
 *
 * Stores the color index or color identifier currently selected for use in grid drawing
 * and manipulation operations. Null indicates no color is currently selected.
 *
 * Valid color values: '0'|'1'|'2'|'3' or color names ('blue'|'green'|'yellow'|'khaki')
 *
 * @type {string|null}
 * @default null
 */
let currentColor = null

/**
 * Get current canvas state for tests and state persistence.
 *
 * Retrieves the complete state of the hexcolor canvas including the current color selection,
 * canvas rendering state, and all configuration. Useful for testing, state persistence,
 * and debugging. This function is primarily intended for test support and external tools.
 *
 * @function
 * @returns {HexColorCanvasState} Canvas state object containing:
 *   - currentColor: currently selected color for drawing
 *   - canvasState: additional state from the canvas controller
 * @see getCanvasState
 * @example
 * const state = getHexColorCanvasState()
 * console.log(state.currentColor) // e.g., '1' or null
 */
function getHexColorCanvasState () {
  return getCanvasState(hexColorCanvas, {
    currentColor
  })
}

/**
 * Set canvas state for tests and state restoration.
 *
 * Restores canvas state from a previously saved state object. Updates the currentColor
 * variable and delegates canvas state restoration to the canvas controller. Primarily
 * intended for testing and state management purposes.
 *
 * @function
 * @param {HexColorCanvasState} state - The state object to restore
 * @param {string|null} [state.currentColor] - The color to set as current selection
 * @param {*} [state.canvasState] - Additional canvas state to restore
 * @returns {void}
 * @throws {Error} If state parameter is invalid or hexColorCanvas is null
 * @see setCanvasState
 * @example
 * const savedState = getHexColorCanvasState()
 * // ... later, restore it
 * setHexColorCanvasState(savedState)
 */
function setHexColorCanvasState (state) {
  setCanvasState(
    hexColorCanvas,
    {
      currentColor
    },
    state
  )
}

/**
 * Module exports for hexcolor grid functionality.
 *
 * Provides access to the hexagonal grid drawing utility, canvas controller, and
 * control functions for button management, state persistence, and morphological operations.
 * Exported for use in tests, external canvas control, and other modules.
 *
 * @exports hexcolor
 * @namespace hexcolor
 */

/**
 * @typedef {Object} HexcolorExports
 * @property {ColorPackedHexDraw} grid - The colored hexagonal grid drawing utility with render and manipulation methods
 * @property {ColorPackedHexCanvas|null} hexColorCanvas - The canvas controller instance; null if DOM not available (e.g., in Node.js)
 * @property {Function} updateButtons - Update canvas button states based on current canvas state
 * @property {Function} checkMorphology - Check morphology operation validity and state
 * @property {Function} setMorphologyButtons - Configure morphology buttons (dilate, erode, cross)
 * @property {Function} getHexColorCanvasState - Get current canvas state for persistence or testing
 * @property {Function} setHexColorCanvasState - Restore canvas state from a saved state object
 */

export {
  grid,
  hexColorCanvas,
  updateButtons,
  checkMorphology,
  setMorphologyButtons,
  getHexColorCanvasState,
  setHexColorCanvasState
}
