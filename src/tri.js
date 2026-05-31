/**
 * @fileoverview Triangular grid with interactive drawing and line tool support.
 * Provides triangle rendering, cell manipulation, and line drawing tools (segment, ray, full line).
 *
 * @module tri
 */

import { TriDraw } from './ui/triangle/triDraw.js'
import { TriCanvas } from './ui/triangle/TriCanvas.js'
import { drawTri, triToPixel, pixelToTri } from './ui/triangle/triDrawHelper.js'

/**
 * TriDraw instance for rendering triangular grids.
 * @type {TriDraw}
 */
const triDraw = new TriDraw('c', 12, 300, 300, 25)

/**
 * TriCanvas controller instance for managing UI and interactions.
 * Lazily initialized when DOM is available.
 * @type {TriCanvas|null}
 */
const triCanvas = (() => {
  if (globalThis.window && globalThis.document) {
    const canvas = new TriCanvas('c', triDraw)
    canvas.initializeAll()
    return canvas
  }
  return null
})()

// Set example shape with triangular coords
triDraw.setBitsFromCoords([
  [0, 0],
  [1, 0],
  [1, 1]
])

/**
 * Line action handler for dropdown selection (set, clear, toggle).
 * @param {Event} e - The change/input event
 * @returns {void}
 */
function updateLineActionFromDropdown (e) {
  const value = e.target?.value || e.currentTarget?.value
  if (value === 'set' || value === 'clear' || value === 'toggle') {
    currentAction = value
  }
}

/**
 * Wire line action dropdown (set, clear, toggle) to update currentAction.
 * Handles both change and input events for compatibility.
 * @returns {void}
 */
function wireLineActionDropdown () {
  if (!globalThis.document) return
  const dropdown = globalThis.document.getElementById('tri-line-action')
  if (!dropdown) return

  dropdown.addEventListener('change', updateLineActionFromDropdown)
  dropdown.addEventListener('input', updateLineActionFromDropdown)
}

/**
 * Update the hover info label with coordinates, index, and neighbor count.
 * @param {MouseEvent} e - The mouse event with clientX/clientY properties
 * @returns {void}
 */
