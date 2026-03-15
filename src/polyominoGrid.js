import {
  createOrthoPolyominoGenerator,
  createKingPolyominoGenerator
} from './grid/RedelmeierGenerator.js'
import { Mask } from './grid/mask.js'
import { RectDrawColor } from './grid/rectdrawcolor.js'

/**
 * PolyominoGridManager - Manages polyomino placement, display, and constraints using 4-bit Mask
 * Uses RectDrawColor for rendering
 */
export class PolyominoGridManager {
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
    this.gridMask = new Mask(width, height, null, null, 16)

    // RectDrawColor for rendering (4-bit to display polyomino colors)
    this.rectDrawColor = null

    this.polyominoes = [] // Placed polyominoes
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
    this.nextPolyId = 1

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

  initialize () {
    try {
      this.rectDrawColor = new RectDrawColor(
        this.canvasId,
        this.width,
        this.height,
        this.cellSize,
        this.offsetX,
        this.offsetY,
        16 // depth=16 gives 4 bits per cell for 16-color rendering (polyomino IDs 1-15)
      )
    } catch (err) {
      // Canvas not available in test environment
    }
  }

  /**
   * Load polyominoes from generator based on current settings
   */
  loadPolyominoes () {
    const generator =
      this.connectivity === '4'
        ? createOrthoPolyominoGenerator()
        : createKingPolyominoGenerator()

    this.availablePolyominoes = generator.collectAll(this.polyominoSize)
    return this.availablePolyominoes
  }

