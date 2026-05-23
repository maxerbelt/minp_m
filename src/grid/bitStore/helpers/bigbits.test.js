import { describe, it, expect } from '@jest/globals'
import { Bits, BigBits, BigOne } from './bigbits.js'

/**
 * Test suite for BigBits helper utilities
 *
 * Tests bitwise operations including clearing masked bits, setting masks,
 * shifting operations (both signed and unsigned), and constant values
 * for BigInt and numeric bit manipulation.
 *
 * @typedef {Object} TestContext
 * @property {number} bits - Test bit value
 * @property {number} mask - Mask value for operations
 * @property {bigint} value - BigInt test value
 */
describe('BigBits helper utilities', () => {
  /**
   * Tests that Bits.clear correctly clears masked bits
   *
   * Verifies that masked bits are removed while unmasked bits remain
   * intact using bitwise AND with complement of mask.
   *
   * @test
   * @returns {void}
   */
  it('clears masked bits correctly with Bits.clear', () => {
    const bits = 0b1111
    const mask = 0b1010

    expect(Bits.clear(bits, mask)).toBe(0b0101n)
  })

  /**
   * Tests BigBits.setMask creates correct masks for positions
   *
   * Verifies that setMask correctly generates a single-bit mask at
   * the specified position, handling both number and BigInt position arguments.
   *
   * @test
   * @returns {void}
   */
  it('creates a mask with BigBits.setMask', () => {
    expect(BigBits.setMask(2, 1)).toBe(4n)
    expect(BigBits.setMask(3, 2)).toBe(16n)
    expect(BigBits.setMask(1, 3n)).toBe(6n)
  })

  /**
   * Tests right and left shift operations on BigInt values
   *
   * Verifies that BigBits.shiftRight and BigBits.shiftLeft correctly
   * shift bit values by the specified amount without sign extension.
   *
   * @test
   * @returns {void}
   */
  it('shifts BigInt bits right and left', () => {
    const value = 0b1010n

    expect(BigBits.shiftRight(value, 1)).toBe(0b101n)
    expect(BigBits.shiftLeft(value, 2)).toBe(0b101000n)
  })

  /**
   * Tests signed shift operations with BigBits.shiftBits
   *
   * Verifies that shiftBits correctly handles positive shifts (left),
   * zero shifts (no change), and negative shifts (right), clamping
   * results appropriately.
   *
   * @test
   * @returns {void}
   */
  it('handles signed shifts with BigBits.shiftBits', () => {
    const value = 0b1n

    expect(BigBits.shiftBits(value, 0)).toBe(1n)
    expect(BigBits.shiftBits(value, 3)).toBe(8n)
    expect(BigBits.shiftBits(value, -2)).toBe(0n)
  })

  /**
   * Tests empty and one constants are correctly defined
   *
   * Verifies that BigBits exposes empty (0n) and one (1n) constants
   * for use in bitwise operations.
   *
   * @test
   * @returns {void}
   */
  it('returns empty and one constants from BigBits', () => {
    expect(BigBits.empty).toBe(0n)
    expect(BigBits.one).toBe(1n)
  })
})

/**
 * Test suite for BigOne single-bit helper utilities
 *
 * Tests single-bit mask creation, bit value reading (both as BigInt
 * and numeric values), and constant values for single-bit operations.
 *
 * @typedef {Object} SingleBitTestContext
 * @property {bigint} bits - BigInt bit value containing multiple bits
 * @property {number} position - Position of single bit to query
 */
describe('BigOne single-bit helpers', () => {
  /**
   * Tests BigOne.bitMaskByPos creates single-bit masks
   *
   * Verifies that bitMaskByPos correctly generates a mask with a single
   * bit set at the specified position (2^position).
   *
   * @test
   * @returns {void}
   */
  it('creates a one-bit mask for a position', () => {
    expect(BigOne.bitMaskByPos(0)).toBe(1n)
    expect(BigOne.bitMaskByPos(4)).toBe(16n)
  })

  /**
   * Tests reading single bit values from BigInt and numeric formats
   *
   * Verifies that BigOne.value returns the BigInt bit value (0n or 1n)
   * and BigOne.numValue returns the numeric bit value (0 or 1) at the
   * specified position.
   *
   * @test
   * @returns {void}
   */
  it('reads numeric and BigInt values for a single bit', () => {
    const bits = 0b10101n

    expect(BigOne.value(bits, 0)).toBe(1n)
    expect(BigOne.value(bits, 1)).toBe(0n)
    expect(BigOne.numValue(bits, 0)).toBe(1)
    expect(BigOne.numValue(bits, 1)).toBe(0)
  })

  /**
   * Tests empty and one constants are correctly defined
   *
   * Verifies that BigOne exposes empty (0n) and one (1n) constants
   * for use in single-bit operations.
   *
   * @test
   * @returns {void}
   */
  it('returns empty and one constants from BigOne', () => {
    expect(BigOne.empty).toBe(0n)
    expect(BigOne.one).toBe(1n)
  })
})
