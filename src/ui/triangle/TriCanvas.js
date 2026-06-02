/**
 * @fileoverview Triangular grid canvas UI controller.
 *
 * TriCanvas manages user interactions with triangular grids, including:
 * - Single cell toggling with set/clear/toggle actions
 * - Multi-cell line drawing (segment, ray, full line tools)
 * - Geometric transforms (rotate 120°, flip along 3 axes)
 * - Morphological operations (dilate, erode, cross dilate)
 * - Hover previews and symmetry classification
 * - Coordinate conversion between canvas pixels and grid triangles
 *
 * The class extends GridCanvas and uses ActionsTri for triangle-specific operations.
 * Supports multiple tool types and cover strategies (normal, half, super).
 *
 * @module ui/triangle/TriCanvas
 */

import { GridCanvas } from '../GridCanvas.js'
import { ActionsTri } from '../../grid/triangle/actionsTri.js'
import { drawTri, triToPixel, pixelToTri } from './triDrawHelper.js'
import { wireAllLineToolButtons } from '../gridButtonUtils.js'

/**
 * @typedef {Object} MaskObject
 * @description Represents a bitboard mask with methods for bit manipulation
 * @property {(BigInt|number)} bits - The bitboard storage (BigInt for large grids)
 * @property {Function} setIndex - Set a bit at index: (index, value) => bits
 * @property {Function} atIndex - Get a bit at index: (index) => bit
 * @property {Object} store - Store for bit operations
 * @property {Object} indexer - Indexer for coordinate conversion
 * @property {Object} actions - Action metadata (transforms, templates, etc.)
 * @property {Function} dilate - Dilate the mask in-place
 * @property {Function} erode - Erode the mask in-place
 * @property {Function} dilateCross - Cross-dilate the mask in-place
 * @property {Object} emptyMask - Reference to empty mask (all zeros)
 * @property {Object} fullMask - Reference to full mask (all ones)
 * @property {Object} invertedMask - Reference to inverted mask
 */

/**
 * @typedef {Object} ActionMetadata
 * @description Action metadata from grid mask containing transform and operation info
 * @property {Object} transformMaps - Map of transform operations (r120, r240, f0, f1, f2, id)
 * @property {Function} applyMap - Apply a transform map to bits
 * @property {Function} classifyOrbitType - Classify symmetry type (returns string)
 * @property {string} template - Template identifier for the shape
 * @property {Object} store - Store object for bit operations
 * @property {Object} indexer - Indexer for coordinate conversion
 */

/**
 * @typedef {Object} LineCoordinates
 * @description Array of [row, column] coordinate pairs
 * @type {Array<[number, number]>}
 */

/**
 * @typedef {Object} MorphologyCapabilities
 * @description Flags indicating which morphology operations can be applied
 * @property {boolean} canDilate - Whether dilate would change the mask
 * @property {boolean} canErode - Whether erode would change the mask
 * @property {boolean} canCross - Whether cross dilate would change the mask
 */

// Tool type identifiers
const TOOL_TYPES = {
  SEGMENT: 'segment',
  RAY: 'ray',
  FULL: 'full'
}

// Cell action types applied to toggles and line drawing
const ACTIONS = {
  SET: 'set',
  CLEAR: 'clear',
  TOGGLE: 'toggle'
}

// Cover strategies for line drawing algorithms
const COVER_TYPES = {
  NORMAL: 'normal',
  HALF: 'half',
  SUPER: 'super'
}

// Canvas rendering style for line preview
const PREVIEW_STYLE = {
  FILL: '#FF9800',
  STROKE: '#333'
}

// Vertical offset for hover preview rendering on down-oriented triangles
const HOVER_VERTICAL_OFFSET = 0.3

// Maps tool types to indexer method suffixes
const TOOL_METHOD_SUFFIX = {
  [TOOL_TYPES.SEGMENT]: 'segmentTo',
  [TOOL_TYPES.RAY]: 'ray',
  [TOOL_TYPES.FULL]: 'fullLine'
}

