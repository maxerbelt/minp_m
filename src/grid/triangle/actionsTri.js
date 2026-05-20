import { lazy } from '../../core/utilities.js'
import { buildTransformTriMap } from './buildTransformTriMap.js'
import { ActionsBase } from '../ActionsBase.js'
import { BigOne } from '../bitStore/helpers/bigbits.js'

/**
 * @typedef {Object} TriIndexer
 * @property {number} size - Total number of cells in triangular grid
 * @property {(index: number) => number[] | undefined} location - Convert index to [row, col] coordinates
 * @property {(row: number, col: number) => number | undefined} index - Convert [row, col] to linear index
 * @property {(bitboard: bigint) => IterableIterator<number>} bitsIndices - Iterate indices of set bits
 */

/**
 * @typedef {Object} BitboardStore
 * @property {(radius: number) => *} storeType - Convert radius to store representation
 */

/**
 * @typedef {Object} TriangleMask
 * @property {BitboardStore} [store] - Bitboard store implementation with storage operations
 * @property {TriIndexer} [indexer] - Triangle grid indexer with location/index conversion methods
 * @property {Object} [cube] - Optional cube coordinate helper
 * @property {bigint} [bits] - Template bitboard (set bits represent occupied cells)
 */

/**
 * @typedef {Object} TriangleTransformMap
 * @property {Record<string, (number | number[])>} maps - Transformation maps indexed by name
 *   Keys: 'E' (identity), 'R120', 'R240' (rotations), 'F0', 'F1', 'F2' (reflections)
 *   Values: Index mapping arrays or single index
 */

/**
 * Coordinate pair [row, col] for triangular grid positioning.
 * @typedef {number[]} CoordinatePair
 *   Index 0: Row coordinate (0-indexed, 0 = top apex)
 *   Index 1: Column coordinate (0-indexed, range 0 to 2*row)
 */

/**
 * Triangle grid Actions handler with D3 symmetry.
 * Handles 120° rotations and reflections (3 axes).
 * Extends ActionsBase to provide triangle-specific normalization and classification.
 *
 * D3 Dihedral Group:
 * - 3 rotational symmetries (0°, 120°, 240°)
 * - 3 reflection axes (aligned with triangle corners)
 * - Total: 6 symmetry operations
 *
 * Grid Layout (row-column coordinates):
 * ```
 * Row 0:        [0,0]              (1 cell: apex)
 * Row 1:      [1,0] [1,1] [1,2]    (3 cells)
 * Row 2:    [2,0] [2,1] [2,2] [2,3] [2,4]  (5 cells)
 * Row r: has (2*r+1) cells
 * ```
 */
export class ActionsTri extends ActionsBase {
  /**
   * Create Actions handler for a triangular grid.
   * @param {number} side - Number of rows (pyramid height, e.g., side=3 → 3 rows)
   * @param {TriangleMask|null} [mask=null] - Optional Mask object with store, indexer, cube, bits
   *   If provided, template and transformMaps are computed from this mask.
   *   If null, template defaults to 0n and transformMaps must be set externally.
   */
  constructor (side, mask = null) {
    // Bounding rectangle covers full base (2*side-1) width, side height
    // For side=3: width=5, height=3
    // @ts-ignore: mask parameter accepts null which is intentional for subclass flexibility
    super(2 * side - 1, side, mask)

    /**
     * Pyramid height (number of rows).
     * @type {number}
     */
    this.side = side

    /**
     * Total number of cells in the triangular grid (side²).
     * Undefined if mask.indexer not available.
     * @type {number}
     */
    // @ts-ignore: dynamic property access on indexer object
    this.size = this.original?.indexer?.size || 0

    /**
     * Transformation maps indexed by symmetry operation name.
     * Lazily initialized from buildTransformTriMap(side).
     * @type {Record<string, (number | number[])>}
     */
    lazy(this, 'transformMaps', () => {
      const triangleMap = buildTransformTriMap(this.side)
      // @ts-ignore: dynamic property access on triangleMap
      return triangleMap.maps
    })

    /**
     * Normalized bitboard representation of the template shape.
     * Bounding box is moved to origin (top-left at [0,0]).
     * Lazily computed from original.bits via normalized().
     * @type {bigint}
     */
    lazy(this, 'template', () => {
      if (!this.original?.bits) return 0n
      return this.normalized(this.original.bits)
    })
  }

