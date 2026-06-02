import { bh } from '../terrains/all/js/bh.js'
import { CellClassManager } from './helpers/CellClassManager.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'
const startCharCode = 65

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
/** @enum {string} */
const UI_CLASSES = {
  HIDDEN: 'hidden',
  DESTROYED: 'destroyed',
  HIT: 'hit',
  PLACED: 'placed',
  ACTIVE: 'active',
  EMPTY: 'empty',
  WEAPON: 'weapon',
  MEDIUM: 'medium',
  SMALL: 'small',
  ALT: 'alt'
}

export class CellUI {
  /**
   * Initializes a new CellUI instance for a single game board cell.
   * Associates a DOM element with grid coordinates and optional map reference.
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
   * Returns the child element corresponding to the calculated grid index.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {HTMLDivElement|null} DOM element at coordinates or null if not found
   */
  static nodeAt (board, x, y, map) {
    const currentMap = map || bh.map
    return /** @type {HTMLDivElement|null} */ (
      board?.children?.[this.gridIndex(x, y, currentMap)]
    )
  }

  /**
   * Retrieves the DOM element at specified board coordinates with validation.
   * Throws error if coordinates are invalid or element not found.
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
    throw new Error(
      `Invalid coordinates (${x}, ${y}) for map of size ${currentMap.cols}x${currentMap.rows}`
    )
  }

  /**
   * Displays surrounding ship cell attributes at specified coordinates.
   * Delegates to ShipCellDisplayer to render ship occupancy and attributes.
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
   * Looks up the DOM element and constructs a CellUI wrapper around it.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} New CellUI instance wrapping the board cell element
   */
  static fromBoard (board, x, y, map) {
    const currentMap = map || bh.map
    return new CellUI(x, y, CellUI.node(board, x, y, currentMap), currentMap)
  }

  /**
   * Creates a CellUI instance from a DOM element.
   * Extracts coordinates from element's data attributes and constructs instance.
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
   * @static
   * @param {HTMLDivElement} node - DOM element with coordinate data attributes
   * @returns {{x: number, y: number}} Object with extracted x and y coordinates
   */
  static getCoords (node) {
    const y = Number.parseInt(node.dataset.r ?? '0', 10)
    const x = Number.parseInt(node.dataset.c ?? '0', 10)
    return { x, y }
  }

  /**
   * Creates and appends an empty cell element to a board.
   * Constructs a div with 'cell empty' class and appends to board container.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @returns {void}
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
   * Displays inverted row index (maxRows - row) to match chess notation.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} maxRows - Total row count for calculating display index
   * @param {number} row - Row index (0-based) to create label for
   * @returns {void}
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
   * Displays column as uppercase letter (A, B, C, etc.) based on position.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} column - Column index (0-based) to create label for
   * @returns {void}
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
   * Does not append to board; use createAndAppendTo for appending.
   * @static
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} New CellUI instance (not yet appended)
   */
  static createAt (x, y, map) {
    const cell = document.createElement('div')
    cell.className = 'cell'
    return new CellUI(x, y, cell, map)
  }

  /**
   * Marks a friendly weapon rack cell with weapon CSS class if equipped.
   * Queries ship for weapon at coordinates and adds WEAPON class if present.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {Ship} ship - Ship object with weapon rack information
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {void}
   */
  static markFriendlyWeapon (board, x, y, ship, map) {
    const weaponSlot = ship.rackAt?.(x, y)
    if (weaponSlot) {
      const cell = this.node(board, x, y, map)
      if (cell) {
        cell.classList.add(UI_CLASSES.WEAPON)
      }
    }
  }

  /**
   * Marks all weapon rack cells for a ship with weapon CSS class.
   * Iterates through ship's cells and applies weapon marking to each.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {Ship} ship - Ship object with weapon rack and cell occupation data
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {void}
   */
  static markShipsWeapons (board, ship, map) {
    if (!ship.cells) return

    for (const [x, y] of ship.cells) {
      CellUI.markFriendlyWeapon(board, x, y, ship, map)
    }
  }

