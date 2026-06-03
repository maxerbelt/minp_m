import { ActionsHex } from './actionHex.js'
import { MaskBase } from '../MaskBase.js'
import { HexagonShape } from './HexagonShape.js'
import { ForLocation } from '../ForLocation.js'

/**
 * @typedef {Object} CubeCoordinates
 * @property {number} q - Q coordinate in cube coordinate system
 * @property {number} r - R coordinate in cube coordinate system
 * @property {number} s - S coordinate in cube coordinate system (often computed as -q-r)
 */

/**
 * @typedef {Object} MinimumCoordinates
 * @property {number} minQ - Minimum Q coordinate
 * @property {number} minR - Minimum R coordinate
 * @property {number} minS - Minimum S coordinate
 */

/**
 * MaskHex - Hexagonal grid mask implementation
 *
 * Provides bitmask operations for hexagonal grids using cube coordinates (q, r, s).
 * Supports morphological operations (dilate, erode), coordinate conversion,
 * and grid transformations specific to hexagonal topology.
 *
 * Uses cube coordinates as the canonical representation for hexagonal cells,
 * where q + r + s = 0 is maintained as an invariant. This enables efficient
 * neighbor calculations and symmetrical transformations.
 *
 * @extends MaskBase
 * @class MaskHex
 */
export class MaskHex extends MaskBase {
  /**
   * Create a new hexagonal grid mask with given radius and optional state.
   *
   * Initializes a hexagonal grid mask using cube coordinates. The radius
   * defines the distance from the center cell to the edge of the hexagon.
   * Automatically creates a HexagonShape and passes it to MaskBase.
   *
   * @param {number} radius - Hexagon radius (distance from center to edge)
   * @param {bigint} [bits] - Bitboard representation of the mask data (optional)
   * @param {Object} [store] - Bit storage backend implementation (optional, defaults to StoreBig)
   *
   * @example
   * const mask = new MaskHex(5); // Create 5-radius hexagon
   * const cloned = new MaskHex(5, bits, store); // Create with existing state
   */
  constructor (radius, bits, store) {
    super(HexagonShape(radius), bits, store)
    this.radius = radius
  }

  // ============================================================================
  // Clone & Factory Methods
  // ============================================================================

  /**
   * Create a deep clone of this hex mask with same radius and depth.
   *
   * Copies the radius, depth, and bitboard data, creating a new independent
   * mask instance with identical state. The store backend is shared for efficiency.
   *
   * @returns {MaskHex} Independently cloned mask instance with same dimensions
   */
  get clone () {
    const cloned = new MaskHex(this.radius, null, null)
    cloned.depth = this.depth
    cloned.bits = this.store.clone(this.bits)
    cloned.store = this.store
    return cloned
  }

  /**
   * Create a new empty hex mask with the same radius.
   *
   * Creates a new mask instance with all cells cleared (bits set to 0).
   * Useful for creating a blank canvas for subsequent operations.
   *
   * @returns {MaskHex} New empty mask with same radius as this instance
   */
  get emptyMask () {
    return new MaskHex(this.radius)
  }

  /**
   * Create a new hex mask with all cells set.
   *
   * Creates a new mask instance with all cells occupied (all bits set to 1).
   * Represents the fully-filled hexagonal region.
   *
   * @returns {MaskHex} New fully-occupied mask with same radius
   */
  get fullMask () {
    const mask = this.emptyMask
    mask.bits = this.fullBits
    return mask
  }

  /**
   * Create a new hex mask with inverted occupancy.
   *
   * Creates a new mask instance where all cell states are flipped:
   * empty cells become occupied and occupied cells become empty.
   * Useful for complement operations and region calculations.
   *
   * @returns {MaskHex} New mask with all bits inverted
   */
  get invertedMask () {
    const mask = this.emptyMask
    mask.bits = this.invertedBits
    return mask
  }

  // ============================================================================
  // Cube Coordinate Handling
  // ============================================================================

  /**
   * Get the linear array index for a cell at given cube coordinates.
   *
   * Converts hexagonal cube coordinates (q, r, s) into a linear index
   * suitable for bitboard operations. Validates that the coordinates
   * are within the valid hexagon bounds.
   *
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} s - S coordinate in cube system (should satisfy q+r+s=0)
   * @returns {number} Linear cell index (0-based)
   * @throws {Error} If cube coordinates are outside the hexagon bounds
   *
   * @example
   * const idx = mask.index(0, 0, 0); // Center cell (always 0 for origin)
   * const idx2 = mask.index(1, 0, -1); // Adjacent cell
   */
  index (q, r, s) {
    const i = this.indexer.index(q, r, s)
    if (i === undefined) {
      throw new Error(`Invalid cube coordinates: ${q},${r},${s}`)
    }
    return i
  }

