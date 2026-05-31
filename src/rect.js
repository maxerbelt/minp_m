import { RectDraw } from './ui/rectangle/rectdraw.js'
import { RectCanvas } from './ui/rectangle/RectCanvas.js'
import { RectIndex } from './grid/rectangle/RectIndex.js'
import { PolyominoGridManager } from './ui/rectangle/polyominoGrid.js'
import { Delay } from './core/Delay.js'

/**
 * @fileoverview Rectangular Grid Integration Module
 * @description Manages RectDraw and RectCanvas instances for rectangular grid interaction.
 * Provides polyomino grid management, drag-and-drop placement, and visual previews.
 * Supports coordinate modes, transforms, and connectivity-based polyomino generation.
 *
 * **Responsibilities**:
 * - Initialize and manage RectDraw rendering layer
 * - Initialize and manage RectCanvas UI interaction layer
 * - Initialize and manage PolyominoGridManager for polyomino visualization
 * - Handle drag-and-drop between polyomino and main grids
 * - Draw drop previews and validate placements
 * - Wire all interactive controls and event handlers
 *
 * **Architecture**:
 * - Singleton instances of RectDraw, RectCanvas, and PolyominoGridManager
 * - Lazy initialization on first use or DOM ready
 * - Automatic UI event wiring for buttons, dropdowns, and canvas events
 *
 * @module rect
 */

/** Default cell size in pixels for grid rendering */
const DEFAULT_CELL_SIZE = 50
/** Horizontal offset of grid from canvas left edge in pixels */
const GRID_OFFSET_X = 50
/** Vertical offset of grid from canvas top edge in pixels */
const GRID_OFFSET_Y = 50
/** Default grid width in cells */
const GRID_WIDTH = 10
/** Default grid height in cells */
const GRID_HEIGHT = 10

/**
 * Singleton instance of RectDraw rendering layer.
 * Initialized on first use in grid operations.
 * @type {RectDraw|null}
 */
let rectDraw = null

/**
 * Singleton instance of RectCanvas UI interaction layer.
 * Initialized on first use in grid operations.
 * @type {RectCanvas|null}
 */
let rectCanvas = null

/**
 * Singleton instance of PolyominoGridManager.
 * Manages available polyominoes and their display.
 * @type {PolyominoGridManager|null}
 */
let polyGrid = null

/**
 * ID of the currently dragged polyomino during drag-and-drop.
 * Null when no drag is in progress.
 * @type {number|null}
 */
let draggedPolyominoId = null

/**
 * Current drop preview data showing where polyomino will be placed.
 * Null when no preview is active.
 * @type {DropPreviewData|null}
 */
let dropPreviewData = null

/**
 * @typedef {Object} GridCoords
 * @description Represents grid and canvas coordinates for a point.
 * @property {number} gridX - X coordinate in grid cells
 * @property {number} gridY - Y coordinate in grid cells
 * @property {number} x - X position relative to grid origin in pixels
 * @property {number} y - Y position relative to grid origin in pixels
 */

/**
 * @typedef {Object} DropPreviewData
 * @description Data for visualizing where a polyomino will be placed.
 * @property {number} gridX - Target grid X position in cells
 * @property {number} gridY - Target grid Y position in cells
 * @property {number} width - Width of polyomino in cells
 * @property {number} height - Height of polyomino in cells
 * @property {Array<unknown>} cells - Array of cell coordinates
 */

/**
 * @typedef {Object} Polyomino
 * @description Represents a polyomino shape.
 * @property {number} width - Bounding box width
 * @property {number} height - Bounding box height
 * @property {function(number, number): boolean} at - Test if cell at (x,y) is occupied
 * @property {function(): IterableIterator<[number, number]>} allXYlocations - Iterator over all cell coordinates
 */

/**
 * @typedef {Object} DragData
 * @description Data transferred during drag-and-drop of polyominoes.
 * @property {number} polyId - Unique ID of the polyomino
 * @property {number} polyIndex - Index in polyominoes array
 * @property {number} width - Polyomino width
 * @property {number} height - Polyomino height
 * @property {Array<unknown>} cells - Cell coordinate data
 */

