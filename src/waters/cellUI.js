/**
 * @fileoverview CellUI DOM element wrapper for board cell management and rendering.
 * Provides unified interface for creating, querying, and styling individual game board cells.
 * Handles cell coordinate conversion, terrain coloring, weapon marking, and ship attribute display.
 * Supports both screen display and printable grid creation with configurable terrain mapping.
 *
 * @module cellUI
 * @requires src/terrains/all/js/bh.js - Biome/terrain configuration
 * @requires src/waters/helpers/CellClassManager.js - CSS class management utilities
 * @requires src/waters/helpers/ShipCellDisplayer.js - Ship cell rendering
 */

import { bh } from '../terrains/all/js/bh.js'
import { CellClassManager } from './helpers/CellClassManager.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'

/** @type {number} Character code for 'A' (65), used for column label generation */
const startCharCode = 65

/**
 * @typedef {Object} CoordsPair
 * Represents a 2D coordinate pair.
 * @property {number} x - Column coordinate (0-based, x-axis)
 * @property {number} y - Row coordinate (0-based, y-axis)
 */

/**
 * @typedef {Object} TerrainTagsResult
 * Result of terrain tag query for cell display styling.
 * @property {string[]} newTags - CSS classes to add for terrain edges and boundaries
 * @property {string[]} oldTags - CSS classes to remove before applying newTags
 */

/**
 * @typedef {Object} GridMap
 * Represents a game map configuration with terrain and cell query methods.
 * @property {number} rows - Number of rows in the grid (y-dimension; 0 to rows-1)
 * @property {number} cols - Number of columns in the grid (x-dimension; 0 to cols-1)
 * @property {(x: number, y: number) => boolean} isLandAt - Predicate: true if cell contains land terrain
 * @property {(x: number, y: number) => boolean} isWaterAt - Predicate: true if cell contains water/default terrain
 * @property {(x: number, y: number) => TerrainTagsResult} tagsAt - Returns terrain CSS classes for cell edges
 * @property {string} title - Display title/name of the map for UI
 * @property {(classList: DOMTokenList, x: number, y: number) => void} tagCell - Applies terrain CSS classes to element's classList
 */

/**
 * @typedef {Object} ShipRack
 * Ship weapon rack configuration.
 * @property {string} letter - Weapon type identifier
 * @property {number} ammo - Remaining ammunition count
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
 * @property {(x: number, y: number) => ShipRack|null} rackAt - Method: returns weapon rack at coordinates or null if unequipped
 * @property {() => void} reset - Method: resets ship to initial state (unsunk, no damage, repairs)
 */
/**
 * CSS class names for cell styling and state indication.
 * Applied to cell elements to represent terrain, ship status, and combat state.
 *
 * @enum {string}
 * @const
 */
const UI_CLASSES = {
  /** Cell is hidden (unrevealed in opponent view, used for setup) */
  HIDDEN: 'hidden',
  /** Cell contains destroyed ship or has been hit in combat */
  DESTROYED: 'destroyed',
  /** Cell has been hit by opponent weapon fire */
  HIT: 'hit',
  /** Ship is placed on the board during setup phase */
  PLACED: 'placed',
  /** Cell is currently active/selected in UI */
  ACTIVE: 'active',
  /** Cell is empty (no ship, unreachable, or display space) */
  EMPTY: 'empty',
  /** Cell contains ship weapon rack/attachment point */
  WEAPON: 'weapon',
  /** Cell represents medium-sized terrain feature */
  MEDIUM: 'medium',
  /** Cell represents small-sized terrain feature */
  SMALL: 'small',
  /** Cell uses alternate styling/rendering mode */
  ALT: 'alt'
}

export class CellUI {
  /**
   * Column coordinate (0-based, x-axis) of this cell on the board.
   * Set during construction, used for all coordinate-based operations.
   * @type {number}
   */
  x

  /**
   * Row coordinate (0-based, y-axis) of this cell on the board.
   * Set during construction, used for all coordinate-based operations.
   * @type {number}
   */
  y

  /**
   * DOM element representing this cell on the rendered game board.
   * Contains terrain classes, ship content, weapon indicators, and hit marks.
   * @type {HTMLDivElement}
   */
  node

  /**
   * Cached map configuration for terrain queries and bounds validation.
   * Lazy-loads from bh.map on first access if not provided in constructor.
   * @type {GridMap|undefined}
   * @private
   */
  _map

  /**
   * Initializes a new CellUI instance for a single game board cell.
   * Associates a DOM element with grid coordinates and optional map reference.
   * Sets coordinate properties x, y and stores DOM node reference.
   *
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {HTMLDivElement} node - DOM element representing the cell
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   */
  constructor (x, y, node, map) {
    this.y = y
    this.x = x

    if (map) {
      this._map = map
    }
    this.node = node
  }

