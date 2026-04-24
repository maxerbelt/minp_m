import { GridCanvas } from '../GridCanvas.js'
import { RectIndex } from '../../grid/rectangle/RectIndex.js'
import {
  bitsChanged,
  updateSymmetryDisplay,
  computeMorphologyState,
  setTransformButtonStates,
  setMorphologyButtonStates,
  getCanvasHitTest,
  updateLinePreviewRedraw,
  applyMaskMutation,
  createLineToolMap,
  wireAllLineToolButtons
} from '../gridButtonUtils.js'

/**
 * Rectangular grid canvas UI controller
 * Manages UI and interactions for rectangular grids
 */
export class RectCanvas extends GridCanvas {
  constructor (canvasId, rectDraw, config = {}) {
    super(canvasId, rectDraw, config)
    this.indexer = new RectIndex(config.width || 10, config.height || 10)

    // Override toggleCell to respect currentAction
    this.setupToggleCellOverride()
    this.setupHoverPreviewOverride()
  }

  /**
   * Apply action to a single cell based on current action setting.
   * @param {Object} mask - Mask object with set/at methods.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @private
   */
  _applyActionToCell (mask, x, y) {
    if (this.currentAction === 'set') {
      mask.set(x, y, 1)
    } else if (this.currentAction === 'clear') {
      mask.clear(x, y)
    } else if (this.currentAction === 'toggle') {
      const current = mask.at(x, y)
      mask.set(x, y, current ? 0 : 1)
    }
  }

  /**
   * Setup toggle cell to respect line action value
   */
  setupToggleCellOverride () {
    if (!this.grid?.toggleCell) return

    const origToggle = this.grid.toggleCell.bind(this.grid)
    this.grid.toggleCell = location => {
      // Don't toggle when line tool active
      if (this.currentTool) return

      if (location !== null) {
        const [x, y] = location
        this._applyActionToCell(this.grid.mask, x, y)
        this.grid.redraw()
      }
    }
  }

  /**
   * Override hover drawing to show line preview in orange
   */
  setupHoverPreviewOverride () {
    if (!this.grid || !this.grid._drawHover) return
    if (this.grid._drawHover.__isOverridden) return

    const origDrawHover = this.grid._drawHover.bind(this.grid)
    this.grid._drawHover = function () {
      if (this.previewCells?.length) {
        for (const [x, y] of this.previewCells) {
          this._drawCell(x, y, '#FF9800')
        }
      }
      origDrawHover()
    }
    this.grid._drawHover.__isOverridden = true
  }

  /**
   * Get canvas hit test from event
   */
  hitTest (e) {
    return getCanvasHitTest(this.grid, e)
  }

  /**
   * Compute preview cells for line drawing
   */
  computePreviewCells (start, end) {
    if (!start || !end || !this.indexer) return []

    const coordIndexer = (x, y) => [x, y]

    return [...this.previewCoords(this.currentTool, start, end, coordIndexer)]
  }

  *previewCoords (currentTool, start, end, coordIndexer) {
    switch (currentTool) {
      case 'segment':
        if (this.coverType === 'super') {
          return yield* this.indexer.superCoverSegmentTo(
            start[0],
            start[1],
            end[0],
            end[1],
            coordIndexer
          )
        } else if (this.coverType === 'half') {
          return yield* this.indexer.halfCoverSegmentTo(
            start[0],
            start[1],
            end[0],
            end[1],
            coordIndexer
          )
        } else {
          return yield* this.indexer.segmentTo(
            start[0],
            start[1],
            end[0],
            end[1],
            coordIndexer
          )
        }

      case 'ray':
        if (this.coverType === 'super') {
          return yield* this.indexer.superCoverRay(
            start[0],
            start[1],
            end[0],
            end[1],
            coordIndexer
          )
        }
        if (this.coverType === 'half') {
          return yield* this.indexer.halfCoverRay(
            start[0],
            start[1],
            end[0],
            end[1],
            coordIndexer
          )
        }
        return yield* this.indexer.ray(
          start[0],
          start[1],
          end[0],
          end[1],
          coordIndexer
        )
      case 'full':
        if (this.coverType === 'super') {
          return yield* this.indexer.superCoverFullLine(
            start[0],
            start[1],
            end[0],
            end[1],
            coordIndexer
          )
        }
        if (this.coverType === 'half') {
          return yield* this.indexer.halfCoverFullLine(
            start[0],
            start[1],
            end[0],
            end[1],
            coordIndexer
          )
        }
        return yield* this.indexer.fullLine(
          start[0],
          start[1],
          end[0],
          end[1],
          coordIndexer
        )
    }
  }