/**
 * Check if running in a browser environment.
 * Determines if DOM APIs (document, window) are available.
 * Safe to call in Node.js or other non-browser environments.
 *
 * **Usage**: Guard function calls that depend on DOM availability.
 *
 * @returns {boolean} True if document global is defined, false otherwise
 */
function isBrowser () {
  return typeof document !== 'undefined'
}

/**
 * Safely retrieve a DOM element by ID.
 * Returns null if not in browser environment or element doesn't exist.
 * Prevents errors when called in Node.js or when element is missing.
 *
 * @param {string} id - The element ID to retrieve
 * @returns {HTMLElement|null} The element if found, null otherwise
 */
function getElement (id) {
  if (!isBrowser()) return null
  return document.getElementById(id)
}

/**
 * Safely retrieve a canvas element by ID.
 * Validates that retrieved element is actually an HTMLCanvasElement.
 * Returns null if not in browser, element not found, or wrong element type.
 *
 * **Type Safety**: Uses instanceof check to verify canvas type.
 *
 * @param {string} id - The element ID to retrieve
 * @returns {HTMLCanvasElement|null} The canvas element if found and valid, null otherwise
 */
function getCanvas (id) {
  const element = getElement(id)
  return element instanceof HTMLCanvasElement ? element : null
}

/**
 * Conditionally add an event listener only if element exists.
 * Safely handles null/undefined elements without throwing errors.
 * Uses optional chaining to prevent null reference errors.
 *
 * **Side Effects**: Attaches event listener to element if it exists.
 *
 * @param {HTMLElement|null} element - The element to attach listener to
 * @param {string} type - The event type name (e.g., 'click', 'change', 'dragstart')
 * @param {EventListener} listener - The event listener function to attach
 * @returns {void}
 */
function addEventListenerIfExists (element, type, listener) {
  element?.addEventListener(type, listener)
}

/**
 * Initialize the rectangular grid if not already initialized.
 * Creates RectDraw rendering layer and RectCanvascolor UI wrapper.
 * Idempotent - safe to call multiple times.
 *
 * **Initialization Flow**:
 * 1. Check if already initialized (early return if true)
 * 2. Create RectDraw instance with grid configuration
 * 3. Create RectCanvas UI wrapper around RectDraw
 *
 * **Side Effects**:
 * - Sets global rectDraw instance
 * - Sets global rectCanvas instance
 *
 * @returns {void}
 */
function initializeGridIfNeeded () {
  if (rectDraw) return // Already initialized

  rectDraw = new RectDraw(
    'rect-c',
    GRID_WIDTH,
    GRID_HEIGHT,
    DEFAULT_CELL_SIZE,
    GRID_OFFSET_X,
    GRID_OFFSET_Y
  )
  rectCanvas = new RectCanvas('rect-c', rectDraw, {
    width: GRID_WIDTH,
    height: GRID_HEIGHT
  })
}

/**
 * Initialize the polyomino grid if not already initialized.
 * Creates PolyominoGridManager for polyomino visualization and interaction.
 * Idempotent - safe to call multiple times.
 *
 * **Initialization Flow**:
 * 1. Check if already initialized (early return if true)
 * 2. Create PolyominoGridManager instance with grid configuration
 *
 * **Side Effects**:
 * - Sets global polyGrid instance
 *
 * @returns {void}
 */
function initializePolyominoGridIfNeeded () {
  if (polyGrid) return

  polyGrid = new PolyominoGridManager(
    'rect-poly',
    GRID_WIDTH,
    GRID_HEIGHT,
    DEFAULT_CELL_SIZE,
    GRID_OFFSET_X,
    GRID_OFFSET_Y
  )
}

/**
 * Execute a callback with the rect canvas if it's initialized.
 * Provides safe access to rectCanvas without null checks in caller.
 *
 * **Pattern**: Higher-order function for safe component access.
 *
 * @param {function(RectCanvas): void} callback - Function to execute with canvas
 * @returns {void}
 */