/**
 * Triangular grid canvas UI controller.
 *
 * Extends GridCanvas to provide triangle-specific UI interactions including
 * single-cell toggling, multi-cell line drawing tools, transform operations,
 * and morphological transformations. Manages button state, hover previews,
 * and symmetry classification for the triangular grid.
 *
 * @class TriCanvas
 * @extends {GridCanvas}
 *
 * @property {HTMLElement|null} rotateBtn - Button for 120° rotation
 * @property {HTMLElement[]} flipButtons - Array of flip transform buttons
 * @property {HTMLElement|null} flipButtonsContainer - Container for flip buttons
 * @property {HTMLElement|null} dilateBtn - Button for dilation morphology
 * @property {HTMLElement|null} erodeBtn - Button for erosion morphology
 * @property {HTMLElement|null} crossBtn - Button for cross dilation
 * @property {string|null} currentTool - Active line drawing tool (segment, ray, full)
 * @property {string} currentAction - Current action type (set, clear, toggle)
 * @property {string} coverType - Current cover strategy (normal, half, super)
 * @property {number|null} lineStart - Starting index for line drawing
 * @property {Object} grid - Reference to parent GridCanvas grid object
 */
export class TriCanvas extends GridCanvas {
  /**
   * Initialize a triangular grid UI controller.
   *
   * Sets up button references, overrides grid behavior for custom interactions,
   * and prepares for line drawing and morphology operations.
   *
   * @param {string} canvasId - HTML element ID of the canvas
   * @param {Object} triDraw - Triangle drawing helper with render methods
   * @param {Object} [config={}] - Configuration object passed to parent GridCanvas
   */
  constructor (canvasId, triDraw, config = {}) {
    super(canvasId, triDraw, config)

    /** @type {HTMLElement|null} */
    this.rotateBtn = null
    /** @type {HTMLElement[]} */
    this.flipButtons = []
    /** @type {HTMLElement|null} */
    this.flipButtonsContainer = null

    this._overrideGridToggleCellBehavior()
    this._overrideGridHoverPreview()
  }

  /**
   * Set the current line drawing tool.
   *
   * Clears any in-progress line drawing and resets preview when changing tools.
   * Setting to null enables single-cell toggle mode instead of line drawing.
   *
   * @param {string|null} tool - Tool type: 'segment', 'ray', 'full', or null
   * @returns {void}
   */
  setTool (tool) {
    this.currentTool = tool
    this.lineStart = null
    this._clearPreview()
    this._redrawGridIfAvailable()
  }

  /**
   * Apply the current action to a bit.
   *
   * Transforms a single bit value according to the current action type:
   * - SET: returns 1
   * - CLEAR: returns 0
   * - TOGGLE: flips the bit (0→1, 1→0)
   *
   * @param {number} val - Current bit value (0 or 1)
   * @returns {number} Resulting bit value (0 or 1)
   * @private
   */
  _applyActionToBit (val) {
    if (this.currentAction === ACTIONS.SET) return 1
    if (this.currentAction === ACTIONS.CLEAR) return 0
    if (this.currentAction === ACTIONS.TOGGLE) return val ? 0 : 1
    return val
  }

  /**
   * Get the bit value stored in a mask at a given index.
   *
   * Handles both BigInt and regular number bit storage. Uses BigInt operations
   * when mask.bits is BigInt for grids larger than 32/64 cells. Falls back to
   * mask.atIndex() method if available, then to bit shift operations.
   *
   * @param {MaskObject} mask - Mask object containing bit state
   * @param {number} idx - Index to read (0-based)
   * @returns {number} Bit value (0 or 1)
   * @private
   */
  _getBitValue (mask, idx) {
    if (typeof mask.bits === 'bigint') {
      return Number((mask.bits >> BigInt(idx)) & 1n)
    }
    return mask.atIndex ? mask.atIndex(idx) : (mask.bits >> idx) & 1
  }

  /**
   * Set a bit in a mask, preserving mask storage semantics.
   *
   * Delegates to mask.setIndex() which handles both BigInt and number storage,
   * returning the updated bit state. This maintains abstraction over the
   * underlying bit representation.
   *
   * @param {MaskObject} mask - Mask object to update (modified in-place)
   * @param {number} idx - Bit index to set (0-based)
   * @param {number} value - New bit value (0 or 1)
   * @returns {void}
   * @private
   */
  _setMaskBit (mask, idx, value) {
    mask.bits = mask.setIndex(idx, value)
  }

  /**
   * Apply current action to a list of indices.
   *
   * Reads each bit, applies _applyActionToBit transformation, and writes back.
   * Used for both single-cell toggles and multi-cell line drawing operations.
   *
   * @param {MaskObject} mask - Mask object to update (modified in-place)
   * @param {number[]} indices - Indices to modify (0-based)
   * @returns {void}
   * @private
   */
  _applyActionToIndices (mask, indices) {
    for (const idx of indices) {
      const value = this._getBitValue(mask, idx)
      this._setMaskBit(mask, idx, this._applyActionToBit(value))
    }
  }

