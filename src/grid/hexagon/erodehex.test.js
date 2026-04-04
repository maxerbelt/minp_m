/* eslint-env jest */

/* global beforeEach, describe, it, expect */
import { MaskHex } from './maskHex.js'
import { beforeEach, describe, it, expect, jest } from '@jest/globals'

let mask
// Jest test suite
describe('erode hex bug', () => {
  beforeEach(() => {
    mask = new MaskHex(2)
  })

  it('dilate should grow and erode should shrink', () => {
    mask.set(0, 0)
    expect(mask.occupancy).toBe(1)
    expect(mask.toAscii).toBe(
      '   . . .\n  . . . .\n . . 1 . .\n  . . . .\n   . . .'
    )
    mask.dilate(1)
    expect(mask.occupancy).toBe(7)
    expect(mask.toAscii).toBe(
      '   . . .\n  . 1 1 .\n . 1 1 1 .\n  . 1 1 .\n   . . .'
    )

    mask.erode(1)
    expect(mask.toAscii).toBe(
      '   . . .\n  . . . .\n . . 1 . .\n  . . . .\n   . . .'
    )
  })

  it('dilate should grow and erode should shrink', () => {
    mask.set(0, -1)
    expect(mask.occupancy).toBe(1)
    expect(mask.toAscii).toBe(
      '   . . .\n  . 1 . .\n . . . . .\n  . . . .\n   . . .'
    )
    mask.dilate(1)
    expect(mask.occupancy).toBe(7)
    expect(mask.toAscii).toBe(
      '   1 1 .\n  1 1 1 .\n . 1 1 . .\n  . . . .\n   . . .'
    )

    mask.erode(1)
    expect(mask.toAscii).toBe(
      '   1 . .\n  . 1 . .\n . . . . .\n  . . . .\n   . . .'
    )
    mask.erode(1)
    expect(mask.toAscii).toBe(
      '   . . .\n  . . . .\n . . . . .\n  . . . .\n   . . .'
    )
  })

  it('dilate should grow and erode should shrink', () => {
    mask.set(0, -2)
    expect(mask.occupancy).toBe(1)
    expect(mask.toAscii).toBe(
      '   1 . .\n  . . . .\n . . . . .\n  . . . .\n   . . .'
    )
    mask.dilate(1)
    expect(mask.occupancy).toBe(4)
    expect(mask.toAscii).toBe(
      '   1 1 .\n  1 1 . .\n . . . . .\n  . . . .\n   . . .'
    )

    mask.erode(1)
    expect(mask.toAscii).toBe(
      '   1 . .\n  . . . .\n . . . . .\n  . . . .\n   . . .'
    )
  })
})