function withRectCanvas (callback) {
  if (rectCanvas) callback(rectCanvas)
}

/**
 * Get the current state of canvas tool buttons and controls.
 * Retrieves tool state from RectCanvas without direct access.
 *
 * **Returns**: Object with null-safe property values. If rectCanvas is not
 * initialized, returns empty object.
 *
 * @returns {Object} Object containing tool state properties
 * @returns {string} [return.currentTool] The currently active drawing tool
 * @returns {?Array<number>} [return.lineStart] Starting point for line tools (if set)
 * @returns {string} [return.currentAction] Current action being performed
 * @returns {string} [return.coverType] Current coverage type for operations
 */
function getButtonStates () {
  if (!rectCanvas) return {}
  return {
    currentTool: rectCanvas.currentTool,
    lineStart: rectCanvas.lineStart,
    currentAction: rectCanvas.currentAction,
    coverType: rectCanvas.coverType
  }
}

/**
 * Set the state of canvas tool buttons and controls.
 * Updates tool state in RectCanvas. Only updates properties that are provided.
 *
 * **Side Effects**: Modifies RectCanvas internal state.
 *
 * @param {Object} states - Object containing tool state properties to update
 * @param {string} [states.currentTool] The drawing tool to activate
 * @param {?Array<number>} [states.lineStart] Starting point for line tools
 * @param {string} [states.currentAction] Action to perform
 * @param {string} [states.coverType] Coverage type to set
 * @returns {void}
 */
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
 * Update button states in the UI.
 * Delegates to RectCanvas to refresh button visual state based on internal state.
 *
 * **Side Effects**: Triggers UI update in RectCanvas.
 *
 * @returns {void}
 */
function updateButtonStates () {
  withRectCanvas(canvas => canvas.updateButtonStates())
}

/**
 * Apply a transform operation to the grid.
 * Performs a map transformation (rotation, flip, etc.) on the current grid.
 *
 * **Side Effects**:
 * - Initializes grid if needed
 * - Modifies grid state through transform
 *
 * @param {string} mapName - Name of the map/transform to apply
 * @returns {void}
 */
function applyTransform (mapName) {
  initializeGridIfNeeded()
  withRectCanvas(canvas => canvas.applyTransform(mapName))
}

/**
 * Compute preview of cells affected by a draw operation.
 * Calculates which cells would be affected if drawing between two points.
 *
 * **Precondition**: Initializes grid if needed.
 *
 * @param {GridCoords} start - Starting coordinate
 * @param {GridCoords} end - Ending coordinate
 * @returns {Array<Array<number>>} Array of [x, y] cell coordinates that would be affected
 */
function computePreviewCells (start, end) {
  initializeGridIfNeeded()
  if (!rectCanvas) return []
  return rectCanvas.computePreviewCells(start, end)
}

/**
 * Draw a line between two points on the canvas.
 * Completes a line drawing operation with visual feedback.
 *
 * **Side Effects**: Modifies grid state, triggers redraw.
 *
 * @param {GridCoords} start - Starting coordinate
 * @param {GridCoords} end - Ending coordinate
 * @returns {void}
 */
function drawLineBetween (start, end) {
  withRectCanvas(canvas => canvas.completeLine(start, end))
}

/**
 * Set the current drawing tool for subsequent operations.
 * Activates a specific tool in the RectCanvas.
 *
 * **Precondition**: Initializes grid if needed.
 * **Side Effects**: Changes active tool state, may trigger UI updates.
 *
 * @param {string} tool - The tool to activate (e.g., 'line', 'rect', 'circle')
 * @returns {void}
 */
function setTool (tool) {
  initializeGridIfNeeded()
  withRectCanvas(canvas => canvas.setTool(tool))
}

/**
 * Populate the polyomino connectivity dropdown with available options.
 * Retrieves connectivity options from RectIndex and populates the UI dropdown.
 * @function
 * @returns {void}
 */
