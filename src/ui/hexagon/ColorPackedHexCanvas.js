import { HexCanvas } from './HexCanvas.js'
import { MaskHex } from '../../grid/hexagon/maskHex.js'
import { wireAllLineToolButtons } from '../gridButtonUtils.js'

/**
 * ColorPackedHexCanvas extends HexCanvas to manage colored (packed) hexagonal grids.
 * Adds color management, color cycling, and color-aware morphology operations for hex grids.
 *
 * Key differences from HexCanvas:
 * - Works with ColorPackedHexDraw (2 colors per cell) instead of HexDraw
 * - Color values (1-2) instead of binary toggle
 * - Color cycling mode ('cycle') for automatic color rotation
 * - Morphology operations that preserve/add colors while modifying occupancy
 */
export class ColorPackedHexCanvas extends HexCanvas {
  constructor (canvasId, grid) {
    super(canvasId, grid)

    // Color management
    this.currentColor = '1' // '1'|'2'|'cycle'
    this.colorCycleIndex = 1
  }

  /**
   * Apply color action to a single hex cell based on current action.
   * @param {Object} packed - Packed hex object.
   * @param {number} q - Q coordinate.
   * @param {number} r - R coordinate.
   * @param {number} s - S coordinate.
   * @param {number} currentColor - Current color value.
   * @private
   */
  _applyColorActionToCell (packed, q, r, s, currentColor) {
    if (this.currentAction === 'set') {
      packed.set(q, r, s, this.getNextColor())
    } else if (this.currentAction === 'clear') {
      packed.clear(q, r, s)
    } else if (this.currentAction === 'toggle') {
      // Toggle cycles through colors or clears if at max color
      if (currentColor === 0) {
        packed.set(q, r, s, 1)
      } else if (currentColor === 2) {
        packed.clear(q, r, s)
      } else {
        packed.set(q, r, s, currentColor + 1)
      }
    }
  }

