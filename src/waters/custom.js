import { bh } from '../terrains/all/js/bh.js'
import { Waters } from './Waters.js'
import { customUI } from './customUI.js'

/**
 * @typedef {Object} Weapon
 * @property {string} letter
 */

/**
 * @typedef {Object} ShipShape
 * @property {number} displacement
 */

/**
 * @typedef {Object} Ship
 * @property {Array<*>} cells
 * @property {() => ShipShape} shape
 * @property {number} [variant]
 */

/**
 * @typedef {Object} CustomUI
 */

/**
 * Custom game mode that extends Waters with additional ship displacement calculations.
 * Provides metrics for evaluating fleet composition and playability.
 *
 * @class Custom
 * @extends Waters
 */
class Custom extends Waters {
  static #THRESHOLDS = {
    playable: 0.35,
    sparse: 0.15
  }

  /**
   * Creates a Custom game instance.
   * @param {CustomUI} ui - The custom UI instance
   */
  constructor (ui) {
    super(ui)
    /** @type {Array<Ship>} Candidate ships for placement */
    this.candidateShips = []
    /** @type {Array<Ship>} Currently tracked ships */
    this.ships = []
  }

  /**
   * Creates candidate ships from the currently placed ships.
   * Retrieves all ships that have been placed on the grid.
   *
   * @returns {Array<Ship>} Array of placed ships from the placement manager
   */
  createCandidateShips () {
    return bh.terrain.newFleetForTerrain
  }

  /**
   * Calculates the total area available for ship placement based on map dimensions.
   * Formula: (rows + 1) × (cols + 1) + 1
   *
   * @returns {number} The displaced area in grid units
   */
  calculateDisplacedArea () {
    return this.#getAvailablePlacementArea()
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
   * Gets the collection of ships that already occupy cells.
   *
   * @returns {Array<Ship>} Placed ships
   * @private
   */
  getPlacedShips () {
    return this.ships.filter(
      ship => Array.isArray(ship.cells) && ship.cells.length > 0
    )
  }

  /**
   * Gets the number of ships that have been placed on the board.
   * A placed ship has at least one cell occupied.
   *
   * @returns {number} Count of ships with cells assigned
   */
  getPlacedShipCount () {
    return this.getPlacedShips().length
  }

  /**
   * Calculates the total displacement (area) of all ships in the fleet.
   * Displacement is the sum of individual ship shape displacements.
   *
   * @returns {number} Total displacement in grid units
   */
  getTotalShipDisplacement () {
    return this.ships.reduce(
      (total, ship) => total + this.#getShipDisplacement(ship),
      0
    )
  }

  /**
   * Evaluates if the current fleet composition provides playable difficulty.
   * Playable when displacement ratio is below the playable threshold.
   *
   * @returns {boolean} True if fleet ratio < playable threshold
   */
  hasPlayableShips () {
    return this.#isDisplacementBelowThreshold(Custom.#THRESHOLDS.playable)
  }

  /**
   * Evaluates if the current fleet is sparse (few ships).
   * Sparse when displacement ratio is below the sparse threshold.
   *
   * @returns {boolean} True if fleet ratio < sparse threshold
   */
  hasFewShips () {
    return this.#isDisplacementBelowThreshold(Custom.#THRESHOLDS.sparse)
  }

  /**
   * Calculates the fleet displacement ratio.
   * Ratio = Total Ship Displacement / Available Area
   * Used to determine game difficulty and balance.
   *
   * @returns {number} Displacement ratio (0.0 to 1.0+)
   */
  getDisplacementRatio () {
    return this.getTotalShipDisplacement() / this.#getAvailablePlacementArea()
  }

  /**
   * Computes the available placement area for the active map.
   *
   * @returns {number}
   */
  #getAvailablePlacementArea () {
    const map = bh.map
    return (map.rows + 1) * (map.cols + 1) + 1
  }

  /**
   * Returns a ship's displacement value.
   *
   * @param {Ship} ship
   * @returns {number}
   */
  #getShipDisplacement (ship) {
    return ship?.shape?.()?.displacement || 0
  }

  /**
   * Indicates whether displacement ratio is below a threshold.
   *
   * @param {number} threshold
   * @returns {boolean}
   */
  #isDisplacementBelowThreshold (threshold) {
    return this.getDisplacementRatio() < threshold
  }
}

export const custom = new Custom(customUI)
