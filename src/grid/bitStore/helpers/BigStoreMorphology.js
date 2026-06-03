/**
 * @typedef {Object} StoreBigInstance
 * BigInt store configuration object required by BigStoreMorphology methods.
 *
 * @property {number} width - Grid width in cells (for row offset calculations)
 * @property {number} height - Grid height in cells (for boundary checks)
 * @property {number} bitsPerCell - Bits allocated per cell (1-8 for color depth)
 * @property {bigint} fullBits - Mask covering all bits of the entire bitboard (efficiency hint)
 * @property {Object} all - Iterator object with occupiedIndexAndValues method
 * @property {all.occupiedIndexAndValues} all.occupiedIndexAndValues - Generator yielding [idx, value] for occupied cells
 * @property {Function} setIdx - Set cell value; signature: (bitboard: bigint, idx: number, value: bigint) => bigint
 * @property {Function} getIdx - Get cell value; signature: (bitboard: bigint, idx: number) => bigint
 * @property {Function} shiftBits - Bitwise shift; signature: (bitboard: bigint, shift: number) => bigint
 * @property {Function} combineMasked - Combine shifts; signature: (original: bigint, up: bigint, down: bigint) => bigint
 * @property {Function} prepareSrcForUpExpansion - Prepare for upward shift; signature: (bitboard: bigint, masks?: EdgeMasks) => bigint
 * @property {Function} prepareSrcForDownExpansion - Prepare for downward shift; signature: (bitboard: bigint, masks?: EdgeMasks) => bigint
 * @property {Function} cellSurvivesHorizontalErosion - Test neighbor; signature: (bitboard: bigint, idx: number) => boolean
 * @property {Function} cellSurvivesVerticalErosion - Test neighbor; signature: (bitboard: bigint, idx: number, gridWidth: number) => boolean
 */

/**
 * @typedef {Object} EdgeMasks
 * Boundary constraint masks for preventing morphological expansion beyond grid edges.
 *
 * Each mask is a BigInt with bits set for cells that CAN expand in that direction.
 * Bits cleared (0) indicate boundaries where expansion is prevented.
 *
 * @property {(bigint|number|null)} [notTop] - Mask for cells NOT on top edge; prevents upward expansion
 * @property {(bigint|number|null)} [notBottom] - Mask for cells NOT on bottom edge; prevents downward expansion
 * @property {(bigint|number|null)} [notLeft] - Mask for cells NOT on left edge; prevents leftward expansion
 * @property {(bigint|number|null)} [notRight] - Mask for cells NOT on right edge; prevents rightward expansion
 */

/**
 * @typedef {Object} ConstraintPair
 * Horizontal erosion constraint pair.
 *
 * @property {bigint} leftConstraint - Requires left neighbor; prevents left-boundary expansion
 * @property {bigint} rightConstraint - Requires right neighbor; prevents right-boundary expansion
 */

/**
 * @typedef {Object} ErosionConstraints
 * Vertical erosion constraint pair.
 *
 * @property {bigint} upConstraint - Requires top neighbor
 * @property {bigint} downConstraint - Requires bottom neighbor
 */

/**
 * BigStoreMorphology - Helper utilities for BigInt store morphology.
 *
 * Isolates morphology-specific operations from StoreBig to maintain separation
 * of concerns. StoreBig manages BigInt storage semantics; this class handles
 * morphological operation algorithms.
 *
 * **Design Rationale**:
 * - Separates storage concerns from algorithmic logic
 * - Improves testability and code reusability
 * - Maintains architectural symmetry with Store32Morphology
 * - Enables independent optimization and documentation of algorithms
 *
 * **Key Advantages Over Store32Morphology**:
 * - Simpler implementation: no word boundary management needed
 * - Uses monolithic BigInt instead of managing 32-bit words
 * - Operates directly on entire bitboard without per-word iteration
 *
 * **Operation Split by Storage Type**:
 * - **Shift-based**: For 1-bit (occupancy) grids using fast bit operations
 *   - Methods: `propagateVerticalShift`, `erodeHorizontalShift`, `erodeVerticalShift`
 *   - Complexity: O(1) amortized (BigInt shift is O(bits/64))
 * - **Cell-wise**: For multi-bit (colored) grids using per-cell iteration
 *   - Methods: `expandAdjacentCellsHorizontally`, `erodeHorizontalCells`, etc.
 *   - Complexity: O(k) where k = number of occupied cells
 *
 * **Boundary Handling**:
 * Shift-based operations respect grid edges via edge masks combined with BigInt shifts.
 * Cell-wise operations respect boundaries through index-based iteration with row/column checks.
 *
 * @class BigStoreMorphology
 * @static
 * @see Store32Morphology - Parallel implementation for Uint32Array stores
 * @see Rect1BitMorphology - Uses shift-based operations for 1-bit rectangular grids
 * @see RectMultiBitMorphology - Uses cell-wise operations for multi-bit rectangular grids
 *
 * @example
 * // 1-bit dilation using shifts (fast, boundary-aware)
 * const dilated = BigStoreMorphology.propagateVerticalShift(store, bits, width, edgeMasks)
 *
 * @example
 * // Multi-bit dilation using per-cell propagation (preserves colors)
 * const dilated = BigStoreMorphology.expandAdjacentCellsHorizontally(store, bits)
 */