  /**
   * Get the bit position (same as linear index) for cube coordinates.
   *
   * Wrapper around index() that returns the bit position within storage.
   * For hexagonal grids, this is typically equivalent to the linear index.
   *
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} s - S coordinate in cube system
   * @returns {number} Bit position for store operations
   * @throws {Error} If coordinates are invalid
   */
  bitPos (q, r, s) {
    return this.index(q, r, s)
  }

  /**
   * Create a ForLocation helper for cell access at cube coordinates.
   *
   * Encapsulates the bit position and provides a convenient accessor
   * for reading/writing cell values at the specified location.
   * Automatically computes s from q and r if omitted (s = -q - r).
   *
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} [s] - S coordinate (optional, computed if omitted)
   * @returns {ForLocation} Location accessor for this cell
   * @throws {Error} If coordinates are invalid
   * @private
   *
   * @example
   * const loc = this.for(0, 1, -1);
   * const value = loc.readCellValue();
   */
  for (q, r, s) {
    if (s == null) {
      s = -(q + r)
    }
    const pos = this.bitPos(q, r, s)
    return new ForLocation(pos, this.bits, this.store)
  }

  // ============================================================================
  // Bit Manipulation - Hex-specific
  // ============================================================================

  /**
   * Add (OR) a bit at cube coordinates into the given bits value.
   *
   * Computes the bit mask for the cell and ORs it into the provided bits,
   * setting the bit at the specified coordinates to 1.
   *
   * @param {bigint} bb - Current bits value to modify
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} s - S coordinate in cube system
   * @returns {bigint} Updated bits value with bit set at coordinates
   * @private
   */
  addBit (bb, q, r, s) {
    const i = this._getBitMaskAtCoords(q, r, s)
    return bb | i
  }

  /**
   * Get the bit mask for a hexagonal cell at cube coordinates.
   *
   * Creates a bit mask with a single bit set at the position
   * corresponding to the given cube coordinates.
   *
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} s - S coordinate in cube system
   * @returns {bigint} Bit mask with single bit set at position
   * @private
   */
  _getBitMaskAtCoords (q, r, s) {
    const i = this.bitPos(q, r, s)
    return this._getBitMaskAtIndex(i)
  }

  /**
   * Get the bit mask for a hexagonal cell at a linear index.
   *
   * Computes the bit position and creates a mask with a single bit set
   * at that position in the storage representation.
   *
   * @param {number} i - Linear cell index
   * @returns {bigint} Bit mask with single bit set at index position
   * @private
   */
  _getBitMaskAtIndex (i) {
    return this.store.bitMaskByPos(this.store.bitPos(i))
  }

  /**
   * Set a cell value at cube coordinates with optional color.
   *
   * Writes a color value to the specified cell, updating this.bits.
   * Automatically computes s from q and r if omitted.
   * Returns the updated bits for method chaining.
   *
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} [s] - S coordinate (optional, computed if omitted)
   * @param {number} [color=1] - Color value to write (0-3 depending on depth)
   * @returns {bigint} Updated bits value after write
   *
   * @example
   * mask.set(0, 1, -1, 2); // Set cell to color 2
   * mask.set(1, 0, -1); // Set cell to default color 1
   */
  set (q, r, s, color = 1) {
    if (s == null) {
      s = -(q + r)
    }
    const loc = this.for(q, r, s)
    this.bits = loc.set(color)
    return this.bits
  }

  /**
   * Set a cell value at linear index with optional color (internal helper).
   *
   * Low-level method for setting a cell value using linear array index
   * instead of cube coordinates. Directly manipulates store bits.
   *
   * @param {number} i - Linear cell index
   * @param {number} [color=1] - Color value to write
   * @returns {bigint} Updated bits value after write
   * @private
   */
  setIndex (i, color = 1) {
    const bitPosition = this.store.bitPos(i)
    const cellMask = this.store.cellMask << bitPosition
    const colorMask = this.store.setMask(bitPosition, color)
    this.bits = (this.bits & ~cellMask) | colorMask
    return this.bits
  }

  // ============================================================================
  // Cell Access - at, test, clear
  // ============================================================================

  /**
   * Get cell value at cube coordinates.
   *
   * Reads the color value stored at the specified cell location.
   * Returns the numeric color value (0 for empty, 1+ for occupied).
   *
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} [s] - S coordinate (optional, computed if omitted)
   * @returns {number} Cell color value at the coordinates (0+)
   *
   * @example
   * const color = mask.at(0, 1, -1); // Get cell color
   */
  at (q, r, s) {
    return this.for(q, r, s).readCellValue()
  }

