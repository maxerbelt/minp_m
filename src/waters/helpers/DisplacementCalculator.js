/**
 * Callback for getting displacement for a specific subterrain
 * @callback DisplacementForCallback
 * @param {*} subterrain - The subterrain type
 * @returns {number} Displacement amount for this subterrain
 */

/**
 * Represents a ship's shape and displacement characteristics.
 * Encapsulates displacement area and terrain interaction logic.
 * @typedef {Object} ShipShape
 * @property {number} displacement - Total displacement area of this ship shape
 * @property {*} subterrain - The primary subterrain this shape occupies
 * @property {DisplacementForCallback} displacementFor - Calculates displacement for specific subterrain
 */

/**
 * Callback for getting a ship's shape
 * @callback ShapeCallback
 * @returns {ShipShape} The ship's shape and displacement info
 */

/**
 * Represents a game ship with shape and displacement properties.
 * @typedef {Object} Ship
 * @property {ShapeCallback} shape - Gets the ship's shape and displacement characteristics
 */

/**
 * Represents a displacement threshold mapping for density descriptions.
 * Used to categorize displacement ratios into human-readable tightness descriptions.
 * @typedef {Object} DisplacementThreshold
 * @property {number} limit - Upper bound ratio for this density level (0.0-1.0)
 * @property {string} desc - Human-readable description (e.g., 'sparse', 'crowded')
 */

/**
 * Calculates and describes displacement ratios for game board utilization.
 * Provides methods to determine ship displacement area and convert ratios to descriptive text.
 * Displacement represents the percentage of board space occupied by ships.
 *
 * Usage:
 * - Calculate total ship displacement for board analysis
 * - Filter displacement by terrain type for zone-specific calculations
 * - Convert displacement ratios to human-readable descriptions for UI display
 * - Determine board tightness for game difficulty assessment
 *
 * @class DisplacementCalculator
 */
