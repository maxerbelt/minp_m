import {
  createOrthoPolyominoGenerator,
  createDiagonalPolyominoGenerator,
  createKingPolyominoGenerator
} from '../../grid/rectangle/RedelmeierGenerator.js'
import { Mask } from '../../grid/rectangle/mask.js'
import { RectDrawColor } from './rectdrawcolor.js'

/**
 * Constants for polyomino grid management
 */
const GRID_DEPTH = 16 // Supports up to 16 polyomino IDs (0-15)
const MAX_POLYOMINOES_PER_PAGE = 15 // Maximum polyominoes to display per page
const EMPTY_CELL_VALUE = 0 // Value for empty cells
const POLYOMINO_ID_START = 1 // Starting ID for polyominoes

/**
 * @typedef {Object} Polyomino
 * @property {number} width - Width of polyomino bounding box
 * @property {number} height - Height of polyomino bounding box
 * @property {Function} allXYlocations - Generator yielding [x,y] coordinates
 * @property {Function} at - Method to check if cell at (x,y) is part of polyomino
 */

/**
 * @typedef {Object} PlacedPolyomino
 * @property {Polyomino} poly - The polyomino object with shape data
 * @property {number} x - X position on grid (top-left of bounding box)
 * @property {number} y - Y position on grid (top-left of bounding box)
 * @property {number} id - Unique ID of the polyomino (1-15)
 */

/**
 * @typedef {Object} PlacementResult
 * @property {number} placed - Number of polyominoes placed
 * @property {number} total - Total number of polyominoes available
 * @property {boolean} allFitted - Whether all polyominoes fit on grid
 */

/**
 * @typedef {Object} PlacementStatistics
 * @property {number} placedCount - Number of polyominoes successfully placed
 * @property {number} firstPlacedIndex - Index of first placed polyomino (-1 if none)
 * @property {number} lastPlacedIndex - Index of last placed polyomino (-1 if none)
 */

/**
 * PolyominoGridManager - Manages polyomino placement, display, and constraints using 4-bit Mask
 *
 * This class handles:
 * - Polyomino placement on a grid using a Mask-based bitboard storage (GRID_DEPTH=16)
 * - 8-connectivity constraint enforcement (no polyominoes touching)
 * - Rendering using RectDrawColor with color-mapped display
 * - Pagination for navigating large polyomino sets (MAX_POLYOMINOES_PER_PAGE=15)
 * - Fill mode (greedy placement) and single mode (display one polyomino)
 *
 * Storage: 4 bits per cell = 16 possible values (0-15), where 0=empty, 1-15=polyomino IDs
 *
 * @class
 * @example
 * const manager = new PolyominoGridManager('canvas-id', 10, 10, 50, 50, 50);
 * manager.loadPolyominoes();
 * const result = manager.fillGrid();
 * if (result.allFitted) { console.log('All polyominoes fit!'); }
 */
