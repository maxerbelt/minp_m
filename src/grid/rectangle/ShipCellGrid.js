import { Random } from '../../core/Random.js'
import { bh } from '../../terrains/all/js/bh.js'
import { AsciiRepresentation } from '../AsciiRepresentation.js'
import { GridBase } from '../gridBase.js'
import { Mask } from './mask.js'
import { RectangleShape } from './RectangleShape.js'

/**
 * No-op callback for optional event handlers.
 * @type {Function}
 */
const NOOP = () => {}

/**
 * @typedef {Object} ShipCell
 * @property {number} id - Unique ship identifier
 * @property {string} [letter] - Ship letter or label
 * @property {{ammo?: number, wletter?: string}} [dataset] - Optional UI dataset values
 */

/**
 * @typedef {ShipCell|null} ShipCellEntry
 */

/**
 * @typedef {ShipCellEntry[]} ShipCellRow
 */

/**
 * @typedef {ShipCellRow[]} ShipCellGridData
 */

/**
 * @typedef {Object} GridDimensions
 * @property {number} rows - Number of rows
 * @property {number} cols - Number of columns
 */

/**
 * @typedef {Object} Ship
 * @property {string} letter - Ship identifier letter
 * @property {Function} shape - Returns ship shape information
 * @property {Function} placeOnGrid - Places ship cells on grid
 */

/**
 * @typedef {Object} Placement
 * @property {Object} board - Board bitboard representation with overlap() method
 */

/**
 * @typedef {Object} Placeable
 * @property {Function} placeAt - Places ship at given coordinates, returns Placement
 */

/**
 * @typedef {Object} ShapeInfo
 * @property {number} minSize - Minimum bounding box size
 * @property {Function} placeables - Returns array of placement variants
 */

/**
 * @typedef {(cell: ShipCell, rowIndex: number, colIndex: number) => void} CellIteratorCallback
 */

/**
 * @typedef {(cell: ShipCell) => boolean} CellPredicateCallback
 */

/**
 * Manages a 2D sparse ship cell grid with placement mask synchronization
 * and ship placement helpers. Provides methods for querying, setting, and
 * iterating ship cells, as well as random ship placement with conflict detection.
 *
 * The grid maintains both a 2D cell array for direct access and a placement mask
 * (bitboard) for efficient occupancy queries and conflict detection during
 * auto-placement operations.
 *
 * @class ShipCellGrid
 * @extends GridBase
 */
export class ShipCellGrid extends GridBase {
  /**
   * Creates a new ship cell grid with optional initial state.
   *
   * Initializes the grid with either provided state or defaults to the blank
   * map template. Creates a synchronized placement mask for efficient occupancy
   * queries and conflict detection.
   *
   * @param {ShipCellGridData|null} [initialGrid=null] - Optional initial grid state; defaults to blank map grid
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
   *
   * @private
   * @param {number} x - Column coordinate (maps to col)
   * @param {number} y - Row coordinate (maps to row)
   * @returns {[number, number]} [row, col] coordinate pair
   */

  _normalizeXYToRC (x, y) {
    return [y, x]
  }

  /**
   * Underlying ship cell matrix.
   * @returns {ShipCellGridData} 2D array of ship cells
   */
  get grid () {
    return this._grid
  }

  /**
   * Placement mask tracking occupied ship cells.
   *
   * Uses bitboard representation for efficient occupancy queries and
   * overlap detection during ship placement.
   *
   * @returns {Mask} Bitboard mask of occupied cells
   */
  get maskedGrid () {
    return this._maskedGrid
  }

  /**
   * Resets ship cell state back to blank map defaults.
   *
   * Clears all ship placements and restores the grid to initial blank state.
   * Also invalidates the ASCII representation cache.
   *
   * @returns {void}
   */
  reset () {
    this._grid = bh.map.blankGrid
    this._maskedGrid = bh.map.blankMask
    this.width = this._grid[0]?.length || 0
    this.height = this._grid.length
    this._ascii = null
  }

  /**
   * Returns the ship cell at the given row and column coordinates.
   *
   * @param {number} row - Row coordinate (0-indexed from top)
   * @param {number} col - Column coordinate (0-indexed from left)
   * @returns {ShipCell|undefined} Ship cell object or undefined if empty
   */

  cellAtRC (row, col) {
    return this._grid[row]?.[col]
  }

