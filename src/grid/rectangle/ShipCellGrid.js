import { Random } from '../../core/Random.js'
import { bh } from '../../terrains/all/js/bh.js'
import { AsciiRepresentation } from '../AsciiRepresentation.js'
import { GridBase } from '../gridBase.js'
import { Mask } from './mask.js'
import { RectangleShape } from './RectangleShape.js'

const NOOP = () => {}
/**
 * Manages a 2D sparse grid of ship cell positions.
 * Encapsulates operations on the grid structure used for tracking occupied cells during placement and combat.
 */
export class ShipCellGrid extends GridBase {
  /**
   * Creates a new ship cell grid.
   * @param {Array<Array>} initialGrid - Optional initial grid state; defaults to blank map grid
   */
  constructor (initialGrid = null) {
    if (
      initialGrid &&
      (!Array.isArray(initialGrid) || !Array.isArray(initialGrid[0]))
    ) {
      throw new Error('Initial grid must be a 2D array')
    }
    let mask
    if (initialGrid) {
      mask = new Mask(initialGrid[0].length, initialGrid.length)
    }

    const grid = initialGrid || bh.map.blankGrid
    mask = mask || bh.map.blankMask

    super(RectangleShape(mask.width, mask.height))

    this._grid = grid
    this._maskedGrid = mask
  }
  xx
  /**
   * Gets the underlying 2D grid array.
   * Used for compatibility with ship.addToGrid() and placement operations.
   *
   * @returns {Array<Array>} The sparse 2D grid of ship cells
   */
  get grid () {
    return this._grid
  }

  get maskedGrid () {
    return this._maskedGrid
  }
  /**
   * Resets the grid to a blank state.
   */
  reset () {
    this._grid = bh.map.blankGrid
    this._maskedGrid = bh.map.blankMask
    this.width = bh.map.width
    this.height = bh.map.height
    this._ascii = null
  }

  /**
   * Initializes or validates the grid is properly set up.
   * Creates a blank grid if the current grid is invalid.
   */
  ensureInitialized () {
    if (!this._grid || !Array.isArray(this._grid)) {
      this._grid = bh.map.blankGrid
    }
    if (!this._maskedGrid || !(this._maskedGrid instanceof Mask)) {
      this._maskedGrid = bh.map.blankMask
    }
  }

  /**
   * Gets the ship cell at the specified coordinates.
   * Returns undefined if no cell exists at that position.
   *
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {Object|undefined} The ship cell object, or undefined if empty
   */
  cellAt (x, y) {
    return this._grid[y]?.[x]
  }
  at (x, y) {
    return this._grid[y]?.[x]?.id
  }

  setCellRC (row, col, cell) {
    if (this.isValidRC(row, col)) {
      this._grid[row][col] = cell
    }
  }
  setRC (row, col, color) {
    if (this.isValidRC(row, col)) {
      if (this._grid[row][col]?.id != null) {
        this._grid[row][col].id = color
        return
      }
      this._grid[row][col] = { id: color, letter: '?' }
    }
  }
  set (x, y, color) {
    this.setRC(y, x, color)
  }
  isValidRC (row, col) {
    return (
      row >= 0 &&
      row < this._grid.length &&
      col >= 0 &&
      col < this._grid[row].length
    )
  }

  setCell (x, y, cell) {
    this.setCellRC(y, x, cell)
  }

  get asciiRepresentation () {
    if (!this._ascii) {
      this._ascii = new AsciiRepresentation(this)
    }
    return this._ascii
  }

  get toAscii () {
    return this.asciiRepresentation.toAsciiWith()
  }

