import { ColorPackedDraw } from './ui/rectangle/colorpackeddraw.js'
import { ColorPackedRectCanvas } from './ui/rectangle/ColorPackedRectCanvas.js'

const DEFAULT_CELL_SIZE = 50
const GRID_OFFSET_X = 50
const GRID_OFFSET_Y = 50
const GRID_WIDTH = 10
const GRID_HEIGHT = 10
const COLOR_BITS = 4

let grid = null
let rectColorCanvas = null

/**
 * @typedef {Object} ColorCoord
 * @property {number} x
 * @property {number} y
 * @property {number} color
 */

/**
 * @returns {boolean}
 */
function isBrowser () {
  return typeof document !== 'undefined'
}

/**
 * @param {string} id
 * @returns {HTMLCanvasElement|null}
 */
function getCanvas (id) {
  if (!isBrowser()) return null
  const element = document.getElementById(id)
  return element instanceof HTMLCanvasElement ? element : null
}

function withGrid (callback) {
  if (grid) callback(grid)
}

function withRectColorCanvas (callback) {
  if (rectColorCanvas) callback(rectColorCanvas)
}

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

  grid.setBitsFromCoords([
    [1, 1, 1],
    [2, 2, 2],
    [2, 3, 3],
    [2, 4, 1],
    [3, 5, 2]
  ])

  if (isBrowser()) grid.redraw()
}

/**
 * Initialize canvas controller when DOM is ready.
 */
function initializeRectColorCanvas () {
  if (rectColorCanvas) return

  initializeGridIfNeeded()
  if (!grid) return

  rectColorCanvas = new ColorPackedRectCanvas('rectcolor-c', grid)
  if (isBrowser()) rectColorCanvas.initializeAll()
}

/**
 * Delegation to canvas controller for button state updates.
 */
function updateButtonStates2 () {
  withRectColorCanvas(canvas => canvas.updateButtonStates())
}

/**
 * Delegation to canvas controller for transform operations.
 */
function applyTransform2 (mapName) {
  withRectColorCanvas(canvas => canvas.applyTransform(mapName))
}

/**
 * Delegation to canvas controller for line tool setup.
 */
function setTool2 (tool) {
  withRectColorCanvas(canvas => canvas.setTool(tool))
}

/**
 * Delegation to canvas controller for line preview computation.
 */
function computePreviewCells2 (start, end) {
  if (!rectColorCanvas) return []
  return rectColorCanvas.computePreviewCells(start, end)
}

/**
 * Delegation to canvas controller for line drawing.
 */
function drawLineBetween2 (start, end) {
  withRectColorCanvas(canvas => canvas.drawLineBetween(start, end))
}

/**
 * Wire line tool buttons - delegated to canvas controller.
 */
function wireLineToolButtons2 () {
  if (!grid || !isBrowser()) return
  withRectColorCanvas(canvas => canvas.wireLineToolButtons())
}

/**
 * Wire cover type radios - delegated to canvas controller.
 */
function wireCoverTypeRadios2 () {
  if (!isBrowser()) return
  withRectColorCanvas(canvas => canvas.wireCoverTypeRadios())
}

/**
 * Attach canvas listeners - delegated to canvas controller.
 */
function attachCanvasListeners2 () {
  if (!grid) return
  withRectColorCanvas(canvas => canvas.attachCanvasListeners())
}

/**
 * Wire action buttons - delegated to canvas controller via parent class.
 */
function wireActionButtons2 () {
  if (!grid || !isBrowser()) return
  withRectColorCanvas(canvas => canvas.wireActionButtons())
}

/**
 * Wire transform buttons - delegated to canvas controller via parent class.
 */
function wireTransformButtons2 () {
  if (!grid || !isBrowser()) return
  withRectColorCanvas(canvas => canvas.wireTransformButtons())
}

/**
 * Wire morphology buttons - delegated to canvas controller.
 */
function wireMorphologyButtons2 () {
  if (!grid || !isBrowser()) return
  withRectColorCanvas(canvas => canvas.wireMorphologyButtons())
}

/**
 * Initialize line tools - delegated to canvas controller.
 */
function initializeLineTools () {
  if (!grid) return
  withRectColorCanvas(canvas => canvas.initializeLineTools())
}

/**
 * Main initialization function.
 */
function initializeRectcolor () {
  initializeRectColorCanvas()
  if (grid && rectColorCanvas) {
    if (isBrowser()) grid.redraw()
    updateButtonStates2()
    wireCoordinateModeRadios2()
  }
}

/**
 * Wire coordinate mode radio buttons for rectcolor
 */
function wireCoordinateModeRadios2 () {
  if (!isBrowser() || !grid) return

  const radios = document.querySelectorAll('input[name="coord-mode2"]')
  radios.forEach(radio => {
    radio.addEventListener('change', event => {
      const target = /** @type {HTMLInputElement} */ (event.target)
      if (target.checked) {
        grid.coordinateMode = target.value
      }
    })
  })
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeRectcolor()
}

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
