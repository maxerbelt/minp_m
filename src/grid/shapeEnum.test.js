// src/grid/Shape.test.js
/* eslint-env jest */
import { ShapeEnum } from './shapeEnum.js'
import { TriIndex } from './TriIndex.js'
import { RectIndex } from './RectIndex.js'
import { CubeIndex } from './CubeIndex.js'
/* global describe, it, expect */

// Jest test suite
describe('Shape factories', () => {
  describe('triangle', () => {
    it('creates triangle shape with correct props and indexer instances', () => {
      const side = 5
      const s = ShapeEnum.triangle(side)
      expect(s.type).toBe('triangle')
      expect(s.side).toBe(side)

      const idx1 = s.indexer
      const idx2 = s.indexer
      expect(idx1).toBeInstanceOf(TriIndex)
      // indexer for triangle should produce new instance each access
      expect(idx1).not.toBe(idx2)
    })
  })

  describe('rectangle', () => {
    it('creates rectangle shape with correct props and indexer instances', () => {
      const width = 4
      const height = 7
      const r = ShapeEnum.rectangle(width, height)
      expect(r.type).toBe('rectangle')
      expect(r.width).toBe(width)
      expect(r.height).toBe(height)

      const idx1 = r.indexer
      const idx2 = r.indexer
      expect(idx1).toBeInstanceOf(RectIndex)
      // indexer for rectangle should produce new instance each access
      expect(idx1).not.toBe(idx2)
    })
  })

  describe('hexagon', () => {
    it('creates hexagon shape with correct props and cached indexer', () => {
      const radius = 3
      const h = ShapeEnum.hexagon(radius)
      expect(h.type).toBe('hexagon')
      expect(h.radius).toBe(radius)

      const idx1 = h.indexer
      const idx2 = h.indexer
      expect(idx1).toBeInstanceOf(CubeIndex)
      // CubeIndex.getInstance is expected to return a cached/singleton instance for the radius
      expect(idx1).toBe(idx2)
    })

    it('hexagon indexer instances for same radius are equal (shared instance)', () => {
      const r = 2
      const h1 = ShapeEnum.hexagon(r)
      const h2 = ShapeEnum.hexagon(r)
      // If CubeIndex caches per radius, these should be the same instance
      expect(h1.indexer).toBe(h2.indexer)
    })
  })

  describe('triangleRect', () => {
    it('creates triangleRect shape with correct props and indexer instances', () => {
      const height = 4
      const width = 3
      const t = ShapeEnum.triangleRect(height, width)
      expect(t.type).toBe('triangle-rect')
      expect(t.height).toBe(height)
      expect(t.width).toBe(width)

      const idx1 = t.indexer
      const idx2 = t.indexer
      // each call should return a fresh TriRectIndex
      expect(idx1.constructor.name).toBe('TriRectIndex')
      expect(idx1).not.toBe(idx2)
    })
  })
})
