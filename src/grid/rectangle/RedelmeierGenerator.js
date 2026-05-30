import { Mask } from './mask.js'
import { RectIndex } from './RectIndex.js'
import { Actions } from './actions.js'
import { BigOne } from '../bitStore/helpers/bigbits.js'

/**
 * Bitboard store interface providing bit manipulation operations.
 *
 * Abstraction layer for bit-level manipulation of polyomino representations.
 * Different stores (BigInt, 32-bit, etc.) implement these methods for
 * efficient bitboard operations in polyomino generation with minimal overhead.
 *
 * The BitStore interface defines all bitwise operations needed by RedelmeierGenerator
 * to manipulate polyomino bitboards during growth and canonicalization.
 *
 * @typedef {Object} BitStore
 * Bit manipulation abstraction for polyomino storage and operations.
 * @property {(bitboard: bigint, pos: number) => bigint} bitMaskByPos
 *   Returns bitmask value at position (isolated bit, e.g., 1n << pos).
 *   Used to create single-bit masks for setting/checking cells.
 * @property {(bitboard: bigint, idx: number, value?: number) => bigint} setIdx
 *   Sets bit at index to value (or clears if value omitted/0), returns updated bitboard.
 *   Used during polyomino growth to add frontier cells.
 * @property {(bitboard: bigint, idx: number) => boolean} hasIdxSet
 *   Tests if bit is set at index, returns true if cell is occupied.
 *   Core cell occupancy test used extensively in frontier detection.
 * @property {() => {bitboard: bigint, newWidth: number, newHeight: number}} emptyBoundingBox
 *   Returns empty bitboard result with minimal dimensions (all zeros, typically 1x1).
 *   Used as sentinel for empty polyominoes.
 * @property {(bitboard: bigint, height: number, width: number) => {bitboard: bigint, newWidth: number, newHeight: number}} shrinkToOccupied
 *   Shrinks bitboard to minimal bounding box containing all occupied cells.
 *   Critical for canonical form computation; removes excess whitespace.
 * @property {(bitboard: bigint, height: number, width: number) => bigint} expandToSquare
 *   Expands rectangular bitboard to square dimensions for uniform D4 transformations.
 *   Necessary because D4 group requires square symmetry spaces.
 * @property {(width: number, height: number, bitboard: bigint) => {minRow: number, minCol: number}|null} boundingBox
 *   Computes bounding box min coordinates of occupied cells, returns null if empty.
 *   Returns object with minRow and minCol (top-left corner of bounding box).
 */

/**
 * State object tracking polyomino generation progress during recursion.
 *
 * Maintains deduplication state and frontier ordering constraint during
 * recursive Redelmeier algorithm execution. Passed through recursive calls
 * to preserve generation state without global variables.
 *
 * @typedef {Object} RedelmeierState
 * State tracking during Redelmeier recursion to prevent duplicates.
 * @property {Set<string>} seenCanonicalForms
 *   Set of canonical form hashes already encountered (prevents duplicates).
 *   Hashes computed as "bits:widthxheight" for unique identification.
 * @property {number} minimumFrontierIndex
 *   Minimum frontier cell index for next expansion (maintains canonical ordering).
 *   Ensures each growth path is explored exactly once by restricting frontier cells.
 */

/**
 * Axis-aligned bounding box with inclusive min/max coordinates.
 *
 * Defines the smallest axis-aligned rectangle containing all occupied cells in a polyomino.
 * Used for computing minimal representation and for canonical form comparison.
 * All coordinates are inclusive (cells from minX to maxX, minY to maxY are all included).
 *
 * @typedef {Object} BoundingBox
 * Minimal axis-aligned rectangle bounding occupied cells.
 * @property {number} minX - Leftmost column containing occupied cell (inclusive, 0-based)
 * @property {number} minY - Topmost row containing occupied cell (inclusive, 0-based)
 * @property {number} maxX - Rightmost column containing occupied cell (inclusive, 0-based)
 * @property {number} maxY - Bottommost row containing occupied cell (inclusive, 0-based)
 */

/**
 * Result from shrinking polyomino to minimal bounding box.
 *
 * Returned by bitboard shrinking operations that normalize sparse grids
 * by removing excess whitespace and positioning at origin (0,0).
 * Used extensively during canonical form computation.
 *
 * @typedef {Object} BoundingBoxResult
 * Normalized bitboard with minimal bounding box dimensions.
 * @property {bigint} bitboard - Normalized bitboard with cells at origin (0n if empty, all cells start at 0,0)
 * @property {number} newWidth - Width of minimal bounding box (>= 1, even for empty)
 * @property {number} newHeight - Height of minimal bounding box (>= 1, even for empty)
 */

/** @type {Map<string, RectIndex>} - Cache of RectIndex instances by dimension key */
const rectIndexCache = new Map()

