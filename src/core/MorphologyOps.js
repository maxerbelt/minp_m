/**
 * @typedef {bigint|number|Array<number>|Uint32Array|Uint16Array|Uint8Array|Int32Array} Bitboard
 * (See types/grid.types.ts#Bitboard for canonical TypeScript definition)
 * Flexible bitboard representation: scalar (number/BigInt) or array of words (32-bit or 8-bit).
 * Enables efficient grid representation for up to thousands of cells.
 */

/**
 * @typedef {'dilate'|'erode'|'cross'} MorphologyOperation
 * (See types/grid.types.ts#MorphologyOperation for canonical TypeScript definition)
 * Morphological operation type: dilate (expand), erode (shrink), or cross (both combined).
 */

/**
 * @typedef {Object} MaskLike
 * (See types/grid.types.ts#MaskLike for canonical TypeScript definition)
 * Mask object compatible with morphology operations.
 * @property {Bitboard} bits - Bitboard state of the mask
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {number} [depth] - Optional depth/color layers (for multi-bit masks)
 * @property {StoreLike} [store] - Optional store for advanced bitboard operations
 * @property {*} [indexer] - Optional grid indexer (rect, hex, etc.)
 * @property {*} [clone] - Optional pre-allocated clone for mutation
 */

/**
 * @typedef {Object} PackedLike
 * (See types/grid.types.ts#PackedLike for canonical TypeScript definition)
 * Packed grid object with per-cell access methods.
 * @property {Bitboard} bits - Bitboard state
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {StoreLike} [store] - Optional store for advanced operations
 * @property {*} [indexer] - Optional grid indexer
 * @property {*} [clone] - Optional pre-allocated clone
 * @property {Function} [at] - Function(x, y) to get cell value
 * @property {Function} [set] - Function(x, y, value) to set cell
 */

/**
 * @typedef {Object} StoreLike
 * (See types/grid.types.ts#StoreLike for canonical TypeScript definition)
 * Store object providing bitboard manipulation operations.
 * @property {Function} newWords - Creates new word array for this store type
 * @property {Function} clone - Clones a bitboard value
 * @property {Function} bitSub - Bitwise subtraction (remove bits)
 * @property {Function} [setIdx] - Function(bits, index, value) to set at index
 * @property {Function} value - Gets value from store
 * @property {number} [words] - Word count for this store's bitboards
 * @property {Function} [set] - Sets value in store
 * @property {Function} [getIdx] - Function(bits, index) to get at index
 */

/**
 * @typedef {Object} CloneSource
 * (See types/grid.types.ts#CloneSource for canonical TypeScript definition)
 * Object that may provide cloning helpers for bitboards.
 * @property {Bitboard} bits - Bitboard to clone
 * @property {*} [clone] - Optional pre-cloned value
 * @property {*} [cloneBits] - Optional pre-cloned bitboard
 * @property {StoreLike} [store] - Optional store with clone method
 */

/**
 * @typedef {Object} MorphologyMask
 * (See types/grid.types.ts#MorphologyMask for canonical TypeScript definition)
 * Mask object for morphology operations with bits and clone.
 * @property {Bitboard} bits - Current bitboard state
 * @property {*} [clone] - Optional pre-allocated clone for mutation
 * @property {StoreLike} [store] - Optional store for operations
 * @property {*} [indexer] - Optional grid indexer
 */

/**
 * Pure morphology operations and bit manipulation utilities.
 *
 * Provides efficient bitboard-based morphological operations (dilate, erode, cross)
 * and bit manipulation helpers for grid-based games. All functions are pure:
 * they return new values without side effects on inputs.
 *
 * Supports multiple bitboard representations: single number/BigInt, arrays, and
 * typed arrays (Uint32Array, Uint16Array, Uint8Array, Int32Array). Handles complex
 * mask objects with optional clone, store, and indexer helpers.
 *
 * @module MorphologyOps
 * @example
 * // Check if dilate would change a mask
 * const willChange = checkMorphologyState(mask, 'dilate');
 *
 * @example
 * // Get what cells would be added/removed
 * const {added, removed} = getMorphologyDifferences(occupancy, 'dilate');
 */

// ============================================================================
// BIT COMPARISON & VALIDATION
// ============================================================================

