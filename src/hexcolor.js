import { ColorPackedHexDraw } from './ui/hexagon/colorpackedhexdraw.js'
import { ColorPackedHexCanvas } from './ui/hexagon/ColorPackedHexCanvas.js'
import {
  createCanvasInitializer,
  updateButtons as updateButtonsCommon,
  setMorphologyButtons as setMorphologyButtonsCommon,
  checkMorphology as checkMorphologyCommon,
  getCanvasState,
  setCanvasState
} from './canvasCommon.js'

// Create ColorPackedHexDraw instance with canvas ID and parameters
const grid = new ColorPackedHexDraw('hexcolor-c', 6, 300, 300, 25, 2)

// Create ColorPackedHexCanvas controller initializer
let hexColorCanvas = null
const initializeHexColorCanvas = createCanvasInitializer(
  'hexcolor-c',
  ColorPackedHexCanvas,
  grid
)

// Set example shape with specific coordinates
grid.setBitsFromCoords([
  [0, -1, 1, 1],
  [-1, 0, 1, 2],
  [1, -1, 0, 3],
  [0, 0, 0, 1],
  [-1, 1, 0, 2],
  [1, 0, -1, 3]
])

// ============================================================================
// CONCEPT: DELEGATION TO HEXCANVAS FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Delegation functions for backward compatibility and testing
 */
function updateButtons () {
  updateButtonsCommon(hexColorCanvas)
}

function setMorphologyButtons ({ dilate, erode, cross }) {
  setMorphologyButtonsCommon(hexColorCanvas, { dilate, erode, cross })
}

function checkMorphology (op) {
  return checkMorphologyCommon(hexColorCanvas, op)
}

// ============================================================================
// CONCEPT: LINE TOOL HANDLING
// ============================================================================

let currentColor = null

/**
 * Get current canvas state for tests
 */
function getHexColorCanvasState () {
  return getCanvasState(hexColorCanvas, {
    currentColor
  })
}

/**
 * Set canvas state for tests
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
 * Initialize on module load if DOM is available
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  hexColorCanvas = initializeHexColorCanvas()
}

// exports for testing
export {
  grid,
  hexColorCanvas,
  updateButtons,
  checkMorphology,
  setMorphologyButtons,
  getHexColorCanvasState,
  setHexColorCanvasState
}
