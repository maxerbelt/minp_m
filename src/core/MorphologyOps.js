/**
 * Pure morphology operations and bit manipulation utilities
 * No side effects - all functions return new values
 */

// ============================================================================
// BIT COMPARISON & VALIDATION
// ============================================================================

/**
 * Compare two bitboards for equality
 * Handles primitives (BigInt, number), arrays, typed arrays, and objects
 */
export function bitsChanged (a, b) {
  if (a === b) return false
  if (typeof a !== 'object' || a === null) return true
  if (
    Array.isArray(a) ||
    ArrayBuffer.isView(a) ||
    typeof a.length === 'number'
  ) {
    if (a.length !== b.length) return true
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return true
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
 * @param {*} bits - Bits value to clone
 * @param {object} [mask] - Optional mask/packed instance that may provide clone helpers
 * @returns {*} Detached copy of `bits`
 */
function cloneBitsValue (bits, mask) {
  if (mask?.cloneBits !== undefined) {
    return mask.cloneBits
  }
  if (mask?.store?.clone === 'function') {
    return mask.store.clone(bits)
  }
  if (typeof bits === 'bigint' || typeof bits === 'number') return bits
  if (Array.isArray(bits)) return bits.slice()
  if (ArrayBuffer.isView(bits)) return new bits.constructor(bits)
  if (bits && typeof bits.length === 'number') return Array.from(bits)
  return bits
}

/**
 * Check if a bitboard is completely full
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
  if (bb.length !== templatePacked.store.words) {
    const out = templatePacked.store.newWords()
    if (bb.length <= out.length) {
      out.set(bb)
    } else {
      // Handle both typed arrays (with subarray) and regular arrays (with slice)
      const slice =
        typeof bb.subarray === 'function'
          ? bb.subarray(0, out.length)
          : bb.slice(0, out.length)
      out.set(slice)
    }
    return out
  }
  return bb
}

/**
 * Copy per-cell occupancy from multi-bit Packed into 1-bit Packed
 * Avoids word-size/endianness normalization issues
 */
export function copyOccupancyBitsExact (sourcePacked, targetPacked) {
  let out = targetPacked.store.newWords()
  if (sourcePacked?.store?.indexer) {
    const size = sourcePacked.indexer.size
    for (let i = 0; i < size; i++) {
      const v = sourcePacked.store.getIdx(sourcePacked.bits, i)
      if (v) {
        out = targetPacked.store.setIdx(out, i, 1n)
      }
    }
    return out
  }
  // If sourcePacked is a Packed but doesn't have store/indexer, use its bits
  if (sourcePacked?.bits) {
    return normalizeBits(sourcePacked.bits, targetPacked)
  }
  return normalizeBits(sourcePacked, targetPacked)
}

// ============================================================================
// OCCUPANCY GRID OPERATIONS
// ============================================================================

/**
 * Create an occupancy grid (1-bit) from a multi-bit packed grid
 */
export function createOccupancyGrid (packed, Packed) {
  const occ = new Packed(packed.width, packed.height, null, null, 1)
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
 */
/**
 * Check if a morphology operation will change a mask's bits without
 * mutating the original mask.
 * @param {any} mask - Mask/packed object with `bits`, `clone` and optional clone helpers
 * @param {'dilate'|'erode'|'cross'} operation - Morphology operation to test
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
 */
/**
 * Check if a morphology operation will change an occupancy grid without
 * mutating the original.
 * @param {any} occupancy - Packed/occupancy object with `bits` and `clone`
 * @param {'dilate'|'erode'|'cross'} operation - Morphology operation to test
 * @returns {boolean} True when the operation would change the occupancy bits
 */
export function checkMorphologyChange (occupancy, operation) {
  const before = cloneBitsValue(occupancy.bits, occupancy)
  const clone = occupancy.clone
  clone.bits = cloneBitsValue(before, occupancy)

  applyOperation(operation, clone)

  return bitsChanged(before, clone.bits)
}

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
 * @param {any} maskObj - Mask or packed object
 * @param {'dilate'|'erode'|'cross'} operation - Operation to apply
 * @param {(a: any, b: any) => boolean} bitsComparer - Comparison function
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
 * @param {*} a
 * @param {*} b
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
 */
export function findNeighborColor (packed, x, y) {
  for (const [nx, ny] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1]
  ]) {
    if (nx >= 0 && nx < packed.width && ny >= 0 && ny < packed.height) {
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
 */
export function colorAddedCells (packed, addedCells) {
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
 */
export function clearRemovedCells (packed, removedCells) {
  for (const [x, y] of packed.indexer.bitsToCoords(removedCells)) {
    packed.set(x, y, 0)
  }
}
