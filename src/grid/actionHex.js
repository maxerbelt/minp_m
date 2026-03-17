import { lazy } from '../utilities.js'
import { CubeIndex } from './CubeIndex.js'
import { ActionsBase } from './ActionsBase.js'
///import { pop } from './bitHelpers.js'

export class ActionsHex extends ActionsBase {
  constructor (radius, mask = null) {
    const width = 2 * radius + 1
    super(width, width, mask)
    this.radius = radius
    this.size = this.original?.cube?.size || 0

    // lazily create a CubeIndex instance on first access via `this.cube`
    lazy(this, 'cube', () => {
      return CubeIndex.getInstance(this.radius)
    })

    lazy(this, 'template', () => {
      return this.normalized(this.original.bits)
    })
  }

  // hex normalization is more involved than the default
  normalized (bits) {
    const b = bits === undefined ? this.template : bits
    // Convert bits to coordinates, normalize, and return as bigint
    if (b === 0n || b === 0) return 0n

    const cells = []
    for (const i of this._bitsIndices(b)) {
      const loc = this.cube.location(i)
      if (loc) {
        cells.push(loc)
      }
    }

    if (cells.length === 0) return 0n

    // Find minimum coordinates
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

    // Normalize to origin and convert back to bits (always bigint)
    let normalized = 0n
    for (const [q, r, s] of cells) {
      const nq = q - minQ
      const nr = r - minR
      const ns = s - minS
      const j = this.cube.index(nq, nr, ns)
      if (j !== undefined) {
        normalized |= 1n << BigInt(j)
      }
    }
    return normalized
  }

  applyMap (map = this._defaultMap()) {
    // force result to bigint for hex operations
    const result = super.applyMap(map)
    return typeof result === 'bigint' ? result : this._convertToBigint(result)
  }

  // hex symmetry requires a custom classification
  classifyOrbitType () {
    const maps = this.transformMaps
    const b = this.template
    const k = this.order
    // For D6 symmetry group (hexagons)
    if (k === 12) return 'D6'
    if (k === 6) {
      // Could be C6 (rotational) or D3 (with reflections)
      if (maps && maps.length >= 6) {
        const rotated = this.applyMap(maps[3]) // 180° rotation (3rd map for half rotation)
        if (rotated === b) return 'C6'
        return 'D3'
      }
      return 'D3'
    }
    if (k === 3) return 'C3'
    if (k === 2) return 'C2'
    return 'SYM'
  }

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
  static SUBGROUPS = [
    { name: 'trivial', size: 1, test: m => m === 1 },
    { name: 'C2', size: 2, test: m => m === ((1 << 0) | (1 << 3)) },
    { name: 'C3', size: 3, test: m => m === ((1 << 0) | (1 << 2) | (1 << 4)) },
    { name: 'C6', size: 6, test: m => m === 0b00111111 },
    {
      name: 'D1',
      size: 2
      // test: m => pop(m) === 2 && has(m, 0) && hasReflection(m)
    },
    {
      name: 'D2',
      size: 4
      //,test: m => has(m, 3) && pop(m) === 4
    },
    {
      name: 'D3',
      size: 6
      //  test: m => has(m, 2) && has(m, 4) && hasReflection(m)
    },
    {
      name: 'D6',
      size: 12
      //, test: m => pop(m) === 12
    }
  ]
  classifyStabilizer (mask) {
    for (const g of ActionsHex.SUBGROUPS) {
      if (g.test(mask)) return g.name
    }
    return 'unknown'
  }
}
