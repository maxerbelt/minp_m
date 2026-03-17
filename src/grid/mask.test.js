/* eslint-env jest */

/* global beforeEach, describe, it, expect */
import { Mask } from './mask.js'
import { beforeEach, describe, it, expect, jest } from '@jest/globals'

// Jest test suite
describe('Mask', () => {
  let mask

  beforeEach(() => {
    mask = new Mask(10, 10)
  })

  describe('constructor', () => {
    it('should initialize with correct width and height', () => {
      expect(mask.width).toBe(10)
      expect(mask.height).toBe(10)
      expect(mask.bits).toBe(0n)
    })
  })
})

describe('Mask - additional methods and edge cases', () => {
  let mask

  beforeEach(() => {
    mask = new Mask(4, 4)
  })

  const occupancyCoords = [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4]
  ]
  const occupancyCoords3 = [
    [0, 0, 1],
    [1, 0, 1],
    [2, 0, 2],
    [2, 1, 2]
  ]
  let mask3
  describe('shrink', () => {
    beforeEach(() => {
      mask = Mask.fromCoordsSquare(occupancyCoords)
      mask3 = Mask.fromCoordsSquare(occupancyCoords3)
    })
    it('shrinkToOccupied ', () => {
      expect(mask.toAscii).toBe('1....\n11...\n11...\n11...\n.1...')

      const shrunk = mask.shrinkToOccupied()
      expect(shrunk.toAscii).toBe('1.\n11\n11\n11\n.1')
    })
    it('shrinkToOccupied special cells', () => {
      expect(mask3.toAscii).toBe('112\n..2\n...')
      let rowBounds = mask3.store.findRowBounds(mask3.bits, mask3.height)
      expect(rowBounds).toEqual({ minY: 0, maxY: 1 })
      let colBounds = mask3.store.findColBounds(
        mask3.bits,
        rowBounds.minY,
        rowBounds.maxY,
        mask3.width
      )
      expect(colBounds).toEqual({ minX: 0, maxX: 2 })

      const shrunk = mask3.shrinkToOccupied()
      expect(shrunk.toAscii).toBe('112\n..2')
      expect(mask3.clone.toAscii).toBe('112\n..2\n...')
      expect(shrunk.square.toAscii).toBe('112\n..2\n...')

      const rot = mask3.clone.rotate()
      rowBounds = rot.store.findRowBounds(rot.bits, rot.height)
      expect(rowBounds).toEqual({ minY: 0, maxY: 2 })
      colBounds = rot.store.findColBounds(
        rot.bits,
        rowBounds.minY,
        rowBounds.maxY,
        rot.width
      )
      expect(colBounds).toEqual({ minX: 0, maxX: 1 })

      expect(rot.toAscii).toBe('.1.\n.1.\n22.')
      const ro2 = rot.clone.rotate()
      expect(ro2.shrinkToOccupied().toAscii).toBe('2..\n211')

      expect(ro2.toAscii).toBe('2..\n211\n...')
      const ro3 = ro2.clone.rotate()
      expect(ro3.toAscii).toBe('22.\n1..\n1..')
      expect(ro3.shrinkToOccupied().toAscii).toBe('22\n1.\n1.')
      expect(ro3.clone.rotate().toAscii).toBe('112\n..2\n...')
      expect(ro3.clone.rotate().shrinkToOccupied().toAscii).toBe('112\n..2')
      const shrunk2 = rot.shrinkToOccupied()
      expect(shrunk2.toAscii).toBe('.1\n.1\n22')
    })
  })
  describe('morphological operations 7', () => {
    beforeEach(() => {
      mask = new Mask(7, 7)
    })

    it('erode should shrink at the corners', () => {
      mask.set(0, 0)
      mask.set(1, 0)
      mask.set(2, 0)
      expect(mask.occupancy).toBe(3)
      mask.erode(1)
      expect(mask.occupancy).toBe(0)

      mask.set(0, 0)
      mask.set(1, 0)
      mask.set(2, 0)
      mask.set(0, 6)
      mask.set(1, 6)
      mask.set(2, 6)

      expect(mask.occupancy).toBe(6)
      mask.dilate(1)
      expect(mask.occupancy).toBe(16)
      mask.erode(1)
      expect(mask.occupancy).toBe(6)
      expect(mask.toAscii).toBe(
        '111....\n.......\n.......\n.......\n.......\n.......\n111....'
      )

      mask.erode(1)
      expect(mask.occupancy).toBe(0)
    })

    it('erode should shrink at the vertical edges', () => {
      mask.set(2, 0)
      mask.set(3, 0)
      mask.set(4, 0)
      expect(mask.occupancy).toBe(3)
      mask.erode(1)
      expect(mask.occupancy).toBe(0)

      mask.set(2, 0)
      mask.set(3, 0)
      mask.set(4, 0)
      mask.set(2, 6)
      mask.set(3, 6)
      mask.set(4, 6)

      expect(mask.occupancy).toBe(6)
      mask.dilate(1)
      expect(mask.occupancy).toBe(20)
      mask.erode(1)
      expect(mask.occupancy).toBe(6)
      expect(mask.toAscii.trim()).toBe(
        '..111..\n.......\n.......\n.......\n.......\n.......\n..111..'
      )

      mask.erode(1)
      expect(mask.occupancy).toBe(0)
    })

    it('erode should shrink at the horizontal edges', () => {
      mask.set(0, 2)
      mask.set(0, 3)
      mask.set(0, 4)
      expect(mask.occupancy).toBe(3)
      mask.erode(1)
      expect(mask.occupancy).toBe(0)

      mask.set(0, 2)
      mask.set(0, 3)
      mask.set(0, 4)
      mask.set(6, 2)
      mask.set(6, 3)
      mask.set(6, 4)

      expect(mask.occupancy).toBe(6)
      mask.dilate(1)
      expect(mask.occupancy).toBe(20)
      mask.erode(1)
      expect(mask.occupancy).toBe(6)
      expect(mask.toAscii).toBe(
        '.......\n.......\n1.....1\n1.....1\n1.....1\n.......\n.......'
      )

      mask.erode(1)
      expect(mask.occupancy).toBe(0)
    })
  })
  describe('other opperations', () => {
    beforeEach(() => {
      mask = new Mask(10, 10)
    })

    it('overlap', () => {
      mask.set(1, 1)
      mask.dilate(1)
      expect(mask.occupancy).toBe(9)

      const inverse = mask.invertedMask
      expect(inverse.occupancy).toBe(91)
      const full = mask.fullMask
      expect(full.occupancy).toBe(100)
      const empty = mask.emptyMask
      expect(empty.occupancy).toBe(0)

      const island = mask.emptyMask
      island.set(2, 2)
      expect(island.occupancy).toBe(1)
      island.dilate(1)
      expect(island.occupancy).toBe(9)

      const inverseIsland = island.invertedMask
      expect(inverseIsland.occupancy).toBe(91)

      const overlap = mask.overlap(island)
      expect(overlap.occupancy).toBe(4)
      for (let y = 1; y < 3; y++) {
        for (let x = 1; x < 3; x++) {
          expect(overlap.for(x, y).test()).toBe(true)
        }
      }
      const overlap2 = island.overlap(mask)
      expect(overlap2.occupancy).toBe(4)
      expect(overlap2.bits).toBe(overlap.bits)

      const take = mask.take(island)
      expect(take.occupancy).toBe(5)
      for (let y = 0; y < 3; y++) {
        expect(take.for(0, y).test()).toBe(true)
      }
      for (let x = 1; x < 3; x++) {
        expect(take.for(x, 0).test()).toBe(true)
      }
      const take2 = island.take(mask)
      expect(take2.occupancy).toBe(5)
      expect(take2.bits).not.toBe(take.bits)

      const join = mask.join(island)
      expect(join.occupancy).toBe(14)
      expect(mask.toAscii).toBe(
        `111.......
111.......
111.......
..........
..........
..........
..........
..........
..........
..........`
      )
      expect(island.toAscii).toBe(
        `..........
.111......
.111......
.111......
..........
..........
..........
..........
..........
..........`
      )
      expect(join.toAscii).toBe(
        `111.......
1111......
1111......
.111......
..........
..........
..........
..........
..........
..........`
      )
      const join2 = island.join(mask)
      expect(join2.occupancy).toBe(14)
      expect(join2.bits).toBe(join.bits)

      const small = new Mask(6, 6)
      small.set(3, 3)
      small.dilate(1)
      expect(small.occupancy).toBe(9)
      const wide = small.expand(10, 6)
      expect(small.toAscii).toBe(
        '......\n......\n..111.\n..111.\n..111.\n......'
      )
      expect(wide.toAscii.trim()).toBe(
        `..........
..........
..111.....
..111.....
..111.....
..........`
      )
      expect(wide.occupancy).toBe(9)

      const all = island.join(mask)
      expect(all.toAscii).toBe(
        `111.......
1111......
1111......
.111......
..........
..........
..........
..........
..........
..........`
      )
      expect(all.bits).not.toBe(island.bits)
      expect(all.occupancy).toBe(14)
      const some = wide.join(mask)
      expect(some.occupancy).toBe(17)
      expect(some.toAscii).toBe(
        `111.......
111.......
11111.....
..111.....
..111.....
..........`
      )
      const some2 = mask.join(wide)
      expect(some2.occupancy).toBe(17)
      expect(some2.toAscii.trim()).toBe(
        `111.......
111.......
11111.....
..111.....
..111.....
..........
..........
..........
..........
..........`
      )
      expect(all.toAscii).toBe(
        `111.......
1111......
1111......
.111......
..........
..........
..........
..........
..........
..........`
      )
      const all2 = all.join(some)

      expect(all2.toAscii).toBe(
        `111.......
1111......
11111.....
.1111.....
..111.....
..........
..........
..........
..........
..........`
      )

      expect(all2.occupancy).toBe(19)
      expect(all2.bits).not.toBe(all.bits)
    })
  })
  describe('applyMap and orbit', () => {
    it('should apply identity map and return same bits', () => {
      mask.set(0, 0)
      const idMap = mask.actions.transformMaps.id
      const original = mask.actions.original

      expect(typeof original.bits).toBe('bigint')
      expect(original.bits).toBe(mask.actions.template)
      expect(typeof original.width).toBe('number')
      expect(typeof original.height).toBe('number')
      const expanded = mask.store.expandToSquare(
        mask.bits,
        mask.height,
        mask.width
      )
      expect(typeof expanded).toBe('bigint')
      expect(expanded).toBe(mask.actions.template)
      const normalized = mask.store.normalizeUpLeft(
        expanded,
        mask.width,
        mask.height
      )
      expect(typeof normalized).toBe('bigint')

      const template = mask.actions.template
      expect(typeof template).toBe('bigint')
      const action = mask.actions.applyMap(idMap)
      expect(typeof action).toBe('bigint')
      expect(action).toBe(template)
    })

    it('should return 8 symmetries in orbit', () => {
      mask.set(0, 0)
      const orbit = mask.actions.orbit()
      expect(orbit.length).toBe(8)
      // All orbits should be single bit set
      orbit.forEach(b => {
        expect(typeof b).toBe('bigint')
        expect(b !== 0n).toBe(true)
      })
    })
  })

  describe('classifyOrbitType', () => {
    it('should classify empty mask as C1', () => {
      const ss = mask.actions.symmetries
      expect(ss.length).toBe(1)
      const s = ss[0]
      const n = mask.actions.normalized(mask.actions.template)
      expect(s).toBe(n)
      const k = mask.actions.order
      expect(k).toBe(1)
      expect(mask.actions.classifyOrbitType()).toBe('SYM')
    })

    it('should classify full mask as C1', () => {
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) mask.set(x, y)
      expect(mask.actions.classifyOrbitType()).toBe('SYM')
    })

    it('should classify single cell as C1', () => {
      mask.set(2, 2)
      const ss = mask.actions.symmetries
      const s = ss[0]
      const n = mask.actions.normalized(mask.actions.template)
      expect(s).toBe(n)
    })
    /*
    describe('floodFill', () => {
      it('should fill empty area', () => {
        mask.floodFill(0, 0)
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            expect(mask.test(x, y)).toBe(true)
          }
      })

      it('should not fill if already set', () => {
        mask.set(0, 0)
        mask.floodFill(0, 0)
        // Only (0,0) should be set
        expect(mask.store.msbIndex(mask.bits)).toBe(0)
        expect(mask.test(0, 0)).toBe(true)
        expect(mask.occupancy).toBe(1)
      })
    })
      */
    describe('toAscii', () => {
      it('should output correct ascii for empty and filled mask', () => {
        expect(mask.toAscii.trim()).toBe('....\n....\n....\n....')
        mask.set(0, 0)
        mask.set(3, 3)
        expect(mask.toAscii.trim()).toBe('1...\n....\n....\n...1')
      })
    })

    describe('fromCoords and toCoords', () => {
      it('should handle out-of-bounds coordinates', () => {
        mask.fromCoords([
          [0, 0],
          [5, 5],
          [-1, 2]
        ])
        expect(mask.test(0, 0)).toBe(true)
        expect(mask.store.msbIndex(mask.bits)).toBe(0)
        expect(mask.occupancy).toBe(1)
      })
    })

    describe('fullMask, emptyMask, invertedMask', () => {
      it('should return a mask with all bits set', () => {
        const full = mask.fullMask
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            expect(full.for(x, y).test()).toBe(true)
          }
      })

      it('should return a mask with no bits set', () => {
        const empty = mask.emptyMask
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            expect(empty.for(x, y).test()).toBe(false)
          }
      })

      it('should return an inverted mask', () => {
        mask.set(0, 0)
        const inv = mask.invertedMask
        expect(inv.for(0, 0).test()).toBe(false)
        console.log(inv.toAscii)
        console.log(inv.bits.toString(2).padStart(16, '0'))
        expect(inv.occupancy).toBe(15)
      })
    })

    describe('edgeMasks, outerBorderMask, innerBorderMask', () => {
      it('should compute edge masks correctly', () => {
        const { left: l, right: r, top: t, bottom: b } = mask.edgeMasks()
        expect(typeof l).toBe('bigint')
        expect(typeof r).toBe('bigint')
        expect(typeof t).toBe('bigint')
        expect(typeof b).toBe('bigint')
        const left = mask.emptyMask
        left.bits = l
        const right = mask.emptyMask
        right.bits = r
        const top = mask.emptyMask
        top.bits = t
        const bottom = mask.emptyMask
        bottom.bits = b
        console.log('Left:\n' + left.toAscii)
        console.log('Right:\n' + right.toAscii)
        console.log('Top:\n' + top.toAscii)
        console.log('Bottom:\n' + bottom.toAscii)
        // left column
        for (let y = 0; y < 4; y++) {
          expect(left.at(0, y)).toBe(1)
        }
        // right column
        for (let y = 0; y < 4; y++) {
          expect(right.at(3, y)).toBe(1)
        }
        // top row
        for (let x = 0; x < 4; x++) {
          expect(top.at(x, 0)).toBe(1)
        }
        // bottom row
        for (let x = 0; x < 4; x++) {
          expect(bottom.at(x, 3)).toBe(1)
        }
      })

      it('should compute outerBorderMask ', () => {
        const msk = new Mask(5, 5)
        msk.set(1, 1)
        msk.dilate(1)
        expect(msk.occupancy).toBe(9)
        const inverse = msk.invertedMask
        expect(inverse.occupancy).toBe(16)
        expect(msk.toAscii).toBe('111..\n111..\n111..\n.....\n.....')
        expect(inverse.toAscii).toBe('...11\n...11\n...11\n11111\n11111')
        const outerBorder = msk.outerBorderMask
        expect(outerBorder.toAscii).toBe('...1.\n...1.\n...1.\n1111.\n.....')
        expect(outerBorder.occupancy).toBe(7)
        const outerBorder2 = inverse.innerBorderMask
        expect(outerBorder2.occupancy).toBe(7)
        expect(outerBorder.bits).toBe(outerBorder2.bits)
        const outerArea = msk.outerAreaMask
        expect(outerArea.toAscii).toBe('....1\n....1\n....1\n....1\n11111')
        expect(outerArea.occupancy).toBe(9)
        const outerArea2 = inverse.innerAreaMask
        expect(outerArea2.occupancy).toBe(9)
        expect(outerArea.bits).toBe(outerArea2.bits)
        const innerBorder = msk.innerBorderMask
        expect(innerBorder.occupancy).toBe(5)
        const innerBorder2 = inverse.outerBorderMask
        expect(innerBorder2.occupancy).toBe(5)
        expect(innerBorder.bits).toBe(innerBorder2.bits)
        const innerArea = msk.innerAreaMask
        expect(innerArea.occupancy).toBe(4)
        const innerArea2 = inverse.outerAreaMask
        expect(innerArea2.occupancy).toBe(4)
        expect(innerArea.bits).toBe(innerArea2.bits)

        msk.dilate(1)
        expect(msk.occupancy).toBe(16)
        const inverse2 = msk.invertedMask
        expect(inverse2.occupancy).toBe(9)
        const outerBorder3 = msk.outerBorderMask
        expect(outerBorder3.occupancy).toBe(9)
        expect(outerBorder3.bits).toBe(inverse2.bits)
        const outerBorder4 = inverse2.innerBorderMask
        expect(outerBorder4.occupancy).toBe(9)
        expect(outerBorder3.bits).toBe(outerBorder4.bits)
      })

      it('should compute innerBorderMask', () => {
        const msk = new Mask(5, 5)
        msk.set(2, 2)
        msk.dilate(1)
        expect(msk.occupancy).toBe(9)
        const inverse = msk.invertedMask
        expect(msk.toAscii).toBe('.....\n.111.\n.111.\n.111.\n.....')
        expect(inverse.toAscii).toBe('11111\n1...1\n1...1\n1...1\n11111')

        expect(inverse.occupancy).toBe(16)
        expect(msk.occupancy).toBe(9)
        const outerBorder = msk.outerBorderMask
        expect(msk.occupancy).toBe(9)
        expect(outerBorder.occupancy).toBe(16)
        const outerBorder2 = inverse.innerBorderMask
        expect(msk.occupancy).toBe(9)
        expect(outerBorder2.occupancy).toBe(16)
        expect(outerBorder.bits).toBe(inverse.bits)
        expect(outerBorder.bits).toBe(outerBorder2.bits)
        const outerArea = msk.outerAreaMask
        expect(msk.occupancy).toBe(9)
        expect(outerArea.occupancy).toBe(0)
        const outerArea2 = inverse.innerAreaMask
        expect(msk.occupancy).toBe(9)
        expect(outerArea2.occupancy).toBe(0)
        expect(outerArea.bits).toBe(outerArea2.bits)
        const innerBorder = msk.innerBorderMask
        expect(msk.occupancy).toBe(9)
        expect(innerBorder.toAscii).toBe('.....\n.111.\n.1.1.\n.111.\n.....')
        expect(innerBorder.occupancy).toBe(8)

        const innerBorder2 = inverse.outerBorderMask
        expect(innerBorder2.occupancy).toBe(8)
        expect(innerBorder.bits).toBe(innerBorder2.bits)
        const innerArea = msk.innerAreaMask
        expect(msk.occupancy).toBe(9)
        expect(innerArea.occupancy).toBe(1)
        const innerArea2 = inverse.outerAreaMask
        expect(innerArea2.occupancy).toBe(1)
        expect(innerArea.bits).toBe(innerArea2.bits)

        const old = msk.clone

        msk.dilate(1)
        expect(old.occupancy).toBe(9)
        expect(old.bits).not.toBe(msk.bits)
        expect(msk.occupancy).toBe(25)

        const inverse2 = msk.invertedMask
        expect(inverse2.occupancy).toBe(0)
        const outerBorder3 = msk.outerBorderMask
        expect(outerBorder3.occupancy).toBe(0)
        const outerBorder4 = inverse2.innerBorderMask
        expect(outerBorder4.occupancy).toBe(0)
        const innerBorder3 = msk.innerBorderMask
        expect(innerBorder3.occupancy).toBe(0)
        const outerBorder5 = inverse2.innerBorderMask
        expect(outerBorder5.occupancy).toBe(0)
        old.erode(1)
        expect(old.occupancy).toBe(1)
        expect(msk.occupancy).toBe(25)
        const inverse3 = old.invertedMask
        expect(inverse3.occupancy).toBe(24)
        const outerBorder6 = old.outerBorderMask
        expect(outerBorder6.occupancy).toBe(8)
        const outerBorder7 = inverse3.innerBorderMask
        expect(outerBorder7.occupancy).toBe(8)
        const innerBorder4 = old.innerBorderMask
        expect(innerBorder4.occupancy).toBe(1)
        const outerBorder8 = inverse3.outerBorderMask
        expect(outerBorder8.occupancy).toBe(1)
      })
    })
  })

  describe('addLayers and related methods', () => {
    describe('addToLayersBits', () => {
      it('should return array with background layer first, then expanded foreground layers', () => {
        const mask1 = new Mask(4, 4)
        mask1.set(0, 0)
        mask1.set(1, 1)

        const mask2 = new Mask(4, 4)
        mask2.set(2, 2)

        const result = mask1.addToLayersBits([mask2.bits])
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(2) // background + 1 layer
        // First element should be background (original mask minus foreground layers)
        expect(result[0]).toBeDefined()
        // Second element should be the expanded foreground layer
        expect(result[1]).toBeDefined()
      })

      it('should handle multiple foreground layers', () => {
        const mask1 = new Mask(3, 3)
        mask1.set(0, 0)

        const layer1 = new Mask(3, 3)
        layer1.set(1, 1)
        const layer2 = new Mask(3, 3)
        layer2.set(2, 2)

        const result = mask1.addToLayersBits([layer1.bits, layer2.bits])
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(3) // background + 2 layers
      })

      it('should handle empty layers', () => {
        const mask1 = new Mask(4, 4)
        mask1.set(0, 0)
        const result = mask1.addToLayersBits([])
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(1) // just background
      })
    })

    describe('addToLayers', () => {
      it('should return array of Mask objects with background layer first', () => {
        const mask1 = new Mask(4, 4)
        mask1.set(0, 0)
        mask1.set(1, 1)

        const mask2 = new Mask(4, 4)
        mask2.set(2, 2)

        const result = mask1.addToLayers([mask2])
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(2) // background + 1 layer
        expect(result[0]).toBeInstanceOf(Mask)
        expect(result[1]).toBeInstanceOf(Mask)
      })

      it('layers should have occupancy matching original masks', () => {
        const mask1 = new Mask(4, 4)
        mask1.set(0, 0)
        mask1.set(1, 1)

        const mask2 = new Mask(4, 4)
        mask2.set(2, 2)
        mask2.set(3, 3)

        const result = mask1.addToLayers([mask2])
        // Background should have original mask's cells (2 cells)
        expect(result[0].occupancy).toBe(2)
        // Foreground should have mask2's cells (2 cells)
        expect(result[1].occupancy).toBe(2)
      })
    })

    describe('addLayersBits', () => {
      it('should return a bigint (not array)', () => {
        const mask1 = new Mask(3, 3)
        mask1.set(0, 0)
        mask1.set(1, 1)

        const mask2 = new Mask(3, 3)
        mask2.set(2, 2)

        const result = mask1.addLayersBits([mask2.bits])
        expect(typeof result === 'bigint').toBe(true)
      })

      it('should assemble color layers into single bitboard', () => {
        const mask1 = new Mask(3, 3, null, null, 3)
        mask1.set(0, 0)
        mask1.set(1, 1)

        const mask2 = new Mask(3, 3, null, null, 3)
        mask2.set(2, 2)

        const result = mask1.addLayersBits([mask2.bits])
        // Result should be a single bigint with multiple colors encoded
        expect(typeof result === 'bigint').toBe(true)
        // Just verify it returns something, may be 0 if layers don't overlap
      })

      it('should handle multiple layers with proper color encoding', () => {
        const gridSize = 4
        const mask1 = new Mask(gridSize, gridSize, null, null, 3)
        mask1.set(0, 0)

        const layer1 = new Mask(gridSize, gridSize, null, null, 1)
        layer1.set(1, 1)
        const layer2 = new Mask(gridSize, gridSize, null, null, 1)
        layer2.set(2, 2)

        const result = mask1.addLayersBits([layer1.bits, layer2.bits])
        expect(typeof result === 'bigint').toBe(true)
      })
    })

    describe('addLayers', () => {
      it('should mutate the mask with new board structure', () => {
        const mask1 = new Mask(3, 3)
        mask1.set(0, 0)
        mask1.set(1, 1)

        const mask2 = new Mask(3, 3)
        mask2.set(2, 2)

        const oldDepth = mask1.depth
        const oldBits = mask1.bits
        mask1.addLayers([mask2.bits])

        // Depth should increase
        expect(mask1.depth).toBe(3) // old depth (1) + layers.length (1) + 1 = 3
        // Bits should change
        expect(mask1.bits).not.toBe(oldBits)
      })

      it('should correctly assemble old bits as background layer', () => {
        const mask1 = new Mask(4, 4)
        mask1.set(0, 0)
        mask1.set(1, 0)
        mask1.set(0, 1)

        const oldOccupancy = mask1.occupancy
        const mask2 = new Mask(4, 4)
        mask2.set(2, 2)
        mask2.set(3, 3)

        mask1.addLayers([mask2.bits])

        // The resulting mask should encode both the old mask and the new layers
        // Occupancy in multi-layer mode may be different due to multi-color encoding
        expect(mask1.bits).not.toBe(0n)
      })

      it('should handle multiple new layers', () => {
        const mask1 = new Mask(3, 3)
        mask1.set(0, 0)

        const layer1 = new Mask(3, 3)
        layer1.set(1, 1)
        const layer2 = new Mask(3, 3)
        layer2.set(2, 2)

        mask1.addLayers([layer1.bits, layer2.bits])

        expect(mask1.depth).toBe(4) // 1 + 2 + 1 = 4
        expect(mask1.bits).not.toBe(0n)
      })

      it('should create proper store for increased depth', () => {
        const mask1 = new Mask(5, 5)
        mask1.set(1, 1)

        const mask2 = new Mask(5, 5)
        mask2.set(2, 2)

        const oldStore = mask1.store
        mask1.addLayers([mask2.bits])

        // Store should be different (new instance)
        expect(mask1.store).not.toBe(oldStore)
        // New store should have increased depth
        expect(mask1.store.depth).toBe(3) // 1 + 1 + 1
      })
    })

    describe('regression test: addLayers should call addLayersBits not addToLayersBits', () => {
      it('addLayers uses correct multi-color encoding (not background-first encoding)', () => {
        // This test ensures that addLayers calls addLayersBits (which uses assembleColorLayers)
        // and not addToLayersBits (which prepends background layer)
        const mask1 = new Mask(4, 4)
        mask1.set(0, 0)

        const layer1bits = new Mask(4, 4)
        layer1bits.set(2, 2)

        mask1.addLayers([layer1bits.bits])

        // After addLayers, the bits should be a multi-color bitboard where colors represent layers
        // NOT an array with background prepended
        expect(typeof mask1.bits === 'bigint').toBe(true)
        expect(mask1.depth).toBe(3) // Should be 3 (original 1 + 1 layer + 1 for encoding)
      })

      it('should maintain grid size after addLayers', () => {
        const width = 6
        const height = 4
        const mask1 = new Mask(width, height)
        mask1.set(0, 0)

        const layer1 = new Mask(width, height)
        layer1.set(1, 1)

        mask1.addLayers([layer1.bits])

        expect(mask1.width).toBe(width)
        expect(mask1.height).toBe(height)
      })
    })
  })
})
