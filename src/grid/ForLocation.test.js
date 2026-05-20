import { describe, it, expect, jest } from '@jest/globals'
import { ForLocation } from './ForLocation.js'
import { BigBits, BigOne, Bits } from './bitStore/helpers/bigbits.js'

/**
 * @typedef {object} BitStoreMock
 * @property {(color: number) => void} check
 * @property {(pos: number) => bigint} bitMaskByPos
 * @property {(bits: bigint, mask: bigint) => bigint} clearBits
 * @property {(pos: number, color: number) => bigint} setMask
 * @property {(bits: bigint, pos: number) => number} numValue
 * @property {(bits: bigint, pos: number) => bigint} value
 * @property {bigint} empty
 */

/**
 * @param {bigint} [_initialBits=0n]
 */
function makeMockStore (_initialBits = 0n) {
  const bitMaskByPosFn = /** @type {(pos: number) => bigint} */ (
    pos => BigOne.bitMaskByPos(pos)
  )
  const clearBitsFn = /** @type {(bits: bigint, mask: bigint) => bigint} */ (
    (bits, mask) => Bits.clear(bits, mask)
  )
  const setMaskFn = /** @type {(pos: number, color: number) => bigint} */ (
    (pos, color) => BigBits.setMask(pos, color)
  )
  const numValueFn = /** @type {(bits: bigint, pos: number) => number} */ (
    (bits, pos) => BigOne.numValue(bits, pos)
  )
  const valueFn = /** @type {(bits: bigint, pos: number) => bigint} */ (
    (bits, pos) => BigOne.value(bits, pos)
  )

  const store = {
    check: jest.fn(),
    bitMaskByPos: jest.fn(bitMaskByPosFn),
    clearBits: jest.fn(clearBitsFn),
    setMask: jest.fn(setMaskFn),
    numValue: jest.fn(numValueFn),
    value: jest.fn(valueFn),
    empty: 0n
  }
  return store
}

describe('ForLocation', () => {
  it('at returns numeric value, test and isOccupied behave correctly', () => {
    const pos = 2
    const bits = BigOne.bitMaskByPos(pos) // bit at pos = 1
    const store = makeMockStore(bits)
    const loc = new ForLocation(pos, bits, store)

    expect(loc.at()).toBe(1)
    expect(loc.test(1)).toBe(true)
    expect(loc.test(0)).toBe(false)
    expect(loc.isOccupied()).toBe(true)

    // underlying store helpers were used
    expect(store.numValue).toHaveBeenCalledWith(bits, pos)
    expect(store.value).toHaveBeenCalledWith(bits, pos)
  })

  it('set sets bit, returns updated bits, and calls store methods', () => {
    const existingPos = 1
    const newPos = 3
    const initialBits = BigOne.bitMaskByPos(existingPos) // only existingPos set
    const store = makeMockStore(initialBits)
    const loc = new ForLocation(newPos, initialBits, store)

    const result = loc.set(1)

    // store.check invoked with provided color
    expect(store.check).toHaveBeenCalledWith(1)
    // bitMaskByPos called for the location position
    expect(store.bitMaskByPos).toHaveBeenCalledWith(newPos)
    // clearMaskBits called with original bits and the mask for pos
    const expectedMask = BigOne.bitMaskByPos(newPos)
    expect(store.clearBits).toHaveBeenCalledWith(initialBits, expectedMask)
    // setMask called for pos and color
    expect(store.setMask).toHaveBeenCalledWith(newPos, 1)

    // result should include the previously set bit and the newly set bit
    const expectedBits =
      (initialBits & ~expectedMask) | BigOne.bitMaskByPos(newPos)
    expect(result).toBe(expectedBits)

    expect(loc.cellBits).toBe(expectedBits)
  })

  it('set with color 0 clears the bit at position', () => {
    const pos = 4
    const initialBits = BigOne.bitMaskByPos(pos)
    const store = makeMockStore(initialBits)
    const loc = new ForLocation(pos, initialBits, store)

    const result = loc.set(0)

    expect(store.check).toHaveBeenCalledWith(0)
    // resulting bits should have that bit cleared
    expect(result & BigOne.bitMaskByPos(pos)).toBe(0n)
    expect(loc.cellBits & BigOne.bitMaskByPos(pos)).toBe(0n)
  })

  it('clearMaskBits delegates to store.clearBits and returns its result', () => {
    const pos = 0
    const initialBits = BigOne.bitMaskByPos(2) | BigOne.bitMaskByPos(5)
    const store = makeMockStore(initialBits)
    // override clearBits to make sure return value is observed
    store.clearBits.mockImplementation((bits, mask) => Bits.clear(bits, mask))
    const loc = new ForLocation(pos, initialBits, store)

    const mask = BigOne.bitMaskByPos(5)
    const out = loc.clearMaskBits(mask)
    expect(store.clearBits).toHaveBeenCalledWith(initialBits, mask)
    expect(out).toBe(Bits.clear(initialBits, mask))
  })
})
