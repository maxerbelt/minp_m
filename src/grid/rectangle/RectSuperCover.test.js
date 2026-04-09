/* eslint-env jest */
import { expect } from '@jest/globals'
import { RectIndex } from './RectIndex.js'
import { RectSuperCover } from './RectSuperCover.js'
import { AsciiGrid } from '../asciiGrid.js'

describe('RectSuperCover', () => {
  let rectIndex
  let rectSuper
  let grid

  beforeEach(() => {
    rectIndex = new RectIndex(5, 5)
    rectSuper = new RectSuperCover(rectIndex)
    grid = new AsciiGrid(rectIndex.width, rectIndex.height)
  })

  afterEach(() => {
    rectIndex = null
    rectSuper = null
    grid = null
  })

  describe('yieldSuperCoverCornerCells()', () => {
    it('yields extra cells when both axes move and indexer provided', () => {
      const indexer = (x, y, step) => [x, y, step]
      const extra = Array.from(
        rectSuper.yieldSuperCoverCornerCells(1, 1, 2, 1, 2, 1, 1, indexer)
      )
      expect(extra.length).toBeGreaterThan(0)
    })

    it('yields no cells when only one axis moves', () => {
      const indexer = (x, y, step) => [x, y, step]
      const extra = Array.from(
        rectSuper.yieldSuperCoverCornerCells(1, 0, 2, 1, 2, 1, 1, indexer)
      )
      expect(extra.length).toBe(0)
    })

    it('respects boundary when yielding extra cells', () => {
      const indexer = (x, y, step) => [x, y, step]
      const extra = Array.from(
        rectSuper.yieldSuperCoverCornerCells(1, 1, 4, 1, 4, 1, 1, indexer)
      )
      extra.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })
  })

  describe('superCover traversal methods', () => {
    it('super segment from (1,1) to (3,3) returns 7 points', () => {
      const line = Array.from(rectSuper.superCoverSegmentTo(1, 1, 3, 3))
      expect(line.length).toBe(7)
      expect(line[0]).toEqual([1, 1, 1])
      expect(line[3]).toEqual([2, 2, 4])
      expect(line[6]).toEqual([3, 3, 7])
    })

    it('super cover segment from (1,1) to (3,3) returns 7 points (display)', () => {
      const ss = rectSuper.superCoverSegmentTo(1, 1, 3, 3)
      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(7)
      expect(g.toAscii).toBe('.....\n.##..\n.###.\n..##.\n.....')
    })

    it('super cover ray from (1,1) to (3,3) returns 10 points (display)', () => {
      const ss = rectSuper.superCoverRay(1, 1, 3, 3)
      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(10)
      expect(g.toAscii).toBe('.....\n.##..\n.###.\n..###\n...##')
    })

    it('super cover line from (1,1) to (3,3) returns 13 points (display)', () => {
      const ss = rectSuper.superCoverFullLine(1, 1, 3, 3)
      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(13)
      expect(g.toAscii).toBe('##...\n###..\n.###.\n..###\n...##')
    })

    it('superCoverRay returns more cells than normal ray', () => {
      const normal = Array.from(rectIndex.ray(2, 2, 8, 6))
      const superCover = Array.from(rectSuper.superCoverRay(2, 2, 8, 6))
      expect(superCover.length).toBeGreaterThanOrEqual(normal.length)
    })

    it('halfCoverRay returns fewer or equal cells than superCoverRay', () => {
      const halfCover = Array.from(rectIndex.halfCoverRay(2, 2, 8, 6))
      const superCover = Array.from(rectSuper.superCoverRay(2, 2, 8, 6))
      expect(halfCover.length).toBeLessThanOrEqual(superCover.length)
    })

    it('superCoverSegmentTo from (1,1) to (5,5) returns >= halfCover', () => {
      const halfCover = Array.from(rectIndex.halfCoverSegmentTo(1, 1, 5, 5))
      const superCover = Array.from(rectSuper.superCoverSegmentTo(1, 1, 5, 5))
      expect(superCover.length).toBeGreaterThanOrEqual(halfCover.length)
    })

    it('superCoverFullLine from (3,2) to (6,5) returns >= halfCoverFullLine', () => {
      const halfCover = Array.from(rectIndex.halfCoverFullLine(3, 2, 6, 5))
      const superCover = Array.from(rectSuper.superCoverFullLine(3, 2, 6, 5))
      expect(superCover.length).toBeGreaterThanOrEqual(halfCover.length)
    })

    it('vertical superCoverSegmentTo', () => {
      const line = Array.from(rectSuper.superCoverSegmentTo(4, 1, 4, 4))
      expect(line.length).toBe(4)
      line.forEach(([x, y]) => {
        expect(x).toBe(4)
      })
    })
  })

  describe('superCover indices wrappers', () => {
    it('superCoverSegmentToIndices returns proper indices', () => {
      const indices = Array.from(
        rectSuper.superCoverSegmentToIndices(0, 0, 5, 5)
      )
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(rectIndex.size)
      })
    })

    it('superCoverFullLineIndices returns proper indices', () => {
      const indices = Array.from(
        rectSuper.superCoverFullLineIndices(0, 0, 4, 4)
      )
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
      })
    })

    it('superCoverSegmentFor with distance limit', () => {
      const segment = Array.from(
        rectSuper.superCoverSegmentFor(0, 0, 10, 10, 6)
      )
      expect(segment.length).toBeLessThanOrEqual(7)
    })

    it('superCoverSegmentForIndices with distance limit', () => {
      const indices = Array.from(
        rectSuper.superCoverSegmentForIndices(0, 0, 10, 10, 6)
      )
      expect(indices.length).toBeLessThanOrEqual(7)
    })

    it('superCoverSegmentToIndices matches index method', () => {
      const coords = Array.from(rectSuper.superCoverSegmentTo(0, 0, 4, 4))
      const indices = Array.from(
        rectSuper.superCoverSegmentToIndices(0, 0, 4, 4)
      )

      expect(coords.length).toBe(indices.length)
      for (let i = 0; i < coords.length; i++) {
        expect(rectIndex.index(coords[i][0], coords[i][1])).toBe(indices[i])
      }
    })
  })
})

function gridWith (grid, ss) {
  const g = grid.empty
  for (const [r, c] of ss) {
    g.set(r, c, 1)
  }
  return g
}
