/**
 * Shared utilities for grid button management and bit operations
 */

// Import and re-export pure morphology operations
import {
  bitsChanged,
  isBitboardFull,
  normalizeBits,
  copyOccupancyBitsExact,
  createOccupancyGrid,
  checkMorphologyState,
  checkMorphologyChange,
  computeMorphologyState,
  getMorphologyDifferences,
  findNeighborColor,
  colorAddedCells,
  clearRemovedCells
} from '../core/MorphologyOps.js'

import { Delay } from '../core/Delay.js'

export {
  bitsChanged,
  isBitboardFull,
  normalizeBits,
  copyOccupancyBitsExact,
  createOccupancyGrid,
  checkMorphologyState,
  checkMorphologyChange,
  computeMorphologyState,
  getMorphologyDifferences,
  findNeighborColor,
  colorAddedCells,
  clearRemovedCells
}

// ============================================================================
// DOM UTILITY HELPERS
// ============================================================================

/**
 * Safely get an element by ID, returning null if not found or document undefined
 * @param {string} id - Element ID to find
 * @returns {HTMLElement|null} The element or null
 */
function getElementByIdSafe (id) {
  if (typeof document === 'undefined') return null
  return document.getElementById(id)
}

/**
 * Set disabled state on multiple elements by their IDs
 * @param {string[]} ids - Array of element IDs
 * @param {boolean} disabled - Whether to disable the elements
 */
function setElementsDisabled (ids, disabled) {
  ids.forEach(id => {
    const el = getElementByIdSafe(id)
    if (el) el.disabled = disabled
  })
}

// ============================================================================
// CANVAS & EVENT HANDLING
// ============================================================================

/**
 * Extract canvas coordinates from clicking/moving event
 * @param {Object} grid - Grid object with canvas and _hitTest method
 * @param {MouseEvent} e - Mouse event with clientX/clientY
 * @returns {Object|null} Hit test result or null
 */
export function getCanvasHitTest (grid, e) {
  if (!grid?.canvas) return null
  const rect = grid.canvas.getBoundingClientRect()
  return grid._hitTest(e.clientX - rect.left, e.clientY - rect.top)
}

/**
 * Update preview cells and trigger redraw
 * @param {Object} grid - Grid object with previewCells and redraw method
 * @param {Object|null} lineStart - Starting point coordinates
 * @param {Object|null} lineEnd - Ending point coordinates
 * @param {Function} computePreviewFn - Function to compute preview cells
 */
export function updateLinePreviewRedraw (
  grid,
  lineStart,
  lineEnd,
  computePreviewFn
) {
  if (!grid || lineStart == null || lineEnd == null) return
  grid.previewCells = computePreviewFn(lineStart, lineEnd)
  grid.redraw()
}

/**
 * Handle two-point line completion: apply operation and reset tool state
 * @param {Object} grid - Grid object with previewCells and redraw method
 * @param {Object|null} lineStart - Starting point coordinates
 * @param {Object|null} lineEnd - Ending point coordinates
 * @param {Function} applyFn - Function to apply the line operation
 * @param {Function} [updateFn] - Optional function to call after completion
 */
export function completeLineShape (grid, lineStart, lineEnd, applyFn, updateFn) {
  if (!grid || lineStart == null || lineEnd == null) return
  applyFn(lineStart, lineEnd)
  grid.previewCells = []
  grid.redraw()
  if (updateFn) updateFn()
}

// ============================================================================
// MASK MUTATION OPERATIONS
// ============================================================================

/**
 * Apply a mutation operation (set, clear, toggle) to a single cell
 * @param {Object} mask - Mask object with set/clear methods
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} operation - Operation type: 'set', 'clear', or 'toggle'
 */
export function applyMaskMutation (mask, x, y, operation) {
  if (!mask) return
  if (operation === 'set') {
    mask.set(x, y, 1)
  } else if (operation === 'clear') {
    mask.clear(x, y)
  } else if (operation === 'toggle') {
    const val = mask.at
      ? mask.at(x, y)
      : (mask.bits >> (y * mask.width + x)) & 1
    mask.set(x, y, val ? 0 : 1)
  }
}

/**
 * Apply a color mutation (set/clear) to a single cell in packed grid
 * @param {Object} packed - Packed grid object with set method
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} color - Color value to set
 */
export function applyPackedMutation (packed, x, y, color) {
  if (!packed) return
  packed.set(x, y, color)
}

/**
 * Create mapping of button IDs to mask operations
 * @returns {Object<string, Function>} Map of button IDs to mask bit getters (expects grid parameter)
 */
export function createMaskMutationMap () {
  return {
    empty: grid => grid.mask.emptyMask.bits,
    full: grid => grid.mask.fullMask.bits,
    inverse: grid => grid.mask.invertedMask.bits,
    'outer-border': grid => grid.mask.outerBorderMask.bits,
    'outer-area': grid => grid.mask.outerAreaMask.bits,
    'inner-border': grid => grid.mask.innerBorderMask.bits,
    'inner-area': grid => grid.mask.innerAreaMask.bits
  }
}

