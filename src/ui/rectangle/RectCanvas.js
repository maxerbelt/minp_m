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
  createLineToolMap,
  wireAllLineToolButtons
} from '../gridButtonUtils.js'

/**
 * @typedef {Object} PreviewCoords
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} TransformCapabilities
 * @property {boolean} canRotateCW - Whether clockwise rotation is possible
 * @property {boolean} canRotateCCW - Whether counter-clockwise rotation is possible
 * @property {boolean} canFlipH - Whether horizontal flip is possible
 * @property {boolean} canFlipV - Whether vertical flip is possible
 */

/**
 * @typedef {Object} MorphologyCapabilities
 * @property {boolean} canDilate - Whether dilation is possible
 * @property {boolean} canErode - Whether erosion is possible
 * @property {boolean} canCross - Whether cross dilation is possible
 */

/**
 * Rectangular grid canvas UI controller
 *
 * Extends GridCanvas to provide rectangular-specific functionality including:
 * - Line tool support (segment, ray, full line) with different cover types
 * - Transform operations (rotation, flip) with capability checking
 * - Morphology operations (dilate, erode, cross) with state tracking
 * - Action-based cell editing (set, clear, toggle)
 * - Hover preview display in orange for line tools
 * - Button state management for all grid operations
 *
 * Uses RectIndex for coordinate indexing and grid calculations.
 *
 * @class
 * @extends GridCanvas
 */
export class RectCanvas extends GridCanvas {
  /**
   * @param {string} canvasId - ID of the canvas element
   * @param {Object} rectDraw - RectDraw instance for rendering
   * @param {Object} [config={}] - Configuration object
   * @param {number} [config.width=10] - Grid width in cells
   * @param {number} [config.height=10] - Grid height in cells
   */
  constructor (canvasId, rectDraw, config = {}) {
    super(canvasId, rectDraw, config)
    /** @type {RectIndex} */
    this.indexer = new RectIndex(config.width || 10, config.height || 10)

    // Override toggleCell to respect currentAction
    this.setupToggleCellOverride()
    this.setupHoverPreviewOverride()
  }

