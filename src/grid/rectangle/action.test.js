/* eslint-env jest */

/* global beforeEach, describe, it, expect */

import { beforeEach, describe, it, expect } from '@jest/globals'
//
import { Actions } from './actions.js'
import { Mask } from './mask.js'
import { coordsToOccBig } from '../maskConvert.js'
import { errorMsg } from '../../core/errorMsg.js'

function serializedData (data) {
  return JSON.stringify(data, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() // Convert BigInt to string
    }
    return value // Return other values unchanged
  })
}
// Jest test suite
describe('Actions', () => {
  let mask
  let actions

  beforeEach(() => {
    mask = new Mask(4, 4)
    mask.set(0, 0)
    mask.set(1, 0)
    actions = new Actions(4, 4, mask)
  })

  describe('constructor', () => {
    it('should create a square grid from rectangular mask', () => {
      const m = new Mask(3, 5)
      const a = new Actions(3, 5, m)
      expect(a.width).toBe(5)
      expect(a.height).toBe(5)
    })

    it('should use existing width if already square', () => {
      const m = new Mask(4, 4)
      const a = new Actions(4, 4, m)
      expect(a.width).toBe(4)
      expect(a.height).toBe(4)
    })

    it('should lazily load transformMaps', () => {
      expect(actions.transformMaps).toBeDefined()
      expect(Array.isArray(actions.transformMaps.id)).toBe(true)
    })

    it('should lazily load template', () => {
      expect(actions.template).toBeDefined()
      expect(typeof actions.template).toBe('bigint')
    })
  })

  describe('normalized', () => {
    it('should normalize bits by shifting up then left', () => {
      const b = actions.template
      expect(typeof b).toBe('bigint')
      const shifted = actions.normalized(b)
      expect(typeof shifted).toBe('bigint')
      try {
        const result = actions.normalized()
        expect(typeof result).toBe('bigint')
      } catch (err) {
        const title = 'actions'
        const obj = actions
        const msg = errorMsg(title, obj)
        err.message += msg
        throw err
      }
    })

    it('should use template bits if undefined', () => {
      try {
        const result = actions.normalized()
        expect(result).toBeDefined()
      } catch (err) {
        err.message += `\n\noactions:\n${JSON.stringify(actions, null, 2)}`
        throw err
      }
    })

    it('should use provided bits', () => {
      const bits = 15n
      const result = actions.normalized(bits)
      expect(typeof result).toBe('bigint')
    })
  })

  describe('applyMap', () => {
    it('should apply identity map and return normalized result', () => {
      const result = actions.applyMap(actions.transformMaps.id)
      console.log('map:', serializedData(actions.transformMaps.id))
      expect(typeof result).toBe('bigint')
      expect(result).toBe(actions.template)
    })

    it('should apply rotation maps', () => {
      const id = actions.applyMap(actions.transformMaps.id)
      const r90 = actions.applyMap(actions.transformMaps.r90)
      const r180 = actions.applyMap(actions.transformMaps.r180)
      const r270 = actions.applyMap(actions.transformMaps.r270)

      expect(typeof id).toBe('bigint')
      expect(typeof r90).toBe('bigint')
      expect(typeof r180).toBe('bigint')
      expect(typeof r270).toBe('bigint')
    })

    it('should apply reflection maps', () => {
      const fx = actions.applyMap(actions.transformMaps.fx)
      const fy = actions.applyMap(actions.transformMaps.fy)
      const fd1 = actions.applyMap(actions.transformMaps.fd1)
      const fd2 = actions.applyMap(actions.transformMaps.fd2)

      expect(typeof fx).toBe('bigint')
      expect(typeof fy).toBe('bigint')
      expect(typeof fd1).toBe('bigint')
      expect(typeof fd2).toBe('bigint')
    })
  })

  describe('orbit', () => {
    it('should return array of 8 transformations', () => {
      const orb = actions.orbit()
      expect(Array.isArray(orb)).toBe(true)
      expect(orb.length).toBe(8)
      orb.forEach(b => {
        expect(typeof b).toBe('bigint')
      })
    })

    it('should use provided maps', () => {
      const orb = actions.orbit(actions.transformMaps)
      expect(orb.length).toBe(8)
    })
  })

  describe('symmetries', () => {
    it('should return unique images from orbit', () => {
      const syms = actions.symmetries
      expect(Array.isArray(syms)).toBe(true)
      expect(syms.length).toBeGreaterThan(0)
      expect(syms.length).toBeLessThanOrEqual(8)
    })

    it('should contain only bigints', () => {
      actions.symmetries.forEach(s => {
        expect(typeof s).toBe('bigint')
      })
    })
  })

  describe('order', () => {
    it('should return number of unique symmetries', () => {
      const order = actions.order
      expect(typeof order).toBe('number')
      expect(order).toBeGreaterThan(0)
      expect(order).toBeLessThanOrEqual(8)
    })
  })

  describe('classifyOrbitType', () => {
    it('should return c1 for high symmetry', () => {
      const fullMask = new Mask(4, 4)
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          fullMask.set(x, y)
        }
      }
      const a = new Actions(4, 4, fullMask)
      expect(a.classifyOrbitType()).toBe('SYM')
    })

    it('should return SYM for high symmetry', () => {
      const singleMask = new Mask(4, 4)
      singleMask.set(0, 0)
      const a = new Actions(4, 4, singleMask)
      expect(a.classifyOrbitType()).toBe('SYM')
    })

    it('should return valid symmetry classification', () => {
      try {
        const sym = actions.classifyOrbitType()
        const validSymmetries = ['ASYM', 'O4R', 'O4F', 'O2R', 'O2F', 'SYM']
        expect(validSymmetries.includes(sym)).toBe(true)
      } catch (err) {
        err.message += errorMsg('actions', actions)
        throw err
      }
    })
    it('plane should return valid C4', () => {
      const bits = coordsToOccBig(
        [
          [0, 1],
          [1, 0],
          [1, 1],
          [1, 2]
        ],
        3,
        3
      )
      expect(typeof bits).toBe('bigint')
      const mask = new Mask(3, 3, bits)
      const acts = new Actions(3, 3, mask)
      const orbit = acts.orbit()
      try {
        const order = acts.order
        expect(typeof order).toBe('number')
        expect(order).toBe(4)
      } catch (err) {
        err.message += `\n\norbit:\n${serializedData(orbit)}`
        throw err
      }
      try {
        const sym = acts.classifyOrbitType()
        expect(sym).toBe('O4R')
      } catch (err) {
        err.message += `\n\noactions:\n${JSON.stringify(acts, null, 2)}`
        throw err
      }
    })
  })
  it('Jet should return valid C4', () => {
    const bits = coordsToOccBig(
      [
        [0, 1],
        [1, 1],
        [2, 0],
        [2, 1],
        [2, 2]
      ],
      3,
      3
    )
    expect(typeof bits).toBe('bigint')
    const mask = new Mask(3, 3, bits)
    const acts = new Actions(3, 3, mask)
    const orbit = acts.orbit()
    try {
      const order = acts.order
      expect(typeof order).toBe('number')
      expect(order).toBe(4)
    } catch (err) {
      err.message += `\n\norbit:\n${serializedData(orbit)}`
      throw err
    }
    try {
      const sym = acts.classifyOrbitType()
      expect(sym).toBe('O4R')
    } catch (err) {
      err.message += `\n\noactions:\n${JSON.stringify(acts, null, 2)}`
      throw err
    }
  })
  it('Heli should return valid C1', () => {
    const bits = coordsToOccBig(
      [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 1]
      ],
      3,
      3
    )
    expect(typeof bits).toBe('bigint')
    const mask = new Mask(3, 3, bits)
    const acts = new Actions(3, 3, mask)
    const orbit = acts.orbit()
    try {
      const order = acts.order
      expect(typeof order).toBe('number')
      expect(order).toBe(1)
    } catch (err) {
      err.message += `\n\norbit:\n${serializedData(orbit)}`
      throw err
    }
    try {
      const sym = acts.classifyOrbitType()
      expect(sym).toBe('SYM')
    } catch (err) {
      err.message += `\n\noactions:\n${JSON.stringify(acts, null, 2)}`
      throw err
    }
  })
  it('carrier should return valid V4', () => {
    const bits = coordsToOccBig(
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 1],
        [1, 2],
        [1, 3],
        [1, 4]
      ],
      5,
      5
    )
    expect(typeof bits).toBe('bigint')
    const mask = new Mask(5, 5, bits)
    const acts = new Actions(5, 5, mask)
    const orbit = acts.orbit()
    try {
      const order = acts.order
      expect(typeof order).toBe('number')
      expect(order).toBe(4)
    } catch (err) {
      err.message += `\n\norbit:\n${serializedData(orbit)}`
      throw err
    }
    try {
      const sym = acts.classifyOrbitType()
      expect(sym).toBe('O4F')
    } catch (err) {
      err.message += `\n\noactions:\n${serializedData(acts)}`
      throw err
    }
  })
  it('tanker should return valid C2R', () => {
    const bits = coordsToOccBig(
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [0, 5]
      ],
      6,
      6
    )
    expect(typeof bits).toBe('bigint')
    const mask = new Mask(6, 6, bits)
    const acts = new Actions(6, 6, mask)
    const orbit = acts.orbit()
    try {
      const order = acts.order
      expect(typeof order).toBe('number')
      expect(order).toBe(2)
    } catch (err) {
      err.message += `\n\norbit:\n${serializedData(orbit)}`
      throw err
    }
    try {
      const sym = acts.classifyOrbitType()
      expect(sym).toBe('O2R')
    } catch (err) {
      err.message += `\n\noactions:\n${serializedData(acts)}`
      throw err
    }
  })
  it('Mine should return valid D4', () => {
    const bits = coordsToOccBig(
      [
        [0, 1],
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2]
      ],
      3,
      3
    )
    expect(typeof bits).toBe('bigint')
    const mask = new Mask(3, 3, bits)
    const acts = new Actions(3, 3, mask)
    const orbit = acts.orbit()
    try {
      const order = acts.order
      expect(typeof order).toBe('number')
      expect(order).toBe(8)
    } catch (err) {
      err.message += errorMsg('orbit', orbit)
      throw err
    }
    try {
      const sym = acts.classifyOrbitType()
      expect(sym).toBe('ASYM')
    } catch (err) {
      err.message += `\n\noactions:\n${JSON.stringify(acts, null, 2)}`
      throw err
    }
  })

  it('Merchanter should return valid D4', () => {
    const bits = coordsToOccBig(
      [
        [0, 0],
        [1, 1],
        [1, 2],
        [1, 3],
        [0, 4],
        [1, 4]
      ],
      5,
      5
    )
    expect(typeof bits).toBe('bigint')
    const mask = new Mask(5, 5, bits)
    const acts = new Actions(5, 5, mask)
    const orbit = acts.orbit()
    try {
      const order = acts.order
      expect(typeof order).toBe('number')
      expect(order).toBe(8)
    } catch (err) {
      err.message += `\n\norbit:\n${serializedData(orbit)}`
      throw err
    }
    try {
      const sym = acts.classifyOrbitType()
      expect(sym).toBe('ASYM')
    } catch (err) {
      err.message += `\n\noactions:\n${JSON.stringify(acts, null, 2)}`
      throw err
    }
  })

  it('Orbital should return valid C2F', () => {
    const bits = coordsToOccBig(
      [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 2],
        [2, 1],
        [2, 2]
      ],
      3,
      3
    )
    expect(typeof bits).toBe('bigint')
    const mask = new Mask(3, 3, bits)
    const acts = new Actions(3, 3, mask)
    const orbit = acts.orbit()
    try {
      const order = acts.order
      expect(typeof order).toBe('number')
      expect(order).toBe(2)
    } catch (err) {
      err.message += errorMsg('orbit', orbit)
      throw err
    }
    try {
      const sym = acts.classifyOrbitType()
      expect(sym).toBe('O2F')
    } catch (err) {
      err.message += errorMsg('actions', acts)
      throw err
    }
  })
  it('Orbital should return valid C2F', () => {
    const bits = coordsToOccBig(
      [
        [0, 1],
        [1, 0],
        [1, 1],
        [2, 2],
        [2, 3],
        [3, 2]
      ],
      4,
      4
    )
    expect(typeof bits).toBe('bigint')
    const mask = new Mask(4, 4, bits)
    const acts = new Actions(4, 4, mask)
    const orbit = acts.orbit()
    try {
      const order = acts.order
      expect(typeof order).toBe('number')
      expect(order).toBe(2)
    } catch (err) {
      err.message += `\n\norbit:\n${serializedData(orbit)}`
      throw err
    }
    try {
      const sym = acts.classifyOrbitType()
      expect(sym).toBe('O2F')
    } catch (err) {
      err.message += `\n\noactions:\n${serializedData(acts)}`
      throw err
    }
  })
})
