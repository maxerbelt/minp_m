import { RectDraw } from './grid/rectdraw.js'
import { RectCanvas } from './ui/RectCanvas.js'
import { PolyominoGridManager } from './polyominoGrid.js'

// Grid initialization parameters
const cellSize = 50
const offsetX = 50
const offsetY = 50
const width = 10
const height = 10

// Initialize grid and controller only if canvas exists (defer for test environments)
let rectDraw = null
let rectCanvas = null
let polyGrid = null

function initializeGridIfNeeded () {
  if (rectDraw) return // Already initialized
  if (typeof document === 'undefined') return // Not in browser

  const canvas = document.getElementById('rect-c')
  if (!canvas) return // Canvas not ready yet

  rectDraw = new RectDraw('rect-c', width, height, cellSize, offsetX, offsetY)
  rectCanvas = new RectCanvas('rect-c', rectDraw, { width, height })
}

function initializePolyominoGridIfNeeded () {
  if (polyGrid) return // Already initialized
  if (typeof document === 'undefined') return // Not in browser

  const canvas = document.getElementById('rect-poly')
  if (!canvas) return // Canvas not ready yet

  polyGrid = new PolyominoGridManager(
    'rect-poly',
    width,
    height,
    cellSize,
    offsetX,
    offsetY
  )
}

// Expose rectCanvas variables for testing and backward compatibility
function getButtonStates () {
  if (!rectCanvas) return {}
  return {
    currentTool: rectCanvas.currentTool,
    lineStart: rectCanvas.lineStart,
    currentAction: rectCanvas.currentAction,
    coverType: rectCanvas.coverType
  }
}

function setButtonStates (states) {
  if (!rectCanvas) return
  if (states.currentTool !== undefined)
    rectCanvas.currentTool = states.currentTool
  if (states.lineStart !== undefined) rectCanvas.lineStart = states.lineStart
  if (states.currentAction !== undefined)
    rectCanvas.currentAction = states.currentAction
  if (states.coverType !== undefined) rectCanvas.coverType = states.coverType
}

/**
 * Update button states - delegates to rectCanvas
 */
function updateButtonStates () {
  if (rectCanvas) rectCanvas.updateButtonStates()
}

/**
 * Apply transform operation - delegates to rectCanvas
 */
function applyTransform (mapName) {
  initializeGridIfNeeded()
  if (rectCanvas) rectCanvas.applyTransform(mapName)
}

/**
 * Apply morphology operation - delegates to rectCanvas
 */
function applyMorphology (operation) {
  if (rectCanvas) rectCanvas.applyMorphology(operation)
}

/**
 * Compute preview cells - delegates to rectCanvas
 */
function computePreviewCells (start, end) {
  initializeGridIfNeeded()
  if (!rectCanvas) return []
  return rectCanvas.computePreviewCells(start, end)
}

/**
 * Draw line between two points - delegates to rectCanvas
 */
function drawLineBetween (start, end) {
  if (rectCanvas) rectCanvas.completeLine(start, end)
}

/**
 * Set current tool - delegates to rectCanvas
 */
function setTool (tool) {
  initializeGridIfNeeded()
  if (rectCanvas) rectCanvas.setTool(tool)
}

// ============================================================================
// CONCEPT: INITIALIZATION
// ============================================================================

/**
 * Main initialization function callable by tests after DOM is ready
 */
function initializeRect () {
  initializeGridIfNeeded()
  initializePolyominoGridIfNeeded()
  if (rectDraw && rectCanvas) {
    rectCanvas.initializeAll()
    wireCoordinateModeRadios()
  }
  wirePolyominoGridControls()
}

/**
 * Wire coordinate mode radio buttons
 */
function wireCoordinateModeRadios () {
  if (typeof document === 'undefined' || !rectDraw) return

  const radios = document.querySelectorAll('input[name="coord-mode"]')
  radios.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.checked) {
        rectDraw.coordinateMode = e.target.value
      }
    })
  })
}

/**
 * Drag and drop state
 */
let draggedPolyominoId = null

/**
 * Helper: Convert canvas coordinates to grid coordinates
 */