export class PolyominoGridManager {
  /**
   * @param {string} canvasId - ID of the canvas element for rendering
   * @param {number} [width=10] - Grid width in cells
   * @param {number} [height=10] - Grid height in cells
   * @param {number} [cellSize=50] - Size of each cell in pixels
   * @param {number} [offsetX=50] - X offset for canvas drawing
   * @param {number} [offsetY=50] - Y offset for canvas drawing
   * @throws {Error} If canvas element cannot be initialized (gracefully handled in test env)
   */
  constructor (
    canvasId,
    width = 10,
    height = 10,
    cellSize = 50,
    offsetX = 50,
    offsetY = 50
  ) {
    /** @type {string} */
    this.canvasId = canvasId
    /** @type {number} */
    this.width = width
    /** @type {number} */
    this.height = height
    /** @type {number} */
    this.cellSize = cellSize
    /** @type {number} */
    this.offsetX = offsetX
    /** @type {number} */
    this.offsetY = offsetY

    // Grid state using depth=16 Mask with 4 bits per cell (supports polyomino IDs 0-15)
    /** @type {Mask} */
    this.gridMask = new Mask(width, height, null, null, GRID_DEPTH)

    // RectDrawColor for rendering (4-bit to display polyomino colors)
    /** @type {RectDrawColor|null} */
    this.rectDrawColor = null

    /** @type {PlacedPolyomino[]} - Array of placed polyominoes */
    this.polyominoes = []
    /** @type {Polyomino[]} - All available polyominoes from generator */
    this.availablePolyominoes = []

    /** @type {string} - Connectivity mode: '4', '4diag', or '8' */
    this.connectivity = '4'
    /** @type {number} - Size of polyominoes to generate (number of cells) */
    this.polyominoSize = 4

    // Track range for pagination
    /** @type {number} - Current index in the polyomino list */
    this.currentPolyominoIndex = 0
    /** @type {'fill'|'single'} - Current display mode */
    this.displayMode = 'fill'

    // Track range for next/prev pagination (-1 means uninitialized)
    /** @type {number} - Index of first placed polyomino in current view (-1 if none) */
    this.lastFirstPlacedIndex = -1
    /** @type {number} - Index of last placed polyomino in current view (-1 if none) */
    this.lastLastPlacedIndex = -1

    // Polyomino ID counter (1-based, 0 = empty)
    /** @type {number} - Next polyomino ID to assign (starts at POLYOMINO_ID_START) */
    this.nextPolyId = POLYOMINO_ID_START

    // Color palette for rendering polyominoes
    /** @type {string[]} - Array of hex color codes for polyomino rendering */
    this.polyominoColors = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#f0a500',
      '#95e1d3',
      '#c7ceea',
      '#ffd93d',
      '#6bcf7f',
      '#ff9a76',
      '#a8e6cf',
      '#ffd3b6',
      '#ffaaa5',
      '#ff8b94',
      '#a8dadc',
      '#f1faee',
      '#e63946'
    ]

