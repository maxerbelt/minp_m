import { ActionsTri } from './actionsTri.js'
import { MaskBase } from '../MaskBase.js'
import { TriangleShape } from './TriangleShape.js'

/**
 * MaskTri - Triangular grid mask implementation
 *
 * Provides bitmask operations for triangular grids with row/column coordinates.
 * Supports morphological operations (dilate, erode), coordinate conversion,
 * and grid transformations specific to triangular topology.
 */
export class MaskTri extends MaskBase {
  /**
   * Create a new triangular grid mask
   * @param {number} side - The side length of the triangle grid
   * @param {*} bits - Bit representation of the mask data (optional)
   * @param {Object} store - Bit storage implementation (optional)
   */
  constructor (side, bits, store) {
    super(TriangleShape(side), 1, bits, store)
    this.side = side
  }

  /**
   * Create a new empty MaskTri instance with the same triangle side.
   * @private
   * @returns {MaskTri} New MaskTri instance
   */
  _createMaskInstance () {
    return new MaskTri(this.side)
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create empty triangular mask of same side length
   * @returns {MaskTri} New empty mask with same dimensions
   */
  get emptyMask () {
    return new MaskTri(this.side)
  }

  /**
   * Create triangular mask with all bits set
   * @returns {MaskTri} New mask with all cells occupied
   */
  get fullMask () {
    const mask = this.emptyMask
    mask.bits = this.fullBits
    return mask
  }

  /**
   * Create triangular mask with inverted bits
   * @returns {MaskTri} New mask with inverted occupancy
   */
  get invertedMask () {
    const mask = this.emptyMask
    mask.bits = this.invertedBits
    return mask
  }

  /**
   * Create a clone of this triangular mask with the same side and stored bits
   * @returns {MaskTri} Cloned mask instance
   */
  get clone () {
    const cloned = new MaskTri(this.side, null, null)
    cloned.depth = this.depth
    cloned.store = this.store
    cloned.bits = this.store.clone(this.bits)
    return cloned
  }

  // ============================================================================
  // Row/Column Coordinate Handling
  // ============================================================================

  /**
   * Get linear index from triangle row/column coordinates
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {number} Linear index for the cell
   * @throws {Error} If coordinates are invalid for this triangle
   */
  index (r, c) {
    const i = this.indexer.index(r, c)
    if (i === undefined) {
      throw new Error(`Invalid triangle coordinates: ${r},${c}`)
    }
    return i
  }

  /**
   * Get bit position from row/column coordinates
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {number} Bit position in the store
   */
  bitPos (r, c) {
    return this.index(r, c)
  }

  // ============================================================================
  // Bit Manipulation - Triangle-specific
  // ============================================================================

  /**
   * Add bit at triangle coordinates to bits value
   * @private
   * @param {*} bb - Current bits value
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {*} Updated bits value with bit set
   */
  addBit (bb, r, c) {
    const i = this._getBitMaskAtCoords(r, c)
    return bb | i
  }

  /**
   * Get bit mask for triangle at row/column coordinates
   * @private
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {*} Bit mask for the coordinate
   */
  _getBitMaskAtCoords (r, c) {
    const i = this.bitPos(r, c)
    return this._getBitMaskAtIndex(i)
  }

  /**
   * Get bit mask for triangle at index (internal helper)
   * @private
   * @param {number} i - Linear index
   * @returns {*} Bit mask for the index
   */
  _getBitMaskAtIndex (i) {
    return this.store.bitMaskByPos(this.store.bitPos(i))
  }

  /**
   * Set cell value at triangle coordinates
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {number} [color=1] - Value to set
   * @returns {*} Updated bits value
   */
  set (r, c, color = 1) {
    const loc = this.for(r, c)
    this.bits = loc.set(color)
    return this.bits
  }

  /**
   * Set cell by store index (internal helper)
   * @private
   * @param {number} i - Linear index
   * @param {number} [color=1] - Value to set
   * @returns {*} Updated bits value
   */
  setIndex (i, color = 1) {
    const bitPosition = this.store.bitPos(i)
    const cellMask = this.store.cellMask << bitPosition
    const colorMask = this.store.setMask(bitPosition, color)
    this.bits = (this.bits & ~cellMask) | colorMask
    return this.bits
  }

  // ============================================================================
  // Triangle-specific morphological operations
  // ============================================================================

  /**
   * Add all valid neighbor cells to bits using a neighbor selector.
   * @private
   * @param {*} bits - Current bits value
   * @param {function(number, number): Iterable<Array<number>>} neighborSelector - Returns neighbors for a coordinate
   * @returns {*} Updated bits value with neighbors added
   */
  _expandBitsWithNeighbors (bits, neighborSelector) {
    let nextBits = bits
    for (const [r, c] of this.indexer.bitKeys(bits)) {
      for (const [nr, nc] of neighborSelector.call(this.indexer, r, c)) {
        if (!this.indexer.isValid(nr, nc)) continue
        const idx = this.indexer.index(nr, nc)
        nextBits = this.store.addBit(nextBits, idx)
      }
    }
    return nextBits
  }

  /**
   * Expand set bits by triangle connectivity radius
   * @param {number} [radius=1] - Radius for dilation
   * @returns {*} Dilated bits value
   */
  dilateBits (radius = 1) {
    let bits = this.bits
    for (let step = 0; step < radius; step++) {
      bits = this._expandBitsWithNeighbors(bits, this.indexer.neighbors)
    }
    return bits
  }

  /**
   * Shrink set bits by triangle connectivity radius
   * @param {number} [radius=1] - Radius for erosion
   * @returns {*} Eroded bits value
   */
  erodeBits (radius = 1) {
    let bits = this.bits
    for (let step = 0; step < radius; step++) {
      let nextBits = this.store.empty
      for (const [r, c, idx] of this.indexer.bitKeys(bits)) {
        const neighbors = this.indexer.neighbors(r, c)
        let survives = true
        for (const [nr, nc] of neighbors) {
          if (!this.indexer.isValid(nr, nc) || !this.test(nr, nc)) {
            survives = false
            break
          }
        }
        if (survives) {
          nextBits = this.store.addBit(nextBits, idx)
        }
      }
      bits = nextBits
    }
    return bits
  }

  /**
   * Cross dilation on triangle grid expands only edge-adjacent neighbors
   * @returns {*} Cross-dilated bits value
   */
  dilateCrossBits () {
    return this._expandBitsWithNeighbors(this.bits, this.indexer.neighborsEdge)
  }

  /**
   * Dilate the mask by expanding set bits
   * @param {number} [radius=1] - Expansion radius
   * @returns {MaskTri} This instance for chaining
   */
  dilate (radius = 1) {
    this.bits = this.dilateBits(radius)
    return this
  }

  /**
   * Erode the mask by shrinking set bits
   * @param {number} [radius=1] - Erosion radius
   * @returns {MaskTri} This instance for chaining
   */
  erode (radius = 1) {
    this.bits = this.erodeBits(radius)
    return this
  }

  /**
   * Cross dilate the mask
   * @returns {MaskTri} This instance for chaining
   */
  dilateCross () {
    this.bits = this.dilateCrossBits()
    return this
  }

  // ============================================================================
  // Cell Access - at, test, clear
  // ============================================================================

  /**
   * Get cell value at triangle coordinates
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {*} Cell value at the coordinates
   */
  at (r, c) {
    return this.for(r, c).at()
  }

  /**
   * Test if cell at triangle coordinates matches color
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {number} [color=1] - Color value to test for
   * @returns {boolean} True if cell matches the color
   */
  test (r, c, color = 1) {
    return this.for(r, c).test(color)
  }

  /**
   * Clear (zero out) cell at triangle coordinates
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {*} Updated bits value
   */
  clear (r, c) {
    return this.set(r, c, 0)
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Get cached actions instance for transformations
   * @returns {ActionsTri} Actions instance for this mask
   */
  get actions () {
    if (this._actions && this._actions?.original?.bits === this.bits) {
      return this._actions
    }
    this._actions = new ActionsTri(this.side, this)
    return this._actions
  }

  // ============================================================================
  // Iteration
  // ============================================================================

  // ============================================================================
  // Iteration
  // ============================================================================

  /**
   * Iterate over [r, c, index] tuples for all cells
   * @yields {Array<number>} [row, col, index] for each cell
   */
  *keys () {
    const n = this.indexer.size
    for (let i = 0; i < n; i++) {
      const [r, c] = this._getLocationAtIndex(i)
      yield [r, c, i]
    }
  }

  /**
   * Iterate over [r, c, value, index, mask] tuples for all cells
   * @yields {Array} [row, col, value, index, mask] for each cell
   */
  *entries () {
    for (const [r, c, i] of this.keys()) {
      yield [r, c, this.at(r, c), i, this]
    }
  }

  /**
   * Iterate over values of all cells
   * @yields {*} Value of each cell
   */
  *values () {
    for (const [r, c] of this.keys()) {
      yield this.at(r, c)
    }
  }

  /**
   * Iterate over indices of set bits
   * @yields {number} Index of each set bit
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.bits)
  }

  /**
   * Iterate over [r, c] coordinates of set bits
   * @yields {Array<number>} [row, col] coordinates of set cells
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.bits)
  }

  /**
   * Get row/column coordinates for index
   * @private
   * @param {number} i - Linear index
   * @returns {Array<number>} [row, col] coordinates
   */
  _getLocationAtIndex (i) {
    return this.indexer.location(i)
  }

  // ============================================================================
  // Clone / Factory Methods
  // ============================================================================

  // ============================================================================
  // Coordinate Conversion
  // ============================================================================

  /**
   * Load coordinates into this mask
   * @param {Array<Array<number>>} coords - Array of [r, c] or [r, c, value] coordinates
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Get all occupied cells as [r, c] coordinate pairs
   * @returns {Array<Array<number>>} Array of [row, col] coordinates
   */
  get toCoords () {
    return this._coords.bitsToCoordinates().map(a => a.slice(0, 2))
  }

  // ============================================================================
  // Normalization
  // ============================================================================

  /**
   * Get normalized bits with minimum coordinates at (0, 0)
   * Useful for canonical representation and comparison
   * @private
   */
  normalized () {
    const cells = this._extractSetCells()
    const minCoords = this._findMinimumCoordinates(cells)
    return this._createNormalizedBits(cells, minCoords)
  }

  /**
   * Extract all set cells as [r, c] coordinates
   * @private
   */
  _extractSetCells () {
    return [...this.bitKeys()].map(([r, c]) => [r, c])
  }

  /**
   * Find minimum r, c values across cells
   * @private
   */
  _findMinimumCoordinates (cells) {
    if (cells.length === 0) return { minR: 0, minC: 0 }
    return {
      minR: Math.min(...cells.map(c => c[0])),
      minC: Math.min(...cells.map(c => c[1]))
    }
  }

  /**
   * Create bits with normalized coordinates
   * @private
   */
  _createNormalizedBits (cells, { minR, minC }) {
    let normalizedBits = 0n
    for (const [r, c] of cells) {
      const nr = r - minR
      const nc = c - minC
      normalizedBits |= 1n << this.index(nr, nc)
    }
    return normalizedBits
  }

  // ============================================================================
  // Edge Masks & Boundary Detection
  // ============================================================================

  /**
   * Get edge masks for morph operations on triangle grid
   * Triangular grids have varying row lengths; marks edges at triangle borders
   * Returns {left, right, top, bottom, notLeft, notRight, notTop, notBottom}
   * @private
   */
  edgeMasks () {
    const st = this.store
    if (!st) {
      return this._getDefaultEdgeMasks()
    }

    const full = st.fullBits
    const edges = this._createEdgeMasks(st)
    return this._invertEdgeMasks(st, full, edges)
  }

  /**
   * Create default edge masks when store not available
   * @private
   */
  _getDefaultEdgeMasks () {
    return {
      left: 0n,
      right: 0n,
      top: 0n,
      bottom: 0n,
      notLeft: ~0n,
      notRight: ~0n,
      notTop: ~0n,
      notBottom: ~0n
    }
  }

  /**
   * Create left, right, top, bottom edge masks for triangle grid
   * Iterates all cells and marks appropriate edges based on position
   * @private
   */
  _createEdgeMasks (st) {
    let left = st.empty
    let right = st.empty
    let top = st.empty
    let bottom = st.empty

    for (const [r, c] of this.indexer.allRClocations()) {
      const i = this.index(r, c)

      // Check each edge condition and add bit if true
      if (c === 0) left = st.addBit(left, i)
      if (c === 2 * r) right = st.addBit(right, i)
      if (r === 0) top = st.addBit(top, i)
      if (r === this.side - 1) bottom = st.addBit(bottom, i)
    }

    return { left, right, top, bottom }
  }

  /**
   * Compute inverted edge masks (notEdge = !edge)
   * @private
   */
  _invertEdgeMasks (st, full, { left, right, top, bottom }) {
    return {
      left,
      right,
      top,
      bottom,
      notLeft: st.clearBits(full, left),
      notRight: st.clearBits(full, right),
      notTop: st.clearBits(full, top),
      notBottom: st.clearBits(full, bottom)
    }
  }

  // ============================================================================
  // Factory Methods - Static
  // ============================================================================

  /**
   * Create triangle mask from coordinate array
   */
  static fromCoords (side, coords) {
    const mask = new MaskTri(side)
    mask.fromCoords(coords)
    return mask
  }
}