/**
 * Wire mask mutation buttons with consistent update pattern
 * @param {Object<string, Function>} mutationMap - Map of button IDs to mask bit getters
 * @param {Function} applyFn - Function to apply the mask bits
 * @param {Function} [updateFn] - Optional function to call after applying
 */
export function wireMaskMutationButtons (mutationMap, applyFn, updateFn) {
  Object.entries(mutationMap).forEach(([id, getMaskBits]) => {
    const el = getElementByIdSafe(id)
    if (el) {
      el.addEventListener('click', () => {
        applyFn(getMaskBits())
        if (updateFn) updateFn()
      })
    }
  })
}

// ============================================================================
// OCCUPANCY & MORPHOLOGY HELPERS
// ============================================================================

/**
 * Set disabled state for transform buttons, trying both ID variants
 * @param {boolean} canRotateCW - Whether clockwise rotation is allowed
 * @param {boolean} canRotateCCW - Whether counter-clockwise rotation is allowed
 * @param {boolean} canFlipH - Whether horizontal flip is allowed
 * @param {boolean} canFlipV - Whether vertical flip is allowed
 */
export function setTransformButtonStates (
  canRotateCW,
  canRotateCCW,
  canFlipH,
  canFlipV
) {
  setElementsDisabled(['rotate-cw', 'rotate-cw2'], !canRotateCW)
  setElementsDisabled(['rotate-ccw', 'rotate-ccw2'], !canRotateCCW)
  setElementsDisabled(['flip-h', 'flip-h2'], !canFlipH)
  setElementsDisabled(['flip-v', 'flip-v2'], !canFlipV)
}

/**
 * Set disabled state for morphology operation buttons
 * @param {boolean} dilateDisabled - Whether dilate button should be disabled
 * @param {boolean} erodeDisabled - Whether erode button should be disabled
 * @param {boolean} crossDisabled - Whether cross-dilate button should be disabled
 * @param {string} buttonId - Base button ID to determine suffix
 */
export function setMorphologyButtonStates (
  dilateDisabled,
  erodeDisabled,
  crossDisabled,
  buttonId
) {
  const suffix = buttonId === 'dilate' ? '' : '2'
  const dilateBtn = getElementByIdSafe(`dilate${suffix}`)
  const erodeBtn = getElementByIdSafe(`erode${suffix}`)
  const crossBtn = getElementByIdSafe(`cross-dilate${suffix}`)

  if (dilateBtn) dilateBtn.disabled = dilateDisabled
  if (erodeBtn) erodeBtn.disabled = erodeDisabled
  if (crossBtn) crossBtn.disabled = crossDisabled
}

/**
 * Check if bitboard is completely full and disable dilate accordingly
 * @param {number} bits - Current bitboard value
 * @param {number} fullBits - Full bitboard value for comparison
 * @returns {boolean} True if dilate should be disabled
 */
export function checkDilateCapacity (bits, fullBits) {
  return isBitboardFull(bits, fullBits)
}

// ============================================================================
// SYMMETRY DISPLAY
// ============================================================================

/**
 * Update symmetry display element with current mask symmetry classification
 * @param {HTMLElement|null} symElement - Element to update with symmetry text
 * @param {Object} maskActions - Object with classifyOrbitType method
 */
export function updateSymmetryDisplay (symElement, maskActions) {
  if (!symElement) return
  const sym = maskActions?.classifyOrbitType?.() ?? 'n/a'
  symElement.textContent = `Symmetry: ${sym}`
}

// ============================================================================
// LINE TOOL BUTTON WIRING HELPER
// ============================================================================

/**
 * Wire a single line tool radio button to its setter
 * @param {string} buttonId - ID of the radio button
 * @param {*} toolValue - Value to set when button is checked
 * @param {Function} setToolFn - Function to call with the tool value
 */
export function wireLineToolButton (buttonId, toolValue, setToolFn) {
  const btn = getElementByIdSafe(buttonId)
  if (!btn) return

  const handler = () => {
    if (btn.checked) setToolFn(toolValue)
  }

  btn.addEventListener('change', handler)
  btn.addEventListener('click', handler)
}

/**
 * Create tool map for converting input values to tool types
 * @returns {Object<string, string|null>} Map of input values to tool types
 */
export function createLineToolMap () {
  return {
    single: null,
    segment: 'segment',
    ray: 'ray',
    full: 'full'
  }
}

/**
 * Wire all line tool radio buttons with common pattern
 * @param {string} radioSelector - CSS selector for radio buttons
 * @param {Object<string, *>} toolMap - Map of button values to tool types
 * @param {Function} setToolFn - Function to call with the selected tool
 */
export function wireAllLineToolButtons (radioSelector, toolMap, setToolFn) {
  if (typeof document === 'undefined') return
  const radioButtons = document.querySelectorAll(radioSelector)
  radioButtons.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.checked) {
        setToolFn(toolMap[e.target.value])
      }
    })
  })
}

