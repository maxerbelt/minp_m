/**
 * @typedef {Object} GridMap
 * Represents a game map configuration with terrain and cell query methods.
 * @property {number} rows - Number of rows in the grid (y-dimension; 0 to rows-1)
 * @property {number} cols - Number of columns in the grid (x-dimension; 0 to cols-1)
 * @property {(row: number, col: number) => boolean} isLand - Predicate: true if cell contains land terrain
 * @property {(row: number, col: number) => boolean} isWater - Predicate: true if cell contains water/default terrain
 * @property {(classList: DOMTokenList, row: number, col: number) => void} tagCell - Applies terrain CSS classes to element's classList
 * @property {string} title - Display title/name of the map for UI
 */

/**
 * @typedef {Object} Ship
 * Represents a game ship with state, shape, and cell occupation.
 * @property {string} id - Unique ship identifier for game tracking and state management
 * @property {string} letter - Ship type letter: A=Plane, S=Ship, M=Missile, T=Torpedo, F=Fighter, D=Destroyer, R=Runner, etc.
 * @property {number} variant - Ship variant index (0-based) for visual differentiation within ship type
 * @property {boolean} hasWeapon - Whether ship has attached weapon capabilities for special attacks
 * @property {boolean} sunk - Whether ship has been sunk (destroyed in combat)
 * @property {() => string} type - Method: returns ship type letter identifier for classification
 * @property {() => Object} shape - Method: returns ship shape/geometry object with cell offset mappings
 * @property {Iterable<[number, number]>} cells - Iterable yielding all occupied cells as [column, row] coordinate tuples
 * @property {() => void} reset - Method: resets ship to initial state (unsunk, no damage, repairs)
 */

/**
 * @typedef {Object} SurroundingStrategy
 * Strategy configuration for calculating cell sizes by display mode.
 * Used by CELL_SIZE_CONFIG to determine divisor for cellSize = containerWidth / divisor.
 * @property {(map: GridMap, width?: number) => number} getDivisor - Returns divisor for cell size calculation
 */

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

/**
 * Retrieves all child elements from a board element.
 * @param {HTMLElement|null} board - The board element
 * @returns {HTMLCollection|Array<never>} Child elements or empty collection
 * @private
 */
const getBoardChildren = (/** @type {HTMLElement|null} */ board) =>
  board?.children || []

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
 *
 * **Responsibilities:**
 * - Render grid cells with proper terrain and edge coloring for visual accuracy
 * - Handle ship display and weapon positioning during game states
 * - Manage battle state visualization (hits, misses, sunk ships, status indicators)
 * - Coordinate cell clearing and highlighting for UI state transitions
 * - Manage board size calculations for screen, list, and print display modes
 * - Support ship placement and weapon targeting UI interactions
 *
 * **Design Patterns:**
 * - Stateful utility class tracking board state, container sizing, and player territory context
 * - Delegates specialized tasks to helper classes (composition pattern):
 *   * CellClassManager: Cell CSS state and class management
 *   * ShipCellDisplayer: Ship visual representation and attributes
 *   * BoardConfigurator: DOM layout and responsive sizing
 *   * SurroundingCellsHelper: Neighbor cell computation and collection
 * - Configuration-driven cell sizing (CELL_SIZE_CONFIG) eliminates duplicated logic
 * - Strategy pattern for surrounding cell collection with flexible result formats
 *
 * **Key Methods:**
 * - cellSize() / cellSizeString(): Responsive sizing for display modes
 * - gridCellAt() / gridCellRawAt(): Cell element access with/without validation
 * - buildBoard() / buildBoardPrint(): Grid initialization for interactive/print display
 * - colorizeCell() / _detectAndApplyEdges(): Terrain coloring and edge detection
 * - displaySurround() / _displaySurroundingMisses(): Area-of-effect visualization
 *
 * @class WatersUI
 * @classdesc Board UI manager for player territories with state, sizing, and rendering capabilities
 */
