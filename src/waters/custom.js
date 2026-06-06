import { bh } from '../terrains/all/js/bh.js'
import { Placement } from './placement.js'
import { customUI } from './customUI.js'
import { placedShipsInstance } from '../selection/PlacedShips.js'

/**
 * @typedef {import('../ships/Ship.js').Ship} Ship
 * @description Represents a single game ship with placement, weapons, and hit tracking
 */

/**
 * @typedef {import('./customUI.js').CustomUI} CustomUI
 * @description Custom Map and Ship Placement UI Manager
 */

/**
 * @module waters/custom
 * @description Custom game mode management for user-created maps with displacement metrics.
 * Extends Placement with fleet composition analysis for custom map creation.
 */

/**
 * Custom game mode that extends Placement with ship displacement calculations.
 * Provides metrics for evaluating fleet composition and playability.
 *
 * **Architecture**:
 * Extends Placement class to inherit all placement and grid state management.
 * Adds displacement ratio calculations to evaluate custom map difficulty.
 * Used during map creation phase to validate fleet compositions.
 *
 * **Features**:
 * - Candidate ship management for custom map creation
 * - Fleet displacement calculation and ratio analysis
 * - Playability threshold evaluation (playable vs sparse)
 * - Ship placement tracking and validation
 * - Undo/clear functionality for placement phase
 * - Ship removal and board reset capabilities
 *
 * **Inherited Properties**:
 * - ships[] (inherited from Waters via Placement)
 * - score (inherited from Waters via Placement)
 * - opponent (inherited from Waters via Placement)
 * - shipCellGrid (inherited from Waters via Placement)
 * - loadOut (inherited from Waters via Placement)
 * - UI (inherited from Placement)
 *
 * @class Custom
 * @extends Placement
 * @property {CustomUI} UI
 * @example
 * // Create custom game instance with custom UI
 * const customGame = new Custom(customUI)
 * // Place ships and evaluate difficulty
 * const ratio = customGame.getDisplacementRatio()
 * const playable = customGame.hasPlayableShips()
 */