  /**
   * Override grid toggle behavior so toggle respects current action.
   *
   * Replaces default GridCanvas.toggleCell with action-aware version that:
   * - Respects currentAction (set/clear/toggle)
   * - Only operates when no line tool is active
   * - Updates grid and UI after toggling
   *
   * @returns {void}
   * @private
   */
  _overrideGridToggleCellBehavior () {
    if (!this.grid?.toggleCell) return

    this.grid.toggleCell = idx => {
      if (idx == null || this.currentTool) return
      this._applyActionToIndices(this.grid.mask, [idx])
      this.grid.setBits(this.grid.mask.bits)
      this._redrawGridIfAvailable()
      this.updateButtonStates()
    }
  }

  /**
   * Override hover rendering to draw temporary line preview cells.
   *
   * Wraps the original grid hover drawing to add semi-transparent preview
   * cells for current line drawing operation. Called on each mouse move
   * when line tool is active and line has been started.
   *
   * Preview cells are drawn in PREVIEW_STYLE color with proper triangle
   * orientation (up/down based on column parity) and adjusted for vertical offset.
   *
   * @returns {void}
   * @private
   */
  _overrideGridHoverPreview () {
    if (!this.grid?._drawHover || this.grid._drawHover._isOverridden) return

    const originalDrawHover = this.grid._drawHover.bind(this.grid)
    this.grid._drawHover = function () {
      if (this.previewCells?.length) {
        for (const index of this.previewCells) {
          const [r, c] = this.indexer.location(index)
          const { x, y } = triToPixel(r, c, this.triSize)
          const orientation = c % 2 === 0 ? 'up' : 'down'
          const yOffset =
            orientation === 'down'
              ? y - this.triHeight * HOVER_VERTICAL_OFFSET
              : y
          drawTri(
            this.ctx,
            x + this.offsetX,
            yOffset + this.offsetY,
            this.triSize,
            PREVIEW_STYLE.FILL,
            PREVIEW_STYLE.STROKE,
            orientation
          )
        }
      }
      originalDrawHover()
    }
    this.grid._drawHover._isOverridden = true
  }

  /**
   * Clear the current preview state.
   *
   * Clears previewCells array to remove line preview from next render.
   *
   * @returns {void}
   * @private
   */
  _clearPreview () {
    if (this.grid) this.grid.previewCells = []
  }

  /**
   * Redraw the underlying grid if possible.
   *
   * Calls grid.redraw() if the grid object and method exist.
   * Used after any state change that affects rendering.
   *
   * @returns {void}
   * @private
   */
  _redrawGridIfAvailable () {
    if (this.grid && typeof this.grid.redraw === 'function') {
      this.grid.redraw()
    }
  }

  /**
   * Sync the grid mask with the active drawing bits and return actions.
   *
   * Updates mask.bits from grid.bits (which may have been modified by the grid)
   * and returns the current action metadata. Called before any operation that
   * depends on current action state.
   *
   * @returns {ActionMetadata|undefined} Current action set with transforms and operations
   */
  syncMaskWithDraw () {
    this.grid.mask.bits = this.grid.bits
    return this.grid.mask.actions
  }

  /**
   * Get the current action metadata from the active grid.
   *
   * Returns action information without syncing. Used to check transform
   * capabilities and symmetry classification.
   *
   * @returns {ActionMetadata|undefined} Current action metadata or undefined
   */
  getCurrentActions () {
    return this.grid?.mask?.actions
  }

  /**
   * Convert a mouse event to a triangle index.
   *
   * Performs hit test to determine which cell the mouse is over:
   * 1. Gets canvas-relative coordinates from event
   * 2. Converts to triangle row/column using pixelToTri
   * 3. Validates coordinates against grid bounds
   * 4. Returns index or null if out of bounds
   *
   * @param {MouseEvent} event - Mouse event from the canvas
   * @returns {number|null} Triangle index (0-based) or null if out of bounds
   */
  hitTest (event) {
    if (!this.grid) return null

    const { x, y } = this._getCanvasRelativePoint(event)
    const [r, c] = pixelToTri(
      x - this.grid.offsetX,
      y - this.grid.offsetY,
      this.grid.triSize
    )

    if (!this.grid.indexer.isValid(r, c)) return null
    return this.grid.indexer.index(r, c)
  }

