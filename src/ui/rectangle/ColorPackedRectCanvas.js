import { RectIndex } from '../../grid/rectangle/RectIndex.js'
import { Packed } from '../../grid/rectangle/packed.js'
import {
  wireAllLineToolButtons,
  updateSymmetryDisplay,
  computeMorphologyState,
  bitsChanged
} from '../gridButtonUtils.js'

/**
 * @typedef {0|1|2|3|4} ColorValue
 */

/**
 * @typedef {'cycle'|'1'|'2'|'3'|'4'} ColorSetting
 */

/**
 * @typedef {'normal'|'half'|'super'} CoverType
 */

/**
 * @typedef {'segment'|'ray'|'full'|null} LineTool
 */

/**
 * @typedef {[number, number]} Coordinates
 */

/**
 * @typedef {Object} MorphologyChanges
 * @property {number} added - Bitmask of added cells
 * @property {number} removed - Bitmask of removed cells
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
 * Constants for color packed canvas operations
 */
const MAX_COLOR_VALUE = 4
const MIN_COLOR_VALUE = 1
const EMPTY_CELL_VALUE = 0

/**
 * ColorPackedRectCanvas manages colored (packed) rectangular grids
 * Adds color management, color cycling, and color-aware morphology operations
 *
 * Note: Does NOT extend RectCanvas because ColorPackedDraw has a different
 * structure (grid.packed instead of grid.mask) that breaks parent assumptions.
 *
 * Key features:
 * - Works with ColorPackedDraw (4 colors per cell)
 * - Color values (1-4) instead of binary toggle
 * - Color cycling mode ('cycle') for automatic color rotation
 * - Morphology operations that preserve/add colors while modifying occupancy
 *
 * @class ColorPackedRectCanvas
 * @example
 *   const canvas = new ColorPackedRectCanvas('canvas-id', grid)
 *   canvas.initializeAll()
 *   canvas.setTool('segment')
 *   canvas.drawLineBetween([0, 0], [5, 5])
 */
export class ColorPackedRectCanvas {
  /**
   * Create canvas manager for colored packed rectangular grids
   * @param {string} canvasId - ID of the canvas element
   * @param {Object} grid - The grid object with packed property
   * @param {Packed} grid.packed - Packed color grid
   * @param {number} grid.width - Grid width
   * @param {number} grid.height - Grid height
   * @param {HTMLCanvasElement} [grid.canvas] - Canvas element
   * @param {Function} [grid.redraw] - Redraw function
   */
  constructor (canvasId, grid) {
    /** @type {string} Canvas element ID */
    this.canvasId = canvasId

    /** @type {Object} Reference to grid */
    this.grid = grid

    /** @type {LineTool} Current line tool active */
    this.currentTool = null

    /** @type {Coordinates|null} Starting point for current line */
    this.lineStart = null

    /** @type {RectIndex|null} Indexer for coordinate calculations */
    this.indexer = null

    /** @type {boolean} Whether line tools are initialized */
    this._lineToolsInitialized = false

    /** @type {ColorSetting} Current color setting */
    this.currentColor = '1'

    /** @type {ColorValue} Current color cycle index */
    this.colorCycleIndex = MIN_COLOR_VALUE

    /** @type {CoverType} Coverage type for line drawing */
    this.coverType = 'normal'
  }

  /**
   * Get the next color value based on current color setting
   * If cycling, advances the cycle index automatically
   * @returns {ColorValue} The color value to use (1-4)
   */
  getNextColor () {
    const color =
      this.currentColor === 'cycle'
        ? this.colorCycleIndex
        : Number.parseInt(this.currentColor)

    if (this.currentColor === 'cycle') {
      this.colorCycleIndex =
        this.colorCycleIndex === MAX_COLOR_VALUE
          ? MIN_COLOR_VALUE
          : this.colorCycleIndex + 1
    }

    return color
  }

