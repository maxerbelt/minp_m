import { GridCanvas } from '../GridCanvas.js'
import { ActionsTri } from '../../grid/triangle/actionsTri.js'
import { drawTri, triToPixel, pixelToTri } from './triDrawHelper.js'
import { wireAllLineToolButtons } from '../gridButtonUtils.js'

// Constants for tool and action types
const TOOL_TYPES = {
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
  HALF: 'half',
  SUPER: 'super'
}

/**
 * Triangular grid canvas UI controller
 * Manages UI and interactions for triangular grids
 */
export class TriCanvas extends GridCanvas {
  constructor (canvasId, triDraw, config = {}) {
    super(canvasId, triDraw, config)

    this.rotateBtn = null
    this.flipButtons = []
    this.flipButtonsContainer = null

    // Setup cell overrides
    this._overrideGridToggleCellBehavior()
    this._overrideGridHoverPreview()
  }

  /**
   * Set the current line drawing tool.
   * @param {string|null} tool - Tool type: 'segment', 'ray', 'full', or null for single cell mode.
   */
  setTool (tool) {
    this.currentTool = tool
    this.lineStart = null
    if (this.grid) {
      this.grid.previewCells = []
      if (typeof this.grid.redraw === 'function') {
        this.grid.redraw()
      }
    }
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
   * Get current bit value at index.
   * @param {Object} mask - Mask object with bits.
   * @param {number} idx - Index.
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
   * Apply action to multiple indices and update mask.
   * @param {Object} mask - Mask to update.
   * @param {Array} indices - Indices to update.
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
   * Override grid toggle cell to respect action value.
   * @private
   */
  _overrideGridToggleCellBehavior () {
    if (!this.grid?.toggleCell) return

    this.grid.toggleCell = idx => {
      if (idx == null || this.currentTool) return
      this._applyActionToIndices(this.grid.mask, [idx])
      this.grid.setBits(this.grid.mask.bits)
      if (typeof this.grid.redraw === 'function') this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Override hover drawing to show line preview in orange.
   * @private
   */
  _overrideGridHoverPreview () {
    if (!this.grid || !this.grid._drawHover) return
    if (this.grid._drawHover._isOverridden) return

    const origDrawHover = this.grid._drawHover.bind(this.grid)
    this.grid._drawHover = function () {
      if (this.previewCells?.length) {
        for (const i of this.previewCells) {
          const [r, c] = this.indexer.location(i)
          const { x, y } = triToPixel(r, c, this.triSize)
          const orient = c % 2 === 0 ? 'up' : 'down'
          const yoff = orient === 'down' ? y - this.triHeight * 0.3 : y
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
    this.grid._drawHover._isOverridden = true
  }

  /**
   * Sync mask with draw and get current actions
   */
  syncMaskWithDraw () {
    this.grid.mask.bits = this.grid.bits
    return this.grid.mask.actions
  }

  /**
   * Get current actions
   */
  getCurrentActions () {
    return this.grid?.mask?.actions
  }

  /**
   * Get hit test result from canvas event (convert pixel to tri coords then to index)
   */
  hitTest (e) {
    if (!this.grid) return null

    const rect = this.grid.canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const [r, c] = pixelToTri(
      px - this.grid.offsetX,
      py - this.grid.offsetY,
      this.grid.triSize
    )

    if (!this.grid.indexer.isValid(r, c)) return null
    return this.grid.indexer.index(r, c)
  }

  /**
   * Get line coordinates using tool-specific method.
   * @param {number} sr - Start row.
   * @param {number} sc - Start column.
   * @param {number} er - End row.
   * @param {number} ec - End column.
   * @returns {Array} Coordinate array.
   * @private
   */
  _getLineCoordinates (sr, sc, er, ec) {
    const indexer = this.grid.indexer
    const coverType = this.coverType || COVER_TYPES.NORMAL
    let coords = []

    const toolKey =
      this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1)
    let methodName = toolKey.toLowerCase()

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

    if (typeof indexer[methodName] === 'function') {
      coords = Array.from(indexer[methodName](sr, sc, er, ec))
    }
    return coords
  }

  /**
   * Compute preview indices for line drawing.
   * @param {number} startIdx - Start index.
   * @param {number} endIdx - End index.
   * @returns {Array} Indices along the line.
   */
  computePreviewIndices (startIdx, endIdx) {
    if (startIdx == null || endIdx == null || !this.currentTool) return []

    const indexer = this.grid.indexer
    const [sr, sc] = indexer.location(startIdx)
    const [er, ec] = indexer.location(endIdx)
    const coords = this._getLineCoordinates(sr, sc, er, ec)

    const indices = []
    for (const [r, c] of coords) {
      const i = indexer.index(r, c)
      if (i !== undefined) indices.push(i)
    }
    return indices
  }

  /**
   * Update line preview on canvas.
   */
  updateLinePreview (start, end) {
    if (!this.grid || !this.currentTool) return
    this.grid.previewCells = this.computePreviewIndices(start, end)
    this.grid.redraw()
  }

  /**
   * Apply line action to all cells in line.
   */
  completeLine (start, end) {
    if (!this.grid) return
    const indices = this.computePreviewIndices(start, end)
    this._applyActionToIndices(this.grid.mask, indices)
    this.grid.setBits(this.grid.mask.bits)
    if (typeof this.grid.redraw === 'function') this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Handle canvas click.
   */
  onCanvasClick (e) {
    if (!this.grid || !this.currentTool) return
    const hit = this.hitTest(e)
    if (hit == null) return

    if (this.lineStart == null) {
      this.setLineStartPoint(hit)
    } else {
      this.completeLine(this.lineStart, hit)
      this.lineStart = null
      this.grid.previewCells = []
      this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Update hover info with triangle coordinates and neighbor count
   */
  updateHoverInfo (e) {
    if (!this.grid) return

    const hoverLabel = document.getElementById('tri-hover-info')
    if (!hoverLabel) return

    const rect = this.grid.canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const [r, c] = pixelToTri(
      px - this.grid.offsetX,
      py - this.grid.offsetY,
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
   * Compute transformed bits using store/indexer pattern
   */
  computeTransformedBits (map, actions) {
    if (!map) return this.grid.bits

    actions = actions || this.getCurrentActions()
    const mask = this.grid.mask
    const store = actions.store || mask.store
    const indexer = actions.indexer || mask.indexer

    if (store && indexer) {
      let transformedBits = store.empty
      for (const i of indexer.bitsIndices(mask.bits)) {
        transformedBits = store.addBit(transformedBits, map[i])
      }
      return transformedBits
    }

    try {
      return actions.applyMap(map)
    } catch (e) {
      console.warn('Error applying map:', e)
      return mask.bits
    }
  }

  /**
   * Check if morphology operation would change mask.
   * @param {string} op - Operation type (dilate, erode, cross).
   * @returns {boolean} True if operation would have effect.
   * @private
   */
  _canApplyMorphology (op) {
    const mask = this.grid.mask
    const original = mask.bits
    const test = Object.assign(Object.create(Object.getPrototypeOf(mask)), mask)
    test.bits = original

    if (op === 'dilate') test.dilate()
    else if (op === 'erode') test.erode()
    else if (op === 'cross') test.dilateCross()

    return test.bits !== original
  }

  /**
   * Get morphology operation capabilities.
   * @returns {Object} Object with canDilate, canErode, canCross flags.
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
   * Update rotate button state.
   * @param {Array} maps - Transform maps.
   * @private
   */
  _updateRotateButton (maps, actions) {
    if (!this.rotateBtn) return
    const rmap = maps?.r120 || maps?.[1]
    this.rotateBtn.disabled =
      !rmap || this.computeTransformedBits(rmap, actions) === this.grid.bits
  }

  /**
   * Update flip buttons state.
   * @param {Array} maps - Transform maps.
   * @param {Array} actions - Current actions.
   * @private
   */
  _updateFlipButtons (maps, actions) {
    this.flipButtons.forEach(btn => {
      const map = maps?.[btn.dataset.map]
      btn.disabled =
        !map || this.computeTransformedBits(map, actions) === this.grid.bits
    })
  }

  /**
   * Update morphology buttons state.
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
   * @param {Array} actions - Current actions.
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
      }
    }
  }

  /**
   * Update all button states.
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
   * Apply transform operation
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
   * Apply morphology operation
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
   * Get selectors for UI elements
   */
  getLineActionDropdown () {
    return document.getElementById('tri-line-action')
  }

  getCoverTypeRadioSelector () {
    return 'input[name="tri-cover-type"]'
  }

  /**
   * Create flip buttons dynamically from transform map keys
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
    wireAllLineToolButtons('input[name="tri-line-tool"]', toolMap, tool =>
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
   * Wire transform (rotate) button.
   */
  wireTransformButtons () {
    this._wireButton(this.rotateBtn, () => this.applyTransform('r120'))
  }

  /**
   * Wire morphology (dilate, erode, cross) buttons.
   */
  wireMorphologyButtons () {
    this._wireButton(this.dilateBtn, () => this.applyMorphology('dilate'))
    this._wireButton(this.erodeBtn, () => this.applyMorphology('erode'))
    this._wireButton(this.crossBtn, () => this.applyMorphology('cross'))
  }

  /**
   * Apply mask mutation and refresh UI.
   * @param {Function} getMaskBits - Function to get new mask bits.
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
   * Set example cells
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
