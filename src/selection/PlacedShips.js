/**
 * @typedef {Object} PlacedShip
 * @property {Function} placeAtCells - Places the ship at the given cells
 * @property {Function} removeFromPlacement - Removes the ship from placement state
 * @property {Function} addToGrid - Adds the ship back onto the grid
 */

/**
 * @typedef {Object} ShipCellGrid
 * @property {any} [grid] - Arbitrary grid metadata used during refresh
 */

/**
 * @typedef {Function} MarkCallback
 * @param {PlacedShip} ship - Ship being marked on the grid
 * @returns {void}
 */

/**
 * @typedef {Function} ReturnShipCallback
 * @param {PlacedShip} ship - Removed ship to return
 * @returns {void}
 */

/**
 * Manages a collection of ships that have been placed on the board.
 * Provides undo/reset functionality and maintains the placement history.
 */
export class PlacedShips {
  /**
   * Creates a new PlacedShips instance.
   */
  constructor () {
    /**
     * Array of ships that have been placed on the board.
     * @type {Array<PlacedShip>}
     * @private
     */
    this.ships = []

    /**
     * Undo button element for UI control.
     * @type {HTMLButtonElement|null}
     * @private
     */
    this.undoBtn = null

    /**
     * Reset button element for UI control.
     * @type {HTMLButtonElement|null}
     * @private
     */
    this.resetBtn = null
  }

  /**
   * Checks if no ships have been placed on the board.
   * @returns {boolean} True when no ships have been placed
   */
  isEmpty () {
    return this.ships.length === 0
  }

  /**
   * Removes all ships from the placed collection and updates UI controls.
   * @returns {void}
   */
  reset () {
    this.ships = []
    this._updateControls()
  }

  /**
   * Registers undo and reset button controls for UI state management.
   * @param {HTMLButtonElement|null} undoBtn - The undo button element
   * @param {HTMLButtonElement|null} resetBtn - The reset button element
   * @returns {void}
   */
  registerUndo (undoBtn, resetBtn) {
    this.undoBtn = undoBtn
    this.resetBtn = resetBtn
    this._updateControls()
  }

  /**
   * Removes the last placed ship from the collection.
   * @returns {PlacedShip} The removed ship
   * @throws {Error} When there are no placed ships to remove
   */
  pop () {
    if (this.ships.length === 0) {
      throw new Error('No placed ships to pop')
    }
    const ship = this.ships.pop()
    ship.removeFromPlacement()
    this.updateUndo()
    return ship
  }

  /**
   * Updates the enabled/disabled state of registered buttons based on ship count.
   * Buttons are disabled when no ships are placed.
   * @returns {void}
   */
  updateUndo () {
    this._updateControls()
  }

  /**
   * Updates all registered button controls with the current disabled state.
   * @returns {void}
   * @private
   */
  _updateControls () {
    const disabled = this.isEmpty()
    this._setButtonDisabledState(this.undoBtn, disabled)
    this._setButtonDisabledState(this.resetBtn, disabled)
  }

  /**
   * Removes a placed ship and refreshes the remaining ships on the grid.
   * @param {ShipCellGrid} shipCellGrid - The grid containing ship cell data
   * @param {MarkCallback} mark - Function called for each remaining ship after re-adding
   * @param {ReturnShipCallback} returnShip - Function called with the removed ship
   * @returns {PlacedShip|null} The removed ship, or null if none were placed
   */
  popAndRefresh (shipCellGrid, mark, returnShip) {
    const ship = this.pop()
    if (ship) {
      returnShip(ship)
      this._refreshAllShipsOnGrid(shipCellGrid, mark)
    }
    return ship
  }

  /**
   * Refreshes all remaining ships on the grid after a ship removal.
   * @param {ShipCellGrid} shipCellGrid - The grid containing ship cell data
   * @param {MarkCallback} mark - Function called for each ship after re-adding to grid
   * @returns {void}
   * @private
   */
  _refreshAllShipsOnGrid (shipCellGrid, mark) {
    this._forEachPlacedShip(ship => {
      ship.addToGrid(shipCellGrid)
      mark(ship)
    })
  }

  /**
   * Returns all placed ships to a callback function and clears the collection.
   * @param {ReturnShipCallback} returnShip - Callback invoked with each ship
   * @returns {void}
   */
  popAll (returnShip) {
    this._forEachPlacedShip(returnShip)
    this.reset()
  }

  /**
   * Adds a ship to the placed collection at specified cell coordinates.
   * @param {PlacedShip} ship - The ship object to place
   * @param {Array} placed - Cell coordinates where the ship was placed
   * @returns {Array} The placed ship cells
   */
  push (ship, placed) {
    this.ships.push(ship)
    this.updateUndo()
    return ship.placeAtCells(placed)
  }

  /**
   * Gets the number of ships currently placed.
   * @returns {number} The number of ships placed
   */
  numPlaced () {
    return this.ships.length
  }

  /**
   * Gets a shallow copy of the placed ships list.
   * @returns {Array<PlacedShip>} A shallow copy of the placed ships list
   */
  getAll () {
    return this.ships.slice()
  }

  /**
   * Iterates over every placed ship and calls the provided callback.
   * @param {ReturnShipCallback|MarkCallback} callback - Function to call for each ship
   * @returns {void}
   * @private
   */
  _forEachPlacedShip (callback) {
    for (const ship of this.ships) {
      callback(ship)
    }
  }

  /**
   * Updates the disabled state of a button based on whether any ships are placed.
   * @param {HTMLButtonElement|null} button - The button to update
   * @param {boolean} disabled - Whether the button should be disabled
   * @returns {void}
   * @private
   */
  _setButtonDisabledState (button, disabled) {
    if (!button) return
    button.disabled = disabled
  }
}

/**
 * Singleton instance of PlacedShips for global access.
 * @type {PlacedShips}
 */
export const placedShipsInstance = new PlacedShips()