  /**
   * Compute line preview cells based on tool type and coverage mode
   * @param {Coordinates} start - Starting coordinates [x, y]
   * @param {Coordinates} end - Ending coordinates [x, y]
   * @returns {Coordinates[]} Array of coordinate pairs for preview
   */
  computePreviewCells (start, end) {
    if (!start || !end || !this.indexer) return []

    const coordIndexer = (x, y) => [x, y]

    switch (this.currentTool) {
      case 'segment':
        return this._computeSegmentCoords(start, end, coordIndexer)
      case 'ray':
        return this._computeRayCoords(start, end, coordIndexer)
      case 'full':
        return this._computeFullLineCoords(start, end, coordIndexer)
      default:
        return []
    }
  }

  /**
   * Compute coordinates for segment tool
   * @private
   * @param {Coordinates} start - Starting coordinates [x, y]
   * @param {Coordinates} end - Ending coordinates [x, y]
   * @param {Function} coordIndexer - Function to convert coordinates
   * @returns {Coordinates[]} Array of coordinate pairs
   */
  _computeSegmentCoords (start, end, coordIndexer) {
    const method = this._getIndexerMethod('segment')
    return Array.from(
      this.indexer[method](start[0], start[1], end[0], end[1], coordIndexer)
    )
  }

  /**
   * Compute coordinates for ray tool
   * @private
   * @param {Coordinates} start - Starting coordinates [x, y]
   * @param {Coordinates} end - Ending coordinates [x, y]
   * @param {Function} coordIndexer - Function to convert coordinates
   * @returns {Coordinates[]} Array of coordinate pairs
   */
  _computeRayCoords (start, end, coordIndexer) {
    const method = this._getIndexerMethod('ray')
    return Array.from(
      this.indexer[method](start[0], start[1], end[0], end[1], coordIndexer)
    )
  }

  /**
   * Compute coordinates for full line tool
   * @private
   * @param {Coordinates} start - Starting coordinates [x, y]
   * @param {Coordinates} end - Ending coordinates [x, y]
   * @param {Function} coordIndexer - Function to convert coordinates
   * @returns {Coordinates[]} Array of coordinate pairs
   */
  _computeFullLineCoords (start, end, coordIndexer) {
    const method = this._getIndexerMethod('full')
    return Array.from(
      this.indexer[method](start[0], start[1], end[0], end[1], coordIndexer)
    )
  }

  /**
   * Get the appropriate indexer method name based on tool and cover type
   * Constructs method name from coverage type, tool, and optional suffix
   * @private
   * @param {'segment'|'ray'|'full'} tool - The tool type
   * @returns {string} The method name to call on indexer
   */
  _getIndexerMethod (tool) {
    const prefix = this._getCoverTypePrefix()
    const suffix = this._getToolSuffix(tool)
    return `${prefix}${tool}${suffix}`
  }

  /**
   * Get prefix for indexer method based on cover type
   * @private
   * @returns {string} Prefix: 'superCover', 'halfCover', or empty string
   */
  _getCoverTypePrefix () {
    if (this.coverType === 'super') {
      return 'superCover'
    }
    if (this.coverType === 'half') {
      return 'halfCover'
    }
    return ''
  }

  /**
   * Get suffix for indexer method based on tool type
   * @private
   * @param {'segment'|'ray'|'full'} tool - The tool type
   * @returns {string} Suffix: 'To' for segment, 'Line' for full, or empty string
   */
  _getToolSuffix (tool) {
    if (tool === 'segment') {
      return 'To'
    }
    if (tool === 'full') {
      return 'Line'
    }
    return ''
  }

  /**
   * Draw line by applying color values to all cells in the path
   * @param {Coordinates} start - Starting coordinates [x, y]
   * @param {Coordinates} end - Ending coordinates [x, y]
   * @returns {void}
   */
  drawLineBetween (start, end) {
    if (!this.grid) return
    const coords = this.computePreviewCells(start, end)
    const packed = this.grid.packed
    coords.forEach(([x, y]) => {
      packed.set(x, y, this.getNextColor())
    })
  }

