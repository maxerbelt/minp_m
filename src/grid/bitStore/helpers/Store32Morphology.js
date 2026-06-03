/**
 * @typedef {Object} Store32Instance
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {number} size - Total grid size (width × height)
 * @property {number} bitsPerCell - Bits allocated per cell (1, 2, 4, 8)
 * @property {Uint32Array} fullBits - Mask array covering all bits of the grid
 * @property {Function} getIdx - Get cell value at index; signature: (bitboard: Uint32Array, idx: number) => number
 * @property {Function} setAtIdx - Set cell value at index; signature: (bitboard: Uint32Array, idx: number, value: number) => Uint32Array
 * @property {Function} shiftBits - Perform bitwise shift on bitboard; signature: (src: Uint32Array, shift: number) => Uint32Array
 * @property {Function} bitAnd - Bitwise AND operation; signature: (a: Uint32Array, b: Uint32Array) => Uint32Array
 * @property {Function} bitOr - Bitwise OR operation; signature: (a: Uint32Array, b: Uint32Array) => Uint32Array
 * @property {Function} createEmptyBitboard - Create zeroed bitboard array; signature: (template?: Uint32Array) => Uint32Array
 * @property {Function} cellSurvivesHorizontalErosion - Check horizontal erosion survival; signature: (bitboard: Uint32Array, idx: number) => boolean
 * @property {Function} cellSurvivesVerticalErosion - Check vertical erosion survival; signature: (bitboard: Uint32Array, idx: number, gridWidth: number) => boolean
 * @property {Function} _createInvertedMask - Create inverted edge mask; signature: (edgeMasks?: EdgeMasks, maskKey: string) => Uint32Array
 * @property {Function} _computeVerticalConstraintFromShift - Compute vertical constraint; signature: (bitboard: Uint32Array, edgeMasks?: EdgeMasks, maskKey: string, shift: number) => Uint32Array
 * @property {Function} _calculateVerticalBitShift - Calculate vertical shift amount; signature: (gridWidth: number) => number
 */

/**
 * @typedef {Object} EdgeMasks
 * Boundary constraint masks preventing morphological expansion beyond grid edges.
 *
 * Each mask is a Uint32Array with bits set for cells that CAN expand in that direction.
 * Cells aligned with cleared bits (0) cannot expand in that direction.
 *
 * @property {Uint32Array} [notTop] - Mask for cells NOT on top edge; prevents upward expansion from top row
 * @property {Uint32Array} [notBottom] - Mask for cells NOT on bottom edge; prevents downward expansion from bottom row
 * @property {Uint32Array} [notLeft] - Mask for cells NOT on left edge; prevents leftward expansion from left column
 * @property {Uint32Array} [notRight] - Mask for cells NOT on right edge; prevents rightward expansion from right column
 *
 * @example
 * // Mask allowing expansion except from left edge
 * {
 *   notLeft: Uint32Array([0xFFFFFFFE, 0xFFFFFFFE, ...])  // No leftward expansion from column 0
 * }
 */

/**
 * @typedef {Object} ConstraintPair
 * Horizontal erosion constraint pair for left/right neighbor requirements.
 *
 * A cell survives erosion only if both constraints are satisfied (bitwise AND).
 * Each constraint encodes neighbor requirements:
 * - If bit is 1: neighbor must exist for cell to survive
 * - If bit is 0: cell cannot survive erosion
 *
 * @property {Uint32Array} leftConstraint - Requires left neighbor; computed from rightward shifts
 * @property {Uint32Array} rightConstraint - Requires right neighbor; computed from leftward shifts
 */

/**
 * @typedef {Object} VerticalConstraints
 * Vertical erosion constraint pair for top/bottom neighbor requirements.
 *
 * A cell survives erosion only if both constraints are satisfied (bitwise AND).
 *
 * @property {Uint32Array} upShifted - Constraint for cells above; prevents upward erosion boundary expansion
 * @property {Uint32Array} downShifted - Constraint for cells below; prevents downward erosion boundary expansion
 */