  /**
   * Update line preview on canvas
   */
  updateLinePreview (start, end) {
    updateLinePreviewRedraw(this.grid, start, end, (s, e) =>
      this.computePreviewCells(s, e)
    )
  }

  /**
   * Draw line between start and end using current action
   */
  completeLine (start, end) {
    if (!this.grid) return
    const coords = this.computePreviewCells(start, end)
    const mask = this.grid.mask
    coords.forEach(([x, y]) => {
      this._applyActionToCell(mask, x, y)
    })
    // Clear preview cells after completing the line
    this.grid.previewCells = []
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Update hover info with coordinates and neighbor count
   */
  updateHoverInfo (e) {
    if (!this.grid || !this.indexer) return

    const hoverLabel = document.getElementById('rect-hover-info')
    if (!hoverLabel) return

    const hit = this.hitTest(e)
    if (!hit) {
      hoverLabel.textContent = 'Hover info: '
      return
    }

    const [x, y] = hit
    const idx = this.indexer.index(x, y)
    const neighbors = this.indexer.neighbors(x, y)
    const neighborCount = neighbors.filter(([nx, ny]) =>
      this.indexer.isValid(nx, ny)
    ).length

    hoverLabel.textContent = `Hover info: (${x}, ${y}) index: ${idx} neighbors: ${neighborCount}`
  }

  /**
   * Get capabilities for transforms
   */
  getTransformCapabilities () {
    if (!this.grid) return {}
    const mask = this.grid.mask
    const actions = mask.actions
    if (!actions) return {}

    const maps = actions.transformMaps
    const template = actions.template

    return {
      canRotateCW: actions.applyMap(maps.r90) !== template,
      canRotateCCW: actions.applyMap(maps.r270) !== template,
      canFlipH: actions.applyMap(maps.fx) !== template,
      canFlipV: actions.applyMap(maps.fy) !== template
    }
  }

  /**
   * Get capabilities for morphology operations
   */
  getMorphologyCapabilities () {
    if (!this.grid) return {}
    const mask = this.grid.mask
    const canDilate = computeMorphologyState(mask, 'dilate', bitsChanged)
    const canErode = computeMorphologyState(mask, 'erode', bitsChanged)
    const canCross = computeMorphologyState(mask, 'cross', bitsChanged)

    return { canDilate, canErode, canCross }
  }

  /**
   * Update all button states
   */
  updateButtonStates () {
    if (!this.grid) return
    const mask = this.grid.mask
    const actions = mask.actions
    if (!actions) return

    // Update transform buttons
    const transforms = this.getTransformCapabilities()
    setTransformButtonStates(
      transforms.canRotateCW,
      transforms.canRotateCCW,
      transforms.canFlipH,
      transforms.canFlipV
    )

    // Update morphology buttons
    const morph = this.getMorphologyCapabilities()
    setMorphologyButtonStates(
      !morph.canDilate,
      !morph.canErode,
      !morph.canCross,
      'dilate'
    )

    // Update symmetry display
    const symEl = document.getElementById('rect-symmetry')
    updateSymmetryDisplay(symEl, actions)
  }

  /**
   * Apply transform operation
   */
  applyTransform (mapName) {
    if (!this.grid) return
    const mask = this.grid.mask
    const actions = mask.actions
    if (!actions) return

    const maps = actions.transformMaps
    const store = actions.store || mask.store
    const indexer = actions.indexer || mask.indexer

    if (store && indexer) {
      let transformedBits = store.empty
      for (const i of indexer.bitsIndices(mask.bits)) {
        transformedBits = store.addBit(transformedBits, maps[mapName][i])
      }
      mask.bits = transformedBits
    } else {
      mask.bits = actions.applyMap(maps[mapName])
    }

    this.grid.redraw()
    this.updateButtonStates()
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

    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Get selectors for UI elements
   */
  getLineActionDropdown () {
    return document.getElementById('line-action')
  }

  getCoverTypeRadioSelector () {
    return 'input[name="cover-type"]'
  }

  /**
   * Wire line tool buttons
   */
  wireLineToolButtons () {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }
    const toolMap = createLineToolMap()
    wireAllLineToolButtons('input[name="line-tool"]', toolMap, tool =>
      this.setTool(tool)
    )
  }

  /**
   * Wire button element to handler safely.
   * @param {string} id - Button element ID.
   * @param {Function} handler - Click handler.
   * @private
   */
  _wireButton (id, handler) {
    const btn =
      typeof document !== 'undefined' ? document.getElementById(id) : null
    if (btn) {
      btn.addEventListener('click', handler)
    }
  }

  /**
   * Wire transform buttons
   */
  wireTransformButtons () {
    if (!this.grid) return

    this._wireButton('rotate-cw', () => this.applyTransform('r90'))
    this._wireButton('rotate-ccw', () => this.applyTransform('r270'))
    this._wireButton('flip-h', () => this.applyTransform('fx'))
    this._wireButton('flip-v', () => this.applyTransform('fy'))
  }

  /**
   * Wire morphology buttons
   */
  wireMorphologyButtons () {
    if (!this.grid) return

    this._wireButton('dilate', () => this.applyMorphology('dilate'))
    this._wireButton('erode', () => this.applyMorphology('erode'))
    this._wireButton('cross-dilate', () => this.applyMorphology('cross'))
  }

  /**
   * Apply mask mutation and refresh UI.
   * @param {Function} getMaskBits - Function returning new mask bits.
   * @private
   */
  _applyMaskMutation (getMaskBits) {
    if (!this.grid?.mask) return
    this.grid.mask.bits = getMaskBits()
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Wire mask mutation buttons
   */
  wireActionButtons () {
    if (!this.grid) return

    const maskMutations = {
      empty: () => this.grid.mask.emptyMask.bits,
      full: () => this.grid.mask.fullMask.bits,
      inverse: () => this.grid.mask.invertedMask.bits,
      'outer-border': () => this.grid.mask.outerBorderMask.bits,
      'outer-area': () => this.grid.mask.outerAreaMask.bits,
      'inner-border': () => this.grid.mask.innerBorderMask.bits,
      'inner-area': () => this.grid.mask.innerAreaMask.bits
    }

    Object.entries(maskMutations).forEach(([id, getMaskBits]) => {
      this._wireButton(id, () => this._applyMaskMutation(getMaskBits))
    })
  }

  /**
   * Patch mask set/clear to update UI
   */
  patchMaskSetClear () {
    if (!this.grid || !this.grid.mask) return

    const origSet = this.grid.mask.set.bind(this.grid.mask)
    this.grid.mask.set = (...args) => {
      const result = origSet(...args)
      this.grid.redraw()
      this.updateButtonStates()
      return result
    }

    const origClear = this.grid.mask.clear.bind(this.grid.mask)
    this.grid.mask.clear = (...args) => {
      const result = origClear(...args)
      this.grid.redraw()
      this.updateButtonStates()
      return result
    }
  }

  /**
   * Set example cells
   */
  setExampleCells () {
    if (!this.grid) return
    this.grid.setBitsFromCoords([
      [2, 2],
      [3, 2],
      [4, 2],
      [4, 3],
      [2, 5]
    ])
  }

  /**
   * Full initialization
   */
  initializeAll () {
    if (!this.grid) return

    this.setExampleCells()
    this.patchMaskSetClear()
    this.wireButtons()
    this.syncLineActionDropdown()
    this.syncCoverTypeRadios()
    this.attachCanvasListeners()
    this.grid.redraw()
    this.updateButtonStates()
  }
}
