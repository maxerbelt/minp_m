/* eslint-env jest */

/* global describe, it, expect, beforeEach */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { AsciiGrid } from './asciiGrid.js'
import { Mask } from './mask.js'

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

  describe('empty and full getters', () => {
    it('creates empty grid with all fillChar', () => {
      const g = new AsciiGrid(3, 2)
      g.set(0, 0, 1)
      g.set(2, 1, 1)
      expect(g.occupancy).toBe(2)

      const emptyGrid = g.empty
      expect(emptyGrid.width).toBe(g.width)
      expect(emptyGrid.height).toBe(g.height)
      expect(emptyGrid.fillChar).toBe(g.fillChar)
      expect(emptyGrid.toAscii).toBe('...\n...')
      expect(emptyGrid.occupancy).toBe(0)
    })

    it('creates full grid with all "#"', () => {
      const g = new AsciiGrid(3, 2)
      const fullGrid = g.full
      expect(fullGrid.width).toBe(g.width)
      expect(fullGrid.height).toBe(g.height)
      expect(fullGrid.toAscii).toBe('###\n###')
      expect(fullGrid.occupancy).toBe(6)
    })

    it('respects custom fillChar in empty grid', () => {
      const g = new AsciiGrid(2, 2, null, ' ')
      g.set(0, 0, 1)
      const emptyGrid = g.empty
      // empty getter fills with '.' regardless of original fillChar
      expect(emptyGrid.toAscii).toBe('..\n..')
      // but the fillChar property is preserved for the new grid
      expect(emptyGrid.fillChar).toBe(' ')
    })
  })

  describe('fromMask static method', () => {
    let mask

    beforeEach(() => {
      mask = Mask.empty(3, 3)
    })

    it('creates grid from mask with matching dimensions', () => {
      const grid = AsciiGrid.fromMask(mask)
      expect(grid.width).toBe(mask.width)
      expect(grid.height).toBe(mask.height)
      expect(grid.occupancy).toBe(0)
    })

    it('copies occupied cells from mask', () => {
      mask.set(0, 0, 1)
      mask.set(2, 2, 1)
      mask.set(1, 1, 1)

      const grid = AsciiGrid.fromMask(mask)
      expect(grid.occupancy).toBe(3)
      expect(grid.at(0, 0)).toBe('#')
      expect(grid.at(2, 2)).toBe('#')
      expect(grid.at(1, 1)).toBe('#')
      expect(grid.at(0, 2)).toBe('.')
    })

    it('uses custom fillChar in fromMask', () => {
      mask.set(0, 0, 1)
      const grid = AsciiGrid.fromMask(mask, ' ')
      expect(grid.fillChar).toBe(' ')
      expect(grid.at(0, 0)).toBe('#')
      expect(grid.at(1, 0)).toBe(' ')
    })
  })

  describe('columnStride and indexMax', () => {
    it('calculates columnStride as width + 1', () => {
      const g = new AsciiGrid(5, 3)
      expect(g.columnStride).toBe(6) // 5 + 1 for newline
    })

    it('calculates indexMax correctly', () => {
      const g = new AsciiGrid(3, 2)
      expect(g.indexMax).toBe(7) // (3 + 1) * 2 - 1
    })
  })

  describe('occupancy counter', () => {
    it('counts only non-fillChar and non-newline characters', () => {
      const g = new AsciiGrid(3, 3)
      expect(g.occupancy).toBe(0)
      g.set(0, 0, 1)
      expect(g.occupancy).toBe(1)
      g.set(1, 1, 1)
      g.set(2, 2, 1)
      expect(g.occupancy).toBe(3)
    })

    it('decreases occupancy when cells are cleared', () => {
      const g = new AsciiGrid(2, 2)
      g.set(0, 0, 1)
      g.set(1, 1, 1)
      expect(g.occupancy).toBe(2)
      g.set(0, 0, 0)
      expect(g.occupancy).toBe(1)
    })
  })
})
