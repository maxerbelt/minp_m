import { bh } from '../terrains/all/js/bh.js'
import { Placement } from './placement.js'
import { customUI } from './customUI.js'
import { placedShipsInstance } from '../selection/PlacedShips.js'

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
 * @property {Array<number>} cells - Grid cells occupied by this ship ([row, col] coordinates)
 * @property {() => ShipShape} shape - Function returning the ship's shape configuration
 * @property {number} [variant] - Optional visual variant identifier for the ship
 * @property {number} [r] - Optional row position for ship placement
 * @property {number} [c] - Optional column position for ship placement
 */

/**
 * @typedef {Object} CustomUI
 * @property {Object} trayManager - Manages weapon tray UI state
 * @property {(notice: string) => void} showNotice - Displays user-facing notice
 * @property {(custom: Custom) => void} removeAllPlacedShips - Removes ships from UI
 * @property {() => void} initializePlacement - Sets up placement UI
 * @property {() => void} clearMapAndRefresh - Clears map and refreshes display
 * @property {() => void} resetAdd - Resets add mode
 * @property {(cells: Array<number>, ship: Ship) => void} markPlaced - Marks ship cells as placed
 * @property {(custom: Custom, ship: Ship) => void} subtraction - Removes ship visually
 * @property {(custom: Custom) => void} displayShipTrackingInfo - Shows ship info
 * @property {Object} board - Board HTML element
 * @property {boolean} placingShips - Whether in placement mode
 * @property {Object} [clearVisuals] - Clears visual indicators
 */

/**
 * Custom game mode that extends Placement with additional ship displacement calculations.
 * Provides metrics for evaluating fleet composition and playability.
 *
 * @class Custom
 * @extends Placement
 */