  /**
   * Override toggle cell to use color values instead of binary toggle
   * For packed hex grids with color support
   */
  setupToggleCellOverride () {
    if (!this.grid || !this.grid.toggleCell) return

    this.grid.toggleCell = idx => {
      // Don't toggle when line tool active
      if (this.currentTool || idx == null) return

      const [q, r] = this.grid.indexer.coords[idx]
      const s = -q - r
      const currentColor = this.grid.packedHex.at(q, r, s)
      this._applyColorActionToCell(this.grid.packedHex, q, r, s, currentColor)

      this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Set example cells for color packed hex
   */
  setExampleCells () {
    if (!this.grid) return
    this.grid.setBitsFromCoords([
      [0, 0, 0, 1],
      [1, -1, 0, 2],
      [0, 1, -1, 1]
    ])
  }

  /**   * Override getCurrentActions to get packed hex actions instead of mask actions
   */
  getCurrentActions () {
    return this.grid?.packedHex?.actions
  }

  /**
   * Override updateButtonStates for packed hex grids
   * Works with packedHex instead of mask for transform/morphology checks
   */
  updateButtonStates () {
    if (!this.grid) return

    const packed = this.grid.packedHex
    const actions = this.getCurrentActions()
    const maps = actions?.transformMaps
    const b = this.grid.bits

    // Update rotate button
    if (this.rotateBtn) {
      const rStep = this.getRotationStep(maps)
      const transformedBits =
        rStep !== null
          ? this.computeTransformedPackedBits(packed, maps?.[rStep], actions)
          : b
      this.rotateBtn.disabled = rStep === null || transformedBits === b
    }

    // Update flip buttons
    if (this.flipButtons) {
      this.flipButtons.forEach(btn => {
        const mapIdx = Number(btn.dataset.map)
        const map = maps?.[mapIdx]
        const transformedBits = map
          ? this.computeTransformedPackedBits(packed, map, actions)
          : b
        btn.disabled = !map || transformedBits === b
      })
    }

    // Update morphology buttons
    const morph = this.getMorphologyCapabilities()
    if (this.dilateBtn) this.dilateBtn.disabled = !morph.canDilate
    if (this.erodeBtn) this.erodeBtn.disabled = !morph.canErode
  }

  /**
   * Compute transformed bits for packed hex (preserving color values)
   */
  computeTransformedPackedBits (packed, map, actions) {
    if (!map || !actions) return packed.bits
    const store = actions.store || packed.store
    const indexer = actions.indexer || packed.indexer

    if (store && indexer) {
      let transformedBits = store.newWords()
      for (let i = 0; i < indexer.size; i++) {
        const value = store.getIdx(packed.bits, i)
        if (value !== 0) {
          const mappedIdx = map[i]
          store.setAtIdx(transformedBits, mappedIdx, value)
        }
      }
      return transformedBits
    }
    return packed.bits
  }

  /**   * Get the next color value based on current color setting.
   * For hex grids, it cycles through 1-2 instead of 1-4.
   */
  getNextColor () {
    const maxColor = 2 // hex grids have 2 colors

    let color =
      this.currentColor === 'cycle'
        ? this.colorCycleIndex
        : parseInt(this.currentColor)

    if (this.currentColor === 'cycle') {
      this.colorCycleIndex =
        this.colorCycleIndex === maxColor ? 1 : this.colorCycleIndex + 1
    }

    return color
  }

  /**
   * Override drawLineBetween to apply color values instead of toggling.
   * Uses ColorPackedHexDraw.set(q, r, colorValue) instead of toggleCell.
   * @deprecated This method is not called - use completeLine instead
   */
  drawLineBetween (start, end) {
    if (!this.grid) return
    // Get indices for the line using parent's method
    const inds = this.computePreviewIndices(start, end)
    const packed = this.grid.packed

    // Apply color to each index in the line
    inds.forEach(idx => {
      const [q, r] = this.grid.indexer.coords[idx]
      packed.set(q, r, this.getNextColor())
    })
  }

  /**
   * Override completeLine to apply colors to packed hex instead of binary toggle
   * This is called when a line drawing operation completes
   */
  completeLine (start, end) {
    if (!this.grid) return
    const packed = this.grid.packedHex || this.grid.packed
    if (!packed) return

    const inds = this.computePreviewIndices(start, end)

    for (const i of inds) {
      const [q, r] = this.grid.indexer.coords[i]
      const s = -q - r
      const currentColor = packed.at(q, r, s)
      this._applyColorActionToCell(packed, q, r, s, currentColor)
    }

    // Redraw and update UI
    if (typeof this.grid.redraw === 'function') this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Create an occupancy grid from the packed hex grid for morphology operations.
   * Tracks which cells are occupied (have non-zero color).
   * Uses MaskHex which has proper morphology operation support.
   */
  createOccupancyGrid (packed) {
    const radius = packed.radius || 3
    const occ = new MaskHex(radius)
    occ.bits = 0n // Initialize as BigInt
    // For hex packed grids, iterate through all cells
    const coords = packed.indexer.coords
    if (coords) {
      coords.forEach((coord, idx) => {
        const color = packed.at(coord[0], coord[1])
        if (color !== 0) {
          occ.bits |= 1n << BigInt(idx)
        }
      })
    }
    return occ
  }

  /**
   * Check what changes a morphology operation would make without applying it.
   * Returns object with 'added' and 'removed' bit patterns.
   */
  checkOccupancyMorphologyState (packed, operation) {
    const occ = this.createOccupancyGrid(packed)
    const before = BigInt(occ.bits || 0)
    this.applyMorphologyToOccupancy(occ, operation)
    const after = BigInt(occ.bits || 0)
    const added = after & ~before // cells added
    const removed = before & ~after // cells removed
    return { added, removed }
  }

  /**
   * Apply a morphology operation to an occupancy grid.
   */
  applyMorphologyToOccupancy (occupancy, operation) {
    if (operation === 'dilate') {
      occupancy.dilate()
    } else if (operation === 'erode') {
      occupancy.erode()
    } else if (operation === 'cross') {
      occupancy.dilateCross()
    }
  }

  /**
   * Update packed grid colors based on morphology changes.
   * For hex grids, uses hex-specific neighbor finding.
   */
  updatePackedGridFromMorphology (packed, added, removed) {
    // Color newly added cells by copying from neighbors
    this.colorAddedCells(packed, added)

    // Clear removed cells
    this.clearRemovedCells(packed, removed)
  }

  /**
   * Color newly added cells by finding colors from hex neighbors.
   * Uses hex cube coordinate neighbor relationships.
   */
  colorAddedCells (packed, added) {
    const indexer = packed.indexer
    if (!indexer || !indexer.coords) return

    const coords = indexer.coords
    coords.forEach((coord, idx) => {
      const isAdded = (added >> BigInt(idx)) & 1n
      if (!isAdded) return

      const [q, r, s] = coord
      const currentColor = packed.at(q, r)
      if (currentColor !== 0) return // already colored

      // Find hex neighbors in cube coordinates
      const neighbors = [
        [q + 1, r - 1, s],
        [q + 1, r, s - 1],
        [q, r + 1, s - 1],
        [q - 1, r + 1, s],
        [q - 1, r, s + 1],
        [q, r - 1, s + 1]
      ]

      let color = 0
      for (const [nq, nr, ns] of neighbors) {
        try {
          const neighborColor = packed.at(nq, nr)
          if (neighborColor !== 0) {
            color = neighborColor
            break
          }
        } catch (e) {
          // neighbor out of bounds
        }
      }

      if (color !== 0) {
        packed.set(q, r, color)
      }
    })
  }

  /**
   * Clear removed cells in packed hex grid.
   */
  clearRemovedCells (packed, removed) {
    const indexer = packed.indexer
    if (!indexer || !indexer.coords) return

    const coords = indexer.coords
    coords.forEach((coord, idx) => {
      const isRemoved = (removed >> BigInt(idx)) & 1n
      if (isRemoved) {
        packed.clear(coord[0], coord[1])
      }
    })
  }

  /**
   * Apply a morphology operation to the packed hex grid while preserving colors.
   */
  applyMorphologyOperation (operation) {
    if (!this.grid) return

    const packed = this.grid.packed
    const { added, removed } = this.checkOccupancyMorphologyState(
      packed,
      operation
    )

    // Update colors in packed grid
    this.updatePackedGridFromMorphology(packed, added, removed)

    // Redraw and update UI
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Add change listener to dropdown with callback.
   * @param {string} id - Element ID.
   * @param {Function} callback - Callback function receiving new value.
   * @private
   */
  _wireDropdown (id, callback) {
    const dropdown = this._getElementById(id)
    if (dropdown) {
      dropdown.addEventListener('change', e => callback(e.target.value))
    }
  }

  /**
   * Add change listeners to radio buttons with callback.
   * @param {string} selector - Radio button selector.
   * @param {Function} callback - Callback function receiving selected value.
   * @private
   */
  _wireRadioButtons (selector, callback) {
    const radios = this._querySelectorAll(selector)
    if (radios.length === 0) return
    radios.forEach(radio => {
      radio.addEventListener('change', e => {
        if (e.target.checked) callback(e.target.value)
      })
    })
  }

  /**
   * Add click listener to button with callback.
   * @param {string} id - Button element ID.
   * @param {Function} callback - Click handler.
   * @private
   */
  _wireButton (id, callback) {
    const btn = this._getElementById(id)
    if (btn) {
      btn.addEventListener('click', callback)
    }
  }

  /**
   * Wire line color dropdown (1, 2, cycle) for hex (2-color) grids.
   */
  wireLineColorDropdown () {
    this._wireDropdown('hex-color', value => {
      this.currentColor = value
      this.colorCycleIndex = 1 // reset cycle index when color changes
    })
  }

  /**
   * Wire cover type radio buttons for colored hex grid.
   */
  wireCoverTypeRadios () {
    this._wireRadioButtons('input[name="cover-type-hex"]', value => {
      this.coverType = value
    })
  }

  /**
   * Wire morphology buttons for colored hex grid.
   */
  wireMorphologyButtons () {
    if (!this.grid) return
    const morphologyOps = {
      'dilate-hex': 'dilate',
      'erode-hex': 'erode',
      'cross-dilate-hex': 'cross'
    }
    Object.entries(morphologyOps).forEach(([id, operation]) => {
      this._wireButton(id, () => this.applyMorphologyOperation(operation))
    })
  }

  /**
   * Wire action buttons focusing on packed grid operations.
   */
  wireActionButtons () {
    if (!this.grid) return
    this._wireButton('clear-hex', () => {
      if (this.grid) {
        this.grid.packed.clear(0, 0)
        this.grid.redraw()
        this.updateButtonStates()
      }
    })
  }

  /**
   * Check if morphology operation would change the packaged hex grid
   * Returns true if operation would cause changes, false otherwise
   */
  checkMorphology (op) {
    if (!this.grid || !this.grid.packedHex) return false
    const result = this.checkOccupancyMorphologyState(this.grid.packedHex, op)
    return result.added !== 0n || result.removed !== 0n
  }

  /**
   * Get morphology operation capabilities
   */
  getMorphologyCapabilities () {
    return {
      canDilate: this.checkMorphology('dilate'),
      canErode: this.checkMorphology('erode'),
      canCross: this.checkMorphology('cross')
    }
  }

  /**
   * Get element by ID safely.
   * @param {string} id - Element ID.
   * @returns {Element|null} Element or null if not found.
   * @private
   */
  _getElementById (id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null
  }

  /**
   * Get elements by selector safely.
   * @param {string} selector - CSS selector.
   * @returns {Array<Element>} Array of elements.
   * @private
   */
  _querySelectorAll (selector) {
    if (typeof document === 'undefined') return []
    return Array.from(document.querySelectorAll(selector))
  }

  /**
   * Override getRotateButton to get hexcolor-specific button
   * @returns {Element|null}
   */
  getRotateButton () {
    return this._getElementById('hexcolor-rotateBtn')
  }

  /**
   * Override getDilateButton to get hexcolor-specific button
   * @returns {Element|null}
   */
  getDilateButton () {
    return this._getElementById('hexcolor-dilateBtn')
  }

  /**
   * Override getErodeButton to get hexcolor-specific button
   * @returns {Element|null}
   */
  getErodeButton () {
    return this._getElementById('hexcolor-erodeBtn')
  }

  /**
   * Override getFlipButtons to get hexcolor-specific buttons
   * @returns {Array<Element>}
   */
  getFlipButtons () {
    return this._querySelectorAll('.hexcolor-flipBtn')
  }

  /**
   * Override getGridButtons to get hexcolor-specific buttons
   * @returns {Object} Object with empty, full, inverse element references.
   */
  getGridButtons () {
    return {
      empty: this._getElementById('hexcolor-empty'),
      full: this._getElementById('hexcolor-full'),
      inverse: this._getElementById('hexcolor-inverse')
    }
  }

  /**
   * Override initializeAll to get hexcolor-specific button references
   */
  initializeAll () {
    if (!this.grid) return

    // Get and store hexcolor-specific button references
    this.rotateBtn = this.getRotateButton()
    this.flipButtons = this.getFlipButtons()
    this.dilateBtn = this.getDilateButton()
    this.erodeBtn = this.getErodeButton()

    // Get grid action buttons
    const gridBtns = this.getGridButtons()
    if (gridBtns.empty) this.emptyBtn = gridBtns.empty
    if (gridBtns.full) this.fullBtn = gridBtns.full
    if (gridBtns.inverse) this.inverseBtn = gridBtns.inverse

    this.setExampleCells()
    this.wireButtons()
    this.syncLineActionDropdown()
    this.syncCoverTypeRadios()
    this.attachCanvasListeners()
    this.grid.redraw()
    this.updateButtonStates()
    this.initializeColorUI()
  }

  /**
   * Override syncLineActionDropdown to use hexcolor dropdown
   */
  syncLineActionDropdown () {
    const dropdown = this._getElementById('hexcolor-line-action')
    if (dropdown) {
      dropdown.value = this.currentAction
    }
  }

  /**
   * Override syncCoverTypeRadios to use hexcolor radios
   */
  syncCoverTypeRadios () {
    const radios = this._querySelectorAll('input[name="hexcolor-line-cover"]')
    for (const radio of radios) {
      radio.checked = radio.value === this.coverType
    }
  }

  /**
   * Get line action dropdown for hexcolor
   * @returns {Element|null}
   */
  getLineActionDropdown () {
    return this._getElementById('hexcolor-line-action')
  }

  /**
   * Get cover type radio selector for hexcolor
   * @returns {string}
   */
  getCoverTypeRadioSelector () {
    return 'input[name="hexcolor-line-cover"]'
  }

  /**
   * Get line tool radio selector for hexcolor
   * @returns {string}
   */
  getLineToolRadioSelector () {
    return 'input[name="hexcolor-line-tool"]'
  }

  /**
   * Override wireLineToolButtons to use hexcolor selector
   */
  wireLineToolButtons () {
    if (typeof document === 'undefined') return

    const toolMap = {
      single: null,
      segment: 'segment',
      ray: 'ray',
      full: 'full'
    }
    wireAllLineToolButtons('input[name="hexcolor-line-tool"]', toolMap, tool =>
      this.setTool(tool)
    )
  }

  /**
   * Initialize all color-specific UI components for hex grid.
   * Called after parent's initializeAll().
   */
  initializeColorUI () {
    this.wireLineColorDropdown()
    this.wireCoverTypeRadios()
    this.wireLineToolButtons()
    this.wireActionButtons()
    this.wireMorphologyButtons()
  }
}
