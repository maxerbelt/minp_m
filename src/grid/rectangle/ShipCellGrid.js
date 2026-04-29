import { Random } from '../../core/Random.js'
import { bh } from '../../terrains/all/js/bh.js'
import { AsciiRepresentation } from '../AsciiRepresentation.js'
import { GridBase } from '../gridBase.js'
import { Mask } from './mask.js'
import { RectangleShape } from './RectangleShape.js'

const NOOP = () => {}

/**
 * @typedef {Object} ShipCell
 * @property {number} id - Unique ship identifier
 * @property {string} [letter] - Ship letter or label
 * @property {{ammo?: number, wletter?: string}} [dataset] - Optional UI dataset values
 */

/**
 * @typedef {ShipCell|null} ShipCellEntry
 * @typedef {ShipCellEntry[]} ShipCellRow
 * @typedef {ShipCellRow[]} ShipCellGridData
 */

/**
 * Manages a 2D sparse ship cell grid with placement mask synchronization
 * and ship placement helpers.
 *
 * @class ShipCellGrid
 * @extends GridBase
 */
export class ShipCellGrid extends GridBase {
  /**
   * Creates a new ship cell grid.
   * @param {ShipCellGridData|null} initialGrid - Optional initial grid state; defaults to blank map grid
   * @throws {Error} If initialGrid is not a valid 2D array
   */
  constructor (initialGrid = null) {
    if (
      initialGrid &&
      (!Array.isArray(initialGrid) || !Array.isArray(initialGrid[0]))
    ) {
      throw new Error('Initial grid must be a 2D array')
    }

    const grid = initialGrid || bh.map.blankGrid
    const mask = initialGrid
      ? new Mask(grid[0].length, grid.length)
      : bh.map.blankMask

    super(RectangleShape(mask.width, mask.height))

    this._grid = grid
    this._maskedGrid = mask
  }

  /**
   * Helper: Normalizes coordinates from (row, col) to (x, y) for consistency.
   * Used internally by XY-based methods to delegate to RC-based implementations.
   * @private
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {[number, number]} [row, col] pair
   */
  _normalizeXYToRC (x, y) {
    return [y, x]
  }

  /**
   * Underlying ship cell matrix.
   * @returns {ShipCellGridData}
   */
  get grid () {
    return this._grid
  }

  /**
   * Placement mask tracking occupied ship cells.
   * @returns {Mask}
   */
  get maskedGrid () {
    return this._maskedGrid
  }

  /**
   * Resets ship cell state back to blank map defaults.
   */
  reset () {
    this._grid = bh.map.blankGrid
    this._maskedGrid = bh.map.blankMask
    this.width = this._grid[0]?.length || 0
    this.height = this._grid.length
    this._ascii = null
  }

  /**
   * Ensures the grid and placement mask are properly initialized.
   * Restores to blank map if either structure is malformed.
   * @private
   */
  _ensureInitialized () {
    this._ensureGridValid()
    this._ensureMaskValid()
  }

  /**
   * Validates grid is a 2D array; restores to blank if corrupted.
   * @private
   */
  _ensureGridValid () {
    if (!Array.isArray(this._grid) || !Array.isArray(this._grid[0])) {
      this._grid = bh.map.blankGrid
      this.width = this._grid[0]?.length || 0
      this.height = this._grid.length
    }
  }

  /**
   * Validates mask is a Mask instance; restores to blank if corrupted.
   * @private
   */
  _ensureMaskValid () {
    if (!(this._maskedGrid instanceof Mask)) {
      this._maskedGrid = bh.map.blankMask
    }
  }

  /**
   * Returns the ship cell at the given row and column coordinates.
   * @param {number} row - Row coordinate (0-indexed from top)
   * @param {number} col - Column coordinate (0-indexed from left)
   * @returns {ShipCell|undefined} Ship cell object or undefined if empty
   */
  cellAtRC (row, col) {
    return this._grid[row]?.[col]
  }

