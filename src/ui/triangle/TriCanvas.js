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

const PREVIEW_STYLE = {
  FILL: '#FF9800',
  STROKE: '#333'
}

const HOVER_VERTICAL_OFFSET = 0.3

const TOOL_METHOD_SUFFIX = {
  [TOOL_TYPES.SEGMENT]: 'segmentTo',
  [TOOL_TYPES.RAY]: 'ray',
  [TOOL_TYPES.FULL]: 'fullLine'
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

    this._overrideGridToggleCellBehavior()
    this._overrideGridHoverPreview()
  }

  /**
   * Set the current line drawing tool.
   * @param {string|null} tool - Tool type or null for single cell mode.
   */
  setTool (tool) {
    this.currentTool = tool
    this.lineStart = null
    this._clearPreview()
    this._redrawGridIfAvailable()
  }

  /**
   * Apply the current action to a bit.
   * @param {number} val - Current bit value.
   * @returns {number} Resulting bit value.
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
   * @param {Object} mask - Mask object containing bit state.
   * @param {number} idx - Index to read.
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
   * Set a bit in a mask, preserving mask storage semantics.
   * @param {Object} mask - Mask object to update.
   * @param {number} idx - Bit index to set.
   * @param {number} value - New bit value.
   * @private
   */
  _setMaskBit (mask, idx, value) {
    mask.bits = mask.setIndex(idx, value)
  }

  /**
   * Apply current action to a list of indices.
   * @param {Object} mask - Mask object to update.
   * @param {number[]} indices - Indices to modify.
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
   * @private
   */
  _overrideGridHoverPreview () {
    if (
      !this.grid ||
      !this.grid._drawHover ||
      this.grid._drawHover._isOverridden
    )
      return

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
   * @private
   */
  _clearPreview () {
    if (this.grid) this.grid.previewCells = []
  }

  /**
   * Redraw the underlying grid if possible.
   * @private
   */
  _redrawGridIfAvailable () {
    if (this.grid && typeof this.grid.redraw === 'function') {
      this.grid.redraw()
    }
  }

  /**
   * Sync the grid mask with the active drawing bits and return actions.
   * @returns {Object|undefined} Current action set.
   */
  syncMaskWithDraw () {
    this.grid.mask.bits = this.grid.bits
    return this.grid.mask.actions
  }

  /**
   * Get the current action metadata from the active grid.
   * @returns {Object|undefined}
   */
  getCurrentActions () {
    return this.grid?.mask?.actions
  }

  /**
   * Convert a mouse event to a triangle index.
   * @param {MouseEvent} event - Mouse event from the canvas.
   * @returns {number|null} Triangle index or null.
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
   * @param {MouseEvent} event - Canvas mouse event.
   * @returns {{x:number,y:number}}
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
   * @param {number} sr - Start row.
   * @param {number} sc - Start column.
   * @param {number} er - End row.
   * @param {number} ec - End column.
   * @returns {Array} Coordinate array.
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
   * @param {string} toolKey - Capitalized tool name.
   * @param {string} methodBase - Base tool method name.
   * @returns {string} Indexer method name.
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
   * @param {number} startIdx - Start index.
   * @param {number} endIdx - End index.
   * @returns {number[]} List of indices for preview.
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
   * @param {number} start - Start index.
   * @param {number} end - End index.
   */
  updateLinePreview (start, end) {
    if (!this.grid || !this.currentTool) return
    this.grid.previewCells = this.computePreviewIndices(start, end)
    this._redrawGridIfAvailable()
  }

  /**
   * Apply line action to the previewed indices.
   * @param {number} start - Start index.
   * @param {number} end - End index.
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
   * @param {MouseEvent} event - Click event.
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
   * @param {MouseEvent} event - Mouse event.
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
   * @param {Array|Object} map - Transform map.
   * @param {Object} [actions] - Optional action metadata.
   * @returns {*} Transformed bits.
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
   * @param {Object} actions - Action metadata.
   * @param {Object} mask - Mask object.
   * @returns {{store:Object,indexer:Object}}
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
   * @param {Object} store - Store object.
   * @param {Object} indexer - Indexer object.
   * @param {Array} map - Transform map.
   * @param {*} currentBits - Current bit state.
   * @returns {*} Transformed bit state.
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
   * @param {string} op - Operation name ('dilate', 'erode', 'cross').
   * @returns {boolean}
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
   * @param {Object} mask - Mask object to clone.
   * @returns {Object} Shallow clone of the mask.
   * @private
   */
  _cloneMask (mask) {
    return Object.assign(Object.create(Object.getPrototypeOf(mask)), mask)
  }

  /**
   * Get morphology button enable state.
   * @returns {{canDilate:boolean,canErode:boolean,canCross:boolean}}
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
   * @param {Object} maps - Transform maps.
   * @param {Object} actions - Action metadata.
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
   * @param {Object} maps - Transform maps.
   * @param {Object} actions - Action metadata.
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
   * @param {Array|Object} map - Transform map.
   * @param {Object} actions - Action metadata.
   * @returns {boolean}
   * @private
   */
  _shouldDisableTransformButton (map, actions) {
    return !map || this.computeTransformedBits(map, actions) === this.grid.bits
  }

  /**
   * Update morphology button state.
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