  /**
   * Returns the ship ID at the given row and column coordinates.
   *
   * Returns the ship ID if a cell exists, -1 if the location is masked (occupied),
   * or 0 if the location is empty. This is the internal RC-based implementation.
   *
   * @param {number} row - Row coordinate (0-indexed from top)
   * @param {number} col - Column coordinate (0-indexed from left)
   * @returns {number} Ship ID if occupied, -1 if masked, or 0 if empty
   */
  atRC (row, col) {
    const cell = this.cellAtRC(row, col)?.id
    if (cell) {
      return cell
    }
    return this.maskedGrid.test(col, row) ? -1 : 0
  }

  /**
   * Returns the ship ID at the given x/y coordinates.
   *
   * Delegates to RC-based lookup after coordinate conversion. Returns the ship ID
   * if a cell exists, -1 if masked, or 0 if empty.
   *
   * @param {number} x - Column coordinate (0-indexed from left)
   * @param {number} y - Row coordinate (0-indexed from top)
   * @returns {number} Ship ID if occupied, -1 if masked, or 0 if empty
   */
  at (x, y) {
    return this.atRC(y, x)
  }

  /**
   * Returns the ship cell at the given x/y coordinates.
   *
   * Delegates to RC-based lookup after coordinate conversion.
   *
   * @param {number} x - Column coordinate (0-indexed from left)
   * @param {number} y - Row coordinate (0-indexed from top)
   * @returns {ShipCell|undefined} Ship cell object or undefined if empty
   */
  cellAt (x, y) {
    return this.cellAtRC(y, x)
  }

  /**
   * Returns true when a ship cell exists at the given row/column.
   *
   * Checks if the given RC coordinates contain a ship cell.
   *
   * @param {number} row - Row coordinate (0-indexed from top)
   * @param {number} col - Column coordinate (0-indexed from left)
   * @returns {boolean} True if occupied by a ship cell
   */
  hasRC (row, col) {
    return !!this.atRC(row, col)
  }

  /**
   * Returns true when a ship cell exists at the given x/y coordinates.
   *
   * Delegates to RC-based check after coordinate conversion.
   *
   * @param {number} x - Column coordinate (0-indexed from left)
   * @param {number} y - Row coordinate (0-indexed from top)
   * @returns {boolean} True if occupied by a ship cell
   */
  has (x, y) {
    return !!this.cellAt(x, y)
  }

  /**
   * Sets a ship cell at the given x/y coordinates.
   *
   * Delegates to RC-based setter after coordinate conversion.
   *
   * @param {number} x - Column coordinate (0-indexed from left)
   * @param {number} y - Row coordinate (0-indexed from top)
   * @param {ShipCell} cell - Ship cell object to place
   * @returns {void}
   */
  setCell (x, y, cell) {
    if (!this.isValidRC(y, x)) {
      throw new Error(`Placing Invalid coordinates on shipgrid: (${x}, ${y})`)
    }
    this._grid[y][x] = cell
  }

  /**
   * Sets a ship ID at the given row/column, creating a cell if needed.
   *
   * If a cell already exists at the location, updates its ID. Otherwise,
   * creates a new cell with the given ID and a default letter of '?'.
   *
   * @param {number} row - Row coordinate (0-indexed from top)
   * @param {number} col - Column coordinate (0-indexed from left)
   * @param {number} id - Ship ID to set
   * @returns {void}
   */
  setRC (row, col, id) {
    if (this.isValidRC(row, col)) {
      if (this._grid[row][col]?.id != null) {
        this._grid[row][col].id = id
        return
      }
      this._grid[row][col] = { id, letter: '?' }
    }
  }

  /**
   * Sets a ship ID at the given x/y coordinates.
   *
   * Delegates to RC-based setter after coordinate conversion.
   *
   * @param {number} x - Column coordinate (0-indexed from left)
   * @param {number} y - Row coordinate (0-indexed from top)
   * @param {number} id - Ship ID to set
   * @returns {void}
   */
  set (x, y, id) {
    this.setRC(y, x, id)
  }

  /**
   * Validates that row/column coordinates are within grid bounds.
   *
   * @param {number} row - Row coordinate to validate (0-indexed from top)
   * @param {number} col - Column coordinate to validate (0-indexed from left)
   * @returns {boolean} True if coordinates are within bounds
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
   *
   * Iterates the entire grid and collects all cells (non-null entries)
   * that satisfy the given predicate.
   *
   * @private
   * @param {CellPredicateCallback} predicate - Filter function returning true to include cell
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
   *
   * Lazily creates and caches an ASCII representation of the grid.
   *
   * @returns {AsciiRepresentation} ASCII representation instance
   */
  get asciiRepresentation () {
    if (!this._ascii) {
      this._ascii = new AsciiRepresentation(this)
    }
    return this._ascii
  }