  /**
   * Returns the ship cell at the given x/y coordinates.
   * Delegates to RC-based accessor after coordinate conversion.
   * @param {number} x - Column coordinate (0-indexed from left)
   * @param {number} y - Row coordinate (0-indexed from top)
   * @returns {ShipCell|undefined} Ship cell object or undefined if empty
   */
  atRC (row, col) {
    return this.cellAtRC(row, col)?.id || 0
  }

  /**
   * Returns the ship ID at the given row and column.
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @returns {number} Ship ID or 0 if empty
   */
  at (x, y) {
    return this.atRC(y, x)
  }

  /**
   * Returns the ship ID at the given x/y coordinates.
   * Delegates to RC-based lookup after coordinate conversion.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {number} Ship ID or 0 if empty
   */
  cellAt (x, y) {
    return this.cellAtRC(y, x)
  }

  /**
   * Returns true when a ship cell exists at the given row/column.
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @returns {boolean} True if occupied by a ship cell
   */
  hasRC (row, col) {
    return !!this.atRC(row, col)
  }

  /**
   * Returns true when a ship cell exists at the given x/y coordinates.
   * Delegates to RC-based check after coordinate conversion.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {boolean} True if occupied by a ship cell
   */
  has (x, y) {
    return !!this.cellAt(x, y)
  }

  setCellRC (row, col, cell) {
  /**
   * Sets a ship cell at the given row/column coordinates.
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @param {ShipCell} cell - Ship cell object to place
   */
    if (this.isValidRC(row, col)) {
      this._grid[row][col] = cell
    }
  }

  setCell (x, y, cell) {
    this.setCellRC(y, x, cell)
  /**
   * Sets a ship cell at the given x/y coordinates.
   * Delegates to RC-based setter after coordinate conversion.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {ShipCell} cell - Ship cell object to place
   */
  }

  setRC (row, col, id) {
  /**
   * Sets a ship ID at the given row/column, creating a cell if needed.
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @param {number} id - Ship ID to set
   */
    if (this.isValidRC(row, col)) {
      if (this._grid[row][col]?.id != null) {
        this._grid[row][col].id = id
        return
      }
      this._grid[row][col] = { id, letter: '?' }
    }
  }

  set (x, y, id) {
    this.setRC(y, x, id)
  /**
   * Sets a ship ID at the given x/y coordinates.
   * Delegates to RC-based setter after coordinate conversion.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {number} id - Ship ID to set
   */
  }

  /**
   * Validates that row/column coordinates are within grid bounds.
   * @param {number} row - Row coordinate to validate
   * @param {number} col - Column coordinate to validate
   * @returns {boolean} True if coordinates are valid
   */
  isValidRC (row, col) {
    return (
      row >= 0 &&
      row < this._grid.length &&
      col >= 0 &&
      col < this._grid[row].length
    )
  }

  /**
   * Helper: Filters grid cells by a predicate function.
   * Iterates entire grid and collects cells matching the predicate.
   * @private
   * @param {function(ShipCell): boolean} predicate - Filter function returning true to include cell
   * @returns {ShipCell[]} Array of matching cells
   */
  _filterCells (predicate) {
    const cells = []
    for (const rowCells of this._grid) {
      for (const cell of rowCells) {
        if (cell && predicate(cell)) {
          cells.push(cell)
        }
      }
    }
    return cells
  }

  /**
   * ASCII helper for debugging and display.
   * @returns {AsciiRepresentation}
   */
  get asciiRepresentation () {
    if (!this._ascii) {
      this._ascii = new AsciiRepresentation(this)
    }
    return this._ascii
  }

  /**
   * Returns the ASCII representation of the grid.
   * @returns {string}
   */
  get toAscii () {
    return this.asciiRepresentation.toAsciiWith()
  }

  /**
   * Returns all ship cells belonging to a specific ship.
   * @param {number} shipId - The ship ID to search for
   * @returns {ShipCell[]} Array of cells belonging to the ship
   */
  getCellsByShipId (shipId) {
    return this._filterCells(cell => cell.id === shipId)
  }

