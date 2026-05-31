/**
 * @fileoverview Hexagonal Grid UI Module
 * Manages hexagonal grid canvas creation, rendering, and interaction.
 * Provides delegation functions for morphological operations and line drawing tools.
 *
 * This module coordinates between HexDraw (rendering) and HexCanvas (interaction),
 * offering high-level control functions for common UI operations.
 *
 * @module hex
 */

import { HexDraw } from './ui/hexagon/hexDraw.js'
import { HexCanvas } from './ui/hexagon/HexCanvas.js'
import {
  createCanvasInitializer,
  updateButtons as updateButtonsCommon,
  setMorphologyButtons as setMorphologyButtonsCommon,
  checkMorphology as checkMorphologyCommon,
  getCanvasState,
  setCanvasState
} from './ui/canvasCommon.js'

/**
 * Morphology button configuration object.
 * Controls which morphological operations are enabled.
 *
 * @typedef {Object} MorphologyButtonConfig
 * @property {HTMLElement} [dilate] - The dilate button element for morphological dilation
 * @property {HTMLElement} [erode] - The erode button element for morphological erosion
 * @property {HTMLElement} [cross] - The cross morphology button element for cross operations
 */

/**
 * Canvas state object for persistence and testing.
 * Captures the complete state of the hex canvas including active tools and operations.
 *
 * @typedef {Object} HexCanvasState
 * @property {string|null} currentTool - Active line tool ('single'|'segment'|'ray'|'full'|null)
 * @property {string} currentCoverType - Line coverage algorithm ('normal'|'superCover'|'halfCover')
 * @property {string} currentAction - Drawing action ('set'|'clear'|'toggle')
 * @property {Array<number>|null} lineStart - Starting coordinates for line operations
 * @property {*} [canvasState] - Additional canvas state from the canvas controller
 */

/**
 * Hexagon coordinate in axial/cubic coordinate system.
 *
 * @typedef {Array<number>} HexCoord
 */

/**
 * HexDraw instance for hexagonal grid visualization.
 *
 * Manages the rendering and bit manipulation of a hexagonal grid.
 * Configured with:
 * - Canvas ID: 'c'
 * - Radius: 6 (pointy-top orientation)
 * - Dimensions: 300x300 pixels
 * - Cell size: 25 pixels
 *
 * @type {HexDraw}
 * @const
 */
const hexDraw = new HexDraw('c', 6, 300, 300, 25)

/**
 * HexCanvas controller initializer function.
 *
 * Creates a canvas controller instance when DOM is available.
 * Encapsulates the initialization logic for the HexCanvas controller.
 *
 * @type {Function}
 * @const
 */
const initializeHexCanvas = createCanvasInitializer('c', HexCanvas, hexDraw)

/**
 * HexCanvas controller instance for managing canvas interactions and rendering.
 *
 * Initialized lazily on module load if DOM APIs are available in the current environment.
 * Handles all canvas-based operations including drawing, morphology operations, and
 * button state management. Returns null in non-DOM environments (e.g., Node.js tests).
 *
 * @type {HexCanvas|null}
 * @const
 */
const hexCanvas =
  typeof globalThis !== 'undefined' && globalThis.window && globalThis.document
    ? initializeHexCanvas()
    : null

/**
 * Initialize hexagonal grid with example shape.
 * Sets up initial bit configuration with three example hexagonal cells.
 *
 * This creates a simple test pattern to demonstrate the grid system.
 *
 * @function
 * @returns {void}
 */
function initializeExampleGrid () {
  hexDraw.setBitsFromCoords([
    [0, 0, 0],
    [1, -1, 0],
    [0, 1, -1]
  ])
}

// Execute initialization immediately on module load
initializeExampleGrid()

// ============================================================================
// DELEGATION: Canvas Common Functions
// ============================================================================

/**
 * Updates button states based on current canvas content.
 *
 * Refreshes the enabled/disabled state of all UI control buttons based on the current
 * canvas state and available operations. Provides backward compatibility for button UI updates.
 *
 * @function
 * @returns {void}
 * @throws {Error} If hexCanvas is null (DOM not available)
 * @see updateButtonsCommon
 * @example
 * updateButtons() // Refreshes all button states
 */
function updateButtons () {
  updateButtonsCommon(hexCanvas)
}

/**
 * Sets morphology operation buttons based on configuration.
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
 * @throws {Error} If hexCanvas is null (DOM not available)
 * @see setMorphologyButtonsCommon
 * @example
 * setMorphologyButtons({
 *   dilate: document.getElementById('dilate-btn'),
 *   erode: document.getElementById('erode-btn'),
 *   cross: document.getElementById('cross-btn')
 * })
 */
function setMorphologyButtons ({ dilate, erode, cross }) {
  setMorphologyButtonsCommon(hexCanvas, { dilate, erode, cross })
}

/**
 * Validates hexagonal morphological operations on canvas content.
 *
 * Checks whether a specified morphological operation can be performed on the current
 * grid state. Delegates to the canvas instance for operation validation.
 *
 * @function
 * @param {string} op - The morphology operation identifier ('dilate'|'erode'|'cross')
 * @returns {boolean} True if the operation is valid and enabled on the current canvas state
 * @throws {Error} If hexCanvas is null (DOM not available)
 * @see checkMorphologyCommon
 * @example
 * if (computeHexMorph('dilate')) {
 *   // Perform dilation operation
 * }
 */
function computeHexMorph (op) {
  return checkMorphologyCommon(hexCanvas, op)
}

