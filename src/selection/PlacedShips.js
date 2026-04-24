/**
 * Manages a collection of ships that have been placed on the board.
 */
export class PlacedShips {
  constructor () {
    /** @type {Array<Object>} */
    this.ships = []
    /** @type {HTMLButtonElement|null} */
    this.undoBtn = null
    /** @type {HTMLButtonElement|null} */
    this.resetBtn = null
  }

  /**
   * @returns {boolean} True when no ships have been placed
   */
  isEmpty () {
    return this.ships.length === 0
  }

  /**
   * Removes all ships from the placed collection.
   */
  reset () {
    this.ships = []
    this.updateUndo()
  }

  /**
   * Registers undo and reset button controls.
   * @param {HTMLButtonElement} undoBtn
   * @param {HTMLButtonElement} resetBtn
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
   * Updates the enabled/disabled state of registered buttons.
   */
  updateUndo () {
    this._setButtonState(this.undoBtn)
    this._setButtonState(this.resetBtn)
  }

  /**
   * Removes a placed ship and refreshes the remaining ships on the grid.
   * @param {Object} shipCellGrid
   * @param {Function} mark - Function called for each remaining ship after re-adding
   * @param {Function} returnShip - Function called with the removed ship
   * @returns {Object|null} The removed ship, or null if none were placed
   */
  popAndRefresh (shipCellGrid, mark, returnShip) {
    const ship = this.pop()
    if (ship) {
      returnShip(ship)
      this._forEachShip(s => {
        s.addToGrid(shipCellGrid)
        mark(s)
      })
    }
    return ship
  }

  /**
   * Returns all placed ships.
   * @param {Function} returnShip - Callback invoked with each ship
   */
  popAll (returnShip) {
    this._forEachShip(returnShip)
    this.reset()
  }

  /**
   * Adds a ship to the placed collection.
   * @param {Object} ship
   * @param {Array} placed - Cell coordinates where the ship was placed
   * @returns {Array} The placed ship cells
   */
  push (ship, placed) {
    this.ships.push(ship)
    this.updateUndo()
    return ship.placeAtCells(placed)
  }

  /**
   * @returns {number} The number of ships placed
   */
  numPlaced () {
    return this.ships.length
  }

  /**
   * @returns {Array<Object>} A shallow copy of the placed ships list
   */
  getAll () {
    return this.ships.slice()
  }

  /**
   * Iterates over every placed ship.
   * @private
   * @param {Function} callback
   */
  _forEachShip (callback) {
    for (const ship of this.ships) {
      callback(ship)
    }
  }

  /**
   * Updates the disabled state of a button based on whether any ships are placed.
   * @private
   * @param {HTMLButtonElement|null} button
   */
  _setButtonState (button) {
    if (!button) return
    button.disabled = this.isEmpty()
  }
}

export const placedShipsInstance = new PlacedShips()