function populateConnectivityDropdown () {
  if (!isBrowser()) return

  const dropdown = getElement('poly-connectivity')
  if (!(dropdown instanceof HTMLSelectElement)) return

  const rectIndex = new RectIndex(1, 1)
  dropdown.innerHTML = Object.keys(rectIndex.connection)
    .map(
      key => `
      <option value="${key}" ${key === '4' ? 'selected' : ''}>
        ${key}
      </option>
    `
    )
    .join('')
}

/**
 * Initialize the rectangle grid UI and all event handlers.
 * Sets up the main grid, polyomino grid, and wires all interactive elements.
 * @function
 * @returns {void}
 */
function initializeRect () {
  initializeGridIfNeeded()
  initializePolyominoGridIfNeeded()

  if (rectDraw && rectCanvas) {
    rectCanvas.initializeAll()
    wireCoordinateModeRadios()
  }

  populateConnectivityDropdown()
  wirePolyominoGridControls()
}

/**
 * Wire up coordinate mode radio button change events.
 * Attaches listeners to coordinate mode radio buttons for grid mode switching.
 * @function
 * @returns {void}
 */
function wireCoordinateModeRadios () {
  if (!isBrowser() || !rectDraw) return

  const radios = document.querySelectorAll('input[name="coord-mode"]')
  radios.forEach(radio => {
    addEventListenerIfExists(radio, 'change', event => {
      const target = /** @type {HTMLInputElement} */ (event.target)
      if (target.checked) {
        rectDraw.coordinateMode = target.value
      }
    })
  })
}

/**
 * Convert canvas/mouse event coordinates to grid coordinates
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} clientX - Mouse client X coordinate
 * @param {number} clientY - Mouse client Y coordinate
 * @param {number} cellSize - Size of each grid cell in pixels
 * @param {number} offsetX - Horizontal offset of grid from canvas edge
 * @param {number} offsetY - Vertical offset of grid from canvas edge
 * @returns {GridCoords} Grid coordinates and relative positions
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
 * Get the color for a polyomino based on its ID using the color palette.
 * Cycles through available colors based on polyomino ID.
 * @function
 * @param {number} polyominoId - The ID of the polyomino
 * @returns {string} The color string (hex format)
 */
function getPolyominoColor (polyominoId) {
  if (!polyGrid || polyominoId <= 0) return '#4ecdc4'
  const colorIndex = (polyominoId - 1) % polyGrid.polyominoColors.length
  return polyGrid.polyominoColors[colorIndex]
}

/**
 * Create a canvas with appropriate dimensions for the polyomino.
 * Includes padding and enforces minimum canvas size.
 * @function
 * @param {Polyomino} polyomino - The polyomino to size for
 * @param {number} cellSize - Size of each cell in pixels
 * @returns {HTMLCanvasElement} The created canvas element
 */
function createDragCanvas (polyomino, cellSize) {
  const padding = 8
  const canvasWidth = Math.max(polyomino.width * cellSize + padding * 2, 32)
  const canvasHeight = Math.max(polyomino.height * cellSize + padding * 2, 32)
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  return canvas
}

/**
 * Draw the polyomino on a canvas with padding and grid lines.
 * Renders each occupied cell with fill and stroke styling.
 * @function
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Polyomino} polyomino - The polyomino to draw
 * @param {number} cellSize - Size of each cell in pixels
 * @param {string} color - The fill color for the polyomino cells
 * @returns {void}
 */
function drawPolyominoOnCanvas (ctx, polyomino, cellSize, color) {
  const padding = 8
  ctx.fillStyle = color
  for (const [x, y] of polyomino.allXYlocations()) {
    if (!polyomino.at(x, y)) continue
    const canvasX = padding + x * cellSize
    const canvasY = padding + y * cellSize
    ctx.fillRect(canvasX, canvasY, cellSize, cellSize)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(canvasX, canvasY, cellSize, cellSize)
  }
}