/**
 * Store32Morphology - Helper utilities for Store32 (Uint32Array) morphology.
 *
 * Isolates morphology-specific operations from Store32 to maintain separation
 * of concerns. Store32 focuses on Uint32Array storage semantics while this class
 * handles morphological operation logic.
 *
 * **Design Rationale**:
 * - Separates storage concerns (word layout, bitboard management) from algorithmic operations
 * - Improves testability by isolating morphology logic
 * - Enables code reuse across different grid shapes (Rect, Hex, Tri)
 * - Maintains symmetry with BigStoreMorphology for consistency
 *
 * **Key Differences from BigStoreMorphology**:
 * - Works with Uint32Array instead of monolithic BigInt
 * - Requires word-by-word processing due to 32-bit word boundaries
 * - Respects word alignment throughout all operations
 * - Uses store helper methods for cross-format bitwise operations
 *
 * **Operation Split by Storage Type**:
 * - **Shift-based**: For 1-bit (occupancy) grids using fast bit shift operations
 *   - Patterns: `propagateVerticalShift`, `erodeHorizontalShift`, `erodeVerticalShift`
 *   - Complexity: O(w) or O(h) where w=width, h=height
 * - **Cell-wise**: For multi-bit (colored) grids using per-cell iteration
 *   - Patterns: `expandAdjacentCellsHorizontally`, `erodeHorizontalCells`, `erodeVerticalCells`
 *   - Complexity: O(n) where n=size (but only processes occupied cells)
 *
 * **Boundary Handling**:
 * All shift-based operations respect grid edges via edge masks. Cell-wise operations
 * naturally respect boundaries through index-based iteration with bounds checking.
 *
 * @class Store32Morphology
 * @static
 * @see BigStoreMorphology - Parallel implementation for BigInt stores
 * @see Rect1BitMorphology - Uses shift-based operations for 1-bit rectangular grids
 * @see RectMultiBitMorphology - Uses cell-wise operations for multi-bit rectangular grids
 *
 * @example
 * // 1-bit dilation using shifts (fast, boundary-aware)
 * const dilated = Store32Morphology.propagateVerticalShift(store, bits, width, edgeMasks)
 *
 * @example
 * // Multi-bit dilation using per-cell propagation (preserves colors)
 * const dilated = Store32Morphology.expandAdjacentCellsHorizontally(store, bits)
 */
export class Store32Morphology {
  /**
   * Normalize an edge mask value for Uint32Array bitwise calculations.
   * Converts primitives to Uint32Array for consistent word-wise operations.
   * Handles both scalar and array inputs gracefully.
   *
   * **Purpose**: Ensures edge masks are always in Uint32Array format for consistent
   * bitwise operations. Falsy values are treated as zero-filled arrays.
   *
   * **Time Complexity**: O(1) for arrays (passthrough), O(1) for scalars (create single word)
   * **Space Complexity**: O(1) - creates at most a single-word array
   *
   * @static
   * @param {Uint32Array|number|null|undefined} maskValue - Value to normalize
   * @returns {Uint32Array} Normalized edge mask as single-word array (or [0] if falsy)
   * @throws {TypeError} If input cannot be converted to number or Uint32Array
   *
   * @example
   * // Passthrough for existing Uint32Array
   * const mask = Store32Morphology.normalizeEdgeMask(new Uint32Array([0xFFFFFFFF]))
   * // Returns: Uint32Array([0xFFFFFFFF])
   *
   * @example
   * // Convert number to single-word array
   * const mask = Store32Morphology.normalizeEdgeMask(0x12345678)
   * // Returns: Uint32Array([0x12345678])
   *
   * @example
   * // Handle falsy values
   * const mask = Store32Morphology.normalizeEdgeMask(null)
   * // Returns: Uint32Array([0])
   */
  static normalizeEdgeMask (maskValue) {
    if (maskValue instanceof Uint32Array) return maskValue
    return new Uint32Array([maskValue || 0])
  }

