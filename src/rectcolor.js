/**
 * @fileoverview Color-packed rectangular grid UI module.
 * Manages colored rectangular grid canvas creation, rendering, and interaction.
 * Provides delegation functions for morphological operations and line drawing tools
 * with color support (multiple colors per cell via color-packed representation).
 *
 * Key features:
 * - Color-packed bit representation for multi-color cells
 * - Lazy initialization to support both browser and server environments
 * - Canvas controller with line drawing and morphological transform tools
 * - Delegation pattern for safe null-checked function calls
 * - Coordinate mode support for grid positioning
 *
 * @module rectcolor
 * @requires ColorPackedDraw from './ui/rectangle/colorpackeddraw.js'
 * @requires ColorPackedRectCanvas from './ui/rectangle/ColorPackedRectCanvas.js'
 */

import { ColorPackedDraw } from './ui/rectangle/colorpackeddraw.js'
import { ColorPackedRectCanvas } from './ui/rectangle/ColorPackedRectCanvas.js'

/**
 * Default cell size in pixels for the colored grid display.
 * @const {number}
 */
const DEFAULT_CELL_SIZE = 50

/**
 * Horizontal offset in pixels for the grid on the canvas.
 * @const {number}
 */
const GRID_OFFSET_X = 50

/**
 * Vertical offset in pixels for the grid on the canvas.
 * @const {number}
 */
const GRID_OFFSET_Y = 50

/**
 * Number of columns in the colored rectangular grid.
 * @const {number}
 */
const GRID_WIDTH = 10

/**
 * Number of rows in the colored rectangular grid.
 * @const {number}
 */
const GRID_HEIGHT = 10

/**
 * Number of bits per cell for color-packed representation.
 * Determines how many color values can be stored per cell.
 * @const {number}
 */
const COLOR_BITS = 4

/**
 * Color-packed grid drawing instance.
 * Manages rendering of colored rectangular grid with packed color support.
 * Initialized lazily on first use to avoid creating DOM references in server environments.
 *
 * Note: Exported as mutable binding for test access to module state.
 * In production code, use delegation functions instead of direct access.
 *
 * @type {ColorPackedDraw|null}
 */
let grid = null

/**
 * Color-packed canvas controller instance.
 * Manages canvas rendering, user interaction, and state updates.
 * Initialized lazily on first use to avoid creating DOM references in server environments.
 * @type {ColorPackedRectCanvas|null}
 */
let rectColorCanvas = null

/**
 * Color coordinate with x, y position and color value.
 * Represents a single cell's position and its color in the color-packed grid.
 *
 * @typedef {Object} ColorCoord
 * @property {number} x - X coordinate in grid (0 to GRID_WIDTH-1)
 * @property {number} y - Y coordinate in grid (0 to GRID_HEIGHT-1)
 * @property {number} color - Color value at this coordinate (0 to 2^COLOR_BITS-1)
 */

/**
 * Check if running in a browser environment.
 * Determines if DOM APIs are available in the current execution context.
 * Used to skip DOM operations in server/test environments.
 *
 * @function
 * @returns {boolean} True if browser globals are available, false otherwise
 */
function isBrowser () {
  return typeof document !== 'undefined'
}

/**
 * Execute a callback with the canvas if available.
 * Safely provides canvas instance to callback with null checks.
 * Invokes the callback only if canvas is initialized.
 *
 * @function
 * @param {function(ColorPackedRectCanvas): void} callback - Function to execute with canvas instance
 * @returns {void}
 */
function withRectColorCanvas (callback) {
  if (rectColorCanvas) {
    callback(rectColorCanvas)
  }
}

/**
 * Initialize the colored rectangular grid if not already initialized.
 * Sets up the grid drawing instance with example data and redraws if in browser.
 * Idempotent - safe to call multiple times.
 *
 * @function
 * @returns {void}
 */