/**
 * Style the drag image canvas for hidden placement.
 * Positions the canvas off-screen to keep drag image invisible.
 * @function
 * @param {HTMLCanvasElement} canvas - The canvas to style
 * @returns {void}
 */
function styleDragCanvas (canvas) {
  canvas.style.position = 'absolute'
  canvas.style.left = '-9999px'
  canvas.style.top = '-9999px'
}

/**
 * Append canvas to body and schedule cleanup after a short delay.
 * Ensures the canvas is cleaned up from the DOM after use.
 * @function
 * @param {HTMLCanvasElement} canvas - The canvas to append and clean up
 * @returns {void}
 */
function appendAndScheduleCleanup (canvas) {
  document.body.appendChild(canvas)
  ;(async () => {
    await Delay.wait(100)
    if (canvas.parentNode === document.body) {
      canvas.remove()
    }
  })()
}

/**
 * Create a drag image canvas showing only the polyomino.
 * Generates a styled canvas for the drag-and-drop operation.
 * @function
 * @param {Polyomino} polyomino - The polyomino to draw
 * @param {number} polyominoId - The ID of the polyomino for coloring
 * @param {number} [cellSize=DEFAULT_CELL_SIZE] - Size of each cell
 * @returns {HTMLCanvasElement} The drag image canvas
 */
function createPolyominoDragImage (
  polyomino,
  polyominoId,
  cellSize = DEFAULT_CELL_SIZE
) {
  const canvas = createDragCanvas(polyomino, cellSize)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const color = getPolyominoColor(polyominoId)
  drawPolyominoOnCanvas(ctx, polyomino, cellSize, color)
  styleDragCanvas(canvas)
  appendAndScheduleCleanup(canvas)
  return canvas
}

/**
 * Draw a visual preview of where the polyomino will be placed.
 * Shows a semi-transparent overlay indicating drop location.
 * @function
 * @param {HTMLCanvasElement} canvas - The target canvas
 * @param {DragData} dragData - The dragged polyomino data
 * @param {number} clientX - Mouse client X coordinate
 * @param {number} clientY - Mouse client Y coordinate
 * @returns {void}
 */
function drawDropPreview (canvas, dragData, clientX, clientY) {
  if (!rectDraw || !rectCanvas) return

  const coords = getGridCoordsFromEvent(
    canvas,
    clientX,
    clientY,
    DEFAULT_CELL_SIZE,
    GRID_OFFSET_X,
    GRID_OFFSET_Y
  )

  dropPreviewData = {
    gridX: coords.gridX,
    gridY: coords.gridY,
    width: dragData.width,
    height: dragData.height,
    cells: dragData.cells
  }

  if (!rectCanvas.grid) return

  rectCanvas.grid.previewCells = dragData.cells.map(cell => {
    const cellX = Array.isArray(cell) ? cell[0] : cell
    let cellY = 0
    if (Array.isArray(cell) && cell[1] != null) {
      cellY = cell[1]
    }
    return [coords.gridX + cellX, coords.gridY + cellY]
  })

  if (!rectCanvas._origDrawHover) {
    rectCanvas._origDrawHover = rectCanvas.grid._drawHover
    rectCanvas.grid._drawHover = function () {
      if (!this.previewCells?.length) return

      for (const [x, y] of this.previewCells) {
        const ctx = this.canvas.getContext('2d')
        ctx.fillStyle = 'rgba(100, 200, 255, 0.4)'
        ctx.strokeStyle = 'rgba(0, 120, 250, 0.8)'
        ctx.lineWidth = 2
        const canvasX = GRID_OFFSET_X + x * DEFAULT_CELL_SIZE + 1
        const canvasY = GRID_OFFSET_Y + y * DEFAULT_CELL_SIZE + 1
        ctx.fillRect(
          canvasX,
          canvasY,
          DEFAULT_CELL_SIZE - 2,
          DEFAULT_CELL_SIZE - 2
        )
        ctx.strokeRect(
          canvasX,
          canvasY,
          DEFAULT_CELL_SIZE - 2,
          DEFAULT_CELL_SIZE - 2
        )
      }
    }
  }

  rectCanvas.grid.redraw()
}

