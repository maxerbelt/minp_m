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

/**
 * @typedef {(cell: HTMLDivElement, power: any) => Promise<void>} CellEffectCallback
 * Async effect callback applied to cells during animations.
 * @description Called for each cell with optional power/data parameter during async effect processing
 */

/**
 * @typedef {(row: number, col: number) => void} CellMissCallback
 * Callback to mark a cell as a miss (no ship hit).
 * @description Used for area-of-effect visualization and weapon splash calculations
 */

/**
 * @typedef {(row: number, col: number, ship: Ship) => void} CellDisplayCallback
 * Callback to display a cell with ship information.
 * @description Used for rendering ship positions and damage states during display
 */

/**
 * @typedef {(row: number, col: number) => HTMLElement} CoordToElementCallback
 * Callback to transform grid coordinates to DOM element.
 * @description Used for mapping coordinate pairs to their corresponding cell elements
 */

/**
 * @typedef {(row: number, col: number) => any} CoordToValueCallback
 * Callback to transform grid coordinates to any value.
 * @description Generic callback for coordinate-based transformations in collection methods
 */

/**
 * @typedef {(weaponSource: any, row: number, col: number) => void} CellHoverEnterCallback
 * Callback fired when mouse enters a cell during hover targeting.
 * @description Receives weapon source data and cell coordinates for aiming display
 */

/**
 * @typedef {(row: number, col: number) => void} CellHoverLeaveCallback
 * Callback fired when mouse leaves a cell during hover targeting.
 * @description Receives cell coordinates for cleanup of hover-related display
 */

/**
 * @typedef {(cell: HTMLElement) => void} CellClassClearer
 * Callback to clear CSS classes from a cell.
 * @description Custom strategy for class clearing used during board reset operations
 */

import { bh } from '../terrains/all/js/bh.js'
import { Terrain } from '../terrains/all/js/terrain.js'
import { ScoreUI } from './ScoreUI.js'
import { CellUI } from './cellUI.js'
import { LoadOut } from './LoadOut.js'
import { gameStatus } from './StatusUI.js'
import { Delay } from '../core/Delay.js'
import { CellClassManager } from './helpers/CellClassManager.js'
import { BoardConfigurator } from './helpers/BoardConfigurator.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'
import { GridBoard } from './gridBoard.js'

