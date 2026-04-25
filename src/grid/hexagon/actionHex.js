import { lazy } from '../../core/utilities.js'
import { CubeIndex } from './CubeIndex.js'
import { ActionsBase } from '../ActionsBase.js'

/**
 * Hexagonal grid Actions handler with D6 symmetry.
 * Uses cube coordinates for hex normalization.
 * Handles 60° rotations and reflections (6 axes).
 * Extends ActionsBase to provide hexagon-specific normalization and classification.
 */
export class ActionsHex extends ActionsBase {
  /**
   * Create Actions handler for a hexagonal grid.
   * @param {number} radius - Hex grid radius
   * @param {Object} mask - Optional Mask object
   */
  constructor (radius, mask = null) {
    const width = 2 * radius + 1
    super(width, width, mask)
    this.radius = radius
    this.size = this.original?.cube?.size || 0

    // Lazily create a CubeIndex instance for hex coordinate operations
    lazy(this, 'cube', () => {
      return CubeIndex.getInstance(this.radius)
    })

    lazy(this, 'template', () => {
      return this.normalized(this.original.bits)
    })
  }

  /**
   * Normalize a hexagonal bitboard using cube coordinates.
   * Converts to (q, r, s) cube coordinates, finds minimum, then normalizes.
   * Cube coordinates satisfy q + r + s = 0 (axial + vertical).
   * @param {bigint} bits - Bitboard to normalize
   * @returns {bigint} Normalized bitboard
   */
  normalized (bits) {
    const b = bits === undefined ? this.template : bits
    if (b === 0n || b === 0) return 0n

    // Collect cube coordinates for all occupied cells
    const cells = []
    for (const index of this._bitsIndices(b)) {
      const location = this.cube.location(index)
      if (location) {
        cells.push(location)
      }
    }

    if (cells.length === 0) return 0n

    // Find minimum coordinates (lexicographic order: q, then r, then s)
    let minQ = cells[0][0]
    let minR = cells[0][1]
    let minS = cells[0][2]

    for (const [q, r, s] of cells) {
      if (
        q < minQ ||
        (q === minQ && r < minR) ||
        (q === minQ && r === minR && s < minS)
      ) {
        minQ = q
        minR = r
        minS = s
      }
    }

    // Normalize to origin and convert back to bitboard
    let normalized = 0n
    for (const [q, r, s] of cells) {
      const normalizedQ = q - minQ
      const normalizedR = r - minR
      const normalizedS = s - minS
      const index = this.cube.index(normalizedQ, normalizedR, normalizedS)
      if (index !== undefined) {
        normalized |= 1n << BigInt(index)
      }
    }
    return normalized
  }

  /**
   * Apply a transform map and ensure result is always bigint.
   * Hex operations require consistent bigint representation.
   * @param {Array<number>} map - Index mapping
   * @param {*} bits - Optional bitboard
   * @returns {bigint} Transformed bitboard
   */
  applyMap (map = this._defaultMap()) {
    const result = super.applyMap(map)
    return typeof result === 'bigint' ? result : this._convertToBigint(result)
  }

  /**
   * Classify the orbit type based on D6 symmetry (hexagons).
   * D6 has 12 elements: 6 rotations × 2 flip states.
   * @returns {string} Orbit type: "D6" (full), "C6"/D3", "C3", "C2", "SYM" (trivial)
   */
  classifyOrbitType () {
    const maps = this.transformMaps
    const template = this.template
    const symmetryCount = this.order

    if (symmetryCount === 12) return 'D6' // Full hexagonal symmetry
    if (symmetryCount === 6) {
      // Could be C6 (rotational only) or D3 (with reflections)
      if (maps && maps.length >= 6) {
        const rotated180 = this.applyMap(maps[3]) // Half rotation (180°)
        if (rotated180 === template) return 'C6'
        return 'D3'
      }
      return 'D3'
    }
    if (symmetryCount === 3) return 'C3' // Rotational by 120°
    if (symmetryCount === 2) return 'C2' // Single non-trivial symmetry
    return 'SYM' // Trivial (identity only)
  }

  /**
   * D6 symmetry transformation names.
   * 6 rotations (0°, 60°, 120°, 180°, 240°, 300°) + 6 reflections.
   * @static
   * @type {Array<string>}
   */
  static D6_NAMES = [
    'E',
    'R60',
    'R120',
    'R180',
    'R240',
    'R300',
    'F0',
    'F60',
    'F120',
    'F180',
    'F240',
    'F300'
  ]

  /**
   * D6 symmetry transformation human-readable labels.
   * @static
   * @type {Array<string>}
   */
  static D6_LABELS = [
    'identity',
    'rotate 60°',
    'rotate 120°',
    'rotate 180°',
    'rotate 240°',
    'rotate 300°',
    'reflect (axis 0°)',
    'reflect (axis 60°)',
    'reflect (axis 120°)',
    'reflect (axis 180°)',
    'reflect (axis 240°)',
    'reflect (axis 300°)'
  ]

  /**
   * Subgroup definitions for D6 (dihedral group of order 12).
   * Lists all subgroups with their names, orders, and (optionally) membership tests.
   * @static
   * @type {Array<Object>}
   */
  static SUBGROUPS = [
    { name: 'trivial', size: 1, test: m => m === 1 },
    { name: 'C2', size: 2, test: m => m === ((1 << 0) | (1 << 3)) },
    { name: 'C3', size: 3, test: m => m === ((1 << 0) | (1 << 2) | (1 << 4)) },
    { name: 'C6', size: 6, test: m => m === 0b00111111 },
    {
      name: 'D1',
      size: 2
      // Single reflection (1D dihedral)
    },
    {
      name: 'D2',
      size: 4
      // Two orthogonal reflections
    },
    {
      name: 'D3',
      size: 6
      // Triangle dihedral (3 rotations + 3 reflections)
    },
    {
      name: 'D6',
      size: 12
      // Full hexagon dihedral
    }
  ]

  /**
   * Classify which subgroup stabilizes this hex shape.
   * Finds the first matching subgroup based on membership test.
   * @param {number} mask - Bitmask of symmetry transforms that fix the shape
   * @returns {string} Subgroup name (e.g., "D3", "C2", "trivial")
   */
  classifyStabilizer (mask) {
    for (const group of ActionsHex.SUBGROUPS) {
      if (group.test(mask)) {
        return group.name
      }
    }
    return 'unknown'
  }
}