/**
 * Clear the drop preview from the canvas.
 * Removes preview cells and restores original drawing behavior.
 * @function
 * @returns {void}
 */
function clearDropPreview () {
  if (!dropPreviewData || !rectCanvas?.grid) return

  dropPreviewData = null
  rectCanvas.grid.previewCells = []

  if (rectCanvas._origDrawHover) {
    rectCanvas.grid._drawHover = rectCanvas._origDrawHover
    rectCanvas._origDrawHover = null
  }

  rectCanvas.grid.redraw()
}

/**
 * Set up drag and drop event handlers between polyomino and main grids
 * @returns {void}
 */
function setupDragAndDrop () {
  if (!isBrowser()) return

  const sourceCanvas = getCanvas('rect-poly')
  const targetCanvas = getCanvas('rect-c')
  if (!sourceCanvas || !targetCanvas) return

  sourceCanvas.addEventListener('mousedown', handlePolyCanvasMouseDown)
  sourceCanvas.addEventListener('dragstart', handlePolyCanvasDragStart)
  sourceCanvas.addEventListener('dragend', handlePolyCanvasDragEnd)

  targetCanvas.addEventListener('dragover', handleTargetCanvasDragOver)
  targetCanvas.addEventListener('dragenter', handleTargetCanvasDragEnter)
  targetCanvas.addEventListener('dragleave', handleTargetCanvasDragLeave)
  targetCanvas.addEventListener('drop', handleTargetCanvasDrop)
}

/**
 * Parse drag data from a DataTransfer object.
 * Safely extracts and parses polyomino data from drag events.
 * @function
 * @param {DataTransfer} dataTransfer - The data transfer object from drag event
 * @returns {DragData|null} Parsed drag data or null if invalid/unavailable
 */
function parseDragData (dataTransfer) {
  try {
    return JSON.parse(dataTransfer.getData('application/json'))
  } catch {
    return null
  }
}

/**
 * Handle mouse down event on polyomino canvas.
 * Records which polyomino was clicked for potential drag operation.
 * @function
 * @param {MouseEvent} event - The mouse event
 * @returns {void}
 */
function handlePolyCanvasMouseDown (event) {
  initializePolyominoGridIfNeeded()
  if (!polyGrid) return

  const coords = getGridCoordsFromEvent(
    /** @type {HTMLCanvasElement} */ (event.currentTarget),
    event.clientX,
    event.clientY,
    DEFAULT_CELL_SIZE,
    GRID_OFFSET_X,
    GRID_OFFSET_Y
  )

  const clickedPolyId = polyGrid.gridMask.at(coords.gridX, coords.gridY)
  draggedPolyominoId = clickedPolyId > 0 ? clickedPolyId : null
}

/**
 * Handle drag start event on polyomino canvas.
 * Sets up data transfer and visual feedback for the drag operation.
 * @function
 * @param {DragEvent} event - The drag event
 * @returns {void}
 */
function handlePolyCanvasDragStart (event) {
  if (draggedPolyominoId === null) {
    event.preventDefault()
    return
  }

  initializePolyominoGridIfNeeded()
  if (!polyGrid) {
    event.preventDefault()
    return
  }

  const poly = polyGrid.polyominoes.find(p => p.id === draggedPolyominoId)
  if (!poly) {
    event.preventDefault()
    return
  }

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(
    'application/json',
    JSON.stringify({
      polyId: draggedPolyominoId,
      polyIndex: polyGrid.polyominoes.indexOf(poly),
      width: poly.poly.width,
      height: poly.poly.height,
      cells: Array.from(poly.poly.allXYlocations())
    })
  )

  const dragImage = createPolyominoDragImage(poly.poly, draggedPolyominoId)
  const imageOffsetX = dragImage.width / 2
  const imageOffsetY = dragImage.height / 2
  event.dataTransfer.setDragImage(dragImage, imageOffsetX, imageOffsetY)
  event.currentTarget.style.opacity = '0.5'
}

