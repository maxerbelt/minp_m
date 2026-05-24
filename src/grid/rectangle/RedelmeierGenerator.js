import { Mask } from './mask.js'
import { RectIndex } from './RectIndex.js'
import { Actions } from './actions.js'
import { BigOne } from '../bitStore/helpers/bigbits.js'

/**
 * @typedef {Object} BitStore
 * @property {function(bigint, number): bigint} bitMaskByPos - Get bitmask at position
 * @property {function(bigint, number): bigint} setIdx - Set bit at index
 * @property {function(bigint, number): boolean} hasIdxSet - Check if bit is set at index
 * @property {function(bigint, number, bigint): bigint} setIdx - Set bit value at index
 * @property {function(): {bitboard: bigint, newWidth: number, newHeight: number}} emptyBoundingBox - Get empty bounding box
 * @property {function(bigint, number, number): {bitboard: bigint, newWidth: number, newHeight: number}} shrinkToOccupied - Shrink to occupied cells
 * @property {function(bigint, number, number): bigint} expandToSquare - Expand to square grid
 * @property {function(number, number, bigint): {minRow: number, minCol: number}|null} boundingBox - Get bounding box of polyomino
 */

/**
 * @typedef {Object} RedelmeierState
 * @property {Set<string>} seenCanonicalForms - Set of canonical form hashes already generated
 * @property {number} minimumFrontierIndex - Minimum frontier cell index to consider for growth constraint
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} minX - Minimum X coordinate (column)
 * @property {number} minY - Minimum Y coordinate (row)
 * @property {number} maxX - Maximum X coordinate (column)
 * @property {number} maxY - Maximum Y coordinate (row)
 */

/**
 * @typedef {Object} BoundingBoxResult
 * @property {bigint} bitboard - Bitboard representation of shrunk polyomino
 * @property {number} newWidth - New width after shrinking
 * @property {number} newHeight - New height after shrinking
 */

/** @type {Map<string, RectIndex>} */
const rectIndexCache = new Map()

/**
 * Get or create a cached RectIndex for the given dimensions
 *
 * Caches RectIndex instances to avoid recreating them for repeated dimension requests,
 * improving performance for multiple polyomino generations.
 *
 * @param {number} width - Grid width in cells (must be positive)
 * @param {number} height - Grid height in cells (must be positive)
 * @returns {RectIndex} Cached or newly created index object for the dimensions
 * @private
 */
function getRectIndexForDimensions (width, height) {
  const cacheKey = `${width}x${height}`
  if (!rectIndexCache.has(cacheKey)) {
    rectIndexCache.set(cacheKey, new RectIndex(width, height))
  }
  return rectIndexCache.get(cacheKey)
}

/**
 * Redelmeier polyomino generator with proper D4 canonical normalization
 *
 * Generates unique polyominoes without duplicates using the Redelmeier algorithm,
 * a canonical enumeration method for polyominoes. Key features:
 *
 * Algorithm Features:
 * - Orthogonal connectivity (4-connected) or king-connected (8-connected)
 * - Correct D4 symmetry group handling (8 transforms for square polyominoes)
 * - Canonical form computed during generation to avoid duplicates
 * - Bitboard-only operations for efficiency
 * - Incremental frontier tracking
 * - Window size: W = H = 2 * maxCells + 1 to prevent edge hits
 *
 * D4 Symmetries:
 * The D4 dihedral group consists of 8 transformations:
 * - Identity
 * - 90°, 180°, 270° rotations
 * - 4 reflections (horizontal, vertical, and 2 diagonals)
 *
 * Redelmeier Ordering:
 * Uses frontier ordering constraint to prevent exploring equivalent subtrees:
 * Only adds cells that come after the last added in frontier list, ensuring
 * each unique polyomino is explored exactly once.
 *
 * @class RedelmeierGenerator
 * @example
 * const generator = new RedelmeierGenerator('4');
 * const pentominoes = generator.collectAll(5);
 * console.log(`Found ${pentominoes.length} pentominoes`);
 */