/**
 * Get or create a cached RectIndex for the given dimensions.
 *
 * Caches RectIndex instances by dimension key ("widthxheight" format) to avoid
 * recreating them for repeated dimension requests. Significantly improves performance
 * for polyomino generation that reuses the same grid dimensions, since neighbor
 * lookup operations are expensive.
 *
 * **Cache Strategy:**
 * - Key format: "widthxheight" (e.g., "11x11" for pentominoes)
 * - Module-level cache shared across all generator instances
 * - First access for dimension pair: creates new RectIndex
 * - Subsequent accesses: returns cached instance
 * - No cache invalidation (dimensions assumed immutable)
 *
 * **Performance Impact:**
 * - RectIndex construction: O(width × height) (expensive)
 * - Cache miss: O(width × height) + O(1) insertion
 * - Cache hit: O(1) lookup
 * - Typical speedup: 10-100x for repeated size generation
 *
 * **Example Cache Behavior:**
 * - First getRectIndexForDimensions(11, 11): creates RectIndex, inserts into cache
 * - Second getRectIndexForDimensions(11, 11): returns cached RectIndex
 * - getRectIndexForDimensions(12, 12): creates new RectIndex (different size)
 *
 * @param {number} width - Grid width in cells (must be positive integer > 0, typically 3-25)
 * @param {number} height - Grid height in cells (must be positive integer > 0, typically 3-25)
 * @returns {RectIndex} Cached or newly created index object configured for the dimensions
 * @throws {Error} If RectIndex constructor throws on invalid dimensions
 * @private
 *
 * @see RectIndex for the neighbor lookup data structure
 */
function getRectIndexForDimensions (width, height) {
  const cacheKey = `${width}x${height}`
  if (!rectIndexCache.has(cacheKey)) {
    rectIndexCache.set(cacheKey, new RectIndex(width, height))
  }
  return rectIndexCache.get(cacheKey)
}

/**
 * Redelmeier polyomino generator with D4 canonical normalization and deduplication.
 *
 * Generates unique polyominoes without duplicates using the Redelmeier algorithm,
 * a canonical enumeration method that avoids exploring equivalent growth paths.
 * Eliminates rotations and reflections via D4 symmetry canonicalization.
 *
 * ## Algorithm Architecture
 *
 * **Redelmeier Recursion:**
 * - Builds polyominoes incrementally by adding frontier cells one at a time
 * - Frontier = unoccupied cells adjacent to the polyomino
 * - Maintains ordering constraint: only add cells after the last added (minimumFrontierIndex)
 * - This ensures each polyomino is explored exactly once, avoiding redundant subtrees
 *
 * **D4 Symmetry Handling (8 Transformations):**
 * - Computes canonical form for each polyomino under all 8 D4 transformations
 * - Prevents duplicates that are rotations/reflections of each other
 * - Canonical form = lexicographically smallest binary representation among all D4 equivalents
 * - Uses Actions class to generate complete D4 orbit (all 8 symmetries)
 *
 * **Connectivity Modes (Configurable):**
 * - **'4' (default):** Orthogonal - cells connect via shared edges (standard polyominoes)
 * - **'8':** King-connected - cells connect via edges or corners (polyking family)
 * - **'4diag':** Diagonal - cells connect via shared corners only
 *
 * **Performance Optimizations:**
 * - RectIndex caching by dimension key to avoid recreation
 * - BigInt bitboard representation for efficient storage (O(1) operations)
 * - Set-based canonical form deduplication with string hashing
 * - Lazy frontier computation (computed fresh in each recursion)
 *
 * ## Board Sizing & Seed Placement
 *
 * - Window size = 2 × maxCells + 1 (ensures polyominoes don't hit board edges)
 * - Seed cell placed at board center: (maxCells, maxCells)
 * - Seed index = centerY × width + centerX (row-major formula)
 * - Sufficient margin prevents clipping in any growth direction
 *
 * ## D4 Group Structure
 *
 * The dihedral group D4 (symmetries of a square) contains 8 elements:
 * - **Identity:** e (no transformation)
 * - **Rotations:** r90, r180, r270 (clockwise rotations)
 * - **Reflections:** fx, fy, and 2 diagonal reflections
 * - **Composition:** Closed under multiplication (group operation)
 *
 * ## Counts (Standard Orthogonal Polyominoes)
 *
 * - Monomino: 1
 * - Domino: 1
 * - Triomino: 2
 * - Tetromino: 5
 * - Pentomino: 12
 * - Hexomino: 35
 * - Heptomino: 108
 * - Octomino: 369
 *
 * ## Usage Example
 *
 * ```javascript
 * // Generate standard orthogonal polyominoes (4-connected)
 * const gen = new RedelmeierGenerator('4');
 * const pentominoes = gen.collectAll(5); // Array of 12 Mask objects
 * console.log(`Found ${pentominoes.length} pentominoes`);
 *
 * // Generate king-connected polyominoes (8-connected)
 * const kingGen = new RedelmeierGenerator('8');
 * const kingTetrominoes = kingGen.collectAll(4); // Array of 22 Mask objects
 * console.log(`Found ${kingTetrominoes.length} king-tetrominoes`);
 *
 * // Generate range of sizes
 * const triToPenta = gen.collectAllInRange(3, 5); // Triominoes + Tetrominoes + Pentominoes
 * ```
 *
 * ## References
 *
 * Redelmeier, D. Hugh. "The enumeration of polyominoes by perimeter."
 * Discrete Mathematics, vol. 36, no. 2, 1981, pp. 191-203.
 * DOI: 10.1016/0012-365X(81)90237-5
 *
 * Golomb, Solomon W. "Polyominoes: Puzzles, Patterns, Problems, and Packings."
 * Princeton University Press, 2nd edition, 1994.
 *
 * @class RedelmeierGenerator
 * @see Actions for D4 symmetry orbit computation
 * @see Mask for polyomino representation
 * @see RectIndex for neighbor coordinate caching
 */