  /**
   * Normalize a triangular bitboard by moving bounding box to origin (0,0).
   *
   * Algorithm:
   * 1. Extract all set bit indices from input bitboard
   * 2. Convert each index to row-column coordinates via indexer.location()
   * 3. Find minimum row and column values across all occupied cells
   * 4. Translate coordinates so minimum becomes (0,0)
   * 5. Recompute bitboard from translated coordinates via indexer.index()
   *
   * Purpose:
   * - Canonical form for shape comparison and deduplication
   * - Removes translation variability in orbit/symmetry classification
   * - Enables efficient shape caching and lookup
   *
   * Edge Cases:
   * - Empty bitboard (0n or 0) returns 0n unchanged
   * - Single-cell shapes return unchanged if already at origin
   * - Bits outside valid grid coordinates are skipped (indexer.location() returns undefined)
   *
   * @param {bigint} [bits] - Bitboard to normalize
   *   If omitted, normalizes this.template (used in lazy initialization).
   * @returns {bigint} Normalized bitboard with minimum bounds at origin
   * @throws {TypeError} If bits is provided but not bigint
   *
   * @example
   * // Shape with cells at [1,0], [1,2], [2,1] normalizes to [0,0], [0,2], [1,1]
   * const normalized = actions.normalized(inputBits)
   *
   * @see ActionsBase._bitsIndices() - Helper to iterate set bit indices
   * @see TriIndex.location() - Conversion from index to coordinates
   * @see TriIndex.index() - Conversion from coordinates to index
   * @see BigOne.setBitPos() - Bitwise operations for setting bits
   */
  normalized (bits) {
    const b = bits === undefined ? this.template : bits
    if (b === 0n || b === 0) return 0n

    // Collect coordinate information for all occupied cells
    // Uses _bitsIndices from ActionsBase to iterate all set bits
    const cells = []
    // @ts-ignore: accessing protected _bitsIndices method from ActionsBase
    for (const index of this._bitsIndices(b)) {
      // @ts-ignore: dynamic property access on indexer object
      const location = this.indexer?.location(index)
      if (location) {
        cells.push(location)
      }
    }

    if (cells.length === 0) return 0n

    // Find minimum row and column bounds
    // All coordinates are [row, col] pairs from indexer.location()
    let minRow = cells[0][0]
    let minCol = cells[0][1]
    for (const [row, col] of cells) {
      if (row < minRow) minRow = row
      if (col < minCol) minCol = col
    }

    // Recompute as normalized bits relative to minimum bounds
    // Each cell is translated by (minRow, minCol) and re-indexed
    let normalized = 0n
    for (const [row, col] of cells) {
      const normalizedRow = row - minRow
      const normalizedCol = col - minCol
      // @ts-ignore: dynamic property access on indexer object
      const newIndex = this.indexer?.index(normalizedRow, normalizedCol)
      if (newIndex !== undefined) {
        // SetBitPos returns new bigint; assignment is required
        normalized = BigOne.setBitPos(normalized, newIndex)
      }
    }
    return normalized
  }