/**
 * Compare two bitboards for equality.
 *
 * Returns true if bitboards differ, false if identical. Handles primitives (BigInt, number),
 * arrays, typed arrays, and objects with array-like interfaces. Uses reference equality first,
 * then element-wise comparison for array-like structures.
 *
 * @param {Bitboard} a - First bitboard to compare
 * @param {Bitboard} b - Second bitboard to compare
 * @returns {boolean} True if bitboards differ, false if identical
 * @example
 * bitsChanged(123n, 123n); // false (same value)
 * bitsChanged([1, 2], [1, 2]); // false (same contents)
 * bitsChanged(123n, 124n); // true (different values)
 */
export function bitsChanged (a, b) {
  if (a === b) return false
  if (a == null || typeof a !== 'object') return true
  const aWithLength = /** @type {{length?: number}} */ (a)
  if (
    Array.isArray(a) ||
    ArrayBuffer.isView(a) ||
    typeof aWithLength.length === 'number'
  ) {
    const arrayA = /** @type {ArrayLike<any>} */ (a)
    const arrayB = /** @type {ArrayLike<any>} */ (b)
    if (arrayA.length !== arrayB.length) return true
    for (let i = 0; i < arrayA.length; i++) {
      if (arrayA[i] !== arrayB[i]) return true
    }
    return false
  }
  return true
}

/**
 * Clone a bitboard value safely for mutation or comparison.
 *
 * Creates a detached copy of bitboard bits. Tries to use pre-computed clone helpers on the
 * mask or store first, then falls back to standard cloning strategies: shallow copy for arrays,
 * typed arrays, and identity for primitives (number, BigInt).
 *
 * @private
 * @param {Bitboard} bits - Bits value to clone
 * @param {CloneSource|MaskLike|PackedLike} [mask] - Optional mask/packed instance with clone helpers
 * @returns {Bitboard} Detached copy of `bits`
 * @example
 * const cloned = cloneBitsValue([1, 2, 3], packed); // Returns new array [1, 2, 3]
 * const cloned2 = cloneBitsValue(123n, mask); // Returns same 123n (primitive)
 */
function cloneBitsValue (bits, mask) {
  if (mask && 'cloneBits' in mask && mask.cloneBits !== undefined) {
    return mask.cloneBits
  }
  if (mask?.store && typeof mask.store.clone === 'function') {
    return mask.store.clone(bits)
  }
  if (typeof bits === 'bigint' || typeof bits === 'number') return bits
  if (Array.isArray(bits)) return bits.slice()
  if (ArrayBuffer.isView(bits)) {
    const Constructor = /** @type {new(...args:any[]) => any} */ (
      bits.constructor
    )
    return new Constructor(bits)
  }
  if (bits && typeof bits === 'object') {
    const maybeLength = /** @type {{ length?: unknown }} */ (bits).length
    if (typeof maybeLength === 'number') {
      const iterable = /** @type {{ length: number }} */ (bits)
      return Array.from(iterable)
    }
  }
  return bits
}

/**
 * Check if a bitboard matches the full state (all cells occupied).
 *
 * Compares a bitboard against a full reference bitboard using reference equality or element-wise
 * comparison depending on the bitboard type (scalar vs. array-like).
 *
 * @param {Bitboard} bits - Bitboard to check
 * @param {Bitboard|number} fullBits - Full bitboard reference or scalar value
 * @returns {boolean} True if bits equals fullBits (fully occupied), false otherwise
 * @example
 * isBitboardFull(0xFF, 0xFF); // true (all bits set)
 * isBitboardFull([0xFFFFFFFF], [0xFFFFFFFF]); // true (all words full)
 * isBitboardFull([0xFF, 0x00], [0xFF, 0xFF]); // false (second word not full)
 */
export function isBitboardFull (bits, fullBits) {
  if (typeof bits === 'bigint' || typeof bits === 'number') {
    return bits === fullBits
  }
  if (Array.isArray(bits) || ArrayBuffer.isView(bits)) {
    if (Array.isArray(fullBits) || ArrayBuffer.isView(fullBits)) {
      return (
        bits.length === fullBits.length &&
        bits.every((v, i) => v === fullBits[i])
      )
    }
    if (typeof fullBits === 'number') {
      return bits.every(v => v === fullBits)
    }
  }
  return false
}

// ============================================================================
// BITBOARD NORMALIZATION
// ============================================================================