  /**
   * Set the current line tool
   * @param {LineTool} tool - The tool to set or null to deactivate
   * @returns {void}
   */
  setTool (tool) {
    this.currentTool = tool
    this.lineStart = null
    if (this.grid) {
      this.grid.previewCells = []
    }
  }

  /**
   * Create an occupancy grid from the packed grid for morphology operations
   * Converts color values to binary occupancy (0 = empty, non-zero = occupied)
   * @private
   * @param {Packed} packed - The packed grid with colors
   * @returns {Packed} Binary occupancy grid (1-bit per cell)
   */
  _createOccupancyGrid (packed) {
    const occ = new Packed(packed.width, packed.height)
    for (let y = 0; y < packed.height; y++) {
      for (let x = 0; x < packed.width; x++) {
        const color = packed.at(x, y)
        if (color !== EMPTY_CELL_VALUE) {
          occ.set(x, y, 1)
        }
      }
    }
    return occ
  }

  /**
   * Check what changes a morphology operation would make without applying it
   * Simulates the operation on a temporary occupancy grid
   * @private
   * @param {Packed} packed - The packed grid
   * @param {'dilate'|'erode'|'cross'} operation - The operation type
   * @returns {MorphologyChanges} Object with added and removed bitmasks
   */
  _checkOccupancyMorphologyState (packed, operation) {
    const occ = this._createOccupancyGrid(packed)
    const before = occ.bits
    this._applyMorphologyToOccupancy(occ, operation)
    const after = occ.bits
    const added = after & ~before
    const removed = before & ~after
    return { added, removed }
  }

  /**
   * Apply a morphology operation to an occupancy grid
   * @private
   * @param {Packed} occupancy - The binary occupancy grid
   * @param {'dilate'|'erode'|'cross'} operation - The operation type
   * @returns {void}
   */
  _applyMorphologyToOccupancy (occupancy, operation) {
    if (operation === 'dilate') {
      occupancy.dilate()
    } else if (operation === 'erode') {
      occupancy.erode()
    } else if (operation === 'cross') {
      occupancy.dilateCross()
    }
  }

  /**
   * Update packed grid colors based on morphology changes
   * Colors newly added cells and clears removed cells
   * @private
   * @param {Packed} packed - The packed grid to update
   * @param {number} added - Bitmask of added cells
   * @param {number} removed - Bitmask of removed cells
   * @returns {void}
   */
  _updatePackedGridFromMorphology (packed, added, removed) {
    this._colorAddedCells(packed, added)
    this._clearRemovedCells(packed, removed)
  }

  /**
   * Color newly added cells by finding colors from neighbors (8-connectivity)
   * @private
   * @param {Packed} packed - The packed grid
   * @param {number} added - Bitmask of added cells
   * @returns {void}
   */
  _colorAddedCells (packed, added) {
    const indexer = packed.indexer || new RectIndex(packed.width, packed.height)
    const addedCoords = Array.from(indexer.bitsToCoords(added))

    for (const [x, y] of addedCoords) {
      const color = this._findNeighborColor(packed, x, y)
      if (color !== EMPTY_CELL_VALUE) {
        packed.set(x, y, color)
      }
    }
  }

  /**
   * Clear removed cells in packed grid
   * @private
   * @param {Packed} packed - The packed grid
   * @param {number} removed - Bitmask of removed cells
   * @returns {void}
   */
  _clearRemovedCells (packed, removed) {
    const indexer = packed.indexer || new RectIndex(packed.width, packed.height)
    const removedCoords = Array.from(indexer.bitsToCoords(removed))
    removedCoords.forEach(([x, y]) => {
      packed.clear(x, y)
    })
  }

