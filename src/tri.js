import { TriDraw } from './ui/triangle/triDraw.js'
import { TriCanvas } from './ui/triangle/TriCanvas.js'

// Create TriDraw instance with canvas ID, side length, and drawing parameters
// use a larger grid size (side = 12)
const triDraw = new TriDraw('c', 12, 300, 300, 25)

// Create TriCanvas controller to manage UI
let triCanvas = null

// Initialize canvas controller when DOM is ready
function initializeTriCanvas () {
  if (triCanvas) return
  if (typeof document === 'undefined') return

  triCanvas = new TriCanvas('c', triDraw)
  triCanvas.initializeAll()
}

// Set example shape with triangular coords
triDraw.setBitsFromCoords([
  [0, 0],
  [1, 0],
  [1, 1]
])

// ============================================================================
// CONCEPT: DELEGATION TO TRICANVAS
// ============================================================================

/**
 * Delegation functions for backward compatibility and testing
 */
function updateButtons () {
  if (triCanvas) triCanvas.updateButtonStates()
}

function setMorphologyButtons ({ dilate, erode, cross }) {
  if (!triCanvas) return
  if (dilate) triCanvas.dilateBtn = dilate
  if (erode) triCanvas.erodeBtn = erode
  if (cross) triCanvas.crossBtn = cross
}

function computeMorphChanged (op) {
  if (!triCanvas) return false
  return triCanvas.computeMorphChanged(op)
}

function computeTriMorphState (op) {
  if (!triCanvas) return false
  return triCanvas.computeMorphChanged(op)
}

function applyTransform (mapIndex) {
  if (triCanvas) triCanvas.applyTransform(mapIndex)
}

/**
 * Wire line action dropdown (set, clear, toggle)
 */
function wireLineActionDropdown () {
  if (typeof document === 'undefined') return
  const dropdown = document.getElementById('tri-line-action')
  if (!dropdown) return

  const updateAction = function (e) {
    const value = e.target?.value || this.value
    if (value === 'set' || value === 'clear' || value === 'toggle') {
      currentAction = value
    }
  }

  dropdown.addEventListener('change', updateAction)
  dropdown.addEventListener('input', updateAction)
}

/**
 * Update the hover info label with coordinates, index, and neighbor count
 */
function updateTriHoverInfo (e) {
  if (!triDraw) return
  const hoverLabel = document.getElementById('tri-hover-info')
  if (!hoverLabel) return

  const rect = triDraw.canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top
  const [r, c] = pixelToTri(
    px - triDraw.offsetX,
    py - triDraw.offsetY,
    triDraw.triSize
  )

  if (!triDraw.indexer.isValid(r, c)) {
    hoverLabel.textContent = 'Hover info: '
    return
  }

  const idx = triDraw.indexer.index(r, c)
  const neighbors = Array.from(triDraw.indexer.neighbors(r, c))
  const validNeighbors = neighbors.filter(([nr, nc]) =>
    triDraw.indexer.isValid(nr, nc)
  ).length

  hoverLabel.textContent = `Hover info: (${r}, ${c}) index: ${idx} neighbors: ${validNeighbors}`
}

// ============================================================================
// CONCEPT: LINE TOOL HANDLING
// ============================================================================

// Line/ray/full tool state variables
let currentTool = null // 'segment' | 'ray' | 'full'
let currentAction = 'set' // 'set' | 'clear' | 'toggle'
let lineStart = null
triDraw.previewCells = []

// Override toggleCell to respect action dropdown and avoid tool conflicts
const origToggleTri = triDraw.toggleCell.bind(triDraw)
triDraw.toggleCell = function (idx) {
  // when a line tool is active, don't toggle cells directly
  if ((triCanvas && triCanvas.currentTool) || currentTool) return

  // Apply currentAction to single cell
  const mask = this.mask
  if (currentAction === 'set') {
    mask.bits = mask.setIndex(idx, 1)
  } else if (currentAction === 'clear') {
    mask.bits = mask.setIndex(idx, 0)
  } else if (currentAction === 'toggle') {
    let val
    if (typeof mask.bits === 'bigint') {
      val = Number((mask.bits >> BigInt(idx)) & 1n)
    } else {
      val = mask.atIndex ? mask.atIndex(idx) : (mask.bits >> idx) & 1
    }
    mask.bits = mask.setIndex(idx, val ? 0 : 1)
  }

  this.setBits(mask.bits)
  if (typeof this.redraw === 'function') this.redraw()
  updateButtons()
}

