/**
 * Shared utilities for grid button management and bit operations
 *
 * Provides reusable functions for:
 * - DOM element management (getting, setting disabled state)
 * - Canvas event handling and hit testing
 * - Mask mutations (set, clear, toggle operations)
 * - Morphology operations (dilate, erode, cross-dilate)
 * - UI button wiring and state management
 * - Transform operations (rotation, flip, symmetry)
 * - Logging and display updates
 *
 * @module ui/gridButtonUtils
 */

// Re-export pure morphology operations with unified interface
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
} from '../core/MorphologyOps.js'

// Import for internal use
import { isBitboardFull } from '../core/MorphologyOps.js'
import { Delay } from '../core/Delay.js'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @typedef {Object} GridObject
 * @property {HTMLCanvasElement} canvas - Canvas element
 * @property {Function} _hitTest - Hit test method
 * @property {Object} mask - Mask object with bits and methods
 * @property {Array} previewCells - Preview cells for rendering
 * @property {Function} redraw - Redraw method
 * @property {Object} store - Store object
 * @property {Object} indexer - Indexer object
 */

/**
 * @typedef {Object} MaskObject
 * @property {number} bits - Current bitboard value
 * @property {number} width - Grid width
 * @property {Function} [at] - Get bit at position
 * @property {Function} set - Set bit at position
 * @property {Function} clear - Clear bit at position
 * @property {Object} [store] - Store reference
 * @property {Object} [indexer] - Indexer reference
 */

/**
 * @typedef {Object} HitTestResult
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} TransformMaps
 * @property {string|null} id - Identity map (null or empty)
 * @property {*} [key] - Transform map for named transformation
 */

/**
 * @typedef {Object} ActionsObject
 * @property {Object} [transformMaps] - Map of transform names to map arrays
 * @property {string} [template] - Template name
 * @property {Function} [classifyOrbitType] - Symmetry classification function
 * @property {Function} [applyMap] - Apply transformation map
 */

/**
 * @typedef {'set'|'clear'|'toggle'} MutationOperation
 * @description Cell mutation operation type
 */

// ============================================================================
// DOM UTILITY HELPERS
// ============================================================================

/**
 * Safely get an element by ID, returning null if not found or document undefined
 *
 * Prevents errors when running in non-DOM environments (e.g., Node.js tests).
 *
 * @param {string} id - Element ID to find in the DOM
 * @returns {HTMLElement|null} The element if found, or null if not found/unavailable
 * @private
 */
function getElementByIdSafe (id) {
  if (typeof document === 'undefined') return null
  return document.getElementById(id)
}

/**
 * Set disabled state on multiple elements by their IDs
 *
 * Safely disables/enables a group of elements, ignoring missing elements.
 *
 * @param {string[]} ids - Array of element IDs to modify
 * @param {boolean} disabled - Whether to disable (true) or enable (false) the elements
 * @returns {void}
 * @private
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
 *
 * Performs hit testing on the grid to find which cell is at the mouse position.
 * Safely handles missing canvas by returning null.
 *
 * @param {GridObject|null} grid - Grid object with canvas and _hitTest method
 * @param {MouseEvent} e - Mouse event with clientX/clientY properties
 * @returns {HitTestResult|null} Hit test result (cell location) or null if unavailable
 * @example
 * canvas.addEventListener('mousemove', (e) => {
 *   const hit = getCanvasHitTest(grid, e);
 *   if (hit) console.log('Mouse over cell:', hit);
 * });
 */
export function getCanvasHitTest (grid, e) {
  if (!grid?.canvas) return null
  const rect = grid.canvas.getBoundingClientRect()
  return grid._hitTest(e.clientX - rect.left, e.clientY - rect.top)
}