function updateTriHoverInfo (e) {
  if (!triDraw) return
  const hoverLabel = globalThis.document?.getElementById('tri-hover-info')
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
// CONCEPT: DELEGATION TO TRICANVAS FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Update button states by delegating to the canvas instance.
 * No-op if canvas instance is not available.
 * @returns {void}
 */
function updateButtons () {
  triCanvas?.updateButtonStates()
}

/**
 * Set morphology operation buttons (dilate, erode, cross) on the canvas instance.
 * Only sets buttons that are provided in the configuration object.
 * No-op if canvas instance is not available.
 * @param {Object} options - Morphology button configuration
 * @param {HTMLElement} [options.dilate] - The dilate button element
 * @param {HTMLElement} [options.erode] - The erode button element
 * @param {HTMLElement} [options.cross] - The cross morphology button element
 * @returns {void}
 */
function setMorphologyButtons ({ dilate, erode, cross }) {
  if (!triCanvas) return
  if (dilate) triCanvas.dilateBtn = dilate
  if (erode) triCanvas.erodeBtn = erode
  if (cross) triCanvas.crossBtn = cross
}

/**
 * Check if a morphology operation can be applied on the canvas.
 * @param {string} op - The morphology operation to check
 * @returns {boolean} True if the operation can be applied
 */
function computeMorphChanged (op) {
  return triCanvas?._canApplyMorphology(op) ?? false
}

/**
 * Compute morphology state for the given operation.
 * @param {string} op - The morphology operation
 * @returns {boolean} The computed morphology state
 */
function computeTriMorphState (op) {
  return triCanvas?.computeMorphChanged(op) ?? false
}

/**
 * Apply a transform to the grid.
 * @param {number} mapIndex - The transform/map index to apply
 * @returns {void}
 */
function applyTransform (mapIndex) {
  triCanvas?.applyTransform(mapIndex)
}

/**
 * Line/ray/full tool type.
 * @type {'segment'|'ray'|'full'|null}
 */
let currentTool = null

/**
 * Current action to apply with line tools.
 * @type {'set'|'clear'|'toggle'}
 */
let currentAction = 'set'

/**
 * Starting cell index for line drawing operations.
 * @type {number|null}
 */
let lineStart = null

/**
 * Array of cell indices to preview in the current drawing operation.
 * @type {number[]}
 */
triDraw.previewCells = []

/**
 * Get the current bit value at an index from the mask.
 * Handles both BigInt and regular bit operations.
 * @param {number} idx - The cell index
 * @param {*} maskBits - The mask bits (could be BigInt or number)
 * @returns {number} The current bit value (0 or 1)
 */
function getBitValue (idx, maskBits) {
  if (typeof maskBits === 'bigint') {
    return Number((maskBits >> BigInt(idx)) & 1n)
  }
  const mask = triDraw.mask
  return mask.atIndex ? mask.atIndex(idx) : (maskBits >> idx) & 1
}

/**
 * Compute the new bit value for a toggle action.
 * @param {number} currentVal - The current bit value (0 or 1)
 * @returns {number} The new bit value after toggle (1 or 0)
 */
function getToggledValue (currentVal) {
  return currentVal ? 0 : 1
}

/**
 * Apply a single action to cell indices.
 * Applies 'set' (enable), 'clear' (disable), or 'toggle' operation to each cell.
 * @param {string} action - The action to apply: 'set', 'clear', or 'toggle'
 * @param {number[]} indices - Array of cell indices to modify
 * @returns {void}
 */
function applySingleAction (action, indices) {
  const mask = triDraw.mask
  const { bits } = mask

  for (const i of indices) {
    let newValue
    if (action === 'set') {
      newValue = 1
    } else if (action === 'clear') {
      newValue = 0
    } else if (action === 'toggle') {
      const currentVal = getBitValue(i, bits)
      newValue = getToggledValue(currentVal)
    } else {
      continue
    }
    mask.bits = mask.setIndex(i, newValue)
  }
}

/**
 * Apply an action to a list of cell indices.
 * Sets/clears/toggles cells and refreshes the display.
 * @param {string} action - 'set', 'clear', or 'toggle'
 * @param {number[]} indices - Array of cell indices
 * @returns {void}
 */
function applyActionToIndices (action, indices) {
  applySingleAction(action, indices)
  triDraw.setBits(triDraw.mask.bits)
  if (typeof triDraw.redraw === 'function') {
    triDraw.redraw()
  }
  updateButtons()
}

// Override toggleCell to respect action dropdown and avoid tool conflicts
triDraw.toggleCell = function (idx) {
  // Safely ignore null hits from line tool operations
  if (idx == null) return

  // when a line tool is active, don't toggle cells directly
  if (triCanvas?.currentTool || currentTool) return

  // Apply currentAction to single cell
  applyActionToIndices(currentAction, [idx])
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
 * Compute line preview cells based on current tool type and endpoints.
 * Returns indices for segment, ray, or full line depending on currentTool.
 * @param {number} startIdx - Starting cell index
 * @param {number} endIdx - Ending cell index
 * @returns {number[]} Array of cell indices forming the line
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
 * Draw a line of cells from start to end index, applying the current action.
 * @param {number} startIdx - Starting cell index
 * @param {number} endIdx - Ending cell index
 * @returns {void}
 */
function drawLineBetween (startIdx, endIdx) {
  const inds = computePreviewIndices(startIdx, endIdx)
  applyActionToIndices(currentAction, inds)
}

/**
 * Get the cell index from a mouse event, or null if invalid.
 * @param {MouseEvent} e - The mouse event
 * @returns {number|null} The cell index or null if out of bounds
 */
function getHitIndexFromEvent (e) {
  const rect = triDraw.canvas.getBoundingClientRect()
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top
  const [r, c] = pixelToTri(
    px - triDraw.offsetX,
    py - triDraw.offsetY,
    triDraw.triSize
  )
  if (!triDraw.indexer.isValid(r, c)) return null
  return triDraw.indexer.index(r, c)
}

// Initialize canvas and attach event listeners
if (triCanvas) {
  wireLineActionDropdown()
} else if (!triDraw.canvas.__lineToolsListenersAttached) {
  triDraw.canvas.__lineToolsListenersAttached = true

  /**
   * Handle canvas mouse move for line preview and hover info.
   * Updates hover label and preview cells when line tool is active.
   * @param {MouseEvent} e - The mouse move event
   */
  const onCanvasMouseMove = e => {
    // Update hover info label
    updateTriHoverInfo(e)

    if (!currentTool || lineStart == null) return
    const hit = getHitIndexFromEvent(e)
    if (hit == null) return
    triDraw.previewCells = computePreviewIndices(lineStart, hit)
    triDraw.redraw()
  }

  /**
   * Handle canvas click for line drawing.
   * Two-click workflow: first click sets start point, second click draws line.
   * @param {MouseEvent} e - The mouse click event
   */
  const onCanvasClick = e => {
    if (!currentTool) return
    const hit = getHitIndexFromEvent(e)
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

/**
 * Exports for testing and external control.
 *
 * @export
 * @type {Object}
 * @property {TriDraw} triDraw - The triangular grid drawing utility
 * @property {TriCanvas|null} triCanvas - The canvas controller instance (null if DOM not available)
 * @property {Function} updateButtons - Update button states
 * @property {Function} applyTransform - Apply a transform to the grid
 * @property {Function} computeMorphChanged - Check if morphology can be applied
 * @property {Function} computeTriMorphState - Compute morphology state
 * @property {Function} setMorphologyButtons - Configure morphology buttons
 * @property {Function} wireLineActionDropdown - Wire line action dropdown control
 */
export {
  triDraw,
  triCanvas,
  updateButtons,
  applyTransform,
  computeMorphChanged,
  computeTriMorphState,
  setMorphologyButtons,
  wireLineActionDropdown
}
