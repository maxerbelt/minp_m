/**
 * Pure morphology operations and bit manipulation utilities
 * No side effects - all functions return new values
 */

/**
 * @typedef {bigint|number|Array<number>|Uint32Array|Uint16Array|Uint8Array|Int32Array} Bitboard
 * @typedef {'dilate'|'erode'|'cross'} MorphologyOperation
 * @typedef {{ bits: Bitboard, width:number, height:number, depth?:number, store?:StoreLike, indexer?:any, clone?:any }} MaskLike
 * @typedef {{ bits: Bitboard, width:number, height:number, store?:StoreLike, indexer?:any, clone?:any, at?:Function, set?:Function }} PackedLike
 * @typedef {{ newWords: Function, clone: Function, bitSub: Function, setIdx?: Function, value: Function, words?:number, set?:Function, getIdx?:Function }} StoreLike
 * @typedef {{ bits: Bitboard, clone?:any, cloneBits?:any, store?:StoreLike }} CloneSource
 * @typedef {{ bits: Bitboard, clone?:any, store?:StoreLike, indexer?:any }} MorphologyMask
 */

// ============================================================================
// BIT COMPARISON & VALIDATION
// ============================================================================

/**
 * Compare two bitboards for equality
 * Handles primitives (BigInt, number), arrays, typed arrays, and objects
 * @param {Bitboard} a
 * @param {Bitboard} b
 * @returns {boolean}
 */
export function bitsChanged (a, b) {
  if (a === b) return false
  if (typeof a !== 'object' || a === null) return true
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
 * Helper to make a safe, detached copy of bits for comparison or mutation.
 * Tries known clone helpers on the mask/store, otherwise falls back to
 * sensible shallow-copy strategies for arrays, typed arrays, BigInts and
 * numbers.
 * @param {Bitboard} bits - Bits value to clone
 * @param {CloneSource|MaskLike|PackedLike} [mask] - Optional mask/packed instance that may provide clone helpers
 * @returns {Bitboard} Detached copy of `bits`
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
 * Check if a bitboard is completely full
 * @param {Bitboard} bits
 * @param {Bitboard|number} fullBits
 * @returns {boolean}
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
 * Normalize bitboard to correct word count for a Packed of same size
 * Handles BigInt masks by splitting into words
 * @param {Bitboard} bb
 * @param {{store: StoreLike}} templatePacked
 * @returns {Bitboard}
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
  if (typeof bb !== 'object' || bb === null) {
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
 * Copy per-cell occupancy from multi-bit Packed into 1-bit Packed
 * Avoids word-size/endianness normalization issues
 * @param {Bitboard|PackedLike} sourcePacked
 * @param {{store: StoreLike, indexer?:any, bits?:Bitboard}} targetPacked
 * @returns {Bitboard}
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
 * Create an occupancy grid (1-bit) from a multi-bit packed grid
 * @param {PackedLike} packed
 * @param {Function} Packed
 * @returns {any}
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
 * Check if morphology operation would change the mask bits
 * Returns true if operation changes the bits, false if no change
 *
 * Check if a morphology operation will change a mask's bits without
 * mutating the original mask.
 * @param {MorphologyMask} mask - Mask/packed object with `bits`, `clone` and optional clone helpers
 * @param {MorphologyOperation} operation - Morphology operation to test
 * @returns {boolean} True when the operation would change the bits
 */
export function checkMorphologyState (mask, operation) {
  const original = cloneBitsValue(mask.bits, mask)
  const clone = mask.clone
  clone.bits = cloneBitsValue(original, mask)

  applyOperation(operation, clone)

  return !areBitsEqual(original, clone.bits)
}

/**
 * Check if morphology operation would change occupancy grid
 * Returns true if operation changes the bits, false if no change
 *
 * Check if a morphology operation will change an occupancy grid without
 * mutating the original.
 * @param {MorphologyMask} occupancy - Packed/occupancy object with `bits` and `clone`
 * @param {MorphologyOperation} operation - Morphology operation to test
 * @returns {boolean} True when the operation would change the occupancy bits
 */
export function checkMorphologyChange (occupancy, operation) {
  const before = cloneBitsValue(occupancy.bits, occupancy)
  const clone = occupancy.clone
  clone.bits = cloneBitsValue(before, occupancy)

  applyOperation(operation, clone)

  return bitsChanged(before, clone.bits)
}

/**
 * Apply a morphology operation to a clone object.
 * @param {MorphologyOperation} operation
 * @param {any} clone
 */
function applyOperation (operation, clone) {
  if (operation === 'dilate') clone.dilate()
  else if (operation === 'erode') clone.erode()
  else if (operation === 'cross') clone.dilateCross()
}

/**
 * Check if morphology operation would change a masked object
 * Uses provided comparison function
 */
/**
 * Compute whether an operation changes a masked object using a custom comparer.
 * @param {MorphologyMask} maskObj - Mask or packed object
 * @param {MorphologyOperation} operation - Operation to apply
 * @param {(a: Bitboard, b: Bitboard) => boolean} bitsComparer - Comparison function
 * @returns {boolean} Result of `bitsComparer(original, after)`
 */
export function computeMorphologyState (maskObj, operation, bitsComparer) {
  const original = cloneBitsValue(maskObj.bits, maskObj)
  const clone = maskObj.clone
  clone.bits = cloneBitsValue(original, maskObj)
  applyOperation(operation, clone)
  return bitsComparer(original, clone.bits)
}

/**
 * Get bitmap differences (added/removed cells) from morphology operation
 * Returns {added, removed, after} where after is the modified clone
 * @param {MorphologyMask} occupancy
 * @param {MorphologyOperation} operation
 * @returns {{added:any, removed:any, after:any}}
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
 * Small helper to test bit equality using existing helpers.
 * @param {Bitboard} a
 * @param {Bitboard} b
 * @returns {boolean}
 */
function areBitsEqual (a, b) {
  if (a === b) return true
  return !bitsChanged(a, b)
}

// ============================================================================
// COLOR PROPAGATION HELPERS
// ============================================================================

/**
 * Find a colored neighbor for a given empty cell
 * Checks cardinal directions (up, down, left, right)
 * @param {PackedLike} packed
 * @param {number} x
 * @param {number} y
 * @returns {number}
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
 * Color newly added cells based on adjacent occupied cells
 * Modifies packed grid in place
 * @param {PackedLike} packed
 * @param {*} addedCells
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
 * Remove colors from cells that are no longer occupied
 * Modifies packed grid in place
 * @param {PackedLike} packed
 * @param {*} removedCells
 */
export function clearRemovedCells (packed, removedCells) {
  if (!packed.indexer?.bitsToCoords || !packed.set) return
  for (const [x, y] of packed.indexer.bitsToCoords(removedCells)) {
    packed.set(x, y, 0)
  }
}