  /**
   * Checks whether a 3x3 neighborhood is free of ship cells.
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @param {function(number, number): boolean} boundsChecker - Bounds validation callback
   * @returns {boolean}
   */
  noTouchRC (row, col, boundsChecker) {
    for (let nr = row - 1; nr <= row + 1; nr++) {
      for (let nc = col - 1; nc <= col + 1; nc++) {
        if (boundsChecker(nr, nc) && this.hasRC(nr, nc)) {
          return false
        }
      }
    }
    return true
  }

  noTouch (x, y, boundsChecker) {
    return this.noTouchRC(y, x, boundsChecker)
  }

  /**
   * Returns all cells with ammo available.
   * @returns {ShipCell[]}
   */
  getArmedCells () {
    return this._filterCells(cell => cell?.dataset?.ammo > 0)
  }

  /**
   * Returns armed cells filtered by weapon letter.
   * @param {string} weaponLetter - Weapon letter to filter by
   * @returns {ShipCell[]} Array of cells with matching weapon
   */
  getArmedCellsByWeapon (weaponLetter) {
    return this._filterCells(
      cell => cell?.dataset?.ammo > 0 && cell?.dataset?.wletter === weaponLetter
    )
  }

  /**
   * Iterate over occupied cells.
   * @param {function(ShipCell, number, number): void} callback - Called for each cell with (cell, rowIndex, colIndex)
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
   * Checks whether a 3x3 neighborhood (surrounding cells) is free of ship cells.
   * Used to enforce non-adjacency spacing between ships.
   * @param {number} row - Row coordinate of center cell
   * @param {number} col - Column coordinate of center cell
   * @param {function(number, number): boolean} boundsChecker - Bounds validation callback
   * @returns {boolean} True if all 8 surrounding cells are empty
   */
  isAreaClearAroundRowCol (row, col, boundsChecker) {
    for (let nr = row - 1; nr <= row + 1; nr++) {
      for (let nc = col - 1; nc <= col + 1; nc++) {
        if (boundsChecker(nr, nc) && this.hasShipAtRowCol(nr, nc)) {
          return false
        }
      }
    }
    return true
  }

  /**
   * Checks whether a 3x3 neighborhood (surrounding cells) is free of ship cells.
   * Delegates to RC-based check after coordinate conversion.
   * @param {number} x - Column coordinate of center cell
   * @param {number} y - Row coordinate of center cell
   * @param {function(number, number): boolean} boundsChecker - Bounds validation callback
   * @returns {boolean} True if all 8 surrounding cells are empty
   */
  isAreaClearAround (x, y, boundsChecker) {
    const [row, col] = this._normalizeXYToRC(x, y)
    return this.isAreaClearAroundRowCol(row, col, boundsChecker)
  }

  /**
   * Marks all occupied cells on the provided mask.
   * Synchronizes mask state with current grid occupancy.
   * @param {Mask} mask - Mask object to update
   */
  updateMask (mask) {
    const emptyCellMask = mask.emptyMask
    this.forEachCell((cell, row, col) => {
      emptyCellMask.set(col, row)
    })
  }

  /**
   * Returns the current grid dimensions.
   * @returns {{rows: number, cols: number}} Object with rows and cols properties
   */
  getDimensions () {
    const rows = this._grid.length
    const cols = rows > 0 ? this._grid[0].length : 0
    return { rows, cols }
  }

  /**
   * Serializes the underlying ship cell data to a JSON-compatible format.
   * Deep clone prevents external modifications from affecting grid state.
   * @returns {ShipCellGridData} Serialized 2D grid array
   */
  toJSON () {
    return JSON.parse(JSON.stringify(this._grid))
  }

  /**
   * Restores serialized ship cell state.
   * @param {ShipCellGridData|null} data - Serialized grid data or null for blank state
   */
  fromJSON (data) {
    this._grid = data || bh.map.blankGrid
  }

  /**
   * Helper: Retrieves all valid (empty) placement locations on the grid.
   * Returns locations sorted randomly for each placement attempt.
   * @private
   * @param {number} maxRow - Maximum row boundary for placements
   * @param {number} maxCol - Maximum column boundary for placements
   * @returns {Array<[number, number]>} Shuffled array of [col, row] coordinate pairs
   */
  _getValidPlacementLocations (maxRow, maxCol) {
    const emptyCellIndices = this._maskedGrid.bitsEmpty()
    const candidateLocations = emptyCellIndices
      .map(cellIndex => this._maskedGrid.indexer.location(cellIndex))
      .filter(([col, row]) => row < maxRow && col < maxCol)

    return Random.shuffleArray(candidateLocations)
  }