/**
 * Handle drag end event on polyomino canvas.
 * Resets opacity and clears dragged polyomino tracking.
 * @function
 * @param {DragEvent} event - The drag event
 * @returns {void}
 */
function handlePolyCanvasDragEnd (event) {
  event.currentTarget.style.opacity = '1'
  draggedPolyominoId = null
}

/**
 * Handle drag over event on target canvas.
 * Updates visual feedback and preview while dragging over the target.
 * @function
 * @param {DragEvent} event - The drag event
 * @returns {void}
 */
function handleTargetCanvasDragOver (event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  event.currentTarget.style.opacity = '0.8'

  const dragData = parseDragData(event.dataTransfer)
  if (dragData) {
    drawDropPreview(
      /** @type {HTMLCanvasElement} */ (event.currentTarget),
      dragData,
      event.clientX,
      event.clientY
    )
  }
}

/**
 * Handle drag enter event on target canvas.
 * Provides visual feedback when dragged item enters drop target.
 * @function
 * @param {DragEvent} event - The drag event
 * @returns {void}
 */
function handleTargetCanvasDragEnter (event) {
  event.preventDefault()
  event.currentTarget.style.backgroundColor = 'rgba(100, 150, 255, 0.1)'
}

/**
 * Handle drag leave event on target canvas.
 * Clears visual feedback when dragged item leaves drop target.
 * @function
 * @param {DragEvent} event - The drag event
 * @returns {void}
 */
function handleTargetCanvasDragLeave (event) {
  if (event.target === event.currentTarget) {
    event.currentTarget.style.backgroundColor = ''
    clearDropPreview()
  }
}

/**
 * Validate if polyomino can be placed at the given position.
 * Checks bounds and collision detection.
 * @function
 * @param {Polyomino} poly - The polyomino to validate
 * @param {number} gridX - Target grid X position
 * @param {number} gridY - Target grid Y position
 * @returns {boolean} True if polyomino can be placed
 */
function validatePolyominoPlacement (poly, gridX, gridY) {
  // Check if custom placement validator exists
  if (rectDraw?.mask?.canPlacePolyomino) {
    return rectDraw.mask.canPlacePolyomino(poly, gridX, gridY)
  }

  // Perform default bounds and collision checking
  if (
    gridX < 0 ||
    gridY < 0 ||
    gridX + poly.width > rectDraw.width ||
    gridY + poly.height > rectDraw.height
  ) {
    return false
  }

  // Check for collisions with existing cells
  for (const [px, py] of poly.allXYlocations()) {
    if (!poly.at(px, py)) continue
    const gx = gridX + px
    const gy = gridY + py
    if (rectDraw.mask.at(gx, gy) !== 0) {
      return false
    }
  }

  return true
}

/**
 * Place a polyomino on the main grid at the given position.
 * Renders the polyomino on the grid canvas.
 * @function
 * @param {Polyomino} poly - The polyomino to place
 * @param {number} gridX - Target grid X position
 * @param {number} gridY - Target grid Y position
 * @returns {void}
 */
function placePolyominoOnGrid (poly, gridX, gridY) {
  for (const [px, py] of poly.allXYlocations()) {
    if (!poly.at(px, py)) continue
    rectDraw.mask.set(gridX + px, gridY + py, 1)
  }

  rectDraw.redraw?.()
}

/**
 * Handle drop event on target canvas - places polyomino on main grid.
 * Processes the drop event and places the polyomino if validation passes.
 * @function
 * @param {DragEvent} event - The drag event
 * @returns {void}
 */