/**
 * Update preview cells and trigger redraw
 *
 * Computes line preview cells between two points and redraws the canvas
 * to show the preview. Used for line tools to show what will be drawn.
 *
 * @param {GridObject|null} grid - Grid object with previewCells and redraw method
 * @param {HitTestResult|null} lineStart - Starting point coordinates
 * @param {HitTestResult|null} lineEnd - Ending point coordinates
 * @param {Function} computePreviewFn - Function that computes preview cells from start/end
 * @returns {void}
 * @example
 * updateLinePreviewRedraw(
 *   grid,
 *   startCoords,
 *   endCoords,
 *   (start, end) => computeBresenhamLine(start, end)
 * );
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
 *
 * Applies the line operation (draw, erase, etc.) and clears preview state.
 * Typically called when the user completes a line tool interaction.
 *
 * @param {GridObject|null} grid - Grid object with previewCells and redraw method
 * @param {HitTestResult|null} lineStart - Starting point coordinates
 * @param {HitTestResult|null} lineEnd - Ending point coordinates
 * @param {Function} applyFn - Function to apply the line operation
 * @param {Function} [updateFn] - Optional callback to invoke after completion
 * @returns {void}
 * @example
 * completeLineShape(
 *   grid,
 *   startCoords,
 *   endCoords,
 *   (start, end) => applyBresenhamLine(grid, start, end),
 *   () => updateUI()
 * );
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
 *
 * Modifies the cell state in the mask using one of three operations:
 * - 'set': Turn the cell on (set to 1)
 * - 'clear': Turn the cell off (clear to 0)
 * - 'toggle': Flip the cell state (0 ↔ 1)
 *
 * @param {MaskObject|null} mask - Mask object with set/clear methods
 * @param {number} x - X coordinate of the cell
 * @param {number} y - Y coordinate of the cell
 * @param {MutationOperation} operation - Operation type: 'set', 'clear', or 'toggle'
 * @returns {void}
 * @example
 * applyMaskMutation(mask, 5, 10, 'toggle'); // Toggle cell at (5, 10)
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
 * Apply a color mutation (set) to a single cell in packed color grid
 *
 * Sets a cell to a specific color value in a multi-layer packed grid.
 * Typically used for terrain or multi-color grids.
 *
 * @param {Object|null} packed - Packed grid object with set method
 * @param {number} x - X coordinate of the cell
 * @param {number} y - Y coordinate of the cell
 * @param {number} color - Color value to set at the cell
 * @returns {void}
 * @example
 * applyPackedMutation(terrainGrid, 5, 10, 2); // Set cell to color 2
 */
export function applyPackedMutation (packed, x, y, color) {
  if (!packed) return
  packed.set(x, y, color)
}

/**
 * Create mapping of button IDs to mask operations
 *
 * Generates a lookup table that maps button element IDs to functions that
 * retrieve mask bits. Used with wireMaskMutationButtons for consistent UI wiring.
 *
 * @returns {Object<string, Function>} Map of button IDs to functions that get mask bits
 * @example
 * const mutMap = createMaskMutationMap();
 * console.log(Object.keys(mutMap)); // ['empty', 'full', 'inverse', ...]
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
 *
 * Attaches click handlers to mutation buttons that apply mask operations
 * and optionally trigger UI updates.
 *
 * @param {Object<string, Function>} mutationMap - Map of button IDs to mask bit getters
 * @param {Function} applyFn - Function to invoke with retrieved mask bits
 * @param {Function} [updateFn] - Optional callback to invoke after applying
 * @returns {void}
 * @example
 * wireMaskMutationButtons(mutMap, (bits) => {
 *   grid.mask.bits = bits;
 * }, () => grid.redraw());
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
 *
 * Updates the state of rotation and flip buttons based on what transformations
 * are valid. Attempts both button ID variants (e.g., 'rotate-cw' and 'rotate-cw2')
 * to handle multiple UI versions.
 *
 * @param {boolean} canRotateCW - Whether clockwise rotation is allowed
 * @param {boolean} canRotateCCW - Whether counter-clockwise rotation is allowed
 * @param {boolean} canFlipH - Whether horizontal flip is allowed
 * @param {boolean} canFlipV - Whether vertical flip is allowed
 * @returns {void}
 * @example
 * setTransformButtonStates(true, true, false, true);
 * // Enables rotate buttons and flip-v, disables flip-h
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
 *
 * Updates the state of dilate, erode, and cross-dilate buttons based on
 * current grid state and constraints.
 *
 * @param {boolean} dilateDisabled - Whether dilate button should be disabled
 * @param {boolean} erodeDisabled - Whether erode button should be disabled
 * @param {boolean} crossDisabled - Whether cross-dilate button should be disabled
 * @param {string} buttonId - Base button ID to determine suffix ('dilate' → '', else '2')
 * @returns {void}
 * @example
 * setMorphologyButtonStates(false, true, false, 'dilate');
 * // Enables dilate/cross, disables erode
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
 *
 * Determines whether the dilate operation should be disabled because
 * the grid is already at maximum capacity.
 *
 * @param {number} bits - Current bitboard value
 * @param {number} fullBits - Full bitboard value for comparison
 * @returns {boolean} True if dilate should be disabled (grid is full)
 * @example
 * const isFull = checkDilateCapacity(currentBits, fullBits);
 * dilateBtn.disabled = isFull;
 */