export const gameHost = {
  containerWidth: 574
}

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
 * - gridCellAt() / #cellDivAt(): Cell element access with/without validation
 * - buildBoard() / buildBoardPrint(): Grid initialization for interactive/print display
 * - #colorizeCell() / _detectAndApplyEdges(): Terrain coloring and edge detection
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
   * @description Creates references to board DOM element, score UI, and initializes state flags.
   * Board element ID format: "{territory}-board", Title element: "{territory}-title"
   */
  constructor (territory, title) {
    this.grid = GridBoard.create(territory)
    this.score = new ScoreUI(territory)
    this.territory = territory
    this.territoryTitle = title
    this.placingShips = false
    this.containerWidth = gameHost.containerWidth
    this.isPrinting = false
    this.showShips = false
  }

  get board () {
    return this.grid?.board
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
    if (bh.mapHeading) {
      this.showTitle(bh.mapHeading)
    }
  }

  /**
   * Set the board title text to the current fleet heading.
   * @returns {void}
   */
  showFleetTitle () {
    if (bh.fleetHeading) {
      this.showTitle(bh.fleetHeading)
    }
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
   * @param {'SCREEN'|'LIST'|'PRINT'} mode - Display mode identifier
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @param {number} [containerWidthOverride] - Optional container width (defaults to this.containerWidth)
   * @returns {number} Cell size in pixels
   * @throws {Error} If mode is not recognized (must be SCREEN, LIST, or PRINT)
   */
  #calculateCellSize (mode, map, containerWidthOverride) {
    const config = /** @type {SurroundingStrategy|undefined} */ (
      WatersUI.CELL_SIZE_CONFIG[mode]
    )
    if (!config) throw new Error(`Unknown cell size mode: ${mode}`)

    const currentMap = map || bh.map
    if (!currentMap) throw new Error('Map is not available')
    const width =
      mode === 'PRINT' ? 600 : containerWidthOverride || this.containerWidth
    const divisor = config.getDivisor(/** @type {GridMap} */ (currentMap))
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
   * Retrieves grid cell element at coordinates with validation.
   * Throws error if cell not found to catch coordinate errors early.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {HTMLDivElement} Cell element (guaranteed valid)
   * @throws {Error} If cell at coordinates is invalid or missing
   */
  gridCellAt (y, x) {
    const result = this.grid.node(x, y)
    if (result?.classList) {
      return /** @type {HTMLDivElement} */ (result)
    }
    throw new Error(`Invalid cell at ${x},${y}: ${JSON.stringify(result)}`)
  }

  /**
   * Applies async effects to multiple cells with random delays.
   * @param {Array<[HTMLDivElement, number, number, any]>} cells - Cells with coordinates and power
   * @param {CellEffectCallback} effect - Async callback for each cell
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
   * @param {CellEffectCallback} effect - Async callback
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
    for (const [x, y] of ship.cells) {
      const board = this.board
      if (!board) return
      const cell =
        // @ts-ignore - colorMaps type incompatibility across modules
        CellUI.nodeAt(/** @type {HTMLDivElement} */ (board), x, y, colorMaps)
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
   * @param {CellClassClearer} [classClear] - Function to clear cell classes (defaults to clearCell)
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
   * Marks a cell at coordinates as sunk.
   * @param {number} y - Row index
   * @param {number} x - Column index
   * @param {string} letter - Ship letter
   * @returns {void}
   */
  cellSunkAt (x, y, letter) {
    const cell = this.grid.node(x, y)
    if (cell) {
      this.displayAsSunk(/** @type {HTMLDivElement} */ (cell), letter)
    }
  }

  /**
   * Marks a cell as hit at specified coordinates.
   * Applied when enemy successfully targets a location.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @param {string} [damageType] - Damage indicator class (e.g., 'skull')
   * @returns {void}
   */
  cellHit (x, y, damageType) {
    const cell = this.grid.node(x, y)
    CellClassManager.applyEnemyHitCellState(cell, damageType)
    this._clearCellText(cell)
  }

  /**
   * Reveals a cell with semi-visibility indicator.
   * Semi means cell is revealed but not confirmed as hit or miss yet.
   * Returns result code for game logic based on cell state.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {number|Object} Result code: LoadOut.noResult if already revealed, LoadOut.missResult otherwise
   */
  cellSemiReveal (x, y) {
    const cell = this.grid.node(x, y)

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
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   */
  cellHintReveal (y, x) {
    const cell = this.grid.node(x, y)

    if (cell == null || !CellClassManager.applyHintState(cell)) {
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
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   */
  cellWeaponDeactivate (x, y) {
    const cell = this.grid.nodeAt(x, y)
    if (cell == null) return
    CellClassManager.deactivateWeapon(cell)
  }

  /**
   * Deactivates temporary hint display on a cell.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   */
  cellHintDeactivate (x, y) {
    const cell = this.grid.nodeAt(x, y)
    if (cell == null) return
    CellClassManager.deactivateTempHint(cell)
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
   * Removes and reapplies terrain coloring to cell at coordinates.
   * Used when terrain has changed and colors need refresh.
   *
   * @param {number} x - Column coordinate (0-indexed)
   * @param {number} y - Row coordinate (0-indexed)
   * @returns {void}
   * @public
   */
  recolor (x, y) {
    const board = this.board
    if (board) {
      const cellUI = CellUI.fromBoard(
        /** @type {HTMLDivElement} */ (board),
        x,
        y
      )
      if (cellUI) {
        cellUI.recolor()
      }
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
    const cellUI = CellUI.fromHtmlElement(/** @type {HTMLDivElement} */ (cell))
    cellUI.recolor()
  }

  /**
   * Builds board grid for print output with labels.
   * Creates grid with row/column labels for printing.
   *
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  buildBoardPrint (map) {
    GridBoard.createPrintableGrid(this.board, map)
  }

  /**
   * Builds board grid for interactive display with optional click handlers.
   * Creates grid cells and binds click events if handler provided.
   *
   * @param {((row: number, col: number, event: MouseEvent) => void)|undefined} [onClickCell] - Click handler (row, col) bound
   * @param {Object} [thisRef] - Context object for click handler binding
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   * @description onClickCell will be called with (row, column) coordinates after binding with thisRef context
   */
  buildBoard (onClickCell, thisRef, map) {
    GridBoard.createScreenGrid(this.board, onClickCell, thisRef, map)
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
   * Clears cell visuals across entire board using provided strategy.
   * Generic method applying custom clearing callback and detail level to all cells.
   *
   * @param {'none'|'content'|'all'} details - What to clear: 'none', 'content', or 'all'
   * @param {CellClassClearer} [classClearer] - Function to clear cell classes
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

  /**
   * Removes all display-related CSS classes from board cells.
   * Clears visual indicators used during display/reveal phases.
   *
   * @returns {void}
   */
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
   * Normalizes M/T types to X type for display aggregation.
   *
   * @param {Ship[]} ships - Array of ship objects
   * @returns {Object<string, number>} Map of unit type to count (e.g., {A: 4, S: 2, X: 1})
   * @private
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
   * @param {Object<string, {shape: Object, count: number}>} group - Group object keyed by ship letter
   * @param {Ship} ship - Ship object with letter and shape() method
   * @returns {void}
   * @private
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
   * @returns {Object<string, Object<string, {shape: Object, count: number}>>} Ships grouped by type:
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
   * @returns {HTMLDivElement} The tray container element (never null when found)
   * @throws {Error} If type is unknown or tray element not found in DOM
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
   * Notes display unit descriptions and stats for UI feedback.
   *
   * @param {string} type - Unit type identifier (A, S, X, G, W, or M/T for special)
   * @returns {HTMLDivElement|null} The notes container element, or null if not found
   * @throws {Error} If type is unknown or not in NOTES_TYPE_MAP
   */
  getNotesOfType (type) {
    const notesId = NOTES_TYPE_MAP[type]
    if (!notesId) {
      throw new Error('Unknown type for ' + type)
    }
    return /** @type {HTMLDivElement|null} */ (document.getElementById(notesId))
  }
}