export class RedelmeierGenerator {
  /**
   * Initialize Redelmeier polyomino generator
   *
   * @param {string} [connectivity='4'] - Connectivity type: '4' (orthogonal edges only),
   *                                       '8' (king-connected with diagonals),
   *                                       or '4diag' (diagonal-connected)
   * @throws {Error} If connectivity is not one of the supported types: '4', '4diag', or '8'
   */
  constructor (connectivity = '4') {
    if (!['4', '4diag', '8'].includes(connectivity)) {
      throw new Error("connectivity must be '4', '4diag' or '8'")
    }
    /** @type {string} */
    this.connectivity = connectivity
    /** @type {Mask} */
    this._boardTemplate = Mask.empty(3, 3)
  }

  /**
   * Calculate window size given max number of cells
   *
   * Ensures board is large enough to hold polyominoes without edge clipping.
   * Formula: windowSize = 2 * maxCells + 1
   *
   * @param {number} maxCells - Maximum number of cells in polyominoes (must be positive)
   * @returns {number} Calculated window size for board creation
   */
  calculateWindowSize (maxCells) {
    return 2 * maxCells + 1
  }

  /**
   * Create an oversized board to hold polyominoes safely
   *
   * Expands the template mask to accommodate the polyominoes
   * with sufficient margin to prevent edge interactions.
   *
   * @param {number} maxCells - Maximum number of cells in polyominoes (must be positive)
   * @returns {Mask} Expanded board mask with dimensions calculated from maxCells
   */
  createBoard (maxCells) {
    const windowSize = this.calculateWindowSize(maxCells)
    return this._boardTemplate.expand(windowSize, windowSize)
  }

  /**
   * Get normalized canonical form of a polyomino
   *
   * Finds the lexicographically smallest equivalent under all D4 symmetries.
   * This ensures each unique polyomino has exactly one canonical representation.
   *
   * Algorithm:
   * 1. Shrink bounding box to origin (0,0)
   * 2. Generate all 8 D4 symmetries
   * 3. Compare lexicographically and return smallest
   *
   * @param {bigint} polyominoBits - Bitboard representation of polyomino
   * @param {number} width - Current board width in cells (must be positive)
   * @param {number} height - Current board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation with bitwise operations
   * @returns {[bigint, number, number]} Tuple [canonicalBits, canonicalWidth, canonicalHeight] representing
   *                                     the canonical form with minimal bounding box
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
   *
   * Removes excess whitespace and positions the polyomino at the top-left.
   *
   * @param {bigint} polyominoBits - Bitboard representation (0n if empty)
   * @param {number} width - Board width in cells (must be positive)
   * @param {number} height - Board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation
   * @returns {BoundingBoxResult} Shrunk polyomino with minimized bounding box and new dimensions
   * @private
   */
  minimizeBoundingBoxToOrigin (polyominoBits, width, height, store) {
    if (!polyominoBits) return store.emptyBoundingBox()
    return store.shrinkToOccupied(polyominoBits, width, height)
  }

  /**
   * Compare D4 symmetries and find the lexicographically smallest form
   *
   * Generates all 8 D4 symmetries using the Actions orbit method,
   * compares them lexicographically, and returns the canonical form.
   *
   * @param {bigint} normalizedPolyomino - Normalized bitboard representation (non-zero)
   * @param {number} boundingBoxWidth - Width of bounding box in cells (must be > 0)
   * @param {number} boundingBoxHeight - Height of bounding box in cells (must be > 0)
   * @param {BitStore} store - Bit storage implementation
   * @returns {[bigint, number, number]} Canonical form [canonicalBits, width, height] or [0n, 1, 1] if invalid
   * @private
   */
  findCanonicalFormAmongD4Symmetries (
    normalizedPolyomino,
    boundingBoxWidth,
    boundingBoxHeight,
    store
  ) {
    const side = Math.max(boundingBoxWidth, boundingBoxHeight)
    // Expand the normalized polyomino to square grid
    const squareBits = store.expandToSquare(
      normalizedPolyomino,
      boundingBoxHeight,
      boundingBoxWidth
    )
    // Create a Mask for the square polyomino
    const mask = new Mask(side, side, squareBits, store, 1)
    const actions = new Actions(side, side, mask)

    // Generate all D4 symmetries using Actions.orbit
    const symmetries = actions.orbit()

    let best = null
    let bestBits = null
    let bestWidth = 0
    let bestHeight = 0

    for (const sym of symmetries) {
      const bounds = this.getBoundingBox(sym, side, side, actions.store)
      if (!bounds) continue

      const str = this.polyToString(sym, side, side, actions.store, side)
      if (best === null || str < best) {
        best = str
        bestBits = sym
        bestWidth = bounds.maxX + 1
        bestHeight = bounds.maxY + 1
      }
    }

    if (!bestBits) return [0n, 1, 1]

    // Extract the minimized bitboard
    let minimizedBits = 0n
    for (let y = 0; y < bestHeight; y++) {
      for (let x = 0; x < bestWidth; x++) {
        if (this.cellAt(bestBits, x, y, side, actions.store)) {
          const index = y * bestWidth + x
          minimizedBits |= BigOne.bitMaskByPos(index)
        }
      }
    }

    return [minimizedBits, bestWidth, bestHeight]
  }

