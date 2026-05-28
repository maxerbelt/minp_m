/**
 * @fileoverview Cell3sToBePlaced Test Suite
 *
 * Comprehensive test coverage for Cell3sToBePlaced class behavior including:
 * - Zone validation and matching logic
 * - Candidate cell identification
 * - Wrong zone annotation and detection
 * - Subgroup placement and validation
 *
 * @module variants/Cell3sToBePlaced.test
 */

import { Mask } from '../grid/rectangle/mask.js'
import { Cell3sToBePlaced } from './Cell3sToBePlaced.js'
import { describe, it, expect } from '@jest/globals'

/**
 * Mock placement target for testing zone validation.
 * Provides bounds checking and zone information retrieval.
 * Used by Cell3sToBePlaced to determine placement validity and zone compatibility.
 *
 * @typedef {Object} MockPlacementTarget
 * @property {(y: number, x: number) => boolean} boundsChecker
 *   Validates single coordinate against target bounds.
 *   Returns true if position (y, x) is within bounds.
 * @property {(y: number, x: number, h?: number, w?: number) => boolean} allBoundsChecker
 *   Validates rectangular area against target bounds.
 *   Returns true if area with height h and width w starting at (y, x) is within bounds.
 *   @param {number} y - Row coordinate (top-left)
 *   @param {number} x - Column coordinate (top-left)
 *   @param {number} [h] - Height of area to check (optional)
 *   @param {number} [w] - Width of area to check (optional)
 *   @returns {boolean} True if entire area is in bounds
 * @property {(x: number, y: number, zoneDetail?: number) => string} getZone
 *   Retrieves zone identifier for a specific coordinate.
 *   Used to determine terrain type and validate zone compatibility.
 *   @param {number} x - Column coordinate
 *   @param {number} y - Row coordinate
 *   @param {number} [zoneDetail] - Zone detail level for rendering complexity (optional)
 *   @returns {string} Zone identifier (e.g., 'OK', 'NO', 'YES')
 * @description Mock target for testing zone validation and bounds checking
 */

/**
 * Mock subgroup placement for testing subgroup validation.
 * Represents a single subgroup instance placed at specific coordinates.
 * Contains logic for candidate checking and zone validation.
 *
 * @typedef {Object} MockSubGroupPlaced
 * @property {(x: number, y: number) => boolean} isCandidate
 *   Checks if position is a candidate cell for this subgroup.
 *   Candidate cells are specific positions where subgroup rules apply.
 * @property {(zone: string) => boolean} validator
 *   Validates zone information for subgroup compatibility.
 *   Returns true if the zone is acceptable for this subgroup.
 * @description Placed subgroup instance with candidate and zone validation
 */

/**
 * Mock subgroup factory for testing placement logic.
 * Creates subgroup instances at specified coordinates with validation rules.
 * Factory pattern allows dynamic placement with coordinate-specific behavior.
 *
 * @typedef {Object} MockSubGroup
 * @property {(x: number, y: number) => MockSubGroupPlaced} placeAt
 *   Factory method to create subgroup instance at specified position.
 *   @param {number} x - Base x-coordinate for placement
 *   @param {number} y - Base y-coordinate for placement
 *   @returns {MockSubGroupPlaced} New subgroup instance with placement logic
 * @description Subgroup factory for creating placed instances with validation
 */

/**
 * Placeable 3-cell object structure for testing.
 * Combines board mask, zone validation, and subgroup definitions.
 * Used to configure Cell3sToBePlaced instances with test-specific behavior.
 *
 * @typedef {Object} Placeable3ForTesting
 * @property {Mask} board - Bit-mask representing cell positions
 * @property {Array<Array<number>>} cells - Cell coordinate array
 * @property {() => boolean} validator - Global zone validator function
 * @property {number} zoneDetail - Zone detail level for rendering complexity
 * @property {MockPlacementTarget} target - Placement target with bounds and zones
 * @property {MockSubGroup[]} subGroups - Array of subgroup factories for validation
 * @description Test data structure combining placement and validation configuration
 */