// Enhance hover drawing for preview cells
{
  const origDrawHover = triDraw._drawHover.bind(triDraw)
  triDraw._drawHover = function () {
    if (this.previewCells?.length) {
      for (const i of this.previewCells) {
        const [r, c] = this.indexer.location(i)
        const { x, y } = triToPixel(r, c, this.triSize)
        const orient = c % 2 === 0 ? 'up' : 'down'
        let yoff = y
        if (orient === 'down') yoff -= this.triHeight * 0.3
        drawTri(
          this.ctx,
          x + this.offsetX,
          yoff + this.offsetY,
          this.triSize,
          '#FF9800',
          '#333',
          orient
        )
      }
    }
    origDrawHover()
  }
}

/**
 * Compute line preview cells based on current tool type and endpoints
 */
function computePreviewIndices (startIdx, endIdx) {
  if (startIdx == null || endIdx == null) return []
  if (!currentTool) return []

  const indexer = triDraw.indexer
  const [sr, sc] = indexer.location(startIdx)
  const [er, ec] = indexer.location(endIdx)
  let coords = []

  switch (currentTool) {
    case 'segment':
      coords = Array.from(indexer.segmentTo(sr, sc, er, ec))
      break
    case 'ray':
      coords = Array.from(indexer.ray(sr, sc, er, ec))
      break
    case 'full':
      coords = Array.from(indexer.fullLine(sr, sc, er, ec))
      break
    default:
      return []
  }

  const inds = []
  for (const item of coords) {
    const r = item[0]
    const c = item[1]
    const i = indexer.index(r, c)
    if (i !== undefined) inds.push(i)
  }
  return inds
}

/**
 * Draw a line of cells from start to end index, applying the current action
 */
function drawLineBetween (startIdx, endIdx) {
  const mask = triDraw.mask
  const inds = computePreviewIndices(startIdx, endIdx)

  for (const i of inds) {
    if (currentAction === 'set') {
      mask.bits = mask.setIndex(i, 1)
    } else if (currentAction === 'clear') {
      mask.bits = mask.setIndex(i, 0)
    } else if (currentAction === 'toggle') {
      let val
      if (typeof mask.bits === 'bigint') {
        val = Number((mask.bits >> BigInt(i)) & 1n)
      } else {
        val = mask.atIndex ? mask.atIndex(i) : (mask.bits >> i) & 1
      }
      mask.bits = mask.setIndex(i, val ? 0 : 1)
    }
  }

  // Ensure the draw layer matches the mask and refresh UI
  triDraw.setBits(mask.bits)
  if (typeof triDraw.redraw === 'function') triDraw.redraw()
  updateButtons()
}

/**
 * Set current line tool
 */
function setTool (tool) {
  if (triCanvas) triCanvas.setTool(tool)
  currentTool = tool
  lineStart = null
  if (triDraw) triDraw.previewCells = []
}

// Initialize on module load if DOM is available
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeTriCanvas()
}

// Fallback canvas listeners when TriCanvas is not available
if (!triCanvas && !triDraw.canvas.__lineToolsListenersAttached) {
  triDraw.canvas.__lineToolsListenersAttached = true

  const onCanvasMouseMove = e => {
    // Update hover info label
    updateTriHoverInfo(e)

    if (!currentTool || lineStart == null) return
    const rect = triDraw.canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const [r, c] = pixelToTri(
      px - triDraw.offsetX,
      py - triDraw.offsetY,
      triDraw.triSize
    )
    if (!triDraw.indexer.isValid(r, c)) return
    const hit = triDraw.indexer.index(r, c)
    triDraw.previewCells = computePreviewIndices(lineStart, hit)
    triDraw.redraw()
  }

  const onCanvasClick = e => {
    if (!currentTool) return
    const rect = triDraw.canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const [r, c] = pixelToTri(
      px - triDraw.offsetX,
      py - triDraw.offsetY,
      triDraw.triSize
    )
    if (!triDraw.indexer.isValid(r, c)) return
    const hit = triDraw.indexer.index(r, c)
    if (hit == null) return

    // Two-point drawing: first click sets start, second click draws line
    if (lineStart == null) {
      lineStart = hit
      triDraw.previewCells = []
      triDraw.redraw()
    } else {
      drawLineBetween(lineStart, hit)
      lineStart = null
      triDraw.previewCells = []
      triDraw.redraw()
      updateButtons()
    }
  }

  triDraw.canvas.addEventListener('mousemove', onCanvasMouseMove)
  triDraw.canvas.addEventListener('click', onCanvasClick)
}

// exports for testing
export {
  triDraw,
  triCanvas,
  updateButtons,
  applyTransform,
  computeMorphChanged,
  computeTriMorphState,
  setMorphologyButtons
}