  /**
   * Creates a CellUI instance and appends it to a board with terrain coloring.
   * Fully initializes cell with coordinates, coloring, and optional click handler.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @param {((event: MouseEvent) => void)|null} [onClick] - Optional click event handler
   * @returns {CellUI} New CellUI instance appended to board
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
   * @instance
   * @returns {{x: number, y: number}} Object with extracted x and y coordinates
   */
  getCoords () {
    return CellUI.getCoords(this.node)
  }

  /**
   * Gets the map configuration for this cell.
   * Lazy-loads bh.map if no map was provided during construction.
   * @instance
   * @returns {GridMap} Map configuration object
   */
  get map () {
    if (this._map) return this._map

    this._map = bh.map
    return this._map
  }

  /**
   * Calculates linear array index from 2D grid coordinates.
   * Uses standard row-major ordering: index = (row * columnCount) + column.
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
   * @static
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} map - Map configuration with cols/rows dimensions
   * @returns {number} Linear array index in flattened grid representation
   */
  static gridIndex (x, y, map) {
    return y * map.cols + x
  }

  /**
   * Validates if coordinates are within map bounds.
   * Returns true if x and y are within [0, cols) and [0, rows) respectively.
   * @static
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} map - Map configuration with cols/rows dimensions
   * @returns {boolean} True if coordinates are valid, false otherwise
   */
  static isValid (x, y, map) {
    const m = map || bh.map
    return x >= 0 && x < m.cols && y >= 0 && y < m.rows
  }

  /**
   * Checks if this cell contains land terrain.
   * Delegates to map's isLandAt method for terrain classification.
   * @instance
   * @returns {boolean} True if cell is land, false if water or other terrain
   */
  get isLandAt () {
    return this.map.isLandAt(this.x, this.y)
  }

  /**
   * Applies terrain coloring and edge detection CSS classes to this cell.
   * Determines cell boundaries (land/water edges) and applies corresponding classes.
   * Called during board initialization and when terrain changes.
   * @instance
   * @returns {void}
   */
  colorize () {
    const { newTags, oldTags } = this.map.tagsAt(this.x, this.y)
    this.node.classList.remove(...oldTags)
    this.node.classList.add(...newTags)
  }

  /**
   * Applies terrain coloring to a cell at specified board coordinates.
   * Static convenience wrapper that creates temporary CellUI and applies coloring.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} CellUI instance for the cell at coordinates
   */
  static colorize (board, x, y, map) {
    const cell = CellUI.fromBoard(board, x, y, map)
    cell.colorize()
    return cell
  }

  /**
   * Sets coordinate data attributes on this cell's DOM element.
   * Writes coordinates to data-r (row/y) and data-c (column/x) as strings.
   * @instance
   * @param {number} [x=this.x] - Column coordinate (uses instance x if not provided)
   * @param {number} [y=this.y] - Row coordinate (uses instance y if not provided)
   * @returns {void}
   * @example
   * const cell = new CellUI(5, 10, domElement);
   * cell.setCoords(7, 12); // Sets data-c='7' and data-r='12'
   */
  setCoords (x = this.x, y = this.y) {
    this.node.dataset.r = String(y)
    this.node.dataset.c = String(x)
  }

  /**
   * Reapplies terrain coloring to a cell at specified board coordinates.
   * Static convenience wrapper for recoloring previously colorized cells.
   * @static
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} CellUI instance for the recolored cell
   */
  static recolor (board, x, y, map) {
    const cell = CellUI.fromBoard(board, x, y, map)
    cell.recolor()
    return cell
  }

  /**
   * Removes all edge-related CSS classes from this cell.
   * Clears terrain edge detection classes before reapplying coloring.
   * @instance
   * @returns {void}
   */
  uncolor () {
    const edgeClasses = Object.values(CellClassManager.CELL_CLASSES.edge)
    this.node.classList.remove(...edgeClasses)
  }

  /**
   * Reapplies terrain coloring and edge detection to this cell.
   * Clears existing edge classes and recomputes terrain coloring.
   * @instance
   * @returns {void}
   */
  recolor () {
    this.uncolor()
    this.colorize()
  }
}