export class BigStoreMorphology {
  /**
   * Normalize an edge mask value for BigInt bitwise calculations.
   * Converts numbers and other primitives to BigInt for consistent operations.
   *
   * **Purpose**: Ensures edge masks are always in BigInt format for bitwise operations.
   * Falsy values are treated as 0n.
   *
   * **Time Complexity**: O(1) - BigInt conversion is O(1) for small integers
   * **Space Complexity**: O(1) - returns single value
   *
   * @static
   * @param {bigint|number|null|undefined} maskValue - Value to normalize
   * @returns {bigint} Normalized edge mask as BigInt (0n if falsy)
   *
   * @example
   * const normalized = BigStoreMorphology.normalizeEdgeMask(123)
   * // Returns: 123n
   *
   * @example
   * const fromNull = BigStoreMorphology.normalizeEdgeMask(null)
   * // Returns: 0n
   */
  static normalizeEdgeMask (maskValue) {
    return typeof maskValue === 'bigint' ? maskValue : BigInt(maskValue || 0n)
  }

  /**
   * Expand each populated cell into its horizontal neighbors.
   * Per-cell dilation for multi-bit stores: propagates color values left and right.
   *
   * **Algorithm**:
   * 1. For each occupied cell at index `idx`
   * 2. Get the cell's color value
   * 3. Compute column = idx % width to check boundaries
   * 4. If column > 0, set left neighbor (idx - 1) to the same color
   * 5. If column < width - 1, set right neighbor (idx + 1) to the same color
   * 6. Returns modified bitboard
   *
   * **Boundary Handling**:
   * - Left edge (column 0): cells never expand left (idx - 1 would wrap)
   * - Right edge (column width - 1): cells never expand right (idx + 1 would wrap)
   * - Column modulo check prevents wrap-around across row boundaries
   *
   * **Time Complexity**: O(k) where k = number of occupied cells
   * **Space Complexity**: O(n) for result bitboard
   * **Mutation Model**: Returns new bitboard; does not modify input
   *
   * @static
   * @param {StoreBigInstance} store - Store with width property for boundary checking
   * @param {bigint} bitboard - Input bitboard with colored cells
   * @returns {bigint} Dilated bitboard with horizontally expanded cells
   *
   * @example
   * // Before: cell at idx=5 (row 0, col 5) has color 3
   * // After: cells at idx=4, idx=5, idx=6 have color 3
   * const expanded = BigStoreMorphology.expandAdjacentCellsHorizontally(store, bitboard)
   */
  static expandAdjacentCellsHorizontally (store, bitboard) {
    const width = store.width
    let result = bitboard

    for (const [idx, value] of store.all.occupiedIndexAndValues(bitboard)) {
      result = store.setIdx(result, idx, value)
      const column = idx % width
      if (column > 0) result = store.setIdx(result, idx - 1, value)
      if (column < width - 1) result = store.setIdx(result, idx + 1, value)
    }
    return result
  }