export function checkDilateCapacity (bits, fullBits) {
  return isBitboardFull(bits, fullBits)
}

// ============================================================================
// SYMMETRY DISPLAY
// ============================================================================

/**
 * Update symmetry display element with current mask symmetry classification
 *
 * Renders the current symmetry type into a DOM element. Safely handles
 * missing elements or unavailable classification methods.
 *
 * @param {HTMLElement|null} symElement - Element to update with symmetry text
 * @param {ActionsObject|null} maskActions - Object with classifyOrbitType method
 * @returns {void}
 * @example
 * const symEl = document.getElementById('symmetry');
 * updateSymmetryDisplay(symEl, maskActions);
 * // Updates element to display: "Symmetry: C4v" or similar
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
 *
 * Attaches change and click handlers to update the tool state when the
 * radio button is selected. Handles both change and click events to ensure
 * reliable triggering across browsers.
 *
 * @param {string} buttonId - ID of the radio button element
 * @param {*} toolValue - Value to set when button is checked
 * @param {Function} setToolFn - Callback function to set the tool
 * @returns {void}
 * @private
 * @example
 * wireLineToolButton('line-segment', 'segment', (val) => {
 *   currentTool = val;
 * });
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
 *
 * Generates a lookup table mapping radio button values to tool identifiers.
 * The 'single' tool is represented as null (no line mode).
 *
 * @returns {Object<string, string|null>} Map of input values to tool types
 * @example
 * const toolMap = createLineToolMap();
 * // { single: null, segment: 'segment', ray: 'ray', full: 'full' }
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
 *
 * Attaches change handlers to all radio buttons matching the selector.
 * Calls setToolFn with the mapped tool value when a button is selected.
 *
 * @param {string} radioSelector - CSS selector for radio button elements
 * @param {Object<string, *>} toolMap - Map of radio values to tool types
 * @param {Function} setToolFn - Callback to invoke with selected tool value
 * @returns {void}
 * @example
 * wireAllLineToolButtons(
 *   'input[name="line-tool"]',
 *   createLineToolMap(),
 *   (tool) => { gridState.lineTool = tool; }
 * );
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
 *
 * Creates a fixed-position overlay element for displaying temporary log messages.
 * Returns existing element if already created, otherwise creates and appends to body.
 *
 * @returns {HTMLElement|null} The log element or null if document unavailable
 * @example
 * const logEl = createMorphLog();
 * await showMorphLog(logEl, 'Dilate operation complete');
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
 *
 * Shows a message in the log element and optionally clears it after a timeout.
 * Also logs to console for debugging purposes.
 *
 * @async
 * @param {HTMLElement|null} logElement - The log element to update
 * @param {string} text - The message text to display
 * @param {number} [timeout=3000] - Timeout in milliseconds before clearing (0 to disable auto-clear)
 * @returns {Promise<void>} Resolves when display and timeout complete
 * @example
 * const logEl = createMorphLog();
 * await showMorphLog(logEl, 'Operation complete', 2000);
 * console.log('Log was displayed and cleared');
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
 * Helper: Find first rotation key in object format
 * @private
 * @param {Object} maps - Transform maps object
 * @returns {string|null} First rotation key or null
 */