  /**
   * Expand each populated cell into its horizontal neighbors.
   * Per-cell dilation for multi-bit stores: propagates color values left and right.
   * Does not use edge masks (relies on grid boundaries via iteration).
   *
   * **Algorithm**:
   * 1. Clone input bitboard to preserve original
   * 2. Iterate through all cells (optimized for occupied cells only in practice)
   * 3. For each non-zero cell, propagate its value to left and right neighbors
   * 4. Respect grid boundaries (column < width - 1 check)
   *
   * **Boundary Handling**: Natural via index-based iteration
   * - Left boundary: `column > 0` prevents expansion into column -1
   * - Right boundary: `column < width - 1` prevents expansion beyond rightmost column
   *
   * **Time Complexity**: O(n) where n = size (worst case all cells populated)
   * **Space Complexity**: O(n) - creates clone of entire bitboard
   * **Mutation Model**: Returns new bitboard; original unchanged
   *
   * **Color Preservation**: All cell colors (multi-bit values) are preserved exactly as propagated
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with width, height, size properties
   * @param {Uint32Array} bitboard - Input colored bitboard (unchanged)
   * @returns {Uint32Array} New bitboard with colors expanded to adjacent columns
   *
   * @example
   * // Propagate single red cell (value=2) to neighbors
   * // Before: [0, 2, 0, 0, 0]  (3x1 grid, cell at index 1 has color)
   * // After:  [2, 2, 2, 0, 0]  (value propagated left and right)
   * const expanded = Store32Morphology.expandAdjacentCellsHorizontally(store, bitboard)
   *
   * @see propagateAdjacentCellsVertically - Vertical equivalent
   */
  static expandAdjacentCellsHorizontally (store, bitboard) {
    const width = store.width
    const result = bitboard.slice()

    for (let idx = 0; idx < store.size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (value !== 0) {
        store.setAtIdx(result, idx, value)
        const column = idx % width
        if (column > 0) store.setAtIdx(result, idx - 1, value)
        if (column < width - 1) store.setAtIdx(result, idx + 1, value)
      }
    }
    return result
  }

  /**
   * Expand each populated cell into its vertical neighbors.
   * Per-cell dilation for multi-bit stores: propagates color values up and down.
   * Does not use edge masks (relies on grid boundaries via iteration).
   *
   * **Algorithm**:
   * 1. Clone input bitboard
   * 2. Iterate through all cells
   * 3. For each non-zero cell, propagate to top and bottom neighbors
   * 4. Respect grid boundaries via row calculations
   *
   * **Boundary Handling**: Natural via row/height checks
   * - Top boundary: `row > 0` prevents expansion into row -1
   * - Bottom boundary: `row < height - 1` prevents expansion beyond bottommost row
   *
   * **Time Complexity**: O(n) where n = size
   * **Space Complexity**: O(n) - cloned bitboard
   * **Mutation Model**: Returns new bitboard; original unchanged
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with width, height, size properties
   * @param {Uint32Array} bitboard - Input colored bitboard (unchanged)
   * @param {number} gridWidth - Width in cells (for row offset calculation = gridWidth * bitsPerCell)
   * @returns {Uint32Array} Bitboard with colors expanded to adjacent rows
   *
   * @example
   * // Propagate cell color vertically in a 3x3 grid
   * // Before: center cell at (1,1) has value 3, others are 0
   * // After:  cells at (0,1), (1,1), (2,1) all have value 3
   * const expanded = Store32Morphology.propagateAdjacentCellsVertically(store, bitboard, 3)
   *
   * @see expandAdjacentCellsHorizontally - Horizontal equivalent
   */
  static propagateAdjacentCellsVertically (store, bitboard, gridWidth) {
    const height = store.height
    const result = bitboard.slice()

    for (let idx = 0; idx < store.size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (value !== 0) {
        store.setAtIdx(result, idx, value)
        const row = Math.floor(idx / gridWidth)
        if (row > 0) store.setAtIdx(result, idx - gridWidth, value)
        if (row < height - 1) store.setAtIdx(result, idx + gridWidth, value)
      }
    }
    return result
  }