export class WatersUI {
  /**
   * Initializes the UI manager for a player's territory/board.
   * Sets up DOM references, score tracking, and display configuration.
   *
   * @constructor
   * @param {string} territory - Territory identifier (e.g., 'friend', 'enemy') used for DOM element IDs
   * @param {string} title - Display title for this territory's board shown in UI header
   * @returns {void}
   * @description Creates references to board DOM element, score UI, and initializes state flags.
   * Board element ID format: "{territory}-board", Title element: "{territory}-title"
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
   * Updates cell CSS classes: adds newClasses, removes oldClasses.
   * No-op if arrays are empty to avoid unnecessary DOM updates.
   *
   * @param {HTMLElement} cell - DOM element to update
   * @param {string[]} oldClasses - Array of class names to remove
   * @param {string[]} newClasses - Array of class names to add
   * @returns {void}
   * @private
   */
  _updateCellClasses (cell, oldClasses = [], newClasses = []) {
    if (oldClasses.length) {
      cell.classList.remove(...oldClasses)
    }
    if (newClasses.length) {
      cell.classList.add(...newClasses)
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
   * @param {(cell: HTMLElement) => void} callback - Function to call for each cell
   * @returns {void}
   * @private
   */
  _forEachBoardCell (callback) {
    for (const cell of getBoardChildren(this.board)) {
      // @ts-ignore - child elements are HTMLElement at runtime
      callback(/** @type {HTMLElement} */ (cell))
    }
  }

  /**
   * Iterates over grid coordinates, calling callback for each cell position.
   * Provides functional interface to grid enumeration for board construction.
   *
   * @param {number} rows - Number of rows in grid
   * @param {number} cols - Number of columns in grid
   * @param {(row: number, column: number) => void} callback - Function to call for each coordinate
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
   * @param {string} name - Title name to append
   * @returns {void}
   */
  showTitle (name) {
    const titleEl = document.getElementById(this.territory + '-title')
    if (titleEl) {
      titleEl.textContent = this.territoryTitle + ' ' + name
    }
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
   * Configuration for cell size calculations by display mode.
   * Each mode specifies: how to get column count and the divisor formula.
   * @type {Object<string, SurroundingStrategy>}
   */
  static CELL_SIZE_CONFIG = {
    SCREEN: { getDivisor: (/** @type {GridMap} */ map) => map.cols },
    LIST: { getDivisor: () => 22 },
    PRINT: { getDivisor: (/** @type {GridMap} */ map) => map.cols + 1 }
  }

  /**
   * Calculates cell size in pixels using configuration for display mode.
   * Consolidates screen, list, and print size calculations.
   *
   * @param {string} mode - Display mode: 'SCREEN', 'LIST', or 'PRINT'
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @param {number} [containerWidthOverride] - Optional container width (defaults to this.containerWidth)
   * @returns {number} Cell size in pixels
   */
  #calculateCellSize (mode, map, containerWidthOverride) {
    const config = /** @type {SurroundingStrategy|undefined} */ (
      WatersUI.CELL_SIZE_CONFIG[mode]
    )
    if (!config) throw new Error(`Unknown cell size mode: ${mode}`)

    const currentMap = map || bh.map
    const width =
      mode === 'PRINT' ? 600 : containerWidthOverride || this.containerWidth
    const divisor = config.getDivisor(currentMap)
    return width / divisor
  }

  /**
   * Gets current cell size for screen display (or as specified).
   * Selects screen or print mode based on isPrinting state.
   *
   * @param {GridMap} [map] - Map configuration (optional, uses current map if not provided)
   * @returns {number} Cell size in pixels
   */
  cellSize (map) {
    const mode = this.isPrinting ? 'PRINT' : 'SCREEN'
    return this.#calculateCellSize(mode, map)
  }

  /**
   * Gets current cell size as CSS-formatted string (mode-aware).
   *
   * @returns {string} CSS size string (e.g., '35px')
   */
  cellSizeString () {
    return `${this.cellSize()}px`
  }

  /**
   * Gets current cell size as CSS-formatted string for list display.
   *
   * @returns {string} CSS size string (e.g., '26px')
   */
  cellSizeStringList () {
    return `${this.#calculateCellSize('LIST')}px`
  }

  /**
   * Gets current cell size as CSS-formatted string for print display.
   *
   * @returns {string} CSS size string (e.g., '30px')
   */
  cellSizeStringPrint () {
    return `${this.#calculateCellSize('PRINT')}px`
  }

  /**
   * Calculates linear index from 2D grid coordinates.
   * Index = row * columnCount + column (standard row-major ordering).
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {number} Linear array index in flattened grid
   */
  #gridIndex (row, column) {
    return row * bh.map.cols + column
  }

  /**
   * Retrieves grid cell element at coordinates without validation.
   * Returns null if cell not found (safer for defensive programming).
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {HTMLDivElement|null} Cell element or null if not found
   */
  gridCellRawAt (row, column) {
    return (
      /** @type {HTMLDivElement|null} */ (
        this.board?.children?.[this.#gridIndex(row, column)]
      ) || null
    )
  }

  /**
   * Retrieves grid cell element at coordinates with validation.
   * Throws error if cell not found to catch coordinate errors early.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @returns {HTMLDivElement} Cell element (guaranteed valid)
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
   * @generator
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
   * @generator
   */
  *cellsAndCoords (coords) {
    for (const [row, column, power] of coords) {
      yield [this.gridCellAt(row, column), row, column, power]
    }
  }

  /**
   * Applies async effects to multiple cells with random delays.
   * @param {Array<[HTMLDivElement, number, number, any]>} cells - Cells with coordinates and power
   * @param {(cell: HTMLDivElement, power: any) => Promise<void>} effect - Async callback for each cell
   * @param {number} [mindelay=380] - Minimum delay in milliseconds
   * @param {number} [maxdelay=730] - Maximum delay in milliseconds
   * @returns {Promise<PromiseSettledResult<void>[]>} Results of all async operations
   */
  async delayAsyncEffects (cells, effect, mindelay = 380, maxdelay = 730) {
    const promises = cells.map(([cell, , , power]) =>
      this.delayAsyncEffect(cell, effect, mindelay, maxdelay, power)
    )
    return await Promise.allSettled(promises)
  }

  /**
   * Applies async effect to a single cell with random delay.
   * @param {HTMLDivElement} cell - Cell element to apply effect to
   * @param {(cell: HTMLDivElement, power: any) => Promise<void>} effect - Async callback
   * @param {number} [mindelay=380] - Minimum delay in milliseconds
   * @param {number} [maxdelay=730] - Maximum delay in milliseconds
   * @param {any} [power=null] - Optional power/data passed to effect
   * @returns {Promise<void>}
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
   * Displays surrounding ship cell attributes.
   * @param {Ship} ship - Ship object
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {void}
   */
  surroundShipCellAt (ship, r, c) {
    const cell = this.gridCellAt(r, c)
    // @ts-ignore - ship type compatible with ShipCellDisplayer.Ship
    ShipCellDisplayer.displaySurroundAttributes(cell, ship, r, c)
  }

  /**
   * Resets all ships to initial state and reveals them on the board.
   * Used when starting a new game or round.
   *
   * @param {Ship[]} ships - Array of ship objects to reset
   * @returns {void}
   */
  resetShips (ships) {
    for (const ship of ships) {
      if (ship && typeof ship.reset === 'function') {
        // @ts-ignore - ship.reset exists based on typeof check
        ship.reset()
      }
      this.revealShip(ship)
    }
  }

  /**
   * Reveals multiple ships on the board without resetting them.
   * Useful for showing previously hidden ships.
   *
   * @param {Ship[]} ships - Array of ship objects to reveal
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
   * @param {Ship} ship - Ship object with cells property (iterable of [col, row])
   * @returns {void}
   */
  revealShip (ship) {
    const colorMaps = bh.maps
    // @ts-ignore - ship.cells is iterable of [col, row] coordinate pairs
    for (const [column, row] of ship.cells) {
      const cell = this.gridCellAt(row, column)
      // @ts-ignore - ship matches Ship type for display
      ShipCellDisplayer.displayAsRevealed(cell, ship, colorMaps)
    }
  }

  /**
   * Generic method to clear cell visuals using custom clearing strategy.
   * Delegates class clearing to provided function for context-specific behavior.
   *
   * @param {HTMLDivElement} cell - DOM element to clear
   * @param {'none'|'content'|'all'} details - What to clear:
   *   'none' = only call classClear, 'content' = text only, 'all' = text and style
   * @param {(cell: HTMLDivElement) => void} [classClear] - Function to clear cell classes (defaults to clearCell)
   * @returns {void}
   */
  clearCellVisuals (cell, details, classClear) {
    const clear =
      classClear || CellClassManager.clearCell.bind(CellClassManager)
    ShipCellDisplayer.clearDetails(cell, details)
    clear(cell)
  }

  /**
   * Marks a friendly cell as sunk.
   * Displays sunk marker and clears hit-related state.
   *
   * @param {HTMLDivElement} cell - DOM element to update
   * @param {string} _letter - Ship letter (unused in base implementation)
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
    this._forEachBoardCell((/** @type {HTMLElement} */ cell) =>
      CellClassManager.clearCell(cell)
    )
  }

  /**
   * Marks a cell at coordinates as sunk.
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @param {string} letter - Ship letter
   * @returns {void}
   */
  cellSunkAt (r, c, letter) {
    const cell = this.gridCellAt(r, c)
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
   * @returns {number|Object} Result code: LoadOut.noResult if already revealed, LoadOut.missResult otherwise
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
   * @param {HTMLDivElement} _cell - DOM element to update
   * @returns {void}
   * @protected
   */
  addContrast (_cell) {
    /* only needs implementation if enemy */
  }

  /**
   * Adds weapon activation styling to a cell.
   * Applies weapon classes, rotation, and optional contrast for visual emphasis.
   *
   * @param {HTMLDivElement} cell - DOM element to style
   * @param {string} rotationClass - Rotation indicator class (e.g., 'turn2')
   * @param {string} [extraClass] - Additional class to apply (optional)
   * @private
   */
  _applyWeaponStyling (cell, rotationClass, extraClass) {
    const classesToAdd = ['weapon', 'active']
    if (extraClass) classesToAdd.push(extraClass)
    if (rotationClass) classesToAdd.push(rotationClass)

    this._updateCellClasses(cell, ['wake'], classesToAdd)
    this.addContrast(cell)
    this._clearCellText(cell)
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
    this._applyWeaponStyling(cell, rotationClass, extraClass)
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
    CellClassManager.deactivateWeapon(cell)
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
    CellClassManager.deactivateTempHint(cell)
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
   * Adds surrounding cells to container using specified strategy.
   * Generic method that delegates to SurroundingCellsHelper with flexible result format.
   *
   * @param {number} row - Row coordinate of center cell
   * @param {number} column - Column coordinate of center cell
   * @param {Set<string>|Object|any[]} container - Container to accumulate results
   * @param {string} strategy - Result format: 'keySet' | 'objectMap' | 'array'
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @param {(row: number, col: number) => any} [maker] - Callback for 'objectMap'/'array' strategies (optional)
   * @returns {void}
   */
  _addSurroundingCells (row, column, container, strategy, map, maker) {
    const currentMap = map || bh.map
    if (!currentMap) return
    let result

    switch (strategy) {
      case 'keySet': {
        result = SurroundingCellsHelper.asKeySet(currentMap, row, column)
        // @ts-ignore - container is Set when strategy is keySet
        result.forEach(key => container.add(key))
        break
      }
      case 'objectMap': {
        if (!maker) throw new Error('maker required for objectMap strategy')
        result = SurroundingCellsHelper.asObjectMap(
          currentMap,
          row,
          column,
          maker
        )
        Object.assign(container, result)
        break
      }
      case 'array': {
        if (!maker) throw new Error('maker required for array strategy')
        result = SurroundingCellsHelper.asArray(currentMap, row, column, maker)
        // @ts-ignore - container is array when strategy is array
        container.push(...result)
        break
      }
      default:
        throw new Error(`Unknown surround strategy: ${strategy}`)
    }
  }

  /**
   * Adds surrounding cell keys to a set container.
   * Retrieves all neighbors of specified cell and adds their keys.
   *
   * @param {number} row - Row coordinate of center cell
   * @param {number} column - Column coordinate of center cell
   * @param {Set<string>} container - Set to accumulate surrounding cell keys
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  surround (row, column, container, map) {
    // @ts-ignore - map compatible with GridMap when defined
    this._addSurroundingCells(row, column, container, 'keySet', map)
  }

  /**
   * Adds surrounding cells as object mappings to container.
   * Retrieves neighbors and applies maker function to each coordinate.
   *
   * @param {number} row - Row coordinate of center cell
   * @param {number} column - Column coordinate of center cell
   * @param {Object} container - Object to accumulate surrounding cell mappings
   * @param {(row: number, col: number) => HTMLElement} maker - Callback to transform [row, col] → HTMLElement
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  surroundObj (row, column, container, maker, map) {
    this._addSurroundingCells(row, column, container, 'objectMap', map, maker)
  }

  /**
   * Adds surrounding cells to array container.
   * Retrieves neighbors and applies maker function to each coordinate.
   *
   * @param {number} row - Row coordinate of center cell
   * @param {number} column - Column coordinate of center cell
   * @param {any[]} container - Array to accumulate surrounding cell elements
   * @param {(row: number, col: number) => any} maker - Callback to transform [row, col] → any value
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  surroundList (row, column, container, maker, map) {
    this._addSurroundingCells(row, column, container, 'array', map, maker)
  }

  /**
   * Converts coordinate pairs to set of cell keys.
   * Keys are formatted as 'col-row' for keyed lookups.
   *
   * @param {Iterable<[number, number]>} cells - Iterable of [row, col] coordinate pairs
   * @returns {Set<string>} Set of cell keys
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
   */
  surroundCells (cells) {
    const map = bh.map
    const surroundings = new Set()
    for (const [column, row] of cells) {
      this.surround(row, column, surroundings, map)
    }
    return surroundings
  }

  /**
   * Gets surrounding cell DOM elements for given cell elements.
   * Retrieves neighbor cells and returns as flat array.
   *
   * @param {Iterable<HTMLElement>} cells - Iterable of DOM cell elements
   * @param {Object<string, HTMLElement>} [container] - Optional container object to accumulate results
   * @returns {HTMLElement[]} Array of surrounding cell elements
   */

  surroundCellElement (cells, container) {
    const map = bh.map
    const surroundings = container || {}
    for (const cell of cells) {
      const [row, column] = coordsFromCell(cell)
      this.surroundObj(
        row,
        column,
        surroundings,
        this.gridCellAt.bind(this),
        map
      )
    }
    return Object.values(surroundings)
  }

  /**
   * Displays surrounding cells with miss indicator.
   * Marks all neighbors (but not original cells) as miss for area-of-effect.
   *
   * @param {Set<string>} surroundingKeys - Set of surrounding cell keys
   * @param {Function} cellMiss - Callback to mark cells as miss: (row, col) => void
   * @returns {void}
   */
  _displaySurroundingMisses (surroundingKeys, cellMiss) {
    for (const key of surroundingKeys) {
      const [row, column] = parsePair(key)
      cellMiss(row, column)
    }
  }

  /**
   * Displays center cells using provided display function.
   * Typically marks original cells with ship or hit indicators.
   *
   * @param {Iterable<[number, number]>} cells - Original cell coordinates
   * @param {Ship} ship - Ship object for display
   * @param {Function} displayFn - Callback to display cells: (row, col, ship) => void
   * @returns {void}
   */
  _displayCenterCells (cells, ship, displayFn) {
    for (const [row, column] of cells) {
      displayFn(row, column, ship)
    }
  }

  /**
   * Displays surrounding cells with miss indicator and center cells with display function.
   * Used for area-of-effect visualization (e.g., weapon splash).
   *
   * @param {Iterable<[number, number]>} cells - Iterable of [row, col] coordinate pairs
   * @param {Ship} ship - Ship object for center cell display
   * @param {(row: number, col: number) => void} cellMiss - Callback to mark surrounding cells as miss
   * @param {(row: number, col: number, ship: Ship) => void} [display] - Optional callback to display center cells
   * @returns {void}
   */
  displaySurround (cells, ship, cellMiss, display) {
    const surroundingKeys = this.hollowCells(cells)
    this._displaySurroundingMisses(surroundingKeys, cellMiss)
    if (display) {
      this._displayCenterCells(cells, ship, display)
    }
  }

  /**
   * Resets board CSS dimensions for screen display.
   * Delegates to BoardConfigurator for DOM manipulation.
   *
   * @param {GridMap} map - Map configuration with rows/cols
   * @param {string} cellSize - CSS size string (e.g., '35px')
   * @returns {void}
   */
  resetBoardSize (map, cellSize) {
    if (this.board) {
      BoardConfigurator.resetBoardSize(this.board, map, cellSize)
    }
  }

  /**
   * Resets board CSS dimensions for print display.
   * Delegates to BoardConfigurator for DOM manipulation.
   *
   * @param {GridMap} map - Map configuration with rows/cols
   * @returns {void}
   */
  resetBoardSizePrint (map) {
    if (this.board) {
      BoardConfigurator.resetBoardSizePrint(this.board, map)
    }
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
    const cell = this.gridCellRawAt(row, column)
    if (cell) {
      this.colorizeCell(cell, row, column)
    }
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
    const cell = this.gridCellRawAt(row, column)
    if (cell) {
      this.recolorCell(cell, row, column)
    }
  }

  /**
   * Refreshes terrain coloring for all board cells.
   * Called when terrain configuration has changed.
   *
   * @returns {void}
   */
  refreshAllColor () {
    this._forEachBoardCell((/** @type {HTMLElement} */ el) =>
      this.refreshColor(el)
    )
  }

  /**
   * Removes and reapplies terrain coloring for a single cell.
   * Extracts coordinates from cell dataset and recolorizes.
   *
   * @param {HTMLElement} cell - DOM element to refresh
   * @returns {void}
   */
  refreshColor (cell) {
    const rowStr = cell.dataset.r || '0'
    const colStr = cell.dataset.c || '0'
    const row = Number.parseInt(rowStr)
    const column = Number.parseInt(colStr)
    this.uncolorCell(cell)
    this.colorizeCell(cell, row, column)
  }

  /**
   * Removes all edge-related classes from a cell.
   * Used before reapplying terrain coloring.
   *
   * @param {HTMLElement} cell - DOM element to clear
   * @returns {void}
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
   */
  recolorCell (cell, row, column) {
    this.uncolorCell(cell)
    this.colorizeCell(cell, row, column)
  }

  /**
   * Checks if cell has edge with land based on neighboring cell.
   * Edge classes indicate transition from water to land.
   *
   * @param {HTMLElement} cell - DOM element for edge class application
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {GridMap} map - Map configuration with cols, rows, isLand() method
   * @param {boolean} isLand - Whether current cell is land
   * @returns {void}
   */
  _detectAndApplyEdges (cell, row, column, map, isLand) {
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
   * Applies terrain coloring and edge detection to a cell.
   * Determines if cell borders land/water and adds appropriate edge classes.
   * Called during board initialization and terrain refresh.
   *
   * @param {HTMLElement} cell - DOM element to colorize
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  colorizeCell (cell, row, column, map) {
    const currentMap = map || bh.map
    if (!currentMap) return
    currentMap.tagCell(cell.classList, row, column)
    const isLand = currentMap.isLand(row, column)
    this._detectAndApplyEdges(cell, row, column, currentMap, isLand)
  }

  /**
   * Creates and appends an empty cell (used for corner label cell).
   *
   * @returns {void}
   */
  buildEmptyCell () {
    const cell = document.createElement('div')
    cell.className = 'cell empty'
    if (this.board) {
      this.board.appendChild(cell)
    }
  }

  /**
   * Creates and appends a row label cell.
   *
   * @param {number} maxRows - Total rows (used to calculate inverted index)
   * @param {number} row - Row index (0-based)
   * @returns {void}
   */
  buildRowLabel (maxRows, row) {
    const cell = document.createElement('div')
    cell.className = 'cell row-label'
    cell.dataset.r = String(row)
    cell.textContent = `${maxRows - row}`
    if (this.board) {
      this.board.appendChild(cell)
    }
  }

  /**
   * Creates and appends a column label cell with letter.
   *
   * @param {number} column - Column index (0-based)
   * @returns {void}
   */
  buildColLabel (column) {
    const cell = document.createElement('div')
    cell.className = 'cell col-label'
    cell.dataset.c = String(column)
    cell.textContent = String.fromCodePoint(startCharCode + column)
    if (this.board) {
      this.board.appendChild(cell)
    }
  }

  /**
   * Creates and appends a game board cell with optional click handler.
   * Applies terrain coloring, coordinates, and click listener.
   *
   * @param {number} row - Row coordinate
   * @param {number} column - Column coordinate
   * @param {((event: MouseEvent) => void)|null} [onClickCell] - Optional click event handler
   * @param {GridMap} [map] - Map configuration for terrain coloring
   * @returns {void}
   */
  buildCell (row, column, onClickCell, map) {
    const cell = document.createElement('div')
    cell.className = 'cell'
    this.colorizeCell(cell, row, column, map)
    setCellCoords(cell, row, column)
    if (onClickCell && typeof onClickCell === 'function') {
      // @ts-ignore - event listener type checked at runtime
      cell.addEventListener('click', onClickCell)
    }
    if (this.board) {
      this.board.appendChild(cell)
    }
  }

  /**
   * Builds board grid for print output with labels.
   * Creates grid with row/column labels for printing.
   *
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  buildBoardPrint (map) {
    const currentMap = map || bh.map
    if (!this.board) return
    this.board.innerHTML = ''
    this.buildEmptyCell()
    for (let column = 0; column < currentMap.cols; column++) {
      this.buildColLabel(column)
    }
    for (let row = 0; row < currentMap.rows; row++) {
      this.buildRowLabel(currentMap.rows, row)
      for (let column = 0; column < currentMap.cols; column++) {
        this.buildCell(row, column, undefined, currentMap)
      }
    }
  }

  /**
   * Builds board grid for interactive display with optional click handlers.
   * Creates grid cells and binds click events if handler provided.
   *
   * @param {(row: number, col: number) => void} [onClickCell] - Click handler
   * @param {Object} [thisRef] - Context object for click handler binding
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  buildBoard (onClickCell, thisRef, map) {
    const currentMap = map || bh.map
    if (!this.board) return
    this.board.innerHTML = ''
    this._buildGrid(
      currentMap.rows,
      currentMap.cols,
      (/** @type {number} */ row, /** @type {number} */ column) => {
        if (onClickCell) {
          this.buildCell(
            row,
            column,
            onClickCell.bind(thisRef, row, column),
            currentMap
          )
        } else {
          this.buildCell(row, column, undefined, currentMap)
        }
      }
    )
  }

  /**
   * Removes all area-of-effect highlight classes from board.
   * Clears target and splash effect visual indicators.
   *
   * @returns {void}
   */
  removeHighlightAoE () {
    const tags = ['target', ...Object.values(bh.splashTags)]
    this._forEachBoardCell((/** @type {HTMLElement} */ el) =>
      el.classList.remove(...tags)
    )
  }

  /**
   * Attaches hover event listeners to all board cells.
   * Shows/hides area-of-effect or targeting information on hover.
   *
   * @param {(weaponSource: any, row: number, col: number) => void} onEnter - Mouseenter handler
   * @param {(row: number, col: number) => void} onLeave - Mouseleave handler
   * @param {Object} [thisRef] - Context for onLeave binding
   * @param {any} [weaponSource] - Weapon source data passed to onEnter
   * @returns {void}
   */
  buildBoardHover (onEnter, onLeave, thisRef, weaponSource) {
    this._forEachBoardCell((/** @type {HTMLElement} */ el) => {
      const [row, column] = coordsFromCell(el)
      // @ts-ignore - addEventListener signature compatible at runtime
      el.addEventListener(
        'mouseenter',
        onEnter.bind(null, weaponSource, row, column)
      )
      // @ts-ignore - addEventListener signature compatible at runtime
      el.addEventListener('mouseleave', onLeave.bind(thisRef, row, column))
    })
  }

  /**
   * Clears cell visuals across entire board using provided strategy.
   * Generic method applying custom clearing callback and detail level to all cells.
   *
   * @param {'none'|'content'|'all'} details - What to clear: 'none', 'content', or 'all'
   * @param {(cell: HTMLElement) => void} [classClearer] - Function to clear cell classes
   * @returns {void}
   */
  _clearAllCellVisuals (details, classClearer) {
    const clear =
      classClearer || CellClassManager.clearCell.bind(CellClassManager)
    this._forEachBoardCell((/** @type {HTMLElement} */ el) =>
      this.clearCellVisuals(/** @type {HTMLDivElement} */ (el), details, clear)
    )
  }

  /**
   * Clears all cell visuals (text, styles, and classes) from entire board.
   * Returns board to clean state with only terrain coloring.
   *
   * @returns {void}
   */
  clearVisuals () {
    this._clearAllCellVisuals('all')
  }

  /**
   * Clears friendly board cell visuals including damage indicators.
   * Preserves terrain coloring but removes game state classes.
   *
   * @returns {void}
   */
  clearFriendVisuals () {
    this._clearAllCellVisuals(
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
    this._clearAllCellVisuals(
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
    this._clearAllCellVisuals(
      'all',
      CellClassManager.clearPlaceCell.bind(CellClassManager)
    )
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
    // @ts-ignore - tips property set by subclass
    gameStatus.setTips(this.tips, undefined)
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
    this._forEachBoardCell((/** @type {HTMLElement} */ cell) =>
      CellClassManager.deactivateWeapon(cell)
    )
  }

  /**
   * Removes temporary hint indicators from entire board.
   * Clears targeting or placement hints.
   *
   * @returns {void}
   */
  deactivateTempHints () {
    this._forEachBoardCell((/** @type {HTMLElement} */ cell) =>
      CellClassManager.deactivateTempHint(cell)
    )
  }

  removeDisplayClasses () {
    this._forEachBoardCell((/** @type {HTMLElement} */ cell) =>
      CellClassManager.clearDisplayCell(cell)
    )
  }

  /**
   * Shows/hides unit type containers based on which units exist in the fleet.
   * Only displays UI containers for unit types present in the fleet.
   *
   * @param {Ship[]} ships - Array of ship objects with type() method
   * @returns {void}
   */
  hideEmptyUnits (ships) {
    const unitCounts = this._countUnitsByType(ships)
    Terrain.showsUnits(
      '-container',
      (/** @type {string} */ letter) => !!unitCounts[letter]
    )
  }

  /**
   * Counts ships by unit type across fleet.
   * Normalizes M/T types to X type for display.
   *
   * @param {Ship[]} ships - Array of ship objects
   * @returns {Object<string, number>} Map of unit type to count
   */
  _countUnitsByType (ships) {
    return ships.reduce((/** @type {Object<string, number>} */ acc, ship) => {
      const unitType = this.getUnitType(ship)
      acc[unitType] = (acc[unitType] || 0) + 1
      return acc
    }, {})
  }

  /**
   * Maps ship type to display unit type.
   * Normalizes Missile (M) and Torpedo (T) types to Special (X) unit type.
   *
   * @param {Ship} ship - Ship object with type() method
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
   * @param {Object<string, any>} group - Group object keyed by ship letter
   * @param {Ship} ship - Ship object with letter and shape() method
   * @returns {void}
   */
  addShipToGroup (group, ship) {
    const key = ship.letter
    let value = group[key] || { shape: ship.shape(), count: 0 }
    value.count++
    group[key] = value
  }

  /**
   * Groups ships by unit type with shape and count info.
   * Organizes fleet into unit type buckets for loadout display.
   * Each group contains ship entries keyed by letter with shape/count.
   *
   * @param {Ship[]} ships - Array of ship objects
   * @returns {Object<string, Object<string, any>>} Ships grouped by type:
   *   { A: {D: {shape: ..., count: 2}}, S: {A: {shape: ..., count: 1}}, ...}
   */
  splitUnits (ships) {
    return ships.reduce(
      (/** @type {Object<string, Object<string, any>>} */ acc, ship) => {
        const unitType = this.getUnitType(ship)
        const group = acc[unitType] || {}
        this.addShipToGroup(group, ship)
        acc[unitType] = group
        return acc
      },
      {}
    )
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
    return /** @type {HTMLDivElement} */ (tray)
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
    return /** @type {HTMLDivElement|null} */ (document.getElementById(notesId))
  }
}