export class RedelmeierGenerator {
  /**
   * Initialize Redelmeier polyomino generator with specified connectivity.
   *
   * Creates a generator configured for a specific connectivity type that determines
   * which cells are considered neighbors during polyomino growth. Each connectivity
   * mode generates a different family of polyominoes with different growth patterns.
   *
   * **Connectivity Types & Growth Behavior:**
   * - `'4'` (default): Orthogonal - cells connect via shared edges only
   *   - 4 neighbors per interior cell (up, down, left, right)
   *   - Standard definition in combinatorics literature
   *   - Generates canonical polyominoes: 1, 1, 2, 5, 12, 35, 108, 369...
   *
   * - `'8'`: King-connected - cells connect via edges or corners (like chess king)
   *   - 8 neighbors per interior cell (edges + diagonals)
   *   - Also called "polyking" or "8-omino"
   *   - More shapes than orthogonal: 2, 5, 22, 102...
   *
   * - `'4diag'`: Diagonal-connected - cells connect via corners only
   *   - 4 diagonal neighbors per interior cell (no edge connectivity)
   *   - Intermediate between orthogonal and king-connected
   *   - Generates distinct family of shapes
   *
   * **Initialization Behavior:**
   * - Validates connectivity parameter (throws Error if invalid)
   * - Stores connectivity type for use in getFrontier() and getAdjacentCellCoordinates()
   * - Creates empty template board (3×3) for expansion during generation
   * - RectIndex caches are shared across all generator instances (global optimization)
   *
   * **Performance Notes:**
   * - Construction is O(1) - minimal setup
   * - RectIndex instances are cached globally by dimension key
   * - Multiple generators with same connectivity reuse RectIndex objects
   * - Different connectivity types create separate index caches
   *
   * @param {string} [connectivity='4'] - Connectivity type for neighbor detection
   *   Must be one of: '4' (orthogonal), '8' (king), or '4diag' (diagonal)
   * @throws {Error} If connectivity is not one of the supported types: '4', '4diag', or '8'
   *   Error message: "connectivity must be '4', '4diag' or '8'"
   *
   * @example
   * const ortho = new RedelmeierGenerator('4');     // Standard polyominoes
   * const king = new RedelmeierGenerator('8');      // King-connected
   * const diag = new RedelmeierGenerator('4diag');  // Diagonal-connected
   * const defaultGen = new RedelmeierGenerator();   // Defaults to '4'
   *
   * @see #generate for polyomino generation
   * @see #getAdjacentCellCoordinates for connectivity-based neighbor lookup
   */
  constructor (connectivity = '4') {
    if (!['4', '4diag', '8'].includes(connectivity)) {
      throw new Error("connectivity must be '4', '4diag' or '8'")
    }
    /** @type {string} Configured connectivity type */
    this.connectivity = connectivity
    /** @type {Mask} Template 3×3 board for creating oversized boards */
    this._boardTemplate = Mask.empty(3, 3)
  }

  /**
   * Calculate window size given maximum number of cells.
   *
   * Computes the square board size needed to hold polyominoes safely without edge clipping.
   * The formula ensures a sufficient margin around the seed cell placed at center.
   *
   * **Formula:** windowSize = 2 × maxCells + 1
   *
   * **Derivation:**
   * - Seed cell placed at board center: (maxCells, maxCells)
   * - Maximum reach from seed in any direction: maxCells - 1 cells away
   * - Required grid span: from 0 to (2 × maxCells), inclusive
   * - Array size for indices 0 to n: n + 1
   * - Window size = 2 × maxCells + 1
   *
   * **Safety Margin:**
   * - Ensures polyominoes never reach board edges during growth
   * - Prevents index out-of-bounds errors during frontier expansion
   * - Conservative estimate handles worst-case linear extensions
   *
   * @param {number} maxCells - Maximum number of cells in polyominoes (must be >= 1, typically 1-12)
   * @returns {number} Calculated square window size (>= 3 for maxCells >= 1)
   * @throws {Error} If maxCells < 1
   *
   * @example
   * const gen = new RedelmeierGenerator();
   * gen.calculateWindowSize(5); // Returns 11 (sufficient for pentominoes)
   * gen.calculateWindowSize(1); // Returns 3 (monomino)
   * gen.calculateWindowSize(12); // Returns 25 (reasonable upper bound)
   *
   * @see #createBoard for board creation using this window size
   */
  calculateWindowSize (maxCells) {
    return 2 * maxCells + 1
  }

