/* eslint-env jest */

/* global beforeEach, describe, it, expect */

//import { beforeEach, describe, it, expect } from '@jest/globals'
import { buildTransformMaps } from './buildTransformMaps.js'

// Jest test suite
describe('buildTransformMaps', () => {
  describe('basic structure', () => {
    it('should return object with all 8 transformation maps', () => {
      const maps = buildTransformMaps(4, 4)
      expect(maps.id).toBeDefined()
      expect(maps.r90).toBeDefined()
      expect(maps.r180).toBeDefined()
      expect(maps.r270).toBeDefined()
      expect(maps.fx).toBeDefined()
      expect(maps.fy).toBeDefined()
      expect(maps.fd1).toBeDefined()
      expect(maps.fd2).toBeDefined()
    })

    it('D4 location should differ', () => {
      const maps = buildTransformMaps(4, 4)

      const offcenter = maps.id[1]
      const otherMaps = Object.values(maps).slice(1)
      otherMaps.forEach((map, i) => {
        try {
          expect(map[1]).not.toBe(offcenter)
        } catch (e) {
          console.error(
            'map causing failure:',
            map,
            'index:',
            i + 1,
            'cell:',
            1,
            'value:',
            map[1],
            'expected not to be:',
            offcenter
          )
          throw e
        }
      })
    })

    it('corner locations should differ', () => {
      const maps = buildTransformMaps(4, 4)

      const corner = maps.id[0]
      const otherMaps = [...Object.values(maps).slice(1, 6), maps.fd2]
      otherMaps.forEach((map, i) => {
        const map0 = map[0]
        try {
          if (map0 === corner) {
            console.error('other maps:', otherMaps)
            console.error(
              'Testing map:',
              i + 1,
              map,
              'map0:',
              map0,
              'corner:',
              corner,
              'fd1:',
              maps.fd1,
              'fd2:',
              maps.fd2
            )
          }
          expect(map0).not.toBe(corner)
        } catch (e) {
          console.error(
            'map causing failure:',
            map,
            'index:',
            i + 1,
            'cell:',
            0,
            'value:',
            map0,
            'expected not to be:',
            corner
          )
          throw e
        }
      })
      const offcenter2 = maps.id[3]
      const otherMap2 = [...Object.values(maps).slice(1, 7)]
      otherMap2.forEach((map, i) => {
        try {
          expect(map[3]).not.toBe(offcenter2)
        } catch (e) {
          console.error(
            'map causing failure:',
            map,
            'index:',
            i + 1,
            'cell:',
            3,
            'value:',
            map[3],
            'expected not to be:',
            offcenter2
          )
          throw e
        }
      })
    })
    it('should create arrays of correct size', () => {
      const maps = buildTransformMaps(4, 4)
      const size = 16
      Object.values(maps).forEach(map => {
        expect(map.length).toBe(size)
      })
    })

    it('should handle rectangular grids', () => {
      const maps = buildTransformMaps(3, 5)
      const size = 15
      Object.values(maps).forEach(map => {
        expect(map.length).toBe(size)
      })
    })
  })

  describe('identity map', () => {
    it('should map each index to itself', () => {
      const maps = buildTransformMaps(4, 4)
      for (let i = 0; i < 16; i++) {
        expect(maps.id[i]).toBe(i)
      }
    })
  })

  describe('90 degree rotation', () => {
    it('should rotate coordinates correctly', () => {
      const maps = buildTransformMaps(4, 4)
      // Top-left (0,0) -> top-right (3,0)
      expect(maps.r90[0]).toBe(3)
      // Top-right (3,0) -> bottom-right (3,3)
      expect(maps.r90[3]).toBe(15)
      // Bottom-right (3,3) -> bottom-left (0,3)
      expect(maps.r90[15]).toBe(12)
    })
  })

  describe('180 degree rotation', () => {
    it('should rotate 180 degrees', () => {
      const maps = buildTransformMaps(4, 4)
      // (0,0) -> (3,3)
      expect(maps.r180[0]).toBe(15)
      // (1,0) -> (2,3)
      expect(maps.r180[1]).toBe(14)
      // (3,3) -> (0,0)
      expect(maps.r180[15]).toBe(0)
    })
  })

  describe('270 degree rotation', () => {
    it('should rotate 270 degrees', () => {
      const maps = buildTransformMaps(4, 4)
      // (0,0) -> (0,3)
      expect(maps.r270[0]).toBe(12)
      // (3,0) -> (0,0)
      expect(maps.r270[3]).toBe(0)
    })
  })

  describe('horizontal flip', () => {
    it('should flip along vertical axis', () => {
      const maps = buildTransformMaps(4, 4)
      // (0,0) -> (3,0)
      expect(maps.fx[0]).toBe(3)
      // (1,0) -> (2,0)
      expect(maps.fx[1]).toBe(2)
      // (3,0) -> (0,0)
      expect(maps.fx[3]).toBe(0)
    })
  })

  describe('vertical flip', () => {
    it('should flip along horizontal axis', () => {
      const maps = buildTransformMaps(4, 4)
      // (0,0) -> (0,3)
      expect(maps.fy[0]).toBe(12)
      // (0,1) -> (0,2)
      expect(maps.fy[4]).toBe(8)
      // (0,3) -> (0,0)
      expect(maps.fy[12]).toBe(0)
    })
  })

  describe('diagonal flips', () => {
    it('should flip along main diagonal (y=x)', () => {
      const maps = buildTransformMaps(4, 4)
      // (0,0) -> (0,0)
      expect(maps.fd1[0]).toBe(0)
      // (1,0) -> (0,1)
      expect(maps.fd1[1]).toBe(4)
      // (0,1) -> (1,0)
      expect(maps.fd1[4]).toBe(1)
      // (2,1) -> (1,2)
      expect(maps.fd1[6]).toBe(9)
    })

    it('should flip along anti-diagonal', () => {
      const maps = buildTransformMaps(4, 4)
      // (0,0) -> (3,3)
      expect(maps.fd2[0]).toBe(15)
      // (3,3) -> (0,0)
      expect(maps.fd2[15]).toBe(0)
    })
  })

  describe('rectangular grids', () => {
    it('should work with 3x5 grid', () => {
      const maps = buildTransformMaps(3, 5)
      expect(maps.id.length).toBe(15)
      // (0,0) should map to itself in identity
      expect(maps.id[0]).toBe(0)
      // (2,0) should map to (2,0) in identity
      expect(maps.id[2]).toBe(2)
    })

    it('should handle 1x1 grid', () => {
      const maps = buildTransformMaps(1, 1)
      expect(maps.id[0]).toBe(0)
      Object.values(maps).forEach(map => {
        expect(map[0]).toBe(0)
      })
    })
  })

  describe('caching', () => {
    it('should cache square grids', () => {
      const maps1 = buildTransformMaps(5, 5)
      const maps2 = buildTransformMaps(5, 5)
      expect(maps1).toBe(maps2)
    })

    it('should not cache rectangular grids', () => {
      const maps1 = buildTransformMaps(3, 5)
      const maps2 = buildTransformMaps(3, 5)
      expect(maps1).not.toBe(maps2)
    })

    it('should cache different sizes independently', () => {
      const maps4 = buildTransformMaps(4, 4)
      const maps5 = buildTransformMaps(5, 5)
      expect(maps4).not.toBe(maps5)
      const maps4Again = buildTransformMaps(4, 4)
      expect(maps4).toBe(maps4Again)
    })
  })

  describe('transformation properties', () => {
    it('should have all values in valid range', () => {
      const maps = buildTransformMaps(4, 4)
      const size = 16
      Object.values(maps).forEach(map => {
        map.forEach(val => {
          expect(val).toBeGreaterThanOrEqual(0)
          expect(val).toBeLessThan(size)
        })
      })
    })

    it('should be permutations (bijective)', () => {
      const maps = buildTransformMaps(4, 4)
      const size = 16
      Object.values(maps).forEach(map => {
        const seen = new Set(map)
        expect(seen.size).toBe(size)
      })
    })
  })
})