// ============================================================================
// UI LOGGING
// ============================================================================

/**
 * Create or get morphology operation log element
 * @returns {HTMLElement|null} The log element or null if document unavailable
 */
export function createMorphLog () {
  if (typeof document === 'undefined') return null
  const existing = getElementByIdSafe('rectcolor-morph-log')
  if (existing) return existing

  const el = document.createElement('div')
  el.id = 'rectcolor-morph-log'
  el.style.cssText =
    'position:fixed;right:8px;bottom:8px;background:#222;color:#fff;padding:6px;border-radius:4px;z-index:9999;font-family:monospace;font-size:12px;max-width:320px;white-space:pre-wrap'
  document.body.appendChild(el)
  return el
}

/**
 * Display temporary log message for morphology operations with async timeout
 * @async
 * @param {HTMLElement|null} logElement - The log element to update
 * @param {string} text - The message text to display
 * @param {number} [timeout=3000] - Timeout in milliseconds before clearing (0 to disable)
 * @returns {Promise<void>}
 */
export async function showMorphLog (logElement, text, timeout = 3000) {
  if (typeof console !== 'undefined') console.log('[rectcolor-morph]', text)
  if (!logElement) return
  logElement.textContent = text
  if (timeout > 0) {
    await Delay.wait(timeout)
    if (logElement.textContent === text) logElement.textContent = ''
  }
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

/**
 * Find rotation step map index (first non-identity rotation map)
 * @param {Object|Array} maps - Transform maps object or array
 * @returns {string|number|null} Key/index of first rotation map or null
 */
export function findRotationStepIndex (maps) {
  if (!maps) return null

  // Handle object format (e.g., {id: null, r120: 'R', r240: 'R2', f0: 'F'})
  if (!Array.isArray(maps)) {
    const keys = Object.keys(maps)
    // First try to find a rotation-like key
    for (const key of keys) {
      if (key !== 'id' && key.startsWith('r') && maps[key] != null) {
        return key
      }
    }
    // Fall back to first non-identity key
    for (const key of keys) {
      if (key !== 'id' && maps[key] != null) {
        return key
      }
    }
    return null
  }

  // Handle array format
  for (let i = 1; i < maps.length; i++) {
    // rotation maps are at even indices (0,2,4,...); skip identity at 0
    if (i % 2 === 0) return i
  }
  return null
}

/**
 * Compute transformed bits by applying a map to current bits
 * @param {Object} mask - Mask object with bits property
 * @param {Array<number>|null} map - Transformation map array or null
 * @param {Object} actions - Actions object with store, indexer, applyMap methods
 * @returns {number} Transformed bits
 */
export function computeTransformedBits (mask, map, actions) {
  if (!map) return mask.bits
  const store = actions?.store || mask.store
  const indexer = actions?.indexer || mask.indexer

  if (store && indexer) {
    let out = store.empty
    for (const i of indexer.bitsIndices(mask.bits)) {
      out = store.addBit(out, map[i])
    }
    return out
  }
  try {
    return actions?.applyMap?.(map) || mask.bits
  } catch {
    return mask.bits
  }
}

/**
 * Classify symmetry with fallback handling
 * @param {Object} actions - Primary actions object with classifyOrbitType
 * @param {Object} maskActions - Fallback actions object
 * @returns {string} Symmetry classification or 'n/a'
 */
export function getSymmetryClass (actions, maskActions) {
  try {
    if (
      actions?.classifyOrbitType &&
      typeof actions.classifyOrbitType === 'function'
    ) {
      return actions.classifyOrbitType()
    }
    if (
      maskActions?.classifyOrbitType &&
      typeof maskActions.classifyOrbitType === 'function'
    ) {
      return maskActions.classifyOrbitType()
    }
  } catch {
    // Silently handle error
  }
  return 'n/a'
}

/**
 * Update symmetry and details display elements
 * @param {HTMLElement|null} symElement - Element to update with symmetry text
 * @param {HTMLElement|null} detailsElement - Element to update with details text
 * @param {Object} actions - Actions object with transformMaps and template
 * @param {Object} maskActions - Fallback actions object
 */
export function updateSymmetryAndDetails (
  symElement,
  detailsElement,
  actions,
  maskActions
) {
  if (symElement) {
    const sym = getSymmetryClass(actions, maskActions)
    symElement.textContent = `Symmetry: ${sym}`
  }

  if (detailsElement) {
    try {
      const mapsObj = actions?.transformMaps || maskActions?.transformMaps
      const template = actions?.template || maskActions?.template
      const mapKeys = mapsObj ? Object.keys(mapsObj).join(', ') : 'n/a'
      detailsElement.textContent = `Template: ${
        template || 'n/a'
      } — Maps: ${mapKeys}`
    } catch {
      detailsElement.textContent = ''
    }
  }
}
