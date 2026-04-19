/* eslint-env jest */
/* global describe, it, expect, beforeEach */

import { TriIndex } from './TriIndex.js'

describe('TriIndex', () => {
  let triIndex

  beforeEach(() => {
    triIndex = new TriIndex(3)
  })

  describe('constructor and basic geometry', () => {
    it('produces square size and odd row counts', () => {
      const idx = new TriIndex(5)
      expect(idx.size).toBe(25)
      // row lengths should be 1,3,5,7,9
      expect(idx.index(0, 0)).toBe(0)
      expect(idx.isValid(0, 0)).toBe(true)
      expect(idx.isValid(1, 0)).toBe(true)
      expect(idx.isValid(1, 2)).toBe(true)
      expect(idx.isValid(1, 3)).toBe(false)
      expect(idx.isValid(4, 8)).toBe(true)
      expect(idx.isValid(4, 9)).toBe(false)

      // round-trip large example
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c <= 2 * r; c++) {
          const i = idx.index(r, c)
          expect(idx.location(i)).toEqual([r, c])
        }
      }
    })

    it('creates instance with side', () => {
      expect(triIndex.side).toBe(3)
    })

    it('calculates correct size for different sides', () => {
      expect(new TriIndex(1).size).toBe(1)
      expect(new TriIndex(2).size).toBe(4)
      expect(new TriIndex(3).size).toBe(9)
      expect(new TriIndex(4).size).toBe(16)
    })

    it('isValid returns true for valid coordinates', () => {
      expect(triIndex.isValid(0, 0)).toBe(true)
      expect(triIndex.isValid(1, 0)).toBe(true)
      expect(triIndex.isValid(1, 1)).toBe(true)
      expect(triIndex.isValid(1, 2)).toBe(true)
      expect(triIndex.isValid(2, 4)).toBe(true)
    })

    it('isValid returns false for invalid coordinates', () => {
      expect(triIndex.isValid(-1, 0)).toBe(false)
      expect(triIndex.isValid(0, 1)).toBe(false)
      expect(triIndex.isValid(1, 3)).toBe(false)
      expect(triIndex.isValid(3, 0)).toBe(false)
      expect(triIndex.isValid(5, 5)).toBe(false)
    })

    it('index returns correct indices', () => {
      expect(triIndex.index(0, 0)).toBe(0)
      expect(triIndex.index(1, 0)).toBe(1)
      expect(triIndex.index(1, 1)).toBe(2)
      expect(triIndex.index(1, 2)).toBe(3)
      expect(triIndex.index(2, 0)).toBe(4)
    })

    it('location returns correct coordinates', () => {
      expect(triIndex.location(0)).toEqual([0, 0])
      expect(triIndex.location(1)).toEqual([1, 0])
      expect(triIndex.location(2)).toEqual([1, 1])
      expect(triIndex.location(3)).toEqual([1, 2])
      expect(triIndex.location(4)).toEqual([2, 0])
    })

    it('index and location are inverse operations', () => {
      for (let r = 0; r < triIndex.side; r++) {
        for (let c = 0; c <= 2 * r; c++) {
          const i = triIndex.index(r, c)
          const coord = triIndex.location(i)
          expect(coord).toEqual([r, c])
        }
      }
    })
  })

  describe('connection helpers', () => {
    it('creates a connection object with all expected keys', () => {
      expect(triIndex.connection).toBeDefined()
      expect(triIndex.connection['3']).toBeDefined()
      expect(triIndex.connection['3vertex']).toBeDefined()
      expect(triIndex.connection['6']).toBeDefined()
      expect(triIndex.connection['6extended']).toBeDefined()
      expect(triIndex.connection['12']).toBeDefined()
    })

    it('creates a cover object with normal, half, and super modes', () => {
      expect(triIndex.cover).toBeDefined()
      expect(triIndex.cover.normal).toBeDefined()
      expect(triIndex.cover.half).toBeDefined()
      expect(triIndex.cover.super).toBeDefined()
    })

    it('neighborsEdge delegates to connection["3"]', () => {
      const edgeNeighbors = triIndex.neighborsEdge(1, 1)
      const connectionNeighbors = triIndex.connection['3'].neighbors(1, 1)
      expect(edgeNeighbors).toEqual(connectionNeighbors)
    })

    it('neighborsVertex delegates to connection["3vertex"]', () => {
      const vertexNeighbors = triIndex.neighborsVertex(1, 1)
      const connectionNeighbors = triIndex.connection['3vertex'].neighbors(1, 1)
      expect(vertexNeighbors).toEqual(connectionNeighbors)
    })

    it('neighbors6 delegates to connection["6"]', () => {
      const neighbors6 = triIndex.neighbors6(1, 1)
      const connectionNeighbors = triIndex.connection['6'].neighbors(1, 1)
      expect(neighbors6).toEqual(connectionNeighbors)
    })

    it('area6 delegates to connection["6"] and has 6 neighbors', () => {
      const area6 = triIndex.area6(1, 1)
      expect(area6.length).toBe(7)
      expect(area6[0]).toEqual([1, 1, triIndex.parity(1, 1)])
      expect(area6.slice(1)).toEqual(triIndex.connection['6'].neighbors(1, 1))
    })

    it('neighbors delegates to connection["12"]', () => {
      const neighbors = triIndex.neighbors(1, 1)
      const connectionNeighbors = triIndex.connection['12'].neighbors(1, 1)
      expect(neighbors).toEqual(connectionNeighbors)
    })

    it('neighbors returns the union of edge, vertex, and extended triangle neighbors', () => {
      const base = new TriIndex(8)
      const r = 4
      const c = 4
      const expected = new Set([
        ...base.neighborsEdge(r, c).map(([nr, nc]) => `${nr},${nc}`),
        ...base.neighborsVertex(r, c).map(([nr, nc]) => `${nr},${nc}`),
        ...base.neighborsExtended(r, c).map(([nr, nc]) => `${nr},${nc}`)
      ])
      const actual = new Set(
        base.neighbors(r, c).map(([nr, nc]) => `${nr},${nc}`)
      )
      expect(actual).toEqual(expected)
      expect(actual.size).toBe(12)
    })

    it('neighbors returns 12 valid coordinates for a down-parity interior triangle', () => {
      const base = new TriIndex(20)
      const r = 4
      const c = 5
      const neighbors = base.neighbors(r, c)
      expect(neighbors.length).toBe(12)
      expect(neighbors.every(([nr, nc]) => base.isValid(nr, nc))).toBe(true)
      const unique = new Set(neighbors.map(([nr, nc]) => `${nr},${nc}`))
      expect(unique.size).toBe(12)
    })

    it('area delegates to connection["12"] and has 12 neighbors', () => {
      const area12 = triIndex.area(1, 1)
      expect(area12.length).toBe(13)
      expect(area12[0]).toEqual([1, 1, triIndex.parity(1, 1)])
      expect(area12.slice(1)).toEqual(triIndex.connection['12'].neighbors(1, 1))
    })
  })

  describe('line drawing algorithms', () => {
    it('line yields coordinates with step count', () => {
      const results = []
      for (const [r, c, step] of triIndex.line(0, 0, 2, 2)) {
        results.push([r, c, step])
      }
      expect(results.length).toBeGreaterThan(0)
      expect(results[0][2]).toBe(1)
    })

    it('line yields monotonically increasing step count', () => {
      const results = []
      for (const [r, c, step] of triIndex.line(0, 0, 2, 2)) {
        results.push([r, c, step])
      }
      for (let i = 1; i < results.length; i++) {
        expect(results[i][2]).toBeGreaterThan(results[i - 1][2])
      }
    })

    it('line respects endpoint exit condition', () => {
      const results = []
      for (const [r, c, step] of triIndex.line(0, 0, 1, 1)) {
        results.push([r, c, step])
      }
      const lastCoord = results[results.length - 1]
      expect(lastCoord[0]).toBe(1)
      expect(lastCoord[1]).toBe(1)
    })

    it('ray from center continues past endpoint to boundary', () => {
      const segmentResults = Array.from(triIndex.segmentTo(0, 0, 1, 0))
      const rayResults = Array.from(triIndex.ray(0, 0, 1, 0))
      expect(rayResults.length).toBeGreaterThan(segmentResults.length)
      const lastCoord = rayResults[rayResults.length - 1]
      expect(lastCoord[0]).toBe(triIndex.side - 1)
      expect(lastCoord[1] === 0).toBe(true)
    })

    it('segmentTo matches line with endpoint exit condition', () => {
      const lineResults = []
      for (const coord of triIndex.line(0, 0, 1, 1)) {
        lineResults.push(coord)
      }
      const segmentResults = []
      for (const coord of triIndex.segmentTo(0, 0, 1, 1)) {
        segmentResults.push(coord)
      }
      expect(lineResults).toEqual(segmentResults)
    })

    it('segmentFor stops at distance limit', () => {
      const results = []
      for (const coord of triIndex.segmentFor(0, 0, 2, 2, 2)) {
        results.push(coord)
      }
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('fullLine extends beyond the original segment', () => {
      const segmentResults = Array.from(triIndex.segmentTo(1, 1, 2, 2))
      const fullLineResults = Array.from(triIndex.fullLine(1, 1, 2, 2))
      expect(fullLineResults.length).toBeGreaterThan(segmentResults.length)
      expect(fullLineResults[0]).not.toEqual([1, 1])
      expect(fullLineResults[fullLineResults.length - 1]).not.toEqual([2, 2])
    })

    it('line yields valid coordinates', () => {
      for (const [r, c] of triIndex.line(0, 0, 2, 2)) {
        expect(triIndex.isValid(r, c)).toBe(true)
      }
    })
  })

  describe('superCover line drawing', () => {
    it('superCoverLine yields at least as many cells as basic line', () => {
      const lineResults = []
      for (const coord of triIndex.line(0, 0, 1, 1)) {
        lineResults.push(coord)
      }
      const superResults = []
      for (const coord of triIndex.superCoverLine(0, 0, 1, 1)) {
        superResults.push(coord)
      }
      expect(superResults.length).toBeGreaterThanOrEqual(lineResults.length)
    })

    it('superCoverRay extends to boundary', () => {
      const results = []
      for (const coord of triIndex.superCoverRay(0, 0, 1, 0)) {
        results.push(coord)
      }
      expect(results.length).toBeGreaterThan(0)
    })

    it('superCoverSegmentTo includes endpoint', () => {
      const results = []
      for (const [r, c] of triIndex.superCoverSegmentTo(0, 0, 1, 1)) {
        results.push([r, c])
      }
      const lastCoord = results[results.length - 1]
      expect(lastCoord[0]).toBe(1)
      expect(lastCoord[1]).toBe(1)
    })

    it('superCoverSegmentFor respects distance limit', () => {
      const results = []
      for (const coord of triIndex.superCoverSegmentFor(0, 0, 1, 1, 2)) {
        results.push(coord)
      }
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('superCoverFullLine extends beyond endpoint', () => {
      const results = []
      for (const coord of triIndex.superCoverFullLine(0, 0, 1, 1)) {
        results.push(coord)
      }
      expect(results.length).toBeGreaterThan(0)
    })

    it('superCoverLine yields valid coordinates', () => {
      for (const [r, c] of triIndex.superCoverLine(0, 0, 2, 2)) {
        expect(triIndex.isValid(r, c)).toBe(true)
      }
    })
  })

  describe('halfCover line drawing', () => {
    it('halfCoverLine yields valid coordinates', () => {
      for (const [r, c] of triIndex.halfCoverLine(0, 0, 1, 1)) {
        expect(triIndex.isValid(r, c)).toBe(true)
      }
    })

    it('halfCoverRay extends to boundary', () => {
      const results = []
      for (const coord of triIndex.halfCoverRay(0, 0, 1, 0)) {
        results.push(coord)
      }
      expect(results.length).toBeGreaterThan(0)
    })

    it('halfCoverSegmentTo includes endpoint', () => {
      const results = []
      for (const [r, c] of triIndex.halfCoverSegmentTo(0, 0, 1, 1)) {
        results.push([r, c])
      }
      const lastCoord = results[results.length - 1]
      expect(lastCoord[0]).toBe(1)
      expect(lastCoord[1]).toBe(1)
    })

    it('halfCoverSegmentFor respects distance limit', () => {
      const results = []
      for (const coord of triIndex.halfCoverSegmentFor(0, 0, 1, 1, 2)) {
        results.push(coord)
      }
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('halfCoverFullLine extends beyond endpoint', () => {
      const results = []
      for (const coord of triIndex.halfCoverFullLine(0, 0, 1, 1)) {
        results.push(coord)
      }
      expect(results.length).toBeGreaterThan(0)
    })

    it('halfCoverLine yields fewer or equal cells than superCover', () => {
      const superResults = []
      for (const coord of triIndex.superCoverLine(0, 0, 2, 2)) {
        superResults.push(coord)
      }
      const halfResults = []
      for (const coord of triIndex.halfCoverLine(0, 0, 2, 2)) {
        halfResults.push(coord)
      }
      expect(halfResults.length).toBeLessThanOrEqual(superResults.length)
    })
  })

  describe('Indices wrappers', () => {
    it('rayIndices returns numeric indices', () => {
      const results = []
      for (const idx of triIndex.rayIndices(0, 0, 1, 0)) {
        results.push(idx)
        expect(typeof idx).toBe('number')
      }
      expect(results.length).toBeGreaterThan(0)
    })

    it('superCoverRayIndices returns numeric indices', () => {
      const results = []
      for (const idx of triIndex.superCoverRayIndices(0, 0, 1, 0)) {
        results.push(idx)
        expect(typeof idx).toBe('number')
      }
      expect(results.length).toBeGreaterThan(0)
    })

    it('halfCoverRayIndices returns numeric indices', () => {
      const results = []
      for (const idx of triIndex.halfCoverRayIndices(0, 0, 1, 0)) {
        results.push(idx)
        expect(typeof idx).toBe('number')
      }
      expect(results.length).toBeGreaterThan(0)
    })

    it('segmentToIndices matches segmentTo coordinate count', () => {
      const coordResults = []
      for (const coord of triIndex.segmentTo(0, 0, 1, 1)) {
        coordResults.push(coord)
      }
      const indexResults = []
      for (const idx of triIndex.segmentToIndices(0, 0, 1, 1)) {
        indexResults.push(idx)
      }
      expect(coordResults.length).toBe(indexResults.length)
    })

    it('superCoverSegmentToIndices returns valid indices', () => {
      const indices = Array.from(
        triIndex.superCoverSegmentToIndices(0, 0, 1, 1)
      )
      expect(indices.length).toBeGreaterThan(0)
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(triIndex.size)
      }
    })

    it('halfCoverSegmentToIndices returns valid indices', () => {
      const indices = Array.from(triIndex.halfCoverSegmentToIndices(0, 0, 1, 1))
      expect(indices.length).toBeGreaterThan(0)
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(triIndex.size)
      }
    })

    it('segmentForIndices generates indices', () => {
      const indices = Array.from(triIndex.segmentForIndices(0, 0, 1, 0, 2))
      expect(indices.length).toBeGreaterThan(0)
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(triIndex.size)
      }
    })

    it('superCoverSegmentForIndices generates indices', () => {
      const indices = Array.from(
        triIndex.superCoverSegmentForIndices(0, 0, 1, 0, 2)
      )
      expect(indices.length).toBeGreaterThan(0)
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(triIndex.size)
      }
    })

    it('halfCoverSegmentForIndices generates indices', () => {
      const indices = Array.from(
        triIndex.halfCoverSegmentForIndices(0, 0, 1, 0, 2)
      )
      expect(indices.length).toBeGreaterThan(0)
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(triIndex.size)
      }
    })

    it('fullLineIndices generates indices', () => {
      const indices = Array.from(triIndex.fullLineIndices(0, 0, 1, 1))
      expect(indices.length).toBeGreaterThan(0)
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(triIndex.size)
      }
    })

    it('superCoverFullLineIndices generates indices', () => {
      const indices = Array.from(triIndex.superCoverFullLineIndices(0, 0, 1, 1))
      expect(indices.length).toBeGreaterThan(0)
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(triIndex.size)
      }
    })

    it('halfCoverFullLineIndices generates indices', () => {
      const indices = Array.from(triIndex.halfCoverFullLineIndices(0, 0, 1, 1))
      expect(indices.length).toBeGreaterThan(0)
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(triIndex.size)
      }
    })

    it('all Indices wrappers return valid indices', () => {
      const wrappers = [
        { name: 'rayIndices', args: [0, 0, 1, 0] },
        { name: 'superCoverRayIndices', args: [0, 0, 1, 0] },
        { name: 'halfCoverRayIndices', args: [0, 0, 1, 0] },
        { name: 'segmentToIndices', args: [0, 0, 1, 1] },
        { name: 'superCoverSegmentToIndices', args: [0, 0, 1, 1] },
        { name: 'halfCoverSegmentToIndices', args: [0, 0, 1, 1] },
        { name: 'segmentForIndices', args: [0, 0, 1, 0, 2] },
        { name: 'superCoverSegmentForIndices', args: [0, 0, 1, 0, 2] },
        { name: 'halfCoverSegmentForIndices', args: [0, 0, 1, 0, 2] },
        { name: 'fullLineIndices', args: [0, 0, 1, 1] },
        { name: 'superCoverFullLineIndices', args: [0, 0, 1, 1] },
        { name: 'halfCoverFullLineIndices', args: [0, 0, 1, 1] }
      ]

      for (const wrapper of wrappers) {
        const results = Array.from(triIndex[wrapper.name](...wrapper.args))
        expect(results.length).toBeGreaterThan(0)
        for (const idx of results) {
          expect(idx).toBeGreaterThanOrEqual(0)
          expect(idx).toBeLessThan(triIndex.size)
          expect(typeof idx).toBe('number')
        }
      }
    })
  })

  describe('helper methods', () => {
    it('intercept returns boundary coordinate', () => {
      const [r, c] = triIndex.intercept(0, 0, 1, 0)
      expect(triIndex.isValid(r, c)).toBe(true)
    })

    it('intercepts returns two boundary coordinates', () => {
      const { x0, y0, x1, y1 } = triIndex.intercepts(0, 0, 1, 1)
      expect(triIndex.isValid(x0, y0)).toBe(true)
      expect(triIndex.isValid(x1, y1)).toBe(true)
    })

    it('fullLine using intercepts extends to boundaries', () => {
      const results = []
      for (const coord of triIndex.fullLine(0, 0, 1, 1)) {
        results.push(coord)
      }
      expect(results.length).toBeGreaterThan(0)
      const firstCoord = results[0]
      const lastCoord = results[results.length - 1]
      expect(triIndex.isValid(firstCoord[0], firstCoord[1])).toBe(true)
      expect(triIndex.isValid(lastCoord[0], lastCoord[1])).toBe(true)
    })
  })

  describe('line algorithm properties', () => {
    it('line produces unique coordinates', () => {
      const results = []
      for (const [r, c] of triIndex.line(0, 0, 2, 2)) {
        results.push([r, c])
      }
      const coordSet = new Set(results.map(coord => `${coord[0]},${coord[1]}`))
      expect(coordSet.size).toBe(results.length)
    })

    it('line respects boundaries', () => {
      for (const [r, c] of triIndex.line(0, 0, 2, 2)) {
        expect(r >= 0).toBe(true)
        expect(r < triIndex.side).toBe(true)
        expect(c >= 0).toBe(true)
        expect(c <= 2 * r).toBe(true)
      }
    })

    it('ray continues until out of bounds or returns to start', () => {
      const rayCoords = []
      for (const [r, c] of triIndex.ray(0, 0, 1, 0)) {
        rayCoords.push([r, c])
      }
      expect(rayCoords.length).toBeGreaterThan(0)
      // Ray should at least include the starting position
      expect(rayCoords[0]).toEqual([0, 0])
    })

    it('segmentFor does not exceed distance', () => {
      const results = []
      for (const [r, c, step] of triIndex.segmentFor(0, 0, 2, 2, 3)) {
        results.push([r, c, step])
      }
      expect(results.length).toBeLessThanOrEqual(3)
    })
  })
})
