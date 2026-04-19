import { bh } from '../terrains/all/js/bh.js'
import { Waters } from './Waters.js'
import { customUI } from './customUI.js'

export class Custom extends Waters {
  constructor (customUI) {
    super(customUI)
    this.candidateShips = []
    this.ships = []
  }

  /**
   * Calculates the displaced area based on the map dimensions.
   * @returns {number} The displaced area.
   */
  calculateDisplacedArea () {
    const map = bh.map
    return (map.rows + 1) * (map.cols + 1) + 1
  }

  /**
   * Gets the total number of ships.
   * @returns {number} Ship count.
   */
  getShipCount () {
    return this.ships.length
  }

  /**
   * Gets the number of ships that have been placed (have cells).
   * @returns {number} Placed ship count.
   */
  getPlacedShipCount () {
    return this.ships.filter(ship => ship.cells.length > 0).length
  }

  /**
   * Calculates the total displacement of all ships.
   * @returns {number} Total displacement.
   */
  getTotalShipDisplacement () {
    return this.ships.reduce(
      (total, ship) => total + ship.shape().displacement,
      0
    )
  }

  /**
   * Checks if there are playable ships based on displacement ratio.
   * @returns {boolean} True if ratio < 0.35.
   */
  hasPlayableShips () {
    return this.getDisplacementRatio() < 0.35
  }

  /**
   * Checks if there are few ships based on displacement ratio.
   * @returns {boolean} True if ratio < 0.15.
   */
  hasFewShips () {
    return this.getDisplacementRatio() < 0.15
  }

  /**
   * Calculates the displacement ratio.
   * @returns {number} Ratio of total displacement to displaced area.
   */
  getDisplacementRatio () {
    return this.getTotalShipDisplacement() / this.calculateDisplacedArea()
  }
}

export const custom = new Custom(customUI)