  /**
   * Create an oversized board to safely hold polyominoes during generation.
   *
   * Expands the template mask to square dimensions calculated from maxCells.
   * The board is sized sufficiently large to prevent polyominoes from hitting
   * edges during any growth sequence. Board is recreated for each generation
   * (not cached, as dimensions vary by polyomino size).
   *
   * **Board Characteristics:**
   * - Square dimensions (width === height === calculateWindowSize(maxCells))
   * - All cells initially unoccupied (empty state)
   * - Sufficient margin in all directions for maximum polyomino extent
   * - Seed cell will be placed at center: (windowSize/2, windowSize/2)
   *
   * **Performance:** O(width × height) in worst case (creates new Mask object)
   *
   * **Alternatives Not Used:**
   * - Could cache by maxCells, but generation typically uses each board once
   * - Could use fixed maximum board, but wastes space for small polyominoes
   *
   * @param {number} maxCells - Maximum number of cells in polyominoes (must be >= 1)
   * @returns {Mask} Expanded square board mask with dimensions (>= 3×3)
   *   Board contains no occupied cells initially, ready for seed placement
   *
   * @example
   * const gen = new RedelmeierGenerator();
   * const board5 = gen.createBoard(5);   // Creates 11×11 board for pentominoes
   * const board12 = gen.createBoard(12); // Creates 25×25 board for dodecominoes
   *
   * @see #calculateWindowSize for the window size calculation
   * @see #generate for board usage during polyomino generation
   */
  createBoard (maxCells) {
    const windowSize = this.calculateWindowSize(maxCells)
    return this._boardTemplate.expand(windowSize, windowSize)
  }

  /**
   * Get normalized canonical form of a polyomino.
   *
   * Finds the lexicographically smallest equivalent under all 8 D4 symmetries.
   * This ensures each unique polyomino has exactly one canonical representation,
   * enabling effective deduplication during generation.
   *
   * **Algorithm (3-step process):**
   * 1. **Minimize Bounding Box:** Call minimizeBoundingBoxToOrigin()
   *    - Removes excess whitespace from board edges
   *    - Positions polyomino at grid origin (0,0)
   *    - Uses store.shrinkToOccupied() for efficiency
   *    - Result: Minimal representation
   *
   * 2. **Generate D4 Symmetries:** Call findCanonicalFormAmongD4Symmetries()
   *    - Expands normalized polyomino to square dimensions
   *    - Uses Actions.orbit() to generate all 8 D4 transforms
   *    - Computes bounding box for each symmetry
   *    - Converts each to binary string (row-major order)
   *
   * 3. **Select Lexicographically Smallest:**
   *    - Compares binary strings using < operator (lexicographic)
   *    - Tracks smallest form and corresponding bitboard
   *    - Extracts minimized bits for final canonical form
   *
   * **Canonical Form Properties:**
   * - Unique representation: Each distinct polyomino has exactly one canonical form
   * - Rotation-invariant: All rotations map to same canonical form
   * - Reflection-invariant: All reflections map to same canonical form
   * - Comparable: Lexicographic comparison determines equivalence
   *
   * **Edge Cases:**
   * - Empty polyomino (0n) → [0n, 1, 1] (handled in step 1)
   * - Single cell (monomino) → all symmetries identical, returns monomino form
   * - Symmetric polyominoes → multiple transforms map to same canonical
   *
   * **Complexity:**
   * - Time: O(n log n) where n = number of cells (dominated by sorting/comparison)
   * - Space: O(n) for storing symmetry forms and working state
   * - D4 generation: O(8) transforms × O(n) per transform = O(n) constant factor
   *
   * **Performance Notes:**
   * - Most expensive operation during generation
   * - Called once per complete polyomino (at target size)
   * - Amortized O(1) per recursive call (only called at leaf nodes)
   *
   * @param {bigint} polyominoBits - Bitboard representation of polyomino (0n for empty)
   * @param {number} width - Current board width in cells (must be >= 1, typically large)
   * @param {number} height - Current board height in cells (must be >= 1, typically large)
   * @param {BitStore} store - Bit storage implementation with bitwise operations
   * @returns {Array<bigint|number>} Tuple [canonicalBits, canonicalWidth, canonicalHeight]
   *   where bits is the normalized bitboard, width/height are minimal bounding box
   * @throws {Error} If store methods throw, Actions.orbit() fails, or invalid inputs
   * @private
   *
   * @example
   * const board11x11 = gen.createBoard(5);
   * const poly = 0x7n; // L-tetromino
   * const result = gen.getCanonicalForm(poly, 11, 11, board11x11.store);
   * const bits = result[0]; // Normalized bitboard
   * const w = result[1];    // Minimal width
   * const h = result[2];    // Minimal height
   *
   * @see #minimizeBoundingBoxToOrigin for bounding box normalization
   * @see #findCanonicalFormAmongD4Symmetries for symmetry orbit computation
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
   * Normalize polyomino by moving its bounding box to origin (0,0).
   *
   * Removes excess whitespace and positions the polyomino at the top-left corner.
   * Uses the store's shrinkToOccupied method to minimize the bounding box.
   *
   * **Performance:** O(width × height) in worst case (must scan all cells)
   *
   * @param {bigint} polyominoBits - Bitboard representation (0n for empty polyomino)
   * @param {number} width - Current board width in cells (must be positive)
   * @param {number} height - Current board height in cells (must be positive)
   * @param {BitStore} store - Bit storage implementation with shrinkToOccupied method
   * @returns {BoundingBoxResult} Shrunk polyomino with minimized bounding box
   *   containing {bitboard (0n if empty), newWidth (>= 1), newHeight (>= 1)}
   * @throws {Error} If store.shrinkToOccupied throws on invalid input
   * @private
   */
  minimizeBoundingBoxToOrigin (polyominoBits, width, height, store) {
    if (!polyominoBits) return store.emptyBoundingBox()
    return store.shrinkToOccupied(polyominoBits, height, width)
  }

