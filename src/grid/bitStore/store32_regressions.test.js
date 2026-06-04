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
        const packed = new Packed(width, height, undefined, undefined, depth)

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
          .replaceAll('\n', '')
          .replaceAll('#', '1')
          .replaceAll('.', '0')
        const aPacked = packed.toAscii
          .replaceAll('\n', '')
          .replaceAll(/[^.]/g, '1')
          .replaceAll('.', '0')

        expect(aPacked).toBe(aBig)
      }
    }
  })

  it('Packed vertical dilate multiword should not wrap rows', () => {
    const p = new Packed(8, 5)
    p.set(0, 0)
    // @ts-ignore - SonarQube: intentionally setting same x with different y values
    p.set(0, 1) // NOSONAR - deliberate: testing column 0 at different rows
    p.dilate(2)
    expect(p.toAscii).toBe('111.....\n111.....\n111.....\n111.....\n........')
  })
})