  /**
   * Propagate 1-bit values vertically using Uint32Array shifts and edge masks.
   * Optimized shift-based operation for single-bit grids (occupancy only).
   * Applies edge masks to prevent cells from expanding beyond grid boundaries.
   * Processes word-by-word to respect Uint32Array structure.
   *
   * **Algorithm**:
   * 1. Apply edge masks to source bitboard (optional, restrict expansion)
   * 2. Shift masked sources up by gridWidth bits (upward propagation)
   * 3. Shift masked sources down by gridWidth bits (downward propagation)
   * 4. OR all three versions (original, up-shifted, down-shifted)
   * 5. Apply full-bits mask to each word (normalize to grid size)
   *
   * **Edge Mask Application**:
   * - `notTop` prevents cells in top row from expanding upward (cleared bits = can't expand)
   * - `notBottom` prevents cells in bottom row from expanding downward
   * - Masks are applied BEFORE shifting to block boundary expansion
   *
   * **Boundary Handling**: Enforced by edge masks combined with bit shifts
   * - Cells beyond boundaries naturally become zero via shift overflow
   * - Full-bits mask clears padding bits (if grid doesn't fill all words)
   *
   * **Time Complexity**: O(w) where w = number of 32-bit words = ceil(size * bitsPerCell / 32)
   * **Space Complexity**: O(w) - up to three intermediate arrays
   * **Mutation Model**: Returns new bitboard; original unchanged
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with shiftBits and combineMasked methods
   * @param {Uint32Array} bitboard - Input 1-bit occupancy bitboard (unchanged)
   * @param {number} gridWidth - Width in cells; shift amount = gridWidth * bitsPerCell bits
   * @param {EdgeMasks} [edgeMasks] - Optional edge masks to restrict boundary expansion
   * @returns {Uint32Array} Bitboard with vertical expansion (up and down shifts combined)
   *
   * @example
   * // Propagate occupancy vertically without edge restrictions
   * const propagated = Store32Morphology.propagateVerticalShift(store, bitboard, 20)
   *
   * @example
   * // Propagate with edge constraints (e.g., prevent wrap-around)
   * const edgeMasks = { notTop: mask1, notBottom: mask2 }
   * const propagated = Store32Morphology.propagateVerticalShift(store, bitboard, 20, edgeMasks)
   *
   * @see erodeVerticalShift - Inverse operation (erosion instead of dilation)
   */
  static propagateVerticalShift (store, bitboard, gridWidth, edgeMasks) {
    const bitsPerCell = store.bitsPerCell
    const bitShift = gridWidth * bitsPerCell
    let srcForUp = bitboard
    let srcForDown = bitboard

    if (edgeMasks?.notTop) srcForUp = store.bitAnd(bitboard, edgeMasks.notTop)
    if (edgeMasks?.notBottom)
      srcForDown = store.bitAnd(bitboard, edgeMasks.notBottom)

    const upShifted = store.shiftBits(srcForUp, -bitShift)
    const downShifted = store.shiftBits(srcForDown, bitShift)

    const result = store.createEmptyBitboard(bitboard)
    const fullMask = store.fullBits
    for (let i = 0; i < result.length; i++) {
      result[i] = (bitboard[i] | upShifted[i] | downShifted[i]) & fullMask[i]
    }
    return result
  }

  /**
   * Apply horizontal erosion for multi-bit stores using neighbor survival rules.
   * Per-cell operation that removes colors from cells without horizontal neighbors.
   * A cell survives only if it has an occupied neighbor on both left and right.
   *
   * **Algorithm**:
   * 1. Clone input bitboard to track changes
   * 2. Iterate through all non-zero cells
   * 3. Test if cell has left AND right neighbors using store's survival predicate
   * 4. Clear cells that don't meet survival criteria
   * 5. Return eroded bitboard
   *
   * **Neighbor Requirement**: A cell at (x, y) survives iff:
   * - Cell is non-empty (has color)
   * - Cell at (x-1, y) is non-empty (left neighbor exists)
   * - Cell at (x+1, y) is non-empty (right neighbor exists)
   * - Edge cells are always eroded (no neighbors in one direction)
   *
   * **Boundary Handling**: Natural via neighbor existence checks
   * - Left edge (x=0): No left neighbor → eroded
   * - Right edge (x=width-1): No right neighbor → eroded
   *
   * **Time Complexity**: O(n) where n = size (or O(k) if only k cells are non-zero)
   * **Space Complexity**: O(n) - cloned bitboard
   * **Mutation Model**: Returns new bitboard; original unchanged
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with cellSurvivesHorizontalErosion method
   * @param {Uint32Array} bitboard - Input colored bitboard (unchanged)
   * @returns {Uint32Array} Eroded bitboard with edge colors removed, interior colors preserved
   *
   * @example
   * // Erode a horizontal strip [1,2,3,2,1]
   * // Before: [1, 2, 3, 2, 1]  (all occupied)
   * // After:  [0, 2, 3, 2, 0]  (edges eroded, interior survives)
   * const eroded = Store32Morphology.erodeHorizontalCells(store, bitboard)
   *
   * @see erodeVerticalCells - Vertical equivalent
   * @see propagateAdjacentCellsHorizontally - Inverse operation (dilation)
   */
  static erodeHorizontalCells (store, bitboard) {
    const result = bitboard.slice()

    for (let idx = 0; idx < store.size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (value !== 0 && !store.cellSurvivesHorizontalErosion(bitboard, idx)) {
        store.setAtIdx(result, idx, 0)
      }
    }
    return result
  }