  /**
   * Compare D4 symmetries and find the lexicographically smallest form.
   *
   * Generates all 8 D4 symmetries using Actions orbit method, compares them
   * lexicographically in row-major binary representation, and returns the minimal.
   * Ensuring each polyomino has exactly one canonical form prevents duplicates.
   *
   * **Algorithm:**
   * 1. Expand normalized polyomino to square grid (max(width, height) × max(width, height))
   * 2. Create Actions object for D4 symmetry orbit computation
   * 3. Generate all 8 symmetries via actions.orbit()
   * 4. For each symmetry, compute bounding box and binary string representation
   * 5. Track lexicographically smallest binary string
   * 6. Extract minimized bits for the canonical form at its actual dimensions
   *
   * **D4 Symmetries (8 total):**
   * - Identity: No transformation
   * - 3 Rotations: 90°, 180°, 270° clockwise
   * - 4 Reflections: Vertical, horizontal, main diagonal, anti-diagonal
   *
   * **Complexity:** O(n × 8) where n = number of cells for bit comparisons
   *
   * @param {bigint} normalizedPolyomino - Normalized bitboard (non-zero, already bounding-box minimized)
   * @param {number} boundingBoxWidth - Width of normalized polyomino bounding box (must be > 0)
   * @param {number} boundingBoxHeight - Height of normalized polyomino bounding box (must be > 0)
   * @param {BitStore} store - Bit storage implementation with bitwise operations
   * @returns {[bigint, number, number]} Tuple [canonicalBits, canonicalWidth, canonicalHeight]
   *   representing the lexicographically smallest D4 form with minimal dimensions,
   *   or [0n, 1, 1] if input is empty or all symmetries are empty
   * @throws {Error} If store operations fail or Actions.orbit() fails
   * @private
   *
   * @example
   * const normalized = 0n; // or any bitboard
   * const result = gen.findCanonicalFormAmongD4Symmetries(
   *   normalized, 2, 3, store
   * );
   * const canonical = result[0];
   * const w = result[1];
   * const h = result[2];
   * // Returns the lexicographically smallest 2×3 or rotated equivalent
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
   * Build set of frontier cell indices by visiting all occupied cells.
   *
   * Frontier cells are unoccupied cells adjacent to at least one occupied cell.
   * These are the only positions where the polyomino can grow in the next iteration.
   *
   * **Algorithm:**
   * 1. Iterate through all board cells (row-major order)
   * 2. For each occupied cell, get its neighbors based on connectivity type
   * 3. If neighbor is empty, add its index to frontier set
   * 4. Return set (automatically deduplicates neighbors of multiple occupied cells)
   *
   * **Performance:** O(polyomino_size × neighbors_per_cell × adjacency_checks)
   * **Typical Frontier Size:** 2 × polyomino_size + 2 (for orthogonal 4-connected)
   *
   * **Connectivity Impact:**
   * - '4' (orthogonal): 4 neighbors max per cell
   * - '8' (king): 8 neighbors max per cell
   * - '4diag' (diagonal): 4 neighbors max per cell (corners only)
   *
   * @param {bigint} polyominoBits - Bitboard representation (0n for empty polyomino)
   * @param {number} width - Board width in cells (must be >= 1, typically > polyomino width)
   * @param {number} height - Board height in cells (must be >= 1, typically > polyomino height)
   * @param {BitStore} store - Bit storage implementation for cell checks
   * @returns {Set<number>} Set of frontier cell indices (empty set if polyomino is isolated)
   *   Each index computes as y × width + x in row-major order
   * @throws {Error} If store.hasIdxSet throws or coordinate lookup fails
   * @private
   *
   * @example
   * const frontierSet = gen.buildFrontierSet(polyBits, 11, 11, store);
   * // Returns Set<number> with indices of frontier cells like {25, 26, 35, ...}
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
   * Generate polyominoes of a specific size.
   *
   * Creates a new collection of polyominoes with exactly cellCount cells
   * by starting from a single seed cell at the center of an oversized board,
   * then recursively adding cells from the frontier while enforcing D4
   * canonical uniqueness and frontier ordering constraint.
   *
   * **Execution Flow:**
   * 1. Validate cellCount (>= 1)
   * 2. Create oversized board: size = 2 × cellCount + 1
   * 3. Place seed cell at board center
   * 4. Initialize generator state (seen forms set, frontier index = -1)
   * 5. Call redelmeierRecursive() with seed
   * 6. Recursion adds cells one at a time from frontier
   * 7. At target size, compute canonical form and yield if unseen
   *
   * **Frontier Ordering Constraint:**
   * - Only adds frontier cells with index > minimumFrontierIndex
   * - Prevents exploring equivalent subtrees multiple times
   * - Ensures each polyomino discovered exactly once
   * - Key insight: canonical enumeration without explicit dedup until end
   *
   * **D4 Canonicalization:**
   * - When target size reached, computes canonical form
   * - Applies all 8 D4 transformations to generated polyomino
   * - Selects lexicographically smallest as canonical
   * - Tracks seen canonical hashes to prevent duplicates
   * - Yields only if canonical form not previously seen
   *
   * **Generator Behavior:**
   * - Returns a generator (function*) not an array
   * - Yields Mask objects lazily (one at a time)
   * - Can be used with for...of loop or spread operator
   * - Suitable for processing large polyomino families
   * - Memory-efficient: doesn't store all results simultaneously
   *
   * **Performance Characteristics:**
   * - Time: O(result count × polyomino_size) for generation + canonicalization
   * - Space: O(board_size²) for board + O(result_count) for seen set
   * - Scales exponentially with cellCount (combinatorial explosion)
   * - Reasonable for cellCount <= 10
   *
   * **Known Counts (Orthogonal, Connectivity='4'):**
   * - cellCount=1: 1 polyomino
   * - cellCount=2: 1 polyomino
   * - cellCount=3: 2 polyominoes
   * - cellCount=4: 5 polyominoes
   * - cellCount=5: 12 polyominoes
   * - cellCount=6: 35 polyominoes
   * - cellCount=7: 108 polyominoes
   * - cellCount=8: 369 polyominoes
   * - cellCount=10: 4,655 polyominoes
   * - cellCount=12: 63,600 polyominoes
   *
   * **Usage Examples:**
   * ```javascript
   * const gen = new RedelmeierGenerator('4');
   *
   * // Collect all tetrominoes (5)
   * const tetrominoes = [...gen.generate(4)];
   * console.log(tetrominoes.length); // 5
   *
   * // Process each pentomino lazily
   * for (const pento of gen.generate(5)) {
   *   console.log(`Found pentomino: ${pento.width}×${pento.height}`);
   * }
   *
   * // Use with collectFromGenerator for convenience
   * const hexominoes = gen.collectAll(6); // Returns array
   * ```
   *
   * @param {number} cellCount - Number of cells in generated polyominoes (must be >= 1, typically 1-12)
   * @returns {Generator<Mask>} Generator yielding unique Mask objects in canonical form
   *   Each Mask represents a polyomino with cellCount occupied cells
   * @throws {Error} If cellCount < 1
   *
   * @see #generateRange for generating multiple sizes
   * @see #collectAll for convenient array collection
   * @see #redelmeierRecursive for the core recursive algorithm
   * @see #getCanonicalForm for canonical form computation
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
   * Generate polyominoes in a size range (inclusive).
   *
   * Generates all polyominoes with cell counts from minSize to maxSize (inclusive)
   * by calling generate() for each size in sequence. Results are yielded in order
   * of size (all minSize first, then minSize+1, etc.).
   *
   * **Ordering:**
   * - First: all polyominoes of size minSize
   * - Then: all polyominoes of size minSize+1
   * - ...
   * - Last: all polyominoes of size maxSize
   *
   * **Generator Behavior:**
   * - Returns a generator, not an array
   * - Yields lazily (one polyomino at a time)
   * - Can be used with for...of or spread operator
   * - Suitable for streaming/processing large ranges
   *
   * **Performance:**
   * - Time: Sum of times for each generate() call
   * - Space: O(1) extra (generator maintains only current state)
   * - Each size computed independently
   *
   * **Validation:**
   * - Checks minSize >= 1 and maxSize >= minSize
   * - Throws Error if constraints violated
   *
   * **Example Counts (Orthogonal):**
   * - collectAllInRange(3, 5): 2 + 5 + 12 = 19 polyominoes
   * - collectAllInRange(1, 4): 1 + 1 + 2 + 5 = 9 polyominoes
   *
   * @param {number} minSize - Minimum number of cells (must be >= 1)
   * @param {number} maxSize - Maximum number of cells (must be >= minSize)
   * @returns {Generator<Mask>} Generator yielding polyominoes from minSize to maxSize in order
   * @throws {Error} If minSize < 1 or maxSize < minSize
   *
   * @example
   * const gen = new RedelmeierGenerator('4');
   * const range = gen.generateRange(3, 5); // Triominoes through Pentominoes
   * for (const poly of range) {
   *   console.log(`Found: ${poly.width}×${poly.height}`);
   * }
   *
   * @see #generate for generating a single size
   * @see #collectAllInRange for convenient array collection
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
 * Convert canonical polyomino representation to unique string hash.
 *
 * Creates a hash string combining bitboard representation with dimensions
 * for unique identification of polyominoes. The hash format enables efficient
 * deduplication by ensuring each distinct canonical form has a unique key.
 *
 * **Hash Format:** "bits:widthxheight"
 * - bits: Bitboard value in base-36 (compact hexadecimal-like representation)
 * - width, height: Minimal bounding box dimensions
 *
 * **Example Hashes:**
 * - Monomino: "1:1x1" (single cell)
 * - Domino vertical: "3:1x2" (two cells vertically)
 * - Domino horizontal: "3:2x1" (two cells horizontally)
 * - I-tetromino: "f:1x4" or "f:4x1" depending on orientation
 *
 * **Collision Properties:**
 * - Same canonical form always produces identical hash
 * - Different canonical forms produce different hashes (injective)
 * - Used in Set<string> for O(1) lookup/insertion
 *
 * **Performance:** O(log bits) for base-36 conversion + O(1) string concatenation
 *
 * **Why Dimensions Matter:**
 * - Different bounding boxes indicate distinct polyominoes even with same bits
 * - Example: 1×4 I-tetromino vs 4×1 I-tetromino are same shape but different dimensions
 * - Including dimensions ensures uniqueness in canonical representation
 *
 * @param {bigint} polyominoBits - Bitboard representation (may be 0n for empty)
 * @param {number} width - Polyomino width in cells (must be >= 1)
 * @param {number} height - Polyomino height in cells (must be >= 1)
 * @returns {string} Unique hash string combining bits and dimensions
 *   Format: "bits:widthxheight" where bits is base-36 representation
 * @private
 */
function canonicalToString (polyominoBits, width, height) {
  return `${polyominoBits.toString(36)}:${width}x${height}`
}

/**
 * Factory functions for common connectivity types
 */

/**
 * Create a generator for orthogonal (4-connected) polyominoes.
 *
 * Cells connect via shared edges only (up, down, left, right).
 * This is the standard definition of polyominoes in combinatorics literature.
 * Generates the canonical polyominoes sequence with well-known counts.
 *
 * **Standard Counts (Orthogonal Polyominoes):**
 * - n=1: 1 monomino
 * - n=2: 1 domino
 * - n=3: 2 triominoes
 * - n=4: 5 tetrominoes
 * - n=5: 12 pentominoes
 * - n=6: 35 hexominoes
 * - n=7: 108 heptominoes
 * - n=8: 369 octominoes
 *
 * **Connectivity Pattern:**
 * - 4 neighbors per interior cell
 * - Edge cells have 2-3 neighbors
 * - Corner cells have 2 neighbors
 * - Continuous perimeter around shape
 *
 * **Applications:**
 * - Puzzle design (Tangram, Pentomino puzzles)
 * - Tiling problems
 * - Game boards (Tetris uses tetrominoes)
 * - Mathematical research (OEIS sequence A000105)
 *
 * **Performance:** Same as RedelmeierGenerator('4')
 *
 * @returns {RedelmeierGenerator} Configured RedelmeierGenerator for orthogonal polyominoes
 * @example
 * const gen = createOrthoPolyominoGenerator();
 * const tetrominoes = gen.collectAll(4);  // Array of 5 Mask objects
 * const pentominoes = gen.collectAll(5);  // Array of 12 Mask objects
 * const allSmall = gen.collectAllInRange(1, 4); // 1+1+2+5 = 9 polyominoes
 *
 * @see RedelmeierGenerator constructor for alternative connectivity modes
 * @see Mask for polyomino representation
 */
export function createOrthoPolyominoGenerator () {
  return new RedelmeierGenerator('4')
}

/**
 * Create a generator for king-connected (8-connected) polyominoes.
 *
 * Cells connect via shared edges or corners (like a chess king's moves).
 * Also called "polyking" or "king-omnomino". Generates more shapes than
 * orthogonal polyominoes due to diagonal adjacency.
 *
 * **Comparison with Orthogonal:**
 * - Orthogonal n=1: 1 vs Polyking n=1: 1 (same)
 * - Orthogonal n=2: 1 vs Polyking n=2: 2 (L-shaped diagonal)
 * - Orthogonal n=3: 2 vs Polyking n=3: 5 (more with diagonal adjacency)
 * - Orthogonal n=4: 5 vs Polyking n=4: 22 (significantly more)
 * - Orthogonal n=5: 12 vs Polyking n=5: 95+ (exponentially more)
 *
 * **Connectivity Pattern:**
 * - 8 neighbors per interior cell (4 edges + 4 corners)
 * - Edge cells have 5 neighbors
 * - Corner cells have 3 neighbors
 * - More complex adjacency patterns enable more configurations
 *
 * **Key Difference from Orthogonal:**
 * - Diagonally adjacent cells count as connected
 * - No "holes" allowed (must form connected region including diagonals)
 * - Frontier grows faster (more potential neighbor cells)
 * - Canonical forms may differ significantly (different D4 symmetries)
 *
 * **Applications:**
 * - Extended puzzle variants
 * - Computer game board generation
 * - Combinatorial research with extended connectivity
 * - Tiling with non-standard adjacency rules
 *
 * **Performance:** Similar to orthogonal but with larger frontier (8 neighbors vs 4)
 *
 * @returns {RedelmeierGenerator} Configured RedelmeierGenerator for king-connected polyominoes
 * @example
 * const gen = createKingPolyominoGenerator();
 * const kingTetrominoes = gen.collectAll(4);  // Array of 22 Mask objects
 * const kingPentominoes = gen.collectAll(5);  // Array of 95+ Mask objects
 * const allKingSmall = gen.collectAllInRange(1, 3); // 1+2+5 = 8 polykinoes
 *
 * @see RedelmeierGenerator constructor for alternative connectivity modes
 * @see Mask for polyomino representation
 */
export function createKingPolyominoGenerator () {
  return new RedelmeierGenerator('8')
}

/**
 * Create a generator for diagonal-connected polyominoes.
 *
 * Cells connect via shared diagonal corners ONLY (no edge adjacency).
 * Intermediate connectivity between orthogonal and king-connectivity.
 * Creates a distinct family of polyominoes with unique properties.
 *
 * **Connectivity Pattern:**
 * - 4 diagonal neighbors per interior cell (corners only)
 * - No orthogonal (edge) adjacency
 * - Cells must touch at corners to be connected
 * - More restrictive than king-connected, less restrictive than orthogonal in terms of connectivity patterns
 *
 * **Comparison:**
 * - Orthogonal (4-connected): Edge-only adjacency
 * - Diagonal (4diag-connected): Corner-only adjacency
 * - King-connected (8-connected): Both edges and corners
 *
 * **Unique Characteristics:**
 * - Different polyomino families from both orthogonal and king-connected
 * - Shapes may appear disconnected in orthogonal sense
 * - Different D4 symmetries compared to other connectivity modes
 * - Creates entirely new puzzle/tiling families
 *
 * **Computational Complexity:**
 * - Frontier size: 4 neighbors per cell (same as orthogonal, different positions)
 * - Total polyominoes: Often similar magnitude to orthogonal but distinct shapes
 * - Canonical forms: Completely different from orthogonal polyominoes
 *
 * **Applications:**
 * - Research into alternative adjacency definitions
 * - Specialized puzzle variants
 * - Geometric pattern exploration
 * - Polyomino taxonomy studies
 *
 * @returns {RedelmeierGenerator} Configured RedelmeierGenerator for diagonal-connected polyominoes
 * @example
 * const gen = createDiagonalPolyominoGenerator();
 * const diagTetrominoes = gen.collectAll(4);   // Diagonal-connected tetrominoes
 * const diagTriominoes = gen.collectAll(3);    // Diagonal-connected triominoes
 * const diagRange = gen.collectAllInRange(2, 4); // All sizes 2-4
 *
 * @see RedelmeierGenerator constructor for other connectivity modes
 * @see Mask for polyomino representation
 */
export function createDiagonalPolyominoGenerator () {
  return new RedelmeierGenerator('4diag')
}
