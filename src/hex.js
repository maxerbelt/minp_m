import { HexDraw } from './grid/hexdraw.js'
import { HexCanvas } from './ui/HexCanvas.js'

// Create HexDraw instance with canvas ID, radius, and drawing parameters
const hexDraw = new HexDraw('c', 6, 300, 300, 25)

// Create HexCanvas controller to manage UI
let hexCanvas = null

// Initialize canvas controller when DOM is ready
function initializeHexCanvas () {
  if (hexCanvas) return
  if (typeof document === 'undefined') return

  hexCanvas = new HexCanvas('c', hexDraw)
  hexCanvas.initializeAll()
}

// Set example shape with specific coordinates
hexDraw.setBitsFromCoords([
  [0, 0, 0],
  [1, -1, 0],
  [0, 1, -1]
])

// ============================================================================
// CONCEPT: DELEGATION TO HEXCANVAS
// ============================================================================

/**
 * Delegation functions for backward compatibility and testing
 */
function updateButtons () {
  if (hexCanvas) hexCanvas.updateButtonStates()
}

function setMorphologyButtons ({ dilate, erode, cross }) {
  if (!hexCanvas) return
  if (dilate) hexCanvas.dilateBtn = dilate
  if (erode) hexCanvas.erodeBtn = erode
  if (cross) hexCanvas.crossBtn = cross
}

function computeHexMorph (op) {
  if (!hexCanvas) return false
  return hexCanvas.checkMorphology(op)
}

// ============================================================================
// CONCEPT: LINE TOOL HANDLING
// ============================================================================

// line/ray/full tools state
let currentTool = null // 'single' | 'segment' | 'ray' | 'full'
let currentCoverType = 'normal' // 'normal' | 'superCover' | 'halfCover'
let currentAction = 'set' // 'set'|'clear'|'toggle'
let lineStart = null
hexDraw.previewCells = []

/**
 * Getter/setter for backward compatibility with tests
 */
function getHexCanvasState () {
  if (!hexCanvas) return null
  return {
    currentTool: hexCanvas.currentTool,
    currentAction: hexCanvas.currentAction,
    coverType: hexCanvas.coverType,
    lineStart: hexCanvas.lineStart
  }
}

function setHexCanvasState (state) {
  if (!hexCanvas) return
  if (state.currentTool !== undefined) {
    hexCanvas.currentTool = state.currentTool
    currentTool = state.currentTool
  }
  if (state.currentAction !== undefined) {
    hexCanvas.currentAction = state.currentAction
    currentAction = state.currentAction
  }
  if (state.coverType !== undefined) {
    hexCanvas.coverType = state.coverType
    currentCoverType = state.coverType
  }
  if (state.lineStart !== undefined) {
    hexCanvas.lineStart = state.lineStart
    lineStart = state.lineStart
  }
}

/**
 * Initialize on module load if DOM is available
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeHexCanvas()
}

// exports for testing
export {
  hexDraw,
  hexCanvas,
  updateButtons,
  computeHexMorph,
  setMorphologyButtons,
  getHexCanvasState,
  setHexCanvasState
}
