/**
 * @module BorderRegions
 * @description Encapsulates border and region analysis operations on masks.
 * Organizes spatial concepts into nested regions: outer border, outer area (beyond border),
 * inner border (erosion), and inner area (core). Provides both bit-level and mask-level
 * access to border and region queries. Essential for morphological analysis and spatial reasoning.
 */

/**
 * @typedef {Object} MaskInstance
 * @description A mask instance representing a set of grid coordinates with associated values
 * @property {Object} store - Bit store backend (BigInt-based storage with operations)
 * @property {Function} store.bitSub - Bitwise SUB operation: (bits1, bits2) => bigint
 * @property {Function} store.bitSub3 - Three-way bitwise SUB: (bits1, bits2, bits3) => bigint
 * @property {Function} store.isBitSet - Check if bit is set: (bits, index) => boolean
 * @property {bigint} fullBits - Full grid bit pattern (all cells occupied)
 * @property {bigint} bits - Current bit pattern
 * @property {Function} dilateBits - Dilate by n steps: (n) => bigint
 * @property {Function} erodeBits - Erode by n steps: (n) => bigint
 * @property {Function} index - Convert coordinates to bit index: (x, y) => number
 * @property {Object} emptyMask - Reference to empty mask instance (factory for new masks)
 */

/**
 * BorderRegions - Spatial region and border analysis on masks.
 * Organizes mask space into nested regions defined by morphological operations:
 *   1. Outer border: cells outside the mask but adjacent to it (dilation boundary)
 *   2. Outer area: all cells beyond the outer border
 *   3. Inner border: cells inside the mask but adjacent to empty space (erosion boundary)
 *   4. Inner area: core cells of the mask (stable interior)
 * @class BorderRegions
 * @description Spatial region and border analysis on masks
 * @public
 */
export class BorderRegions {
  /**
   * Constructor - Initialize border analysis for a mask.
   *
   * Sets up the BorderRegions facade around a specific mask instance,
   * caching the store reference for efficient border computations.
   * All region queries operate relative to this mask's current state.
   *
   * @param {MaskInstance} maskInstance - Target mask for border analysis.
   * Must have bits (bigint), store (backend), fullBits, index, dilateBits, erodeBits methods.
   * @throws {TypeError} If maskInstance lacks required properties.
   * @public
   *
   * @example
   * const borders = new BorderRegions(targetMask);
   * // Now ready to analyze border regions
   */
  constructor (maskInstance) {
    this.mask = maskInstance
    this.store = maskInstance.store
  }

  // ==================== OUTER BORDER ====================

  /**
   * Get bits representing the outer border (dilation boundary).
   *
   * Outer border is the set of cells outside the mask that would be occupied
   * by a single dilation step. Computed as: dilated region minus original region.
   * These are the immediate neighbors of the mask boundary.
   *
   * Use cases: Finding adjacent cells, marking buffer zones, edge detection.
   *
   * @returns {bigint} Bit pattern representing all outer border cells.
   * Empty if mask is dilated (no room to expand) or isolated.
   * @public
   *
   * @example
   * const outerBorderBits = borders.getOuterBorderBits();
   * // Contains all cells that could touch the mask with distance=1
   */
  getOuterBorderBits () {
    const dilatedBits = this.mask.dilateBits(1)
    return this.store.bitSub(dilatedBits, this.mask.bits)
  }

  /**
   * Create mask containing only the outer border cells.
   *
   * Non-destructive wrapper around getOuterBorderBits().
   * Returns a new mask instance with only the outer border occupied.
   *
   * Use cases: Visualizing boundaries, analyzing neighborhood topology.
   *
   * @returns {MaskInstance} New mask with bits = outer border cells.
   * Original mask unchanged. Empty mask if no outer border exists.
   * @public
   *
   * @example
   * const borderMask = borders.createOuterBorderMask();
   * // borderMask contains only the boundary cells
   */
  createOuterBorderMask () {
    return this._createMaskFromBits(this.getOuterBorderBits())
  }

  // ==================== OUTER AREA ====================

  /**
   * Get bits representing the outer area (everything beyond outer border).
   *
   * Outer area is all empty space that is not adjacent to the mask.
   * Computed as: full grid minus (original region + outer border).
   * These are cells beyond the immediate neighborhood.
   *
   * Use cases: Finding distant empty space, determining unreachable regions.
   *
   * @returns {bigint} Bit pattern representing all outer area cells.
   * Large if mask is small (lots of distant empty space).
   * @public
   *
   * @example
   * const outerAreaBits = borders.getOuterAreaBits();
   * // Contains all cells farther than distance=1 from the mask
   */
  getOuterAreaBits () {
    return this.store.bitSub3(
      this.mask.fullBits,
      this.mask.bits,
      this.getOuterBorderBits()
    )
  }

  /**
   * Create mask containing the outer area.
   *
   * Non-destructive wrapper around getOuterAreaBits().
   * Returns a new mask instance with only the outer area occupied.
   *
   * Use cases: Visualizing far-field regions, analyzing terrain structure.
   *
   * @returns {MaskInstance} New mask with bits = outer area cells.
   * Original mask unchanged. Empty if no outer area exists (fills entire grid).
   * @public
   *
   * @example
   * const areaMask = borders.createOuterAreaMask();
   * // areaMask contains only the distant empty space
   */
  createOuterAreaMask () {
    return this._createMaskFromBits(this.getOuterAreaBits())
  }

  // ==================== INNER BORDER ====================

