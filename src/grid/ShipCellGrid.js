import { bh } from '../terrains/all/js/bh.js'

/**
 * Manages a 2D sparse grid of ship cell positions.
 * Encapsulates operations on the grid structure used for tracking occupied cells during placement and combat.
 */
export class ShipCellGrid {
  /**
   * Creates a new ship cell grid.
   * @param {Array<Array>} initialGrid - Optional initial grid state; defaults to blank map grid
   */
  constructor (initialGrid = null) {
    this._grid = initialGrid || bh.map.blankGrid
  }

  /**
   * Gets the underlying 2D grid array.
   * Used for compatibility with ship.addToGrid() and placement operations.
   *
   * @returns {Array<Array>} The sparse 2D grid of ship cells
   */
  get grid () {
    return this._grid
  }

  /**
   * Resets the grid to a blank state.
   */
  reset () {
    this._grid = bh.map.blankGrid
  }

  /**
   * Initializes or validates the grid is properly set up.
   * Creates a blank grid if the current grid is invalid.
   */
  ensureInitialized () {
    if (!this._grid || !Array.isArray(this._grid)) {
      this._grid = bh.map.blankGrid
    }
  }

  /**
   * Gets the ship cell at the specified coordinates.
   * Returns undefined if no cell exists at that position.
   *
   * @param {number} row - The row coordinate
   * @param {number} col - The column coordinate
   * @returns {Object|undefined} The ship cell object, or undefined if empty
   */
  getCellAt (row, col) {
    return this._grid[row]?.[col]
  }

  /**
   * Gets all cells belonging to a specific ship by ID.
   *
   * @param {number} shipId - The ship ID to search for
   * @returns {Array<Object>} Array of ship cells with matching ID
   */
  getCellsByShipId (shipId) {
    const cells = []
    for (const rowCells of this._grid) {
      for (const cell of rowCells) {
        if (cell && cell.id === shipId) {
          cells.push(cell)
        }
      }
    }
    return cells
  }

  /**
   * Gets all cells with armed ammunition.
   * Used for filtering cells that can fire weapons.
   *
   * @returns {Array<Object>} Array of cells with ammo > 0
   */
  getArmedCells () {
    const cells = []
    for (const rowCells of this._grid) {
      for (const cell of rowCells) {
        if (cell?.dataset?.ammo > 0) {
          cells.push(cell)
        }
      }
    }
    return cells
  }

  /**
   * Gets armed cells for a specific weapon letter.
   * Filters by both ammunition and weapon type.
   *
   * @param {string} weaponLetter - The weapon letter to filter by
   * @returns {Array<Object>} Array of cells with matching weapon and ammo > 0
   */
  getArmedCellsByWeapon (weaponLetter) {
    const cells = []
    for (const rowCells of this._grid) {
      for (const cell of rowCells) {
        if (
          cell?.dataset?.ammo > 0 &&
          cell?.dataset?.wletter === weaponLetter
        ) {
          cells.push(cell)
        }
      }
    }
    return cells
  }

  /**
   * Iterates over all occupied cells in the grid.
   * Calls the callback function for each non-empty cell with its position.
   *
   * @param {Function} callback - Function called with (cell, row, col) for each occupied cell
   */
  forEachCell (callback) {
    this._grid.forEach((rowCells, rowIndex) => {
      rowCells.forEach((cell, colIndex) => {
        if (cell) {
          callback(cell, rowIndex, colIndex)
        }
      })
    })
  }

  /**
   * Updates a mask to include all occupied cells in this grid.
   * Marks all cells with data in the empty cell mask.
   *
   * @param {Object} mask - The placement mask to update
   */
  updateMask (mask) {
    const emptyCellMask = mask.emptyMask
    this.forEachCell((cell, row, col) => {
      emptyCellMask.set(col, row)
    })
  }

  /**
   * Gets the grid dimensions.
   *
   * @returns {{ rows: number, cols: number }} Object with grid dimensions
   */
  getDimensions () {
    const rows = this._grid.length
    const cols = rows > 0 ? this._grid[0].length : 0
    return { rows, cols }
  }

  /**
   * Creates a serializable copy of the grid for storage.
   * Useful for localStorage/clipboard operations.
   *
   * @returns {Array<Array>} A copy of the grid structure
   */
  toJSON () {
    return JSON.parse(JSON.stringify(this._grid))
  }

  /**
   * Loads grid state from serialized data.
   * Restores previously saved grid state.
   *
   * @param {Array<Array>} data - The serialized grid data
   */
  fromJSON (data) {
    this._grid = data || bh.map.blankGrid
  }
}
