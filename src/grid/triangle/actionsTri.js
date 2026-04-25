import { lazy } from '../../core/utilities.js'
import { buildTransformTriMap } from './buildTransformTriMap.js'
import { ActionsBase } from '../ActionsBase.js'

/**
 * Triangle grid Actions handler with D3 symmetry.
 * Handles 120° rotations and reflections (3 axes).
 * Extends ActionsBase to provide triangle-specific normalization and classification.
 */
export class ActionsTri extends ActionsBase {
  /**
   * Create Actions handler for a triangular grid.
   * @param {number} side - Number of rows (pyramid height)
   * @param {Object} mask - Optional Mask object
   */
  constructor (side, mask = null) {
    // Bounding rectangle covers full base (2*side-1) width, side height
    super(2 * side - 1, side, mask)
    this.side = side
    this.size = this.original?.indexer?.size || 0

    lazy(this, 'transformMaps', () => {
      const triangleMap = buildTransformTriMap(this.side)
      return triangleMap.maps
    })

    lazy(this, 'template', () => {
      return this.normalized(this.original.bits)
    })
  }

  /**
   * Normalize a triangular bitboard by moving bounding box to origin (0,0).
   * Iterates through all cells, converts to row-column coordinates,
   * finds minimum bounds, then recomputes as normalized bigint.
   * @param {bigint} bits - Bitboard to normalize
   * @returns {bigint} Normalized bitboard
   */
  normalized (bits) {
    const b = bits === undefined ? this.template : bits
    if (b === 0n || b === 0) return 0n

    // Collect coordinate information for all occupied cells
    const cells = []
    for (const index of this._bitsIndices(b)) {
      const location = this.indexer.location(index)
      if (location) {
        cells.push(location)
      }
    }

    if (cells.length === 0) return 0n

    // Find minimum row and column
    let minRow = cells[0][0]
    let minCol = cells[0][1]
    for (const [row, col] of cells) {
      if (row < minRow) minRow = row
      if (col < minCol) minCol = col
    }

    // Recompute as normalized bits relative to minimum
    let normalized = 0n
    for (const [row, col] of cells) {
      const normalizedRow = row - minRow
      const normalizedCol = col - minCol
      const newIndex = this.indexer.index(normalizedRow, normalizedCol)
      if (newIndex !== undefined) {
        normalized |= 1n << BigInt(newIndex)
      }
    }
    return normalized
  }

  /**
   * Classify the orbit type based on D3 symmetry group size.
   * D3 has 6 elements: 3 rotations (by 0°, 120°, 240°) × 2 flip states.
   * @returns {string} Orbit type: "D3" (full), "C3" (rotational), "C2" (order 2), "SYM" (trivial)
   */
  classifyOrbitType () {
    const symmetryCount = this.order
    if (symmetryCount === 6) return 'D3' // Full D3 symmetry
    if (symmetryCount === 3) return 'C3' // Rotational only
    if (symmetryCount === 2) return 'C2' // Single non-trivial symmetry
    return 'SYM' // Full D3 symmetry (identity only or all fixed)
  }

  /**
   * D3 symmetry transformation names.
   * Identity and 5 non-identity transforms (3 rotations + 3 reflections).
   * @static
   * @type {Array<string>}
   */
  static D3_NAMES = ['E', 'R120', 'R240', 'F0', 'F1', 'F2']

  /**
   * D3 symmetry transformation human-readable labels.
   * @static
   * @type {Array<string>}
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