  /**
   * Expand each populated cell into its vertical neighbors.
   * Per-cell dilation for multi-bit stores: propagates color values up and down.
   *
   * **Algorithm**:
   * 1. For each occupied cell at index `idx`
   * 2. Get the cell's color value
   * 3. Compute row = floor(idx / gridWidth) to check vertical boundaries
   * 4. If row > 0, set top neighbor (idx - gridWidth) to the same color
   * 5. If row < height - 1, set bottom neighbor (idx + gridWidth) to the same color
   * 6. Returns modified bitboard
   *
   * **Boundary Handling**:
   * - Top edge (row 0): cells never expand up (idx - gridWidth would be negative)
   * - Bottom edge (row height - 1): cells never expand down (idx + gridWidth would exceed grid)
   * - Row division check prevents expansion beyond grid boundaries
   *
   * **Time Complexity**: O(k) where k = number of occupied cells
   * **Space Complexity**: O(n) for result bitboard
   * **Mutation Model**: Returns new bitboard; does not modify input
   *
   * @static
   * @param {StoreBigInstance} store - Store with height property
   * @param {bigint} bitboard - Input colored bitboard
   * @param {number} gridWidth - Width of grid in cells (for row offset calculation)
   * @returns {bigint} Dilated bitboard with vertically expanded cells
   *
   * @example
   * // Before: cell at idx=10 (row 2, col 0) has color 3
   * // After: cells at idx=0, idx=10, idx=20 have color 3 (assuming gridWidth=10, height=3)
   * const expanded = BigStoreMorphology.propagateAdjacentCellsVertically(store, bitboard, gridWidth)
   */
  static propagateAdjacentCellsVertically (store, bitboard, gridWidth) {
    const height = store.height
    let result = bitboard
    const width = gridWidth

    for (const [idx, value] of store.all.occupiedIndexAndValues(bitboard)) {
      result = store.setIdx(result, idx, value)
      const row = Math.floor(idx / width)
      if (row > 0) result = store.setIdx(result, idx - width, value)
      if (row < height - 1) result = store.setIdx(result, idx + width, value)
    }
    return result
  }

  /**
   * Propagate 1-bit values vertically using BigInt shifts and edge masks.
   * Optimized shift-based operation for single-bit grids (occupancy only).
   *
   * **Algorithm**:
   * 1. Prepare source bitboards with edge masks applied:
   *    - srcForUp: mask top edge to prevent top-row wrap-around
   *    - srcForDown: mask bottom edge to prevent bottom-row wrap-around
   * 2. Shift srcForUp left (negative) by gridWidth bits for upward expansion
   * 3. Shift srcForDown right (positive) by gridWidth bits for downward expansion
   * 4. Combine original, upShifted, and downShifted using OR operations
   * 5. Returns expanded bitboard with edge constraints respected
   *
   * **Boundary Handling**:
   * Edge masks applied before shifts ensure cells don't wrap around grid boundaries.
   * Top edge cells are masked from downward shift; bottom edge cells from upward.
   *
   * **Time Complexity**: O(n) where n = bitboard size
   * **Space Complexity**: O(n) for result bitboard
   * **Mutation Model**: Returns new bitboard; does not modify input
   *
   * @static
   * @param {StoreBigInstance} store - Store with shiftBits and combineMasked methods
   * @param {bigint} bitboard - Input 1-bit occupancy bitboard
   * @param {number} gridWidth - Width in cells (shift amount for vertical operations)
   * @param {EdgeMasks} [edgeMasks] - Edge masks to restrict boundary expansion
   * @returns {bigint} Bitboard with vertical expansion (up and down shifts)
   *
   * @example
   * // Apply vertical propagation with edge constraints
   * const propagated = BigStoreMorphology.propagateVerticalShift(store, bits, width, edgeMasks)
   */
  static propagateVerticalShift (store, bitboard, gridWidth, edgeMasks) {
    const srcForUp = store.prepareSrcForUpExpansion(bitboard, edgeMasks)
    const srcForDown = store.prepareSrcForDownExpansion(bitboard, edgeMasks)

    const upShifted = store.shiftBits(srcForUp, -gridWidth)
    const downShifted = store.shiftBits(srcForDown, gridWidth)

    return store.combineMasked(bitboard, upShifted, downShifted)
  }

