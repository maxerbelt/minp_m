import { Mask } from './mask.js'
import { RectIndex } from './RectIndex.js'

const rectIndexCache = new Map()

function getRectIndexForDimensions (width, height) {
  const cacheKey = `${width}x${height}`
  if (!rectIndexCache.has(cacheKey)) {
    rectIndexCache.set(cacheKey, new RectIndex(width, height))
  }
  return rectIndexCache.get(cacheKey)
}

/**
 * Redelmeier polyomino generator with proper D4 canonical normalization
 * Generates unique polyominoes without duplicates
 *
 * Key features:
 * - Orthogonal connectivity (4-connected) or king-connected (8-connected)
 * - Correct D4 symmetry group handling (8 transforms for square polyominoes)
 * - Canonical form computed during generation to avoid duplicates
 * - Bitboard-only operations
 * - Incremental frontier tracking
 * - Window size: W = H = 2 * maxCells + 1 to prevent edge hits
 */
export class RedelmeierGenerator {
  constructor (connectivity = '4') {
    if (!['4', '8'].includes(connectivity)) {
      throw new Error("connectivity must be '4' or '8'")
    }
    this.connectivity = connectivity
    this._boardTemplate = Mask.empty(3, 3)
  }

  /**
   * Calculate window size given max number of cells
   */
  calculateWindowSize (maxCells) {
    return 2 * maxCells + 1
  }

  /**
   * Create an oversized board to hold polyominoes safely
   */
  createBoard (maxCells) {
    const windowSize = this.calculateWindowSize(maxCells)
    return this._boardTemplate.expand(windowSize, windowSize)
  }

  /**
   * Get normalized canonical form of a polyomino
   * Finds the lexicographically smallest equivalent under D4
   * @private
   */
  getCanonicalForm (polyominoBits, width, height, store) {
    // Step 1: Minimize bounding box to origin

    const {
      bitboard: normalizedPolyomino,
      newWidth: boundingBoxWidth,
      newHeight: boundingBoxHeight
    } = this.minimizeBoundingBoxToOrigin(polyominoBits, width, height, store)

    if (!normalizedPolyomino) return [0n, 1, 1]

    // Step 2: Find minimal form under all 8 D4 symmetries
    return this.findCanonicalFormAmongD4Symmetries(
      normalizedPolyomino,
      boundingBoxWidth,
      boundingBoxHeight,
      store
    )
  }

  /**
   * Normalize polyomino by moving its bounding box to origin (0,0)
   * @private
   */
  minimizeBoundingBoxToOrigin (polyominoBits, width, height, store) {
    if (!polyominoBits) return store.emptyBoundingBox()
    return store.shrinkToOccupied(polyominoBits, width, height)
  }

  /**
   * Compare D4 symmetries and find the lexicographically smallest form
   * @private
   */
  findCanonicalFormAmongD4Symmetries (
    normalizedPolyomino,
    boundingBoxWidth,
    boundingBoxHeight,
    store
  ) {
    let bestPolyomino = normalizedPolyomino
    let bestRepresentation = this.polyToString(
      normalizedPolyomino,
      boundingBoxWidth,
      boundingBoxHeight,
      store
    )
    let bestWidth = boundingBoxWidth
    let bestHeight = boundingBoxHeight

    const d4Symmetries = Array.from(
      this.generateD4Forms(
        normalizedPolyomino,
        boundingBoxWidth,
        boundingBoxHeight,
        store
      )
    )

    for (const [symmetryBits, symmetryWidth, symmetryHeight] of d4Symmetries) {
      const symmetryBoundingBox = this.getBoundingBox(
        symmetryBits,
        symmetryWidth,
        symmetryHeight,
        store
      )
      if (!symmetryBoundingBox) continue
      const {
        bitboard: minimizedSymmetry,
        newWidth: minimizedWidth,
        newHeight: minimizedHeight
      } = this.minimizeBoundingBoxToOrigin(
        symmetryBits,
        symmetryWidth,
        symmetryHeight,
        store
      )

      const currentRepresentation = this.polyToString(
        minimizedSymmetry,
        minimizedWidth,
        minimizedHeight,
        store
      )

      if (currentRepresentation < bestRepresentation) {
        bestPolyomino = minimizedSymmetry
        bestRepresentation = currentRepresentation
        bestWidth = minimizedWidth
        bestHeight = minimizedHeight
      }
    }

    return [bestPolyomino, bestWidth, bestHeight]
  }