/**
 * Normalize bitboard to match the word count of a template store.
 *
 * Converts bitboards to the correct word-array format for a given store. Handles BigInt by
 * extracting 32-bit words, small scalars by creating a single-word array, and array/typed-array
 * inputs by padding or trimming to match the target word count.
 *
 * @param {Bitboard} bb - Bitboard to normalize
 * @param {{store: StoreLike}} templatePacked - Template with store defining target word count
 * @returns {Bitboard} Normalized bitboard matching template store's word format
 * @example
 * const packed = new Packed(5, 5, 2); // 2-bit cells
 * const normalized = normalizeBits(0x123456789ABCDEFn, packed); // BigInt split into words
 */
export function normalizeBits (bb, templatePacked) {
  if (typeof bb === 'bigint') {
    const out = templatePacked.store.newWords()
    let tmp = bb
    for (let i = 0; i < out.length; i++) {
      out[i] = Number(tmp & BigInt(0xffffffff))
      tmp = tmp >> BigInt(32)
    }
    return out
  }
  if (bb == null || typeof bb !== 'object') {
    const out = templatePacked.store.newWords()
    out[0] = Number(bb)
    return out
  }

  const bitsArray =
    /** @type {ArrayLike<number> & { subarray?: Function, slice?: Function }} */ (
      bb
    )
  if (bitsArray.length !== templatePacked.store.words) {
    const out = templatePacked.store.newWords()
    if (bitsArray.length <= out.length) {
      out.set(bitsArray)
    } else {
      // Handle both typed arrays (with subarray) and regular arrays (with slice)
      const slice =
        typeof bitsArray.subarray === 'function'
          ? bitsArray.subarray(0, out.length)
          : /** @type {{ slice: Function }} */ (bitsArray).slice(0, out.length)
      out.set(slice)
    }
    return out
  }
  return bb
}

/**
 * Copy occupancy bits from a multi-bit grid to a 1-bit occupancy grid.
 *
 * Transfers occupancy information (whether cells are occupied, regardless of color) from a
 * multi-bit grid to a 1-bit grid. Uses per-cell indexing when available to avoid word-size
 * and endianness issues. Falls back to bitboard normalization if indexer unavailable.
 *
 * @param {Bitboard|PackedLike} sourcePacked - Source grid (may be multi-bit)
 * @param {{store: StoreLike, indexer?: any, bits?: Bitboard}} targetPacked - Target 1-bit occupancy grid
 * @returns {Bitboard} New bitboard with occupancy copied to target format
 * @example
 * const occupancy = copyOccupancyBitsExact(coloredGrid, occupancyGrid);
 */
export function copyOccupancyBitsExact (sourcePacked, targetPacked) {
  let out = /** @type {any} */ (targetPacked.store.newWords())
  if (
    sourcePacked &&
    typeof sourcePacked === 'object' &&
    'indexer' in sourcePacked &&
    sourcePacked.indexer &&
    sourcePacked.store?.getIdx &&
    targetPacked.store?.setIdx
  ) {
    const size = sourcePacked.indexer.size
    for (let i = 0; i < size; i++) {
      const v = sourcePacked.store.getIdx(sourcePacked.bits, i)
      if (v) {
        out = targetPacked.store.setIdx(out, i, 1n)
      }
    }
    return out
  }
  if (
    sourcePacked &&
    typeof sourcePacked === 'object' &&
    'bits' in sourcePacked &&
    sourcePacked.bits
  ) {
    const bits = /** @type {Bitboard} */ (sourcePacked.bits)
    return normalizeBits(bits, targetPacked)
  }
  return normalizeBits(/** @type {Bitboard} */ (sourcePacked), targetPacked)
}

// ============================================================================
// OCCUPANCY GRID OPERATIONS
// ============================================================================

/**
 * Create a 1-bit occupancy grid from a multi-bit packed grid.
 *
 * Instantiates a new 1-bit Packed grid with same width/height/indexer as source, then copies
 * occupancy data (ignoring color information). Used to create binary masks for morphology
 * operations on colored grids.
 *
 * @param {PackedLike} packed - Source packed grid (may be multi-bit)
 * @param {Function} Packed - Constructor function for Packed grid (e.g., RectPacked)
 * @returns {any} New 1-bit Packed grid with occupancy from source
 * @example
 * const coloredGrid = new RectPacked(10, 10, null, null, 3); // 3-bit colors
 * const occupancy = createOccupancyGrid(coloredGrid, RectPacked); // 1-bit occupancy
 */