  /**
   * Find the color of a neighboring cell (8-connectivity)
   * Searches neighbors in order, returning first non-empty color found
   * @private
   * @param {Packed} packed - The packed grid
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {ColorValue} The color value, or 0 if no colored neighbors
   */
  _findNeighborColor (packed, x, y) {
    const neighbors = this._getNeighborOffsets()

    for (const [nx, ny] of neighbors) {
      const neighborX = x + nx
      const neighborY = y + ny
      if (this._isValidCoordinate(packed, neighborX, neighborY)) {
        const neighborColor = packed.at(neighborX, neighborY)
        if (neighborColor !== EMPTY_CELL_VALUE) {
          return neighborColor
        }
      }
    }

    return EMPTY_CELL_VALUE
  }

  /**
   * Get the offsets for neighboring cells (8-connectivity)
   * Includes orthogonal and diagonal neighbors
   * @private
   * @returns {Coordinates[]} Array of [dx, dy] offset pairs
   */
  _getNeighborOffsets () {
    return [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ]
  }

  /**
   * Check if coordinates are valid for the packed grid
   * @private
   * @param {Packed} packed - The packed grid
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if coordinates are within bounds
   */
  _isValidCoordinate (packed, x, y) {
    return x >= 0 && x < packed.width && y >= 0 && y < packed.height
  }

