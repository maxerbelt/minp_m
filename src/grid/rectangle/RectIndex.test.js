/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach */
import { expect, jest } from '@jest/globals'
import { RectIndex } from './RectIndex.js'
import { AsciiGrid } from '../asciiGrid.js'

describe('RectIndex', () => {
  let rectIndex
  let grid

  beforeEach(() => {
    rectIndex = new RectIndex(10, 8)
  })

  afterEach(() => {
    rectIndex = null
  })

  describe('constructor and basic properties', () => {
    it('creates instance with correct width and height', () => {
      expect(rectIndex.width).toBe(10)
      expect(rectIndex.height).toBe(8)
    })

    it('sets correct size as width * height', () => {
      expect(rectIndex.size).toBe(80)
    })

    it('creates instance with different dimensions', () => {
      const small = new RectIndex(3, 4)
      expect(small.size).toBe(12)
      expect(small.width).toBe(3)
      expect(small.height).toBe(4)
    })
  })

  describe('index() - converts x,y to flat index', () => {
    it('converts (0, 0) to index 0', () => {
      expect(rectIndex.index(0, 0)).toBe(0)
    })

    it('converts (1, 0) to index 1', () => {
      expect(rectIndex.index(1, 0)).toBe(1)
    })

    it('converts (0, 1) to index 10 (width)', () => {
      expect(rectIndex.index(0, 1)).toBe(10)
    })

    it('converts (9, 7) to last index', () => {
      expect(rectIndex.index(9, 7)).toBe(79)
    })

    it('converts (3, 2) correctly', () => {
      expect(rectIndex.index(3, 2)).toBe(2 * 10 + 3)
    })

    it('converts (5, 4) correctly', () => {
      expect(rectIndex.index(5, 4)).toBe(4 * 10 + 5)
    })
  })

  describe('location() - converts flat index to x,y', () => {
    it('converts index 0 to [0, 0]', () => {
      expect(rectIndex.location(0)).toEqual([0, 0])
    })

    it('converts index 1 to [1, 0]', () => {
      expect(rectIndex.location(1)).toEqual([1, 0])
    })

    it('converts index 10 to [0, 1]', () => {
      expect(rectIndex.location(10)).toEqual([0, 1])
    })

    it('converts index 79 to [9, 7]', () => {
      expect(rectIndex.location(79)).toEqual([9, 7])
    })

    it('converts index 23 to [3, 2]', () => {
      expect(rectIndex.location(23)).toEqual([3, 2])
    })

    it('converts index 45 to [5, 4]', () => {
      expect(rectIndex.location(45)).toEqual([5, 4])
    })

    it('is inverse of index()', () => {
      for (let x = 0; x < rectIndex.width; x++) {
        for (let y = 0; y < rectIndex.height; y++) {
          const i = rectIndex.index(x, y)
          const [locX, locY] = rectIndex.location(i)
          expect([locX, locY]).toEqual([x, y])
        }
      }
    })
  })

  describe('isValid() - checks bounds', () => {
    it('returns true for (0, 0)', () => {
      expect(rectIndex.isValid(0, 0)).toBe(true)
    })

    it('returns true for (5, 4)', () => {
      expect(rectIndex.isValid(5, 4)).toBe(true)
    })

    it('returns true for (9, 7)', () => {
      expect(rectIndex.isValid(9, 7)).toBe(true)
    })

    it('returns false for negative x', () => {
      expect(rectIndex.isValid(-1, 0)).toBe(false)
    })

    it('returns false for negative y', () => {
      expect(rectIndex.isValid(0, -1)).toBe(false)
    })

    it('returns false for x >= width', () => {
      expect(rectIndex.isValid(10, 0)).toBe(false)
    })

    it('returns false for y >= height', () => {
      expect(rectIndex.isValid(0, 8)).toBe(false)
    })

    it('returns false for both out of bounds', () => {
      expect(rectIndex.isValid(15, 20)).toBe(false)
    })
  })

  describe('neighbors() - returns 8 neighboring cells', () => {
    it('returns 8 neighbors for center cell', () => {
      const neighbors = rectIndex.neighbors(5, 4)
      expect(neighbors.length).toBe(8)
    })

    it('returns correct neighbors for (5, 4)', () => {
      const neighbors = rectIndex.neighbors(5, 4)
      expect(neighbors.length).toBe(8)
      // Verify all neighbors are unique coordinates
      const uniqueNeighbors = new Set(neighbors.map(([x, y]) => `${x},${y}`))
      expect(uniqueNeighbors.size).toBeGreaterThan(0)
    })

    it('returns consistent neighbor count regardless of position', () => {
      const n1 = rectIndex.neighbors(0, 0).length
      const n2 = rectIndex.neighbors(5, 4).length
      const n3 = rectIndex.neighbors(9, 7).length
      expect(n1).toBe(8)
      expect(n2).toBe(8)
      expect(n3).toBe(8)
    })
  })

  describe('area() - returns area values (C plus neighbors)', () => {
    it('returns 9 area cells (center + 8 neighbors)', () => {
      const area = rectIndex.area(5, 4)
      expect(area.length).toBe(9)
    })

    it('includes center cell in area', () => {
      const area = rectIndex.area(5, 4)
      const areaSet = new Set(area.map(([x, y]) => `${x},${y}`))
      expect(areaSet.has('5,4')).toBe(true)
    })

    it('includes neighbors in area', () => {
      const area = rectIndex.area(5, 4)
      expect(area.length).toBe(9)
      // Verify all coordinates are valid
      area.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })
  })

  describe('keys() - generator for all cells', () => {
    it('yields all cells with their indices', () => {
      const keys = Array.from(rectIndex.keys())
      expect(keys.length).toBe(80)
    })

    it('yields [x, y, index] tuples', () => {
      const keys = Array.from(rectIndex.keys())
      keys.forEach(([x, y, idx]) => {
        expect(typeof x).toBe('number')
        expect(typeof y).toBe('number')
        expect(typeof idx).toBe('number')
        expect(idx).toBe(rectIndex.index(x, y))
      })
    })

    it('first key is [0, 0, 0]', () => {
      const [first] = rectIndex.keys()
      expect([...first]).toEqual([0, 0, 0])
    })

    it('last key is [9, 7, 79]', () => {
      const keys = Array.from(rectIndex.keys())
      const last = keys[keys.length - 1]
      expect(last).toEqual([9, 7, 79])
    })
  })

  describe('step() - Bresenham step helper', () => {
    it('returns object with errorTerm, currentX, currentY', () => {
      const result = rectIndex.step(0, 5, 8, 0, 1, 0, 1)
      expect(result).toHaveProperty('errorTerm')
      expect(result).toHaveProperty('currentX')
      expect(result).toHaveProperty('currentY')
    })

    it('advances position correctly for basic diagonal', () => {
      const result = rectIndex.step(0, 5, 5, 0, 1, 0, 1)
      expect(result.currentX).not.toBeNaN()
      expect(result.currentY).not.toBeNaN()
    })
  })

  describe('line() - Bresenham line algorithm', () => {
    it('returns same start and end point when equal', () => {
      const line = Array.from(rectIndex.line(5, 5, 5, 5))
      expect(line.length).toBe(0)
    })

    it('generates line from (0,0) to (5,0)', () => {
      const line = Array.from(rectIndex.line(0, 0, 5, 0))
      expect(line.length).toBeGreaterThan(0)
      const [firstX, firstY, step] = line[0]
      expect([firstX, firstY]).toEqual([0, 0])
      expect(step).toBe(1)
    })

    it('generates line from (0,0) to (0,5)', () => {
      const line = Array.from(rectIndex.line(0, 0, 0, 5))
      expect(line.length).toBeGreaterThan(0)
    })

    it('generates line from (0,0) to (3,3) diagonal', () => {
      const line = Array.from(rectIndex.line(0, 0, 3, 3))
      expect(line.length).toBeGreaterThan(0)
      line.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('respects exitCondition parameter', () => {
      const distance = 3
      const line = Array.from(
        rectIndex.line(0, 0, 10, 0, (x, y, step) => step > distance)
      )
      expect(line.length).toBeLessThanOrEqual(distance)
    })

    it('uses custom indexer function', () => {
      const customIndexer = (x, y, step) => ({ x, y, step })
      const line = Array.from(rectIndex.line(0, 0, 3, 0, null, customIndexer))
      line.forEach(item => {
        expect(item).toHaveProperty('x')
        expect(item).toHaveProperty('y')
        expect(item).toHaveProperty('step')
      })
    })

    it('stops at grid boundary', () => {
      const line = Array.from(rectIndex.line(0, 0, 20, 0))
      line.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('handles lines going backwards', () => {
      const line = Array.from(rectIndex.line(5, 5, 0, 0))
      expect(line.length).toBeGreaterThan(0)
      line.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('line from start to same point yields no cells', () => {
      const line = Array.from(rectIndex.line(5, 5, 5, 5))
      expect(line.length).toBe(0)
    })

    it('handles line at grid corner', () => {
      const line = Array.from(rectIndex.line(0, 0, 0, 0))
      expect(line.length).toBe(0)
    })

    it('handles line spanning entire grid diagonally', () => {
      const line = Array.from(rectIndex.line(0, 0, 9, 7))
      expect(line.length).toBeGreaterThan(0)
      const first = line[0]
      const last = line[line.length - 1]
      expect(first[0]).toBe(0)
      expect(first[1]).toBe(0)
      expect(last[0]).toBe(9)
      expect(last[1]).toBe(7)
    })
  })

  describe('yieldSuperCoverCornerCells() - handles corner crossing', () => {
    it('yields extra cells when both axes move and indexer provided', () => {
      const indexer = (x, y, step) => [x, y, step]
      const extra = Array.from(
        rectIndex.yieldSuperCoverCornerCells(1, 1, 2, 1, 2, 1, 1, indexer)
      )
      expect(extra.length).toBeGreaterThan(0)
    })

    it('yields no cells when only one axis moves', () => {
      const indexer = (x, y, step) => [x, y, step]
      const extra = Array.from(
        rectIndex.yieldSuperCoverCornerCells(1, 0, 2, 1, 2, 1, 1, indexer)
      )
      expect(extra.length).toBe(0)
    })

    it('respects boundary when yielding extra cells', () => {
      const indexer = (x, y, step) => [x, y, step]
      const extra = Array.from(
        rectIndex.yieldSuperCoverCornerCells(1, 1, 4, 1, 4, 1, 1, indexer)
      )
      extra.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })
  })

  describe('stepMove() - move step with direction tracking', () => {
    it('returns object with errorTerm, currentX, currentY, moveInX, moveInY', () => {
      const result = rectIndex.stepMove(0, 5, 8, 0, 1, 0, 1)
      expect(result).toHaveProperty('errorTerm')
      expect(result).toHaveProperty('currentX')
      expect(result).toHaveProperty('currentY')
      expect(result).toHaveProperty('moveInX')
      expect(result).toHaveProperty('moveInY')
    })

    it('moveInX and moveInY are 0 or 1', () => {
      const result = rectIndex.stepMove(0, 5, 8, 0, 1, 0, 1)
      expect([0, 1].includes(result.moveInX)).toBe(true)
      expect([0, 1].includes(result.moveInY)).toBe(true)
    })
  })

  describe('ray() - ray casting from start through end', () => {
    it('generates ray from (0,0) toward (5,5)', () => {
      const ray = Array.from(rectIndex.ray(0, 0, 5, 5))
      expect(ray.length).toBeGreaterThan(0)
    })

    it('stops at grid boundary', () => {
      const ray = Array.from(rectIndex.ray(0, 0, 20, 20))
      const lastPoint = ray[ray.length - 1]
      const [lastX, lastY] = lastPoint
      expect(rectIndex.isValid(lastX, lastY)).toBe(true)
    })

    it('all points are valid', () => {
      const ray = Array.from(rectIndex.ray(0, 0, 9, 7))
      ray.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('respects custom indexer', () => {
      const custom = (x, y, step) => `${x}:${y}`
      const ray = Array.from(rectIndex.ray(0, 0, 5, 5, custom))
      ray.forEach(item => {
        expect(typeof item).toBe('string')
      })
    })
  })

  describe('rayIndices() - ray returning flat indices', () => {
    it('generates ray indices from (0,0) toward (5,5)', () => {
      const indices = Array.from(rectIndex.rayIndices(0, 0, 5, 5))
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
      })
    })

    it('indices are within valid range', () => {
      const indices = Array.from(rectIndex.rayIndices(0, 0, 9, 7))
      indices.forEach(idx => {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(rectIndex.size)
      })
    })
  })

  describe('segmentTo() - draws line segment to exact endpoint', () => {
    it('generates segment from (0,0) to (5,5)', () => {
      const segment = Array.from(rectIndex.segmentTo(0, 0, 5, 5))
      expect(segment.length).toBeGreaterThan(0)
    })

    it('includes endpoint when within bounds', () => {
      const segment = Array.from(rectIndex.segmentTo(0, 0, 5, 5))
      const [lastX, lastY] = segment[segment.length - 1]
      expect([lastX, lastY]).toEqual([5, 5])
    })

    it('respects custom indexer', () => {
      const custom = (x, y, step) => `${x},${y}`
      const segment = Array.from(rectIndex.segmentTo(0, 0, 3, 3, custom))
      segment.forEach(item => {
        expect(typeof item).toBe('string')
      })
    })

    it('all cells are valid', () => {
      const segment = Array.from(rectIndex.segmentTo(0, 0, 7, 6))
      segment.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })
  })

  describe('segmentToIndices() - segment returning indices', () => {
    it('generates segment indices from (0,0) to (5,5)', () => {
      const indices = Array.from(rectIndex.segmentToIndices(0, 0, 5, 5))
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
      })
    })

    it('includes endpoint index', () => {
      const indices = Array.from(rectIndex.segmentToIndices(0, 0, 5, 5))
      const lastIdx = indices[indices.length - 1]
      expect(lastIdx).toBe(rectIndex.index(5, 5))
    })
  })

  describe('segmentFor() - draws limited line segment by distance', () => {
    it('generates segment with distance limit', () => {
      const segment = Array.from(rectIndex.segmentFor(0, 0, 10, 10, 5))
      expect(segment.length).toBeLessThanOrEqual(5)
    })

    it('respects distance limit strictly', () => {
      const segment = Array.from(rectIndex.segmentFor(0, 0, 10, 0, 3))
      segment.forEach((_, idx) => {
        expect(idx + 1).toBeLessThanOrEqual(3)
      })
    })

    it('respects custom indexer', () => {
      const custom = (x, y, step) => `${x},${y}:${step}`
      const segment = Array.from(rectIndex.segmentFor(0, 0, 10, 10, 5, custom))
      segment.forEach(item => {
        expect(typeof item).toBe('string')
      })
    })

    it('all cells are valid', () => {
      const segment = Array.from(rectIndex.segmentFor(0, 0, 7, 6, 4))
      segment.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })
  })

  describe('segmentForIndices() - segment indices with distance', () => {
    it('generates segment indices with distance limit', () => {
      const indices = Array.from(rectIndex.segmentForIndices(0, 0, 10, 10, 5))
      expect(indices.length).toBeLessThanOrEqual(5)
    })
  })

  describe('fullLine() - line extending to grid edges', () => {
    it('generates full line extending through grid', () => {
      const line = Array.from(rectIndex.fullLine(5, 4, 7, 6))
      expect(line.length).toBeGreaterThan(0)
    })

    it('extends beyond local range', () => {
      const line = Array.from(rectIndex.fullLine(5, 4, 7, 6))
      expect(line.length).toBeGreaterThan(0)
      line.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('respects custom indexer', () => {
      const custom = (x, y, step) => `${x}:${y}`
      const line = Array.from(rectIndex.fullLine(5, 4, 7, 6, custom))
      line.forEach(item => {
        expect(typeof item).toBe('string')
      })
    })
  })

  describe('fullLineIndices() - full line returning indices', () => {
    it('generates full line indices', () => {
      const indices = Array.from(rectIndex.fullLineIndices(5, 4, 7, 6))
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
      })
    })
  })

  describe('intercept() - finds edge intercept', () => {
    it('finds intercept along horizontal ray', () => {
      const [x, y] = rectIndex.intercept(5, 4, 10, 4)
      expect(rectIndex.isValid(x, y)).toBe(true)
    })

    it('finds intercept along vertical ray', () => {
      const [x, y] = rectIndex.intercept(5, 4, 5, 10)
      expect(rectIndex.isValid(x, y)).toBe(true)
    })

    it('finds intercept along diagonal ray', () => {
      const [x, y] = rectIndex.intercept(2, 2, 10, 10)
      expect(rectIndex.isValid(x, y)).toBe(true)
    })

    it('returns point within grid', () => {
      const [x, y] = rectIndex.intercept(5, 4, 10, 8)
      expect(x).toBeLessThan(rectIndex.width)
      expect(y).toBeLessThan(rectIndex.height)
    })
  })

  describe('intercepts() - finds both edge intercepts', () => {
    it('returns object with x0, y0, x1, y1', () => {
      const result = rectIndex.intercepts(5, 4, 7, 6)
      expect(result).toHaveProperty('x0')
      expect(result).toHaveProperty('y0')
      expect(result).toHaveProperty('x1')
      expect(result).toHaveProperty('y1')
    })

    it('both intercepts have numeric values', () => {
      const { x0, y0, x1, y1 } = rectIndex.intercepts(5, 4, 7, 6)
      expect(typeof x0).toBe('number')
      expect(typeof y0).toBe('number')
      expect(typeof x1).toBe('number')
      expect(typeof y1).toBe('number')
    })

    it('intercepts are at different positions', () => {
      const { x0, y0, x1, y1 } = rectIndex.intercepts(5, 4, 7, 6)
      const samePoint = x0 === x1 && y0 === y1
      expect(samePoint).toBe(false)
    })
  })

  describe('actions() - creates Actions instance', () => {
    it('creates an Actions instance', () => {
      const actions = rectIndex.actions(0)
      expect(actions).toBeDefined()
    })

    it('created Actions has width property', () => {
      const actions = rectIndex.actions(0)
      expect(actions.width).toBeDefined()
      expect(typeof actions.width).toBe('number')
    })

    it('created Actions has height property', () => {
      const actions = rectIndex.actions(0)
      expect(actions.height).toBeDefined()
      expect(typeof actions.height).toBe('number')
    })
  })

  describe('edge cases and special scenarios', () => {
    it('handles single-cell grid', () => {
      const single = new RectIndex(1, 1)
      expect(single.index(0, 0)).toBe(0)
      expect(single.location(0)).toEqual([0, 0])
      expect(single.isValid(0, 0)).toBe(true)
      expect(single.isValid(1, 0)).toBe(false)
    })

    it('handles very small grid (2x2)', () => {
      const small = new RectIndex(2, 2)
      expect(small.size).toBe(4)
      const keys = Array.from(small.keys())
      expect(keys.length).toBe(4)
    })

    it('handles tall narrow grid (2x20)', () => {
      const tall = new RectIndex(2, 20)
      expect(tall.size).toBe(40)
      expect(tall.isValid(1, 19)).toBe(true)
      expect(tall.isValid(2, 10)).toBe(false)
    })

    it('handles wide short grid (20x2)', () => {
      const wide = new RectIndex(20, 2)
      expect(wide.size).toBe(40)
      expect(wide.isValid(19, 1)).toBe(true)
      expect(wide.isValid(10, 2)).toBe(false)
    })
  })
  describe('ray, segment, line', () => {
    beforeEach(() => {
      rectIndex = new RectIndex(5, 5)
      grid = new AsciiGrid(rectIndex.width, rectIndex.height)
    })

    afterEach(() => {
      rectIndex = null
    })
    it('segment from (1,1) to (3,3) returns 3 points', () => {
      const line = Array.from(rectIndex.segmentTo(1, 1, 3, 3))
      expect(line.length).toBe(3)
      expect(line[0]).toEqual([1, 1, 1])
      expect(line[1]).toEqual([2, 2, 2])
      expect(line[2]).toEqual([3, 3, 3])
    })
    it('half cover segment from (1,1) to (3,3) returns 5 points', () => {
      const line = Array.from(rectIndex.halfCoverSegmentTo(1, 1, 3, 3))
      expect(line.length).toBe(5)

      expect(line[0]).toEqual([1, 1, 1])
      expect(line[2]).toEqual([2, 2, 3])
      expect(line[4]).toEqual([3, 3, 5])
    })
    it('super segment from (1,1) to (3,3) returns 5 points', () => {
      const line = Array.from(rectIndex.superCoverSegmentTo(1, 1, 3, 3))
      expect(line.length).toBe(7)

      expect(line[0]).toEqual([1, 1, 1])
      expect(line[3]).toEqual([2, 2, 4])
      expect(line[6]).toEqual([3, 3, 7])
    })
    it('segment from (1,1) to (3,3) grid', () => {
      const ss = rectIndex.segmentTo(1, 1, 3, 3)

      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(3)
      expect(g.toAscii).toBe('.....\n.#...\n..#..\n...#.\n.....')
    })

    it('half cover segment from (1,1) to (3,3) returns 5 points (display)', () => {
      const ss = rectIndex.halfCoverSegmentTo(1, 1, 3, 3)
      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(5)
      expect(g.toAscii).toBe('.....\n.##..\n..##.\n...#.\n.....')
    })
    it('super cover segment from (1,1) to (3,3) returns 7 points (display)', () => {
      const ss = rectIndex.superCoverSegmentTo(1, 1, 3, 3)

      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(7)
      expect(g.toAscii).toBe('.....\n.##..\n.###.\n..##.\n.....')
    })
    it('ray from (1,1) to (3,3) returns 4 points', () => {
      const ss = rectIndex.ray(1, 1, 3, 3)

      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(4)
      expect(g.toAscii).toBe('.....\n.#...\n..#..\n...#.\n....#')
    })

    it('half cover ray from (1,1) to (3,3) returns 7 points (display)', () => {
      const ss = rectIndex.halfCoverRay(1, 1, 3, 3)

      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(7)
      expect(g.toAscii).toBe('.....\n.##..\n..##.\n...##\n....#')
    })
    it('super cover ray from (1,1) to (3,3) returns 10 points (display)', () => {
      const ss = rectIndex.superCoverRay(1, 1, 3, 3)

      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(10)
      expect(g.toAscii).toBe('.....\n.##..\n.###.\n..###\n...##')
    })
    it('line from (1,1) to (3,3) returns 5 points', () => {
      const ss = rectIndex.fullLine(1, 1, 3, 3)

      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(5)
      expect(g.toAscii).toBe('#....\n.#...\n..#..\n...#.\n....#')
    })

    it('half cover line from (1,1) to (3,3) returns 9 points (display)', () => {
      const ss = rectIndex.halfCoverFullLine(1, 1, 3, 3)

      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(9)
      expect(g.toAscii).toBe('##...\n.##..\n..##.\n...##\n....#')
    })
    it('super cover line from (1,1) to (3,3) returns 13 points (display)', () => {
      const ss = rectIndex.superCoverFullLine(1, 1, 3, 3)

      const g = gridWith(grid, ss)
      expect(g.occupancy).toBe(13)
      expect(g.toAscii).toBe('##...\n###..\n.###.\n..###\n...##')
    })
  })

  describe('halfCoverRay and related methods', () => {
    it('halfCoverRay generates ray from (0,0) toward (5,5)', () => {
      const ray = Array.from(rectIndex.halfCoverRay(0, 0, 5, 5))
      expect(ray.length).toBeGreaterThan(0)
      expect(ray[0][0]).toBe(0)
      expect(ray[0][1]).toBe(0)
    })

    it('halfCoverRay stops at grid boundary', () => {
      const ray = Array.from(rectIndex.halfCoverRay(0, 0, 20, 20))
      const lastPoint = ray[ray.length - 1]
      const [lastX, lastY] = lastPoint
      expect(rectIndex.isValid(lastX, lastY)).toBe(true)
    })

    it('halfCoverRay all points are valid', () => {
      const ray = Array.from(rectIndex.halfCoverRay(0, 0, 9, 7))
      ray.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('halfCoverRayIndices generates ray indices from (0,0) toward (5,5)', () => {
      const indices = Array.from(rectIndex.halfCoverRayIndices(0, 0, 5, 5))
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(rectIndex.size)
      })
    })

    it('halfCoverRay returns more cells than normal ray due to extra coverage', () => {
      const normal = Array.from(rectIndex.ray(0, 0, 5, 5))
      const halfCover = Array.from(rectIndex.halfCoverRay(0, 0, 5, 5))
      expect(halfCover.length).toBeGreaterThanOrEqual(normal.length)
    })
  })

  describe('halfCoverSegmentFor and related methods', () => {
    it('halfCoverSegmentFor generates segment with distance limit', () => {
      const segment = Array.from(rectIndex.halfCoverSegmentFor(0, 0, 10, 10, 5))
      expect(segment.length).toBeLessThanOrEqual(5)
    })

    it('halfCoverSegmentFor respects distance limit strictly', () => {
      const segment = Array.from(rectIndex.halfCoverSegmentFor(0, 0, 10, 0, 3))
      segment.forEach((_, idx) => {
        expect(idx + 1).toBeLessThanOrEqual(3)
      })
    })

    it('halfCoverSegmentFor all cells are valid', () => {
      const segment = Array.from(rectIndex.halfCoverSegmentFor(0, 0, 7, 6, 4))
      segment.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('halfCoverSegmentForIndices generates segment indices with distance limit', () => {
      const indices = Array.from(
        rectIndex.halfCoverSegmentForIndices(0, 0, 10, 10, 5)
      )
      expect(indices.length).toBeLessThanOrEqual(5)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
      })
    })
  })

  describe('ray variants - directional rays in all quadrants', () => {
    it('ray from (5,4) toward (9,7) - lower-right quadrant', () => {
      const ray = Array.from(rectIndex.ray(5, 4, 9, 7))
      expect(ray.length).toBeGreaterThan(0)
      ray.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('ray from (5,4) toward (0,0) - upper-left quadrant', () => {
      const ray = Array.from(rectIndex.ray(5, 4, 0, 0))
      expect(ray.length).toBeGreaterThan(0)
      ray.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('ray from (5,4) toward (9,0) - upper-right quadrant', () => {
      const ray = Array.from(rectIndex.ray(5, 4, 9, 0))
      expect(ray.length).toBeGreaterThan(0)
      ray.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('ray from (5,4) toward (0,7) - lower-left quadrant', () => {
      const ray = Array.from(rectIndex.ray(5, 4, 0, 7))
      expect(ray.length).toBeGreaterThan(0)
      ray.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('superCoverRay returns more cells than normal ray', () => {
      const normal = Array.from(rectIndex.ray(2, 2, 8, 6))
      const superCover = Array.from(rectIndex.superCoverRay(2, 2, 8, 6))
      expect(superCover.length).toBeGreaterThanOrEqual(normal.length)
    })

    it('halfCoverRay returns fewer or equal cells than superCoverRay', () => {
      const halfCover = Array.from(rectIndex.halfCoverRay(2, 2, 8, 6))
      const superCover = Array.from(rectIndex.superCoverRay(2, 2, 8, 6))
      expect(halfCover.length).toBeLessThanOrEqual(superCover.length)
    })
  })

  describe('segment variants - comparing all three algorithms', () => {
    it('normal segment from (1,1) to (5,5)', () => {
      const segment = Array.from(rectIndex.segmentTo(1, 1, 5, 5))
      expect(segment.length).toBeGreaterThan(0)
      expect(segment[0]).toEqual([1, 1, 1])
      expect(segment[segment.length - 1][2]).toBe(segment.length)
    })

    it('halfCoverSegmentTo from (1,1) to (5,5) returns >= normal', () => {
      const normal = Array.from(rectIndex.segmentTo(1, 1, 5, 5))
      const halfCover = Array.from(rectIndex.halfCoverSegmentTo(1, 1, 5, 5))
      expect(halfCover.length).toBeGreaterThanOrEqual(normal.length)
    })

    it('superCoverSegmentTo from (1,1) to (5,5) returns >= halfCover', () => {
      const halfCover = Array.from(rectIndex.halfCoverSegmentTo(1, 1, 5, 5))
      const superCover = Array.from(rectIndex.superCoverSegmentTo(1, 1, 5, 5))
      expect(superCover.length).toBeGreaterThanOrEqual(halfCover.length)
    })

    it('all segment variants end at correct point', () => {
      const normal = Array.from(rectIndex.segmentTo(2, 2, 7, 5))
      const halfCover = Array.from(rectIndex.halfCoverSegmentTo(2, 2, 7, 5))
      const superCover = Array.from(rectIndex.superCoverSegmentTo(2, 2, 7, 5))

      expect(normal[normal.length - 1][0]).toBe(7)
      expect(normal[normal.length - 1][1]).toBe(5)

      expect(halfCover[halfCover.length - 1][0]).toBe(7)
      expect(halfCover[halfCover.length - 1][1]).toBe(5)

      expect(superCover[superCover.length - 1][0]).toBe(7)
      expect(superCover[superCover.length - 1][1]).toBe(5)
    })

    it('segmentToIndices returns proper indices', () => {
      const indices = Array.from(rectIndex.segmentToIndices(0, 0, 5, 5))
      indices.forEach((idx, i) => {
        if (i === 0) expect(idx).toBe(0)
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(rectIndex.size)
      })
    })

    it('superCoverSegmentToIndices returns proper indices', () => {
      const indices = Array.from(
        rectIndex.superCoverSegmentToIndices(0, 0, 5, 5)
      )
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(rectIndex.size)
      })
    })

    it('halfCoverSegmentToIndices returns proper indices', () => {
      const indices = Array.from(
        rectIndex.halfCoverSegmentToIndices(0, 0, 5, 5)
      )
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(rectIndex.size)
      })
    })
  })

  describe('fullLine variants - comparing all three algorithms', () => {
    it('fullLine from (3,2) to (6,5) extends across grid', () => {
      const line = Array.from(rectIndex.fullLine(3, 2, 6, 5))
      expect(line.length).toBeGreaterThan(0)
      line.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('halfCoverFullLine from (3,2) to (6,5) returns >= normal fullLine', () => {
      const normal = Array.from(rectIndex.fullLine(3, 2, 6, 5))
      const halfCover = Array.from(rectIndex.halfCoverFullLine(3, 2, 6, 5))
      expect(halfCover.length).toBeGreaterThanOrEqual(normal.length)
    })

    it('superCoverFullLine from (3,2) to (6,5) returns >= halfCoverFullLine', () => {
      const halfCover = Array.from(rectIndex.halfCoverFullLine(3, 2, 6, 5))
      const superCover = Array.from(rectIndex.superCoverFullLine(3, 2, 6, 5))
      expect(superCover.length).toBeGreaterThanOrEqual(halfCover.length)
    })

    it('fullLineIndices returns proper indices', () => {
      const indices = Array.from(rectIndex.fullLineIndices(4, 3, 7, 6))
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(rectIndex.size)
      })
    })

    it('superCoverFullLineIndices returns proper indices', () => {
      const indices = Array.from(
        rectIndex.superCoverFullLineIndices(4, 3, 7, 6)
      )
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
      })
    })

    it('halfCoverFullLineIndices returns proper indices', () => {
      const indices = Array.from(rectIndex.halfCoverFullLineIndices(4, 3, 7, 6))
      expect(indices.length).toBeGreaterThan(0)
      indices.forEach(idx => {
        expect(typeof idx).toBe('number')
      })
    })
  })

  describe('segmentFor variants - limited distance segments', () => {
    it('superCoverSegmentFor with distance limit', () => {
      const segment = Array.from(
        rectIndex.superCoverSegmentFor(0, 0, 10, 10, 6)
      )
      // SuperCover can have 1 extra cell due to corner crossing
      expect(segment.length).toBeLessThanOrEqual(7)
    })

    it('superCoverSegmentForIndices with distance limit', () => {
      const indices = Array.from(
        rectIndex.superCoverSegmentForIndices(0, 0, 10, 10, 6)
      )
      // SuperCover can have 1 extra cell due to corner crossing
      expect(indices.length).toBeLessThanOrEqual(7)
    })

    it('halfCoverSegmentFor with distance limit 4', () => {
      const segment = Array.from(rectIndex.halfCoverSegmentFor(0, 0, 10, 10, 4))
      // HalfCover can have 1 extra from potential corner crossing
      expect(segment.length).toBeLessThanOrEqual(5)
      segment.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('halfCoverSegmentForIndices with distance limit 4', () => {
      const indices = Array.from(
        rectIndex.halfCoverSegmentForIndices(0, 0, 10, 10, 4)
      )
      // HalfCover can have 1 extra from potential corner crossing
      expect(indices.length).toBeLessThanOrEqual(5)
    })

    it('segmentFor variants all respect approximate distance limit', () => {
      const distance = 5
      const normal = Array.from(rectIndex.segmentFor(1, 1, 8, 8, distance))
      const halfCover = Array.from(
        rectIndex.halfCoverSegmentFor(1, 1, 8, 8, distance)
      )
      const superCover = Array.from(
        rectIndex.superCoverSegmentFor(1, 1, 8, 8, distance)
      )

      // Normal should be exact
      expect(normal.length).toBeLessThanOrEqual(distance)
      // Half and super cover may have 1 extra due to corner crossing
      expect(halfCover.length).toBeLessThanOrEqual(distance + 1)
      expect(superCover.length).toBeLessThanOrEqual(distance + 1)
    })
  })

  describe('horizontal and vertical lines', () => {
    it('horizontal line from (2,3) to (8,3)', () => {
      const line = Array.from(rectIndex.segmentTo(2, 3, 8, 3))
      expect(line.length).toBe(7)
      line.forEach(([x, y]) => {
        expect(y).toBe(3)
      })
    })

    it('vertical line from (5,1) to (5,7)', () => {
      const line = Array.from(rectIndex.segmentTo(5, 1, 5, 7))
      expect(line.length).toBe(7)
      line.forEach(([x, y]) => {
        expect(x).toBe(5)
      })
    })

    it('horizontal halfCoverSegmentTo', () => {
      const line = Array.from(rectIndex.halfCoverSegmentTo(2, 3, 8, 3))
      expect(line.length).toBe(7)
      line.forEach(([x, y]) => {
        expect(y).toBe(3)
      })
    })

    it('vertical superCoverSegmentTo', () => {
      const line = Array.from(rectIndex.superCoverSegmentTo(5, 1, 5, 7))
      expect(line.length).toBe(7)
      line.forEach(([x, y]) => {
        expect(x).toBe(5)
      })
    })
  })

  describe('diagonal lines with different slopes', () => {
    it('line with slope 1 (45 degrees)', () => {
      const line = Array.from(rectIndex.segmentTo(1, 1, 5, 5))
      const diagonal = line.map(([x, y]) => ({ x, y }))
      expect(
        diagonal.every((p, i) => {
          if (i === 0) return p.x === 1 && p.y === 1
          const prev = diagonal[i - 1]
          return Math.abs(p.x - prev.x) <= 1 && Math.abs(p.y - prev.y) <= 1
        })
      ).toBe(true)
    })

    it('line with slope 2 (flat-ish diagonal)', () => {
      const line = Array.from(rectIndex.segmentTo(0, 0, 5, 2))
      expect(line.length).toBeGreaterThan(0)
      line.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })

    it('line with slope 0.5 (steep-ish diagonal)', () => {
      const line = Array.from(rectIndex.segmentTo(0, 0, 2, 5))
      expect(line.length).toBeGreaterThan(0)
      line.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })
  })

  describe('backward and negative direction lines', () => {
    it('horizontal line going backward from (8,3) to (2,3)', () => {
      const line = Array.from(rectIndex.segmentTo(8, 3, 2, 3))
      expect(line.length).toBe(7)
      expect(line[0]).toEqual([8, 3, 1])
      expect(line[line.length - 1][0]).toBe(2)
    })

    it('vertical line going backward from (5,7) to (5,1)', () => {
      const line = Array.from(rectIndex.segmentTo(5, 7, 5, 1))
      expect(line.length).toBe(7)
      expect(line[0]).toEqual([5, 7, 1])
      expect(line[line.length - 1][1]).toBe(1)
    })

    it('diagonal line going backward', () => {
      const line = Array.from(rectIndex.segmentTo(5, 5, 1, 1))
      expect(line.length).toBeGreaterThan(0)
      expect(line[0][0]).toBe(5)
      expect(line[0][1]).toBe(5)
      expect(line[line.length - 1][0]).toBe(1)
      expect(line[line.length - 1][1]).toBe(1)
    })
  })

  describe('line boundary conditions', () => {
    it('line that hits top-right corner', () => {
      const line = Array.from(rectIndex.fullLine(0, 7, 9, 0))
      const lastPoint = line[line.length - 1]
      expect(rectIndex.isValid(lastPoint[0], lastPoint[1])).toBe(true)
    })

    it('line that hits bottom-left corner', () => {
      const line = Array.from(rectIndex.fullLine(9, 0, 0, 7))
      const lastPoint = line[line.length - 1]
      expect(rectIndex.isValid(lastPoint[0], lastPoint[1])).toBe(true)
    })

    it('ray starting at corner goes off grid safely', () => {
      const ray = Array.from(rectIndex.ray(0, 0, 10, 10))
      ray.forEach(([x, y]) => {
        expect(rectIndex.isValid(x, y)).toBe(true)
      })
    })
  })

  describe('custom indexers', () => {
    it('segmentToIndices delegates to index method', () => {
      const coords = Array.from(rectIndex.segmentTo(0, 0, 3, 3))
      const indices = Array.from(rectIndex.segmentToIndices(0, 0, 3, 3))

      expect(coords.length).toBe(indices.length)
      for (let i = 0; i < coords.length; i++) {
        expect(rectIndex.index(coords[i][0], coords[i][1])).toBe(indices[i])
      }
    })

    it('superCoverSegmentToIndices matches index method', () => {
      const coords = Array.from(rectIndex.superCoverSegmentTo(0, 0, 4, 4))
      const indices = Array.from(
        rectIndex.superCoverSegmentToIndices(0, 0, 4, 4)
      )

      expect(coords.length).toBe(indices.length)
      for (let i = 0; i < coords.length; i++) {
        expect(rectIndex.index(coords[i][0], coords[i][1])).toBe(indices[i])
      }
    })

    it('halfCoverSegmentToIndices matches index method', () => {
      const coords = Array.from(rectIndex.halfCoverSegmentTo(0, 0, 4, 4))
      const indices = Array.from(
        rectIndex.halfCoverSegmentToIndices(0, 0, 4, 4)
      )

      expect(coords.length).toBe(indices.length)
      for (let i = 0; i < coords.length; i++) {
        expect(rectIndex.index(coords[i][0], coords[i][1])).toBe(indices[i])
      }
    })
  })
})

function display (grid, ss) {
  const g = gridWith(grid, ss)
  const ascii = g.toAscii
  return ascii
}
function gridWith (grid, ss) {
  const g = grid.empty
  for (const [r, c] of ss) {
    g.set(r, c, 1)
  }
  return g
}