function initializeGridIfNeeded () {
  if (grid) return

  grid = new ColorPackedDraw(
    'rectcolor-c',
    GRID_WIDTH,
    GRID_HEIGHT,
    DEFAULT_CELL_SIZE,
    GRID_OFFSET_X,
    GRID_OFFSET_Y,
    COLOR_BITS
  )

  // Set example colored coordinates demonstrating color-packed capabilities
  grid.setBitsFromCoords([
    [1, 1, 1],
    [2, 2, 2],
    [2, 3, 3],
    [2, 4, 1],
    [3, 5, 2]
  ])

  if (isBrowser()) {
    grid.redraw()
  }
}

/**
 * Initialize canvas controller when DOM is ready.
 * Creates the ColorPackedRectCanvas instance and initializes all UI elements.
 * Idempotent - safe to call multiple times. Skips initialization in non-browser environments.
 *
 * @function
 * @returns {void}
 */
function initializeRectColorCanvas () {
  if (rectColorCanvas) return

  initializeGridIfNeeded()
  if (!grid) return

  rectColorCanvas = new ColorPackedRectCanvas('rectcolor-c', grid)
  if (isBrowser()) {
    rectColorCanvas.initializeAll()
  }
}

/**
 * Update button states based on current canvas content.
 * Delegates to canvas controller for button state management.
 * Handles enable/disable logic for transformation buttons based on grid state.
 *
 * @function
 * @returns {void}
 */
function updateButtonStates2 () {
  withRectColorCanvas(canvas => {
    canvas.updateButtonStates()
  })
}

/**
 * Apply a transform operation to the grid.
 * Delegates to canvas controller for transform application.
 * Supported transforms depend on morphological operations available.
 *
 * @function
 * @param {string} mapName - Name of the map/transform to apply (e.g., 'dilate', 'erode')
 * @returns {void}
 */
function applyTransform2 (mapName) {
  withRectColorCanvas(canvas => {
    canvas.applyTransform(mapName)
  })
}

/**
 * Set the current drawing tool.
 * Delegates to canvas controller for tool activation.
 * Available tools typically include line and other shape tools.
 *
 * @function
 * @param {string|null} tool - The tool to activate (e.g., 'line') or null to deactivate all tools
 * @returns {void}
 */
function setTool2 (tool) {
  withRectColorCanvas(canvas => {
    canvas.setTool(tool)
  })
}

/**
 * Compute preview cells for a line drawing operation.
 * Delegates to canvas controller for preview calculation.
 * Used to show which cells will be affected before the user commits the drawing.
 *
 * @function
 * @param {Array<number>} start - Starting coordinates [x, y] in grid space
 * @param {Array<number>} end - Ending coordinates [x, y] in grid space
 * @returns {Array<Array<number>>} Array of [x, y] cell coordinates in grid space that will be affected
 */
function computePreviewCells2 (start, end) {
  if (!rectColorCanvas) return []
  return rectColorCanvas.computePreviewCells(start, end)
}

/**
 * Draw a line between two points on the canvas.
 * Delegates to canvas controller for line drawing.
 * Applies the color-packed color to all cells along the line.
 *
 * @function
 * @param {Array<number>} start - Starting coordinates [x, y] in grid space
 * @param {Array<number>} end - Ending coordinates [x, y] in grid space
 * @returns {void}
 */
function drawLineBetween2 (start, end) {
  withRectColorCanvas(canvas => {
    canvas.drawLineBetween(start, end)
  })
}

/**
 * Wire line tool buttons - delegated to canvas controller.
 * Attaches event handlers to line tool buttons (normal, preview, clear modes).
 * Only executes in browser environment with initialized grid.
 *
 * @function
 * @returns {void}
 */
function wireLineToolButtons2 () {
  if (!grid || !isBrowser()) return
  withRectColorCanvas(canvas => {
    canvas.wireLineToolButtons()
  })
}

/**
 * Wire cover type radio buttons - delegated to canvas controller.
 * Attaches event handlers to coverage type selection (e.g., normal, half, supercover).
 * Only executes in browser environment.
 *
 * @function
 * @returns {void}
 */
function wireCoverTypeRadios2 () {
  if (!isBrowser()) return
  withRectColorCanvas(canvas => {
    canvas.wireCoverTypeRadios()
  })
}