  /**
   * Returns the ASCII representation of the grid as a string.
   *
   * @returns {string} ASCII grid visualization
   */
  get toAscii () {
    return this.asciiRepresentation.toAsciiWith()
  }

  /**
   * Returns all ship cells belonging to a specific ship.
   *
   * Filters all grid cells to find those matching the given ship ID.
   *
   * @param {number} shipId - The ship ID to search for
   * @returns {ShipCell[]} Array of cells belonging to the ship
   */
  getCellsByShipId (shipId) {
    return this._filterCells(cell => cell.id === shipId)
  }

  /**
   * Checks whether a 3x3 neighborhood around x/y is free of ship cells.
   *
   * Delegates to RC-based check after coordinate conversion.
   *
   * @param {number} x - Column coordinate (0-indexed from left)
   * @param {number} y - Row coordinate (0-indexed from top)
   * @param {(row: number, col: number) => boolean} boundsChecker - Bounds validation callback
   * @returns {boolean} True if all 8 surrounding cells are empty
   */
  isAreaClearAroundXY (x, y, boundsChecker) {
    return this.isAreaClearAroundRowCol(y, x, boundsChecker)
  }

  /**
   * Checks whether a 3x3 neighborhood (surrounding cells) is free of ship cells.
   *
   * Used to enforce non-adjacency spacing between ships. Checks all 8 neighbors
   * (including diagonals) around the center cell using the provided bounds checker.
   *
   * @param {number} row - Row coordinate of center cell (0-indexed from top)
   * @param {number} col - Column coordinate of center cell (0-indexed from left)
   * @param {(row: number, col: number) => boolean} _boundsChecker - Bounds validation callback
   * @returns {boolean} True if all 8 surrounding cells are empty
   */
  isAreaClearAroundRowCol (row, col, _boundsChecker) {
    return !this.hasRC(row, col)
  }

  /**
   * Checks whether a 3x3 neighborhood around x/y is free of ship cells.
   *
   * Delegates to RC-based check after coordinate conversion. Checks all 8 neighbors
   * including diagonals around the center cell.
   *
   * @param {number} x - Column coordinate of center cell (0-indexed from left)
   * @param {number} y - Row coordinate of center cell (0-indexed from top)
   * @param {(row: number, col: number) => boolean} boundsChecker - Bounds validation callback
   * @returns {boolean} True if all 8 surrounding cells are empty
   */
  isAreaClearAround (x, y, boundsChecker) {
    const [row, col] = this._normalizeXYToRC(x, y)
    return this.isAreaClearAroundRowCol(row, col, boundsChecker)
  }

  /**
   * Returns all cells with ammo available.
   *
   * Filters all grid cells to find those with ammo > 0.
   *
   * @returns {ShipCell[]} Array of cells with ammo
   */
  getArmedCells () {
    return this._filterCells(cell => cell?.dataset?.ammo > 0)
  }

  /**
   * Returns armed cells filtered by weapon letter.
   *
   * Filters all grid cells to find those with ammo > 0 and matching weapon letter.
   *
   * @param {string} weaponLetter - Weapon letter to filter by
   * @returns {ShipCell[]} Array of cells with matching weapon and ammo
   */
  getArmedCellsByWeapon (weaponLetter) {
    return this._filterCells(
      cell => cell?.dataset?.ammo > 0 && cell?.dataset?.wletter === weaponLetter
    )
  }

  /**
   * Iterate over occupied cells.
   *
   * Calls the provided callback for each non-null cell in the grid.
   *
   * @param {CellIteratorCallback} callback - Called for each cell with (cell, rowIndex, colIndex)
   * @returns {void}
   */
  forEachCell (callback) {
    this._grid.forEach((rowCells, rowIndex) => {
      rowCells.forEach((_cell, colIndex) => {
        if (_cell) {
          callback(_cell, rowIndex, colIndex)
        }
      })
    })
  }

  /**
   * Marks all occupied cells on the provided mask.
   *
   * Synchronizes mask state with current grid occupancy. Iterates all cells
   * and marks their positions on the provided mask.
   *
   * @param {Mask} mask - Mask object to update
   * @returns {void}
   */
  updateMask (mask) {
    const emptyCellMask = mask.emptyMask
    this.forEachCell((_cell, row, col) => {
      emptyCellMask.set(col, row)
    })
  }