  /**
   * Retrieves the DOM element at specified board coordinates.
   * Returns the child element corresponding to the calculated grid index (row-major order).
   * Returns null if map is undefined or element not found (forgiving failure).
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {HTMLDivElement|null} DOM element at coordinates or null if not found
   */
  static nodeAt (board, x, y, map) {
    const currentMap = map || bh.map
    if (!currentMap) return null
    return /** @type {HTMLDivElement|null} */ (
      board?.children?.[this.gridIndex(x, y, currentMap)]
    )
  }

  /**
   * Retrieves the DOM element at specified board coordinates with validation.
   * Throws error if coordinates are invalid or element not found (strict failure).
   * Used where valid coordinates are guaranteed (setup phase).
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {HTMLDivElement} DOM element at coordinates
   * @throws {Error} If coordinates are invalid or element not found at coordinates
   */
  static node (board, x, y, map) {
    const currentMap = map || bh.map
    if (this.isValid(x, y, currentMap)) {
      const node = this.nodeAt(board, x, y, currentMap)
      if (node) return node
      throw new Error(`child not found in board at coordinates (${x}, ${y})`)
    }
    const mapInfo = currentMap
      ? `for map of size ${currentMap.cols}x${currentMap.rows}`
      : 'with undefined map'
    throw new Error(`Invalid coordinates (${x}, ${y}) ${mapInfo}`)
  }

  /**
   * Displays surrounding ship cell attributes at specified coordinates.
   * Delegates to ShipCellDisplayer to render ship occupancy and attributes (letter, variant, weapon indicator).
   * Silently skips if cell not found at coordinates.
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {Ship} ship - Ship object with cell occupation data
   * @returns {void}
   */
  static surroundShipAt (board, x, y, ship) {
    const cell = this.nodeAt(board, x, y)
    // @ts-ignore - ship type compatible with ShipCellDisplayer.Ship
    ShipCellDisplayer.displaySurroundAttributes(cell, ship, x, y)
  }

  /**
   * Clears text content from this cell element.
   * Removes all child nodes and text from the DOM element.
   * @private
   * @returns {void}
   */
  clearText () {
    this.node.textContent = ''
  }

  /**
   * Creates a CellUI instance from a board element at specified coordinates.
   * Looks up the DOM element via the static node method and wraps in new CellUI instance.
   * Throws error if coordinates invalid or element not found (strict validation).
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} New CellUI instance wrapping the board cell element
   * @throws {Error} If coordinates invalid or element not found at coordinates
   */
  static fromBoard (board, x, y, map) {
    const currentMap = map || bh.map
    return new CellUI(x, y, CellUI.node(board, x, y, currentMap), currentMap)
  }

  /**
   * Creates a CellUI instance from a DOM element.
   * Extracts coordinates from element's data attributes and constructs instance.
   * Assumes element is already present in the DOM with valid data-r and data-c attributes.
   *
   * @static
   * @param {HTMLDivElement} node - DOM element with data-r and data-c attributes
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} New CellUI instance wrapping the element
   */
  static fromHtmlElement (node, map) {
    const { x, y } = CellUI.getCoords(node)
    return new CellUI(x, y, node, map)
  }

  /**
   * Extracts x and y coordinates from a DOM element's dataset.
   * Reads data-c (column/x) and data-r (row/y) attributes as integers.
   * Returns {x: 0, y: 0} if attributes missing or non-numeric.
   *
   * @static
   * @param {HTMLDivElement} node - DOM element with coordinate data attributes
   * @returns {CoordsPair} Object with extracted x and y coordinates
   */
  static getCoords (node) {
    const y = Number.parseInt(node.dataset.r ?? '0', 10)
    const x = Number.parseInt(node.dataset.c ?? '0', 10)
    return { x, y }
  }

  /**
   * Creates and appends an empty cell element to a board.
   * Constructs a div with 'cell empty' class and appends to board container.
   * Used for filler/spacing cells in board layout.
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @returns {void}
   * @side-effects Appends new empty cell element to board
   */
  static createEmptyNodeAndAppendTo (board) {
    const cell = document.createElement('div')
    cell.className = 'cell empty'
    if (board) {
      board.appendChild(cell)
    }
  }

  /**
   * Creates and appends a row label cell to a board.
   * Displays inverted row index (maxRows - row) to match chess notation (rows numbered top-down).
   * Used for board coordinate labels along left edge.
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} maxRows - Total row count for calculating inverted display index
   * @param {number} row - Row index (0-based) to create label for
   * @returns {void}
   * @side-effects Appends new row label cell element to board with data-r attribute
   */
  static createRowLabelNodeAndAppendTo (board, maxRows, row) {
    const cell = document.createElement('div')
    cell.className = 'cell row-label'
    cell.dataset.r = String(row)
    cell.textContent = `${maxRows - row}`
    if (board) {
      board.appendChild(cell)
    }
  }