  /**
   * Get bits representing the inner border (erosion boundary).
   *
   * Inner border is the set of cells inside the mask that would be removed
   * by a single erosion step. Computed as: original region minus eroded region.
   * These are the cells that touch empty space (mask edge).
   *
   * Use cases: Finding exposed edges, analyzing stability, perimeter detection.
   *
   * @returns {bigint} Bit pattern representing all inner border cells.
   * Empty if mask is eroded (no interior) or fully enclosed.
   * @public
   *
   * @example
   * const innerBorderBits = borders.getInnerBorderBits();
   * // Contains all mask cells adjacent to empty space
   */
  getInnerBorderBits () {
    const erodedBits = this.mask.erodeBits(1)
    return this.store.bitSub(this.mask.bits, erodedBits)
  }

  /**
   * Create mask containing only the inner border cells.
   *
   * Non-destructive wrapper around getInnerBorderBits().
   * Returns a new mask instance with only the inner border occupied.
   *
   * Use cases: Visualizing mask edges, analyzing interior structure.
   *
   * @returns {MaskInstance} New mask with bits = inner border cells.
   * Original mask unchanged. Empty mask if no inner border exists.
   * @public
   *
   * @example
   * const borderMask = borders.createInnerBorderMask();
   * // borderMask contains only the interior edge cells
   */
  createInnerBorderMask () {
    return this._createMaskFromBits(this.getInnerBorderBits())
  }

  // ==================== INNER AREA ====================

  /**
   * Get bits representing the inner area (stable core).
   *
   * Inner area is the set of cells that remain occupied after erosion.
   * Computed as: original region minus inner border.
   * These are cells surrounded by other mask cells (not touching edges).
   *
   * Use cases: Finding stable interior regions, analyzing core structure.
   *
   * @returns {bigint} Bit pattern representing all inner area cells.
   * Empty if mask has no interior (all cells are boundary).
   * @public
   *
   * @example
   * const innerAreaBits = borders.getInnerAreaBits();
   * // Contains only the stable interior cells
   */
  getInnerAreaBits () {
    return this.store.bitSub(this.mask.bits, this.getInnerBorderBits())
  }

  /**
   * Create mask containing the inner area.
   *
   * Non-destructive wrapper around getInnerAreaBits().
   * Returns a new mask instance with only the inner area occupied.
   *
   * Use cases: Visualizing core regions, analyzing interior topology.
   *
   * @returns {MaskInstance} New mask with bits = inner area cells.
   * Original mask unchanged. Empty if no inner area exists.
   * @public
   *
   * @example
   * const areaMask = borders.createInnerAreaMask();
   * // areaMask contains only the interior cells
   */
  createInnerAreaMask () {
    return this._createMaskFromBits(this.getInnerAreaBits())
  }

  // ==================== LOCATION TESTING ====================

  /**
   * Test if a location is on the outer border.
   *
   * Checks whether the given coordinates fall within the outer border region.
   * Returns true if the location is a direct neighbor of the mask (distance=1).
   *
   * Use cases: Neighbor testing, adjacency checks, boundary queries.
   *
   * @param {number} x - X coordinate (column) of location to test.
   * @param {number} y - Y coordinate (row) of location to test.
   * @returns {boolean} True if (x, y) is on the outer border; false otherwise.
   * @public
   *
   * @example
   * if (borders.isOnOuterBorder(5, 10)) {
   *   console.log('Location is adjacent to the mask');
   * }
   */
  isOnOuterBorder (x, y) {
    return this._isBitSetAtLocation(this.getOuterBorderBits(), x, y)
  }

  /**
   * Test if a location is on the inner border.
   *
   * Checks whether the given coordinates fall within the inner border region.
   * Returns true if the location is inside the mask but touching empty space.
   *
   * Use cases: Edge detection, interior boundary queries, perimeter testing.
   *
   * @param {number} x - X coordinate (column) of location to test.
   * @param {number} y - Y coordinate (row) of location to test.
   * @returns {boolean} True if (x, y) is on the inner border; false otherwise.
   * @public
   *
   * @example
   * if (borders.isOnInnerBorder(5, 10)) {
   *   console.log('Location is on the mask edge');
   * }
   */
  isOnInnerBorder (x, y) {
    return this._isBitSetAtLocation(this.getInnerBorderBits(), x, y)
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Create a mask instance from bit pattern (private factory).
   *
   * Single source of truth for mask creation from computed bit patterns.
   * Eliminates duplicate logic across all mask-creation methods.
   * Creates an empty mask and sets its bits to the provided pattern.
   *
   * @private
   * @param {bigint} bits - Bit pattern to assign to the new mask.
   * @returns {MaskInstance} New mask instance with bits set to the provided pattern.
   * Inherits dimensions and structure from this.mask.
   * @throws {TypeError} If bits is not a BigInt
   *
   * @example
   * // Internal usage in createOuterBorderMask
   * return this._createMaskFromBits(this.getOuterBorderBits());
   */
  _createMaskFromBits (bits) {
    const mask = this.mask.emptyMask
    mask.bits = bits
    return mask
  }

  /**
   * Test if a bit is set at the given location (private helper).
   *
   * Consolidates location bit-testing logic.
   * Converts 2D coordinates to linear index, then checks if the bit is set
   * in the provided bit pattern.
   *
   * @private
   * @param {bigint} bits - Bit pattern to test.
   * @param {number} x - X coordinate (column) of location to test.
   * @param {number} y - Y coordinate (row) of location to test.
   * @returns {boolean} True if the bit is set at (x, y); false otherwise.
   * @throws {TypeError} If coordinates are out of bounds
   *
   * @example
   * // Internal usage in isOnOuterBorder
   * return this._isBitSetAtLocation(this.getOuterBorderBits(), x, y);
   */
  _isBitSetAtLocation (bits, x, y) {
    const locationIndex = this.mask.index(x, y)
    return this.store.isBitSet(bits, locationIndex)
  }
}
