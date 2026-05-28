import { Mask } from '../grid/rectangle/mask.js'
import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { describe, it, expect } from '@jest/globals'

/**
 * Mock placement target for testing zone validation.
 * Provides bounds checking and zone information retrieval.
 *
 * @typedef {Object} MockPlacementTarget
 * @property {(y: number, x: number) => boolean} boundsChecker - Bounds validation
 * @property {(y: number, x: number, h?: number, w?: number) => boolean} allBoundsChecker - Area bounds validation
 * @property {(x: number, y: number, zoneDetail?: number) => string} getZone - Zone info retrieval
 */

/**
 * Mock subgroup placement for testing subgroup validation.
 * Represents a single subgroup with candidate checking and zone validation.
 *
 * @typedef {Object} MockSubGroupPlaced
 * @property {(x: number, y: number) => boolean} isCandidate - Candidate position check
 * @property {(zone: string) => boolean} validator - Zone validation
 */

/**
 * Mock subgroup factory for testing placement logic.
 * Creates subgroup instances at specified coordinates.
 *
 * @typedef {Object} MockSubGroup
 * @property {(x: number, y: number) => MockSubGroupPlaced} placeAt - Factory method
 */

describe('Cell3sToBePlaced behaviors', () => {
  it('isInMatchingZone returns true when subgroup candidate and validator match', () => {
    const cells = [
      [0, 0],
      [0, 1],
      [0, 2]
    ]
    const board = Mask.fromCoords(cells)
    // target.getZone will return 'OK' only for the middle cell
    /** @type {MockPlacementTarget} */
    const target = {
      boundsChecker: (_y, _x) => true,
      allBoundsChecker: (_y, _x, _h, _w) => true,
      getZone: (_x, c, z) => (c === 11 && z === 2 ? 'OK' : 'NO')
    }

    /** @type {any} */
    const placable3 = {
      board,
      cells,
      validator: () => false,
      zoneDetail: 2,
      target,
      subGroups: [
        // first subgroup: matches only at column offset 0
        {
          /**
           * Factory method to create subgroup at specified position.
           * @param {number} x0 - Base x-coordinate
           * @param {number} y0 - Base y-coordinate
           * @returns {MockSubGroupPlaced} Subgroup with candidate and validator
           */
          placeAt: (x0, y0) => ({
            /**
             * Checks if position is a candidate cell.
             * @param {number} x - X-coordinate to check
             * @param {number} y - Y-coordinate to check
             * @returns {boolean} True if at base position
             */
            isCandidate: (x, y) => x === x0 && y === y0,
            /**
             * Validates zone information.
             * @param {string} z - Zone string to validate
             * @returns {boolean} True if zone is 'NO'
             */
            validator: z => z === 'NO'
          })
        },
        // second subgroup: matches only at column offset 1 (the middle cell)
        {
          /**
           * Factory method to create subgroup at specified position.
           * @param {number} x0 - Base x-coordinate
           * @param {number} y0 - Base y-coordinate
           * @returns {MockSubGroupPlaced} Subgroup with candidate and validator
           */
          placeAt: (x0, y0) => ({
            /**
             * Checks if position is a candidate cell.
             * @param {number} x - X-coordinate to check
             * @param {number} y - Y-coordinate to check
             * @returns {boolean} True if at offset y0+1
             */
            isCandidate: (x, y) => x === x0 && y === y0 + 1,
            /**
             * Validates zone information.
             * @param {string} z - Zone string to validate
             * @returns {boolean} True if zone is 'OK'
             */
            validator: z => z === 'OK'
          })
        }
      ]
    }

    const placed = new Cell3sToBePlaced(placable3, 10, 10)

    // absolute middle cell is at (10, 11) — validator returns true there
    expect(placed.isInMatchingZone(10, 11)).toBe(true)
    // both first and middle are candidates that validate true/false depending on subgroup
    expect(placed.isInMatchingZone(10, 10)).toBe(true)
    // a non-candidate cell should be false
    expect(placed.isInMatchingZone(10, 12)).toBe(false)
  })

  it('isWrongZone annotates cells with match flags and returns true when some wrong', () => {
    const cells = [
      [0, 0, 1],
      [0, 1, 2],
      [0, 2, 1]
    ]
    const board = Mask.fromCoords(cells)
    /** @type {MockPlacementTarget} */
    const target = {
      boundsChecker: (_y, _x) => true,
      allBoundsChecker: (_y, _x, _h, _w) => true,
      getZone: (r, _c, z) => (r === 20 && z === 2 ? 'YES' : 'NO')
    }

    /** @type {any} */
    const placable3 = {
      board,
      cells,
      validator: () => false,
      zoneDetail: 2,
      target,
      subGroups: [
        {
          /**
           * Factory method to create subgroup at specified position.
           * @param {number} x0 - Base x-coordinate
           * @param {number} y0 - Base y-coordinate
           * @returns {MockSubGroupPlaced} Subgroup with candidate and validator
           */
          placeAt: (x0, y0) => ({
            /**
             * Checks if position is a candidate cell.
             * @param {number} x - X-coordinate to check
             * @param {number} y - Y-coordinate to check
             * @returns {boolean} True if at base position
             */
            isCandidate: (x, y) => x === x0 && y === y0,
            /**
             * Validates zone information.
             * @param {string} z - Zone string to validate
             * @returns {boolean} True if zone is 'X'
             */
            validator: z => z === 'X'
          })
        },
        {
          /**
           * Factory method to create subgroup at specified position.
           * @param {number} x0 - Base x-coordinate
           * @param {number} y0 - Base y-coordinate
           * @returns {MockSubGroupPlaced} Subgroup with candidate and validator
           */
          placeAt: (x0, y0) => ({
            /**
             * Checks if position is a candidate cell.
             * @param {number} x - X-coordinate to check
             * @param {number} y - Y-coordinate to check
             * @returns {boolean} True if at offset y0+1
             */
            isCandidate: (x, y) => x === x0 && y === y0 + 1,
            /**
             * Validates zone information.
             * @param {string} z - Zone string to validate
             * @returns {boolean} True if zone is 'YES'
             */
            validator: z => z === 'YES'
          })
        }
      ]
    }

    const placed = new Cell3sToBePlaced(placable3, 20, 20)
    expect(placed.board.occupancy).toBe(3)
    expect([...placed.board.occupiedLocations()].length).toBe(3)
    expect([...placed.board.occupiedLocationsAndValues()]).toEqual([
      [20, 20, 1n],
      [20, 21, 2n],
      [20, 22, 1n]
    ])
    // Before calling isWrongZone, notGood should be empty (all cells are united)
    expect(placed.notGood.occupancy).toBe(0)

    const result = placed.isWrongZone()
    // one cell (the middle) matches, others don't => should return true
    expect(result).toBe(true)
    expect(placed.notGood.occupancy).toBe(1)
    // @ts-ignore - notGood is a Mask instance with test method at runtime
    expect(placed.notGood.test(20, 21, 1)).toBe(true)
    // First and last should be 0
    // @ts-ignore - notGood is a Mask instance with test method at runtime
    expect(placed.notGood.test(20, 20, 1)).toBe(false)
    // @ts-ignore - notGood is a Mask instance with test method at runtime
    expect(placed.notGood.test(20, 22, 1)).toBe(false)
  })
})
