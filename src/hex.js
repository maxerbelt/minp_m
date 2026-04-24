import { HexDraw } from './ui/hexagon/hexDraw.js'
import { HexCanvas } from './ui/hexagon/HexCanvas.js'
import {
  createCanvasInitializer,
  updateButtons as updateButtonsCommon,
  setMorphologyButtons as setMorphologyButtonsCommon,
  checkMorphology as checkMorphologyCommon,
  getCanvasState,
  setCanvasState
} from './canvasCommon.js'

// Create HexDraw instance with canvas ID, radius, and drawing parameters
const hexDraw = new HexDraw('c', 6, 300, 300, 25)

// Create HexCanvas controller initializer
let hexCanvas = null
const initializeHexCanvas = createCanvasInitializer('c', HexCanvas, hexDraw)

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
  updateButtonsCommon(hexCanvas)
}

function setMorphologyButtons ({ dilate, erode, cross }) {
  setMorphologyButtonsCommon(hexCanvas, { dilate, erode, cross })
}

function computeHexMorph (op) {
  return checkMorphologyCommon(hexCanvas, op)
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
  return getCanvasState(hexCanvas, {
    currentTool,
    currentCoverType,
    currentAction,
    lineStart
  })
}

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

/**
 * Initialize on module load if DOM is available
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  hexCanvas = initializeHexCanvas()
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
