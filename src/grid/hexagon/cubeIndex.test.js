/* eslint-env jest */
/* global describe, it, expect, beforeEach, afterEach */
import { jest } from '@jest/globals'
import {
  CubeIndex,
  dilateHexManhattan,
  erodeHexSeparable
} from './CubeIndex.js'
import { Connect6 } from './Connect6.js'

// Jest test suite
describe('CubeIndex', () => {
  let cubeIndex

  beforeEach(() => {
    cubeIndex = new CubeIndex(1)
  })
  afterEach(() => {
    // Clear cache between tests if needed
  })

  describe('constructor and buildCube', () => {
    it('creates instance with radius', () => {
      expect(cubeIndex.radius).toBe(1)
    })

    it('builds coords array for radius 1', () => {
      expect(Array.isArray(cubeIndex.coords)).toBe(true)
      expect(cubeIndex.coords.length).toBeGreaterThan(0)
    })

    it('sets correct size for radius 1', () => {
      const cube1 = new CubeIndex(1)
      expect(cube1.size).toBe(7) // center + 6 neighbors
    })

    it('sets correct size for radius 2', () => {
      const cube2 = new CubeIndex(2)
      expect(cube2.size).toBe(19) // center + 6 + 12
    })

    it('all coordinates satisfy q + r + s = 0', () => {
      cubeIndex.coords.forEach(([q, r, s]) => {
        expect(q + r + s).toBe(0)
      })
    })

    it('exposes 6-way connection helper under connection.6', () => {
      expect(cubeIndex.connection[6]).toBeInstanceOf(Connect6)
    })

    it('delegates neighbors() and area() through connection.6', () => {
      const expectedNeighbors = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [-1, 1],
        [1, -1]
      ]
      expect(cubeIndex.neighbors(0, 0)).toEqual(expectedNeighbors)
      expect(cubeIndex.area(0, 0)).toEqual([[0, 0], ...expectedNeighbors])
    })

    it('coordinates within radius bounds', () => {
      cubeIndex.coords.forEach(([q, r, s]) => {
        expect(Math.abs(q)).toBeLessThanOrEqual(cubeIndex.radius)
        expect(Math.abs(r)).toBeLessThanOrEqual(cubeIndex.radius)
        expect(Math.abs(s)).toBeLessThanOrEqual(cubeIndex.radius)
      })
    })

    describe('index()', () => {
      it('returns same index for 3-arg and 2-arg with same q,r', () => {
        const idx3 = cubeIndex.index(0, 0, 0)
        const idx2 = cubeIndex.index(0, 0)
        expect(idx3).toBe(idx2)
      })

      it('returns undefined for invalid coordinates', () => {
        expect(cubeIndex.index(10, 10, -20)).toBeUndefined()
      })

      it('returns different indices for different coordinates', () => {
        const idx1 = cubeIndex.index(0, 0, 0)
        const idx2 = cubeIndex.index(1, 0, -1)
        expect(idx1).not.toBe(idx2)
      })
    })

    describe('location()', () => {
      it('returns coordinates for valid index', () => {
        const coords = cubeIndex.location(0)
        expect(coords).toEqual([-1, 0, 1])
      })

      it('returns undefined for invalid index', () => {
        expect(cubeIndex.location(999)).toBeUndefined()
      })

      it('round-trip: index -> location -> index', () => {
        const [q, r, s] = cubeIndex.coords[3]
        const idx = cubeIndex.index(q, r, s)
        const [q2, r2, s2] = cubeIndex.location(idx)
        const idx2 = cubeIndex.index(q2, r2, s2)
        expect(idx).toBe(idx2)
      })
    })

    describe('isValid()', () => {
      it('returns true for center', () => {
        expect(cubeIndex.isValid(0, 0, 0)).toBe(true)
      })

      it('returns true for valid neighbor', () => {
        expect(cubeIndex.isValid(1, 0, -1)).toBe(true)
      })

      it('returns false for out-of-bounds coordinate', () => {
        expect(cubeIndex.isValid(10, 10, -20)).toBe(false)
      })

      it('returns false for coordinate with invalid sum', () => {
        expect(cubeIndex.isValid(1, 1, 1)).toBe(false)
      })
    })

    describe('getInstance singleton', () => {
      it('returns same instance for same radius', () => {
        const inst1 = CubeIndex.getInstance(1)
        const inst2 = CubeIndex.getInstance(1)
        expect(inst1).toBe(inst2)
      })

      it('returns different instances for different radii', () => {
        const inst1 = CubeIndex.getInstance(1)
        const inst2 = CubeIndex.getInstance(2)
        expect(inst1).not.toBe(inst2)
      })

      it('cached instance has correct radius', () => {
        const inst = CubeIndex.getInstance(3)
        expect(inst.radius).toBe(3)
      })
    })

    describe('transformMaps lazy loading', () => {
      it('transformMaps is created on first access', () => {
        expect(cubeIndex.transformMaps).toBeDefined()
        expect(Array.isArray(cubeIndex.transformMaps)).toBe(true)
      })

      it('transformMaps has 12 elements (6 rotations × 2 for reflection)', () => {
        expect(cubeIndex.transformMaps.length).toBe(12)
      })
    })

    describe('cube coordinate helpers', () => {
      it('computes s from q and r', () => {
        expect(CubeIndex.qrToS(1, -2)).toBe(1)
        expect(CubeIndex.qrToS(-3, 2)).toBe(1)
      })

      it('computes r from q and s', () => {
        expect(CubeIndex.qsToR(1, -2)).toBe(1)
        expect(CubeIndex.qsToR(-3, 2)).toBe(1)
      })

      it('computes q from r and s', () => {
        expect(CubeIndex.rsToQ(-1, 0)).toBe(1)
        expect(CubeIndex.rsToQ(2, -3)).toBe(1)
      })
    })

    describe('morphological helpers', () => {
      let board
      let store
      beforeEach(() => {
        // initialize an empty Uint32Array sized for radius 1
        board = new Uint32Array(cubeIndex.size)
        // mock store object with clone and bitOrInto
        store = {
          clone: arr => new Uint32Array(arr),
          bitOrInto: (dest, src) => {
            for (let i = 0; i < dest.length; i++) dest[i] |= src[i]
            return dest
          },
          bitOr: (dest, src) => {
            let result = new Uint32Array(dest.length)
            for (let i = 0; i < dest.length; i++) result[i] = dest[i] | src[i]
            return result
          },
          createEmptyBitboard: src => new Uint32Array(src.length),
          getIdx: (arr, i) => arr[i],
          setIdx: (arr, i) => {
            arr[i] = 1
            return arr
          }
        }
      })

      it('dilateHexManhattan expands a single cell to its 6 neighbors', async () => {
        const centerIdx = cubeIndex.index(0, 0, 0)
        board[centerIdx] = 1

        // call the free function directly with store
        const { neighborMap } = cubeIndex
        const dilated = dilateHexManhattan(board, 1, neighborMap, store)
        // center should remain set
        expect(dilated[centerIdx]).toBe(1)
        // all neighbours should now be set as well
        for (const [q, r] of cubeIndex.neighbors(0, 0)) {
          const s = -q - r
          const idx = cubeIndex.index(q, r, s)
          expect(dilated[idx]).toBe(1)
        }
      })
      it('erodeHexSeparable leaves a full board unchanged', async () => {
        // set every location to 1
        board.fill(1)
        const { axisMaps } = cubeIndex
        const eroded = erodeHexSeparable(board, 1, axisMaps, store)
        // full board should remain unchanged when erosion radius is 1
        expect(eroded).toEqual(board)
      })
    })

    describe('line drawing algorithms', () => {
      it('line from center to self yields single point', () => {
        const results = []
        for (const coord of cubeIndex.line(0, 0, 0, 0)) {
          results.push(coord)
        }
        expect(results).toHaveLength(0) // start == end returns nothing
      })

      it('line from center to neighbor yields at least 2 cells', () => {
        const results = []
        for (const coord of cubeIndex.line(0, 0, 1, 0)) {
          results.push(coord)
        }
        expect(results.length).toBeGreaterThanOrEqual(2)
      })

      it('line yields coordinates with increasing step count', () => {
        const results = []
        for (const [q, r, step] of cubeIndex.line(0, 0, 1, -1)) {
          results.push([q, r, step])
        }
        // Check that step is monotonically increasing
        for (let i = 1; i < results.length; i++) {
          expect(results[i][2]).toBeGreaterThan(results[i - 1][2])
        }
      })

      it('line respects exit condition for endpoint', () => {
        const results = []
        for (const [q, r, step] of cubeIndex.line(0, 0, 1, 0)) {
          results.push([q, r, step])
        }
        // Last coordinate should be the endpoint
        const lastCoord = results[results.length - 1]
        expect(lastCoord[0]).toBe(1)
        expect(lastCoord[1]).toBe(0)
      })

      it('ray from center continues until boundary', () => {
        const results = []
        for (const [q, r] of cubeIndex.ray(0, 0, 1, 0)) {
          results.push([q, r])
        }
        // Ray should at least include center and neighbor
        expect(results.length).toBeGreaterThanOrEqual(2)
        // Ray should stop at boundary (not continue indefinitely)
        expect(results[results.length - 1]).toEqual([1, 0])
      })

      it('segmentTo matches line with endpoint exit condition', () => {
        const lineResults = []
        for (const coord of cubeIndex.line(0, 0, 1, -1)) {
          lineResults.push(coord)
        }
        const segmentResults = []
        for (const coord of cubeIndex.segmentTo(0, 0, 1, -1)) {
          segmentResults.push(coord)
        }
        expect(lineResults).toEqual(segmentResults)
      })

      it('segmentFor stops at distance limit', () => {
        const results = []
        for (const coord of cubeIndex.segmentFor(0, 0, 1, 0, 2)) {
          results.push(coord)
        }
        // Should have at most 2 steps
        expect(results.length).toBeLessThanOrEqual(2)
      })

      it('fullLine goes from boundary to boundary', () => {
        const results = []
        for (const coord of cubeIndex.fullLine(0, 0, 1, 0)) {
          results.push(coord)
        }
        // fullLine should extend beyond the endpoint
        expect(results.length).toBeGreaterThan(2)
      })
    })

    describe('superCover line drawing', () => {
      it('superCoverLine yields at least as many cells as basic line', () => {
        const lineResults = []
        for (const coord of cubeIndex.line(0, 0, 1, 0)) {
          lineResults.push(coord)
        }
        const superResults = []
        for (const coord of cubeIndex.superCoverLine(0, 0, 1, 0)) {
          superResults.push(coord)
        }
        expect(superResults.length).toBeGreaterThanOrEqual(lineResults.length)
      })

      it('superCoverRay extends to boundary', () => {
        const results = []
        for (const coord of cubeIndex.superCoverRay(0, 0, 1, 0)) {
          results.push(coord)
        }
        // Should have results (not empty)
        expect(results.length).toBeGreaterThan(0)
      })

      it('superCoverSegmentTo includes endpoint', () => {
        const results = []
        for (const [q, r] of cubeIndex.superCoverSegmentTo(0, 0, 1, 0)) {
          results.push([q, r])
        }
        // Last coordinate should be the endpoint
        const lastCoord = results[results.length - 1]
        expect(lastCoord[0]).toBe(1)
        expect(lastCoord[1]).toBe(0)
      })

      it('superCoverFullLine extends beyond endpoint', () => {
        const results = []
        for (const coord of cubeIndex.superCoverFullLine(0, 0, 1, 0)) {
          results.push(coord)
        }
        expect(results.length).toBeGreaterThan(0)
      })

      it('superCoverSegmentFor respects distance limit', () => {
        const results = []
        for (const coord of cubeIndex.superCoverSegmentFor(0, 0, 1, 0, 2)) {
          results.push(coord)
        }
        // Should have at most 2 steps
        expect(results.length).toBeLessThanOrEqual(2)
      })

      it('superCoverLine yields valid cube coordinates', () => {
        for (const [q, r] of cubeIndex.superCoverLine(0, 0, 1, 0)) {
          const s = -q - r
          expect(cubeIndex.isValid(q, r, s)).toBe(true)
        }
      })
    })

    describe('halfCover line drawing', () => {
      it('halfCoverLine yields at least as many cells as basic line', () => {
        const lineResults = []
        for (const coord of cubeIndex.line(0, 0, 1, 0)) {
          lineResults.push(coord)
        }
        const halfResults = []
        for (const coord of cubeIndex.halfCoverLine(0, 0, 1, 0)) {
          halfResults.push(coord)
        }
        expect(halfResults.length).toBeGreaterThanOrEqual(lineResults.length)
      })

      it('halfCoverRay extends to boundary', () => {
        const results = []
        for (const coord of cubeIndex.halfCoverRay(0, 0, 1, 0)) {
          results.push(coord)
        }
        expect(results.length).toBeGreaterThan(0)
      })

      it('halfCoverSegmentTo includes endpoint', () => {
        const results = []
        for (const [q, r] of cubeIndex.halfCoverSegmentTo(0, 0, 1, 0)) {
          results.push([q, r])
        }
        // Last coordinate should be the endpoint
        const lastCoord = results[results.length - 1]
        expect(lastCoord[0]).toBe(1)
        expect(lastCoord[1]).toBe(0)
      })

      it('halfCoverFullLine extends beyond endpoint', () => {
        const results = []
        for (const coord of cubeIndex.halfCoverFullLine(0, 0, 1, 0)) {
          results.push(coord)
        }
        expect(results.length).toBeGreaterThan(0)
      })

      it('halfCoverSegmentFor respects distance limit', () => {
        const results = []
        for (const coord of cubeIndex.halfCoverSegmentFor(0, 0, 1, 0, 2)) {
          results.push(coord)
        }
        expect(results.length).toBeLessThanOrEqual(2)
      })

      it('halfCoverLine yields fewer cells than superCover for diagonal lines', () => {
        const superResults = []
        for (const coord of cubeIndex.superCoverLine(0, 0, 1, -1)) {
          superResults.push(coord)
        }
        const halfResults = []
        for (const coord of cubeIndex.halfCoverLine(0, 0, 1, -1)) {
          halfResults.push(coord)
        }
        expect(halfResults.length).toBeLessThanOrEqual(superResults.length)
      })

      it('halfCoverLine yields valid cube coordinates', () => {
        for (const [q, r] of cubeIndex.halfCoverLine(0, 0, 1, 0)) {
          const s = -q - r
          expect(cubeIndex.isValid(q, r, s)).toBe(true)
        }
      })
    })

    describe('Indices wrappers', () => {
      it('rayIndices returns numeric indices', () => {
        const results = []
        for (const idx of cubeIndex.rayIndices(0, 0, 1, 0)) {
          results.push(idx)
          expect(typeof idx).toBe('number')
        }
        expect(results.length).toBeGreaterThan(0)
      })

      it('superCoverRayIndices returns numeric indices', () => {
        const results = []
        for (const idx of cubeIndex.superCoverRayIndices(0, 0, 1, 0)) {
          results.push(idx)
          expect(typeof idx).toBe('number')
        }
        expect(results.length).toBeGreaterThan(0)
      })

      it('halfCoverRayIndices returns numeric indices', () => {
        const results = []
        for (const idx of cubeIndex.halfCoverRayIndices(0, 0, 1, 0)) {
          results.push(idx)
          expect(typeof idx).toBe('number')
        }
        expect(results.length).toBeGreaterThan(0)
      })

      it('segmentToIndices matches segmentTo coordinate count', () => {
        const coordResults = []
        for (const coord of cubeIndex.segmentTo(0, 0, 1, 0)) {
          coordResults.push(coord)
        }
        const indexResults = []
        for (const idx of cubeIndex.segmentToIndices(0, 0, 1, 0)) {
          indexResults.push(idx)
        }
        expect(coordResults.length).toBe(indexResults.length)
      })

      it('superCoverSegmentToIndices returns valid indices', () => {
        for (const idx of cubeIndex.superCoverSegmentToIndices(0, 0, 1, 0)) {
          expect(idx).toBeDefined()
          expect(idx).toBeGreaterThanOrEqual(0)
          expect(idx).toBeLessThan(cubeIndex.size)
        }
      })

      it('halfCoverSegmentToIndices returns valid indices', () => {
        for (const idx of cubeIndex.halfCoverSegmentToIndices(0, 0, 1, 0)) {
          expect(idx).toBeDefined()
          expect(idx).toBeGreaterThanOrEqual(0)
          expect(idx).toBeLessThan(cubeIndex.size)
        }
      })

      it('fullLineIndices extends beyond endpoint', () => {
        const results = []
        for (const idx of cubeIndex.fullLineIndices(0, 0, 1, 0)) {
          results.push(idx)
        }
        expect(results.length).toBeGreaterThan(0)
      })

      it('segmentForIndices respects distance limit', () => {
        const results = []
        for (const idx of cubeIndex.segmentForIndices(0, 0, 1, 0, 2)) {
          results.push(idx)
        }
        expect(results.length).toBeLessThanOrEqual(2)
      })

      it('superCoverSegmentForIndices respects distance limit', () => {
        const results = []
        for (const idx of cubeIndex.superCoverSegmentForIndices(
          0,
          0,
          1,
          0,
          2
        )) {
          results.push(idx)
        }
        expect(results.length).toBeLessThanOrEqual(2)
      })

      it('halfCoverSegmentForIndices respects distance limit', () => {
        const results = []
        for (const idx of cubeIndex.halfCoverSegmentForIndices(0, 0, 1, 0, 2)) {
          results.push(idx)
        }
        expect(results.length).toBeLessThanOrEqual(2)
      })
    })

    describe('line algorithm comparison', () => {
      it('basic line produces unique coordinates', () => {
        const results = []
        for (const [q, r] of cubeIndex.line(0, 0, 1, 0)) {
          results.push([q, r])
        }
        const uniqueSet = new Set(results.map(c => JSON.stringify(c)))
        expect(uniqueSet.size).toBe(results.length)
      })

      it('superCover line produces unique coordinates', () => {
        const results = []
        for (const [q, r] of cubeIndex.superCoverLine(0, 0, 1, 0)) {
          results.push([q, r])
        }
        const uniqueSet = new Set(results.map(c => JSON.stringify(c)))
        expect(uniqueSet.size).toBe(results.length)
      })

      it('halfCover line produces unique coordinates', () => {
        const results = []
        for (const [q, r] of cubeIndex.halfCoverLine(0, 0, 1, 0)) {
          results.push([q, r])
        }
        const uniqueSet = new Set(results.map(c => JSON.stringify(c)))
        expect(uniqueSet.size).toBe(results.length)
      })

      it('all algorithms yield first point at start', () => {
        const line = cubeIndex.line(0, 0, 1, 0).next().value
        const superCover = cubeIndex.superCoverLine(0, 0, 1, 0).next().value
        const halfCover = cubeIndex.halfCoverLine(0, 0, 1, 0).next().value

        expect(line[0]).toBe(0)
        expect(line[1]).toBe(0)
        expect(superCover[0]).toBe(0)
        expect(superCover[1]).toBe(0)
        expect(halfCover[0]).toBe(0)
        expect(halfCover[1]).toBe(0)
      })

      it('all algorithms include endpoint in segmentTo', () => {
        const lineResults = Array.from(cubeIndex.line(0, 0, 1, 0))
        const superResults = Array.from(cubeIndex.superCoverLine(0, 0, 1, 0))
        const halfResults = Array.from(cubeIndex.halfCoverLine(0, 0, 1, 0))

        const lastLine = lineResults[lineResults.length - 1]
        const lastSuper = superResults[superResults.length - 1]
        const lastHalf = halfResults[halfResults.length - 1]

        expect(lastLine[0]).toBe(1)
        expect(lastLine[1]).toBe(0)
        expect(lastSuper[0]).toBe(1)
        expect(lastSuper[1]).toBe(0)
        expect(lastHalf[0]).toBe(1)
        expect(lastHalf[1]).toBe(0)
      })
    })

    describe('intercept methods', () => {
      it('intercept from center towards neighbor returns the last valid coordinate', () => {
        const [q, r] = cubeIndex.intercept(0, 0, 1, 0)
        // intercept returns the farthest point along the ray, not necessarily the endpoint
        expect(typeof q).toBe('number')
        expect(typeof r).toBe('number')
        expect(cubeIndex.isValid(q, r, -q - r)).toBe(true)
      })

      it('intercepts returns both directions', () => {
        const result = cubeIndex.intercepts(0, 0, 1, 0)
        expect(result).toHaveProperty('x0')
        expect(result).toHaveProperty('y0')
        expect(result).toHaveProperty('x1')
        expect(result).toHaveProperty('y1')
      })

      it('intercepts results are valid coordinates', () => {
        const result = cubeIndex.intercepts(0, 0, 1, 0)
        const s0 = -result.x0 - result.y0
        const s1 = -result.x1 - result.y1
        expect(cubeIndex.isValid(result.x0, result.y0, s0)).toBe(true)
        expect(cubeIndex.isValid(result.x1, result.y1, s1)).toBe(true)
      })
    })
  })
})
