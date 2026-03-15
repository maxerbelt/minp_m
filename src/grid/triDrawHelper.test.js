/* eslint-env jest */
/* global describe, it, expect */

import { triToPixel, pixelToTri } from './triDrawHelper.js'

describe('triDrawHelper', () => {
  it('round trips coordinates for odd-row pattern', () => {
    const S = 10
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c <= 2 * r; c++) {
        const { x, y } = triToPixel(r, c, S)
        const [r2, c2] = pixelToTri(x, y, S)
        expect(r2).toBe(r)
        expect(c2).toBe(c)
      }
    }
  })
})