export class DisplacementCalculator {
  /**
   * Displacement ratio thresholds and their descriptions.
   * Maps ratio ranges to human-readable descriptions, from least to most crowded.
   * Thresholds are evaluated in order - the first matching limit returns the description.
   *
   * Range progression:
   * - 0.00-0.02: Empty (0-2% occupied)
   * - 0.02-0.15: Lonely to very scattered
   * - 0.15-0.27: Scattered to very sparse
   * - 0.27-0.45: Sparse to very loose
   * - 0.45-0.53: Loose to medium
   * - 0.53-0.68: Close to very close to tight
   * - 0.68-0.81: Very tight to compact
   * - 0.81-1.00: Very compact to very squeezy (100%)
   *
   * @type {Array<DisplacementThreshold>}
   */
  static #DISPLACEMENT_THRESHOLDS = [
    { limit: 0.02, desc: 'empty' },
    { limit: 0.15, desc: 'lonely' },
    { limit: 0.22, desc: 'very scattered' },
    { limit: 0.27, desc: 'scattered' },
    { limit: 0.31, desc: 'very sparse ' },
    { limit: 0.38, desc: 'sparse' },
    { limit: 0.45, desc: 'very loose' },
    { limit: 0.49, desc: 'loose' },
    { limit: 0.53, desc: 'medium' },
    { limit: 0.58, desc: 'close' },
    { limit: 0.63, desc: 'very close' },
    { limit: 0.68, desc: 'tight' },
    { limit: 0.72, desc: 'very tight' },
    { limit: 0.76, desc: 'crowded' },
    { limit: 0.8, desc: 'very crowded' },
    { limit: 0.81, desc: 'compact' },
    { limit: 0.83, desc: 'very compact' }
  ]

  /**
   * Calculates total displacement for a set of ships.
   * Sums the displacement area of all ship shapes in the collection.
   * Used for overall board utilization analysis.
   *
   * Algorithm:
   * - Iterates through all ships
   * - Calls shape() on each ship to get ShipShape object
   * - Sums the displacement property across all ships
   * - Returns total displacement area
   *
   * @param {Ship[]} ships - Array of ship objects with shape methods
   * @returns {number} Total displacement area of all ships combined (≥ 0)
   * @throws {TypeError} If ships is not an array or contains objects without shape method
   * @example
   * const totalDisplacement = DisplacementCalculator.calculateShipDisplacement(allShips)
   */
  static calculateShipDisplacement (ships) {
    return ships.reduce(
      (accumulator, ship) => accumulator + ship.shape().displacement,
      0
    )
  }

  /**
   * Calculates displacement for ships matching a specific subterrain.
   * Filters ships by subterrain type, then sums their displacement.
   * Used for terrain-specific board analysis (e.g., water vs land displacement).
   *
   * Algorithm:
   * - Filters ships where ship.shape().subterrain === subterrain
   * - Sums displacement property for all matching ships
   * - Returns terrain-specific total
   *
   * @param {Ship[]} ships - Array of ship objects with shape methods
   * @param {*} subterrain - The subterrain type to filter by (compared via ===)
   * @returns {number} Total displacement for ships on matching subterrain (≥ 0)
   * @throws {TypeError} If ships is not an array or contains objects without shape method
   * @example
   * const waterDisplacement = DisplacementCalculator.calculateSubterrainDisplacement(ships, 'water')
   */
  static calculateSubterrainDisplacement (ships, subterrain) {
    return ships
      .filter(s => s.shape().subterrain === subterrain)
      .reduce((accumulator, ship) => accumulator + ship.shape().displacement, 0)
  }

  /**
   * Calculates mixed terrain ship displacement (ships occupying multiple terrains).
   * Mixed terrain ships contribute 1/4 of their displacement to the calculation.
   * Used when counting ships that span multiple terrain types.
   *
   * Algorithm:
   * - Sums displacement property for all mixed terrain shapes
   * - Divides total by 4 to get mixed terrain contribution
   * - Returns 1/4 of total mixed shape displacement
   *
   * @param {ShipShape[]} mixedShapes - Array of ship shapes occupying mixed terrains
   * @returns {number} Mixed terrain displacement contribution (1/4 of total) (≥ 0)
   * @throws {TypeError} If mixedShapes is not an array or contains objects without displacement property
   * @example
   * const mixedDisp = DisplacementCalculator.calculateMixedTerrainAmount(mixedShapes)
   */
  static calculateMixedTerrainAmount (mixedShapes) {
    return (
      mixedShapes.reduce(
        (accumulator, shape) => accumulator + shape.displacement,
        0
      ) / 4
    )
  }

  /**
   * Calculates mixed terrain displacement for a specific subterrain.
   * Sums displacement contributions from mixed terrain ships for one terrain type.
   * Used for multi-terrain zone displacement analysis.
   *
   * Algorithm:
   * - Iterates through all mixed terrain shapes
   * - Calls displacementFor(subterrain) on each shape
   * - Sums results to get total for specified terrain
   *
   * @param {ShipShape[]} mixedShapes - Array of ship shapes occupying mixed terrains
   * @param {*} subterrain - The specific subterrain to calculate displacement for
   * @returns {number} Mixed terrain displacement for this subterrain (≥ 0)
   * @throws {TypeError} If mixedShapes is not an array or shapes lack displacementFor method
   * @example
   * const mixedWaterDisp = DisplacementCalculator.calculateMixedSubterrainAmount(mixed, 'water')
   */
  static calculateMixedSubterrainAmount (mixedShapes, subterrain) {
    return mixedShapes.reduce(
      (accumulator, shape) => accumulator + shape.displacementFor(subterrain),
      0
    )
  }

  /**
   * Converts a displacement ratio (0-1) to a human-readable description.
   * Iterates through displacement thresholds in order to find matching description.
   * First threshold with ratio below its limit is returned; if none match, returns 'very squeezy'.
   *
   * Algorithm:
   * - Iterates through #DISPLACEMENT_THRESHOLDS in order
   * - Returns desc when ratio < limit
   * - Falls through to 'very squeezy' if no threshold matches
   *
   * Range context:
   * - 0.0-0.02: 'empty'
   * - 0.02-0.15: 'lonely'
   * - 0.50-0.60: 'medium' to 'close'
   * - 0.80+: 'compact' to 'very squeezy'
   *
   * @param {number} ratio - Displacement ratio in range [0, 1]
   * @returns {string} Descriptive text for the density level
   * @throws {TypeError} If ratio is not a number
   * @example
   * const desc = DisplacementCalculator.describeDisplacementRatio(0.35) // 'sparse'
   */
  static describeDisplacementRatio (ratio) {
    for (const { limit, desc } of this.#DISPLACEMENT_THRESHOLDS) {
      if (ratio < limit) return desc
    }
    return 'very squeezy'
  }

  /**
   * Calculates tightness description for a zone with optional bonus displacement.
   * Combines ship displacement with additional/bonus displacement (e.g., obstacles)
   * and converts the ratio to a human-readable tightness description.
   * Used for zone display entries showing combined space utilization.
   *
   * Algorithm:
   * - Sums total ship displacement via calculateShipDisplacement()
   * - Adds optional extra displacement parameter
   * - Divides combined total by available area to get ratio
   * - Converts ratio to descriptive text via describeDisplacementRatio()
   *
   * @param {Ship[]} ships - Array of ships in the zone
   * @param {number} displacedArea - Total available displacement area in zone (> 0)
   * @param {number} [extra=0] - Additional displacement to include (obstacles, bonuses, etc.) (≥ 0)
   * @returns {string} Descriptive tightness text (e.g., 'loose', 'crowded', 'very squeezy')
   * @throws {TypeError} If ships is not an array or displacedArea/extra are not numbers
   * @throws {RangeError} If displacedArea is not positive
   * @example
   * const tightness = DisplacementCalculator.describeTightness(ships, boardArea, bonusArea)
   */
  static describeTightness (ships, displacedArea, extra = 0) {
    const shipDisplacement = this.calculateShipDisplacement(ships) + extra
    const ratio = shipDisplacement / displacedArea
    return this.describeDisplacementRatio(ratio)
  }
}