function getGridCoordsFromEvent (
  canvas,
  clientX,
  clientY,
  cellSize,
  offsetX,
  offsetY
) {
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left - offsetX
  const y = clientY - rect.top - offsetY
  const gridX = Math.floor(x / cellSize)
  const gridY = Math.floor(y / cellSize)
  return { gridX, gridY, x, y }
}

/**
 * Helper: Create a drag image canvas showing only the polyomino
 */
function createPolyominoDragImage (polyomino, polyominoId, cellSize = 50) {
  const padding = 8
  const canvasWidth = Math.max(polyomino.width * cellSize + padding * 2, 32)
  const canvasHeight = Math.max(polyomino.height * cellSize + padding * 2, 32)

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Background is transparent by default (no fill or border needed)

  // Get polyomino color
  let color = '#4ecdc4' // default color
  if (polyGrid && polyominoId > 0) {
    const colorIndex = (polyominoId - 1) % polyGrid.polyominoColors.length
    color = polyGrid.polyominoColors[colorIndex]
  }

  // Draw polyomino cells
  ctx.fillStyle = color
  for (const [x, y] of polyomino.cells()) {
    if (polyomino.at(x, y)) {
      const canvasX = padding + x * cellSize
      const canvasY = padding + y * cellSize
      ctx.fillRect(canvasX, canvasY, cellSize, cellSize)

      // Cell border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(canvasX, canvasY, cellSize, cellSize)
    }
  }

  // Temporarily add to DOM so drag image works (some browsers require this)
  canvas.style.position = 'absolute'
  canvas.style.left = '-9999px'
  canvas.style.top = '-9999px'
  document.body.appendChild(canvas)

  // Schedule removal after drag starts
  setTimeout(() => {
    if (canvas.parentNode === document.body) {
      document.body.removeChild(canvas)
    }
  }, 100)

  return canvas
}

/**
 * Drag drop preview state
 */
let dropPreviewData = null

/**
 * Helper: Draw preview of where polyomino will land
 */
function drawDropPreview (canvas, dragData, clientX, clientY) {
  if (!rectDraw || !rectCanvas) return

  const coords = getGridCoordsFromEvent(
    canvas,
    clientX,
    clientY,
    cellSize,
    offsetX,
    offsetY
  )

  // Store preview data for rendering
  dropPreviewData = {
    gridX: coords.gridX,
    gridY: coords.gridY,
    width: dragData.width,
    height: dragData.height,
    cells: dragData.cells
  }

  // Set previewCells on the grid so it will be drawn
  if (rectCanvas.grid) {
    rectCanvas.grid.previewCells = dragData.cells.map(cell => {
      const x = cell[0] !== undefined ? cell[0] : cell
      const y =
        cell[1] !== undefined ? cell[1] : Array.isArray(cell) ? cell[0] : 0
      return [coords.gridX + x, coords.gridY + y]
    })
    // Override previewCells color
    if (!rectCanvas._origDrawHover) {
      rectCanvas._origDrawHover = rectCanvas.grid._drawHover
      rectCanvas.grid._drawHover = function () {
        if (this.previewCells?.length) {
          for (const [x, y] of this.previewCells) {
            // Draw with blue color instead of orange
            const ctx = this.canvas.getContext('2d')
            const offsetX = 50
            const offsetY = 50
            const cellSize = 50
            ctx.fillStyle = 'rgba(100, 200, 255, 0.4)'
            ctx.strokeStyle = 'rgba(0, 120, 250, 0.8)'
            ctx.lineWidth = 2
            const canvasX = offsetX + x * cellSize + 1
            const canvasY = offsetY + y * cellSize + 1
            ctx.fillRect(canvasX, canvasY, cellSize - 2, cellSize - 2)
            ctx.strokeRect(canvasX, canvasY, cellSize - 2, cellSize - 2)
          }
        }
      }
    }
    // Trigger redraw to show preview
    rectCanvas.grid.redraw()
  }
}

/**
 * Helper: Clear drop preview
 */
