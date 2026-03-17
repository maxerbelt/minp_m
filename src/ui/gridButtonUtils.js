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
// CANVAS & EVENT HANDLING
// ============================================================================

/**
 * Extract canvas coordinates from clicking/moving event
 */
export function getCanvasHitTest (grid, e) {
  if (!grid?.canvas) return null
  const rect = grid.canvas.getBoundingClientRect()
  return grid._hitTest(e.clientX - rect.left, e.clientY - rect.top)
}

/**
 * Update preview cells and trigger redraw
 */
export function updateLinePreviewRedraw (
  grid,
  lineStart,
  lineEnd,
  computePreviewFn
) {
  if (!grid || !lineStart || !lineEnd) return
  grid.previewCells = computePreviewFn(lineStart, lineEnd)
  grid.redraw()
}

/**
 * Handle two-point line completion: apply operation and reset tool state
 */
export function completeLineShape (grid, lineStart, lineEnd, applyFn, updateFn) {
  if (!grid || !lineStart || !lineEnd) return
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
 */
export function applyPackedMutation (packed, x, y, color) {
  if (!packed) return
  packed.set(x, y, color)
}

/**
 * Create mapping of button IDs to mask operations
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
 */
export function wireMaskMutationButtons (mutationMap, applyFn, updateFn) {
  Object.entries(mutationMap).forEach(([id, getMaskBits]) => {
    const el = document.getElementById(id)
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
 */
export function setTransformButtonStates (
  canRotateCW,
  canRotateCCW,
  canFlipH,
  canFlipV
) {
  // Try both ID variants (for rect and rectcolor)
  for (const id of ['rotate-cw', 'rotate-cw2']) {
    const el = document.getElementById(id)
    if (el) el.disabled = !canRotateCW
  }
  for (const id of ['rotate-ccw', 'rotate-ccw2']) {
    const el = document.getElementById(id)
    if (el) el.disabled = !canRotateCCW
  }
  for (const id of ['flip-h', 'flip-h2']) {
    const el = document.getElementById(id)
    if (el) el.disabled = !canFlipH
  }
  for (const id of ['flip-v', 'flip-v2']) {
    const el = document.getElementById(id)
    if (el) el.disabled = !canFlipV
  }
}

/**
 * Set disabled state for morphology buttons
 */
export function setMorphologyButtonStates (
  dilateDisabled,
  erodeDisabled,
  crossDisabled,
  buttonId
) {
  const suffix = buttonId === 'dilate' ? '' : '2'
  const dilateBtn = document.getElementById(`dilate${suffix}`)
  const erodeBtn = document.getElementById(`erode${suffix}`)
  const crossBtn = document.getElementById(`cross-dilate${suffix}`)

  if (dilateBtn) dilateBtn.disabled = dilateDisabled
  if (erodeBtn) erodeBtn.disabled = erodeDisabled
  if (crossBtn) crossBtn.disabled = crossDisabled
}

/**
 * Check if bitboard is completely full and disable dilate accordingly
 */
export function checkDilateCapacity (bits, fullBits) {
  return isBitboardFull(bits, fullBits)
}

// ============================================================================
// SYMMETRY DISPLAY
// ============================================================================

/**
 * Update symmetry display element with current mask symmetry classification
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
 */
export function wireLineToolButton (buttonId, toolValue, setToolFn) {
  const btn = document.getElementById(buttonId)
  if (!btn) return

  const handler = () => {
    if (btn.checked) setToolFn(toolValue)
  }

  btn.addEventListener('change', handler)
  btn.addEventListener('click', handler)
}

/**
 * Create tool map for converting input values to tool types
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
 */
export function createMorphLog () {
  if (typeof document === 'undefined') return null
  const existing = document.getElementById('rectcolor-morph-log')
  if (existing) return existing

  const el = document.createElement('div')
  el.id = 'rectcolor-morph-log'
  el.style.cssText =
    'position:fixed;right:8px;bottom:8px;background:#222;color:#fff;padding:6px;border-radius:4px;z-index:9999;font-family:monospace;font-size:12px;max-width:320px;white-space:pre-wrap'
  document.body.appendChild(el)
  return el
}

/**
 * Display temporary log message for morphology operations
 */
export function showMorphLog (logElement, text, timeout = 3000) {
  if (typeof console !== 'undefined') console.log('[rectcolor-morph]', text)
  if (!logElement) return
  logElement.textContent = text
  if (timeout > 0) {
    setTimeout(() => {
      if (logElement.textContent === text) logElement.textContent = ''
    }, timeout)
  }
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

/**
 * Find rotation step map index (first non-identity rotation map)
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