  /**
   * Convert polyomino to binary string for lexicographic comparison
   *
   * Iterates through cells in row-major order and builds a string of '0' and '1'
   * representing unoccupied and occupied cells, suitable for lexicographic ordering.
   *
   * @param {bigint} polyominoBits - Bitboard representation (may be 0n for empty)
   * @param {number} width - Board width in cells (must be positive)
   * @param {number} height - Board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation
   * @param {number} [gridWidth=width] - Optional different grid width for bit index calculation
   * @returns {string} Binary string representation ('0' and '1') of cells in row-major order
   * @private
   */
  polyToString (polyominoBits, width, height, store, gridWidth = width) {
    let binaryRepresentation = ''
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        binaryRepresentation += this.cellAt(
          polyominoBits,
          x,
          y,
          gridWidth,
          store
        )
          ? '1'
          : '0'
      }
    }
    return binaryRepresentation
  }

  /**
   * Get bounding box of all occupied cells
   *
   * Returns coordinates of the smallest rectangle containing all cells.
   *
   * @param {bigint} polyominoBits - Bitboard representation (may be 0n for empty)
   * @param {number} width - Board width in cells (must be positive)
   * @param {number} height - Board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation
   * @returns {BoundingBox|null} Bounding box with min/max coordinates or null if empty
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
   *
   * Converts 2D grid coordinates to 1D bitboard index using row-major order.
   * Formula: index = y * width + x
   *
   * @param {number} x - X coordinate (column, 0-based, must be >= 0)
   * @param {number} y - Y coordinate (row, 0-based, must be >= 0)
   * @param {number} width - Board width in cells (must be positive)
   * @returns {number} Linear index in bitboard (non-negative integer)
   * @private
   */
  calculateCellIndex (x, y, width) {
    return y * width + x
  }

  /**
   * Check if cell is occupied at (x, y)
   *
   * Tests if the bit at the given position is set in the bitboard.
   *
   * @param {bigint} polyominoBits - Bitboard representation (may be 0n for empty)
   * @param {number} x - X coordinate (column, 0-based, must be >= 0)
   * @param {number} y - Y coordinate (row, 0-based, must be >= 0)
   * @param {number} width - Board width in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation
   * @returns {boolean} True if cell is occupied, false otherwise or out of bounds
   * @private
   */
  cellAt (polyominoBits, x, y, width, store) {
    const cellIndex = this.calculateCellIndex(x, y, width)
    return store.hasIdxSet(polyominoBits, cellIndex)
  }

  /**
   * Get frontier cells (unoccupied neighbors of occupied cells)
   *
   * The frontier is the set of empty cells adjacent to at least one
   * occupied cell. These are the only cells where the polyomino can grow.
   * Results are sorted for consistent ordering in canonical generation.
   *
   * @param {bigint} polyominoBits - Bitboard representation (may be 0n for empty)
   * @param {number} width - Board width in cells (must be positive)
   * @param {number} height - Board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation
   * @returns {number[]} Sorted array of frontier cell indices (empty array if no frontier)
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
   *
   * Iterates through occupied cells and collects all unoccupied neighbors
   * based on the configured connectivity type.
   *
   * @param {bigint} polyominoBits - Bitboard representation (may be 0n for empty)
   * @param {number} width - Board width in cells (must be positive)
   * @param {number} height - Board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation
   * @returns {Set<number>} Set of frontier cell indices (may be empty)
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
   *
   * Returns neighbors according to the configured connectivity:
   * - '4': orthogonal (up, down, left, right)
   * - '8': king-connected (includes diagonals)
   * - '4diag': diagonal-connected
   *
   * Results are clipped to board boundaries.
   *
   * @param {number} x - X coordinate (column, 0-based, must be >= 0)
   * @param {number} y - Y coordinate (row, 0-based, must be >= 0)
   * @param {number} width - Board width in cells (must be positive)
   * @param {number} height - Board height in cells (must be positive)
   * @returns {Array<[number, number]>} Array of [x, y] neighbor coordinates (may be empty if isolated)
   * @private
   */
  getAdjacentCellCoordinates (x, y, width, height) {
    const rectIndex = getRectIndexForDimensions(width, height)
    const connectionKey = this.getConnectionKey()
    const neighborCells = rectIndex.connection[connectionKey].neighbors(x, y)

    return neighborCells.filter(
      ([nx, ny]) => nx >= 0 && nx < width && ny >= 0 && ny < height
    )
  }

  /**
   * Get the connection key for RectIndex based on connectivity type
   *
   * Extracts the appropriate connection key for neighbor lookup.
   *
   * @returns {number|string} Connection key (4, 8, or '4diag')
   * @private
   */
  getConnectionKey () {
    if (this.connectivity === '8') {
      return 8
    }
    if (this.connectivity === '4diag') {
      return '4diag'
    }
    return 4
  }

  /**
   * Redelmeier recursion with frontier ordering constraint
   *
   * Recursively builds polyominoes by adding frontier cells in order.
   * Key constraint: only add cells that come after the last added in frontier.
   * This prevents exploring equivalent subtrees.
   *
   * Parameters are grouped into a state object to respect the 7-parameter limit.
   *
   * @param {bigint} polyominoBits - Current polyomino bitboard (non-zero)
   * @param {number} targetSize - Target number of cells (must be >= 1)
   * @param {number} currentSize - Current number of cells (must be < targetSize)
   * @param {number} width - Board width in cells (must be positive)
   * @param {number} height - Board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation
   * @param {RedelmeierState} state - State object tracking seen forms and frontier constraint
   * @yields {Mask} Polyomino masks that represent unique polyominoes of target size
   * @private
   */
  *redelmeierRecursive (
    polyominoBits,
    targetSize,
    currentSize,
    width,
    height,
    store,
    state
  ) {
    if (currentSize === targetSize) {
      yield* this.yieldIfCanonicalFormUnseen(
        polyominoBits,
        width,
        height,
        store,
        state.seenCanonicalForms
      )
      return
    }

    const frontierCells = this.getFrontier(polyominoBits, width, height, store)

    // Only consider frontier cells respecting growth order
    const validFrontierCells = this.filterFrontierByMinimumIndex(
      frontierCells,
      state.minimumFrontierIndex
    )

    for (const frontierCellIndex of validFrontierCells) {
      const polyominoWithNewCell =
        polyominoBits | BigOne.bitMaskByPos(frontierCellIndex)

      // Recurse with new minimum frontier index constraint
      yield* this.redelmeierRecursive(
        polyominoWithNewCell,
        targetSize,
        currentSize + 1,
        width,
        height,
        store,
        {
          seenCanonicalForms: state.seenCanonicalForms,
          minimumFrontierIndex: frontierCellIndex
        }
      )
    }
  }

  /**
   * Filter frontier cells to only those after a minimum index
   *
   * Ensures we never explore the same growth path twice by restricting
   * which cells can be added next based on frontier ordering.
   *
   * @param {number[]} frontierCells - Sorted array of frontier indices (must be sorted ascending)
   * @param {number} minimumFrontierIndex - Minimum acceptable index (exclusive, must be >= -1)
   * @returns {number[]} Filtered frontier indices where index > minimumFrontierIndex (may be empty)
   * @private
   */
  filterFrontierByMinimumIndex (frontierCells, minimumFrontierIndex) {
    return frontierCells.filter(cellIndex => cellIndex > minimumFrontierIndex)
  }

  /**
   * Compute canonical form and yield if not previously seen
   *
   * Converts polyomino to canonical form, checks if it's been seen before,
   * and yields it if it's new. Prevents duplicate polyominoes.
   *
   * @param {bigint} polyominoBits - Bitboard representation (non-zero)
   * @param {number} width - Board width in cells (must be positive)
   * @param {number} height - Board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation
   * @param {Set<string>} seenCanonicalForms - Set of previously seen canonical hashes (will be mutated)
   * @yields {Mask} Polyomino mask if canonical form is new and unseen
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
   *
   * Creates a new polyomino collection starting from a single seed cell
   * at the center of an oversized board, then recursively adds cells
   * while enforcing D4 canonical uniqueness.
   *
   * @param {number} cellCount - Number of cells in generated polyominoes (must be >= 1)
   * @returns {Generator<Mask>} Generator yielding unique polyominoes in canonical form
   * @throws {Error} If cellCount < 1
   * @example
   * const gen = new RedelmeierGenerator('4');
   * for (const poly of gen.generate(4)) {
   *   console.log(`Tetromino with ${poly.occupancy} cells`);
   * }
   */
  *generate (cellCount) {
    if (cellCount < 1) {
      throw new Error('cellCount must be >= 1')
    }

    const board = this.createBoard(cellCount)
    const centerX = Math.floor(board.width / 2)
    const centerY = Math.floor(board.height / 2)
    const centerIndex = centerY * board.width + centerX
    const seedPolyomino = BigOne.bitMaskByPos(centerIndex)

    const seenCanonicalForms = new Set()
    yield* this.redelmeierRecursive(
      seedPolyomino,
      cellCount,
      1,
      board.width,
      board.height,
      board.store,
      { seenCanonicalForms, minimumFrontierIndex: -1 }
    )
  }

  /**
   * Generate polyominoes in a size range
   *
   * Generates all polyominoes with cell counts from minSize to maxSize (inclusive).
   *
   * @param {number} minSize - Minimum number of cells (must be >= 1)
   * @param {number} maxSize - Maximum number of cells (must be >= minSize)
   * @returns {Generator<Mask>} Generator yielding polyominoes in order of size
   * @throws {Error} If minSize < 1 or maxSize < minSize
   * @example
   * const gen = new RedelmeierGenerator('4');
   * const range = gen.generateRange(3, 5); // Triominoes through Pentominoes
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
   * Collect all polyominoes from a generator into an array
   *
   * Exhausts the generator and returns all yielded polyominoes in an array.
   *
   * @param {Generator<Mask>} generator - Polyomino generator (must be iterable)
   * @returns {Mask[]} Array of polyomino masks in generation order (may be empty)
   * @private
   */
  collectFromGenerator (generator) {
    const result = []
    for (const polyomino of generator) {
      result.push(polyomino)
    }
    return result
  }

  /**
   * Count unique polyominoes of a given size
   *
   * @param {number} cellCount - Number of cells in polyominoes (must be >= 1)
   * @returns {number} Count of unique polyominoes of the given size (non-negative integer)
   */
  count (cellCount) {
    return this.collectAllPolyominoes(cellCount).length
  }

  /**
   * Collect all polyominoes of a given size into an array
   *
   * Public alias for collectAllPolyominoes. Generates and returns all unique
   * polyominoes of the specified size in canonical form.
   *
   * @param {number} cellCount - Number of cells in polyominoes (must be >= 1)
   * @returns {Mask[]} Array of all polyomino masks of the given size (sorted by generation order)
   * @example
   * const gen = new RedelmeierGenerator('4');
   * const tetrominoes = gen.collectAll(4); // 5 tetrominoes
   */
  collectAll (cellCount) {
    return this.collectAllPolyominoes(cellCount)
  }

  /**
   * Internal method to collect polyominoes from generator
   *
   * @param {number} cellCount - Number of cells in polyominoes (must be >= 1)
   * @returns {Mask[]} Array of polyomino masks (may be empty if cellCount < 1)
   * @private
   */
  collectAllPolyominoes (cellCount) {
    return this.collectFromGenerator(this.generate(cellCount))
  }

  /**
   * Collect polyominoes in a size range into an array
   *
   * Public alias for collectAllPolyominoesInRange. Generates and returns all unique
   * polyominoes with sizes from minSize to maxSize (inclusive).
   *
   * @param {number} minSize - Minimum number of cells (must be >= 1)
   * @param {number} maxSize - Maximum number of cells (must be >= minSize)
   * @returns {Mask[]} Array of polyomino masks from minSize to maxSize (sorted by size then generation)
   * @example
   * const gen = new RedelmeierGenerator('4');
   * const range = gen.collectAllInRange(1, 3); // Monomino + dominoes + triominoes
   */
  collectAllInRange (minSize, maxSize) {
    return this.collectAllPolyominoesInRange(minSize, maxSize)
  }

  /**
   * Internal method to collect polyominoes in range
   *
   * @param {number} minSize - Minimum number of cells (must be >= 1)
   * @param {number} maxSize - Maximum number of cells (must be >= minSize)
   * @returns {Mask[]} Array of polyomino masks in size order (may be empty if invalid range)
   * @private
   */
  collectAllPolyominoesInRange (minSize, maxSize) {
    return this.collectFromGenerator(this.generateRange(minSize, maxSize))
  }
}