  /**
   * Creates and appends a column label cell to a board.
   * Displays column as uppercase letter (A, B, C, ..., Z, AA, AB, ...) based on position.
   * Used for board coordinate labels along top edge.
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} column - Column index (0-based) to create label for
   * @returns {void}
   * @side-effects Appends new column label cell element to board with data-c attribute
   */
  static createColLabelNodeAndAppendTo (board, column) {
    const cell = document.createElement('div')
    cell.className = 'cell col-label'
    cell.dataset.c = String(column)
    cell.textContent = String.fromCodePoint(startCharCode + column)
    if (board) {
      board.appendChild(cell)
    }
  }

  /**
   * Creates a CellUI instance for a board cell at specified coordinates.
   * Constructs new div element with 'cell' class but does not append to board.
   * Use createAndAppendTo for single-step creation and insertion.
   *
   * @static
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} New CellUI instance (not yet appended to board)
   */
  static createAt (x, y, map) {
    const cell = document.createElement('div')
    cell.className = 'cell'
    return new CellUI(x, y, cell, map)
  }

  /**
   * Marks a friendly weapon rack cell with weapon CSS class if equipped.
   * Queries ship for weapon at coordinates via rackAt method and adds WEAPON class if present.
   * Attempts lookup first via nodeAt, then falls back to dataset query if map unavailable.
   * Silently skips if cell cannot be found at coordinates (non-fatal failure).
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {Ship} ship - Ship object with weapon rack information (must have rackAt method)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {void}
   * @side-effects Adds UI_CLASSES.WEAPON to cell element's classList if equipped
   */
  static markFriendlyWeapon (board, x, y, ship, map) {
    const weaponSlot = ship.rackAt?.(x, y)
    if (weaponSlot) {
      // Try using nodeAt for flexible lookup (works with or without map)
      let cell = this.nodeAt(board, x, y, map)
      // If no map available, try looking up by data attributes instead
      if (!cell && board) {
        cell = board.querySelector(`[data-r="${y}"][data-c="${x}"]`)
      }
      if (cell) {
        cell.classList.add(UI_CLASSES.WEAPON)
      }
    }
  }

  /**
   * Marks all weapon rack cells for a ship with weapon CSS class.
   * Iterates through ship's cells and applies weapon marking to each via markFriendlyWeapon.
   * Early returns if ship.cells is not available/iterable.
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {Ship} ship - Ship object with weapon rack and cell occupation data
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {void}
   * @side-effects Adds UI_CLASSES.WEAPON to cell elements for all weapon-equipped cells in ship
   */
  static markShipsWeapons (board, ship, map) {
    if (!ship.cells) return

    for (const [x, y] of ship.cells) {
      CellUI.markFriendlyWeapon(board, x, y, ship, map)
    }
  }

  /**
   * Creates a CellUI instance and appends it to a board with terrain coloring.
   * Fully initializes cell with coordinates, terrain coloring, data attributes, and optional click handler.
   * Single method handles creation, setup, styling, and insertion for convenience.
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @param {((event: MouseEvent) => void)|null} [onClick] - Optional click event handler
   * @returns {CellUI} New CellUI instance appended to board
   * @side-effects Appends cell element to board, applies terrain coloring, attaches event listener if provided
   */
  static createAndAppendTo (board, x, y, map, onClick) {
    const cell = CellUI.createAt(x, y, map)

    cell.colorize()
    cell.setCoords(x, y)
    if (onClick && typeof onClick === 'function') {
      // @ts-ignore - event listener type checked at runtime
      cell.node.addEventListener('click', onClick)
    }
    board.appendChild(cell.node)
    return cell
  }

  /**
   * Extracts x and y coordinates from this cell's DOM element.
   * Reads data-c (column/x) and data-r (row/y) attributes as integers.
   * Delegates to static getCoords method.
   *
   * @instance
   * @returns {CoordsPair} Object with extracted x and y coordinates
   */
  getCoords () {
    return CellUI.getCoords(this.node)
  }

  /**
   * Gets the map configuration for this cell.
   * Lazy-loads from bh.map on first access if no map was provided during construction.
   * Uses cached result on subsequent accesses for performance.
   *
   * @instance
   * @returns {GridMap} Map configuration object for terrain queries and bounds validation
   */
  get map () {
    if (this._map) return this._map

    this._map = bh.map
    return this._map
  }

  /**
   * Calculates linear array index from 2D grid coordinates.
   * Uses standard row-major ordering: index = (row * columnCount) + column.
   * Instance method delegates to static method with this.map.
   *
   * @instance
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @returns {number} Linear array index in flattened grid representation
   */
  gridIndex (x, y) {
    return CellUI.gridIndex(x, y, this.map)
  }