// ============================================================================
// LINE TOOL STATE: Drawing Operations
// ============================================================================

/**
 * Currently active line/ray tool for drawing operations.
 *
 * Specifies which line drawing mode is active. When a tool is selected,
 * line drawing operations use that specific algorithm for cell selection.
 *
 * Valid values:
 * - 'single': Draw single cells
 * - 'segment': Draw line segments between two points
 * - 'ray': Draw rays extending from a point
 * - 'full': Draw complete lines
 * - null: No tool currently active
 *
 * @type {string|null}
 * @default null
 */
let currentTool = null

/**
 * Current line coverage algorithm for rasterization.
 *
 * Defines how hexagonal grid cells are selected when drawing lines.
 * Different coverage algorithms produce different rasterization results.
 *
 * Valid values:
 * - 'normal': Standard Bresenham-like rasterization
 * - 'superCover': Includes all cells touched by the line (super-coverage)
 * - 'halfCover': Half-coverage rasterization algorithm
 *
 * @type {string}
 * @default 'normal'
 */
let currentCoverType = 'normal'

/**
 * Current drawing action for line operations.
 *
 * Determines what happens to cells selected by the active line tool.
 *
 * Valid values:
 * - 'set': Draw/fill cells (turn bits on)
 * - 'clear': Erase cells (turn bits off)
 * - 'toggle': Flip cell states (XOR operation)
 *
 * @type {string}
 * @default 'set'
 */
let currentAction = 'set'

/**
 * Starting coordinates for line drawing operations.
 *
 * When drawing with line tools, stores the initial point from which lines
 * are drawn. Null when no line drawing is in progress.
 *
 * Format: [x, y, z] in axial coordinate system for hex grids.
 *
 * @type {Array<number>|null}
 * @default null
 */
let lineStart = null

/**
 * Cells being previewed during line tool interaction.
 *
 * Stores hexagonal grid cells that would be affected by the current line drawing operation.
 * Used to show a preview of the operation before it's committed to the canvas.
 * Updated dynamically as the mouse moves during line tool interaction.
 *
 * @type {Array<Array<number>>}
 * @default []
 */
hexDraw.previewCells = []

// ============================================================================
// STATE ACCESSORS: Backward Compatibility
// ============================================================================

/**
 * Retrieves current canvas state including tool configuration and line state.
 *
 * Captures a complete snapshot of the hex canvas state including the currently active
 * line drawing tool, coverage algorithm, drawing action, and line start coordinates.
 * Used for testing, state persistence, and debugging.
 *
 * @function
 * @returns {HexCanvasState} Canvas state object containing:
 *   - currentTool: active line tool identifier
 *   - currentCoverType: line coverage algorithm
 *   - currentAction: drawing action type
 *   - lineStart: starting coordinates for lines
 *   - canvasState: additional canvas controller state
 * @throws {Error} If state retrieval fails or hexCanvas is null
 * @see getCanvasState
 * @example
 * const state = getHexCanvasState()
 * console.log(state.currentTool) // e.g., 'segment' or null
 * console.log(state.currentAction) // e.g., 'set'
 */
function getHexCanvasState () {
  return getCanvasState(hexCanvas, {
    currentTool,
    currentCoverType,
    currentAction,
    lineStart
  })
}

/**
 * Restores canvas state from a state object.
 *
 * Restores canvas state from a previously saved state object. Updates tool configuration,
 * drawing action, and line drawing state. Primarily intended for testing and state
 * management purposes.
 *
 * @function
 * @param {HexCanvasState} state - State object to apply
 * @param {string|null} [state.currentTool] - Tool to activate
 * @param {string} [state.currentCoverType] - Coverage algorithm to use
 * @param {string} [state.currentAction] - Drawing action to apply
 * @param {Array<number>|null} [state.lineStart] - Line starting coordinates
 * @param {*} [state.canvasState] - Additional canvas state to restore
 * @returns {void}
 * @throws {Error} If state parameter is invalid or hexCanvas is null
 * @see setCanvasState
 * @example
 * const savedState = getHexCanvasState()
 * // ... later, restore it
 * setHexCanvasState(savedState)
 */
function setHexCanvasState (state) {
  setCanvasState(
    hexCanvas,
    {
      currentTool,
      currentCoverType,
      currentAction,
      lineStart
    },
    state
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Module exports for hex grid functionality.
 *
 * Provides access to the hexagonal grid drawing utility, canvas controller, and
 * control functions for button management, state persistence, and morphological operations.
 * Exported for use in tests, external canvas control, and other modules.
 *
 * @exports hex
 * @namespace hex
 */

/**
 * @typedef {Object} HexExports
 * @property {HexDraw} hexDraw - The hexagonal grid drawing utility with render and manipulation methods
 * @property {HexCanvas|null} hexCanvas - The canvas controller instance; null if DOM not available (e.g., in Node.js)
 * @property {Function} updateButtons - Update canvas button states based on current canvas state
 * @property {Function} computeHexMorph - Validate hexagonal morphology operations
 * @property {Function} setMorphologyButtons - Configure morphology buttons (dilate, erode, cross)
 * @property {Function} getHexCanvasState - Get current canvas state for persistence or testing
 * @property {Function} setHexCanvasState - Restore canvas state from a saved state object
 */

export {
  hexDraw,
  hexCanvas,
  updateButtons,
  computeHexMorph,
  setMorphologyButtons,
  getHexCanvasState,
  setHexCanvasState
}
