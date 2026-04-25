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
     * @type {Array<Object>}
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
    this.updateUndo()
  }

  /**
   * Registers undo and reset button controls for UI state management.
   * @param {HTMLButtonElement} undoBtn - The undo button element
   * @param {HTMLButtonElement} resetBtn - The reset button element
   * @returns {void}
   */
  registerUndo (undoBtn, resetBtn) {
    this.undoBtn = undoBtn
    this.resetBtn = resetBtn
    this.updateUndo()
  }

  /**
   * Removes the last placed ship from the collection.
   * @returns {Object} The removed ship
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
    this._setButtonState(this.undoBtn)
    this._setButtonState(this.resetBtn)
  }

  /**
   * Removes a placed ship and refreshes the remaining ships on the grid.
   * @param {Object} shipCellGrid - The grid containing ship cell data
   * @param {Function} mark - Function called for each remaining ship after re-adding
   * @param {Function} returnShip - Function called with the removed ship
   * @returns {Object|null} The removed ship, or null if none were placed
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
   * @param {Object} shipCellGrid - The grid containing ship cell data
   * @param {Function} mark - Function called for each ship after re-adding to grid
   * @returns {void}
   * @private
   */
  _refreshAllShipsOnGrid (shipCellGrid, mark) {
    this._forEachShip(ship => {
      ship.addToGrid(shipCellGrid)
      mark(ship)
    })
  }

  /**
   * Returns all placed ships to a callback function and clears the collection.
   * @param {Function} returnShip - Callback invoked with each ship
   * @returns {void}
   */
  popAll (returnShip) {
    this._forEachShip(returnShip)
    this.reset()
  }

  /**
   * Adds a ship to the placed collection at specified cell coordinates.
   * @param {Object} ship - The ship object to place
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
   * @returns {Array<Object>} A shallow copy of the placed ships list
   */
  getAll () {
    return this.ships.slice()
  }

  /**
   * Iterates over every placed ship and calls the provided callback.
   * @param {Function} callback - Function to call for each ship
   * @returns {void}
   * @private
   */
  _forEachShip (callback) {
    for (const ship of this.ships) {
      callback(ship)
    }
  }

  /**
   * Updates the disabled state of a button based on whether any ships are placed.
   * Buttons are disabled when no ships are placed.
   * @param {HTMLButtonElement|null} button - The button to update
   * @returns {void}
   * @private
   */
  _setButtonState (button) {
    if (!button) return
    button.disabled = this.isEmpty()
  }
}

/**
 * Singleton instance of PlacedShips for global access.
 * @type {PlacedShips}
 */
export const placedShipsInstance = new PlacedShips()