/**
 * Convert canonical polyomino representation to unique string hash
 *
 * Creates a hash string combining bitboard representation with dimensions
 * for unique identification of polyominoes. Used to track seen canonical forms.
 * The hash format is "bits:widthxheight" for uniqueness verification.
 *
 * @param {bigint} polyominoBits - Bitboard representation (may be 0n)
 * @param {number} width - Polyomino width in cells (must be >= 1)
 * @param {number} height - Polyomino height in cells (must be >= 1)
 * @returns {string} Unique hash string combining bits and dimensions (e.g., "1a2b:3x4")
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
 *
 * Cells connect via shared edges only (up, down, left, right).
 * This is the standard definition of polyominoes in combinatorics.
 * Generates the canonical polyominoes: 1 monomino, 1 domino, 2 triominoes, 5 tetrominoes, 12 pentominoes, etc.
 *
 * @returns {RedelmeierGenerator} Configured RedelmeierGenerator for orthogonal polyominoes
 * @example
 * const gen = createOrthoPolyominoGenerator();
 * const pentominoes = gen.collectAll(5); // 12 pentominoes
 */
export function createOrthoPolyominoGenerator () {
  return new RedelmeierGenerator('4')
}

/**
 * Create a generator for king-connected (8-connected) polyominoes
 *
 * Cells connect via shared edges or corners (like a chess king's moves).
 * Also called "polyking" or "8-omino". Generates more shapes than orthogonal polyominoes.
 * Example: 2 dominoes (instead of 1), 5 triominoes (instead of 2), 22 tetrominoes (instead of 5).
 *
 * @returns {RedelmeierGenerator} Configured RedelmeierGenerator for king-connected polyominoes
 * @example
 * const gen = createKingPolyominoGenerator();
 * const kingTetrominoes = gen.collectAll(4); // 22 king-connected tetrominoes
 */
export function createKingPolyominoGenerator () {
  return new RedelmeierGenerator('8')
}

/**
 * Create a generator for diagonal-connected polyominoes
 *
 * Cells connect via shared diagonal corners (but not shared edges).
 * Intermediate connectivity between orthogonal and king connectivity.
 * Generates shapes distinct from both orthogonal and king-connected families.
 *
 * @returns {RedelmeierGenerator} Configured RedelmeierGenerator for diagonal-connected polyominoes
 * @example
 * const gen = createDiagonalPolyominoGenerator();
 * const diagTriominoes = gen.collectAll(3); // Diagonal-connected triominoes
 */
export function createDiagonalPolyominoGenerator () {
  return new RedelmeierGenerator('4diag')
}
