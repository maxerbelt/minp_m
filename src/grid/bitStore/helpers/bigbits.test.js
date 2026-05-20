import { describe, it, expect } from '@jest/globals'
import { Bits, BigBits, BigOne } from './bigbits.js'

describe('BigBits helper utilities', () => {
  it('clears masked bits correctly with Bits.clear', () => {
    const bits = 0b1111
    const mask = 0b1010

    expect(Bits.clear(bits, mask)).toBe(0b0101n)
  })

  it('creates a mask with BigBits.setMask', () => {
    expect(BigBits.setMask(2, 1)).toBe(4n)
    expect(BigBits.setMask(3, 2)).toBe(16n)
    expect(BigBits.setMask(1, 3n)).toBe(6n)
  })

  it('shifts BigInt bits right and left', () => {
    const value = 0b1010n

    expect(BigBits.shiftRight(value, 1)).toBe(0b101n)
    expect(BigBits.shiftLeft(value, 2)).toBe(0b101000n)
  })

  it('handles signed shifts with BigBits.shiftBits', () => {
    const value = 0b1n

    expect(BigBits.shiftBits(value, 0)).toBe(1n)
    expect(BigBits.shiftBits(value, 3)).toBe(8n)
    expect(BigBits.shiftBits(value, -2)).toBe(0n)
  })

  it('returns empty and one constants from BigBits', () => {
    expect(BigBits.empty).toBe(0n)
    expect(BigBits.one).toBe(1n)
  })
})

describe('BigOne single-bit helpers', () => {
  it('creates a one-bit mask for a position', () => {
    expect(BigOne.bitMaskByPos(0)).toBe(1n)
    expect(BigOne.bitMaskByPos(4)).toBe(16n)
  })

  it('reads numeric and BigInt values for a single bit', () => {
    const bits = 0b10101n

    expect(BigOne.value(bits, 0)).toBe(1n)
    expect(BigOne.value(bits, 1)).toBe(0n)
    expect(BigOne.numValue(bits, 0)).toBe(1)
    expect(BigOne.numValue(bits, 1)).toBe(0)
  })

  it('returns empty and one constants from BigOne', () => {
    expect(BigOne.empty).toBe(0n)
    expect(BigOne.one).toBe(1n)
  })
})