class Custom extends Placement {
  static #THRESHOLDS = {
    playable: 0.35,
    sparse: 0.15
  }

  /**
   * Creates a Custom game instance.
   * Initializes candidate ships and ship tracking arrays.
   * @param {CustomUI} ui - The custom UI instance
   * @returns {void}
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
   * Uses the terrain configuration to generate a new fleet.
   *
   * @public
   * @returns {Array<Ship>} Array of placed ships from the placement manager
   */
  createCandidateShips () {
    return bh.terrain.newFleetForTerrain
  }

  /**
   * Calculates the total area available for ship placement based on map dimensions.
   * Formula: (rows + 1) × (cols + 1) + 1
   * Used as denominator for displacement ratio calculations.
   *
   * @public
   * @returns {number} The displaced area in grid units
   */
  calculateDisplacedArea () {
    return this.#getAvailablePlacementArea()
  }
  /**
   * Resets ship placement state (cells, visuals, score).
   * Clears the grid, UI visuals, and resets the score tracker.
   * @private
   * @param {boolean} [showNotice=false] - Whether to show user notice (default: false)
   * @returns {void}
   */
  _resetPlacementState (showNotice = false) {
    if (showNotice) {
      this.UI.showNotice('ships removed')
    }
    this.resetShipCells()
    this.UI.clearVisuals()
    this.score.reset()
  }
  /**
   * Clears all ships from the board and resets placement.
   * Removes all ships, resets state, and shows notification.
   * Updates both internal ship array and UI display.
   *
   * @public
   * @returns {void}
   */
  removeAllPlacedShips () {
    this._resetPlacementState(true)
    this.UI.removeAllPlacedShips(this)
    custom.ships = []
  }
  /**
   * Initialize new placement state.
   * Sets up board, UI, and brush controls for ship placement.
   * Prepares the custom game mode for accepting ship placements.
   *
   * @public
   * @returns {void}
   */
  initializePlacement () {
    this.UI.resetAdd(this)
    this.UI.initializePlacement()
  }

  /**
   * Reinitializes placement mode after clearing ships.
   * Restores UI state for fresh ship placement.
   * Resets trays and displays updated ship tracking info.
   *
   * @private
   * @returns {void}
   */
  _restartPlacementAfterClear () {
    this.removeAllPlacedShips()
    this.UI.trayManager.setTrays()
    this.initializePlacement()
    this.UI.displayShipTrackingInfo(this)
  }
  /**
   * Handles clear button click - clears ships or maps depending on mode.
   * If in placement mode, clears ships and restarts placement.
   * Otherwise, clears the map and refreshes the display.
   *
   * @public
   * @returns {void}
   */
  handleClear () {
    if (this.UI.placingShips) {
      this._restartPlacementAfterClear()
      return
    }
    this.UI.clearMapAndRefresh()
  }

  /**
   * Undoes the last ship placement action.
   * Reverts state and removes the most recent ship from grid.
   * Pops the last placed ship and updates both UI and internal state.
   *
   * @public
   * @returns {void}
   */
  handleUndo () {
    this._resetPlacementState()
    placedShipsInstance.popAndRefresh(
      this.shipCellGrid.grid,
      ship => {
        this.UI.markPlaced(ship.cells, ship)
      },
      ship => {
        this.UI.subtraction(this, ship)
      }
    )
  }

  /**
   * Gets the total number of ships in the fleet.
   * Returns the count of all candidate ships, placed or not.
   *
   * @public
   * @returns {number} Ship count
   */
  getShipCount () {
    return this.ships.length
  }

  /**
   * Gets the collection of ships that already occupy cells.
   * Filters the ship array to only include ships with assigned cells.
   *
   * @public
   * @returns {Array<Ship>} Placed ships
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
   * @public
   * @returns {number} Count of ships with cells assigned
   */
  getPlacedShipCount () {
    return this.getPlacedShips().length
  }

  /**
   * Calculates the total displacement (area) of all ships in the fleet.
   * Displacement is the sum of individual ship shape displacements.
   * Used to determine game difficulty and balance metrics.
   *
   * @public
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
   * Playable when displacement ratio is below the playable threshold (0.35).
   * Used to assess game balance for the human player.
   *
   * @public
   * @returns {boolean} True if fleet ratio < playable threshold
   */
  hasPlayableShips () {
    return this.#isDisplacementBelowThreshold(Custom.#THRESHOLDS.playable)
  }

  /**
   * Evaluates if the current fleet is sparse (few ships).
   * Sparse when displacement ratio is below the sparse threshold (0.15).
   * Used to identify minimal ship configurations.
   *
   * @public
   * @returns {boolean} True if fleet ratio < sparse threshold
   */
  hasFewShips () {
    return this.#isDisplacementBelowThreshold(Custom.#THRESHOLDS.sparse)
  }

  /**
   * Calculates the fleet displacement ratio.
   * Formula: Ratio = Total Ship Displacement / Available Area
   * Used to determine game difficulty and balance.
   * A ratio > 0.35 is unplayable, < 0.15 is sparse.
   *
   * @public
   * @returns {number} Displacement ratio (0.0 to 1.0+)
   */
  getDisplacementRatio () {
    return this.getTotalShipDisplacement() / this.#getAvailablePlacementArea()
  }

  /**
   * Computes the available placement area for the active map.
   * Formula: (rows + 1) × (cols + 1) + 1
   * Private helper used in displacement ratio calculations.
   *
   * @private
   * @returns {number} Available placement area in grid units
   */
  #getAvailablePlacementArea () {
    const map = bh.map
    return (map.rows + 1) * (map.cols + 1) + 1
  }

  /**
   * Returns a ship's displacement value.
   * Safely extracts displacement from ship's shape function.
   * Returns 0 if ship is null or shape is unavailable.
   *
   * @private
   * @param {Ship} ship - The ship to evaluate
   * @returns {number} Ship displacement or 0 if unavailable
   */
  #getShipDisplacement (ship) {
    return ship?.shape?.()?.displacement || 0
  }

  /**
   * Indicates whether displacement ratio is below a threshold.
   * Helper method for difficulty evaluation.
   *
   * @private
   * @param {number} threshold - The threshold ratio to compare against
   * @returns {boolean} True if current ratio is below threshold
   */
  #isDisplacementBelowThreshold (threshold) {
    return this.getDisplacementRatio() < threshold
  }
}

/**
 * Global singleton instance of the Custom game mode.
 * Exported for use throughout the application as the main custom game controller.
 * @type {Custom} The instantiated Custom game mode
 */
export const custom = new Custom(customUI)