describe('Cell3sToBePlaced behaviors', () => {
  it('isInMatchingZone returns true when subgroup candidate and validator match', () => {
    // Define cell coordinates for the placement shape
    const cells = [
      [0, 0],
      [0, 1],
      [0, 2]
    ]
    const board = Mask.fromCoords(cells)

    // Mock placement target: returns 'OK' only for the middle cell at column 11
    /** @type {MockPlacementTarget} */
    const target = {
      boundsChecker: (_y, _x) => true,
      allBoundsChecker: (_y, _x, _h, _w) => true,
      getZone: (_x, c, z) => (c === 11 && z === 2 ? 'OK' : 'NO')
    }

    // Create placeable 3-cell object with subgroups that validate zones
    /** @type {Placeable3ForTesting} */
    const placable3 = {
      board,
      cells,
      validator: () => false,
      zoneDetail: 2,
      target,
      subGroups: [
        // First subgroup: matches only at column offset 0, validates 'NO' zones
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
        // Second subgroup: matches at column offset 1 (middle cell), validates 'OK' zones
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

    // Test middle cell (10, 11): second subgroup is candidate and validator matches 'OK'
    expect(placed.isInMatchingZone(10, 11)).toBe(true)

    // Test first cell (10, 10): first subgroup is candidate and validator matches 'NO'
    expect(placed.isInMatchingZone(10, 10)).toBe(true)

    // Test non-candidate cell (10, 12): no subgroup is candidate, should be false
    expect(placed.isInMatchingZone(10, 12)).toBe(false)
  })

  it('isWrongZone annotates cells with match flags and returns true when some wrong', () => {
    // Define cell coordinates with bit values for placement shape
    const cells = [
      [0, 0, 1], // row 0, col 0, bit value 1
      [0, 1, 2], // row 0, col 1, bit value 2 (middle cell)
      [0, 2, 1] // row 0, col 2, bit value 1
    ]
    const board = Mask.fromCoords(cells)

    // Mock placement target: returns 'YES' only for row 20 with zone detail 2
    /** @type {MockPlacementTarget} */
    const target = {
      boundsChecker: (_y, _x) => true,
      allBoundsChecker: (_y, _x, _h, _w) => true,
      getZone: (r, _c, z) => (r === 20 && z === 2 ? 'YES' : 'NO')
    }

    // Create placeable 3-cell object for zone validation testing
    /** @type {Placeable3ForTesting} */
    const placable3 = {
      board,
      cells,
      validator: () => false,
      zoneDetail: 2,
      target,
      subGroups: [
        // First subgroup: matches at base position, validates 'X' zones
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
        // Second subgroup: matches at offset position (y0+1), validates 'YES' zones
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

    // Verify board has 3 cells with correct coordinates and bit values
    expect(placed.board.occupancy).toBe(3)
    expect([...placed.board.occupiedLocations()].length).toBe(3)
    expect([...placed.board.occupiedLocationsAndValues()]).toEqual([
      [20, 20, 1n], // First cell: bit value 1
      [20, 21, 2n], // Middle cell: bit value 2 (will match zone 'YES')
      [20, 22, 1n] // Last cell: bit value 1
    ])

    // Before calling isWrongZone, notGood should be empty (all cells united)
    expect(placed.notGood.occupancy).toBe(0)

    // Call isWrongZone: should return true because not all cells match zones
    const result = placed.isWrongZone()
    expect(result).toBe(true) // One cell matches, others don't

    // After calling isWrongZone, notGood mask should contain mismatched cells
    expect(placed.notGood.occupancy).toBe(1)

    // Middle cell (20, 21) should be marked as not good (matched but counted in wrong zone logic)
    // @ts-ignore - notGood is Mask instance with test() method at runtime
    expect(placed.notGood.test(20, 21, 1)).toBe(true)

    // First and last cells should not be marked as not good
    // @ts-ignore - notGood is Mask instance with test() method at runtime
    expect(placed.notGood.test(20, 20, 1)).toBe(false)
    // @ts-ignore - notGood is Mask instance with test() method at runtime
    expect(placed.notGood.test(20, 22, 1)).toBe(false)
  })
})