export function createOccupancyGrid (packed, Packed) {
  const Constructor = /** @type {new(...args:any[]) => any} */ (Packed)
  const occ = new Constructor(packed.width, packed.height, null, null, 1)
  // Copy bits directly from source to occupancy grid
  occ.bits = copyOccupancyBitsExact(packed, occ)
  return occ
}

// ============================================================================
// MORPHOLOGY OPERATION CHECKING
// ============================================================================

/**
 * Check if a morphology operation would change a mask without mutation.
 *
 * Tests whether applying a morphology operation (dilate, erode, cross) would result in
 * a different mask. Uses cloning to avoid mutating the original mask or its clone.
 *
 * @param {MorphologyMask} mask - Mask object with `bits` and `clone` properties
 * @param {MorphologyOperation} operation - Morphology operation: 'dilate', 'erode', or 'cross'
 * @returns {boolean} True if operation would change the bits, false if no effect
 * @example
 * if (checkMorphologyState(mask, 'dilate')) {
 *   // Dilate would expand the mask
 * }
 */
export function checkMorphologyState (mask, operation) {
  const original = cloneBitsValue(mask.bits, mask)
  const clone = mask.clone
  clone.bits = cloneBitsValue(original, mask)

  applyOperation(operation, clone)

  return !areBitsEqual(original, clone.bits)
}

/**
 * Check if a morphology operation would change an occupancy grid without mutation.
 *
 * Tests whether applying a morphology operation would change the occupancy bits of a grid.
 * Uses bitwise comparison to detect any differences, making it efficient for large grids.
 *
 * @param {MorphologyMask} occupancy - Occupancy object with `bits` and `clone` properties
 * @param {MorphologyOperation} operation - Morphology operation: 'dilate', 'erode', or 'cross'
 * @returns {boolean} True if operation would change occupancy bits, false if no effect
 * @example
 * if (checkMorphologyChange(occupancy, 'erode')) {
 *   // Erode would shrink the occupancy
 * }
 */
export function checkMorphologyChange (occupancy, operation) {
  const before = cloneBitsValue(occupancy.bits, occupancy)
  const clone = occupancy.clone
  clone.bits = cloneBitsValue(before, occupancy)

  applyOperation(operation, clone)

  return bitsChanged(before, clone.bits)
}

/**
 * Apply a morphology operation to a clone object in-place.
 *
 * Mutates the clone's bits by calling the appropriate method based on operation type.
 *
 * @private
 * @param {MorphologyOperation} operation - Operation to apply: 'dilate', 'erode', or 'cross'
 * @param {any} clone - Clone object with dilate(), erode(), dilateCross() methods
 * @throws {Error} If clone lacks required morphology methods
 */
function applyOperation (operation, clone) {
  if (operation === 'dilate') clone.dilate()
  else if (operation === 'erode') clone.erode()
  else if (operation === 'cross') clone.dilateCross()
}

/**
 * Compute whether an operation changes a masked object using a custom comparison function.
 *
 * Applies a morphology operation to a clone and uses the provided comparer function to
 * determine if the bits changed. Allows custom comparison logic (e.g., bitsChanged for arrays).
 *
 * @param {MorphologyMask} maskObj - Mask or packed object with bits and clone
 * @param {MorphologyOperation} operation - Operation to apply: 'dilate', 'erode', or 'cross'
 * @param {Function} bitsComparer - Comparison function(originalBits, newBits) returning boolean
 * @returns {boolean} Result of `bitsComparer(originalBits, resultBits)`
 * @example
 * const changed = computeMorphologyState(mask, 'dilate', bitsChanged);
 */
export function computeMorphologyState (maskObj, operation, bitsComparer) {
  const original = cloneBitsValue(maskObj.bits, maskObj)
  const clone = maskObj.clone
  clone.bits = cloneBitsValue(original, maskObj)
  applyOperation(operation, clone)
  return bitsComparer(original, clone.bits)
}

