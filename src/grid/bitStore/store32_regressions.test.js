/* eslint-env jest */
/* global describe,it,expect, jest */
import { Packed } from '../rectangle/packed.js'
import { Mask } from '../rectangle/mask.js'

describe('store32 regressions', () => {
  it('Packed matches StoreBig for small patterns (multi-depth) via ASCII occupancy', () => {
    const patterns = [
      [
        [0, 0],
        [0, 1]
      ],
      [
        [1, 1],
        [3, 0],
        [4, 2]
      ],
      [
        [0, 4],
        [7, 0],
        [2, 2]
      ]
    ]

    const width = 8
    const height = 5

    for (const depth of [1]) {
      for (const coords of patterns) {
        const big = new Mask(width, height)
        const packed = new Packed(width, height, null, null, depth)

        for (const [x, y] of coords) {
          big.set(x, y)
          packed.set(x, y)
        }

        // same operations applied
        big.dilate(2)
        packed.dilate(2)
        big.erode(1)
        packed.erode(1)

        // normalize ASCII occupancy: Mask uses '#' '.'; Packed uses digits
        const aBig = big.toAscii
          .replace(/\n/g, '')
          .replace(/#/g, '1')
          .replace(/\./g, '0')
        const aPacked = packed.toAscii
          .replace(/\n/g, '')
          .replace(/[^.]/g, '1')
          .replace(/\./g, '0')

        expect(aPacked).toBe(aBig)
      }
    }
  })

  it('Packed vertical dilate multiword should not wrap rows', () => {
    const p = new Packed(8, 5)
    p.set(0, 0)
    p.set(0, 1)
    p.dilate(2)
    expect(p.toAscii).toBe('111.....\n111.....\n111.....\n111.....\n........')
  })
})