  /**
   * Check if a polyomino can be placed at the given position
   * Respects 8-connectivity constraint (no polyominoes touching)
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

    // First pass: check if cells are empty
    for (const [x, y] of poly.cells()) {
      if (poly.at(x, y)) {
        const gridX = startX + x
        const gridY = startY + y

        // Check if cell is empty in gridMask
        if (this.gridMask.at(gridX, gridY) !== 0) {
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
      if (cellValue !== 0 && cellValue !== excludeId) {
        return false
      }
    }

    return true
  }

  /**
   * Place a polyomino on the grid
   */
  placePolyomino (poly, startX, startY, polyId) {
    if (!this.canPlacePolyomino(poly, startX, startY, polyId)) {
      return false
    }

    for (const [x, y] of poly.cells()) {
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
   * Remove a polyomino by id
   */
  removePolyomino (polyId) {
    for (const [x, y] of this.gridMask.cells()) {
      if (this.gridMask.at(x, y) === polyId) {
        this.gridMask.clear(x, y)
        if (this.rectDrawColor) {
          this.rectDrawColor.setColorValue(x, y, 0)
        }
      }
    }
    this.polyominoes = this.polyominoes.filter(p => p.id !== polyId)
  }

  /**
   * Try to fill the grid with polyominoes greedily
   */
  fillGrid () {
    // Clear grid
    this.gridMask = new Mask(this.width, this.height, null, null, 16)
    if (this.rectDrawColor) {
      this.rectDrawColor.clear()
    }
    this.polyominoes = []
    this.nextPolyId = 1
    this.lastFirstPlacedIndex = 1
    this.lastLastPlacedIndex = 1
    const polyominoes = this.loadPolyominoes()
    if (polyominoes.length === 0) return

    let placedCount = 0

    // Try to place each polyomino
    for (const poly of polyominoes) {
      let placed = false

      // Try all positions
      for (const [x, y] of this.gridMask.cells()) {
        if (this.canPlacePolyomino(poly, x, y, this.nextPolyId)) {
          this.placePolyomino(poly, x, y, this.nextPolyId)
          this.nextPolyId++
          placedCount++
          placed = true
          break
        }
      }

      if (!placed) {
        // Stop trying if we can't place this one
        break
      }
    }

    this.lastLastPlacedIndex = this.nextPolyId - 1
    if (this.rectDrawColor) {
      this.rectDrawColor.redraw()
    }

    this.displayMode = 'fill'
    this.updateInfoDisplay(placedCount, polyominoes.length)
    this.updatePaginationButtons()

    return {
      placed: placedCount,
      total: polyominoes.length,
      allFitted: placedCount === polyominoes.length
    }
  }

  /**
   * Show a single polyomino at the specified index
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

    // Clear grid
    this.gridMask = new Mask(this.width, this.height, null, null, 16)
    this.rectDrawColor.clear()
    this.polyominoes = []
    this.nextPolyId = 1

    const poly = this.availablePolyominoes[index]
    const placed = this.placePolyomino(poly, 0, 0, 1)

    if (this.rectDrawColor) {
      this.rectDrawColor.redraw()
    }
    this.updatePolyominoIndexDisplay(index, this.availablePolyominoes.length)
    this.updatePaginationButtons()

    return placed
  }

  /**
   * Show next polyomino - starts at 1 + previous end, wraps to beginning
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
    return this.fillGridWithPolyominoes(nextIndex)
  }

  /**
   * Show previous polyomino - goes back before first displayed
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
    return this.fillGridWithPolyominoes(prevIndex)
  }

  /**
   * Fill grid with polyominoes starting from a specific index
   * Places as many polyominoes as possible, up to 15 total
   */
  fillGridWithPolyominoes (startIndex) {
    if (!this.rectDrawColor) {
      return false
    }

    // Clear grid
    this.gridMask = new Mask(this.width, this.height, null, null, 16)
    this.rectDrawColor.clear()
    this.polyominoes = []
    this.nextPolyId = 1
    this.currentPolyominoIndex = startIndex

    const polyominoes = this.availablePolyominoes
    if (polyominoes.length === 0) {
      return false
    }

    let placedCount = 0
    let firstPlacedIndex = -1
    let lastPlacedIndex = -1
    const maxPolyominoes = 15 // Less than 16 (max 15)

    // Try to place polyominoes starting from startIndex
    for (
      let i = 0;
      i < polyominoes.length && this.nextPolyId <= maxPolyominoes;
      i++
    ) {
      const polyIndex = (startIndex + i) % polyominoes.length
      const poly = polyominoes[polyIndex]
      let placed = false

      // Try all positions
      for (let y = 0; y < this.height && !placed; y++) {
        for (let x = 0; x < this.width && !placed; x++) {
          if (this.canPlacePolyomino(poly, x, y, this.nextPolyId)) {
            this.placePolyomino(poly, x, y, this.nextPolyId)
            this.nextPolyId++
            placedCount++
            if (firstPlacedIndex === -1) firstPlacedIndex = polyIndex
            lastPlacedIndex = polyIndex
            placed = true
          }
        }
      }

      if (!placed && this.nextPolyId > maxPolyominoes) {
        // Reached max polyominoes, stop trying
        break
      }
    }

    if (this.rectDrawColor) {
      this.rectDrawColor.redraw()
    }

    this.displayMode = 'fill'
    // Store the range for next/prev pagination
    // End index = start + count - 1 (ensures start + count = end + 1)
    this.lastFirstPlacedIndex = firstPlacedIndex === -1 ? 0 : firstPlacedIndex
    const endIndex =
      firstPlacedIndex === -1 ? 0 : firstPlacedIndex + placedCount - 1
    this.lastLastPlacedIndex = endIndex
    this.updatePolyominoRangeDisplay(
      firstPlacedIndex,
      endIndex,
      polyominoes.length
    )
    this.updatePaginationButtons()

    return placedCount > 0
  }

  /**
   * Update the polyomino info display with range
   * Shows polyominoes [start+1]-[end+1] of [total]
   */
  updatePolyominoRangeDisplay (startIndex, endIndex, total) {
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
   * Update the polyomino info display (legacy method for fillGrid)
   */
  updateInfoDisplay (placed, total) {
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
   */
  updatePolyominoIndexDisplay (index, total) {
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
   */
  isPaginationNeeded () {
    return this.availablePolyominoes.length > 15
  }

  /**
   * Update pagination button states based on whether pagination is needed
   */
  updatePaginationButtons () {
    try {
      const nextButton = document.getElementById('next-poly-grid')
      const prevButton = document.getElementById('prev-poly-grid')
      const needed = this.isPaginationNeeded()

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
