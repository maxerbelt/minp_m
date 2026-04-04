import { ColorPackedDraw } from './ui/rectangle/colorpackeddraw.js'
import { ColorPackedRectCanvas } from './ui/rectangle/ColorPackedRectCanvas.js'

// Initialize grid and canvas controller
let grid = null
let rectColorCanvas = null

function initializeGridIfNeeded () {
  if (grid) return // Already initialized
  if (typeof document === 'undefined') return // Not in browser

  const canvas = document.getElementById('rectcolor-c')
  if (!canvas) return // Canvas not ready yet

  grid = new ColorPackedDraw('rectcolor-c', 10, 10, 50, 50, 50, 4)

  grid.setBitsFromCoords([
    [1, 1, 1],
    [2, 2, 2],
    [2, 3, 3],
    [2, 4, 1],
    [3, 5, 2]
  ])

  grid.redraw()
}

/**
 * Initialize canvas controller when DOM is ready.
 */
function initializeRectColorCanvas () {
  if (rectColorCanvas) return
  if (typeof document === 'undefined') return

  initializeGridIfNeeded()
  if (!grid) return

  rectColorCanvas = new ColorPackedRectCanvas('rectcolor-c', grid)
  rectColorCanvas.initializeAll()
}

// ============================================================================
// DELEGATION FUNCTIONS FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Delegation to canvas controller for button state updates.
 */
function updateButtonStates2 () {
  if (rectColorCanvas) {
    rectColorCanvas.updateButtonStates()
  }
}

/**
 * Delegation to canvas controller for transform operations.
 */
function applyTransform2 (mapName) {
  if (rectColorCanvas) {
    rectColorCanvas.applyTransform(mapName)
  }
}

/**
 * Delegation to canvas controller for line tool setup.
 */
function setTool2 (tool) {
  if (rectColorCanvas) {
    rectColorCanvas.setTool(tool)
  }
}

/**
 * Delegation to canvas controller for line preview computation.
 */
function computePreviewCells2 (start, end) {
  if (rectColorCanvas) {
    return rectColorCanvas.computePreviewCells(start, end)
  }
  return []
}

/**
 * Delegation to canvas controller for line drawing.
 */
function drawLineBetween2 (start, end) {
  if (rectColorCanvas) {
    rectColorCanvas.drawLineBetween(start, end)
  }
}

/**
 * Wire line tool buttons - delegated to canvas controller.
 */
function wireLineToolButtons2 () {
  if (!grid || typeof document === 'undefined') return
  if (rectColorCanvas) {
    rectColorCanvas.wireLineToolButtons()
  }
}

/**
 * Wire cover type radios - delegated to canvas controller.
 */
function wireCoverTypeRadios2 () {
  if (typeof document === 'undefined') return
  if (rectColorCanvas) {
    rectColorCanvas.wireCoverTypeRadios()
  }
}

/**
 * Attach canvas listeners - delegated to canvas controller.
 */
function attachCanvasListeners2 () {
  if (!grid) return
  if (rectColorCanvas) {
    rectColorCanvas.attachCanvasListeners()
  }
}

/**
 * Wire action buttons - delegated to canvas controller via parent class.
 */
function wireActionButtons2 () {
  if (!grid || typeof document === 'undefined') return
  if (rectColorCanvas) {
    rectColorCanvas.wireActionButtons()
  }
}

/**
 * Wire transform buttons - delegated to canvas controller via parent class.
 */
function wireTransformButtons2 () {
  if (!grid || typeof document === 'undefined') return
  if (rectColorCanvas) {
    rectColorCanvas.wireTransformButtons()
  }
}

/**
 * Wire morphology buttons - delegated to canvas controller.
 */
function wireMorphologyButtons2 () {
  if (!grid || typeof document === 'undefined') return
  if (rectColorCanvas) {
    rectColorCanvas.wireMorphologyButtons()
  }
}

/**
 * Initialize line tools - delegated to canvas controller.
 */
function initializeLineTools () {
  if (!grid) return
  if (rectColorCanvas) {
    rectColorCanvas.initializeLineTools()
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Main initialization function.
 */
function initializeRectcolor () {
  initializeRectColorCanvas()
  if (grid && rectColorCanvas) {
    grid.redraw()
    updateButtonStates2()
    wireCoordinateModeRadios2()
  }
}

/**
 * Wire coordinate mode radio buttons for rectcolor
 */
function wireCoordinateModeRadios2 () {
  if (typeof document === 'undefined' || !grid) return

  const radios = document.querySelectorAll('input[name="coord-mode2"]')
  radios.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.checked) {
        grid.coordinateMode = e.target.value
      }
    })
  })
}

// Initialize on module load if DOM is available
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeRectcolor()
}

// export helpers for testing
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
