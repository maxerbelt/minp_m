/* eslint-env jest */

/* global beforeEach, describe, it, expect */
import { Mask } from './mask.js'

import { beforeEach, describe, it, expect, jest } from '@jest/globals'

describe('Mask - additional methods and edge cases', () => {
  let mask

  beforeEach(() => {
    mask = new Mask(4, 4)
  })

  describe('bitPos', () => {
    it('should return correct bit position as BigInt', () => {
      expect(mask.bitPos(0, 0)).toBe(0n)
      expect(mask.bitPos(1, 0)).toBe(1n)
      expect(mask.bitPos(0, 1)).toBe(4n)
      expect(mask.bitPos(3, 3)).toBe(15n)
    })
  })

  describe('morphological operations', () => {
    beforeEach(() => {
      mask = new Mask(4, 4)
    })

    //this.expandBorderMask(borderSize, fillValue)
    it('expandBorderMask should expand mask', () => {
      mask.set(1, 1)
      mask.dilate()
      expect(mask.occupancy).toBe(9)
      expect(mask.toAscii).toBe('111.\n111.\n111.\n....')
      expect(mask.width).toBe(4)
      expect(mask.height).toBe(4)
      expect(mask.store.width).toBe(4)
      expect(mask.store.height).toBe(4)
      expect(mask.store.bitsPerCell).toBe(1)
      const grownbits = mask.store.expandToWidthWithXYOffset(
        4,
        4,
        mask.bits,
        6,
        1,
        1
      )
      const grownBreakdown = new Mask(6, 6, grownbits, null, 1)
      expect(grownBreakdown.occupancy).toBe(9)
      expect(grownBreakdown.toAscii).toBe(
        '......\n.111..\n.111..\n.111..\n......\n......'
      )
      const grown = mask.expandBorderMask(1, 0)
      expect(grown.width).toBe(6)
      expect(grown.height).toBe(6)
      expect(grown.store.width).toBe(6)
      expect(grown.store.height).toBe(6)
      expect(grown.occupancy).toBe(9)
      expect(grown.toAscii).toBe(
        '......\n.111..\n.111..\n.111..\n......\n......'
      )
    })
    it('dilateExpand should expand neighbors', () => {
      mask.set(1, 1)
      mask.dilate()
      expect(mask.occupancy).toBe(9)
      expect(mask.toAscii).toBe('111.\n111.\n111.\n....')

      const grown = mask.dilateExpand()
      expect(grown.width).toBe(6)
      expect(grown.height).toBe(6)
      expect(grown.toAscii).toBe(
        '11111.\n11111.\n11111.\n11111.\n11111.\n......'
      )
      expect(grown.occupancy).toBe(25)
    })
    it('dilate should expand neighbors', () => {
      mask.set(1, 1)
      mask.dilate(1)
      expect(mask.occupancy).toBe(9)
      expect(mask.toAscii.trim()).toBe('111.\n111.\n111.\n....')

      mask.erode(1)
      expect(mask.occupancy).toBe(4)
      expect(mask.toAscii.trim()).toBe('11..\n11..\n....\n....')

      mask.dilate(2)
      expect(mask.occupancy).toBe(16)
      mask.erode(1)
      expect(mask.occupancy).toBe(16)
    })

    it('dilateCross only touches cardinal neighbors in corner', () => {
      mask.set(0, 0)
      expect(mask.toAscii).toBe('1...\n....\n....\n....')
      expect(mask.occupancy).toBe(1)
      mask.dilateCross()
      expect(mask.toAscii).toBe('11..\n1...\n....\n....')
      expect(mask.occupancy).toBe(3)
      mask.dilateCross()
      expect(mask.occupancy).toBe(6)
      mask.dilateCross()
      expect(mask.occupancy).toBe(10)
      mask.erode(1)
      expect(mask.occupancy).toBe(3)
      mask.dilateCross()
      expect(mask.occupancy).toBe(6)
      mask.dilateCross()
      expect(mask.occupancy).toBe(10)
      mask.dilateCross()
      expect(mask.occupancy).toBe(13)
      mask.dilateCross()
      expect(mask.occupancy).toBe(15)
      mask.dilateCross()
      expect(mask.occupancy).toBe(16)
    })

    it('dilateCross only touches cardinal neighbors in middle', () => {
      mask.set(1, 1)
      expect(mask.toAscii).toBe('....\n.1..\n....\n....')
      expect(mask.occupancy).toBe(1)
      const mask2 = mask.clone.dilateCross()
      expect(mask2.toAscii).toBe('.1..\n111.\n.1..\n....')
      expect(mask2.occupancy).toBe(5)

      expect(mask.toAscii).toBe('....\n.1..\n....\n....')
      expect(mask.occupancy).toBe(1)
    })
    it('erode should shrink the region', () => {
      mask.set(1, 1)
      mask.set(1, 2)
      expect(mask.occupancy).toBe(2)
      mask.erode(1)
      // a two-cell vertical line should erode to nothing
      expect(mask.occupancy).toBe(0)
    })
  })

  describe('morphological operations 2', () => {
    beforeEach(() => {
      mask = new Mask(5, 5)
    })
    it('dilateCross only touches cardinal neighbors', () => {
      mask.set(2, 2)
      expect(mask.occupancy).toBe(1)
      mask.dilateCross()
      expect(mask.occupancy).toBe(5)
      expect(mask.toAscii.trim()).toBe('.....\n..1..\n.111.\n..1..\n.....')
    })
    it('dilateCross in corner', () => {
      mask.set(0, 0)
      expect(mask.occupancy).toBe(1)
      mask.dilateCross()
      expect(mask.occupancy).toBe(3)
      mask.dilateCross()
      expect(mask.occupancy).toBe(6)
      expect(mask.toAscii.trim()).toBe('111..\n11...\n1....\n.....\n.....')
      mask.dilateCross()
      expect(mask.occupancy).toBe(10)
      mask.dilateCross()
      expect(mask.occupancy).toBe(15)
      mask.erode(1)
      expect(mask.occupancy).toBe(6)
      mask.dilateCross()
      expect(mask.occupancy).toBe(10)
      mask.dilateCross()
      expect(mask.occupancy).toBe(15)
      mask.dilateCross()
      expect(mask.occupancy).toBe(19)
      mask.dilateCross()
      expect(mask.occupancy).toBe(22)
      mask.dilateCross()
      expect(mask.occupancy).toBe(24)
      mask.dilateCross()
      expect(mask.occupancy).toBe(25)
      mask.erode(1)
      expect(mask.occupancy).toBe(25)
    })
    it('dilate should expand neighbors', () => {
      mask.set(1, 1)
      mask.dilate(1)
      expect(mask.occupancy).toBe(9)
      expect(mask.toAscii.trim()).toBe('111..\n111..\n111..\n.....\n.....')
      mask.erode(1)
      expect(mask.toAscii.trim()).toBe('11...\n11...\n.....\n.....\n.....')
      expect(mask.occupancy).toBe(4)

      mask.dilate(2)
      expect(mask.occupancy).toBe(16)
      expect(mask.toAscii.trim()).toBe('1111.\n1111.\n1111.\n1111.\n.....')
      mask.erode(1)
      // erode should not erode from edges
      expect(mask.occupancy).toBe(9)
      expect(mask.toAscii.trim()).toBe('111..\n111..\n111..\n.....\n.....')

      mask.dilate(1)
      expect(mask.occupancy).toBe(16)
      mask.dilate(1)
      expect(mask.occupancy).toBe(25)
      mask.erode(1)
      // erode should not erode from edges
      expect(mask.occupancy).toBe(25)
    })

    it('erode should shrink the region', () => {
      mask.set(1, 0, 1n)
      mask.set(1, 1, 1n)
      mask.set(1, 2, 1n)
      expect(mask.occupancy).toBe(3)
      mask.erode(1)
      // a three-cell vertical line should erode to nothing
      expect(mask.occupancy).toBe(0)
      // Re-set after erode
      mask.set(1, 0, 1n)
      mask.set(1, 1, 1n)
      mask.set(1, 2, 1n)
      expect(mask.occupancy).toBe(3)
      mask.dilate(1)
      expect(mask.occupancy).toBe(12)
      expect(mask.toAscii.trim()).toBe('111..\n111..\n111..\n111..\n.....')

      mask.erode(1)
      expect(mask.occupancy).toBe(6)
      expect(mask.toAscii.trim()).toBe('11...\n11...\n11...\n.....\n.....')

      mask.erode(1)

      expect(mask.occupancy).toBe(2)
      expect(mask.toAscii.trim()).toBe('1....\n1....\n.....\n.....\n.....')

      mask.erode(1)
      expect(mask.occupancy).toBe(0)
    })

    it('erode should shrink at the edges', () => {
      mask.set(1, 0)
      mask.set(2, 0)
      mask.set(3, 0)
      expect(mask.occupancy).toBe(3)
      expect(mask.toAscii.trim()).toBe('.111.\n.....\n.....\n.....\n.....')

      mask.erode(1)
      expect(mask.occupancy).toBe(0)
      // Re-set after erode
      mask.set(1, 0, 1n)
      mask.set(2, 0, 1n)
      mask.set(3, 0, 1n)
      expect(mask.occupancy).toBe(3)
      mask.dilate(1)

      expect(mask.toAscii.trim()).toBe('11111\n11111\n.....\n.....\n.....')
      expect(mask.occupancy).toBe(10)

      mask.erode(1)
      expect(mask.occupancy).toBe(5)
      expect(mask.toAscii.trim()).toBe('11111\n.....\n.....\n.....\n.....')

      mask.erode(1)
      expect(mask.occupancy).toBe(0)
    })
  })
})