  /**
   * Apply vertical erosion for multi-bit stores using neighbor survival rules.
   * Per-cell operation that removes colors from cells without vertical neighbors.
   * A cell survives only if it has an occupied neighbor on both top and bottom.
   *
   * **Algorithm**:
   * 1. Clone input bitboard
   * 2. Iterate all cells
   * 3. Test if cell has top AND bottom neighbors
   * 4. Clear non-surviving cells
   *
   * **Neighbor Requirement**: A cell at (x, y) survives iff:
   * - Cell is non-empty
   * - Cell at (x, y-1) is non-empty (top neighbor)
   * - Cell at (x, y+1) is non-empty (bottom neighbor)
   * - Top/bottom edge cells are always eroded
   *
   * **Boundary Handling**: Via row checks
   * - Top edge (y=0): No top neighbor → eroded
   * - Bottom edge (y=height-1): No bottom neighbor → eroded
   *
   * **Time Complexity**: O(n) where n = size
   * **Space Complexity**: O(n) - cloned bitboard
   * **Mutation Model**: Returns new bitboard
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with cellSurvivesVerticalErosion method
   * @param {Uint32Array} bitboard - Input colored bitboard (unchanged)
   * @param {number} gridWidth - Grid width in cells (used for neighbor offset calculation)
   * @returns {Uint32Array} Eroded bitboard with top/bottom edge colors removed
   *
   * @example
   * // Erode a vertical strip in 5x3 grid
   * // Before: column of 5 cells, all occupied
   * // After:  top and bottom cells eroded, middle 3 survive
   * const eroded = Store32Morphology.erodeVerticalCells(store, bitboard, 5)
   *
   * @see erodeHorizontalCells - Horizontal equivalent
   */
  static erodeVerticalCells (store, bitboard, gridWidth) {
    const result = bitboard.slice()

    for (let idx = 0; idx < store.size; idx++) {
      const value = store.getIdx(bitboard, idx)
      if (
        value !== 0 &&
        !store.cellSurvivesVerticalErosion(bitboard, idx, gridWidth)
      ) {
        store.setAtIdx(result, idx, 0)
      }
    }
    return result
  }

  /**
   * Build an inverted edge mask for horizontal erosion constraints.
   * Delegates to store helper for format-specific mask generation and inversion.
   *
   * **Purpose**: Creates inverted masks for boundary-aware constraint calculation
   * during erosion operations. Inversion flips 0s and 1s to use in AND operations.
   *
   * **Mask Inversion Logic**:
   * - Original mask (e.g., notLeft): 1s where expansion IS allowed
   * - Inverted mask: 0s where expansion IS allowed (for AND erosion logic)
   * - Inverted masks force edge cells to 0 (eroded away)
   *
   * **Time Complexity**: O(w) where w = word count
   * **Space Complexity**: O(w) - inverted array
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with _createInvertedMask method
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration
   * @param {string} maskKey - Key of mask to invert (e.g., 'notLeft', 'notRight')
   * @returns {Uint32Array} Inverted edge mask value (0 where originally 1)
   *
   * @example
   * // Invert notLeft mask to get leftEdge erasure mask
   * const eraseMask = Store32Morphology.computeInvertedEdgeMask(store, edgeMasks, 'notLeft')
   * // Result: bit pattern with 0s at left edge, 1s elsewhere
   */
  static computeInvertedEdgeMask (store, edgeMasks, maskKey) {
    return store._createInvertedMask(edgeMasks, maskKey)
  }

