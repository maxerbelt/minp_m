import { GridCanvas } from '../GridCanvas.js'
import {
  findRotationStepIndex,
  computeTransformedBits,
  checkMorphologyState,
  updateSymmetryAndDetails,
  wireAllLineToolButtons
} from '../gridButtonUtils.js'
import { drawHex, hexToPixel } from './hexdrawhelper.js'

// Constants for tool and action types
const TOOL_TYPES = {
  SINGLE: 'single',
  SEGMENT: 'segment',
  RAY: 'ray',
  FULL: 'full'
}

const ACTIONS = {
  SET: 'set',
  CLEAR: 'clear',
  TOGGLE: 'toggle'
}

const COVER_TYPES = {
  NORMAL: 'normal',
  SUPER_COVER: 'superCover',
  HALF_COVER: 'halfCover'
}

/**
 * Hexagonal grid canvas UI controller
 * Manages UI and interactions for hexagonal grids
 */
export class HexCanvas extends GridCanvas {
  /**
   * Initialize the hexagonal canvas controller
   * @param {string} canvasId - ID of the canvas element
   * @param {HexDraw} hexDraw - The hexagonal drawing instance
   * @param {Object} config - Configuration options
   */
  constructor (canvasId, hexDraw, config = {}) {
    super(canvasId, hexDraw, config)

    // Override cover type values for hex (uses superCover, halfCover instead of super, half)
    this.coverType = COVER_TYPES.NORMAL

    // Setup cell overrides
    this._overrideGridToggleCellBehavior()
    this._overrideGridHoverPreview()
  }

  /**
   * Apply action (set/clear/toggle) to a single bit value.
   * @param {number} idx - Index of bit.
   * @param {number} val - Current bit value (0 or 1).
   * @returns {number} New bit value after action.
   * @private
   */
  _applyActionToBit (idx, val) {
    if (this.currentAction === ACTIONS.SET) return 1
    if (this.currentAction === ACTIONS.CLEAR) return 0
    if (this.currentAction === ACTIONS.TOGGLE) return val ? 0 : 1
    return val
  }

  /**
   * Get current bit value at index from mask.
   * @param {Object} mask - Mask object with bits property.
   * @param {number} idx - Bit index to check.
   * @returns {number} Bit value (0 or 1).
   * @private
   */
  _getBitValue (mask, idx) {
    if (typeof mask.bits === 'bigint') {
      return Number((mask.bits >> BigInt(idx)) & 1n)
    }
    return mask.atIndex ? mask.atIndex(idx) : (mask.bits >> idx) & 1
  }

  /**
   * Apply action to multiple indices and update mask bits.
   * @param {Object} mask - Mask object to update.
   * @param {number[]} indices - Array of bit indices to update.
   * @private
   */
  _applyActionToIndices (mask, indices) {
    for (const idx of indices) {
      const val = this._getBitValue(mask, idx)
      const newVal = this._applyActionToBit(idx, val)
      mask.bits = mask.setIndex(idx, newVal)
    }
  }