  /**
   * Convert polyomino to binary string for lexicographic comparison
   * @private
   */
  polyToString (polyominoBits, width, height, store) {
    let binaryRepresentation = ''
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        binaryRepresentation += this.cellAt(polyominoBits, x, y, width, store)
          ? '1'
          : '0'
      }
    }
    return binaryRepresentation
  }

  /**
   * Generate all 8 D4 symmetries
   * @private
   */
  *generateD4Forms (polyominoBits, width, height, store) {
    yield [polyominoBits, width, height]

    if (width === height) {
      yield* this.generateSquarePolyominoSymmetries(polyominoBits, width, store)
    } else {
      yield* this.generateRectangularPolyominoSymmetries(
        polyominoBits,
        width,
        height,
        store
      )
    }
  }

  /**
   * Generate all 4 rotations and 4 rotated-flipped forms for square polyominoes
   * @private
   */
  *generateSquarePolyominoSymmetries (polyominoBits, size, store) {
    // 4 rotations
    let rotatedForm = polyominoBits
    for (
      let rotationIteration = 0;
      rotationIteration < 3;
      rotationIteration++
    ) {
      rotatedForm = this.rotate90CW(rotatedForm, size, size, store)
      yield [rotatedForm, size, size]
    }

    // Flip then 4 rotations
    let flippedForm = this.flipHorizontal(polyominoBits, size, size, store)
    yield [flippedForm, size, size]

    rotatedForm = flippedForm
    for (
      let rotationIteration = 0;
      rotationIteration < 3;
      rotationIteration++
    ) {
      rotatedForm = this.rotate90CW(rotatedForm, size, size, store)
      yield [rotatedForm, size, size]
    }
  }

  /**
   * Generate all rotations and flipped rotations for rectangular polyominoes
   * Note: rotations swap width and height
   * @private
   */
  *generateRectangularPolyominoSymmetries (polyominoBits, width, height, store) {
    // Generate 4 rotations (each rotation swaps dimensions)
    let currentWidth = width
    let currentHeight = height
    let rotatedForm = polyominoBits

    // Rotate 90°
    rotatedForm = this.rotate90CW(
      rotatedForm,
      currentWidth,
      currentHeight,
      store
    )
    yield [rotatedForm, currentHeight, currentWidth]

    // Rotate 180°
    currentWidth = currentHeight
    currentHeight = width
    rotatedForm = this.rotate90CW(
      rotatedForm,
      currentWidth,
      currentHeight,
      store
    )
    yield [rotatedForm, currentHeight, currentWidth]

    // Rotate 270°
    currentWidth = width
    currentHeight = height
    rotatedForm = this.rotate90CW(
      rotatedForm,
      currentWidth,
      currentHeight,
      store
    )
    yield [rotatedForm, currentHeight, currentWidth]

    // Flip and generate rotations
    let flippedForm = this.flipHorizontal(polyominoBits, width, height, store)
    yield [flippedForm, width, height]

    currentWidth = width
    currentHeight = height
    rotatedForm = flippedForm

    // Flipped + Rotate 90°
    rotatedForm = this.rotate90CW(
      rotatedForm,
      currentWidth,
      currentHeight,
      store
    )
    yield [rotatedForm, currentHeight, currentWidth]

    // Flipped + Rotate 180°
    currentWidth = currentHeight
    currentHeight = width
    rotatedForm = this.rotate90CW(
      rotatedForm,
      currentWidth,
      currentHeight,
      store
    )
    yield [rotatedForm, currentHeight, currentWidth]

    // Flipped + Rotate 270°
    currentWidth = width
    currentHeight = height
    rotatedForm = this.rotate90CW(
      rotatedForm,
      currentWidth,
      currentHeight,
      store
    )
    yield [rotatedForm, currentHeight, currentWidth]
  }

  /**
   * Rotate polyomino bits 90° clockwise
   * @private
   */
  rotate90CW (polyominoBits, width, height, store) {
    let rotatedBits = 0n
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.cellAt(polyominoBits, x, y, width, store)) {
          // (x,y) -> (height-1-y, x) in rotated system
          const rotatedX = height - 1 - y
          const rotatedY = x
          rotatedBits = this.setCellAt(
            rotatedBits,
            rotatedX,
            rotatedY,
            height,
            store
          )
        }
      }
    }
    return rotatedBits
  }

  /**
   * Flip polyomino horizontally
   * @private
   */
  flipHorizontal (polyominoBits, width, height, store) {
    let flippedBits = 0n
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.cellAt(polyominoBits, x, y, width, store)) {
          const flippedX = width - 1 - x
          flippedBits = this.setCellAt(flippedBits, flippedX, y, width, store)
        }
      }
    }
    return flippedBits
  }

  /**
   * Get bounding box of all occupied cells
   * Returns object with minX, maxX, minY, maxY or null if empty
   * @private
   */
  getBoundingBox (polyominoBits, width, height, store) {
    const minBounds = store.boundingBox(width, height, polyominoBits)
    if (!minBounds) return null

    let maxX = -1
    let maxY = -1

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.cellAt(polyominoBits, x, y, width, store)) {
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    return maxX >= 0
      ? {
          minX: minBounds.minCol,
          minY: minBounds.minRow,
          maxX,
          maxY
        }
      : null
  }

  /**
   * Calculate bitboard index from x, y coordinates
   * @private
   */
  calculateCellIndex (x, y, width) {
    return y * width + x
  }

  /**
   * Check if cell is occupied at (x, y)
   * @private
   */
  cellAt (polyominoBits, x, y, width, store) {
    const cellIndex = this.calculateCellIndex(x, y, width)
    return store.hasIdxSet(polyominoBits, cellIndex)
  }

  /**
   * Set cell at (x, y) to occupied
   * @private
   */
  setCellAt (polyominoBits, x, y, width, store) {
    const cellIndex = this.calculateCellIndex(x, y, width)
    return store.setIdx(polyominoBits, cellIndex)
  }

  /**
   * Get frontier cells (unoccupied neighbors of occupied cells)
   * Sorted for consistent ordering in canonical generation
   * @private
   */
  getFrontier (polyominoBits, width, height, store) {
    const frontierCells = this.buildFrontierSet(
      polyominoBits,
      width,
      height,
      store
    )
    return Array.from(frontierCells).sort((a, b) => a - b)
  }

  /**
   * Build set of frontier cell indices by visiting all occupied cells
   * @private
   */
  buildFrontierSet (polyominoBits, width, height, store) {
    const frontierSet = new Set()

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.cellAt(polyominoBits, x, y, width, store)) {
          const adjacentCells = this.getAdjacentCellCoordinates(
            x,
            y,
            width,
            height
          )
          for (const [adjacentX, adjacentY] of adjacentCells) {
            if (
              !this.cellAt(polyominoBits, adjacentX, adjacentY, width, store)
            ) {
              const frontierIndex = this.calculateCellIndex(
                adjacentX,
                adjacentY,
                width
              )
              frontierSet.add(frontierIndex)
            }
          }
        }
      }
    }

    return frontierSet
  }

  /**
   * Get adjacent cell coordinates based on connectivity type
   * Implement using RectIndex.connection.4 or RectIndex.connection.8
   * @private
   */
  getAdjacentCellCoordinates (x, y, width, height) {
    const rectIndex = getRectIndexForDimensions(width, height)
    const connectionKey = this.connectivity === '8' ? 8 : 4
    const neighborCells = rectIndex.connection[connectionKey].neighbors(x, y)

    return neighborCells.filter(
      ([nx, ny]) => nx >= 0 && nx < width && ny >= 0 && ny < height
    )
  }

  /**
   * Redelmeier recursion with frontier ordering constraint
   * Key: only add cells that come after the last added in frontier
   * This prevents exploring equivalent subtrees
   * @private
   */
  *redelmeierRecursive (
    polyominoBits,
    targetSize,
    currentSize,
    width,
    height,
    store,
    seenCanonicalForms,
    minimumFrontierIndex = -1
  ) {
    if (currentSize === targetSize) {
      yield* this.yieldIfCanonicalFormUnseen(
        polyominoBits,
        width,
        height,
        store,
        seenCanonicalForms
      )
      return
    }

    const frontierCells = this.getFrontier(polyominoBits, width, height, store)

    // Only consider frontier cells respecting growth order
    const validFrontierCells = this.filterFrontierByMinimumIndex(
      frontierCells,
      minimumFrontierIndex
    )

    for (const frontierCellIndex of validFrontierCells) {
      const polyominoWithNewCell =
        polyominoBits | (1n << BigInt(frontierCellIndex))

      // Recurse with new minimum frontier index constraint
      yield* this.redelmeierRecursive(
        polyominoWithNewCell,
        targetSize,
        currentSize + 1,
        width,
        height,
        store,
        seenCanonicalForms,
        frontierCellIndex
      )
    }
  }

  /**
   * Filter frontier cells to only those after a minimum index
   * This ensures we never explore the same growth path twice
   * @private
   */
  filterFrontierByMinimumIndex (frontierCells, minimumFrontierIndex) {
    return frontierCells.filter(cellIndex => cellIndex > minimumFrontierIndex)
  }

  /**
   * Compute canonical form and yield if not previously seen
   * @private
   */
  *yieldIfCanonicalFormUnseen (
    polyominoBits,
    width,
    height,
    store,
    seenCanonicalForms
  ) {
    const [canonicalBits, canonicalWidth, canonicalHeight] =
      this.getCanonicalForm(polyominoBits, width, height, store)
    const canonicalHash = canonicalToString(
      canonicalBits,
      canonicalWidth,
      canonicalHeight
    )

    if (!seenCanonicalForms.has(canonicalHash)) {
      seenCanonicalForms.add(canonicalHash)
      yield new Mask(canonicalWidth, canonicalHeight, canonicalBits, store, 1)
    }
  }

  /**
   * Generate polyominoes of a specific size
   */
  *generate (cellCount) {
    if (cellCount < 1) {
      throw new Error('cellCount must be >= 1')
    }

    const board = this.createBoard(cellCount)
    const seedPolyomino = 1n // Start with single cell at index 0

    const seenCanonicalForms = new Set()
    yield* this.redelmeierRecursive(
      seedPolyomino,
      cellCount,
      1,
      board.width,
      board.height,
      board.store,
      seenCanonicalForms,
      -1
    )
  }

  /**
   * Generate polyominoes in a size range
   */
  *generateRange (minSize, maxSize) {
    if (minSize < 1 || maxSize < minSize) {
      throw new Error('minSize >= 1 and maxSize >= minSize required')
    }

    for (let size = minSize; size <= maxSize; size++) {
      yield* this.generate(size)
    }
  }

  /**
   * Count unique polyominoes of a given size
   */
  count (cellCount) {
    return this.collectAllPolyominoes(cellCount).length
  }

  /**
   * Collect all polyominoes of a given size into an array
   */
  collectAll (cellCount) {
    return this.collectAllPolyominoes(cellCount)
  }

  /**
   * Internal method to collect polyominoes from generator
   * @private
   */
  collectAllPolyominoes (cellCount) {
    const result = []
    for (const polyomino of this.generate(cellCount)) {
      result.push(polyomino)
    }
    return result
  }

  /**
   * Collect polyominoes in a size range into an array
   */
  collectAllInRange (minSize, maxSize) {
    return this.collectAllPolyominoesInRange(minSize, maxSize)
  }

  /**
   * Internal method to collect polyominoes in range
   * @private
   */
  collectAllPolyominoesInRange (minSize, maxSize) {
    const result = []
    for (const polyomino of this.generateRange(minSize, maxSize)) {
      result.push(polyomino)
    }
    return result
  }
}

/**
 * Convert canonical polyomino representation to unique string hash
 * @private
 */
function canonicalToString (polyominoBits, width, height) {
  return `${polyominoBits.toString(36)}:${width}x${height}`
}

/**
 * Factory functions for common connectivity types
 */

/**
 * Create a generator for orthogonal (4-connected) polyominoes
 * Cells connect via shared edges only
 */
export function createOrthoPolyominoGenerator () {
  return new RedelmeierGenerator('4')
}

/**
 * Create a generator for king-connected (8-connected) polyominoes
 * Cells connect via shared edges or corners
 */
export function createKingPolyominoGenerator () {
  return new RedelmeierGenerator('8')
}