  /**
   * Calculates linear array index from 2D grid coordinates.
   * Uses standard row-major ordering: index = (row * columnCount) + column.
   * Returns 0 if map is undefined (safe fallback for edge cases).
   *
   * @static
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Map configuration with cols/rows dimensions
   * @returns {number} Linear array index in flattened grid representation, or 0 if map undefined
   */
  static gridIndex (x, y, map) {
    if (!map) return 0
    return y * map.cols + x
  }

  /**
   * Validates if coordinates are within map bounds.
   * Returns true if x and y are within [0, cols) and [0, rows) respectively.
   * Returns false if map is undefined/unavailable (safe for optional maps).
   *
   * @static
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Map configuration with cols/rows dimensions
   * @returns {boolean} True if coordinates are valid within bounds, false otherwise
   */
  static isValid (x, y, map) {
    const m = map || bh.map
    if (!m) return false
    return x >= 0 && x < m.cols && y >= 0 && y < m.rows
  }

  /**
   * Checks if this cell contains land terrain.
   * Delegates to map's isLandAt method for terrain classification.
   *
   * @instance
   * @returns {boolean} True if cell is land terrain, false if water or other default terrain
   */
  get isLandAt () {
    return this.map.isLandAt(this.x, this.y)
  }

  /**
   * Applies terrain coloring and edge detection CSS classes to this cell.
   * Determines cell boundaries (land/water edges) and applies corresponding classes.
   * Queries map.tagsAt() to get terrain classes, removes old tags, adds new tags.
   * Called during board initialization and when terrain changes dynamically.
   *
   * @instance
   * @returns {void}
   * @side-effects Modifies this.node.classList with terrain CSS classes
   */
  colorize () {
    const { newTags, oldTags } = this.map.tagsAt(this.x, this.y)
    this.node.classList.remove(...oldTags)
    this.node.classList.add(...newTags)
  }

  /**
   * Applies terrain coloring to a cell at specified board coordinates.
   * Static convenience wrapper that locates cell element, wraps in CellUI, and applies coloring.
   * Useful for batch colorization of multiple cells without constructing individual CellUI instances.
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} CellUI instance for the cell at coordinates
   * @side-effects Modifies cell element's classList with terrain CSS classes
   */
  static colorize (board, x, y, map) {
    const cell = CellUI.fromBoard(board, x, y, map)
    cell.colorize()
    return cell
  }

  /**
   * Sets coordinate data attributes on this cell's DOM element.
   * Writes coordinates to data-r (row/y) and data-c (column/x) as strings.
   * Used during board initialization to enable CSS selectors and coordinate queries.
   *
   * @instance
   * @param {number} [x=this.x] - Column coordinate (uses instance x if not provided)
   * @param {number} [y=this.y] - Row coordinate (uses instance y if not provided)
   * @returns {void}
   * @side-effects Sets this.node.dataset.r and this.node.dataset.c attributes
   * @example
   * const cell = new CellUI(5, 10, domElement);
   * cell.setCoords(7, 12); // Sets data-c='7' and data-r='12'
   * cell.setCoords(); // Sets data-c='5' and data-r='10' (instance values)
   */
  setCoords (x = this.x, y = this.y) {
    this.node.dataset.r = String(y)
    this.node.dataset.c = String(x)
  }

  /**
   * Reapplies terrain coloring to a cell at specified board coordinates.
   * Static convenience wrapper for recoloring previously colorized cells without maintaining CellUI instance.
   * Useful for batch recoloration after terrain changes.
   *
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} CellUI instance for the recolored cell
   * @side-effects Removes old terrain edge classes and applies new terrain coloring to cell element
   */
  static recolor (board, x, y, map) {
    const cell = CellUI.fromBoard(board, x, y, map)
    cell.recolor()
    return cell
  }

  /**
   * Removes all edge-related CSS classes from this cell.
   * Clears terrain edge detection classes from CellClassManager.CELL_CLASSES.edge.
   * Used as preprocessing step before reapplying coloring.
   *
   * @instance
   * @returns {void}
   * @side-effects Removes terrain edge detection CSS classes from this.node.classList
   */
  uncolor () {
    const edgeClasses = Object.values(CellClassManager.CELL_CLASSES.edge)
    this.node.classList.remove(...edgeClasses)
  }

  /**
   * Reapplies terrain coloring and edge detection to this cell.
   * Clears existing edge classes via uncolor() then recomputes terrain coloring via colorize().
   * Used to refresh cell appearance when underlying map terrain changes.
   *
   * @instance
   * @returns {void}
   * @side-effects Removes old terrain edge classes and applies new terrain coloring
   */
  recolor () {
    this.uncolor()
    this.colorize()
  }
}