  /**
   * Apply horizontal erosion for multi-bit stores using neighbor survival rules.
   * Per-cell operation that removes colors from cells without horizontal neighbors.
   *
   * **Algorithm**:
   * 1. For each occupied cell at index `idx`
   * 2. Test if cell survives horizontal erosion via store.cellSurvivesHorizontalErosion
   * 3. If it survives: keep its color; if not: remove it (set to 0)
   * 4. Returns eroded bitboard
   *
   * **Survival Rule**: Cell survives if it has occupied neighbors on BOTH left AND right
   *
   * **Boundary Handling**:
   * - Left edge (column 0): cells cannot have left neighbor, so never survive
   * - Right edge: cells cannot have right neighbor, so never survive
   * - Interior cells with occupied left and right neighbors survive
   *
   * **Time Complexity**: O(k) where k = number of occupied cells
   * **Space Complexity**: O(n) for result bitboard
   * **Mutation Model**: Returns new bitboard; does not modify input
   *
   * @static
   * @param {StoreBigInstance} store - Store with cellSurvivesHorizontalErosion method
   * @param {bigint} bitboard - Input colored bitboard
   * @returns {bigint} Eroded bitboard with edge colors removed
   *
   * @example
   * // Before: row of cells [A, B, C] where all occupied
   * // After: only [empty, B, empty] as B has left and right neighbors
   * const eroded = BigStoreMorphology.erodeHorizontalCells(store, bitboard)
   */
  static erodeHorizontalCells (store, bitboard) {
    let result = bitboard

    for (const [idx] of store.all.occupiedIndexAndValues(bitboard)) {
      if (!store.cellSurvivesHorizontalErosion(bitboard, idx)) {
        result = store.setIdx(result, idx, 0n)
      }
    }
    return result
  }

  /**
   * Apply vertical erosion for multi-bit stores using neighbor survival rules.
   * Per-cell operation that removes colors from cells without vertical neighbors.
   *
   * **Algorithm**:
   * 1. For each occupied cell at index `idx`
   * 2. Test if cell survives vertical erosion via store.cellSurvivesVerticalErosion
   * 3. If it survives: keep its color; if not: remove it (set to 0)
   * 4. Returns eroded bitboard
   *
   * **Survival Rule**: Cell survives if it has occupied neighbors on BOTH top AND bottom
   *
   * **Boundary Handling**:
   * - Top edge (row 0): cells cannot have top neighbor, so never survive
   * - Bottom edge (row height - 1): cells cannot have bottom neighbor, so never survive
   * - Interior cells with occupied top and bottom neighbors survive
   *
   * **Time Complexity**: O(k) where k = number of occupied cells
   * **Space Complexity**: O(n) for result bitboard
   * **Mutation Model**: Returns new bitboard; does not modify input
   *
   * @static
   * @param {StoreBigInstance} store - StoreBig instance with cellSurvivesVerticalErosion method
   * @param {bigint} bitboard - Input colored bitboard
   * @param {number} gridWidth - Grid width in cells (used for neighbor offset calculation)
   * @returns {bigint} Eroded bitboard with edge colors removed
   * @example
   * // Remove colors from vertically isolated cells
   * const eroded = BigStoreMorphology.erodeVerticalCells(store, bitboard, gridWidth);
   */
  static erodeVerticalCells (store, bitboard, gridWidth) {
    const size = gridWidth * store.height
    let result = bitboard

    for (let idx = 0; idx < size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (value === 0n) continue
      if (!store.cellSurvivesVerticalErosion(bitboard, idx, gridWidth)) {
        result = store.setIdx(result, idx, 0n)
      }
    }
    return result
  }

  /**
   * Build an inverted edge mask for horizontal erosion constraints.
   * Inverts a specific edge mask and applies full-mask AND operation.
   *
   * **Purpose**: Creates constraint masks for erosion that require neighbors.
   * Inverted masks define cells that CANNOT survive erosion (boundary cells).
   *
   * **Boundary Handling**:
   * Inversion logic: invert(notLeft) = onlyLeft = cells that CANNOT have left neighbor
   * These cells are automatically eroded away.
   *
   * **Time Complexity**: O(1)
   * **Space Complexity**: O(1)
   *
   * @static
   * @param {StoreBigInstance} store - Store instance with fullBits property
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration
   * @param {string} maskKey - Key of mask to invert (e.g., 'notLeft', 'notRight')
   * @returns {bigint} Inverted edge mask value
   * @throws {TypeError} If maskKey is not a valid edge mask key
   *
   * @example
   * // notLeft = 1110 (left column clear)
   * // invert(notLeft) = 0001 (marks leftmost column)
   * const inverted = BigStoreMorphology.computeInvertedEdgeMask(store, edgeMasks, 'notLeft')
   */
  static computeInvertedEdgeMask (store, edgeMasks, maskKey) {
    const fullMask = store.fullBits
    const maskValue = BigStoreMorphology.normalizeEdgeMask(edgeMasks?.[maskKey])
    return ~maskValue & fullMask
  }

