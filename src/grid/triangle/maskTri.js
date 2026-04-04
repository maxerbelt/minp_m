import { ActionsTri } from './actionsTri.js'
import { MaskBase } from '../MaskBase.js'
import { ShapeEnum } from '../shapeEnum.js'

export class MaskTri extends MaskBase {
  constructor (side, bits, store) {
    super(ShapeEnum.triangle(side), 1, bits, store)
    this.side = side
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create empty triangular mask of same side
   */
  get emptyMask () {
    return new MaskTri(this.side)
  }

  /**
   * Create triangular mask with all bits set
   */
  get fullMask () {
    const mask = this.emptyMask
    mask.bits = this.fullBits
    return mask
  }

  /**
   * Create triangular mask with inverted bits
   */
  get invertedMask () {
    const mask = this.emptyMask
    mask.bits = this.invertedBits
    return mask
  }

  // ============================================================================
  // Row/Column Coordinate Handling
  // ============================================================================

  /**
   * Get index from triangle coordinates (r, c)
   * @throws Error if coordinates invalid
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
   */
  addBit (bb, r, c) {
    const i = this._getBitMaskAtCoords(r, c)
    return bb | i
  }

  /**
   * Get bit mask for triangle at row/column coordinates
   * @private
   */
  _getBitMaskAtCoords (r, c) {
    const i = this.bitPos(r, c)
    return this._getBitMaskAtIndex(i)
  }

  /**
   * Get bit mask for triangle at index (internal helper)
   * @private
   */
  _getBitMaskAtIndex (i) {
    return this.store.bitMaskByPos(this.store.bitPos(i))
  }

  /**
   * Set cell at triangle coordinates with optional color
   */
  set (r, c, color = 1) {
    const loc = this.for(r, c)
    this.bits = loc.set(color)
    return this.bits
  }

  /**
   * Set cell by store index (internal helper)
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
   * Get cell value at triangle coordinates
   */
  at (r, c) {
    return this.for(r, c).at()
  }

  /**
   * Test if cell at triangle coordinates matches color
   */
  test (r, c, color = 1) {
    return this.for(r, c).test(color)
  }

  /**
   * Clear (zero out) cell at triangle coordinates
   */
  clear (r, c) {
    return this.set(r, c, 0)
  }

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Get cached actions instance or create new one
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

  /**
   * Iterate over [r, c, index] tuples for all cells
   * Uses indexer.location to iterate without explicit row/col map
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
   */
  *entries () {
    for (const [r, c, i] of this.keys()) {
      yield [r, c, this.at(r, c), i, this]
    }
  }

  /**
   * Iterate over values of all cells
   */
  *values () {
    for (const [r, c] of this.keys()) {
      yield this.at(r, c)
    }
  }

  /**
   * Iterate over indices of set bits
   */
  *bitsIndices () {
    yield* this.indexer.bitsIndices(this.bits)
  }

  /**
   * Iterate over [r, c] coordinates of set bits
   */
  *bitKeys () {
    yield* this.indexer.bitKeys(this.bits)
  }

  /**
   * Get row/column coordinates for index
   * @private
   */
  _getLocationAtIndex (i) {
    return this.indexer.location(i)
  }

  // ============================================================================
  // Coordinate Conversion
  // ============================================================================

  /**
   * Load coordinates into this mask
   */
  fromCoords (coords) {
    this._coords.fromCoordinates(coords)
  }

  /**
   * Get all occupied cells as [r, c] coordinate pairs
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

    for (const [r, c] of this.indexer.cells()) {
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