  /**
   * Override grid toggle cell behavior to respect current action setting.
   * @private
   */
  _overrideGridToggleCellBehavior () {
    if (!this.grid?.toggleCell) return

    this.grid.toggleCell = idx => {
      // Don't toggle when line tool active or index is null
      if (this.currentTool || idx == null) return
      if (!this.grid?.mask) return

      this._applyActionToIndices(this.grid.mask, [idx])
      this.grid.setBits(this.grid.mask.bits)
      if (typeof this.grid.redraw === 'function') this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Override grid hover preview to show line preview in orange.
   * @private
   */
  _overrideGridHoverPreview () {
    if (!this.grid?._drawHover) return
    if (this.grid._drawHover._isOverridden) return

    const origDrawHover = this.grid._drawHover.bind(this.grid)
    this.grid._drawHover = function () {
      if (this.linePreviewIndices?.length) {
        for (const i of this.linePreviewIndices) {
          const [q, r] = this.indexer.coords[i]
          const { x, y } = hexToPixel(q, r, this.hexSize)
          drawHex(
            this.ctx,
            x + this.offsetX,
            y + this.offsetY,
            this.hexSize,
            '#FF9800'
          )
        }
      }
      origDrawHover()
    }
    this.grid._drawHover._isOverridden = true
  }

  /**
   * Sync mask bits with current draw bits and return current actions.
   * @returns {Object|undefined} Current actions from mask.
   */
  syncMaskWithDraw () {
    if (!this.grid?.mask) return
    this.grid.mask.bits = this.grid.bits
    return this.grid.mask.actions
  }

  /**
   * Get current actions from the grid mask.
   * @returns {Object|undefined} Current actions object.
   */
  getCurrentActions () {
    return this.grid?.mask?.actions
  }

  /**
   * Get rotation step index from transform maps.
   * @param {Array} maps - Array of transform maps.
   * @returns {number|null} Rotation step index or null.
   */
  getRotationStep (maps) {
    return findRotationStepIndex(maps)
  }

  /**
   * Get hit test result from canvas mouse event.
   * @param {MouseEvent} e - Mouse event.
   * @returns {number|null} Hit test index or null.
   */
  hitTest (e) {
    if (!this.grid) return null
    const rect = this.grid.canvas.getBoundingClientRect()
    return this.grid._hitTest(e.clientX - rect.left, e.clientY - rect.top)
  }

  /**
   * Get line drawing method name based on tool and cover type.
   * @param {string} tool - Tool type ('segment', 'ray', 'full').
   * @returns {string} Method name to call on indexer.
   * @private
   */
  _getLineMethodName (tool) {
    let methodName = tool
    if (this.coverType === COVER_TYPES.SUPER_COVER) {
      methodName = 'superCover' + tool.charAt(0).toUpperCase() + tool.slice(1)
    } else if (this.coverType === COVER_TYPES.HALF_COVER) {
      methodName = 'halfCover' + tool.charAt(0).toUpperCase() + tool.slice(1)
    }
    return methodName
  }

  /**
   * Get line coordinates using tool-specific method from indexer.
   * @param {number} sq - Start q coordinate.
   * @param {number} sr - Start r coordinate.
   * @param {number} eq - End q coordinate.
   * @param {number} er - End r coordinate.
   * @returns {Array} Array of [q, r] coordinate pairs.
   * @private
   */
  _getLineCoordinates (sq, sr, eq, er) {
    const indexer = this.grid.indexer
    const methodName = this._getLineMethodName(this.currentTool)
    let coords = []

    if (typeof indexer[methodName] === 'function') {
      coords = Array.from(indexer[methodName](sq, sr, eq, er))
    } else {
      // Fallback to standard methods
      switch (this.currentTool) {
        case TOOL_TYPES.SEGMENT:
          coords = Array.from(indexer.segmentTo(sq, sr, eq, er))
          break
        case TOOL_TYPES.RAY:
          coords = Array.from(indexer.ray(sq, sr, eq, er))
          break
        case TOOL_TYPES.FULL:
          coords = Array.from(indexer.fullLine(sq, sr, eq, er))
          break
        default:
          return []
      }
    }
    return coords
  }

  /**
   * Compute preview indices for line drawing between start and end points.
   * @param {number} startIdx - Starting cell index.
   * @param {number} endIdx - Ending cell index.
   * @returns {number[]} Array of indices along the line.
   */
  computePreviewIndices (startIdx, endIdx) {
    if (startIdx == null || endIdx == null) return []
    if (!this.currentTool || this.currentTool === TOOL_TYPES.SINGLE) return []

    const indexer = this.grid.indexer
    const [sq, sr] = indexer.coords[startIdx]
    const [eq, er] = indexer.coords[endIdx]

    const coords = this._getLineCoordinates(sq, sr, eq, er)
    const indices = []

    for (const [q, r] of coords) {
      const s = -q - r
      const i = indexer.index(q, r, s)
      if (i !== undefined) indices.push(i)
    }
    return indices
  }

  /**
   * Update line preview on canvas for current start and end points.
   * @param {number} start - Starting cell index.
   * @param {number} end - Ending cell index.
   */
  updateLinePreview (start, end) {
    if (
      !this.grid ||
      this.currentTool === TOOL_TYPES.SINGLE ||
      !this.currentTool
    )
      return

    this.grid.linePreviewIndices = this.computePreviewIndices(start, end)
    this.grid.redraw()
  }

  /**
   * Apply line action to all cells along the line from start to end.
   * @param {number} start - Starting cell index.
   * @param {number} end - Ending cell index.
   */
  completeLine (start, end) {
    if (!this.grid) return
    const mask = this.grid.mask
    const indices = this.computePreviewIndices(start, end)

    this._applyActionToIndices(mask, indices)
    this.grid.setBits(mask.bits)
    if (typeof this.grid.redraw === 'function') this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Handle canvas click event for cell interaction and line drawing.
   * @param {MouseEvent} e - Click event.
   */
  onCanvasClick (e) {
    if (!this.grid || !this.currentTool) return

    const hit = this.hitTest(e)
    if (hit == null) return

    // Single mode: delegate to toggleCell
    if (this.currentTool === TOOL_TYPES.SINGLE) {
      this.grid.toggleCell(hit)
      return
    }

    // Line tool modes: use two-point drawing
    if (this.lineStart) {
      this.completeLine(this.lineStart, hit)
      this.lineStart = null
      this.grid.linePreviewIndices = []
      this.grid.redraw()
      this.updateButtonStates()
    } else {
      this.setLineStartPoint(hit)
    }
  }

  /**
   * Update hover info display with hex coordinates and neighbor count.
   * @param {MouseEvent} e - Mouse event.
   */
  updateHoverInfo (e) {
    if (!this.grid) return

    const hoverLabel = document.getElementById('hex-hover-info')
    if (!hoverLabel) return

    const hit = this.hitTest(e)
    if (hit === null || hit === undefined) {
      hoverLabel.textContent = 'Hover info: '
      return
    }

    const [q, r] = this.grid.indexer.coords[hit]
    const s = -q - r
    const neighbors = Array.from(this.grid.indexer.neighbors(q, r, s))
    const validNeighbors = neighbors.filter(([nq, nr, ns]) =>
      this.grid.indexer.isValid(nq, nr, ns)
    ).length

    hoverLabel.textContent = `Hover info: (${q}, ${r}, ${s}) index: ${hit} neighbors: ${validNeighbors}`
  }

  /**
   * Check if morphology operation would change the current mask.
   * @param {string} op - Operation type ('dilate', 'erode', 'cross').
   * @returns {boolean} True if operation would have an effect.
   */
  checkMorphology (op) {
    if (!this.grid?.mask) return false
    return checkMorphologyState(this.grid.mask, op)
  }

  /**
   * Get morphology operation capabilities for current mask.
   * @returns {Object} Object with canDilate, canErode, canCross boolean flags.
   */
  getMorphologyCapabilities () {
    if (!this.grid?.mask) {
      return {
        canDilate: false,
        canErode: false,
        canCross: false
      }
    }
    return {
      canDilate: this.checkMorphology('dilate'),
      canErode: this.checkMorphology('erode'),
      canCross: this.checkMorphology('cross')
    }
  }

  /**
   * Update rotate button state based on transform maps.
   * @param {Array} maps - Array of transform maps.
   * @private
   */
  _updateRotateButton (maps) {
    if (!this.rotateBtn || !this.grid?.mask) return
    const rStep = this.getRotationStep(maps)
    const mask = this.grid.mask
    const actions = this.getCurrentActions()
    const b = this.grid.bits
    this.rotateBtn.disabled =
      rStep === null ||
      computeTransformedBits(mask, maps?.[rStep], actions) === b
  }

  /**
   * Update flip buttons state based on transform maps.
   * @param {Array} maps - Array of transform maps.
   * @private
   */
  _updateFlipButtons (maps) {
    if (!this.flipButtons || !this.grid?.mask) return
    const mask = this.grid.mask
    const actions = this.getCurrentActions()
    const b = this.grid.bits
    this.flipButtons.forEach(btn => {
      const mapIdx = Number(btn.dataset.map)
      const map = maps?.[mapIdx]
      btn.disabled = !map || computeTransformedBits(mask, map, actions) === b
    })
  }

  /**
   * Update morphology buttons state based on current mask.
   * @private
   */
  _updateMorphologyButtons () {
    if (!this.grid?.mask) return
    const morph = this.getMorphologyCapabilities()
    if (this.dilateBtn) this.dilateBtn.disabled = !morph.canDilate
    if (this.erodeBtn) this.erodeBtn.disabled = !morph.canErode
  }

  /**
   * Update symmetry display with current actions.
   * @param {Object} actions - Current actions object.
   * @private
   */
  _updateSymmetryDisplay (actions) {
    updateSymmetryAndDetails(
      document.getElementById('hex-symmetry'),
      document.getElementById('hex-symmetry-details'),
      actions,
      null
    )
  }

  /**
   * Update all button states based on current grid state.
   */
  updateButtonStates () {
    if (!this.grid) return

    const actions = this.getCurrentActions()
    const maps = actions?.transformMaps

    this._updateRotateButton(maps)
    this._updateFlipButtons(maps)
    this._updateMorphologyButtons()
    this._updateSymmetryDisplay(actions)
  }

  /**
   * Apply transform operation using specified map index.
   * @param {number} mapIndex - Index of transform map to apply.
   */
  applyTransform (mapIndex) {
    if (!this.grid?.mask) return

    const mask = this.grid.mask
    const actions = this.syncMaskWithDraw()
    const maps = actions?.transformMaps
    const map = maps?.[mapIndex]
    if (!map) return

    const store = actions?.store || mask.store
    const indexer = actions?.indexer || mask.indexer

    if (store && indexer) {
      let transformedBits = store.empty
      for (const i of indexer.bitsIndices(mask.bits)) {
        transformedBits = store.addBit(transformedBits, map[i])
      }
      if (transformedBits !== this.grid.bits) {
        mask.bits = transformedBits
        this.grid.setBits(transformedBits)
        this.updateButtonStates()
      }
    } else {
      const newBits = actions?.applyMap?.(map)
      if (newBits && newBits !== this.grid.bits) {
        this.grid.setBits(newBits)
        this.updateButtonStates()
      }
    }
  }

  /**
   * Apply morphology operation to the current mask.
   * @param {string} operation - Operation type ('dilate', 'erode', 'cross').
   */
  applyMorphology (operation) {
    if (!this.grid?.mask) return

    const mask = this.grid.mask
    this.syncMaskWithDraw()

    if (operation === 'dilate') mask.dilate()
    else if (operation === 'erode') mask.erode()
    else if (operation === 'cross') mask.dilateCross()

    this.grid.setBits(mask.bits)
    if (typeof this.grid.redraw === 'function') this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Get selectors for UI elements
   */
  getLineActionDropdown () {
    return document.getElementById('hex-line-action')
  }

  getCoverTypeRadioSelector () {
    return 'input[name="hex-line-cover"]'
  }

  /**
   * Wire line tool buttons
   */
  wireLineToolButtons () {
    if (typeof document === 'undefined') return

    const toolMap = {
      single: null,
      segment: 'segment',
      ray: 'ray',
      full: 'full'
    }
    wireAllLineToolButtons('input[name="hex-line-tool"]', toolMap, tool =>
      this.setTool(tool)
    )
  }

  /**
   * Wire a button to a handler function.
   * @param {Element} btn - Button element.
   * @param {Function} handler - Click handler.
   * @private
   */
  _wireButton (btn, handler) {
    if (btn) btn.addEventListener('click', handler)
  }

  /**
   * Wire transform (rotate and flip) buttons.
   */
  wireTransformButtons () {
    this._wireButton(this.rotateBtn, () => {
      const maps = this.getCurrentActions()?.transformMaps
      const rStep = this.getRotationStep(maps)
      if (rStep !== null) this.applyTransform(rStep)
    })

    this.flipButtons?.forEach(btn => {
      this._wireButton(btn, () => {
        const idx = Number(btn.dataset.map)
        this.applyTransform(idx)
      })
    })
  }

  /**
   * Wire morphology (dilate, erode) buttons.
   */
  wireMorphologyButtons () {
    this._wireButton(this.dilateBtn, () => this.applyMorphology('dilate'))
    this._wireButton(this.erodeBtn, () => this.applyMorphology('erode'))
  }

  /**
   * Apply mask mutation and refresh UI.
   * @param {Function} getMaskBits - Function to get new mask bits.
   * @private
   */
  _applyMaskMutation (getMaskBits) {
    if (!this.grid?.mask) return
    this.grid.mask.bits = getMaskBits(this.grid.mask)
    this.grid.setBits(this.grid.mask.bits)
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Wire mask mutation buttons (empty, full, inverse).
   */
  wireActionButtons () {
    if (!this.grid?.mask || typeof document === 'undefined') return

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
   * Cache button element references for later use.
   * @private
   */
  _cacheButtonReferences () {
    this.rotateBtn = document.getElementById('rotateBtn')
    this.flipButtons = Array.from(document.querySelectorAll('.flipBtn'))
    this.dilateBtn = document.getElementById('dilateBtn')
    this.erodeBtn = document.getElementById('erodeBtn')
  }

  /**
   * Set example cells for demonstration.
   */
  setExampleCells () {
    if (!this.grid) return
    this.grid.setBitsFromCoords([
      [0, 0, 0],
      [1, -1, 0],
      [0, 1, -1]
    ])
  }

  /**
   * Initialize all UI components and listeners.
   */
  initializeAll () {
    if (!this.grid) return

    this._cacheButtonReferences()
    this.setExampleCells()
    this.wireButtons()
    this.syncLineActionDropdown()
    this.syncCoverTypeRadios()
    this.attachCanvasListeners()
    this.grid.redraw()
    this.updateButtonStates()
  }
}
