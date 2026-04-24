import { RectDraw } from './ui/rectangle/rectdraw.js'
import { RectCanvas } from './ui/rectangle/RectCanvas.js'
import { RectIndex } from './grid/rectangle/RectIndex.js'
import { PolyominoGridManager } from './ui/rectangle/polyominoGrid.js'
import { Delay } from './core/Delay.js'

const DEFAULT_CELL_SIZE = 50
const GRID_OFFSET_X = 50
const GRID_OFFSET_Y = 50
const GRID_WIDTH = 10
const GRID_HEIGHT = 10

let rectDraw = null
let rectCanvas = null
let polyGrid = null
let draggedPolyominoId = null
let dropPreviewData = null

/**
 * @typedef {Object} GridCoords
 * @property {number} gridX
 * @property {number} gridY
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} DropPreviewData
 * @property {number} gridX
 * @property {number} gridY
 * @property {number} width
 * @property {number} height
 * @property {Array<unknown>} cells
 */

/**
 * @typedef {Object} Polyomino
 * @property {number} width
 * @property {number} height
 * @property {function(number, number): boolean} at
 * @property {function(): IterableIterator<[number, number]>} allXYlocations
 */

/**
 * @typedef {Object} DragData
 * @property {number} polyId
 * @property {number} polyIndex
 * @property {number} width
 * @property {number} height
 * @property {Array<unknown>} cells
 */

/**
 * @returns {boolean}
 */
function isBrowser () {
  return typeof document !== 'undefined'
}

/**
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function getElement (id) {
  if (!isBrowser()) return null
  return document.getElementById(id)
}

/**
 * @param {string} id
 * @returns {HTMLCanvasElement|null}
 */
function getCanvas (id) {
  const element = getElement(id)
  return element instanceof HTMLCanvasElement ? element : null
}

/**
 * @param {HTMLElement|null} element
 * @param {string} type
 * @param {EventListenerOrEventListenerObject} listener
 */
function addEventListenerIfExists (element, type, listener) {
  if (element && typeof element.addEventListener === 'function') {
    element.addEventListener(type, listener)
  }
}

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

function withRectCanvas (callback) {
  if (rectCanvas) callback(rectCanvas)
}

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
  withRectCanvas(canvas => canvas.updateButtonStates())
}

/**
 * Apply transform operation - delegates to rectCanvas
 */
function applyTransform (mapName) {
  initializeGridIfNeeded()
  withRectCanvas(canvas => canvas.applyTransform(mapName))
}

/**
 * Apply morphology operation - delegates to rectCanvas
 */
function applyMorphology (operation) {
  withRectCanvas(canvas => canvas.applyMorphology(operation))
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
  withRectCanvas(canvas => canvas.completeLine(start, end))
}

/**
 * Set current tool - delegates to rectCanvas
 */
function setTool (tool) {
  initializeGridIfNeeded()
  withRectCanvas(canvas => canvas.setTool(tool))
}

/**
 * Main initialization function callable by tests after DOM is ready
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
 * Wire coordinate mode radio buttons
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
 * Get the color for a polyomino based on its ID
 * @param {number} polyominoId - The ID of the polyomino
 * @returns {string} The color string
 */
function getPolyominoColor (polyominoId) {
  if (!polyGrid || polyominoId <= 0) return '#4ecdc4'
  const colorIndex = (polyominoId - 1) % polyGrid.polyominoColors.length
  return polyGrid.polyominoColors[colorIndex]
}

/**
 * Create a canvas with appropriate size for the polyomino
 * @param {Polyomino} polyomino - The polyomino to size for
 * @param {number} cellSize - Size of each cell
 * @returns {HTMLCanvasElement} The created canvas
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
 * Draw the polyomino on the canvas
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Polyomino} polyomino - The polyomino to draw
 * @param {number} cellSize - Size of each cell
 * @param {string} color - The fill color
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
 * Style the drag image canvas
 * @param {HTMLCanvasElement} canvas - The canvas to style
 */
function styleDragCanvas (canvas) {
  canvas.style.position = 'absolute'
  canvas.style.left = '-9999px'
  canvas.style.top = '-9999px'
}

/**
 * Append canvas to body and schedule cleanup
 * @param {HTMLCanvasElement} canvas - The canvas to append and clean up
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
 * Helper: Create a drag image canvas showing only the polyomino
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
 * Helper: Draw preview of where polyomino will land
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
    const x = cell[0] === undefined ? cell : cell[0]
    const y =
      cell[1] === undefined ? (Array.isArray(cell) ? cell[0] : 0) : cell[1]
    return [coords.gridX + x, coords.gridY + y]
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
 * Helper: Clear drop preview
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
 * Set up drag and drop between polyomino grid and main rect grid
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
 * @param {DataTransfer} dataTransfer
 * @returns {DragData|null}
 */
function parseDragData (dataTransfer) {
  try {
    return JSON.parse(dataTransfer.getData('application/json'))
  } catch {
    return null
  }
}

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

function handlePolyCanvasDragEnd (event) {
  event.currentTarget.style.opacity = '1'
  draggedPolyominoId = null
}

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

function handleTargetCanvasDragEnter (event) {
  event.preventDefault()
  event.currentTarget.style.backgroundColor = 'rgba(100, 150, 255, 0.1)'
}

function handleTargetCanvasDragLeave (event) {
  if (event.target === event.currentTarget) {
    event.currentTarget.style.backgroundColor = ''
    clearDropPreview()
  }
}

function handleTargetCanvasDrop (event) {
  event.preventDefault()
  event.stopPropagation()
  event.currentTarget.style.opacity = '1'
  event.currentTarget.style.backgroundColor = ''
  clearDropPreview()

  const dragData = parseDragData(event.dataTransfer)
  if (!dragData || dragData.polyId === undefined) return

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

  if (rectDraw.mask.canPlacePolyomino) {
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
    const poly = sourcePoly.poly
    if (
      coords.gridX < 0 ||
      coords.gridY < 0 ||
      coords.gridX + poly.width > rectDraw.width ||
      coords.gridY + poly.height > rectDraw.height
    ) {
      return
    }

    for (const [px, py] of poly.allXYlocations()) {
      if (!poly.at(px, py)) continue

      const gx = coords.gridX + px
      const gy = coords.gridY + py
      if (rectDraw.mask.at(gx, gy) !== 0) {
        return
      }
    }
  }

  const poly = sourcePoly.poly
  for (const [px, py] of poly.allXYlocations()) {
    if (!poly.at(px, py)) continue
    rectDraw.mask.set(coords.gridX + px, coords.gridY + py, 1)
  }

  if (rectDraw.redraw) {
    rectDraw.redraw()
  }
}

/**
 * Wire polyomino grid controls
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
        polyGrid.polyominoSize = parseInt(target.value)
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
      if (polyGrid) polyGrid.fillGrid()
    })
  }

  const prevButton = getElement('prev-poly-grid')
  if (prevButton) {
    addEventListenerIfExists(prevButton, 'click', () => {
      initializePolyominoGridIfNeeded()
      if (polyGrid && polyGrid.prevPolyomino) polyGrid.prevPolyomino()
    })
  }

  const nextButton = getElement('next-poly-grid')
  if (nextButton) {
    addEventListenerIfExists(nextButton, 'click', () => {
      initializePolyominoGridIfNeeded()
      if (polyGrid && polyGrid.nextPolyomino) polyGrid.nextPolyomino()
    })
  }

  setupDragAndDrop()
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeRect()
}

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
