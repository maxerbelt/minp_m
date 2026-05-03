import { bh } from '../terrains/all/js/bh.js'
import { Waters } from './Waters.js'
import { customUI } from './customUI.js'

/**
 * Custom game mode that extends Waters with additional ship displacement calculations.
 * Provides metrics for evaluating fleet composition and playability.
 *
 * @class Custom
 * @extends Waters
 */
class Custom extends Waters {
  /**
   * Creates a Custom game instance.
   * @param {Object} ui - The custom UI instance
   */
  constructor (ui) {
    super(ui)
    /** @type {Array<Object>} Candidate ships for placement */
    this.candidateShips = []
    /** @type {Array<Object>} Currently tracked ships */
    this.ships = []
  }

  /**
   * Calculates the total area available for ship placement based on map dimensions.
   * Formula: (rows + 1) × (cols + 1) + 1
   *
   * @returns {number} The displaced area in grid units
   * @private
   */
  calculateDisplacedArea () {
    const map = bh.map
    return (map.rows + 1) * (map.cols + 1) + 1
  }

  /**
   * Gets the total number of ships in the fleet.
   *
   * @returns {number} Ship count
   */
  getShipCount () {
    return this.ships.length
  }

  /**
   * Gets the number of ships that have been placed on the board.
   * A placed ship has at least one cell occupied.
   *
   * @returns {number} Count of ships with cells assigned
   */
  getPlacedShipCount () {
    return this.ships.filter(ship => ship.cells.length > 0).length
  }

  /**
   * Calculates the total displacement (area) of all ships in the fleet.
   * Displacement is the sum of individual ship shape displacements.
   *
   * @returns {number} Total displacement in grid units
   */
  getTotalShipDisplacement () {
    return this.ships.reduce(
      (total, ship) => total + ship.shape().displacement,
      0
    )
  }

  /**
   * Evaluates if the current fleet composition provides playable difficulty.
   * Playable when displacement ratio is below 35% of available area.
   *
   * @returns {boolean} True if fleet ratio < 0.35 (playable)
   */
  hasPlayableShips () {
    return this.getDisplacementRatio() < 0.35
  }

  /**
   * Evaluates if the current fleet is sparse (few ships).
   * Few ships when displacement ratio is below 15% of available area.
   *
   * @returns {boolean} True if fleet ratio < 0.15 (sparse)
   */
  hasFewShips () {
    return this.getDisplacementRatio() < 0.15
  }

  /**
   * Calculates the fleet displacement ratio.
   * Ratio = Total Ship Displacement / Available Area
   * Used to determine game difficulty and balance.
   *
   * @returns {number} Displacement ratio (0.0 to 1.0+)
   */
  getDisplacementRatio () {
    return this.getTotalShipDisplacement() / this.calculateDisplacedArea()
  }
}

export const custom = new Custom(customUI)