/**
 * Attach canvas event listeners - delegated to canvas controller.
 * Wires up mouse, touch, and interaction events on the canvas element.
 * Only executes with initialized grid.
 *
 * @function
 * @returns {void}
 */
function attachCanvasListeners2 () {
  if (!grid) return
  withRectColorCanvas(canvas => {
    canvas.attachCanvasListeners()
  })
}

/**
 * Initialize line tools - delegated to canvas controller.
 * Sets up all line drawing tool functionality, event handlers, and UI state.
 * Only executes with initialized grid.
 *
 * @function
 * @returns {void}
 */
function initializeLineTools () {
  if (!grid) return
  withRectColorCanvas(canvas => {
    canvas.initializeLineTools()
  })
}

/**
 * Main initialization function for the rectcolor module.
 * Initializes canvas, grid, wires all interactive elements, and updates UI state.
 * Idempotent - safe to call multiple times. Entry point for module setup.
 *
 * @function
 * @returns {void}
 */
function initializeRectcolor () {
  initializeRectColorCanvas()
  if (grid && rectColorCanvas) {
    if (isBrowser()) {
      grid.redraw()
    }
    updateButtonStates2()
    wireCoordinateModeRadios2()
  }
}

/**
 * Wire coordinate mode radio buttons for rectcolor grid.
 * Attaches listeners to coordinate mode selection for grid coordinate system.
 * Updates the grid's coordinate mode when user makes a selection.
 * Only executes in browser environment with initialized grid.
 *
 * @function
 * @returns {void}
 */
function wireCoordinateModeRadios2 () {
  if (!isBrowser() || !grid) return

  const radios = document.querySelectorAll('input[name="coord-mode2"]')
  radios.forEach(radio => {
    addEventListenerIfExists(radio, 'change', event => {
      const target = /** @type {HTMLInputElement} */ (event.target)
      if (target.checked && grid) {
        grid.coordinateMode = target.value
      }
    })
  })
}

/**
 * Conditionally add an event listener only if element exists.
 * Safely attaches event listeners with null/undefined element checks using optional chaining.
 * No-op if element is null or undefined.
 *
 * @function
 * @param {HTMLElement|null} element - The element to attach listener to (may be null)
 * @param {string} type - The event type (e.g., 'click', 'change', 'input')
 * @param {EventListener} listener - The event listener function to attach
 * @returns {void}
 */
function addEventListenerIfExists (element, type, listener) {
  element?.addEventListener(type, listener)
}

// Initialize module when DOM is ready in browser environment
if (
  typeof globalThis !== 'undefined' &&
  globalThis.window &&
  globalThis.document
) {
  initializeRectcolor()
}

/**
 * Module exports for rectcolor grid functionality.
 * Provides access to the canvas controller and control functions for button management,
 * tool handling, and state operations. Grid instance is accessed internally only.
 * Exported for use in tests, external canvas control, and other modules.
 *
 * @exports rectcolor
 * @namespace rectcolor
 */

/**
 * @typedef {Object} RectcolorExports
 * @property {function(): void} initializeRectcolor - Initialize the rectcolor module
 * @property {function(): void} initializeLineTools - Initialize line drawing tools
 * @property {function(): void} wireLineToolButtons2 - Wire line tool button events
 * @property {function(): void} attachCanvasListeners2 - Attach canvas interaction listeners
 * @property {function(): void} updateButtonStates2 - Update canvas button states
 * @property {function(string): void} applyTransform2 - Apply transform operations to grid
 * @property {function(Array<number>, Array<number>): Array<Array<number>>} computePreviewCells2 - Compute line preview cells
 * @property {function(Array<number>, Array<number>): void} drawLineBetween2 - Draw lines on canvas
 * @property {function(string|null): void} setTool2 - Set the current drawing tool
 * @property {function(): void} wireCoverTypeRadios2 - Wire coverage type selection
 */

export {
  initializeRectcolor,
  initializeLineTools,
  wireLineToolButtons2,
  attachCanvasListeners2,
  grid,
  updateButtonStates2,
  applyTransform2,
  computePreviewCells2,
  drawLineBetween2,
  setTool2,
  wireCoverTypeRadios2
}
