import { bh } from '../terrains/all/js/bh.js'
import { Terrain } from '../terrains/all/js/terrain.js'
import { ScoreUI } from './ScoreUI.js'
import {
  coordsFromCell,
  makeKey,
  parsePair,
  setCellCoords
} from '../core/utilities.js'
import { LoadOut } from './LoadOut.js'
import { gameStatus } from './StatusUI.js'
import { Delay } from '../core/Delay.js'
import { CellClassManager } from './helpers/CellClassManager.js'
import { BoardConfigurator } from './helpers/BoardConfigurator.js'
import { SurroundingCellsHelper } from './helpers/SurroundingCellsHelper.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'

export const gameHost = {
  containerWidth: 574
}
const startCharCode = 65

const DEFAULT_CELL_CLEAN_CLASSES = [
  'semi',
  'semi-miss',
  'wake',
  'weapon',
  'portal',
  'marker',
  'turn2',
  'turn3',
  'turn4',
  'empty',
  'active'
]

/**
 * Retrieves all child elements from a board element.
 * @param {HTMLElement|null} board - The board element
 * @returns {HTMLCollection} Child elements or empty collection
 * @private
 */
const getBoardChildren = board => board?.children || []

/**
 * Configuration mapping ship types to tray element IDs.
 * Maps unit types to their corresponding UI tray containers.
 * @type {Object<string, string>}
 * @private
 */
const TRAY_TYPE_MAP = {
  A: 'planeTray',
  S: 'shipTray',
  X: 'specialTray',
  G: 'buildingTray',
  W: 'weaponTray'
}

/**
 * Configuration mapping ship types to notes element IDs.
 * Maps unit types to their information/notes containers.
 * @type {Object<string, string>}
 * @private
 */
const NOTES_TYPE_MAP = {
  A: 'planeNotes',
  S: 'shipNotes',
  M: 'specialNotes',
  T: 'specialNotes',
  X: 'specialNotes',
  G: 'buildingNotes',
  W: 'weaponNotes'
}

/**
 * Manages game board UI state and rendering for a player's waters/territory.
 * Responsibilities:
 * - Render grid cells with proper terrain and edge coloring
 * - Handle ship display and weapon positioning
 * - Manage battle state visualization (hits, misses, sunk ships)
 * - Coordinate cell clearing and highlighting
 * - Manage board size calculations for different display modes
 * - Support ship placement and weapon targeting UI
 *
 * Design: Stateful utility class tracking board state, size calculations,
 * and player territory context. Delegates specialized tasks to helper classes.
 *
 * @class WatersUI
 */
export class WatersUI {
  /**
   * Initializes the UI manager for a player's territory.
   *
   * @param {string} territory - Territory identifier (e.g., 'friend', 'enemy')
   * @param {string} title - Display title for this territory's board
   */
  constructor (territory, title) {
    this.board = document.getElementById(territory + '-board')
    this.score = new ScoreUI(territory)
    this.territory = territory
    this.territoryTitle = title
    this.placingShips = false
    this.containerWidth = gameHost.containerWidth
    this.isPrinting = false
    this.showShips = false
  }

  /**
   * Removes specified CSS classes from a cell element.
   * No-op if classNames array is empty to avoid unnecessary DOM updates.
   *
   * @param {HTMLElement} cell - DOM element to remove classes from
   * @param {string[]} classNames - Array of class names to remove
   * @returns {void}
   * @private
   */
  _removeClassesFromCell (cell, classNames) {
    if (classNames.length) {
      cell.classList.remove(...classNames)
    }
  }

  /**
   * Adds specified CSS classes to a cell element.
   * No-op if classNames array is empty to avoid unnecessary DOM updates.
   *
   * @param {HTMLElement} cell - DOM element to add classes to
   * @param {string[]} classNames - Array of class names to add
   * @returns {void}
   * @private
   */
  _addClassesToCell (cell, classNames) {
    if (classNames.length) {
      cell.classList.add(...classNames)
    }
  }

  /**
   * Clears text content from a cell element.
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @returns {void}
   * @private
   */
  _clearCellText (cell) {
    cell.textContent = ''
  }

  /**
   * Iterates over all cells in the board, calling callback for each.
   * Provides functional interface to board cell enumeration.
   *
   * @param {Function} callback - Function to call for each cell
   * @param {HTMLElement} callback.cell - The board cell element
   * @returns {void}
   * @private
   */
  _forEachBoardCell (callback) {
    for (const cell of getBoardChildren(this.board)) {
      callback(cell)
    }
  }