  /**
   * Test if cell at cube coordinates matches a specific color.
   *
   * Checks whether the cell at the given coordinates contains the specified
   * color value. Provides a semantic wrapper around readCellValue() === color.
   *
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} [s] - S coordinate (optional, computed if omitted)
   * @param {number} [color=1] - Expected color value to test for
   * @returns {boolean} True if cell contains the specified color
   *
   * @example
   * if (mask.test(0, 1, -1, 2)) { // Check if cell is color 2
   *   console.log('Cell matches');
   * }
   */
  test (q, r, s, color = 1) {
    return this.for(q, r, s).hasColor(color)
  }

  /**
   * Clear (set to 0) a cell at cube coordinates.
   *
   * Sets the cell value to 0 (empty state). Equivalent to set(q, r, s, 0).
   * Useful for marking cells as unoccupied.
   *
   * @param {number} q - Q coordinate in cube system
   * @param {number} r - R coordinate in cube system
   * @param {number} [s] - S coordinate (optional, computed if omitted)
   * @returns {bigint} Updated bits value after clear
   *
   * @example
   * mask.clear(0, 1, -1); // Empty the cell
   */
  clear (q, r, s) {
    return this.set(q, r, s, 0)
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Get or create a cached actions instance for grid transformations.
   *
   * Returns a cached ActionsHex instance if one exists and is still valid
   * (i.e., wraps the current bits state). Otherwise creates a new instance.
   * This enables efficient reuse of transformation objects across multiple
   * operations without invalidating the cache.
   *
   * @returns {ActionsHex} Actions transformer instance for this mask
   */
  get actions () {
    if (this._actions && this._actions?.original?.bits === this.bits) {
      return this._actions
    }
    this._actions = new ActionsHex(this.radius, this)
    return this._actions
  }

  // ============================================================================
  // Iteration
  // ============================================================================

  /**
   * Iterate over cube coordinate tuples for all cells in the grid.
   *
   * Yields [q, r, s, index] for each cell, including both occupied and empty cells.
   * Provides convenient iteration over all hexagonal positions.
   *
   * @generator
   * @yields {Array<number>} [q, r, s, linearIndex] for each cell
   *
   * @example
   * for (const [q, r, s, idx] of mask.keys()) {
   *   console.log(`Cell at (${q},${r},${s}) has index ${idx}`);
   * }
   */
  *keys () {
    for (const [q, r, s, i] of this._allCellCoordinates()) {
      yield [q, r, s, i]
    }
  }

  /**
   * Iterate over complete cell information tuples for all cells.
   *
   * Yields [q, r, s, value, index, mask] for each cell, providing complete
   * information including position, color value, array index, and reference
   * to this mask instance.
   *
   * @generator
   * @yields {Array} [q, r, s, colorValue, linearIndex, this] for each cell
   *
   * @example
   * for (const [q, r, s, color, idx, mask] of mask.entries()) {
   *   if (color > 0) console.log(`Occupied cell at (${q},${r},${s})`);
   * }
   */
  *entries () {
    for (const [q, r, s, i] of this._allCellCoordinates()) {
      yield [q, r, s, this.at(q, r, s), i, this]
    }
  }

  /**
   * Iterate over color values of all cells in the grid.
   *
   * Yields the color value for each cell in row-major order.
   * Returns 0 for empty cells and 1+ for occupied cells depending on depth.
   *
   * @generator
   * @yields {number} Color value of each cell (0 for empty, 1+ for occupied)
   *
   * @example
   * const occupiedCount = [...mask.values()].filter(v => v > 0).length;
   */
  *values () {
    for (const [q, r, s] of this._allCellCoordinates()) {
      yield this.at(q, r, s)
    }
  }

  /**
   * Iterate over linear indices of all set (occupied) cells.
   *
   * Yields the linear array index for each cell that contains a non-zero value.
   * Delegates to the indexer for efficient iteration over set bits.
   *
   * @generator
   * @yields {number} Linear index of each occupied cell
   *
   * @example
   * for (const idx of mask.bitsIndices()) {
   *   console.log(`Occupied cell at index ${idx}`);
   * }
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.bits)
  }

  /**
   * Iterate over cube coordinates of all occupied cells.
   *
   * Yields [q, r, s] coordinate arrays for each cell that contains a non-zero value.
   * Provides semantic alternative to bitsIndices() for coordinate-based iteration.
   *
   * @generator
   * @yields {Array<number>} [q, r, s] coordinates of each occupied cell
   *
   * @example
   * for (const [q, r, s] of mask.bitKeys()) {
   *   console.log(`Occupied cell at cube coords (${q},${r},${s})`);
   * }
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.bits)
  }

  /**
   * Parse a cube coordinate string into an array of numbers.
   *
   * Converts comma-separated coordinate strings (e.g., "0,1,-1") into
   * numeric arrays for coordinate operations. Internal helper used by
   * iteration methods.
   *
   * @param {string} loc - Comma-separated coordinate string ("q,r,s")
   * @returns {number[]} Parsed [q, r, s] coordinates as numbers
   * @private
   *
   * @example
   * const coords = this._parseCubeCoordinates("0,1,-1"); // [0, 1, -1]
   */
  _parseCubeCoordinates (loc) {
    return loc.split(',').map(Number)
  }

  /**
   * Iterate over all cell coordinates with their linear indices (internal).
   *
   * Generator that yields [q, r, s, index] tuples for every cell in the hexagon,
   * including both occupied and empty cells. Delegates to the indexer's
   * coordinate mapping.
   *
   * @generator
   * @yields {Array<number>} [q, r, s, linearIndex] for each cell
   * @private
   */
  *_allCellCoordinates () {
    for (const [loc, i] of this.indexer.qrsToI) {
      const [q, r, s] = this._parseCubeCoordinates(loc)
      yield [q, r, s, i]
    }
  }

  // ============================================================================
  // Coordinate Conversion
  // ============================================================================

  /**
   * Load cube coordinates into this mask, optionally with values.
   *
   * Populates the mask from an array of coordinate tuples. Each tuple
   * can be either [q, r, s] (sets color to 1) or [q, r, s, color]
   * (sets specified color). Delegates to CoordinateConversion helper.
   *
   * @param {Array<Array<number>>} coords - Array of coordinate tuples
   *   - [q, r, s] sets color 1
   *   - [q, r, s, color] sets specified color
   *
   * @example
   * mask.fromCoords([[0, 0, 0], [1, 0, -1, 2]]); // Set cells
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Get all occupied cells as cube coordinate tuples.
   *
   * Extracts the cube coordinates of all cells with non-zero values,
   * returning them as an array of [q, r, s] tuples. Inverse of fromCoords().
   *
   * @returns {Array<Array<number>>} Array of [q, r, s] coordinates for set cells
   *
   * @example
   * const occupied = mask.toCoords(); // Get all occupied cell positions
   */
  get toCoords () {
    return this._coords.bitsToCoordinates()
  }

  // ============================================================================
  // Normalization
  // ============================================================================

  /**
   * Get normalized bits with minimum coordinates translated to (0, 0, 0).
   *
   * Computes a canonical representation by translating all coordinates
   * so that the minimum q, r, s values become 0. Useful for shape
   * comparison and canonical representation independent of position.
   *
   * @returns {bigint} Normalized bitboard with shape translated to origin
   * @private
   */
  normalized () {
    const cells = this._extractSetCells()
    const minCoords = this._findMinimumCoordinates(cells)
    return this._createNormalizedBits(cells, minCoords)
  }

  /**
   * Extract all occupied cells as [q, r, s] coordinate arrays (internal).
   *
   * Collects the cube coordinates of all non-zero cells into an array
   * suitable for normalization operations.
   *
   * @returns {Array<Array<number>>} Array of [q, r, s] for occupied cells
   * @private
   */
  _extractSetCells () {
    return [...this.bitKeys()].map(([q, r, s]) => [q, r, s])
  }

  /**
   * Find minimum q, r, s coordinate values across all cells (internal).
   *
   * Computes the bounding box minimum coordinates by finding the smallest
   * q, r, and s values across all cell positions.
   *
   * @param {Array<Array<number>>} cells - Array of [q, r, s] coordinate tuples
   * @returns {MinimumCoordinates} Object with minQ, minR, minS properties
   * @private
   */
  _findMinimumCoordinates (cells) {
    if (cells.length === 0) return { minQ: 0, minR: 0, minS: 0 }
    return {
      minQ: Math.min(...cells.map(c => c[0])),
      minR: Math.min(...cells.map(c => c[1])),
      minS: Math.min(...cells.map(c => c[2]))
    }
  }

  /**
   * Create normalized bitboard from cells and minimum coordinates (internal).
   *
   * Translates all coordinates by subtracting the minimum values, then
   * creates a new bitboard with the translated cell positions. Used by
   * normalized() to produce a canonical shape representation.
   *
   * @param {Array<Array<number>>} cells - Array of [q, r, s] coordinates
   * @param {MinimumCoordinates} minCoords - Minimum q, r, s values
   * @returns {bigint} Normalized bitboard with origin at (0, 0, 0)
   * @private
   */
  _createNormalizedBits (cells, { minQ, minR, minS }) {
    let normalizedBits = 0n
    for (const [q, r, s] of cells) {
      const nq = q - minQ
      const nr = r - minR
      const ns = s - minS
      normalizedBits |= 1n << this.index(nq, nr, ns)
    }
    return normalizedBits
  }

  // ============================================================================
  // Morphological Operations
  // ============================================================================

  /**
   * Expand occupied cells by a given radius (dilation).
   *
   * Performs morphological dilation using the hexagonal distance metric.
   * All cells within the specified radius of any occupied cell become occupied.
   * Mutates this.bits and returns this for method chaining.
   *
   * @param {number} [radius=1] - Expansion radius in hexagonal distance
   * @returns {MaskHex} This instance for method chaining
   * @throws {Error} If indexer lacks dilate method
   *
   * @example
   * mask.dilate(2); // Expand all occupied regions by 2 cells
   */
  dilate (radius = 1) {
    this._assertIndexerHasMethod('dilate')
    this.bits = this.indexer.dilate(this.bits, radius, this.store)
    return this
  }

  /**
   * Shrink occupied cells by a given radius (erosion).
   *
   * Performs morphological erosion using the hexagonal distance metric.
   * Only cells with all neighbors within the radius occupied remain occupied.
   * Mutates this.bits and returns this for method chaining.
   *
   * @param {number} [radius=1] - Erosion radius in hexagonal distance
   * @returns {MaskHex} This instance for method chaining
   * @throws {Error} If indexer lacks erode method
   *
   * @example
   * mask.erode(1); // Remove boundary cells from all regions
   */
  erode (radius = 1) {
    this._assertIndexerHasMethod('erode')
    this.bits = this.indexer.erode(this.bits, radius, this.store)
    return this
  }

  /**
   * Expand occupied cells in cardinal directions only (cross dilation).
   *
   * For hexagonal grids, this is approximated as a standard dilation
   * since hex grids don't have a traditional cardinal-only pattern.
   * The radius parameter is accepted for API compatibility but uses 1.
   * Mutates this.bits and returns this for method chaining.
   *
   * @param {number} [radius=1] - Expansion radius (parameter kept for API compatibility)
   * @returns {MaskHex} This instance for method chaining
   *
   * @example
   * mask.dilateCross(); // Cardinal-only expansion (same as dilate for hex)
   */
  dilateCross (radius = 1) {
    return this.dilate(radius)
  }

  /**
   * Assert that the indexer has a required method (internal validation).
   *
   * Verifies that the hexagon indexer supports a specific operation method.
   * Throws an error if the method is missing, preventing silent failures
   * in morphological operations.
   *
   * @param {string} methodName - Name of the required method (e.g., 'dilate')
   * @throws {Error} If the indexer lacks the specified method
   * @private
   */
  _assertIndexerHasMethod (methodName) {
    if (!this.indexer[methodName]) {
      throw new Error(`Indexer missing ${methodName} method`)
    }
  }

  // ============================================================================
  // Edge Detection
  // ============================================================================

  /**
   * Get edge masks for the hexagonal grid (returns null).
   *
   * Hex grids don't have rectangular edges like rectangular grids.
   * Returns null to signal that rectangular edge detection doesn't apply.
   * Subclasses or consumers can provide fallback logic when null is returned.
   *
   * @returns {null} Always returns null for hexagonal grids
   * @private
   */
  edgeMasks () {
    return null
  }

  // ============================================================================
  // Factory Methods - Static
  // ============================================================================

  /**
   * Create a new hex mask from cube coordinate tuples (static factory).
   *
   * Factory method for conveniently creating a hex mask initialized with
   * the given coordinate data. Equivalent to:
   * ```
   * const mask = new MaskHex(radius);
   * mask.fromCoords(coords);
   * return mask;
   * ```
   *
   * @static
   * @param {number} radius - Hexagon radius
   * @param {Array<Array<number>>} coords - Array of [q, r, s] or [q, r, s, color] tuples
   * @returns {MaskHex} New hex mask initialized with the given coordinates
   *
   * @example
   * const mask = MaskHex.fromCoords(5, [[0, 0, 0], [1, 0, -1]]);
   */
  static fromCoords (radius, coords) {
    const mask = new MaskHex(radius)
    mask.fromCoords(coords)
    return mask
  }
}