function clearDropPreview () {
  if (dropPreviewData) {
    dropPreviewData = null
    // Clear preview cells and restore original _drawHover
    if (rectCanvas && rectCanvas.grid) {
      rectCanvas.grid.previewCells = []
      if (rectCanvas._origDrawHover) {
        rectCanvas.grid._drawHover = rectCanvas._origDrawHover
        rectCanvas._origDrawHover = null
      }
      // Redraw to remove preview
      rectCanvas.grid.redraw()
    }
  }
}

/**
 * Set up drag and drop between polyomino grid and main rect grid
 */
function setupDragAndDrop () {
  if (typeof document === 'undefined') return

  const polyCanvas = document.getElementById('rect-poly')
  const rectCanvas = document.getElementById('rect-c')
  if (!polyCanvas || !rectCanvas) return

  // ===== SOURCE: Polyomino Grid Canvas =====

  // Track mousedown to identify which polyomino is being dragged
  polyCanvas.addEventListener('mousedown', e => {
    initializePolyominoGridIfNeeded()
    if (!polyGrid) return

    const coords = getGridCoordsFromEvent(
      polyCanvas,
      e.clientX,
      e.clientY,
      cellSize,
      offsetX,
      offsetY
    )

    // Find which polyomino was clicked
    const clickedPolyId = polyGrid.gridMask.at(coords.gridX, coords.gridY)
    if (clickedPolyId > 0) {
      draggedPolyominoId = clickedPolyId
    }
  })

  // dragstart: Set up the dragged data
  polyCanvas.addEventListener('dragstart', e => {
    if (draggedPolyominoId === null) {
      e.preventDefault() // Don't drag if no polyomino selected
      return
    }

    initializePolyominoGridIfNeeded()
    if (!polyGrid) {
      e.preventDefault()
      return
    }

    // Find the polyomino object with this ID
    const poly = polyGrid.polyominoes.find(p => p.id === draggedPolyominoId)
    if (!poly) {
      e.preventDefault()
      return
    }

    // Store data for dropping
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        polyId: draggedPolyominoId,
        polyIndex: polyGrid.polyominoes.indexOf(poly),
        width: poly.poly.width,
        height: poly.poly.height,
        cells: Array.from(poly.poly.cells())
      })
    )

    // Visual feedback: Create custom drag image showing only the polyomino
    const dragImage = createPolyominoDragImage(poly.poly, draggedPolyominoId)
    // Use offset to center the image relative to cursor
    const offsetX = dragImage.width / 2
    const offsetY = dragImage.height / 2
    e.dataTransfer.setDragImage(dragImage, offsetX, offsetY)
    polyCanvas.style.opacity = '0.5'
  })

  // dragend: Clean up dragged state
  polyCanvas.addEventListener('dragend', e => {
    polyCanvas.style.opacity = '1'
    draggedPolyominoId = null
  })

  // ===== TARGET: Main Rect Grid Canvas =====

  // dragover: Allow drop and show preview
  rectCanvas.addEventListener('dragover', e => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    rectCanvas.style.opacity = '0.8'

    // Update preview as user drags
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'))
      if (dragData) {
        drawDropPreview(rectCanvas, dragData, e.clientX, e.clientY)
      }
    } catch (err) {
      // Silently ignore if no valid data
    }
  })

  // dragenter: Visual feedback
  rectCanvas.addEventListener('dragenter', e => {
    e.preventDefault()
    rectCanvas.style.backgroundColor = 'rgba(100, 150, 255, 0.1)'
  })

  // dragleave: Remove visual feedback and preview
  rectCanvas.addEventListener('dragleave', e => {
    if (e.target === rectCanvas) {
      rectCanvas.style.backgroundColor = ''
      clearDropPreview()
    }
  })

  // drop: Place the polyomino on the main grid
  rectCanvas.addEventListener('drop', e => {
    e.preventDefault()
    e.stopPropagation()
    rectCanvas.style.opacity = '1'
    rectCanvas.style.backgroundColor = ''
    clearDropPreview()

    let dragData
    try {
      dragData = JSON.parse(e.dataTransfer.getData('application/json'))
    } catch (err) {
      return
    }

    if (!dragData || dragData.polyId === undefined) return

    initializeGridIfNeeded()
    initializePolyominoGridIfNeeded()
    if (!rectDraw || !polyGrid) return

    // Get the drop location
    const coords = getGridCoordsFromEvent(
      rectCanvas,
      e.clientX,
      e.clientY,
      cellSize,
      offsetX,
      offsetY
    )

    // Get the polyomino from polyGrid
    const sourcePoly = polyGrid.polyominoes.find(p => p.id === dragData.polyId)
    if (!sourcePoly) return

    // Check if we can place it at the target location
    if (rectDraw.mask.canPlacePolyomino) {
      // If mask has canPlacePolyomino, use it
      if (
        !rectDraw.mask.canPlacePolyomino(
          sourcePoly.poly,
          coords.gridX,
          coords.gridY
        )
      ) {
        return
      }
    } else {
      // Otherwise, do a simple bounds and empty-cell check
      const poly = sourcePoly.poly
      if (
        coords.gridX < 0 ||
        coords.gridY < 0 ||
        coords.gridX + poly.width > rectDraw.width ||
        coords.gridY + poly.height > rectDraw.height
      ) {
        return
      }

      // Check if cells are empty
      for (const [px, py] of poly.cells()) {
        if (poly.at(px, py)) {
          const gx = coords.gridX + px
          const gy = coords.gridY + py
          if (rectDraw.mask.at(gx, gy) !== 0) {
            return
          }
        }
      }
    }

    // Place the polyomino on the main grid
    const poly = sourcePoly.poly
    for (const [px, py] of poly.cells()) {
      if (poly.at(px, py)) {
        const gx = coords.gridX + px
        const gy = coords.gridY + py
        rectDraw.mask.set(gx, gy, 1) // Set to 1 (filled)
      }
    }

    // Redraw the main grid
    if (rectDraw.redraw) {
      rectDraw.redraw()
    }
  })
}