  /**
   * Gets the ship cell at the specified coordinates.
   * Returns undefined if no cell exists at that position.
   *
   * @param {number} row - The row coordinate
   * @param {number} col - The column coordinate
   * @returns {Object|undefined} The ship cell object, or undefined if empty
   */
  atRC (row, col) {
    return this._grid[row]?.[col]
  }
  has (x, y) {
    return !!this.at(x, y)
  }
  hasRC (row, col) {
    return !!this.atRC(row, col)
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
   * Checks if no touching in 3x3 area.
   * @param {number} r - The row.
   * @param {number} c - The column.
   * @param {Function} boundsChecker - The bounds checker function.
   * @returns {boolean} True if no touch.
   */
  noTouchRC (r, c, boundsChecker) {
    for (let nr = r - 1; nr <= r + 1; nr++)
      for (let nc = c - 1; nc <= c + 1; nc++) {
        if (boundsChecker(nr, nc) && this.hasRC(nr, nc)) return false
      }
    return true
  }
  noTouch (x, y, boundsChecker) {
    return this.noTouchRC(y, x, boundsChecker)
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
  /**
   * Calculates valid placement locations for a ship within grid bounds.
   * Filters empty cells and ensures coordinates are within the shape's minimum size constraints.
   *
   * @param {number} maxRow - Maximum valid row index (exclusive)
   * @param {number} maxCol - Maximum valid column index (exclusive)
   * @returns {Array<[number, number]>} Shuffled array of valid [col, row] coordinates
   */
  #getValidPlacementLocations (maxRow, maxCol) {
    const emptyCellIndices = this.maskedGrid.bitsEmpty()
    const candidateLocations = emptyCellIndices
      .map(cellIndex => this.maskedGrid.indexer.location(cellIndex))
      .filter(([col, row]) => row < maxRow && col < maxCol)

    return Random.shuffleArray(candidateLocations)
  }

  /**
   * Attempts to place a ship at a specific location using all available placeables.
   * Tries each placeable orientation and returns cells if placement succeeds.
   *
   * @param {Object} ship - The ship object with placement and grid methods
   * @param {Array<Object>} placeables - Array of placeable orientation objects
   * @param {number} col - Column coordinate for placement attempt
   * @param {number} row - Row coordinate for placement attempt
   * @returns {Array|null} Array of placed ship cells, or null if no placeable succeeds
   */
  #attemptPlacementAtLocation (ship, placeables, col, row) {
    const shuffledPlaceables = Random.shuffleArray([...placeables])

    for (const placeable of shuffledPlaceables) {
      const placement = placeable.placeAt(col, row)

      if (placement.canPlace(this)) {
        // Place the ship and update affected areas
        ship.placePlacement(placement)
        const displacedCells = placement.displacedArea(
          this._maskedGrid.width,
          this._maskedGrid.height
        )
        console.log(`displacedArea   ${displacedCells.toAscii}`)
        this._maskedGrid.join(displacedCells)

        ship.addToGrid(this)

        console.log(
          `Placed ship ${ship.letter} at \n${this._maskedGrid.toAscii}\ngrid\n${this.toAscii}`
        )

        //  this.#updateMaskWithShipCells()

        return ship.cells
      }
    }

    return null
  }
  /**
   * Synchronizes the placement mask with current ship cell positions in the grid.
   * Marks all occupied cells in the mask's empty cell tracker.
   * grid of ship cells (sparse matrix with cell objects)
   * @returns {void}
   */
  updateMaskWithShipCells () {
    const emptyCellMask = this._maskedGrid.emptyMask

    this._grid.forEach((rowCells, rowIndex) => {
      rowCells.forEach((cell, colIndex) => {
        if (cell) {
          emptyCellMask.set(colIndex, rowIndex)
        }
      })
    })
    this._maskedGrid = emptyCellMask
  }
  /**
   * Attempts to place ships randomly on the board.
   * @param {Array} ships - The ships to place.
   * @returns {boolean} True if placement was successful.
   */
  attemptShipPlacement (ships) {
    this.reset()

    const shuffledShips = Random.shuffleArray([...ships])
    for (const ship of shuffledShips) {
      if (!this.#randomPlaceShape(ship)) {
        return false
      }
    }
    return true
  }
  /**
   * Attempts to place ships randomly on the board.
   * @param {Array} ships - Ships to attempt placement for
   * @param {Function} [onShipPlaced] - Callback when ship is placed
   * @param {Function} [onPlacementReset] - Callback when placement is reset
   * @returns {boolean} True if placement was successful
   */
  attemptToPlaceShips (ships, onShipPlaced = NOOP, onPlacementReset = NOOP) {
    this.ensureInitialized()

    for (const ship of ships) {
      const placedCells = this.#randomPlaceShape(ship)
      if (!placedCells) {
        onPlacementReset?.()
        return false
      }
      onShipPlaced?.(ship, placedCells)
    }
    return true
  }

  /**
   * Randomly places a ship shape on the grid with all orientation variations.
   * Attempts placement at shuffled empty locations until a valid orientation is found.
   *
   * @param {Object} ship - The ship to place; must have letter, shape(), placePlacement(), addToGrid(), cells properties
   * @returns {Array|null} Array of successfully placed ship cells, or null if placement impossible
   * @throws {Error} If ship has no valid shape
   */
  #randomPlaceShape (ship) {
    const shipShape = ship.shape()

    if (!shipShape) {
      throw new Error(`No shape available for ship: ${ship.letter}`)
    }

    const shapeMinSize = shipShape.minSize
    const gridMap = bh.map
    const maxRow = gridMap.rows - shapeMinSize + 1
    const maxCol = gridMap.cols - shapeMinSize + 1

    const validLocations = this.#getValidPlacementLocations(maxRow, maxCol)
    const placeables = shipShape.placeables()

    for (const [col, row] of validLocations) {
      const placedCells = this.#attemptPlacementAtLocation(
        ship,
        placeables,
        col,
        row
      )

      if (placedCells) {
        return placedCells
      }
    }

    return null
  }
}