class Custom extends Placement {
  /**
   * Playability thresholds for fleet composition evaluation.
   * Displacement ratios determine game difficulty level.
   *
   * **Thresholds**:
   * - playable (0.35): Maximum ratio for playable difficulty - higher ratios are unplayable
   * - sparse (0.15): Maximum ratio for sparse fleets - indicates minimal ship configuration
   *
   * Used to categorize custom maps by difficulty and ship density.
   *
   * @type {Object<string, number>}
   * @static
   * @property {number} playable - Maximum ratio for playable difficulty (0.35 = 35%)
   * @property {number} sparse - Maximum ratio for sparse fleets (0.15 = 15%)
   */
  static #THRESHOLDS = {
    playable: 0.35,
    sparse: 0.15
  }

  /**
   * Candidate ships available for placement in custom mode.
   * @type {Ship[]}
   * @public
   */
  candidateShips

  /**
   * Ships currently tracked/managed in this custom game instance.
   * @type {Ship[]}
   * @public
   */
  ships

  /**
   * Creates a Custom game instance.
   * Initializes the placement UI and tracking arrays for custom game mode.
   * Sets up initial state for ship placement and displacement calculations.
   *
   * **Initialization Sequence**:
   * 1. Call super(ui) to initialize Placement parent class
   * 2. Initialize candidateShips array (empty until populated)
   * 3. Initialize ships array (starts empty, populated during placement)
   *
   * @constructor
   * @param {CustomUI} ui - The custom UI instance for rendering and interaction
   * @example
   * // Create and use custom game
   * const game = new Custom(customUI)
   * game.ships // → []
   * game.candidateShips // → []
   */
  constructor (ui) {
    super(ui)

    /**
     * Candidate ships available for placement in custom mode.
     * @type {Ship[]}
     */
    this.candidateShips = []

    /**
     * Ships currently tracked/managed in this custom game instance.
     * @type {Ship[]}
     */
    this.ships = []
  }

  /**
   * Creates candidate ships from the currently placed ships.
   * Retrieves all ships that have been placed on the grid.
   * Uses the terrain configuration to generate a new fleet for this map.
   *
   * **Context**:
   * The candidate ships are the pool of available units that can be placed
   * on this custom map. This value is determined by the active terrain type.
   * Each terrain (Sea, Space, etc.) has different available ship types.
   *
   * @public
   * @returns {Ship[]} Array of candidate ships available for placement in current terrain
   */
  createCandidateShips () {
    return bh.terrain.newFleetForTerrain
  }

  /**
   * Calculates the total area available for ship placement based on map dimensions.
   *
   * **Formula**: $(rows + 1) \times (cols + 1) + 1$
   *
   * This value serves as the denominator for displacement ratio calculations.
   * Used to determine game difficulty through fleet composition analysis.
   *
   * @public
   * @returns {number} The total available placement area in grid units
   */
  calculateDisplacedArea () {
    return this.#getAvailablePlacementArea()
  }
  /**
   * Resets ship placement state to clean slate.
   *
   * Clears the grid, UI visuals, and resets the score tracker to initial values.
   * Used when undoing placements or clearing the board.
   *
   * **Side Effects**:
   * - Clears all ship cells from the grid (calls resetShipCells)
   * - Removes visual elements from board (calls UI.clearVisuals)
   * - Resets score counters to zero (calls score.reset)
   * - Optionally displays "ships removed" user notice
   *
   * @param {boolean} [showNotice=false] - Whether to show user-facing notice message
   * @returns {void}
   */
  #resetPlacementState (showNotice = false) {
    if (showNotice) {
      this.UI.showNotice('ships removed')
    }
    this.resetShipCells()
    this.UI.clearVisuals()
    this.score.reset()
  }
  /**
   * Clears all ships from the board and resets placement.
   *
   * Removes all placed ships, resets state, and shows notification.
   * Updates both internal ship array and UI display to show empty board.
   *
   * **Side Effects**:
   * - Clears grid cells (calls #resetPlacementState)
   * - Removes visual elements from UI
   * - Resets score counters
   * - Clears internal ships array
   * - Displays "ships removed" user notice
   *
   * @public
   * @returns {void}
   */
  removeAllPlacedShips () {
    this.#resetPlacementState(true)
    const customUIInstance = /** @type {CustomUI} */ (this.UI)
    customUIInstance.removeAllPlacedShips(this)
    this.ships = []
  }
  /**
   * Initialize new placement state for the custom game.
   *
   * Sets up board, UI, and brush controls for ship placement phase.
   * Prepares the custom game mode for accepting new ship placements.
   *
   * **Side Effects**:
   * - Resets add mode (calls UI.resetAdd)
   * - Initializes placement UI (calls UI.initializePlacement)
   * - Prepares display for ship placement interaction
   *
   * @public
   * @returns {void}
   */
  initializePlacement () {
    const customUIInstance = /** @type {CustomUI} */ (this.UI)
    customUIInstance.resetAdd(this)
    customUIInstance.initializePlacement()
  }

  /**
   * Reinitializes placement mode after clearing ships.
   *
   * Restores UI state for fresh ship placement after user clears board.
   * Resets trays and displays updated ship tracking information.
   *
   * **Execution Sequence**:
   * 1. Remove all placed ships from grid
   * 2. Reset tray manager state
   * 3. Reinitialize placement UI
   * 4. Update ship tracking display
   *
   * **Side Effects**:
   * - Clears grid and UI visuals
   * - Resets tray manager
   * - Updates ship count display
   * - Prepares for new placement session
   *
   * @returns {void}
   */
  #restartPlacementAfterClear () {
    this.removeAllPlacedShips()
    const customUIInstance = /** @type {CustomUI} */ (this.UI)
    customUIInstance.trayManager.setTrays()
    this.initializePlacement()
    customUIInstance.displayShipTrackingInfo(this)
  }
  /**
   * Handles clear button click - clears ships or maps depending on mode.
   *
   * If in placement mode (placingShips = true), clears all ships and restarts placement.
   * Otherwise, clears the terrain map and refreshes the display.
   *
   * **Context-Sensitive Behavior**:
   * - **Placement mode** (UI.placingShips === true): Clears all ships and restarts placement
   * - **Map mode** (UI.placingShips === false): Clears terrain map and refreshes display
   *
   * @public
   * @returns {void}
   */
  handleClear () {
    if (this.UI.placingShips) {
      this.#restartPlacementAfterClear()
      return
    }
    const customUIInstance = /** @type {CustomUI} */ (this.UI)
    customUIInstance.clearMapAndRefresh()
  }

  /**
   * Undoes the last ship placement action.
   * Reverts state and removes the most recent ship from grid.
   * Pops the last placed ship and updates both UI and internal state.
   *
   * **Side Effects**:
   * - Resets placement state without notice
   * - Removes last placed ship from grid
   * - Updates UI visual display
   * - Allows re-placement of removed ship
   *
   * @public
   * @returns {void}
   */
  handleUndo () {
    this.#resetPlacementState()
    const customUIInstance = /** @type {CustomUI} */ (this.UI)
    placedShipsInstance.popAndRefresh(
      this.shipCellGrid.grid,
      /**
       * @param {Ship} ship - Ship being removed
       * @returns {void}
       */
      ship => {
        customUIInstance.grid.markPlaced(ship.cells, ship)
      },
      /**
       * @param {Ship} ship - Ship being undone
       * @returns {void}
       */
      ship => {
        customUIInstance.subtraction(this, ship)
      }
    )
  }

  /**
   * Gets the total number of ships in the fleet.
   * Returns the count of all candidate ships, placed or not.
   *
   * @public
   * @returns {number} Total ship count in fleet
   */
  getShipCount () {
    return this.ships.length
  }

  /**
   * Gets the collection of ships that already occupy cells.
   * Filters the ship array to only include ships with assigned cells.
   * A placed ship has at least one cell in its cells array.
   *
   * @public
   * @returns {Ship[]} Array of placed ships (with cells assigned)
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
   * **Formula**: $\sum_{ship} displacement(ship.shape())$
   *
   * @public
   * @returns {number} Total displacement in grid units (sum of all ship areas)
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
   * A ratio < 0.35 means the fleet provides sufficient challenge while remaining playable.
   * Ratios >= 0.35 are considered unplayable (too few ships).
   *
   * @public
   * @returns {boolean} True if fleet ratio < 0.35 (playable threshold)
   */
  hasPlayableShips () {
    return this.#isDisplacementBelowThreshold(Custom.#THRESHOLDS.playable)
  }

  /**
   * Evaluates if the current fleet is sparse (few ships).
   * Sparse when displacement ratio is below the sparse threshold (0.15).
   * Used to identify minimal ship configurations.
   *
   * A ratio < 0.15 indicates very few ships on the map, reducing gameplay variety.
   *
   * @public
   * @returns {boolean} True if fleet ratio < 0.15 (sparse threshold)
   */
  hasFewShips () {
    return this.#isDisplacementBelowThreshold(Custom.#THRESHOLDS.sparse)
  }

  /**
   * Calculates the fleet displacement ratio.
   * **Formula**: $Ratio = \frac{Total~Ship~Displacement}{Available~Area}$
   *
   * Used to determine game difficulty and balance:
   * - Ratio > 0.35: Unplayable (too few ships, sparse)
   * - Ratio 0.15–0.35: Playable (balanced difficulty)
   * - Ratio < 0.15: Very sparse (minimal fleet)
   *
   * @public
   * @returns {number} Displacement ratio from 0 to ~1 (can exceed 1 for dense fleets)
   */
  getDisplacementRatio () {
    return this.getTotalShipDisplacement() / this.#getAvailablePlacementArea()
  }

  /**
   * Computes the available placement area for the active map.
   * **Formula**: $(rows + 1) \times (cols + 1) + 1$
   *
   * Private helper used in displacement ratio calculations.
   * Represents the total grid area available for ship placement.
   *
   * @returns {number} Available placement area in grid units
   */
  #getAvailablePlacementArea () {
    const map = bh.map
    if (!map) return 0
    const rows = /** @type {number} */ (map.rows)
    const cols = /** @type {number} */ (map.cols)
    return (rows + 1) * (cols + 1) + 1
  }

  /**
   * Returns a ship's displacement value.
   * Safely extracts displacement from ship's shape function using optional chaining.
   * Returns 0 if ship is null, shape is unavailable, or displacement is missing.
   *
   * **Type Safety**: Uses optional chaining (?.) to safely traverse properties.
   *
   * @param {Ship} ship - The ship to evaluate
   * @returns {number} Ship displacement (area) or 0 if unavailable
   */
  #getShipDisplacement (ship) {
    const shape = ship?.shape?.()
    const displacement = shape?.displacement ?? 0
    return typeof displacement === 'number' ? displacement : 0
  }

  /**
   * Indicates whether displacement ratio is below a threshold.
   * Helper method for difficulty evaluation and classification.
   *
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
 * Initialized with the default customUI instance.
 *
 * **Usage**:
 * Import and use to manage custom map creation:
 * ```javascript
 * import { custom } from './waters/custom.js'
 * custom.removeAllPlacedShips()
 * const ratio = custom.getDisplacementRatio()
 * const isPlayable = custom.hasPlayableShips()
 * ```
 *
 * @type {Custom}
 * @const
 */
export const custom = new Custom(customUI)