  /**
   * Create horizontal erosion constraints from a shift and inverted mask.
   * Shifts bitboard and combines with inverted mask for erosion boundary.
   *
   * **Algorithm**:
   * 1. Shift bitboard by bitShift amount (typically ±1 for neighbors)
   * 2. AND with inverted mask to include boundary constraint
   * 3. Returns constraint where 1 = has neighbor, 0 = no neighbor
   *
   * **Purpose**: Computes constraint for erosion neighbor survival test.
   * Positive shift checks right neighbors; negative shift checks left neighbors.
   *
   * **Boundary Handling**:
   * Inverted mask ensures boundary cells are marked as lacking neighbors.
   * Combined with shift result creates complete constraint.
   *
   * **Time Complexity**: O(n) where n = bitboard size
   * **Space Complexity**: O(n) for result bitboard
   *
   * @static
   * @param {StoreBigInstance} store - Store with shiftBits method
   * @param {bigint} bitboard - Input bitboard to shift
   * @param {number} bitShift - Number of bits to shift (±1 for horizontal neighbors)
   * @param {bigint} invertedMask - Inverted edge mask to apply
   * @returns {bigint} Constraint bitboard where 1 = neighbor exists
   *
   * @example
   * // Build left neighbor constraint (check idx - 1)
   * const constraint = BigStoreMorphology.computeHorizontalConstraintFromShift(
   *   store, bitboard, 1, invertedLeftMask
   * )
   */
  static computeHorizontalConstraintFromShift (
    store,
    bitboard,
    bitShift,
    invertedMask
  ) {
    const shiftedNeighbor = store.shiftBits(bitboard, bitShift)
    return shiftedNeighbor | invertedMask
  }

  /**
   * Compute horizontal erosion constraints for BigInt stores.
   * Calculates left and right neighbor constraints for erosion operation.
   *
   * **Algorithm**:
   * 1. Compute inverted left edge mask (marks cells that CANNOT have left neighbor)
   * 2. Compute inverted right edge mask (marks cells that CANNOT have right neighbor)
   * 3. Call computeHorizontalConstraintFromShift for both with respective bit shifts
   * 4. Returns constraint pair where 1 = neighbor exists, 0 = no neighbor
   *
   * **Purpose**: Creates constraints used to AND with bitboard for erosion.
   * Cells that fail constraints are removed (set to 0).
   *
   * **Time Complexity**: O(n) where n = bitboard size
   * **Space Complexity**: O(n) for both constraint bitboards
   *
   * @static
   * @param {StoreBigInstance} store - Store instance
   * @param {bigint} bitboard - Input bitboard
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration
   * @param {number} bitShift - Bit shift amount (typically 1 for single-cell neighbors)
   * @returns {ConstraintPair} Left and right neighbor constraints
   *
   * @example
   * // Compute erosion constraints for neighbor survival
   * const constraints = BigStoreMorphology.computeHorizontalErodeConstraints(
   *   store, bitboard, edgeMasks, 1
   * )
   */
  static computeHorizontalErodeConstraints (
    store,
    bitboard,
    edgeMasks,
    bitShift
  ) {
    const invNotLeft = BigStoreMorphology.computeInvertedEdgeMask(
      store,
      edgeMasks,
      'notLeft'
    )
    const invNotRight = BigStoreMorphology.computeInvertedEdgeMask(
      store,
      edgeMasks,
      'notRight'
    )

    const leftConstraint =
      BigStoreMorphology.computeHorizontalConstraintFromShift(
        store,
        bitboard,
        bitShift,
        invNotLeft
      )
    const rightConstraint =
      BigStoreMorphology.computeHorizontalConstraintFromShift(
        store,
        bitboard,
        -bitShift,
        invNotRight
      )

    return { leftConstraint, rightConstraint }
  }

  /**
   * Apply horizontal erosion for 1-bit BigInt stores.
   * Removes cells that lack horizontal neighbors using shift-based constraints.
   *
   * **Algorithm**:
   * 1. Compute horizontal erosion constraints (left and right neighbors)
   * 2. AND original bitboard with left constraint AND right constraint
   * 3. Results in only cells with neighbors on both sides remaining
   * 4. Returns eroded bitboard
   *
   * **Boundary Handling**: Edge masks in constraints ensure boundary cells are removed
   * - Left edge cells fail leftConstraint (no left neighbor)
   * - Right edge cells fail rightConstraint (no right neighbor)
   * - Interior cells with both neighbors survive
   *
   * **Time Complexity**: O(n) where n = bitboard size
   * **Space Complexity**: O(n) for result bitboard
   *
   * @static
   * @param {StoreBigInstance} store - Store with morphology method suite
   * @param {bigint} bitboard - Input 1-bit bitboard
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration (optional)
   * @param {number} bitShift - Bit shift for neighbor offset (typically 1)
   * @returns {bigint} Eroded bitboard with boundary cells removed
   *
   * @example
   * // Before: all cells occupied in row
   * // After: only interior cells with neighbors on both sides
   * const eroded = BigStoreMorphology.erodeHorizontalShift(store, bits, edgeMasks, 1)
   */
  static erodeHorizontalShift (store, bitboard, edgeMasks) {
    if (!edgeMasks) return bitboard

    const bitShift = store.bitsPerCell
    const { leftConstraint, rightConstraint } =
      BigStoreMorphology.computeHorizontalErodeConstraints(
        store,
        bitboard,
        edgeMasks,
        bitShift
      )

    return bitboard & leftConstraint & rightConstraint
  }

