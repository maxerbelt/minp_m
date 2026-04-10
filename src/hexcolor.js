import { ColorPackedHexDraw } from './ui/hexagon/colorpackedhexdraw.js'
import { ColorPackedHexCanvas } from './ui/hexagon/ColorPackedHexCanvas.js'

// Create ColorPackedHexDraw instance with canvas ID and parameters
const grid = new ColorPackedHexDraw('hexcolor-c', 6, 300, 300, 25, 2)

// Create ColorPackedHexCanvas controller to manage UI
let hexColorCanvas = null

// Initialize canvas controller when DOM is ready
function initializeHexColorCanvas () {
  if (hexColorCanvas) return
  if (typeof document === 'undefined') return

  hexColorCanvas = new ColorPackedHexCanvas('hexcolor-c', grid)
  hexColorCanvas.initializeAll()
}

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
  if (hexColorCanvas) hexColorCanvas.updateButtonStates()
}

function setMorphologyButtons ({ dilate, erode, cross }) {
  if (!hexColorCanvas) return
  if (dilate) hexColorCanvas.dilateBtn = dilate
  if (erode) hexColorCanvas.erodeBtn = erode
  if (cross) hexColorCanvas.crossBtn = cross
}

function checkMorphology (op) {
  if (!hexColorCanvas) return false
  return hexColorCanvas.checkMorphology(op)
}

// ============================================================================
// CONCEPT: LINE TOOL HANDLING
// ============================================================================

/**
 * Get current canvas state for tests
 */
function getHexColorCanvasState () {
  if (!hexColorCanvas) return null
  return {
    currentTool: hexColorCanvas.currentTool,
    currentAction: hexColorCanvas.currentAction,
    coverType: hexColorCanvas.coverType,
    lineStart: hexColorCanvas.lineStart,
    currentColor: hexColorCanvas.currentColor
  }
}

/**
 * Set canvas state for tests
 */
function setHexColorCanvasState (state) {
  if (!hexColorCanvas) return
  if (state.currentTool !== undefined) {
    hexColorCanvas.currentTool = state.currentTool
  }
  if (state.currentAction !== undefined) {
    hexColorCanvas.currentAction = state.currentAction
  }
  if (state.coverType !== undefined) {
    hexColorCanvas.coverType = state.coverType
  }
  if (state.lineStart !== undefined) {
    hexColorCanvas.lineStart = state.lineStart
  }
  if (state.currentColor !== undefined) {
    hexColorCanvas.currentColor = state.currentColor
  }
}

/**
 * Initialize on module load if DOM is available
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeHexColorCanvas()
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
