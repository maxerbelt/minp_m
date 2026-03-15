// src/grid/ForLocation.test.js
/* eslint-env jest */
import { jest } from '@jest/globals'
/* global describe, it, expect */
import { ForLocation } from './ForLocation'

function makeMockStore (initialBits = 0n) {
  const store = {
    check: jest.fn(),
    bitMaskByPos: jest.fn(pos => 1n << BigInt(pos)),
    clearBits: jest.fn((bits, mask) => bits & ~mask),
    setMask: jest.fn((pos, color) => BigInt(color) << BigInt(pos)),
    numValue: jest.fn((bits, pos) => Number((bits >> BigInt(pos)) & 1n)),
    value: jest.fn((bits, pos) => (bits >> BigInt(pos)) & 1n),
    empty: 0n,
    // helper to initialize bits for assertions if needed
    _initialBits: initialBits
  }
  return store
}

describe('ForLocation', () => {
  it('at returns numeric value, test and isNonZero behave correctly', () => {
    const pos = 2
    const bits = 1n << BigInt(pos) // bit at pos = 1
    const store = makeMockStore(bits)
    const loc = new ForLocation(pos, bits, store)

    expect(loc.at()).toBe(1)
    expect(loc.test(1)).toBe(true)
    expect(loc.test(0)).toBe(false)
    expect(loc.isNonZero()).toBe(true)

    // underlying store helpers were used
    expect(store.numValue).toHaveBeenCalledWith(bits, pos)
    expect(store.value).toHaveBeenCalledWith(bits, pos)
  })

  it('set sets bit, returns updated bits, and calls store methods', () => {
    const existingPos = 1
    const newPos = 3
    const initialBits = 1n << BigInt(existingPos) // only existingPos set
    const store = makeMockStore(initialBits)
    const loc = new ForLocation(newPos, initialBits, store)

    const result = loc.set(1)

    // store.check invoked with provided color
    expect(store.check).toHaveBeenCalledWith(1)
    // bitMaskByPos called for the location position
    expect(store.bitMaskByPos).toHaveBeenCalledWith(newPos)
    // clearBits called with original bits and the mask for pos
    const expectedMask = 1n << BigInt(newPos)
    expect(store.clearBits).toHaveBeenCalledWith(initialBits, expectedMask)
    // setMask called for pos and color
    expect(store.setMask).toHaveBeenCalledWith(newPos, 1)

    // result should include the previously set bit and the newly set bit
    const expectedBits = (initialBits & ~expectedMask) | (1n << BigInt(newPos))
    expect(result).toBe(expectedBits)
    // instance bits updated
    expect(loc.bits).toBe(expectedBits)
  })

  it('set with color 0 clears the bit at position', () => {
    const pos = 4
    const initialBits = 1n << BigInt(pos)
    const store = makeMockStore(initialBits)
    const loc = new ForLocation(pos, initialBits, store)

    const result = loc.set(0)

    expect(store.check).toHaveBeenCalledWith(0)
    // resulting bits should have that bit cleared
    expect(result & (1n << BigInt(pos))).toBe(0n)
    expect(loc.bits & (1n << BigInt(pos))).toBe(0n)
  })

  it('clearBits delegates to store.clearBits and returns its result', () => {
    const pos = 0
    const initialBits = (1n << 2n) | (1n << 5n)
    const store = makeMockStore(initialBits)
    // override clearBits to make sure return value is observed
    store.clearBits.mockImplementation((bits, mask) => bits & ~mask)
    const loc = new ForLocation(pos, initialBits, store)

    const mask = 1n << 5n
    const out = loc.clearBits(mask)
    expect(store.clearBits).toHaveBeenCalledWith(initialBits, mask)
    expect(out).toBe(initialBits & ~mask)
  })
})
