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
 */
export class ShipCellGrid extends GridBase {
  /**
   * Creates a new ship cell grid.
   * @param {ShipCellGridData|null} initialGrid - Optional initial grid state; defaults to blank map grid
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
    this._initializeBlankState()
  }

  /**
   * Ensures the grid and placement mask are initialized.
   */
  ensureInitialized () {
    this._ensureGridInitialized()
    this._ensureMaskInitialized()
  }

  _initializeBlankState () {
    this._grid = bh.map.blankGrid
    this._maskedGrid = bh.map.blankMask
    this.width = this._grid[0]?.length || 0
    this.height = this._grid.length
    this._ascii = null
  }

  _ensureGridInitialized () {
    if (!Array.isArray(this._grid) || !Array.isArray(this._grid[0])) {
      this._grid = bh.map.blankGrid
      this.width = this._grid[0]?.length || 0
      this.height = this._grid.length
    }
  }

  _ensureMaskInitialized () {
    if (!(this._maskedGrid instanceof Mask)) {
      this._maskedGrid = bh.map.blankMask
    }
  }

  /**
   * Returns the ship cell at the given row and column.
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @returns {ShipCell|undefined}
   */
  cellAtRC (row, col) {
    return this._grid[row]?.[col]
  }

  /**
   * Returns the ship cell at the given row and column.
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @returns {number|undefined}
   */
  atRC (row, col) {
    return this.cellAtRC(row, col)?.id || 0
  }

  /**
   * Returns the ship cell at the given x/y coordinates.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {number|undefined}
   */
  at (x, y) {
    return this.atRC(y, x)
  }

  /**
   * Returns the ship cell at the given x/y coordinates.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {ShipCell|undefined}
   */
  cellAt (x, y) {
    return this.cellAtRC(y, x)
  }

  /**
   * Returns true when a ship cell exists at the given row/column.
   * @param {number} row - Row coordinate
   * @param {number} col - Column coordinate
   * @returns {boolean}
   */
  hasRC (row, col) {
    return !!this.atRC(row, col)
  }

  /**
   * Returns true when a ship cell exists at the given x/y coordinates.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {boolean}
   */
  has (x, y) {
    return !!this.cellAt(x, y)
  }

  setCellRC (row, col, cell) {
    if (this.isValidRC(row, col)) {
      this._grid[row][col] = cell
    }
  }

  setCell (x, y, cell) {
    this.setCellRC(y, x, cell)
  }

  setRC (row, col, id) {
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
  }

  isValidRC (row, col) {
    return (
      row >= 0 &&
      row < this._grid.length &&
      col >= 0 &&
      col < this._grid[row].length
    )
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
   * Returns all ship cells belonging to a specific ship.x
   * @param {number} shipId - The ship ID to search for
   * @returns {ShipCell[]}
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
   * Returns armed cells filtered by weapon letter.
   * @param {string} weaponLetter
   * @returns {ShipCell[]}
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
   * Iterate over occupied cells.
   * @param {function(ShipCell, number, number): void} callback
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
   * Marks all occupied cells on the provided mask.
   * @param {Object} mask
   */
  updateMask (mask) {
    const emptyCellMask = mask.emptyMask
    this.forEachCell((cell, row, col) => {
      emptyCellMask.set(col, row)
    })
  }

  /**
   * Returns the current grid size.
   * @returns {{rows:number,cols:number}}
   */
  getDimensions () {
    const rows = this._grid.length
    const cols = rows > 0 ? this._grid[0].length : 0
    return { rows, cols }
  }

  /**
   * Serializes the underlying ship cell data.
   * @returns {ShipCellGridData}
   */
  toJSON () {
    return JSON.parse(JSON.stringify(this._grid))
  }

  /**
   * Restores serialized ship cell state.
   * @param {ShipCellGridData|null} data
   */
  fromJSON (data) {
    this._grid = data || bh.map.blankGrid
  }

  #getValidPlacementLocations (maxRow, maxCol) {
    const emptyCellIndices = this._maskedGrid.bitsEmpty()
    const candidateLocations = emptyCellIndices
      .map(cellIndex => this._maskedGrid.indexer.location(cellIndex))
      .filter(([col, row]) => row < maxRow && col < maxCol)

    return Random.shuffleArray(candidateLocations)
  }

  #attemptPlacementAtLocation (ship, placeables, col, row) {
    const shuffledPlaceables = Random.shuffleArray([...placeables])

    for (const placeable of shuffledPlaceables) {
      const placement = placeable.placeAt(col, row)
      if (placement.canPlace(this)) {
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
    }
    return null
  }

  /**
   * Synchronizes the internal placement mask to the current ship grid.
   */
  updateMaskWithShipCells () {
    const emptyCellMask = this._maskedGrid.emptyMask
    this.forEachCell((cell, row, col) => {
      emptyCellMask.set(col, row)
    })
    this._maskedGrid = emptyCellMask
  }

  /**
   * Randomly places ships on the board with callbacks.
   * @param {Array} ships
   * @param {Function} [onShipPlaced]
   * @param {Function} [onPlacementReset]
   * @returns {boolean}
   */
  attemptToPlaceShips (ships, onShipPlaced = NOOP, onPlacementReset = NOOP) {
    this.reset()
    const shuffledShips = Random.shuffleArray([...ships])
    for (const ship of shuffledShips) {
      const placedCells = this.#randomPlaceShape(ship)
      if (!placedCells) {
        onPlacementReset?.()
        return false
      }
      onShipPlaced?.(ship, placedCells)
    }
    return true
  }

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