  /**
   * Helper: Attempts to place a ship at a specific location with given placeables.
   * Tries each placeable variant (orientation/rotation) until one succeeds.
   * Updates grid and mask on successful placement.
   * @private
   * @param {Object} ship - Ship object with placePlacement(), addToGrid() methods
   * @param {Array} placeables - Array of placement variants (different orientations)
   * @param {number} col - Column to attempt placement
   * @param {number} row - Row to attempt placement
   * @returns {ShipCell[]} Array of placed cells on success; null if placement failed
   */
  _tryPlacementVariants (ship, placeables, col, row) {
    const shuffledPlaceables = Random.shuffleArray([...placeables])

    for (const placeable of shuffledPlaceables) {
      const placement = placeable.placeAt(col, row)
      if (!placement.canPlace(this)) {
        continue
      }

      // Placement succeeded: update ship and mask
      ship.placePlacement(placement)
      const displacedCells = placement.displacedArea(
        this._maskedGrid.width,
        this._maskedGrid.height
      )
      this._maskedGrid.joinWith(displacedCells)

      console.log(`displacedArea   ${displacedCells.toAscii}`)
      ship.addToGrid(this)
      console.log(
        `Placed ship ${ship.letter} at \n${this._maskedGrid.toAscii}\ngrid\n${this.toAscii}`
      )

      return ship.cells
    }

    return null
  }

  /**
   * Helper: Attempts to randomly place a single ship on the board.
   * Tries valid locations with different orientations until success or exhaustion.
   * @private
   * @param {Object} ship - Ship object with shape(), placePlacement(), addToGrid() methods
   * @returns {ShipCell[]} Placed cells on success; null if no valid placement found
   * @throws {Error} If ship has no shape available
   */
  _randomPlaceShip (ship) {
    const shipShape = ship.shape()
    if (!shipShape) {
      throw new Error(`No shape available for ship: ${ship.letter}`)
    }

    const shapeMinSize = shipShape.minSize
    const gridMap = bh.map
    const maxRow = gridMap.rows - shapeMinSize + 1
    const maxCol = gridMap.cols - shapeMinSize + 1
    const validLocations = this._getValidPlacementLocations(maxRow, maxCol)
    const placeables = shipShape.placeables()

    for (const [col, row] of validLocations) {
      const placedCells = this._tryPlacementVariants(ship, placeables, col, row)
      if (placedCells) {
        return placedCells
      }
    }

    return null
  }

  /**
   * Synchronizes the internal placement mask to the current ship grid.
   * Reconstructs mask from scratch to ensure consistency after external changes.
   * @private
   */
  _synchronizeMaskToGrid () {
    const emptyCellMask = this._maskedGrid.emptyMask
    this.forEachCell((cell, row, col) => {
      emptyCellMask.set(col, row)
    })
    this._maskedGrid = emptyCellMask
  }

  /**
   * Randomly places ships on the board with event callbacks for monitoring.
   * Resets grid before attempting placement; rolls back if any ship fails.
   * @param {Array} ships - Array of ship objects to place
   * @param {function(ship, cells): void} [onShipPlaced] - Callback when ship placed successfully
   * @param {function(): void} [onPlacementReset] - Callback when placement fails (grid reset)
   * @returns {boolean} True if all ships placed; false if placement failed
   */
  attemptToPlaceShips (ships, onShipPlaced = NOOP, onPlacementReset = NOOP) {
    this.reset()
    const shuffledShips = Random.shuffleArray([...ships])
    for (const ship of shuffledShips) {
      const placedCells = this._randomPlaceShip(ship)
      if (!placedCells) {
        onPlacementReset?.()
        return false
      }
      onShipPlaced?.(ship, placedCells)
    }
    return true
  }
}