  /**
   * Get canvas-relative coordinates from a mouse event.
   *
   * Converts from page coordinates to canvas-relative coordinates by
   * subtracting the canvas bounding rectangle offset.
   *
   * @param {MouseEvent} event - Canvas mouse event
   * @returns {{x: number, y: number}} Canvas-relative coordinates
   * @private
   */
  _getCanvasRelativePoint (event) {
    const rect = this.grid.canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }

  /**
   * Get line coordinates using the active tool and cover type.
   *
   * Builds the indexer method name from tool type and cover type (e.g.,
   * 'halfCoverSegmentTo' for half cover segment), then calls that method
   * to get the coordinate array for the line path.
   *
   * @param {number} sr - Start row
   * @param {number} sc - Start column
   * @param {number} er - End row
   * @param {number} ec - End column
   * @returns {Array<[number, number]>} Coordinate array of [row, col] pairs
   * @private
   */
  _getLineCoordinates (sr, sc, er, ec) {
    if (!this.currentTool) return []

    const indexer = this.grid.indexer
    const toolKey =
      this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1)
    const methodBase = TOOL_METHOD_SUFFIX[this.currentTool] || this.currentTool
    const methodName = this._buildIndexedMethodName(toolKey, methodBase)

    if (typeof indexer[methodName] !== 'function') return []
    return Array.from(indexer[methodName](sr, sc, er, ec))
  }

  /**
   * Build the indexer method name based on cover type and tool.
   *
   * Constructs method name for line algorithm:
   * - Normal: methodBase (e.g., 'segmentTo')
   * - Half: 'halfCover' + capitalized tool (e.g., 'halfCoverSegment')
   * - Super: 'superCover' + capitalized tool (e.g., 'superCoverSegment')
   *
   * Additionally handles tool-specific method naming conventions.
   *
   * @param {string} toolKey - Capitalized tool name (Segment, Ray, Full)
   * @param {string} methodBase - Base tool method name
   * @returns {string} Indexer method name to call
   * @private
   */
  _buildIndexedMethodName (toolKey, methodBase) {
    const coverType = this.coverType || COVER_TYPES.NORMAL
    let methodName = methodBase

    if (coverType === COVER_TYPES.HALF) {
      methodName = 'halfCover' + toolKey
    } else if (coverType === COVER_TYPES.SUPER) {
      methodName = 'superCover' + toolKey
    }

    if (this.currentTool === TOOL_TYPES.SEGMENT) {
      methodName = methodName.replace('segment', 'segmentTo')
    } else if (this.currentTool === TOOL_TYPES.FULL) {
      methodName = methodName.replace('full', 'fullLine')
    }

    return methodName
  }

  /**
   * Convert coordinates to a valid index list for preview.
   *
   * Maps line tool coordinates to grid indices for preview rendering.
   * Returns only indices that are within grid bounds.
   *
   * @param {number} startIdx - Start index
   * @param {number} endIdx - End index
   * @returns {number[]} List of indices for line preview
   */
  computePreviewIndices (startIdx, endIdx) {
    if (startIdx == null || endIdx == null || !this.currentTool) return []

    const indexer = this.grid.indexer
    const [sr, sc] = indexer.location(startIdx)
    const [er, ec] = indexer.location(endIdx)
    const coords = this._getLineCoordinates(sr, sc, er, ec)

    return coords
      .map(([r, c]) => indexer.index(r, c))
      .filter(index => index !== undefined)
  }

  /**
   * Update line preview on the canvas.
   *
   * Computes preview indices and updates grid.previewCells for next render.
   * Called on each mouse move while line tool is active and line started.
   *
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {void}
   */
  updateLinePreview (start, end) {
    if (!this.grid || !this.currentTool) return
    this.grid.previewCells = this.computePreviewIndices(start, end)
    this._redrawGridIfAvailable()
  }

  /**
   * Apply line action to the previewed indices.
   *
   * Computes indices from start to end, applies current action to each,
   * updates the grid, and refreshes button states.
   *
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {void}
   */
  completeLine (start, end) {
    if (!this.grid) return
    const indices = this.computePreviewIndices(start, end)
    this._applyActionToIndices(this.grid.mask, indices)
    this.grid.setBits(this.grid.mask.bits)
    this._redrawGridIfAvailable()
    this.updateButtonStates()
  }

  /**
   * Handle a canvas click event.
   *
   * For line drawing tools: clicks set start point or complete line from
   * start to click location. For single-cell mode: handled by grid.toggleCell.
   *
   * @param {MouseEvent} event - Click event from canvas
   * @returns {void}
   */
  onCanvasClick (event) {
    if (!this.grid || !this.currentTool) return

    const hit = this.hitTest(event)
    if (hit == null) return

    if (this.lineStart == null) {
      this.setLineStartPoint(hit)
    } else {
      this.completeLine(this.lineStart, hit)
      this.lineStart = null
      this._clearPreview()
      this._redrawGridIfAvailable()
      this.updateButtonStates()
    }
  }

  /**
   * Update hover information for the current mouse position.
   *
   * Displays hover label with triangle coordinates, index, and neighbor count.
   * Updated on each mouse move to show current grid position.
   *
   * @param {MouseEvent} event - Mouse event from canvas
   * @returns {void}
   */
  updateHoverInfo (event) {
    if (!this.grid) return

    const hoverLabel = document.getElementById('tri-hover-info')
    if (!hoverLabel) return

    const { x, y } = this._getCanvasRelativePoint(event)
    const [r, c] = pixelToTri(
      x - this.grid.offsetX,
      y - this.grid.offsetY,
      this.grid.triSize
    )

    if (!this.grid.indexer.isValid(r, c)) {
      hoverLabel.textContent = 'Hover info: '
      return
    }

    const idx = this.grid.indexer.index(r, c)
    const neighbors = Array.from(this.grid.indexer.neighbors(r, c))
    const validNeighbors = neighbors.filter(([nr, nc]) =>
      this.grid.indexer.isValid(nr, nc)
    ).length

    hoverLabel.textContent = `Hover info: (${r}, ${c}) index: ${idx} neighbors: ${validNeighbors}`
  }

  /**
   * Compute transformed bits applying the selected map to the current mask.
   *
   * Applies a transform map (rotation, flip, etc.) to the current bit state.
   * Attempts to use explicit store/indexer if available, otherwise falls back
   * to actions.applyMap(). Returns unchanged bits if no map provided.
   *
   * @param {Array|Object} map - Transform map with index-to-index mappings
   * @param {ActionMetadata} [actions] - Optional action metadata (defaults to current)
   * @returns {(BigInt|number)} Transformed bit state
   */
  computeTransformedBits (map, actions) {
    if (!map) return this.grid.bits

    actions = actions || this.getCurrentActions()
    const mask = this.grid.mask
    const { store, indexer } = this._getActionContext(actions, mask)

    if (store && indexer) {
      return this._computeBitsFromMap(store, indexer, map, mask.bits)
    }

    try {
      return actions.applyMap(map)
    } catch (error) {
      console.warn('Error applying map:', error)
      return mask.bits
    }
  }

  /**
   * Resolve store and indexer from action metadata.
   *
   * Extracts bit store and grid indexer from action metadata, falling back
   * to mask properties if not available in actions.
   *
   * @param {ActionMetadata} actions - Action metadata
   * @param {MaskObject} mask - Mask object
   * @returns {{store: Object, indexer: Object}} Store and indexer objects
   * @private
   */
  _getActionContext (actions, mask) {
    return {
      store: actions.store || mask.store,
      indexer: actions.indexer || mask.indexer
    }
  }

  /**
   * Apply a map to each bit index and return the resulting bits.
   *
   * Iterates over all set bits in currentBits, maps each via the map array,
   * and accumulates results in new bitboard. Used for transform operations.
   *
   * @param {Object} store - Store object for bit operations
   * @param {Object} indexer - Indexer object for coordinate conversion
   * @param {Array} map - Transform map (index -> index)
   * @param {(BigInt|number)} currentBits - Current bit state
   * @returns {(BigInt|number)} Transformed bit state
   * @private
   */
  _computeBitsFromMap (store, indexer, map, currentBits) {
    let transformedBits = store.empty
    for (const index of indexer.bitsIndices(currentBits)) {
      transformedBits = store.addBit(transformedBits, map[index])
    }
    return transformedBits
  }

  /**
   * Check whether a morphology operation would change the mask.
   *
   * Performs a dry-run test by cloning the mask and applying the operation.
   * Returns true if the operation would produce a different result.
   *
   * @param {string} op - Operation name: 'dilate', 'erode', or 'cross'
   * @returns {boolean} True if operation would change the mask
   * @private
   */
  _canApplyMorphology (op) {
    const mask = this.grid.mask
    const test = this._cloneMask(mask)
    test.bits = mask.bits

    if (op === 'dilate') test.dilate()
    else if (op === 'erode') test.erode()
    else if (op === 'cross') test.dilateCross()

    return test.bits !== mask.bits
  }

  /**
   * Clone an existing mask object for a dry-run operation.
   *
   * Creates a shallow clone preserving prototype chain. Used to test
   * operations without modifying the original mask.
   *
   * @param {MaskObject} mask - Mask object to clone
   * @returns {MaskObject} Shallow clone of the mask
   * @private
   */
  _cloneMask (mask) {
    return Object.assign(Object.create(Object.getPrototypeOf(mask)), mask)
  }

  /**
   * Get morphology button enable state.
   *
   * Determines which morphology operations can be applied by testing each.
   * Used to enable/disable corresponding UI buttons.
   *
   * @returns {MorphologyCapabilities} Capabilities for dilate, erode, cross
   * @private
   */
  _getMorphologyCapabilities () {
    return {
      canDilate: this._canApplyMorphology('dilate'),
      canErode: this._canApplyMorphology('erode'),
      canCross: this._canApplyMorphology('cross')
    }
  }

  /**
   * Update rotate button disabled state.
   *
   * Disables rotate button if the r120 (120° rotation) map doesn't exist
   * or if applying it wouldn't change the current mask.
   *
   * @param {Object} maps - Transform maps from actions
   * @param {ActionMetadata} actions - Action metadata
   * @returns {void}
   * @private
   */
  _updateRotateButton (maps, actions) {
    if (!this.rotateBtn) return
    const rotateMap = maps?.r120 || maps?.[1]
    this.rotateBtn.disabled = this._shouldDisableTransformButton(
      rotateMap,
      actions
    )
  }

  /**
   * Update flip buttons disabled state.
   *
   * Iterates over flip buttons and disables each if its corresponding
   * transform map doesn't exist or wouldn't change the mask.
   *
   * @param {Object} maps - Transform maps from actions
   * @param {ActionMetadata} actions - Action metadata
   * @returns {void}
   * @private
   */
  _updateFlipButtons (maps, actions) {
    this.flipButtons.forEach(btn => {
      const map = maps?.[btn.dataset.map]
      btn.disabled = this._shouldDisableTransformButton(map, actions)
    })
  }

  /**
   * Determine whether a transform button should be disabled.
   *
   * Button is disabled if:
   * - No map provided (operation not available)
   * - Applying map produces same bits as current (no change possible)
   *
   * @param {Array|Object} map - Transform map
   * @param {ActionMetadata} actions - Action metadata
   * @returns {boolean} True if button should be disabled
   * @private
   */
  _shouldDisableTransformButton (map, actions) {
    return !map || this.computeTransformedBits(map, actions) === this.grid.bits
  }

  /**
   * Update morphology button state.
   *
   * Enables/disables dilate, erode, and cross buttons based on whether
   * each operation would change the current mask.
   *
   * @returns {void}
   * @private
   */
  _updateMorphologyButtons () {
    const morph = this._getMorphologyCapabilities()
    if (this.dilateBtn) this.dilateBtn.disabled = !morph.canDilate
    if (this.erodeBtn) this.erodeBtn.disabled = !morph.canErode
    if (this.crossBtn) this.crossBtn.disabled = !morph.canCross
  }

  /**
   * Update symmetry display.
   *
   * Updates UI elements showing the orbit type (symmetry classification)
   * and available transform maps. Handles errors gracefully by displaying 'n/a'.
   *
   * @param {ActionMetadata} actions - Current action metadata
   * @returns {void}
   * @private
   */
  _updateSymmetryDisplay (actions) {
    const symEl = document.getElementById('tri-symmetry')
    if (symEl) {
      try {
        const sym =
          actions?.classifyOrbitType?.() ||
          this.grid.mask.actions?.classifyOrbitType?.() ||
          'n/a'
        symEl.textContent = `Symmetry: ${sym}`
      } catch (e) {
        symEl.textContent = 'Symmetry: n/a'
        console.warn('Error updating symmetry display:', e)
      }
    }

    const detailsEl = document.getElementById('tri-symmetry-details')
    if (detailsEl) {
      try {
        const maps =
          actions?.transformMaps || this.grid.mask.actions?.transformMaps
        const template = actions?.template || this.grid.mask.actions?.template
        const mapKeys = maps ? Object.keys(maps).join(', ') : 'n/a'
        detailsEl.textContent = `Template: ${
          template || 'n/a'
        } — Maps: ${mapKeys}`
      } catch (e) {
        detailsEl.textContent = ''
        console.warn('Error updating symmetry details:', e)
      }
    }
  }

  /**
   * Update all button states.
   *
   * Syncs grid mask with current bits, then updates UI button disabled states
   * for transforms, morphology, and displays symmetry information.
   * Called after any operation that changes the mask.
   *
   * @returns {void}
   */
  updateButtonStates () {
    if (!this.grid) return
    const actions = this.syncMaskWithDraw()
    const maps = actions?.transformMaps
    if (!maps) return

    this._updateRotateButton(maps, actions)
    this._updateFlipButtons(maps, actions)
    this._updateMorphologyButtons()
    this._updateSymmetryDisplay(actions)
  }

  /**
   * Apply transform operation.
   *
   * Computes transformed bits using the map at mapIndex, updates the mask
   * and grid if the result differs, and refreshes button states.
   * Safe no-op if map doesn't exist or transform produces no change.
   *
   * @param {string} mapIndex - Key of the transform map (r120, r240, f0, f1, f2, id)
   * @returns {void}
   */
  applyTransform (mapIndex) {
    const mask = this.grid.mask
    const actions = this.syncMaskWithDraw()
    const maps = actions.transformMaps
    const map = maps[mapIndex]
    if (!map) return

    const transformedBits = this.computeTransformedBits(map, actions)
    if (transformedBits !== this.grid.bits) {
      mask.bits = transformedBits
      this.grid.setBits(transformedBits)
      this.updateButtonStates()
    }
  }

  /**
   * Apply morphology operation.
   *
   * Applies the specified morphology operation (dilate, erode, or cross)
   * to the mask, updates the grid, and refreshes button states.
   * No-op if operation is unrecognized.
   *
   * @param {string} operation - Operation type: 'dilate', 'erode', or 'cross'
   * @returns {void}
   */
  applyMorphology (operation) {
    if (!this.grid) return
    const mask = this.grid.mask

    if (operation === 'dilate') mask.dilate()
    else if (operation === 'erode') mask.erode()
    else if (operation === 'cross') mask.dilateCross()

    this.grid.setBits(mask.bits)
    if (typeof this.grid.redraw === 'function') this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Get selectors for UI elements.
   *
   * Returns HTML element IDs and CSS selectors used by this controller.
   *
   * @returns {string} Selector for line action dropdown element
   */
  /**
   * Get selector for line action dropdown element.
   *
   * @returns {HTMLElement|null} Line action dropdown element
   */
  getLineActionDropdown () {
    return document.getElementById('tri-line-action')
  }

  /**
   * Get CSS selector for cover type radio buttons.
   *
   * @returns {string} CSS selector for cover type input elements
   */
  getCoverTypeRadioSelector () {
    return 'input[name="tri-cover-type"]'
  }

  /**
   * Create flip buttons dynamically from transform map keys.
   *
   * Generates button for each available transform (r120, r240, f0, f1, f2)
   * using labels from ActionsTri.D3_LABELS, wires click handlers to apply
   * transform, and appends to flipButtonsContainer.
   *
   * @returns {void}
   */
  createFlipButtons () {
    if (!this.flipButtonsContainer || !this.grid) return

    const actions = this.getCurrentActions()
    if (!actions) return

    const mapKeys = ['id', 'r120', 'r240', 'f0', 'f1', 'f2']
    const labels = ActionsTri.D3_LABELS || mapKeys

    mapKeys.forEach((key, i) => {
      if (key === 'id') return // Skip identity transform

      const btn = document.createElement('button')
      btn.className = 'flipBtn'
      btn.textContent = labels[i] || key
      btn.dataset.map = key
      btn.addEventListener('click', () => this.applyTransform(key))

      this.flipButtonsContainer.appendChild(btn)
      this.flipButtons.push(btn)
    })
  }

  /**
   * Wire line tool buttons.
   *
   * Connects radio buttons to setTool(), handling tool selection changes.
   * Maps button values to tool types (null, segment, ray, full).
   *
   * @returns {void}
   */
  wireLineToolButtons () {
    if (typeof document === 'undefined') return

    const toolMap = {
      single: null,
      segment: 'segment',
      ray: 'ray',
      full: 'full'
    }
    wireAllLineToolButtons('input[name="tri-line-tool"]', toolMap, tool =>
      this.setTool(tool)
    )
  }

  /**
   * Wire a button to a handler function.
   *
   * Adds click event listener to button element if it exists.
   *
   * @param {Element} btn - Button element to wire
   * @param {Function} handler - Click event handler
   * @returns {void}
   * @private
   */
  _wireButton (btn, handler) {
    if (btn) btn.addEventListener('click', handler)
  }

  /**
   * Wire transform (rotate) button.
   *
   * Connects rotate button click to apply 120° rotation transform.
   *
   * @returns {void}
   */
  wireTransformButtons () {
    this._wireButton(this.rotateBtn, () => this.applyTransform('r120'))
  }

  /**
   * Wire morphology (dilate, erode, cross) buttons.
   *
   * Connects morphology buttons to their respective operation handlers.
   *
   * @returns {void}
   */
  wireMorphologyButtons () {
    this._wireButton(this.dilateBtn, () => this.applyMorphology('dilate'))
    this._wireButton(this.erodeBtn, () => this.applyMorphology('erode'))
    this._wireButton(this.crossBtn, () => this.applyMorphology('cross'))
  }

  /**
   * Apply mask mutation and refresh UI.
   *
   * Computes new mask bits using provided function, updates grid,
   * redraws canvas, and refreshes button states. Used for empty, full, inverse operations.
   *
   * @param {Function} getMaskBits - Function that transforms mask to new bits
   * @returns {void}
   * @private
   */
  _applyMaskMutation (getMaskBits) {
    this.grid.mask.bits = getMaskBits(this.grid.mask)
    this.grid.setBits(this.grid.mask.bits)
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Wire mask mutation buttons (empty, full, inverse).
   *
   * Connects buttons for mask mutations: empty clears all cells, full sets all,
   * inverse toggles all cells. Each button triggers _applyMaskMutation with
   * appropriate mask function.
   *
   * @returns {void}
   */
  wireActionButtons () {
    if (!this.grid || typeof document === 'undefined') return
    const maskMutations = {
      empty: mask => mask.emptyMask.bits,
      full: mask => mask.fullMask.bits,
      inverse: mask => mask.invertedMask.bits
    }
    Object.entries(maskMutations).forEach(([id, getMaskBits]) => {
      const el = document.getElementById(id)
      if (el && el !== this.grid.canvas) {
        this._wireButton(el, () => this._applyMaskMutation(getMaskBits))
      }
    })
  }

  /**
   * Set example cells.
   *
   * Populates the grid with example cells at coordinates (0,0), (1,0), (1,1).
   * Used for demo or reset purposes.
   *
   * @returns {void}
   */
  setExampleCells () {
    if (!this.grid) return
    this.grid.setBitsFromCoords([
      [0, 0],
      [1, 0],
      [1, 1]
    ])
  }

  /**
   * Cache button element references for later use.
   *
   * Queries DOM for button elements and stores references for efficiency.
   * Called during initialization to avoid repeated DOM lookups.
   *
   * @returns {void}
   * @private
   */
  _cacheButtonReferences () {
    this.rotateBtn = document.getElementById('rotateBtn')
    this.flipButtonsContainer = document.getElementById('flipButtons')
    this.dilateBtn = document.getElementById('dilateBtn')
    this.erodeBtn = document.getElementById('erodeBtn')
    this.crossBtn = document.getElementById('crossDilateBtn')
  }

  /**
   * Initialize all UI components and listeners.
   *
   * Complete setup sequence:
   * 1. Cache button references for later access
   * 2. Set example cells to populate grid
   * 3. Create flip transform buttons dynamically
   * 4. Wire all event listeners (transforms, morphology, tools, actions)
   * 5. Sync UI dropdowns with current state
   * 6. Attach canvas event handlers
   * 7. Render grid and update button states
   *
   * Called once after DOM is ready and grid is initialized.
   *
   * @returns {void}
   */
  initializeAll () {
    if (!this.grid) return
    this._cacheButtonReferences()
    this.setExampleCells()
    this.createFlipButtons()
    this.wireButtons()
    this.syncLineActionDropdown()
    this.attachCanvasListeners()
    this.grid.redraw()
    this.updateButtonStates()
  }
}