/**
 * Get bitmap differences (added and removed cells) from a morphology operation.
 *
 * Applies a morphology operation and computes which cells were added and which were removed
 * using bitwise subtraction. Returns the modified clone for further operations.
 *
 * @param {MorphologyMask} occupancy - Occupancy object with bits, clone, and store
 * @param {MorphologyOperation} operation - Operation to apply: 'dilate', 'erode', or 'cross'
 * @returns {{added: any, removed: any, after: any}} Object with added cells, removed cells, and modified clone
 * @example
 * const {added, removed, after} = getMorphologyDifferences(occ, 'dilate');
 * // added: cells that become occupied
 * // removed: cells that become empty
 * // after: modified occupancy grid
 */
export function getMorphologyDifferences (occupancy, operation) {
  const before = cloneBitsValue(occupancy.bits, occupancy)
  const clone = occupancy.clone
  clone.bits = cloneBitsValue(before, occupancy)

  applyOperation(operation, clone)

  const added = clone.store.bitSub(clone.bits, before)
  const removed = clone.store.bitSub(before, clone.bits)

  return { added, removed, after: clone }
}

/**
 * Test bit equality using existing helper functions.
 *
 * Returns true if two bitboards are equal, false if they differ.
 * Handles all bitboard types (scalar, array, typed array).
 *
 * @private
 * @param {Bitboard} a - First bitboard
 * @param {Bitboard} b - Second bitboard
 * @returns {boolean} True if equal, false if different
 */
function areBitsEqual (a, b) {
  if (a === b) return true
  return !bitsChanged(a, b)
}

// ============================================================================
// COLOR PROPAGATION HELPERS
// ============================================================================

/**
 * Find the color of a neighboring occupied cell.
 *
 * Checks cardinal neighbors (up, down, left, right) for a given cell position
 * and returns the color of the first occupied neighbor found. Returns 0 if no
 * occupied neighbors exist. Useful for color propagation during morphology operations.
 *
 * @param {PackedLike} packed - Grid with at() method and width/height properties
 * @param {number} x - Column coordinate
 * @param {number} y - Row coordinate
 * @returns {number} Color value of first occupied neighbor, or 0 if none found
 * @example
 * const color = findNeighborColor(grid, 5, 5); // Gets color from adjacent cell
 */
export function findNeighborColor (packed, x, y) {
  for (const [nx, ny] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1]
  ]) {
    if (
      nx >= 0 &&
      nx < packed.width &&
      ny >= 0 &&
      ny < packed.height &&
      packed.at
    ) {
      const neighborColor = packed.at(nx, ny)
      if (neighborColor !== 0) {
        return neighborColor
      }
    }
  }
  return 0
}

/**
 * Color newly added cells based on adjacent occupied cells.
 *
 * Iterates through newly added cells and assigns colors from neighboring occupied cells.
 * Mutates the packed grid in-place. Used after dilation to propagate colors into expanded regions.
 * Requires packed to have indexer.bitsToCoords(), at(), and set() methods.
 *
 * @param {PackedLike} packed - Grid with indexer, at(), and set() methods
 * @param {*} addedCells - Bitboard of newly added cells to color
 * @returns {void} Modifies packed in-place
 * @example
 * const {added} = getMorphologyDifferences(grid, 'dilate');
 * colorAddedCells(grid, added); // Colors new cells from neighbors
 */
export function colorAddedCells (packed, addedCells) {
  if (!packed.indexer?.bitsToCoords || !packed.at || !packed.set) return
  for (const [x, y] of packed.indexer.bitsToCoords(addedCells)) {
    const currentColor = packed.at(x, y)
    if (currentColor === 0) {
      const color = findNeighborColor(packed, x, y)
      if (color !== 0) {
        packed.set(x, y, color)
      }
    }
  }
}

/**
 * Clear colors from cells that are no longer occupied.
 *
 * Iterates through removed cells and sets their values to 0 (empty). Mutates the packed grid
 * in-place. Used after erosion to clear colors from cells that are no longer occupied.
 * Requires packed to have indexer.bitsToCoords() and set() methods.
 *
 * @param {PackedLike} packed - Grid with indexer and set() method
 * @param {*} removedCells - Bitboard of cells to clear
 * @returns {void} Modifies packed in-place
 * @example
 * const {removed} = getMorphologyDifferences(grid, 'erode');
 * clearRemovedCells(grid, removed); // Clears colors from eroded cells
 */
export function clearRemovedCells (packed, removedCells) {
  if (!packed.indexer?.bitsToCoords || !packed.set) return
  for (const [x, y] of packed.indexer.bitsToCoords(removedCells)) {
    packed.set(x, y, 0)
  }
}