  /**
   * Create horizontal erosion constraints from a shift and inverted mask.
   * Shifts bitboard and combines with inverted mask for erosion boundary.
   *
   * **Purpose**: Builds a constraint pattern that represents valid neighbor positions.
   * Used in conjunction with the original bitboard via AND to enforce neighbor requirements.
   *
   * **Algorithm**:
   * 1. Shift bitboard by specified amount (left or right for neighbor detection)
   * 2. OR result with inverted mask (inverted mask = 0s at boundary where eroding)
   * 3. Result: 0s at positions that should be eroded, 1s where neighbors exist
   *
   * **Time Complexity**: O(w)
   * **Space Complexity**: O(w)
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with shiftBits and bitOr methods
   * @param {Uint32Array} bitboard - Input bitboard to shift
   * @param {number} bitShift - Number of bits to shift per word (positive=left, negative=right)
   * @param {Uint32Array} invertedMask - Inverted edge mask to apply (0s at boundary)
   * @returns {Uint32Array} Constraint bitboard for erosion (0s = erode, 1s = keep)
   */
  static computeHorizontalConstraintFromShift (
    store,
    bitboard,
    bitShift,
    invertedMask
  ) {
    const shiftedNeighbor = store.shiftBits(bitboard, bitShift)
    return store.bitOr(shiftedNeighbor, invertedMask)
  }

  /**
   * Compute horizontal erosion constraints for Store32.
   * Calculates left and right neighbor constraints for erosion operation.
   *
   * **Algorithm**:
   * 1. Invert notLeft mask to get left-boundary erasure mask
   * 2. Invert notRight mask to get right-boundary erasure mask
   * 3. Compute left constraint: cells with right neighbors (shifted right, inverted left mask)
   * 4. Compute right constraint: cells with left neighbors (shifted left, inverted right mask)
   * 5. Return both constraints
   *
   * **Erosion Rule**: Cell survives iff (bitboard AND leftConstraint AND rightConstraint)
   *
   * **Time Complexity**: O(w)
   * **Space Complexity**: O(w) - two constraint arrays
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with helper methods
   * @param {Uint32Array} bitboard - Input bitboard to process
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration
   * @param {number} bitShift - Bit shift amount (usually bitsPerCell)
   * @returns {ConstraintPair} Left and right neighbor constraints
   */
  static computeHorizontalErodeConstraints (
    store,
    bitboard,
    edgeMasks,
    bitShift
  ) {
    const invNotLeft = Store32Morphology.computeInvertedEdgeMask(
      store,
      edgeMasks,
      'notLeft'
    )
    const invNotRight = Store32Morphology.computeInvertedEdgeMask(
      store,
      edgeMasks,
      'notRight'
    )

    const leftConstraint =
      Store32Morphology.computeHorizontalConstraintFromShift(
        store,
        bitboard,
        bitShift,
        invNotLeft
      )
    const rightConstraint =
      Store32Morphology.computeHorizontalConstraintFromShift(
        store,
        bitboard,
        -bitShift,
        invNotRight
      )

    return { leftConstraint, rightConstraint }
  }

  /**
   * Apply horizontal erosion for 1-bit Store32.
   * Removes cells that lack horizontal neighbors using shift-based constraints.
   *
   * **Algorithm**:
   * 1. If no edge masks provided, return unmodified bitboard (no-op for infinite grids)
   * 2. Compute left and right neighbor constraints from bitboard shifts
   * 3. AND bitboard with both constraints (cell survives only if constraints satisfied)
   * 4. Result: only cells with neighbors in both directions remain
   *
   * **Constraint Computation**:
   * - Left constraint: Cells with right neighbors (shifted right)
   * - Right constraint: Cells with left neighbors (shifted left)
   * - Both constraints inverted at boundaries to clear edge cells
   *
   * **Boundary Handling**: Via edge masks (notLeft, notRight)
   * - notLeft: cells that can look left (not in left column)
   * - notRight: cells that can look right (not in right column)
   *
   * **Time Complexity**: O(w) where w = word count
   * **Space Complexity**: O(w) - intermediate constraint arrays
   * **Mutation Model**: Returns new bitboard
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with shiftBits and bitAnd methods
   * @param {Uint32Array} bitboard - Input 1-bit bitboard (unchanged)
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration (optional, but needed for boundary)
   * @returns {Uint32Array} Eroded bitboard with edge cells removed
   *
   * @example
   * // Erode occupancy grid
   * // Input grid:  [1, 1, 1, 1, 1]  (all occupied)
   * // Output grid: [0, 1, 1, 1, 0]  (edges eroded, middle survives)
   * const eroded = Store32Morphology.erodeHorizontalShift(store, bitboard, edgeMasks)
   *
   * @see erodeVerticalShift - Vertical equivalent
   * @see propagateVerticalShift - Inverse operation (dilation)
   */
  static erodeHorizontalShift (store, bitboard, edgeMasks) {
    if (!edgeMasks) return bitboard

    const bitShift = store.bitsPerCell
    const { leftConstraint, rightConstraint } =
      Store32Morphology.computeHorizontalErodeConstraints(
        store,
        bitboard,
        edgeMasks,
        bitShift
      )

    return store.bitAnd(store.bitAnd(bitboard, leftConstraint), rightConstraint)
  }