  /**
   * Iterates over grid coordinates, calling callback for each cell position.
   * Provides functional interface to grid enumeration for board construction.
   *
   * @param {number} rows - Number of rows in grid
   * @param {number} cols - Number of columns in grid
   * @param {Function} callback - Function to call for each coordinate
   * @param {number} callback.row - Current row index
   * @param {number} callback.column - Current column index
   * @returns {void}
   * @private
   */
  _buildGrid (rows, cols, callback) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        callback(r, c)
      }
    }
  }

  /**
   * Set the board title text.
   * @param {string} name
   */
  showTitle (name) {
    const titleEl = document.getElementById(this.territory + '-title')
    titleEl.textContent = this.territoryTitle + ' ' + name
  }

  /**
   * Set the board title text to the current map heading.
   * @returns {void}
   */
  showMapTitle () {
    this.showTitle(bh.mapHeading)
  }

  /**
   * Set the board title text to the current fleet heading.
   * @returns {void}
   */
  showFleetTitle () {
    this.showTitle(bh.fleetHeading)
  }

  /**
   * Calculates cell size in pixels for screen display based on map dimensions.
   * Divides container width evenly across map columns.
   *
   * @param {Object} [map] - Map configuration object with cols property
   * @param {number} map.cols - Number of columns in map
   * @returns {number} Cell size in pixels
   * @private
   */
  _calculateCellSizeScreen (map) {
    map = map || bh.map
    return this.containerWidth / (map?.cols || 18)
  }

  /**
   * Calculates cell size in pixels for list display (fixed narrow column).
   * Uses fixed 22-column layout for ship/unit list displays.
   *
   * @returns {number} Cell size in pixels
   * @private
   */
  _calculateCellSizeList () {
    return this.containerWidth / 22
  }

  /**
   * Calculates cell size in pixels for print display.
   * Uses fixed 600px width divided across map columns plus borders.
   *
   * @param {Object} [map] - Map configuration object with cols property
   * @param {number} map.cols - Number of columns in map
   * @returns {number} Cell size in pixels
   * @private
   */
  _calculateCellSizePrint (map) {
    map = map || bh.map
    return 600 / (map.cols + 1)
  }

  /**
   * Returns the CSS unit suffix for cell sizes.
   *
   * @returns {string} CSS unit (always 'px')
   * @private
   */
  _getCellSizeUnit () {
    return 'px'
  }

  /**
   * Calculates appropriate cell size based on current display mode.
   * Delegates to print or screen calculation based on isPrinting state.
   *
   * @param {Object} [map] - Map configuration (optional, uses current map if not provided)
   * @returns {number} Cell size in pixels
   */
  cellSize (map) {
    return this.isPrinting
      ? this._calculateCellSizePrint(map)
      : this._calculateCellSizeScreen(map)
  }

  /**
   * Formats a cell size value as a CSS size string (value + unit).
   *
   * @param {number} value - Numeric size value
   * @returns {string} CSS size string (e.g., '35px')
   * @private
   */
  _formatCellSizeValue (value) {
    return `${value}${this._getCellSizeUnit()}`
  }

  /**
   * Gets current cell size as CSS-formatted string for screen display.
   *
   * @returns {string} CSS size string (e.g., '35px')
   */
  cellSizeString () {
    return this._formatCellSizeValue(this.cellSize())
  }

  /**
   * Gets current cell size as CSS-formatted string for list display.
   *
   * @returns {string} CSS size string (e.g., '26px')
   */
  cellSizeStringList () {
    return this._formatCellSizeValue(this._calculateCellSizeList())
  }

  /**
   * Gets current cell size as CSS-formatted string for print display.
   *
   * @returns {string} CSS size string (e.g., '30px')
   */
  cellSizeStringPrint () {
    return this._formatCellSizeValue(this._calculateCellSizePrint())
  }

  /**
   * @deprecated Use cellSizeScreen instead (not used in new code)
   * @param {Object} [map] - Map configuration
   * @returns {number} Cell size for screen
   */
  cellSizeScreen (map) {
    return this._calculateCellSizeScreen(map)
  }

  /**
   * @deprecated Use cellSizeStringList instead (maintained for backward compatibility)
   * @returns {number} Cell size for list display
   */
  cellSizeList () {
    return this._calculateCellSizeList()
  }

  /**
   * @deprecated Use cellSizeStringPrint instead (maintained for backward compatibility)
   * @param {Object} [map] - Map configuration
   * @returns {number} Cell size for print
   */
  cellSizePrint (map) {
    return this._calculateCellSizePrint(map)
  }

  /**
   * @deprecated Use _getCellSizeUnit instead (internal use only)
   * @returns {string} CSS unit
   */
  cellUnit () {
    return this._getCellSizeUnit()
  }

  /**
   * @deprecated Use _formatCellSizeValue instead (internal use only)
   * @param {number} value - Size value to format
   * @returns {string} Formatted CSS size string
   */
  formatCellSize (value) {
    return this._formatCellSizeValue(value)
  }

  /**
   * Calculates linear index from 2D grid coordinates.
   * Index = row * columnCount + column (standard row-major ordering).
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {number} Linear array index in flattened grid
   * @private
   */
  _gridIndex (row, column) {
    return row * bh.map.cols + column
  }

  /**
   * Retrieves grid cell element at coordinates without validation.
   * Returns null if cell not found (safer for defensive programming).
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {HTMLElement|null} Cell element or null if not found
   */
  gridCellRawAt (row, column) {
    return this.board?.children?.[this._gridIndex(row, column)] || null
  }

  /**
   * Retrieves grid cell element at coordinates with validation.
   * Throws error if cell not found to catch coordinate errors early.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {HTMLElement} Cell element (guaranteed valid)
   * @throws {Error} If cell at coordinates is invalid or missing
   */
  gridCellAt (row, column) {
    const result = this.gridCellRawAt(row, column)
    if (result?.classList) return result
    throw new Error(
      `Invalid cell at ${row},${column}: ${JSON.stringify(result)}`
    )
  }

  /**
   * Generator yielding cell elements for each coordinate in iterable.
   * Provides lazy evaluation of coordinate-to-cell mapping.
   *
   * @param {Iterable<[number, number]>} coords - Iterable of [row, col] coordinate pairs
   * @yields {HTMLElement} Cell element for each coordinate
   * @private
   */
  *gridCellsForCoords (coords) {
    for (const [row, column] of coords) {
      yield this.gridCellAt(row, column)
    }
  }

  /**
   * Generator yielding tuples of [cell, row, column, power] for coordinates.
   * Enriches coordinate data with cell reference for efficient processing.
   *
   * @param {Iterable<[number, number, any]>} coords - Iterable of [row, col, power] tuples
   * @yields {[HTMLElement, number, number, any]} Tuple of cell element with coordinates and power
   * @private
   */
  *cellsAndCoords (coords) {
    for (const [row, column, power] of coords) {
      yield [this.gridCellAt(row, column), row, column, power]
    }
  }

  /**
   * @param {Array<[HTMLElement, number, number, any]>} cells
   * @param {function(HTMLElement, any): Promise<void>} effect
   * @param {number} [mindelay=380]
   * @param {number} [maxdelay=730]
   * @returns {Promise<PromiseSettledResult<void>[]>}
   */
  async delayAsyncEffects (cells, effect, mindelay = 380, maxdelay = 730) {
    const promises = cells.map(([cell, , , power]) =>
      this.delayAsyncEffect(cell, effect, mindelay, maxdelay, power)
    )
    return await Promise.allSettled(promises)
  }

  /**
   * @param {HTMLElement} cell
   * @param {function(HTMLElement, any): Promise<void>} effect
   * @param {number} [mindelay=380]
   * @param {number} [maxdelay=730]
   * @param {any} [power=null]
   */
  async delayAsyncEffect (
    cell,
    effect,
    mindelay = 380,
    maxdelay = 730,
    power = null
  ) {
    await Delay.randomWait(mindelay, maxdelay)
    await effect(cell, power)
  }

  /**
   * @param {Object} ship
   * @param {number} r
   * @param {number} c
   */
  surroundShipCellAt (ship, r, c) {
    const cell = this.gridCellAt(r, c)
    ShipCellDisplayer.displaySurroundAttributes(cell, ship, r, c)
  }

  /**
   * Resets all ships to initial state and reveals them on the board.
   * Used when starting a new game or round.
   *
   * @param {Object[]} ships - Array of ship objects to reset
   * @returns {void}
   */
  resetShips (ships) {
    for (const ship of ships) {
      ship.reset()
      this.revealShip(ship)
    }
  }

  /**
   * Reveals multiple ships on the board without resetting them.
   * Useful for showing previously hidden ships.
   *
   * @param {Object[]} ships - Array of ship objects to reveal
   * @returns {void}
   */
  revealShips (ships) {
    for (const ship of ships) {
      this.revealShip(ship)
    }
  }

  /**
   * Displays a single ship on the board in fog-of-war state.
   * Shows ship letter or weapon indicator based on cell content.
   *
   * @param {Object} ship - Ship object with cells property (iterable of [col, row])
   * @returns {void}
   */
  revealShip (ship) {
    const colorMaps = bh.maps
    for (const [column, row] of ship.cells) {
      const cell = this.gridCellAt(row, column)
      ShipCellDisplayer.displayAsRevealed(cell, ship, colorMaps)
    }
  }

  /**
   * Generic method to clear cell visuals using custom clearing strategy.
   * Delegates class clearing to provided function for context-specific behavior.
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @param {'none'|'content'|'all'} details - What to clear:
   *   'none' = only call classClear, 'content' = text only, 'all' = text and style
   * @param {Function} [classClear] - Function to clear cell classes (defaults to clearCell)
   * @returns {void}
   * @private
   */
  clearCellVisuals (cell, details, classClear) {
    const clear = classClear || this.clearCell.bind(this)
    ShipCellDisplayer.clearDetails(cell, details)
    clear(cell)
  }

  /**
   * Marks a friendly cell as sunk.
   * Displays sunk marker and clears hit-related state.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {string} [_letter] - Ship letter (unused, kept for API compatibility)
   * @returns {void}
   */
  displayAsSunk (cell, _letter) {
    CellClassManager.applyFriendlySunkCellState(cell)
    this._clearCellText(cell)
  }

  /**
   * Clears all cell classes from every cell in the board.
   * Returns board to base state (only terrain coloring remains).
   *
   * @returns {void}
   */
  clearClasses () {
    this._forEachBoardCell(cell => CellClassManager.clearCell(cell))
  }

  /**
   * Applies hit state to a cell with optional damage indicator.
   * Called after hit animation completes to show permanent damage.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {string} [damageType] - Damage class to add (e.g., 'skull', 'burnt')
   * @returns {void}
   * @private
   */
  _applyHitCellState (cell, damageType) {
    CellClassManager.applyFriendlyHitCellState(cell, damageType)
    this._clearCellText(cell)
  }

  /**
   * Marks a cell as sunk at specified coordinates.
   * Delegates to displayAsSunk for consistent sunk state handling.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {string} letter - Ship letter (for identification)
   * @returns {void}
   */
  cellSunkAt (row, column, letter) {
    const cell = this.gridCellAt(row, column)
    this.displayAsSunk(cell, letter)
  }

  /**
   * Marks a cell as hit at specified coordinates.
   * Applied when enemy successfully targets a location.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {string} [damageType] - Damage indicator class (e.g., 'skull')
   * @returns {void}
   */
  cellHit (row, column, damageType) {
    const cell = this.gridCellAt(row, column)
    CellClassManager.applyEnemyHitCellState(cell, damageType)
    this._clearCellText(cell)
  }

  /**
   * Reveals a cell with semi-visibility indicator.
   * Semi means cell is revealed but not confirmed as hit or miss yet.
   * Returns result code for game logic based on cell state.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {number} Result code: LoadOut.noResult if already revealed, LoadOut.missResult otherwise
   */
  cellSemiReveal (row, column) {
    const cell = this.gridCellAt(row, column)

    if (!CellClassManager.applySemiRevealState(cell)) {
      return LoadOut.noResult
    }
    this._clearCellText(cell)
    return LoadOut.missResult
  }

  /**
   * Applies hint indicator to a cell showing potential targets.
   * Used to show aiming assistance or weapon spread hints.
   * Deactivates other hints to ensure only current hint is visible.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {void}
   */
  cellHintReveal (row, column) {
    const cell = this.gridCellAt(row, column)

    if (!CellClassManager.applyHintState(cell)) {
      return
    }
    this.deactivateTempHints()
    this._clearCellText(cell)
  }

  /**
   * Adds visual contrast to a cell.
   * Override in subclasses for territory-specific behavior.
   * Default implementation does nothing (for friendly board).
   *
   * @param {HTMLElement} _cell - DOM element to update
   * @returns {void}
   * @protected
   */
  addContrast (_cell) {
    /* only needs implementation if enemy */
  }

  /**
   * Removes shadow weapon indicator from a cell.
   * Override in subclasses for territory-specific behavior.
   * Default implementation does nothing (for friendly board).
   *
   * @param {HTMLElement} _cell - DOM element to update
   * @returns {void}
   * @protected
   */
  removeShadowWeapon (_cell) {
    /* only needs implementation if enemy */
  }

  /**
   * Marks a cell as having an active weapon with specific rotation.
   * Displays weapon indicator and applies rotation/cursor classes.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {string} rotationClass - Rotation indicator class (e.g., 'turn2')
   * @param {string} [extraClass] - Additional class to apply (optional)
   * @returns {void}
   */
  cellWeaponActive (row, column, rotationClass, extraClass) {
    const cell = this.gridCellAt(row, column)
    cell.classList.add('weapon', 'active')
    this.addContrast(cell)

    if (extraClass) {
      cell.classList.add(extraClass)
    }
    if (rotationClass) cell.classList.add(rotationClass)
    cell.classList.remove('wake')
    this._clearCellText(cell)
  }

  /**
   * Deactivates weapon display on a cell.
   * Removes weapon and rotation indicators.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {void}
   */
  cellWeaponDeactivate (row, column) {
    const cell = this.gridCellAt(row, column)
    this.removeShadowWeapon(cell)
    deactivateWeapon(cell)
  }

  /**
   * Deactivates temporary hint display on a cell.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {void}
   */
  cellHintDeactivate (row, column) {
    const cell = this.gridCellAt(row, column)
    deactivateTempHint(cell)
  }

  /**
   * Marks a cell as a miss (no ship hit).
   * Skips if cell already has a ship placed to protect ships.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {string} [damageType] - Optional damage indicator class
   * @returns {void}
   */
  cellMiss (row, column, damageType) {
    const cell = this.gridCellAt(row, column)

    if (cell.classList.contains('placed')) return
    cell.classList.add('miss')
    if (damageType) {
      cell.classList.add(damageType)
    }
    cell.classList.remove('wake')
  }

  /**
   * Adds surrounding cell keys to a set container.
   * Retrieves all neighbors of specified cell and adds their keys.
   *
   * @param {Object} [map] - Map configuration (defaults to current map)
   * @param {number} row - Row coordinate of center cell
   * @param {number} column - Column coordinate of center cell
   * @param {Set<string>} container - Set to accumulate surrounding cell keys
   * @returns {void}
   */
  surround (map, row, column, container) {
    const keys = SurroundingCellsHelper.asKeySet(map || bh.map, row, column)
    keys.forEach(key => container.add(key))
  }

  /**
   * Adds surrounding cells as object mappings to container.
   * Retrieves neighbors and applies maker function to each coordinate.
   *
   * @param {Object} [map] - Map configuration (defaults to current map)
   * @param {number} row - Row coordinate of center cell
   * @param {number} column - Column coordinate of center cell
   * @param {Object} container - Object to accumulate surrounding cell mappings
   * @param {Function} maker - Callback to transform [row, col] → HTMLElement
   * @returns {void}
   */
  surroundObj (map, row, column, container, maker) {
    const obj = SurroundingCellsHelper.asObjectMap(
      map || bh.map,
      row,
      column,
      maker
    )
    Object.assign(container, obj)
  }

  /**
   * Adds surrounding cells to array container.
   * Retrieves neighbors and applies maker function to each coordinate.
   *
   * @param {Object} [map] - Map configuration (defaults to current map)
   * @param {number} row - Row coordinate of center cell
   * @param {number} column - Column coordinate of center cell
   * @param {Array} container - Array to accumulate surrounding cell elements
   * @param {Function} maker - Callback to transform [row, col] → any value
   * @returns {void}
   */
  surroundList (map, row, column, container, maker) {
    const list = SurroundingCellsHelper.asArray(
      map || bh.map,
      row,
      column,
      maker
    )
    container.push(...list)
  }

  /**
   * Converts coordinate pairs to set of cell keys.
   * Keys are formatted as 'col-row' for keyed lookups.
   *
   * @param {Iterable<[number, number]>} cells - Iterable of [row, col] coordinate pairs
   * @returns {Set<string>} Set of cell keys
   * @private
   */
  cellSet (cells) {
    const result = new Set()
    for (const [row, column] of cells) {
      result.add(makeKey(column, row))
    }
    return result
  }

  /**
   * Calculates hollow set (outer ring without interior).
   * Returns surrounding cells minus original cells.
   * Useful for area-of-effect calculations.
   *
   * @param {Iterable<[number, number]>} cells - Iterable of [row, col] coordinate pairs
   * @returns {Set<string>} Set of hollow cells (surrounding but not original)
   * @private
   */
  hollowCells (cells) {
    const surround = this.surroundCells(cells)
    const original = this.cellSet(cells)
    return surround.difference(original)
  }

  /**
   * Calculates all cells surrounding given cells (flood fill perimeter).
   * Includes diagonal neighbors.
   *
   * @param {Iterable<[number, number]>} cells - Iterable of [row, col] coordinate pairs
   * @returns {Set<string>} Set of surrounding cell keys
   * @private
   */
  surroundCells (cells) {
    const map = bh.map
    const surroundings = new Set()
    for (const [column, row] of cells) {
      this.surround(map, row, column, surroundings)
    }
    return surroundings
  }

  /**
   * Gets surrounding cell DOM elements for given cell elements.
   * Retrieves neighbor cells and returns as flat array.
   *
   * @param {Iterable<HTMLElement>} cells - Iterable of DOM cell elements
   * @param {Object} [container] - Optional container object to accumulate results
   * @returns {HTMLElement[]} Array of surrounding cell elements
   * @private
   */
  surroundCellElement (cells, container) {
    const map = bh.map
    const surroundings = container || {}
    for (const cell of cells) {
      const [row, column] = coordsFromCell(cell)
      this.surroundObj(
        map,
        row,
        column,
        surroundings,
        this.gridCellAt.bind(this)
      )
    }
    return Object.values(surroundings)
  }

  /**
   * Displays surrounding cells with miss indicator and center cells with display function.
   * Used for area-of-effect visualization (e.g., weapon splash).
   *
   * @param {Iterable<[number, number]>} cells - Iterable of [row, col] coordinate pairs
   * @param {Object} ship - Ship object for center cell display
   * @param {Function} cellMiss - Callback to mark surrounding cells as miss: (row, col) => void
   * @param {Function} [display] - Optional callback to display center cells: (row, col, ship) => void
   * @returns {void}
   */
  displaySurround (cells, ship, cellMiss, display) {
    const surround = this.hollowCells(cells)
    const surroundings = [...surround].map(p => parsePair(p))
    for (const [row, column] of surroundings) {
      cellMiss(row, column)
    }
    if (display) {
      for (const [row, column] of cells) {
        display(row, column, ship)
      }
    }
  }

  /**
   * Resets board CSS dimensions for screen display.
   * Delegates to BoardConfigurator for DOM manipulation.
   *
   * @param {Object} map - Map configuration with rows/cols
   * @param {string} cellSize - CSS size string (e.g., '35px')
   * @returns {void}
   */
  resetBoardSize (map, cellSize) {
    BoardConfigurator.resetBoardSize(this.board, map, cellSize)
  }

  /**
   * Resets board CSS dimensions for print display.
   * Delegates to BoardConfigurator for DOM manipulation.
   *
   * @param {Object} map - Map configuration with rows/cols
   * @returns {void}
   */
  resetBoardSizePrint (map) {
    BoardConfigurator.resetBoardSizePrint(this.board, map)
  }

  /**
   * Applies terrain coloring to cell at coordinates.
   * Convenience wrapper over colorizeCell using cell lookup.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {void}
   */
  colorize (row, column) {
    this.colorizeCell(this.gridCellRawAt(row, column), row, column)
  }

  /**
   * Removes and reapplies terrain coloring to cell at coordinates.
   * Used when terrain has changed and colors need refresh.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {void}
   */
  recolor (row, column) {
    this.recolorCell(this.gridCellRawAt(row, column), row, column)
  }

  /**
   * Refreshes terrain coloring for all board cells.
   * Called when terrain configuration has changed.
   *
   * @returns {void}
   */
  refreshAllColor () {
    this._forEachBoardCell(el => this.refreshColor(el))
  }

  /**
   * Removes and reapplies terrain coloring for a single cell.
   * Extracts coordinates from cell dataset and recolorizes.
   *
   * @param {HTMLElement} cell - DOM element to refresh
   * @returns {void}
   */
  refreshColor (cell) {
    const row = Number.parseInt(cell.dataset.r)
    const column = Number.parseInt(cell.dataset.c)
    this.uncolorCell(cell)
    this.colorizeCell(cell, row, column)
  }

  /**
   * Removes all edge-related classes from a cell.
   * Used before reapplying terrain coloring.
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @returns {void}
   * @private
   */
  uncolorCell (cell) {
    const edgeClasses = Object.values(CellClassManager.CELL_CLASSES.edge)
    cell.classList.remove(...edgeClasses)
  }

  /**
   * Removes and reapplies terrain coloring for a cell at coordinates.
   * Convenience method combining uncolorCell and colorizeCell.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {void}
   * @private
   */
  recolorCell (cell, row, column) {
    this.uncolorCell(cell)
    this.colorizeCell(cell, row, column)
  }

  /**
   * Applies terrain coloring and edge detection to a cell.
   * Determines if cell borders land/water and adds appropriate edge classes.
   * Called during board initialization and terrain refresh.
   *
   * @param {HTMLElement} cell - DOM element to colorize
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {Object} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  colorizeCell (cell, row, column, map) {
    if (!map) map = bh.map
    map.tagCell(cell.classList, row, column)
    const isLand = map.isLand(row, column)

    // Check right edge (water next to land)
    const columnRight = column + 1
    if (!isLand && columnRight < map.cols && map.isLand(row, columnRight)) {
      cell.classList.add('rightEdge')
    }

    // Check left edge (water next to land)
    if (column !== 0 && !isLand && map.isLand(row, column - 1)) {
      cell.classList.add('leftEdge')
    }

    // Check bottom edge (transition between land/water vertically)
    const rowBelow = row + 1
    if (rowBelow < map.rows && isLand !== map.isLand(rowBelow, column)) {
      cell.classList.add('bottomEdge')
    }

    // Check top edge (water next to land vertically)
    if (row !== 0 && !isLand && map.isLand(row - 1, column)) {
      cell.classList.add('topEdge')
    }
  }

  /**
   * Creates and appends an empty cell (used for corner label cell).
   *
   * @returns {void}
   * @private
   */
  buildEmptyCell () {
    const cell = document.createElement('div')
    cell.className = 'cell empty'
    this.board.appendChild(cell)
  }

  /**
   * Creates and appends a row label cell.
   *
   * @param {number} maxRows - Total rows (used to calculate inverted index)
   * @param {number} row - Row index (0-based)
   * @returns {void}
   * @private
   */
  buildRowLabel (maxRows, row) {
    const cell = document.createElement('div')
    cell.className = 'cell row-label'
    cell.dataset.r = row
    cell.textContent = `${maxRows - row}`
    this.board.appendChild(cell)
  }

  /**
   * Creates and appends a column label cell with letter.
   *
   * @param {number} column - Column index (0-based)
   * @returns {void}
   * @private
   */
  buildColLabel (column) {
    const cell = document.createElement('div')
    cell.className = 'cell col-label'
    cell.dataset.c = column
    cell.textContent = String.fromCodePoint(startCharCode + column)
    this.board.appendChild(cell)
  }

  /**
   * Creates and appends a game board cell with optional click handler.
   * Applies terrain coloring, coordinates, and click listener.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {Function} [onClickCell] - Optional click event handler
   * @param {Object} [map] - Map configuration for terrain coloring
   * @returns {void}
   * @private
   */
  buildCell (row, column, onClickCell, map) {
    const cell = document.createElement('div')
    cell.className = 'cell'
    this.colorizeCell(cell, row, column, map)
    setCellCoords(cell, row, column)
    if (onClickCell) {
      cell.addEventListener('click', onClickCell)
    }
    this.board.appendChild(cell)
  }

  /**
   * Builds board grid for print output with labels.
   * Creates grid with row/column labels for printing.
   *
   * @param {Object} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  buildBoardPrint (map) {
    map = map || bh.map
    this.board.innerHTML = ''
    this.buildEmptyCell()
    for (let column = 0; column < map.cols; column++) {
      this.buildColLabel(column)
    }
    for (let row = 0; row < map.rows; row++) {
      this.buildRowLabel(map.rows, row)
      for (let column = 0; column < map.cols; column++) {
        this.buildCell(row, column, null, map)
      }
    }
  }

  /**
   * Builds board grid for interactive display with optional click handlers.
   * Creates grid cells and binds click events if handler provided.
   *
   * @param {Function} [onClickCell] - Click handler: (row, col) => void
   * @param {Object} [thisRef] - Context object for click handler binding
   * @param {Object} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  buildBoard (onClickCell, thisRef, map) {
    map = map || bh.map
    this.board.innerHTML = ''
    this._buildGrid(map.rows, map.cols, (row, column) => {
      if (onClickCell) {
        this.buildCell(row, column, onClickCell.bind(thisRef, row, column), map)
      } else {
        this.buildCell(row, column, null, map)
      }
    })
  }

  /**
   * Removes all area-of-effect highlight classes from board.
   * Clears target and splash effect visual indicators.
   *
   * @returns {void}
   */
  removeHighlightAoE () {
    const tags = ['target', ...Object.values(bh.splashTags)]
    this._forEachBoardCell(el => el.classList.remove(...tags))
  }

  /**
   * Attaches hover event listeners to all board cells.
   * Shows/hides area-of-effect or targeting information on hover.
   *
   * @param {Function} onEnter - Mouseenter handler: (weaponSource, row, col) => void
   * @param {Function} onLeave - Mouseleave handler: (row, col) => void
   * @param {Object} [thisRef] - Context for onLeave binding
   * @param {any} [weaponSource] - Weapon source data passed to onEnter
   * @returns {void}
   */
  buildBoardHover (onEnter, onLeave, thisRef, weaponSource) {
    this._forEachBoardCell(el => {
      const [row, column] = coordsFromCell(el)
      el.addEventListener(
        'mouseenter',
        onEnter.bind(null, weaponSource, row, column)
      )
      el.addEventListener('mouseleave', onLeave.bind(thisRef, row, column))
    })
  }

  /**
   * Clears cell visuals using provided clearing strategy across entire board.
   * Generic method accepting custom clearing callback for different contexts.
   *
   * @param {'none'|'content'|'all'} details - What to clear: 'none', 'content', or 'all'
   * @param {Function} [classClear] - Custom clearing function: (cell) => void
   * @returns {void}
   * @private
   */
  clearVisualsBase (details, classClear) {
    const clear = classClear || this.clearCell.bind(this)
    this._forEachBoardCell(el => this.clearCellVisuals(el, details, clear))
  }

  /**
   * Clears all cell visuals (text, styles, and classes) from entire board.
   * Returns board to clean state with only terrain coloring.
   *
   * @returns {void}
   */
  clearVisuals () {
    this.clearVisualsBase('all')
  }

  /**
   * Clears friendly board cell visuals including damage indicators.
   * Preserves terrain coloring but removes game state classes.
   *
   * @returns {void}
   */
  clearFriendVisuals () {
    this.clearVisualsBase(
      'all',
      CellClassManager.clearFriendCell.bind(CellClassManager)
    )
  }

  /**
   * Clears only friendly cell classes, preserving text and styling.
   * Used when resetting game state without visual refresh.
   *
   * @returns {void}
   */
  clearFriendClasses () {
    this.clearVisualsBase(
      'none',
      CellClassManager.clearFriendCell.bind(CellClassManager)
    )
  }

  /**
   * Clears placement mode visuals from entire board.
   * Returns board to battle-ready state after ship placement phase.
   *
   * @returns {void}
   */
  clearPlaceVisuals () {
    this.clearVisualsBase('all', this.clearPlaceCell.bind(this))
  }

  /**
   * Displays a game status notice to the player.
   * Queues notice for display in status UI.
   *
   * @param {string} notice - Notice text to display
   * @returns {void}
   */
  showNotice (notice) {
    gameStatus.addToQueue(notice, false)
  }

  /**
   * Displays help tips for current game state.
   * Shown in status panel when available.
   *
   * @returns {void}
   */
  showTips () {
    gameStatus.setTips(this.tips, null)
  }

  /**
   * Hides any displayed tips or notices.
   * Clears status message queue.
   *
   * @returns {void}
   */
  hideTips () {
    gameStatus.clearQueue()
  }

  /**
   * Removes all weapon activation indicators from board.
   * Deactivates visual targeting display for all cells.
   *
   * @returns {void}
   */
  deactivateWeapons () {
    this._forEachBoardCell(cell => deactivateWeapon(cell))
  }

  /**
   * Removes temporary hint indicators from entire board.
   * Clears targeting or placement hints.
   *
   * @returns {void}
   */
  deactivateTempHints () {
    this._forEachBoardCell(cell => deactivateTempHint(cell))
  }

  /**
   * Shows/hides unit type containers based on which units exist in the fleet.
   * Only displays UI containers for unit types present in the fleet.
   *
   * @param {Object[]} ships - Array of ship objects with type() method
   * @returns {void}
   */
  hideEmptyUnits (ships) {
    const unitCounts = this._countUnitsByType(ships)
    Terrain.showsUnits('-container', letter => unitCounts[letter])
  }

  /**
   * Counts ships by unit type across fleet.
   * Normalizes M/T types to X type for display.
   *
   * @param {Object[]} ships - Array of ship objects
   * @returns {Object<string, number>} Map of unit type to count
   * @private
   */
  _countUnitsByType (ships) {
    return ships.reduce((acc, ship) => {
      const unitType = this.getUnitType(ship)
      acc[unitType] = (acc[unitType] || 0) + 1
      return acc
    }, {})
  }

  /**
   * Maps ship type to display unit type.
   * Normalizes Missile (M) and Torpedo (T) types to Special (X) unit type.
   *
   * @param {Object} ship - Ship object with type() method
   * @returns {string} Display unit type (A, S, X, G, or W)
   */
  getUnitType (ship) {
    const shipType = ship.type()
    if (shipType === 'M' || shipType === 'T') return 'X'
    return shipType
  }

  /**
   * Adds a ship to a unit type group, incrementing count.
   * Creates group entry if needed with ship shape.
   *
   * @param {Object} group - Group object keyed by ship letter
   * @param {Object} ship - Ship object with letter and shape() method
   * @returns {void}
   * @private
   */
  _addShipToGroup (group, ship) {
    const key = ship.letter
    let value = group[key] || { shape: ship.shape(), count: 0 }
    value.count++
    group[key] = value
  }

  /**
   * @deprecated Use _addShipToGroup instead (kept for backward compatibility)
   * @param {Object} group - Group object
   * @param {Object} ship - Ship object
   * @returns {void}
   */
  addToGroup (group, ship) {
    this._addShipToGroup(group, ship)
  }

  /**
   * Groups ships by unit type with shape and count info.
   * Organizes fleet into unit type buckets for loadout display.
   * Each group contains ship entries keyed by letter with shape/count.
   *
   * @param {Object[]} ships - Array of ship objects
   * @returns {Object<string, Object>} Ships grouped by type:
   *   { A: {D: {shape: ..., count: 2}}, S: {A: {shape: ..., count: 1}}, ...}
   */
  splitUnits (ships) {
    return ships.reduce((acc, ship) => {
      const unitType = this.getUnitType(ship)
      const group = acc[unitType] || {}
      this._addShipToGroup(group, ship)
      acc[unitType] = group
      return acc
    }, {})
  }

  /**
   * Gets the tray DOM element for a specific unit type.
   * Trays display ship/unit loadout and information.
   *
   * @param {string} type - Unit type identifier (A, S, X, G, W)
   * @returns {HTMLDivElement} The tray container element
   * @throws {Error} If type is unknown or tray element not found
   */
  getTrayOfType (type) {
    const trayId = TRAY_TYPE_MAP[type]
    if (!trayId) {
      throw new Error('Unknown type for ' + type)
    }
    const tray = document.getElementById(trayId)
    if (!tray) {
      throw new Error('Tray not found for type ' + type)
    }
    return tray
  }

  /**
   * Gets the notes/information DOM element for a specific unit type.
   * Notes display unit descriptions and stats.
   *
   * @param {string} type - Unit type identifier (A, S, X, G, W, or M/T for special)
   * @returns {HTMLDivElement|null} The notes container element, or null if not found
   * @throws {Error} If type is unknown
   */
  getNotesOfType (type) {
    const notesId = NOTES_TYPE_MAP[type]
    if (!notesId) {
      throw new Error('Unknown type for ' + type)
    }
    return document.getElementById(notesId)
  }
}

function deactivateWeapon (cell) {
  if (cell.classList.contains('contrast')) {
    cell.classList.remove(
      'active',
      'contrast',
      'turn2',
      'turn3',
      'turn4',
      ...bh.terrain.weapons.tags
    )
  } else {
    cell.classList.remove('active')
  }
}

function deactivateTempHint (cell) {
  cell.classList.remove('temp-hint')
}