  /**
   * Apply a morphology operation to the packed grid
   * Checks occupancy changes and updates colors accordingly
   * @param {'dilate'|'erode'|'cross'} operation - The operation type
   * @returns {void}
   */
  applyMorphologyOperation (operation) {
    if (!this.grid) return

    const packed = this.grid.packed
    const { added, removed } = this._checkOccupancyMorphologyState(
      packed,
      operation
    )
    this._updatePackedGridFromMorphology(packed, added, removed)

    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Apply a transform operation to the grid
   * @param {'r90'|'r180'|'r270'|'fx'|'fy'|'fxy'} mapName - Transform map name
   * @returns {void}
   */
  applyTransform (mapName) {
    if (!this.grid) return
    const packed = this.grid.packed
    const actions = packed.actions
    if (!actions) return

    const maps = actions.transformMaps
    const store = actions.store || packed.store
    const indexer = actions.indexer || packed.indexer

    if (store && indexer) {
      let transformedBits = store.newWords()
      for (let i = 0; i < indexer.size; i++) {
        const value = store.getIdx(packed.bits, i)
        if (value !== 0) {
          const mappedIdx = maps[mapName][i]
          store.setAtIdx(transformedBits, mappedIdx, value)
        }
      }
      packed.bits = transformedBits
    } else {
      packed.bits = actions.applyMap(maps[mapName])
    }

    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Get capabilities for transforms on packed grid
   * @returns {TransformCapabilities} Object indicating which transforms are possible
   */
  getTransformCapabilities () {
    if (!this.grid) return {}
    const packed = this.grid.packed
    const actions = packed.actions
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
   * Get capabilities for morphology operations on packed grid
   * @returns {MorphologyCapabilities} Object indicating which operations are possible
   */
  getMorphologyCapabilities () {
    if (!this.grid) return {}
    const packed = this.grid.packed
    const canDilate = computeMorphologyState(packed, 'dilate', bitsChanged)
    const canErode = computeMorphologyState(packed, 'erode', bitsChanged)
    const canCross = computeMorphologyState(packed, 'cross', bitsChanged)

    return { canDilate, canErode, canCross }
  }

  /**
   * Update button states based on grid capabilities
   * Updates symmetry display and transform/morphology button disabled states
   * @returns {void}
   */
  updateButtonStates () {
    if (!this.grid) return
    const actions = this.grid.packed.actions
    if (!actions) return

    // Update transform button states
    const transforms = this.getTransformCapabilities()
    const rotateCwBtn = document.getElementById('rotate-cw2')
    const rotateCcwBtn = document.getElementById('rotate-ccw2')
    const flipHBtn = document.getElementById('flip-h2')
    const flipVBtn = document.getElementById('flip-v2')

    if (rotateCwBtn) rotateCwBtn.disabled = !transforms.canRotateCW
    if (rotateCcwBtn) rotateCcwBtn.disabled = !transforms.canRotateCCW
    if (flipHBtn) flipHBtn.disabled = !transforms.canFlipH
    if (flipVBtn) flipVBtn.disabled = !transforms.canFlipV

    // Update morphology button states
    const morph = this.getMorphologyCapabilities()
    const dilateBtn = document.getElementById('dilate2')
    const erodeBtn = document.getElementById('erode2')
    const crossBtn = document.getElementById('cross-dilate2')

    if (dilateBtn) dilateBtn.disabled = !morph.canDilate
    if (erodeBtn) erodeBtn.disabled = !morph.canErode
    if (crossBtn) crossBtn.disabled = !morph.canCross

    // Update symmetry display
    const symEl = document.getElementById('rectcolor-symmetry')
    if (symEl) {
      updateSymmetryDisplay(symEl, actions)
    }
  }

  /**
   * Initialize line tools with indexer and state
   * @returns {void}
   */
  initializeLineTools () {
    if (!this.grid) return
    if (this._lineToolsInitialized) return

    this.indexer = new RectIndex(this.grid.width, this.grid.height)
    this.grid.previewCells = []
    this._lineToolsInitialized = true

    const origToggle = this.grid?.toggleCell?.bind(this.grid)
    if (origToggle) {
      this.grid.toggleCell = location => {
        if (this.currentTool || location == null) return
        return origToggle(location)
      }
    }
  }

  /**
   * Wire line tool buttons using utility function
   * @returns {void}
   */
  wireLineToolButtons () {
    if (!this.grid || typeof document === 'undefined') return

    const toolMap = {
      single: null,
      segment: 'segment',
      ray: 'ray',
      full: 'full'
    }
    wireAllLineToolButtons('input[name="line-tool2"]', toolMap, tool =>
      this.setTool(tool)
    )
  }

  /**
   * Wire line color dropdown for color selection
   * @returns {void}
   */
  wireLineColorDropdown () {
    if (typeof document === 'undefined') return
    const dropdown = document.getElementById('line-color')
    if (dropdown) {
      dropdown.addEventListener('change', e => {
        this.currentColor = e.target.value
        this.colorCycleIndex = MIN_COLOR_VALUE
      })
    }
  }

  /**
   * Wire cover type radios for line coverage selection
   * @returns {void}
   */
  wireCoverTypeRadios () {
    if (typeof document === 'undefined') return
    const radios = document.querySelectorAll('input[name="cover-type2"]')
    if (!radios || radios.length === 0) return
    radios.forEach(radio => {
      radio.addEventListener('change', e => {
        if (e.target.checked) {
          this.coverType = e.target.value
        }
      })
    })
  }

  /**
   * Wire action buttons (empty, full, inverse, etc.)
   * @returns {void}
   */
  wireActionButtons () {
    if (!this.grid || typeof document === 'undefined') return

    const maskMutations = {
      empty2: () => this.grid.packed.emptyMask.bits,
      full2: () => this.grid.packed.fullMask.bits,
      inverse2: () => this.grid.packed.invertedMask.bits,
      'outer-border2': () => this.grid.packed.outerBorderMask.bits,
      'outer-area2': () => this.grid.packed.outerAreaMask.bits,
      'inner-border2': () => this.grid.packed.innerBorderMask.bits,
      'inner-area2': () => this.grid.packed.innerAreaMask.bits
    }

    Object.entries(maskMutations).forEach(([id, getMaskBits]) => {
      const el = document.getElementById(id)
      if (el) {
        el.addEventListener('click', () => {
          if (this.grid && getMaskBits) {
            this.grid.packed.bits = getMaskBits()
            this.grid.redraw()
            this.updateButtonStates()
          }
        })
      }
    })
  }

  /**
   * Wire transform buttons (rotate, flip)
   * @returns {void}
   */
  wireTransformButtons () {
    if (!this.grid || typeof document === 'undefined') return

    const buttonMap = {
      'rotate-cw2': 'r90',
      'rotate-ccw2': 'r270',
      'flip-h2': 'fx',
      'flip-v2': 'fy'
    }

    Object.entries(buttonMap).forEach(([btnId, mapName]) => {
      const btn = document.getElementById(btnId)
      if (btn) {
        btn.addEventListener('click', () => {
          this.applyTransform(mapName)
        })
      }
    })
  }

  /**
   * Wire morphology buttons (dilate, erode, cross)
   * @returns {void}
   */
  wireMorphologyButtons () {
    if (!this.grid || typeof document === 'undefined') return
    const buttonIds = ['dilate2', 'erode2', 'cross-dilate2']
    const operations = {
      dilate2: 'dilate',
      erode2: 'erode',
      'cross-dilate2': 'cross'
    }

    buttonIds.forEach(id => {
      const btn = document.getElementById(id)
      if (btn) {
        btn.addEventListener('click', () => {
          const operation = operations[id]
          this.applyMorphologyOperation(operation)
        })
      }
    })
  }

  /**
   * Get canvas hit test coordinates from mouse event
   * @param {MouseEvent} e - Mouse event
   * @returns {Coordinates|null} Grid coordinates [x, y] or null if invalid
   */
  getCanvasHitTest (e) {
    if (!this.grid?.canvas) return null
    const rect = this.grid.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left - this.grid.offsetX
    const y = e.clientY - rect.top - this.grid.offsetY
    const gridX = Math.round(x / this.grid.cellSize)
    const gridY = Math.round(y / this.grid.cellSize)

    if (this.indexer?.isValid(gridX, gridY)) {
      return [gridX, gridY]
    }
    return null
  }

  /**
   * Handle canvas move events for line preview
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  onCanvasMove (e) {
    if (!this.grid || !this.currentTool || !this.lineStart) return
    const hit = this.getCanvasHitTest(e)
    if (hit) {
      this.grid.previewCells = this.computePreviewCells(this.lineStart, hit)
      this.grid.redraw()
    }
  }

  /**
   * Handle canvas click events for line drawing state machine
   * First click sets start point, second click completes the line
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  onCanvasClick (e) {
    if (!this.grid || !this.currentTool) return
    const hit = this.getCanvasHitTest(e)
    if (!hit) return

    if (this.lineStart === null) {
      // First click: set start point
      this.lineStart = hit
      this.grid.previewCells = []
      this.grid.redraw()
    } else {
      // Second click: draw line and clear state
      this.drawLineBetween(this.lineStart, hit)
      this.lineStart = null
      this.grid.previewCells = []
      this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Attach canvas listeners for mouse move and click events
   * Uses flag to prevent multiple attachments
   * @returns {void}
   */
  attachCanvasListeners () {
    if (!this.grid) return
    if (this.grid.canvas.__colorPackedListenerAttached) return
    this.grid.canvas.__colorPackedListenerAttached = true

    this.grid.canvas.addEventListener('mousemove', e => this.onCanvasMove(e))
    this.grid.canvas.addEventListener('click', e => this.onCanvasClick(e))
  }

  /**
   * Initialize all UI components
   * Wires buttons, sets up event listeners, and prepares line tools
   * @returns {void}
   */
  initializeAll () {
    this.initializeLineTools()
    this.wireLineToolButtons()
    this.wireLineColorDropdown()
    this.wireCoverTypeRadios()
    this.wireActionButtons()
    this.wireTransformButtons()
    this.wireMorphologyButtons()
    this.attachCanvasListeners()
  }
}
