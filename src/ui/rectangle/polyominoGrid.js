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
 * @typedef {Object} PlacedPolyomino
 * @property {Object} poly - The polyomino object
 * @property {number} x - X position on grid
 * @property {number} y - Y position on grid
 * @property {number} id - Unique ID of the polyomino
 */

/**
 * @typedef {Object} PlacementResult
 * @property {number} placed - Number of polyominoes placed
 * @property {number} total - Total number of polyominoes available
 * @property {boolean} allFitted - Whether all polyominoes fit
 */

/**
 * PolyominoGridManager - Manages polyomino placement, display, and constraints using 4-bit Mask
 * Uses RectDrawColor for rendering
 */
export class PolyominoGridManager {
  /**
   * @param {string} canvasId - ID of the canvas element
   * @param {number} [width=10] - Grid width in cells
   * @param {number} [height=10] - Grid height in cells
   * @param {number} [cellSize=50] - Size of each cell in pixels
   * @param {number} [offsetX=50] - X offset for drawing
   * @param {number} [offsetY=50] - Y offset for drawing
   */
  constructor (
    canvasId,
    width = 10,
    height = 10,
    cellSize = 50,
    offsetX = 50,
    offsetY = 50
  ) {
    this.canvasId = canvasId
    this.width = width
    this.height = height
    this.cellSize = cellSize
    this.offsetX = offsetX
    this.offsetY = offsetY

    // Grid state using depth=16 Mask with 4 bits per cell (supports polyomino IDs 0-15)
    this.gridMask = new Mask(width, height, null, null, GRID_DEPTH)

    // RectDrawColor for rendering (4-bit to display polyomino colors)
    this.rectDrawColor = null

    /** @type {PlacedPolyomino[]} */
    this.polyominoes = [] // Placed polyominoes
    /** @type {Object[]} */
    this.availablePolyominoes = [] // All available polyominoes from generator

    // Settings
    this.connectivity = '4'
    this.polyominoSize = 4

    // Track range for next/prev pagination
    this.currentPolyominoIndex = 0
    this.displayMode = 'fill' // 'fill' or 'single'

    // Track range for next/prev pagination (-1 means uninitialized)
    this.lastFirstPlacedIndex = -1
    this.lastLastPlacedIndex = -1

    // Polyomino ID counter (1-based, 0 = empty)
    this.nextPolyId = POLYOMINO_ID_START

    // Color palette for rendering polyominoes
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
   * Initialize the renderer
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
    } catch (err) {
      // Canvas not available in test environment
    }
  }

  /**
   * Load polyominoes from generator based on current settings
   * @returns {Object[]} Array of available polyominoes
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
   * Respects 8-connectivity constraint (no polyominoes touching)
   * @param {Object} poly - The polyomino to place
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position
   * @param {number} [excludeId=-1] - Polyomino ID to exclude from adjacency check
   * @returns {boolean} True if placement is valid
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
   * @param {Object} poly - The polyomino to place
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position
   * @param {number} polyId - Unique ID for the polyomino
   * @returns {boolean} True if placement was successful
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
   * Remove a polyomino by ID
   * @param {number} polyId - ID of the polyomino to remove
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
   * Clear the entire grid and reset state
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
   * @param {Object[]} polyominoes - List of polyominoes to place
   * @param {number} [maxToPlace=MAX_POLYOMINOES_PER_PAGE] - Maximum number to place
   * @returns {Object} Placement statistics
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
   * Try to fill the grid with polyominoes greedily
   * @returns {PlacementResult} Result of the placement operation
   */
  fillGrid () {
    this._clearGrid()
    this.lastFirstPlacedIndex = POLYOMINO_ID_START
    this.lastLastPlacedIndex = POLYOMINO_ID_START
    const polyominoes = this.loadPolyominoes()
    if (polyominoes.length === 0)
      return { placed: 0, total: 0, allFitted: true }

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
   * @param {number} index - Index of the polyomino to show
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
   * Show next polyomino - starts at 1 + previous end, wraps to beginning
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
   * Show previous polyomino - goes back before first displayed
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
   * Places as many polyominoes as possible, up to MAX_POLYOMINOES_PER_PAGE total
   * @param {number} startIndex - Index to start placing from
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
   * Update the polyomino info display with range
   * Shows polyominoes [start+1]-[end+1] of [total]
   * @param {number} startIndex - Starting index (0-based)
   * @param {number} endIndex - Ending index (0-based)
   * @param {number} total - Total number of polyominoes
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
    } catch (e) {
      // Silently fail in test environment
    }
  }

  /**
   * Update the polyomino info display for fill mode
   * @param {number} placed - Number placed
   * @param {number} total - Total available
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
    } catch (e) {
      // Silently fail in test environment
    }
  }

  /**
   * Update display when showing a single polyomino
   * @param {number} index - Index of the polyomino
   * @param {number} total - Total number of polyominoes
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
    } catch (e) {
      // Silently fail in test environment
    }
  }

  /**
   * Check if pagination is needed (i.e., not all polyominoes fit in one page)
   * @returns {boolean} True if pagination is needed
   * @private
   */
  _isPaginationNeeded () {
    return this.availablePolyominoes.length > MAX_POLYOMINOES_PER_PAGE
  }

  /**
   * Update pagination button states based on whether pagination is needed
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
    } catch (e) {
      // Silently fail in test environment
    }
  }

  /**
   * Draw the grid using RectDrawColor
   */
  draw () {
    if (this.rectDrawColor) {
      this.rectDrawColor.redraw()
    }
  }
}
