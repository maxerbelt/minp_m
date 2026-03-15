/* eslint-env jest */

/* global describe, it, expect */

import { beforeEach, describe, it, expect } from '@jest/globals'
import { AsciiGrid } from './asciiGrid.js'

// Jest test suite
describe('AsciiGrid', () => {
  it('uses provided ascii string and indexes including newlines', () => {
    const g = new AsciiGrid(3, 2, 'abc\ndef')

    expect(g.width).toBe(3)
    expect(g.height).toBe(2)
    expect(g.index(0, 0)).toBe(0)
    expect(g.index(2, 0)).toBe(2)
    expect(g.index(0, 1)).toBe(4) // accounts for '\n' at pos 3
    expect(g.at(0, 0)).toBe('a')
    expect(g.at(2, 1)).toBe('f')
  })

  it('defaults to fillChar and set writes "#" and restores fillChar when false', () => {
    const g = new AsciiGrid(3, 2)
    const idx = g.index(1, 0)
    expect(g.at(1, 0)).toBe('.')
    expect(g.toAscii).toBe('...\n...')
    expect(g.occupancy).toBe(0)
    g.set(1, 0, 1)
    expect(g.toAscii).toBe('.#.\n...')
    expect(g.occupancy).toBe(1)
    expect(g.string.charAt(idx)).toBe('#')
    expect(g.at(1, 0)).toBe('#')
    g.set(1, 0, 0)
    expect(g.string.charAt(idx)).toBe(g.fillChar)
    expect(g.at(1, 0)).toBe(g.fillChar)
  })

  it('does not throw for out-of-bounds set/get', () => {
    const g = new AsciiGrid(3, 2)
    expect(() => g.set(10, 10, 1)).not.toThrow()
    expect(() => g.at(10, 10)).not.toThrow()
  })
})