  /**
   * Apply action to a single cell based on current action setting
   *
   * Modifies cell state according to the configured action mode:
   * - 'set': Sets cell to value 1
   * - 'clear': Clears cell to value 0
   * - 'toggle': Toggles cell between 0 and 1
   *
   * @param {Object} mask - Mask object with set/at/clear methods
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {void}
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
   * Setup cell toggle override to respect line action value
   *
   * When a line tool is active, prevents normal cell toggling.
   * Otherwise applies the configured action to the cell.
   *
   * @returns {void}
   * @private
   */
  setupToggleCellOverride () {
    if (!this.grid?.toggleCell) return

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
   *
   * When preview cells are available (from line tool preview),
   * renders them in orange (#FF9800) before the regular hover drawing.
   * Only runs once to mark as overridden.
   *
   * @returns {void}
   * @private
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
   * Perform hit test on canvas at mouse event location
   *
   * @param {MouseEvent} e - Mouse event
   * @returns {[number, number]|null} [x, y] coordinates or null if no hit
   */
  hitTest (e) {
    return getCanvasHitTest(this.grid, e)
  }

  /**
   * Compute preview cells for line drawing
   *
   * Uses the current line tool (segment/ray/full) and cover type (normal/half/super)
   * to calculate all cells that would be affected by drawing from start to end.
   *
   * @param {[number, number]} start - Starting coordinates [x, y]
   * @param {[number, number]} end - Ending coordinates [x, y]
   * @returns {PreviewCoords[]} Array of coordinates that would be drawn
   */
  computePreviewCells (start, end) {
    if (!start || !end || !this.indexer) return []

    const coordIndexer = (x, y) => [x, y]

    return [...this.previewCoords(this.currentTool, start, end, coordIndexer)]
  }

  /**
   * Generator for preview coordinates based on line tool and cover type
   *
   * Yields coordinates for different line algorithms:
   * - 'segment': Line from start to end
   * - 'ray': Ray from start through end
   * - 'full': Full line extended infinitely (within grid)
   *
   * Cover types apply to all tools:
   * - normal (default): Standard line algorithm
   * - 'half': Half-cover line (thin coverage)
   * - 'super': Super-cover line (thick coverage)
   *
   * @param {string} currentTool - Line tool type ('segment', 'ray', 'full')
   * @param {[number, number]} start - Starting coordinates [x, y]
   * @param {[number, number]} end - Ending coordinates [x, y]
   * @param {Function} coordIndexer - Function to transform coordinates
   * @yields {PreviewCoords} Coordinate pairs
   * @private
   */
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
   *
   * Refreshes the preview display for the current line tool between start and end points.
   * Used during mouse movement to show what will be drawn.
   *
   * @param {[number, number]} start - Starting coordinates [x, y]
   * @param {[number, number]} end - Ending coordinates [x, y]
   * @returns {void}
   */
  updateLinePreview (start, end) {
    updateLinePreviewRedraw(this.grid, start, end, (s, e) =>
      this.computePreviewCells(s, e)
    )
  }

  /**
   * Draw line between start and end using current action
   *
   * Applies the current action (set/clear/toggle) to all cells computed
   * by the line tool preview. Clears preview after completing.
   *
   * @param {[number, number]} start - Starting coordinates [x, y]
   * @param {[number, number]} end - Ending coordinates [x, y]
   * @returns {void}
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
   * Update hover info display with coordinates and neighbor count
   *
   * Displays at element '#rect-hover-info' the hit test result including:
   * - X and Y coordinates
   * - Linear index in grid
   * - Number of valid neighbors (4-connected for rectangular grid)
   *
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
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
   * Get capabilities for transforms based on current mask state
   *
   * Checks whether each transformation would produce a different result:
   * - CW rotation: 90-degree clockwise
   * - CCW rotation: 270-degree clockwise (or -90)
   * - Flip horizontal: Mirror around vertical axis
   * - Flip vertical: Mirror around horizontal axis
   *
   * @returns {TransformCapabilities} Object with capability flags
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
   * Get capabilities for morphology operations based on current mask state
   *
   * Checks whether each morphology operation would produce a different result:
   * - Dilate: Expand set regions by one cell
   * - Erode: Shrink set regions by one cell
   * - Cross: Dilate using cross pattern (4-connected)
   *
   * @returns {MorphologyCapabilities} Object with capability flags
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
   * Update all button states based on current capabilities
   *
   * Refreshes button enabled/disabled states and visual feedback for:
   * - Transform buttons (rotate/flip)
   * - Morphology buttons (dilate/erode/cross)
   * - Symmetry display
   *
   * @returns {void}
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
   * Apply transform operation to the current mask
   *
   * Transforms supported: 'r90' (CW), 'r270' (CCW), 'fx' (flip H), 'fy' (flip V)
   *
   * @param {string} mapName - Transform map name ('r90', 'r270', 'fx', 'fy')
   * @returns {void}
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
   * Apply morphology operation to the current mask
   *
   * Operations: 'dilate', 'erode', 'cross'
   *
   * @param {string} operation - Morphology operation type
   * @returns {void}
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
   * Get selector for line action dropdown element
   *
   * @returns {HTMLElement|null} The dropdown element or null if not found
   */
  getLineActionDropdown () {
    return document.getElementById('line-action')
  }

  /**
   * Get CSS selector for cover type radio buttons
   *
   * @returns {string} Selector string for cover type inputs
   */
  getCoverTypeRadioSelector () {
    return 'input[name="cover-type"]'
  }

  /**
   * Wire line tool buttons for tool selection
   *
   * Attaches click handlers to line tool radio buttons to switch between
   * segment, ray, and full line tools. Gracefully skips if in test environment.
   *
   * @returns {void}
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
   * Wire a button element to a handler safely
   *
   * Finds the button element by ID and attaches a click handler.
   * Gracefully handles missing elements (e.g., in test environment).
   *
   * @param {string} id - Button element ID
   * @param {Function} handler - Click handler function
   * @returns {void}
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
   * Wire transform buttons to their operations
   *
   * Attaches handlers to:
   * - 'rotate-cw': Clockwise rotation
   * - 'rotate-ccw': Counter-clockwise rotation
   * - 'flip-h': Horizontal flip
   * - 'flip-v': Vertical flip
   *
   * @returns {void}
   */
  wireTransformButtons () {
    if (!this.grid) return

    this._wireButton('rotate-cw', () => this.applyTransform('r90'))
    this._wireButton('rotate-ccw', () => this.applyTransform('r270'))
    this._wireButton('flip-h', () => this.applyTransform('fx'))
    this._wireButton('flip-v', () => this.applyTransform('fy'))
  }

  /**
   * Wire morphology buttons to their operations
   *
   * Attaches handlers to:
   * - 'dilate': Dilation operation
   * - 'erode': Erosion operation
   * - 'cross-dilate': Cross dilation operation
   *
   * @returns {void}
   */
  wireMorphologyButtons () {
    if (!this.grid) return

    this._wireButton('dilate', () => this.applyMorphology('dilate'))
    this._wireButton('erode', () => this.applyMorphology('erode'))
    this._wireButton('cross-dilate', () => this.applyMorphology('cross'))
  }

  /**
   * Apply mask mutation and refresh UI
   *
   * Applies a new mask bits value, redraws the grid, and updates button states.
   *
   * @param {Function} getMaskBits - Function returning new mask bits value
   * @returns {void}
   * @private
   */
  _applyMaskMutation (getMaskBits) {
    if (!this.grid?.mask) return
    this.grid.mask.bits = getMaskBits()
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Wire mask mutation buttons to preset operations
   *
   * Buttons: empty, full, inverse, outer-border, outer-area, inner-border, inner-area
   *
   * @returns {void}
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
   * Patch mask set/clear methods to update UI on changes
   *
   * Wraps the mask.set and mask.clear methods to automatically redraw
   * the grid and update button states after each call.
   *
   * @returns {void}
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
   * Set example cells for testing/demonstration
   *
   * Populates the grid with a sample pattern at specific coordinates.
   *
   * @returns {void}
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
   * Full initialization of all UI components
   *
   * Runs all initialization steps in sequence:
   * 1. Set example cells
   * 2. Patch mask set/clear methods
   * 3. Wire all buttons
   * 4. Sync line action dropdown
   * 5. Sync cover type radios
   * 6. Attach canvas listeners
   * 7. Initial redraw
   * 8. Update button states
   *
   * @returns {void}
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