    this.initialize()
  }

  /**
   * Initialize the canvas renderer
   *
   * Attempts to create RectDrawColor instance for rendering grid to canvas.
   * Silently fails if canvas is not available (e.g., in test environment).
   *
   * @returns {void}
   * @private
   */
  initialize () {
    try {
      this.rectDrawColor = new RectDrawColor(
        this.canvasId,
        this.width,
        this.height,
        this.cellSize,
        this.offsetX,
        this.offsetY,
        GRID_DEPTH // depth=16 gives 4 bits per cell for 16-color rendering (polyomino IDs 1-15)
      )
    } catch {
      // Canvas not available in test environment - silently continue
    }
  }

  /**
   * Load polyominoes from generator based on current connectivity settings
   *
   * Creates an appropriate polyomino generator (ortho, diagonal, or king connectivity)
   * and generates all polyominoes of the configured size. Results are cached in
   * availablePolyominoes for later use.
   *
   * @returns {Polyomino[]} Array of available polyominoes of current size and connectivity
   */
  loadPolyominoes () {
    const generator =
      this.connectivity === '4'
        ? createOrthoPolyominoGenerator()
        : this.connectivity === '4diag'
        ? createDiagonalPolyominoGenerator()
        : createKingPolyominoGenerator()

    this.availablePolyominoes = generator.collectAll(this.polyominoSize)
    return this.availablePolyominoes
  }

  /**
   * Check if a polyomino can be placed at the given position
   *
   * Validates:
   * - Bounding box is within grid bounds
   * - All occupied cells are empty in gridMask
   * - No 8-connectivity adjacency to other polyominoes (no touching allowed)
   *
   * @param {Polyomino} poly - The polyomino to check
   * @param {number} startX - Starting X position (top-left of bounding box)
   * @param {number} startY - Starting Y position (top-left of bounding box)
   * @param {number} [excludeId=-1] - Polyomino ID to exclude from adjacency check (for moving)
   * @returns {boolean} True if placement is valid at this position
   */
  canPlacePolyomino (poly, startX, startY, excludeId = -1) {
    // Check bounds
    if (
      startX < 0 ||
      startY < 0 ||
      startX + poly.width > this.width ||
      startY + poly.height > this.height
    ) {
      return false
    }

    const toCheck = new Set()

    // First pass: check if cells are empty and collect neighbors
    for (const [x, y] of poly.allXYlocations()) {
      if (poly.at(x, y)) {
        const gridX = startX + x
        const gridY = startY + y

        // Check if cell is empty in gridMask
        if (this.gridMask.at(gridX, gridY) !== EMPTY_CELL_VALUE) {
          return false
        }

        // Add 8-neighborhood to check set
        for (const [nx, ny] of this.gridMask.indexer.neighbors(gridX, gridY)) {
          if (this.gridMask.isValid(nx, ny)) {
            if (!(nx === gridX && ny === gridY)) {
              toCheck.add(ny * this.width + nx)
            }
          }
        }
      }
    }

    // Second pass: check if any neighboring cell is occupied by another polyomino
    for (const idx of toCheck) {
      const y = Math.floor(idx / this.width)
      const x = idx % this.width
      const cellValue = this.gridMask.at(x, y)
      if (cellValue !== EMPTY_CELL_VALUE && cellValue !== excludeId) {
        return false
      }
    }

    return true
  }

  /**
   * Place a polyomino on the grid
   *
   * Updates both gridMask (stores polyomino IDs) and RectDrawColor (stores color values).
   * Adds the placed polyomino to the polyominoes array for tracking.
   *
   * @param {Polyomino} poly - The polyomino to place
   * @param {number} startX - Starting X position (top-left of bounding box)
   * @param {number} startY - Starting Y position (top-left of bounding box)
   * @param {number} polyId - Unique ID for the polyomino (1-15)
   * @returns {boolean} True if placement was successful (includes validation)
   */
  placePolyomino (poly, startX, startY, polyId) {
    if (!this.canPlacePolyomino(poly, startX, startY, polyId)) {
      return false
    }

    for (const [x, y] of poly.allXYlocations()) {
      if (poly.at(x, y)) {
        const gridX = startX + x
        const gridY = startY + y

        // Store polyomino ID in gridMask (1-15)
        this.gridMask.set(gridX, gridY, polyId)

        // Set color in RectDrawColor
        if (this.rectDrawColor) {
          const colorIndex = (polyId - 1) % this.polyominoColors.length
          this.rectDrawColor.setColorValue(gridX, gridY, colorIndex + 1)
        }
      }
    }

    this.polyominoes.push({
      poly,
      x: startX,
      y: startY,
      id: polyId
    })

    return true
  }

  /**
   * Remove a polyomino from the grid by its ID
   *
   * Clears all cells occupied by the polyomino in both gridMask and RectDrawColor.
   * Removes the polyomino entry from the polyominoes array.
   *
   * @param {number} polyId - ID of the polyomino to remove (1-15)
   * @returns {void}
   */
  removePolyomino (polyId) {
    for (const [x, y] of this.gridMask.allXYlocations()) {
      if (this.gridMask.at(x, y) === polyId) {
        this.gridMask.clear(x, y)
        if (this.rectDrawColor) {
          this.rectDrawColor.setColorValue(x, y, EMPTY_CELL_VALUE)
        }
      }
    }
    this.polyominoes = this.polyominoes.filter(p => p.id !== polyId)
  }

  /**
   * Clear the entire grid and reset all state
   *
   * Removes all placed polyominoes, resets grid mask, clears renderer,
   * and resets polyomino ID counter and pagination tracking.
   *
   * @returns {void}
   * @private
   */
  _clearGrid () {
    this.gridMask = new Mask(this.width, this.height, null, null, GRID_DEPTH)
    if (this.rectDrawColor) {
      this.rectDrawColor.clear()
    }
    this.polyominoes = []
    this.nextPolyId = POLYOMINO_ID_START
  }

  /**
   * Attempt to place polyominoes greedily from the given list
   *
   * Iterates through polyominoes and tries to place each one at the first valid
   * position found. Stops when maximum polyominoes reached or a polyomino cannot
   * be placed.
   *
   * @param {Polyomino[]} polyominoes - List of polyominoes to place
   * @param {number} [maxToPlace=MAX_POLYOMINOES_PER_PAGE] - Maximum number to place
   * @returns {PlacementStatistics} Object with placedCount, firstPlacedIndex, lastPlacedIndex
   * @private
   */
  _placePolyominoesGreedily (
    polyominoes,
    maxToPlace = MAX_POLYOMINOES_PER_PAGE
  ) {
    let placedCount = 0
    let firstPlacedIndex = -1
    let lastPlacedIndex = -1

    for (const [i, poly] of polyominoes.entries()) {
      if (this.nextPolyId > maxToPlace) break

      let placed = false
      // Try all positions
      for (const [x, y] of this.gridMask.allXYlocations()) {
        if (this.canPlacePolyomino(poly, x, y, this.nextPolyId)) {
          this.placePolyomino(poly, x, y, this.nextPolyId)
          this.nextPolyId++
          placedCount++
          if (firstPlacedIndex === -1) firstPlacedIndex = i
          lastPlacedIndex = i
          placed = true
          break
        }
      }

      if (!placed) {
        // Stop trying if we can't place this one
        break
      }
    }

    return { placedCount, firstPlacedIndex, lastPlacedIndex }
  }

  /**
   * Try to fill the grid with polyominoes using greedy placement
   *
   * Clears the grid, loads polyominoes with current settings, and places as many
   * as possible. Updates display and pagination state. Returns statistics on
   * placement success.
   *
   * @returns {PlacementResult} Result including placed count, total, and whether all fit
   */
  fillGrid () {
    this._clearGrid()
    this.lastFirstPlacedIndex = POLYOMINO_ID_START
    this.lastLastPlacedIndex = POLYOMINO_ID_START
    const polyominoes = this.loadPolyominoes()
    if (polyominoes.length === 0) {
      return { placed: 0, total: 0, allFitted: true }
    }

    const { placedCount } = this._placePolyominoesGreedily(
      polyominoes,
      GRID_DEPTH - 1
    ) // Leave room for empty

    this.lastLastPlacedIndex = this.nextPolyId - 1
    if (this.rectDrawColor) {
      this.rectDrawColor.redraw()
    }

    this.displayMode = 'fill'
    this._updateDisplayForFill(placedCount, polyominoes.length)
    this._updatePaginationButtons()

    return {
      placed: placedCount,
      total: polyominoes.length,
      allFitted: placedCount === polyominoes.length
    }
  }

  /**
   * Show a single polyomino at the specified index
   *
   * Clears grid, loads available polyominoes (if not already loaded), and displays
   * the polyomino at the given index positioned at grid (0,0). Updates display
   * to show single-mode information.
   *
   * @param {number} index - Index of the polyomino to show (0-based)
   * @returns {boolean} True if the polyomino was placed successfully
   */
  showPolyomino (index) {
    if (!this.rectDrawColor) {
      // Canvas not available (test environment or not initialized)
      return false
    }

    const polyominoes = this.availablePolyominoes
    if (polyominoes.length === 0) {
      this.loadPolyominoes()
    }

    if (index < 0 || index >= this.availablePolyominoes.length) {
      return false
    }

    this.currentPolyominoIndex = index
    this.displayMode = 'single'

    this._clearGrid()

    const poly = this.availablePolyominoes[index]
    const placed = this.placePolyomino(poly, 0, 0, POLYOMINO_ID_START)

    if (this.rectDrawColor) {
      this.rectDrawColor.redraw()
    }
    this._updateDisplayForSingle(index, this.availablePolyominoes.length)
    this._updatePaginationButtons()

    return placed
  }

  /**
   * Show next set of polyominoes - starts at 1 + previous end, wraps to beginning
   *
   * For fill mode pagination: displays the next batch starting after the last
   * displayed polyomino. For single mode: displays the next individual polyomino.
   * Wraps around when reaching the end of the list.
   *
   * @returns {boolean} True if any polyominoes were placed
   */
  nextPolyomino () {
    if (this.availablePolyominoes.length === 0) {
      this.loadPolyominoes()
    }

    let nextIndex
    if (this.lastFirstPlacedIndex === -1 && this.lastLastPlacedIndex === -1) {
      // Uninitialized: use simple next from currentPolyominoIndex
      nextIndex =
        (this.currentPolyominoIndex + 1) % this.availablePolyominoes.length
    } else {
      // Range-based: start after last displayed
      nextIndex =
        (this.lastLastPlacedIndex + 1) % this.availablePolyominoes.length
    }
    return this._fillGridWithPolyominoesFromIndex(nextIndex)
  }

  /**
   * Show previous set of polyominoes - goes back before first displayed
   *
   * For fill mode pagination: displays the previous batch ending before the first
   * displayed polyomino. For single mode: displays the previous individual polyomino.
   * Wraps around when reaching the beginning of the list.
   *
   * @returns {boolean} True if any polyominoes were placed
   */
  prevPolyomino () {
    if (this.availablePolyominoes.length === 0) {
      this.loadPolyominoes()
    }

    let prevIndex
    if (this.lastFirstPlacedIndex === -1 && this.lastLastPlacedIndex === -1) {
      // Uninitialized: use simple prev from currentPolyominoIndex
      prevIndex =
        (this.currentPolyominoIndex - 1 + this.availablePolyominoes.length) %
        this.availablePolyominoes.length
    } else {
      // Range-based: calculate previous range end and work backward
      const displayedCount =
        this.lastLastPlacedIndex - this.lastFirstPlacedIndex + 1
      const newEndIndex = this.lastFirstPlacedIndex - 1
      prevIndex =
        (newEndIndex - displayedCount + 1 + this.availablePolyominoes.length) %
        this.availablePolyominoes.length
    }
    return this._fillGridWithPolyominoesFromIndex(prevIndex)
  }

  /**
   * Fill grid with polyominoes starting from a specific index
   *
   * Clears grid, rotates polyomino list to start at startIndex, and places as many
   * as possible (up to MAX_POLYOMINOES_PER_PAGE). Updates pagination tracking for
   * next/prev navigation. Used internally by nextPolyomino() and prevPolyomino().
   *
   * @param {number} startIndex - Index to start placing from (0-based)
   * @returns {boolean} True if any polyominoes were placed
   * @private
   */
  _fillGridWithPolyominoesFromIndex (startIndex) {
    if (!this.rectDrawColor) {
      return false
    }

    this._clearGrid()
    this.currentPolyominoIndex = startIndex

    const polyominoes = this.availablePolyominoes
    if (polyominoes.length === 0) {
      return false
    }

    // Create a rotated list starting from startIndex
    const rotatedPolyominoes = [
      ...polyominoes.slice(startIndex),
      ...polyominoes.slice(0, startIndex)
    ]

    const { placedCount, firstPlacedIndex, lastPlacedIndex } =
      this._placePolyominoesGreedily(rotatedPolyominoes)

    if (this.rectDrawColor) {
      this.rectDrawColor.redraw()
    }

    this.displayMode = 'fill'
    // Store the range for next/prev pagination
    // End index = start + count - 1 (ensures start + count = end + 1)
    const actualFirstIndex =
      firstPlacedIndex === -1
        ? 0
        : (startIndex + firstPlacedIndex) % polyominoes.length
    this.lastFirstPlacedIndex = actualFirstIndex
    const actualLastIndex =
      firstPlacedIndex === -1
        ? 0
        : (startIndex + lastPlacedIndex) % polyominoes.length
    this.lastLastPlacedIndex = actualLastIndex
    this._updateDisplayForRange(
      actualFirstIndex,
      actualLastIndex,
      polyominoes.length
    )
    this._updatePaginationButtons()

    return placedCount > 0
  }

  /**
   * Update the polyomino info display with range info
   *
   * Updates the DOM element with ID 'rect-poly-more' to show which polyominoes
   * are currently displayed (e.g., "Showing polyominoes 1-5 of 100").
   * Silently fails if element not available (test environment).
   *
   * @param {number} startIndex - Starting index (0-based)
   * @param {number} endIndex - Ending index (0-based)
   * @param {number} total - Total number of polyominoes available
   * @returns {void}
   * @private
   */
  _updateDisplayForRange (startIndex, endIndex, total) {
    try {
      const moreDiv = document.getElementById('rect-poly-more')
      if (moreDiv && moreDiv.style) {
        if (startIndex === -1 || endIndex === -1) {
          moreDiv.textContent = `No polyominoes placed (${this.polyominoSize} cells, ${this.connectivity}-connected)`
          moreDiv.style.color = '#d00'
        } else {
          const start = startIndex + 1
          const end = endIndex + 1
          moreDiv.textContent = `Showing polyominoes ${start}-${end} of ${total} (${this.polyominoSize} cells, ${this.connectivity}-connected)`
          moreDiv.style.color = '#333'
        }
      }
    } catch {
      // Silently fail in test environment
    }
  }

  /**
   * Update the polyomino info display for fill mode
   *
   * Updates the DOM element with ID 'rect-poly-more' to show fill mode statistics
   * (e.g., "Showing all 100 polyominoes" or "Showing 15 of 100 - not all fit").
   * Silently fails if element not available (test environment).
   *
   * @param {number} placed - Number of polyominoes placed
   * @param {number} total - Total number of polyominoes available
   * @returns {void}
   * @private
   */
  _updateDisplayForFill (placed, total) {
    try {
      const moreDiv = document.getElementById('rect-poly-more')
      if (moreDiv && moreDiv.style) {
        if (placed === total) {
          moreDiv.textContent = `Showing all ${total} polyominoes (${this.polyominoSize} cells, ${this.connectivity}-connected)`
          moreDiv.style.color = '#666'
        } else {
          moreDiv.textContent = `Showing ${placed} of ${total} polyominoes (${this.polyominoSize} cells, ${this.connectivity}-connected) - not all fit`
          moreDiv.style.color = '#d00'
        }
      }
    } catch {
      // Silently fail in test environment
    }
  }

  /**
   * Update display when showing a single polyomino
   *
   * Updates the DOM element with ID 'rect-poly-more' to show single polyomino display
   * information (e.g., "Polyomino 5 of 100").
   * Silently fails if element not available (test environment).
   *
   * @param {number} index - Index of the polyomino being displayed (0-based)
   * @param {number} total - Total number of polyominoes available
   * @returns {void}
   * @private
   */
  _updateDisplayForSingle (index, total) {
    try {
      const moreDiv = document.getElementById('rect-poly-more')
      if (!moreDiv?.style) return
      moreDiv.textContent = `Polyomino ${index + 1} of ${total} (${
        this.polyominoSize
      } cells, ${this.connectivity}-connected)`
      moreDiv.style.color = '#333'
    } catch {
      // Silently fail in test environment
    }
  }

  /**
   * Check if pagination is needed
   *
   * Pagination is needed when the total number of polyominoes exceeds
   * MAX_POLYOMINOES_PER_PAGE.
   *
   * @returns {boolean} True if pagination is needed
   * @private
   */
  _isPaginationNeeded () {
    return this.availablePolyominoes.length > MAX_POLYOMINOES_PER_PAGE
  }

  /**
   * Update pagination button states based on whether pagination is needed
   *
   * Enables/disables the 'next-poly-grid' and 'prev-poly-grid' buttons and adjusts
   * their opacity. Silently fails if buttons not available (test environment).
   *
   * @returns {void}
   * @private
   */
  _updatePaginationButtons () {
    try {
      const nextButton = document.getElementById('next-poly-grid')
      const prevButton = document.getElementById('prev-poly-grid')
      const needed = this._isPaginationNeeded()

      if (nextButton) {
        nextButton.disabled = !needed
        nextButton.style.opacity = needed ? '1' : '0.5'
      }
      if (prevButton) {
        prevButton.disabled = !needed
        prevButton.style.opacity = needed ? '1' : '0.5'
      }
    } catch {
      // Silently fail in test environment
    }
  }

  /**
   * Draw the grid using RectDrawColor
   *
   * Triggers a redraw of the canvas through the RectDrawColor renderer.
   * Safe to call if rectDrawColor is null (checks before drawing).
   *
   * @returns {void}
   */
  draw () {
    if (this.rectDrawColor) {
      this.rectDrawColor.redraw()
    }
  }
}