/**
 * Wire polyomino grid controls
 */
function wirePolyominoGridControls () {
  if (typeof document === 'undefined') return

  // Connectivity radio buttons - when changed, update polyGrid settings
  const connectivityRadios = document.querySelectorAll(
    'input[name="poly-connectivity"]'
  )
  connectivityRadios.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.checked && polyGrid) {
        polyGrid.connectivity = e.target.value
        // Optionally auto-generate on connectivity change
        // polyGrid.fillGrid()
      }
    })
  })

  // Size dropdown - when changed, update polyGrid settings
  const sizeDropdown = document.getElementById('poly-size')
  if (sizeDropdown) {
    sizeDropdown.addEventListener('change', e => {
      if (polyGrid) {
        polyGrid.polyominoSize = parseInt(e.target.value)
        // Optionally auto-generate on size change
        // polyGrid.fillGrid()
      }
    })
  }

  // Fill Grid button - trigger placement algorithm
  const fillButton = document.getElementById('fill-poly-grid')
  if (fillButton) {
    fillButton.addEventListener('click', () => {
      initializePolyominoGridIfNeeded()
      if (polyGrid) {
        polyGrid.fillGrid()
      }
    })
  }

  // Previous button - navigate to previous polyomino
  const prevButton = document.getElementById('prev-poly-grid')
  if (prevButton && prevButton.addEventListener) {
    prevButton.addEventListener('click', () => {
      initializePolyominoGridIfNeeded()
      if (polyGrid && polyGrid.prevPolyomino) {
        polyGrid.prevPolyomino()
      }
    })
  }

  // Next button - navigate to next polyomino
  const nextButton = document.getElementById('next-poly-grid')
  if (nextButton && nextButton.addEventListener) {
    nextButton.addEventListener('click', () => {
      initializePolyominoGridIfNeeded()
      if (polyGrid && polyGrid.nextPolyomino) {
        polyGrid.nextPolyomino()
      }
    })
  }

  // Set up drag and drop between grids
  setupDragAndDrop()
}

// Initialize on module load if DOM is available
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeRect()
}

// export for testing
export {
  initializeRect,
  initializeGridIfNeeded,
  initializePolyominoGridIfNeeded,
  rectDraw,
  rectCanvas,
  polyGrid,
  updateButtonStates,
  applyTransform,
  computePreviewCells,
  drawLineBetween,
  setTool,
  getButtonStates,
  setButtonStates
}