function handleTargetCanvasDrop (event) {
  event.preventDefault()
  event.stopPropagation()
  event.currentTarget.style.opacity = '1'
  event.currentTarget.style.backgroundColor = ''
  clearDropPreview()

  const dragData = parseDragData(event.dataTransfer)
  if (!dragData?.polyId) return

  initializeGridIfNeeded()
  initializePolyominoGridIfNeeded()
  if (!rectDraw || !polyGrid) return

  const coords = getGridCoordsFromEvent(
    /** @type {HTMLCanvasElement} */ (event.currentTarget),
    event.clientX,
    event.clientY,
    DEFAULT_CELL_SIZE,
    GRID_OFFSET_X,
    GRID_OFFSET_Y
  )

  const sourcePoly = polyGrid.polyominoes.find(p => p.id === dragData.polyId)
  if (!sourcePoly) return

  if (
    !validatePolyominoPlacement(sourcePoly.poly, coords.gridX, coords.gridY)
  ) {
    return
  }

  placePolyominoOnGrid(sourcePoly.poly, coords.gridX, coords.gridY)
}

/**
 * Wire up all polyomino grid control event handlers.
 * Attaches listeners to all polyomino grid control buttons and dropdowns.
 * @function
 * @returns {void}
 */
function wirePolyominoGridControls () {
  if (!isBrowser()) return

  const connectivityDropdown = getElement('poly-connectivity')
  if (connectivityDropdown instanceof HTMLSelectElement) {
    addEventListenerIfExists(connectivityDropdown, 'change', event => {
      const target = /** @type {HTMLSelectElement} */ (event.target)
      if (polyGrid) {
        polyGrid.connectivity = target.value
        polyGrid.availablePolyominoes = []
        polyGrid.currentPolyominoIndex = 0
        polyGrid.loadPolyominoes()
        polyGrid.showPolyomino(0)
      }
    })
  }

  const sizeDropdown = getElement('poly-size')
  if (sizeDropdown instanceof HTMLSelectElement) {
    addEventListenerIfExists(sizeDropdown, 'change', event => {
      const target = /** @type {HTMLSelectElement} */ (event.target)
      if (polyGrid) {
        polyGrid.polyominoSize = Number.parseInt(target.value, 10)
        polyGrid.availablePolyominoes = []
        polyGrid.currentPolyominoIndex = 0
        polyGrid.loadPolyominoes()
        polyGrid.showPolyomino(0)
      }
    })
  }

  const fillButton = getElement('fill-poly-grid')
  if (fillButton) {
    addEventListenerIfExists(fillButton, 'click', () => {
      initializePolyominoGridIfNeeded()
      polyGrid?.fillGrid()
    })
  }

  const prevButton = getElement('prev-poly-grid')
  if (prevButton) {
    addEventListenerIfExists(prevButton, 'click', () => {
      initializePolyominoGridIfNeeded()
      polyGrid?.prevPolyomino?.()
    })
  }

  const nextButton = getElement('next-poly-grid')
  if (nextButton) {
    addEventListenerIfExists(nextButton, 'click', () => {
      initializePolyominoGridIfNeeded()
      polyGrid?.nextPolyomino?.()
    })
  }

  setupDragAndDrop()
}

if (globalThis?.document) {
  initializeRect()
}

/**
 * Module interface with getter accessors for singleton instances.
 * Prevents mutable exports while providing safe read-only access.
 * @type {Object}
 */
const moduleInterface = {
  /**
   * Get the RectDraw rendering layer instance.
   * Returns null if not yet initialized.
   * @returns {RectDraw|null}
   */
  get rectDraw () {
    return rectDraw
  },

  /**
   * Get the RectCanvas UI wrapper instance.
   * Returns null if not yet initialized.
   * @returns {RectCanvas|null}
   */
  get rectCanvas () {
    return rectCanvas
  },

  /**
   * Get the PolyominoGridManager instance.
   * Returns null if not yet initialized.
   * @returns {PolyominoGridManager|null}
   */
  get polyGrid () {
    return polyGrid
  }
}

export default moduleInterface

export {
  rectDraw,
  polyGrid,
  initializeRect,
  initializeGridIfNeeded,
  initializePolyominoGridIfNeeded,
  updateButtonStates,
  applyTransform,
  computePreviewCells,
  drawLineBetween,
  setTool,
  getButtonStates,
  setButtonStates
}