  /**
   * Compute vertical erosion constraints for BigInt stores.
   * Calculates up and down neighbor constraints for vertical erosion.
   *
   * **Algorithm**: Delegates to computeHorizontalConstraintFromShift for up and down neighbors.
   *
   * **Purpose**: Creates constraints that when AND'ed with the bitboard will:
   * - Remove top-row cells (no top neighbors)
   * - Remove bottom-row cells (no bottom neighbors)
   * - Keep interior cells with both neighbors
   *
   * **Time Complexity**: O(n)
   * **Space Complexity**: O(n)
   *
   * @static
   * @param {StoreBigInstance} store - Store instance with computation helpers
   * @param {bigint} bitboard - Input bitboard to process
   * @param {number} gridWidth - Width in cells (for shift calculation)
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration (optional)
   * @returns {ErosionConstraints} Up and down neighbor constraints
   *
   * @example
   * // Compute constraints for vertical erosion
   * const constraints = BigStoreMorphology.computeVerticalErodeConstraints(
   *   store, bitboard, gridWidth, edgeMasks
   * )
   */
  static computeVerticalErodeConstraints (
    store,
    bitboard,
    gridWidth,
    edgeMasks
  ) {
    const upShifted = store.shiftBits(bitboard, -gridWidth)
    const downShifted = store.shiftBits(bitboard, gridWidth)

    if (!edgeMasks) {
      return { upConstraint: upShifted, downConstraint: downShifted }
    }

    const fullMask = store.fullBits
    const notTopBig = BigStoreMorphology.normalizeEdgeMask(edgeMasks.notTop)
    const notBottomBig = BigStoreMorphology.normalizeEdgeMask(
      edgeMasks.notBottom
    )

    const invNotTop = ~notTopBig & fullMask
    const invNotBottom = ~notBottomBig & fullMask

    const upConstraint = downShifted | invNotTop
    const downConstraint = upShifted | invNotBottom
    return { upConstraint, downConstraint }
  }

  /**
   * Apply vertical erosion for 1-bit BigInt stores.
   * Removes cells that lack vertical neighbors using shift-based constraints.
   *
   * **Algorithm**:
   * 1. Compute vertical erosion constraints (up and down neighbors)
   * 2. AND original bitboard with upConstraint AND downConstraint
   * 3. Results in only cells with neighbors on both top and bottom remaining
   * 4. Returns eroded bitboard
   *
   * **Boundary Handling**: Edge masks in constraints ensure boundary cells are removed
   * - Top edge cells fail upConstraint (no top neighbor)
   * - Bottom edge cells fail downConstraint (no bottom neighbor)
   * - Interior cells with both neighbors survive
   *
   * **Time Complexity**: O(n) where n = bitboard size
   * **Space Complexity**: O(n) for result bitboard
   *
   * @static
   * @param {StoreBigInstance} store - Store with morphology helpers
   * @param {bigint} bitboard - Input 1-bit bitboard
   * @param {number} gridWidth - Width in cells (for neighbor offset)
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration (optional)
   * @returns {bigint} Eroded bitboard with boundary cells removed
   *
   * @example
   * // Before: all cells occupied in column
   * // After: only interior cells with neighbors on both top and bottom
   * const eroded = BigStoreMorphology.erodeVerticalShift(store, bits, gridWidth, edgeMasks)
   */
  static erodeVerticalShift (store, bitboard, gridWidth, edgeMasks) {
    const { upConstraint, downConstraint } =
      BigStoreMorphology.computeVerticalErodeConstraints(
        store,
        bitboard,
        gridWidth,
        edgeMasks
      )
    return bitboard & upConstraint & downConstraint
  }
}