  /**
   * Classify the orbit type based on D3 symmetry group size.
   *
   * Orbit types correspond to subgroups of the dihedral group D3:
   * - **D3** (6 symmetries): Full dihedral symmetry
   *   Invariant under all 3 rotations (0°, 120°, 240°) AND all 3 reflections
   *   Most general case; shape has no preferred orientation
   *
   * - **C3** (3 symmetries): Rotational symmetry only
   *   Invariant under rotations (0°, 120°, 240°) but broken under some reflections
   *   Shape appears same after 120° rotation but changes when reflected
   *
   * - **C2** (2 symmetries): Single non-trivial symmetry
   *   One operation (either a rotation or reflection) leaves shape invariant
   *   Reduces freedom; shape has one preferred axis or direction
   *
   * - **SYM** (1 symmetry): Trivial/identity only
   *   Only identity transformation preserves shape
   *   Least symmetric; shape is asymmetric or all symmetries coincidentally match
   *
   * Symmetry count computed from orbit() result via inherited order property.
   *
   * @returns {'D3'|'C3'|'C2'|'SYM'} Orbit classification string
   *   - 'D3': Full D3 dihedral symmetry (6 group elements)
   *   - 'C3': Rotational cyclic symmetry only (3 group elements)
   *   - 'C2': Binary/mirror symmetry (2 group elements)
   *   - 'SYM': Identity/trivial symmetry (1 group element)
   *
   * @throws {ReferenceError} If this.order is not defined (inherited from ActionsBase)
   *
   * @example
   * // Equilateral triangle fragment
   * const orbitType = actions.classifyOrbitType()
   * // Returns 'D3' for shapes with full D3 symmetry
   * // Returns 'C3' for shapes with rotational symmetry only
   *
   * @see ActionsBase.order - Inherited property computing symmetry group size
   * @see ActionsTri.orbit() - Inherited method generating all symmetric forms
   */
  classifyOrbitType () {
    const symmetryCount = this.order
    if (symmetryCount === 6) return 'D3' // Full D3 symmetry
    if (symmetryCount === 3) return 'C3' // Rotational only
    if (symmetryCount === 2) return 'C2' // Single non-trivial symmetry
    return 'SYM' // Identity only or all fixed points
  }

  /**
   * D3 symmetry transformation names (operation abbreviations).
   *
   * Dihedral group D3 has 6 elements:
   * - **E**: Identity (no transformation)
   * - **R120**: Rotation by 120° counterclockwise
   * - **R240**: Rotation by 240° counterclockwise (equivalent to 120° clockwise)
   * - **F0**: Reflection across axis through corner 0
   * - **F1**: Reflection across axis through corner 1
   * - **F2**: Reflection across axis through corner 2
   *
   * These names are used as keys in transformMaps objects to look up
   * index transformation arrays for each symmetry operation.
   *
   * @static
   * @type {Array<string>}
   * @readonly
   * @default ['E', 'R120', 'R240', 'F0', 'F1', 'F2']
   *
   * @example
   * // Access transformation maps by name
   * const identityMap = transformMaps[ActionsTri.D3_NAMES[0]]  // 'E'
   * const rotate120 = transformMaps[ActionsTri.D3_NAMES[1]]    // 'R120'
   *
   * @see ActionsTri.D3_LABELS - Human-readable descriptions
   * @see buildTransformTriMap() - Generates transformation maps indexed by these names
   */
  static D3_NAMES = ['E', 'R120', 'R240', 'F0', 'F1', 'F2']

  /**
   * D3 symmetry transformation human-readable labels.
   *
   * Descriptive English names for each element of the dihedral group D3,
   * paired 1:1 with D3_NAMES for user-facing documentation and debugging.
   *
   * - **identity**: No operation applied (D3_NAMES[0] = 'E')
   * - **rotate 120°**: Counterclockwise rotation by 120° (D3_NAMES[1] = 'R120')
   * - **rotate 240°**: Counterclockwise rotation by 240° (D3_NAMES[2] = 'R240')
   * - **reflect (axis 0)**: Mirror across axis through corner 0 (D3_NAMES[3] = 'F0')
   * - **reflect (axis 120)**: Mirror across axis rotated 120° (D3_NAMES[4] = 'F1')
   * - **reflect (axis 240)**: Mirror across axis rotated 240° (D3_NAMES[5] = 'F2')
   *
   * @static
   * @type {Array<string>}
   * @readonly
   * @default ['identity', 'rotate 120°', 'rotate 240°', 'reflect (axis 0)', 'reflect (axis 120)', 'reflect (axis 240)']
   *
   * @example
   * // Map operation name to label
   * for (let i = 0; i < ActionsTri.D3_NAMES.length; i++) {
   *   console.log(`${ActionsTri.D3_NAMES[i]}: ${ActionsTri.D3_LABELS[i]}`)
   * }
   * // Output:
   * // E: identity
   * // R120: rotate 120°
   * // etc...
   *
   * @see ActionsTri.D3_NAMES - Short operation codes paired with these labels
   */
  static D3_LABELS = [
    'identity',
    'rotate 120°',
    'rotate 240°',
    'reflect (axis 0)',
    'reflect (axis 120)',
    'reflect (axis 240)'
  ]
}