function findRotationKeyInObject (maps) {
  const keys = Object.keys(maps)
  // Try to find a rotation-like key (starts with 'r')
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

/**
 * Helper: Find first rotation index in array format
 * @private
 * @param {Array} maps - Transform maps array
 * @returns {number|null} First rotation index or null
 */
function findRotationIndexInArray (maps) {
  // Rotation maps are at even indices (0,2,4,...); skip identity at 0
  for (let i = 1; i < maps.length; i++) {
    if (i % 2 === 0) return i
  }
  return null
}

/**
 * Find rotation step map index (first non-identity rotation map)
 *
 * Locates the index or key of the first non-identity rotation transformation
 * in the transform maps collection. Handles both object and array formats.
 *
 * Supports two formats:
 * - Object: {id: null, r120: 'R', r240: 'R2', f0: 'F'} - returns 'r120'
 * - Array: [identity, (unused), rotMap1, (unused), rotMap2] - returns 2
 *
 * @param {TransformMaps|Array|null} maps - Transform maps object or array
 * @returns {string|number|null} Key/index of first rotation map or null
 * @example
 * // Object format
 * const objMaps = {id: null, r120: 'R', r240: 'R2'};
 * findRotationStepIndex(objMaps); // Returns 'r120'
 *
 * // Array format
 * const arrMaps = [identity, unused, rotMap1, unused, rotMap2];
 * findRotationStepIndex(arrMaps); // Returns 2
 */
export function findRotationStepIndex (maps) {
  if (!maps) return null
  if (!Array.isArray(maps)) {
    return findRotationKeyInObject(maps)
  }
  return findRotationIndexInArray(maps)
}

/**
 * Compute transformed bits by applying a map to current bits
 *
 * Applies a transformation map to the current bitboard to compute the result.
 * Supports multiple computation strategies depending on available methods.
 *
 * Strategy priority:
 * 1. Use store + indexer for efficient bit-by-bit transformation
 * 2. Fall back to actions.applyMap() if store/indexer unavailable
 * 3. Return original bits if all methods fail
 *
 * @param {MaskObject} mask - Mask object with bits property
 * @param {Array<number>|null} map - Transformation map array (index→index mapping)
 * @param {ActionsObject} actions - Actions object with store, indexer, applyMap methods
 * @returns {number} Transformed bitboard value
 * @example
 * const newBits = computeTransformedBits(mask, rotationMap, actions);
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
 *
 * Attempts to classify the current symmetry type. Tries primary actions first,
 * then falls back to maskActions if available. Returns 'n/a' if classification fails.
 *
 * @param {ActionsObject|null} actions - Primary actions object with classifyOrbitType
 * @param {ActionsObject|null} maskActions - Fallback actions object
 * @returns {string} Symmetry classification (e.g., 'C4v', 'D4', etc.) or 'n/a'
 * @example
 * const sym = getSymmetryClass(actions, maskActions);
 * console.log(`Grid symmetry: ${sym}`);
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
    // Silently handle error and return fallback
  }
  return 'n/a'
}

/**
 * Update symmetry and details display elements
 *
 * Updates two display elements with current symmetry classification and
 * transform map information. Safely handles missing elements or unavailable data.
 *
 * Displays:
 * - Symmetry element: "Symmetry: C4v"
 * - Details element: "Template: square — Maps: id, r90, r180, r270, f0, f90, ..."
 *
 * @param {HTMLElement|null} symElement - Element to update with symmetry text
 * @param {HTMLElement|null} detailsElement - Element to update with details text
 * @param {ActionsObject|null} actions - Primary actions object
 * @param {ActionsObject|null} maskActions - Fallback actions object
 * @returns {void}
 * @example
 * updateSymmetryAndDetails(
 *   document.getElementById('symmetry'),
 *   document.getElementById('details'),
 *   shapeActions,
 *   maskActions
 * );
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