  /**
   * Compute vertical erosion constraints for Store32.
   * Calculates up and down neighbor constraints for vertical erosion.
   *
   * **Algorithm**: Delegates to store helpers for constraint calculation at specific shifts.
   *
   * **Purpose**: Creates constraints that when AND'ed with the bitboard will:
   * - Remove top-row cells (no top neighbors)
   * - Remove bottom-row cells (no bottom neighbors)
   * - Keep interior cells with both neighbors
   *
   * **Time Complexity**: O(w)
   * **Space Complexity**: O(w)
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with computation helpers
   * @param {Uint32Array} bitboard - Input bitboard to process
   * @param {number} gridWidth - Width in cells (for shift calculation)
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration
   * @param {number} bitShift - Bit shift amount (gridWidth * bitsPerCell)
   * @returns {VerticalConstraints} Up and down neighbor constraints
   */
  static computeVerticalErodeConstraints (
    store,
    bitboard,
    gridWidth,
    edgeMasks,
    bitShift
  ) {
    const upShifted = store._computeVerticalConstraintFromShift(
      bitboard,
      edgeMasks,
      'notTop',
      -bitShift
    )
    const downShifted = store._computeVerticalConstraintFromShift(
      bitboard,
      edgeMasks,
      'notBottom',
      bitShift
    )
    return { upShifted, downShifted }
  }

  /**
   * Apply vertical erosion for 1-bit Store32.
   * Removes cells that lack vertical neighbors using shift-based constraints.
   *
   * **Algorithm**:
   * 1. Calculate vertical bit shift (gridWidth * bitsPerCell bits between rows)
   * 2. Compute up and down neighbor constraints
   * 3. AND bitboard with both constraints
   * 4. Apply full-bits mask to each word
   *
   * **Constraint Propagation**:
   * - Up constraint: Prevents top-edge cells from surviving
   * - Down constraint: Prevents bottom-edge cells from surviving
   * - Both must be satisfied (AND) for cell to survive
   *
   * **Boundary Handling**: Via edge masks (notTop, notBottom) and full-bits mask
   *
   * **Time Complexity**: O(w) where w = word count
   * **Space Complexity**: O(w) - intermediate arrays
   *
   * @static
   * @param {Store32Instance} store - Store32 instance with shiftBits and bitAnd methods
   * @param {Uint32Array} bitboard - Input 1-bit bitboard (unchanged)
   * @param {number} gridWidth - Width in cells (for neighbor offset)
   * @param {EdgeMasks|undefined} edgeMasks - Edge masks configuration (optional)
   * @returns {Uint32Array} Eroded bitboard with top/bottom edge cells removed
   *
   * @example
   * // Erode vertical occupancy in 5x5 grid
   * // Top and bottom rows eroded, middle rows survive
   * const eroded = Store32Morphology.erodeVerticalShift(store, bitboard, 5, edgeMasks)
   *
   * @see erodeHorizontalShift - Horizontal equivalent
   */
  static erodeVerticalShift (store, bitboard, gridWidth, edgeMasks) {
    const bitShift = store._calculateVerticalBitShift(gridWidth)
    const { upShifted, downShifted } =
      Store32Morphology.computeVerticalErodeConstraints(
        store,
        bitboard,
        gridWidth,
        edgeMasks,
        bitShift
      )

    const result = store.createEmptyBitboard(bitboard)
    const fullMask = store.fullBits
    for (let i = 0; i < result.length; i++) {
      result[i] =
        (store.bitAnd(store.bitAnd(bitboard, upShifted), downShifted)[i] &
          fullMask[i]) >>>
        0
    }
    return result
  }
}
