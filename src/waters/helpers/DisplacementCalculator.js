/**
 * Calculates and describes displacement ratios for game board utilization.
 * Provides methods to determine ship displacement area and convert ratios to descriptive text.
 *
 * @class DisplacementCalculator
 */
export class DisplacementCalculator {
  /**
   * Displacement ratio thresholds and their descriptions.
   * Defines the mapping from ratio ranges to human-readable descriptions.
   *
   * @type {Array<{limit: number, desc: string}>}
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
   *
   * @param {Array<Object>} ships - Array of ship objects
   * @returns {number} Total displacement area of all ships
   */
  static calculateShipDisplacement (ships) {
    return ships.reduce(
      (accumulator, ship) => accumulator + ship.shape().displacement,
      0
    )
  }

  /**
   * Calculates displacement for ships matching a specific subterrain.
   *
   * @param {Array<Object>} ships - Array of ship objects
   * @param {Object} subterrain - The subterrain to filter by
   * @returns {number} Total displacement for matching ships
   */
  static calculateSubterrainDisplacement (ships, subterrain) {
    return ships
      .filter(s => s.shape().subterrain === subterrain)
      .reduce((accumulator, ship) => accumulator + ship.shape().displacement, 0)
  }

  /**
   * Calculates mixed terrain ship displacement (ships occupying multiple terrains).
   * Multiplies by 1/4 for mixed terrain portion of the calculation.
   *
   * @param {Array<Object>} mixedShapes - Array of mixed terrain shapes
   * @returns {number} Mixed terrain displacement contribution
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
   *
   * @param {Array<Object>} mixedShapes - Array of mixed terrain shapes
   * @param {Object} subterrain - The subterrain to calculate for
   * @returns {number} Mixed terrain displacement for this subterrain
   */
  static calculateMixedSubterrainAmount (mixedShapes, subterrain) {
    return mixedShapes.reduce(
      (accumulator, shape) => accumulator + shape.displacementFor(subterrain),
      0
    )
  }

  /**
   * Converts a displacement ratio (0-1) to a human-readable description.
   * Iterates through thresholds to find the first matching description.
   *
   * @param {number} ratio - Displacement ratio (0-1 range)
   * @returns {string} Descriptive text for the ratio level
   */
  static describeDisplacementRatio (ratio) {
    for (const { limit, desc } of this.#DISPLACEMENT_THRESHOLDS) {
      if (ratio < limit) return desc
    }
    return 'very squeezy'
  }

  /**
   * Calculates tightness description with optional extra displacement.
   * Used for zone display entries combining ship displacement with bonus amounts.
   *
   * @param {Array<Object>} ships - Array of ships
   * @param {number} displacedArea - Available displacement area
   * @param {number} [extra=0] - Additional displacement to include
   * @returns {string} Descriptive tightness text
   */
  static describeTightness (ships, displacedArea, extra = 0) {
    const shipDisplacement = this.calculateShipDisplacement(ships) + extra
    const ratio = shipDisplacement / displacedArea
    return this.describeDisplacementRatio(ratio)
  }
}