  /**
   * Returns the current grid dimensions.
   *
   * @returns {GridDimensions} Object with rows and cols properties
   */
  getDimensions () {
    const rows = this._grid.length
    const cols = rows > 0 ? this._grid[0].length : 0
    return { rows, cols }
  }

  /**
   * Serializes the underlying ship cell data to a JSON-compatible format.
   *
   * Deep clone prevents external modifications from affecting grid state.
   *
   * @returns {ShipCellGridData} Serialized 2D grid array
   */
  toJSON () {
    return structuredClone(this._grid)
  }

  /**
   * Restores serialized ship cell state.
   *
   * @param {ShipCellGridData|null} data - Serialized grid data or null for blank state
   * @returns {void}
   */
  fromJSON (data) {
    this._grid = data || bh.map.blankGrid
  }

  /**
   * Helper: Retrieves all valid (empty) placement locations on the grid.
   *
   * Returns locations sorted randomly for each placement attempt. Filters
   * bitboard indices to find empty cells within the specified bounds.
   *
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

    return Random.shuffleArray([...candidateLocations])
  }

  /**
   * Helper: Attempts to place a ship at a specific location with given placeables.
   *
   * Tries each placeable variant (orientation/rotation) until one succeeds.
   * Updates grid and mask on successful placement. Returns placed cells or null
   * if no variant fits at the location.
   *
   * @private
   * @param {Ship} ship - Ship object with placeOnGrid() method
   * @param {Placeable[]} placeables - Array of placement variants (different orientations)
   * @param {number} x - Column to attempt placement (0-indexed from left)
   * @param {number} y - Row to attempt placement (0-indexed from top)
   * @returns {ShipCell[]|null} Array of placed cells on success; null if placement failed
   */
  _tryPlacementVariants (ship, placeables, x, y) {
    const shuffledPlaceables = Random.shuffleArray([...placeables])

    for (const placeable of shuffledPlaceables) {
      const placement = placeable.placeAt(x, y)
      const conflict = placement.board.overlap(this.maskedGrid)
      if (conflict.occupancy > 0) {
        continue
      }

      const cells = ship.placeOnGrid(this, placement)
      //  console.log(`joined grid:\n`, this.toAscii)
      if (cells) {
        return cells
      }
    }

    return null
  }

  /**
   * Helper: Attempts to randomly place a single ship on the board.
   *
   * Tries valid locations with different orientations until success or exhaustion.
   * Returns placed cells on success, or null if no valid placement found.
   *
   * @private
   * @param {Ship} ship - Ship object with shape() method that returns ShapeInfo
   * @returns {ShipCell[]|null} Placed cells on success; null if no valid placement found
   * @throws {Error} If ship has no shape available
   */
  _randomPlaceShip (ship) {
    const shipShape = ship.shape()
    if (!shipShape) {
      throw new Error(`No shape available for ship: ${ship.letter}`)
    }

    const shapeMinSize = shipShape.minSize
    const gridMap = bh.map
    const maxY = gridMap.rows - shapeMinSize + 1
    const maxX = gridMap.cols - shapeMinSize + 1
    const validLocations = this._getValidPlacementLocations(maxY, maxX)
    const placeables = shipShape.placeables()

    for (const [x, y] of validLocations) {
      if (x >= maxX || y >= maxY) {
        console.warn(
          `Skipping invalid placement location (${x}, ${y}) for ship ${ship.letter}`
        )
        continue
      }
      const placedCells = this._tryPlacementVariants(ship, placeables, x, y)
      if (placedCells) {
        return placedCells
      }
    }
    return null
  }

  /**
   * Randomly places ships on the board with event callbacks for monitoring.
   *
   * Resets grid before attempting placement; rolls back if any ship fails.
   * Attempts placement in random order for variety. On success, calls the
   * onShipPlaced callback for each successfully placed ship.
   *
   * @param {Ship[]} ships - Array of ship objects to place
   * @param {(ship: Ship, cells: ShipCell[]) => void} [onShipPlaced] - Callback when ship placed successfully
   * @returns {boolean} True if all ships placed; false if placement failed
   */
  attemptToPlaceShips (ships, onShipPlaced = NOOP) {
    this.reset()
    const shuffledShips = Random.shuffleArray([...ships])

    for (const ship of shuffledShips) {
      const placedCells = this._randomPlaceShip(ship)
      if (!placedCells) {
        return false
      }
      onShipPlaced?.(ship, placedCells)
    }
    return true
  }
}
