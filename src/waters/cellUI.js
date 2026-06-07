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
export class NodeUI {
  /**
   * Retrieves the DOM element at specified board coordinates.
   * Calculates grid index from coordinates and retrieves corresponding child element.
   * Forgiving failure mode: returns null if map unavailable or element not found.
   * Safe for optional maps without throwing errors.
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap|null} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {HTMLDivElement|null} DOM element at coordinates or null if not found
   */
  static nodeAt (board, x, y, map) {
    const currentMap = map ?? /** @type {GridMap|null} */ (bh.map)
    if (!currentMap) return null
    const gridMap = /** @type {GridMap} */ (currentMap)
    return /** @type {HTMLDivElement|null} */ (
      board?.children?.[this.gridIndex(x, y, gridMap)]
    )
  }

  /**
   * Retrieves the DOM element at specified board coordinates with strict validation.
   * Throws detailed error if coordinates invalid or element not found.
   * Used where coordinates are guaranteed valid (setup phase).
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap|null} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {HTMLDivElement} DOM element at coordinates
   * @throws {Error} If coordinates are invalid or element not found at coordinates
   */
  static node (board, x, y, map) {
    const currentMap = map ?? /** @type {GridMap|null} */ (bh.map)
    if (this.isValid(x, y, currentMap)) {
      const node = this.nodeAt(board, x, y, currentMap)
      if (node) return node
      throw new Error(`child not found in board at coordinates (${x}, ${y})`)
    }
    const gridMap = /** @type {GridMap} */ (currentMap)
    const mapInfo = currentMap
      ? `for map of size ${gridMap.cols}x${gridMap.rows}`
      : 'with undefined map'
    throw new Error(`Invalid coordinates (${x}, ${y}) ${mapInfo}`)
  }

  /**
   * Displays surrounding ship cell attributes at specified coordinates.
   * Delegates to ShipCellDisplayer to render ship letter, variant, and weapon indicator.
   * Non-fatal: silently skips if cell not found at coordinates.
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {Ship} ship - Ship object with letter, variant, and cell occupation data
   * @returns {void}
   */
  static surroundShipAt (board, x, y, ship) {
    const cell = this.nodeAt(board, x, y)
    // @ts-ignore - ship type compatible with ShipCellDisplayer.Ship
    ShipCellDisplayer.displaySurroundAttributes(cell, ship, x, y)
  }
  /**
   * Extracts x and y coordinates from a DOM element's dataset.
   * Reads data-c (column/x) and data-r (row/y) HTML5 data attributes.
   * Parses as base-10 integers; defaults to 0 if missing or non-numeric.
   *
   * @static
   * @public
   * @param {HTMLDivElement} node - DOM element with coordinate data attributes
   * @returns {CoordsPair} Object with extracted x and y coordinates
   */
  static getXY (node) {
    const y = Number.parseInt(node.dataset.r ?? '0', 10)
    const x = Number.parseInt(node.dataset.c ?? '0', 10)
    return { x, y }
  }
  /**
   * Calculates linear array index from 2D grid coordinates.
   * Uses standard row-major ordering: index = (row * columnCount) + column.
   * Returns 0 if map is undefined (safe fallback for edge cases).
   *
   * @static
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap|null} [map] - Map configuration with cols/rows dimensions
   * @returns {number} Linear array index in flattened grid representation, or 0 if map undefined
   */
  static gridIndex (x, y, map) {
    if (!map) return 0
    const gridMap = /** @type {GridMap} */ (map)
    return y * gridMap.cols + x
  }

  /**
   * Validates if coordinates are within map bounds.
   * Returns true if x and y are within [0, cols) and [0, rows) respectively.
   * Returns false if map is undefined/unavailable (safe for optional maps).
   *
   * @static
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap|null|undefined} [map] - Map configuration with cols/rows dimensions
   * @returns {boolean} True if coordinates are valid within bounds, false otherwise
   */
  static isValid (x, y, map) {
    const m = map ?? /** @type {GridMap|null} */ (bh.map)
    if (!m) return false
    const gridMap = /** @type {GridMap} */ (m)
    return x >= 0 && x < gridMap.cols && y >= 0 && y < gridMap.rows
  }
  /**
   * Creates and appends a row label cell to a board.
   * Displays inverted row index (maxRows - row) for chess-style notation.
   * Used for coordinate labels along left edge of board.
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} maxRows - Total row count for display inversion calculation
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
   * Displays column as uppercase letter (A, B, C, ..., Z, AA, AB, ...).
   * Used for coordinate labels along top edge of board.
   *
   * @static
   * @public
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
   * Marks a friendly weapon rack cell with weapon CSS class if equipped.
   * Checks if ship has weapon at coordinates; applies WEAPON class if armed.
   * Attempts DOM lookup via nodeAt, falls back to dataset query if map unavailable.
   * Non-fatal: silently skips if cell not found at coordinates.
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {Ship} ship - Ship object with rackAt method for weapon detection
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {void}
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
   * Updates cell CSS classes: adds newClasses, removes oldClasses.
   * Optimized to skip classList operations if arrays are empty (no-op).
   * Used for efficient batch class updates during cell state transitions.
   *
   * **Behavior**:
   * - Removes all classes in oldClasses if array non-empty
   * - Adds all classes in newClasses if array non-empty
   * - Performs no DOM updates if both arrays empty (optimization)
   *
   * **Performance**:
   * - classList.remove(...oldClasses) is O(n) where n = oldClasses.length
   * - classList.add(...newClasses) is O(m) where m = newClasses.length
   * - Total: O(n+m) DOM operations
   *
   * **Side Effects**:
   * - Modifies this.node.classList
   * - Triggers CSS rule evaluation for removed and added classes
   * - May cause layout recalculation depending on CSS specificity
   *
   * @instance
   * @public
   * @param {string[]} oldClasses - Array of class names to remove (default: empty array)
   * @param {string[]} newClasses - Array of class names to add (default: empty array)
   * @returns {void}
   */
  static updateCellClasses (node, oldClasses = [], newClasses = []) {
    if (oldClasses.length) {
      node.classList.remove(...oldClasses)
    }
    if (newClasses.length) {
      node.classList.add(...newClasses)
    }
  }
  /**
   * Adds weapon activation styling to a cell.
   * Applies weapon classes, rotation, and optional contrast for visual emphasis.
   *
   * @param {HTMLDivElement} cell - DOM element to style
   * @param {string} rotationClass - Rotation indicator class (e.g., 'turn2')
   * @param {string} [extraClass] - Additional class to apply (optional)
   */
  addWeaponClass (cell, rotationClass, extraClass) {
    const classesToAdd = ['weapon', 'active']
    if (extraClass) classesToAdd.push(extraClass)
    if (rotationClass) classesToAdd.push(rotationClass)

    this.updateCellClasses(cell, ['wake'], classesToAdd)
    cell.textContent = ''
  }
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
   * Sets coordinate properties x, y and stores DOM node reference for later operations.
   *
   * **Construction Pattern**:
   * - Preferred: Use static factory methods (fromBoard, fromHtmlElement, createAt)
   * - Direct: Use constructor when DOM element already obtained
   * - Lazy map loading: If map omitted, falls back to bh.map on first access
   *
   * @constructor
   * @param {number} x - Column coordinate (0-based, x-axis, horizontal)
   * @param {number} y - Row coordinate (0-based, y-axis, vertical)
   * @param {HTMLDivElement} node - DOM element representing the cell
   * @param {GridMap} [map] - Optional map configuration; lazy-loads from bh.map if omitted
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
   * Creates a CellUI instance from a board element at specified coordinates.
   * Looks up the DOM element via NodeUI.node (strict validation) and wraps in instance.
   * Throws error if coordinates invalid or element not found.
   *
   * **Use Cases**:
   * - Creating from valid board coordinates where element is guaranteed
   * - Setup phase where coordinate validity is pre-verified
   * - Batch operations on known valid coordinates
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} New CellUI instance wrapping the board cell element
   * @throws {Error} If coordinates invalid or element not found at coordinates
   */
  static fromBoard (board, x, y, map) {
    const currentMap = map || /** @type {GridMap|null} */ (bh.map)
    return new CellUI(
      x,
      y,
      NodeUI.node(board, x, y, currentMap),
      currentMap ?? undefined
    )
  }

  /**
   * Creates a CellUI instance from an existing DOM element.
   * Extracts coordinates from element's data-r and data-c attributes.
   * Assumes element is already present in DOM with valid coordinate data.
   *
   * **Data Attribute Mapping**:
   * - data-c → x (column, 0-based horizontal)
   * - data-r → y (row, 0-based vertical)
   *
   * **Use Cases**:
   * - Wrapping existing board elements from event handlers
   * - Accessing cells already in DOM without re-lookup
   * - Converting raw HTML elements to CellUI for operations
   *
   * @static
   * @public
   * @param {HTMLDivElement} node - DOM element with data-r and data-c attributes
   * @param {GridMap|null} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} New CellUI instance wrapping the element
   */
  static fromHtmlElement (node, map) {
    const { x, y } = NodeUI.getXY(node)
    return new CellUI(x, y, node, map)
  }

  /**
   * Creates and appends an empty cell element to a board.
   * Constructs a div with 'cell empty' class and appends to board container.
   * Used for filler/spacing cells in board layout and page structure.
   *
   * **DOM Structure Created**:
   * - Element type: div
   * - Classes: 'cell', 'empty'
   * - Content: empty
   * - Role: filler/spacer for grid structure
   *
   * @static
   * @public
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
   * Creates a CellUI instance for a board cell at specified coordinates.
   * Constructs new div element with 'cell' class but does not append to board.
   * Use createAndAppendTo for combined creation and insertion.
   *
   * **Created Element**:
   * - Element type: div
   * - Classes: 'cell' (no coordinates or content yet)
   * - Status: not yet appended to DOM
   * - Next steps: colorize, setCoords, append
   *
   * @static
   * @public
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
   * Marks all ship cells in loaded board with friendly weapon CSS indicators.
   * Iterates through ships in ship.XYs and calls markFriendlyWeapon for each cell.
   * Safely handles missing or empty ship cells arrays (non-fatal).
   *
   * **Iteration Process**:
   * 1. Returns early if ship.cells unavailable/undefined
   * 2. Iterates through [row, col] coordinates in ship.cells
   * 3. Calls static markFriendlyWeapon for each coordinate, converting to (col, row)
   * 4. Weapon CSS class added only if ship has weapon at that cell
   *
   * **Side Effects**:
   * - Adds WEAPON class to cells where ship has armed weapon racks
   * - Updates cell classList for visual indication
   * - No change if ship.cells unavailable or no weapons equipped
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {Ship} ship - Ship object with weapon racks and cell occupation data
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {void}
   */
  static markShipsWeapons (board, ship, map) {
    if (!ship.cells) return

    for (const [x, y] of ship.XYs) {
      NodeUI.markFriendlyWeapon(board, x, y, ship, map)
    }
  }

  /**
   * Creates a CellUI instance and appends it to a board with terrain coloring.
   * Fully initializes cell with coordinates, terrain coloring, data attributes, and optional click handler.
   * Single method handles creation, setup, styling, and insertion for convenience.
   *
   * **Complete Setup Process**:
   * 1. Creates div element with 'cell' class
   * 2. Applies terrain coloring and edge detection
   * 3. Sets data-r and data-c coordinate attributes
   * 4. Attaches click event listener if handler provided
   * 5. Appends element to board container
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap|null} [map] - Optional map configuration; defaults to bh.map if omitted
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
   * Clears text content from this cell element.
   * Removes all child nodes and text from the DOM element.
   * Non-destructive: only clears displayed text, not CSS classes or element structure.
   *
   * **Side Effects**:
   * - Sets this.node.textContent to empty string
   * - Removes displayed content (ship letters, coordinates, etc.)
   * - DOM element remains intact for future modifications
   *
   * @instance
   * @public
   * @returns {void}
   */
  clearText () {
    this.node.textContent = ''
  }
  /**
   * Extracts x and y coordinates from this cell's DOM element.
   * Reads data-c (column/x) and data-r (row/y) attributes as integers.
   * Delegates to static getXY method for coordinate extraction.
   *
   * @instance
   * @public
   * @returns {CoordsPair} Object with extracted x and y coordinates
   */
  getXY () {
    return NodeUI.getXY(this.node)
  }

  /**
   * Gets the map configuration for this cell.
   * Lazy-loads from bh.map on first access if no map was provided during construction.
   * Uses cached result on subsequent accesses for performance.
   *
   * **Lazy Loading Strategy**:
   * - If _map set during construction, returns cached value
   * - Otherwise, queries bh.map and caches result
   * - Returns undefined if bh.map unavailable
   *
   * @instance
   * @public
   * @returns {GridMap|undefined} Map configuration object for terrain queries and bounds validation
   */
  get map () {
    if (this._map) return this._map

    const bhMap = /** @type {GridMap|null} */ (bh.map)
    this._map = bhMap ?? undefined
    return this._map
  }

  /**
   * Calculates linear array index from 2D grid coordinates.
   * Uses standard row-major ordering: index = (row * columnCount) + column.
   * Instance method delegates to static method with this.map configuration.
   *
   * **Index Calculation**:
   * - Flattens 2D coordinates to 1D array index
   * - Allows direct access to grid arrays without nested loops
   * - Used for bitboard operations and flat array access
   *
   * @instance
   * @public
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @returns {number} Linear array index in flattened grid representation
   */
  gridIndex (x, y) {
    return NodeUI.gridIndex(x, y, this.map)
  }

  /**
   * Checks if this cell contains land terrain.
   * Delegates to map's isLandAt method for terrain classification.
   * Returns false if map unavailable (water is default).
   *
   * **Terrain Types**:
   * - Land: returns true if terrain is classified as land
   * - Water: returns false for water and all other terrains
   * - Used for placement validation and rendering context
   *
   * @instance
   * @public
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
   * **Coloring Process**:
   * 1. Queries map.tagsAt(x, y) for terrain type
   * 2. Gets oldTags from previous state and newTags for current state
   * 3. Removes oldTags from element.classList
   * 4. Adds newTags to element.classList
   * 5. CSS rules apply corresponding colors for water/land/special terrain
   *
   * **Side Effects**:
   * - Modifies this.node.classList with terrain CSS classes
   * - Updates element appearance for visual feedback
   *
   * @instance
   * @public
   * @returns {void}
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
   * **Convenience Method**:
   * - Combines fromBoard + colorize into single call
   * - Simplifies board initialization loops
   * - Returns CellUI for method chaining if needed
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap|null} [map] - Optional map configuration; defaults to bh.map if omitted
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
   * Used during board initialization to enable CSS selectors and coordinate queries.
   *
   * **Attribute Format**:
   * - data-r: "y" (row, stringified integer)
   * - data-c: "x" (column, stringified integer)
   * - Can be queried via CSS selectors: [data-r="5"][data-c="10"]
   *
   * **Usage Patterns**:
   * - setCoords(): uses instance x, y values
   * - setCoords(7, 12): explicit coordinate override
   * - Used after cell creation and before appending to board
   *
   * @instance
   * @public
   * @param {number} [x=this.x] - Column coordinate (uses instance x if not provided)
   * @param {number} [y=this.y] - Row coordinate (uses instance y if not provided)
   * @returns {void}
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
   * **Convenience Method**:
   * - Combines fromBoard + recolor into single call
   * - Simplifies terrain update loops after modifications
   * - Returns CellUI for method chaining if needed
   *
   * @static
   * @public
   * @param {HTMLDivElement} board - Parent board container element
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {GridMap|null} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {CellUI} CellUI instance for the recolored cell
   */
  static recolor (board, x, y, map) {
    const cell = CellUI.fromBoard(board, x, y, map)
    cell.recolor()
    return cell
  }

  /**
   * Removes all edge-related CSS classes from this cell.
   * Clears terrain edge detection classes from CellClassManager.CELL_CLASSES.edge.
   * Used as preprocessing step before reapplying coloring after terrain changes.
   *
   * **Cleanup Process**:
   * - Gets all edge classes from CellClassManager
   * - Removes each class from element.classList
   * - Prepares element for fresh colorize() call
   *
   * **Side Effects**:
   * - Modifies this.node.classList
   * - Removes terrain edge CSS classes
   * - Element appearance updated immediately
   *
   * @instance
   * @public
   * @returns {void}
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
   * **Two-Step Process**:
   * 1. uncolor(): Removes old terrain edge detection classes
   * 2. colorize(): Applies new terrain coloring based on current map state
   *
   * **Use Cases**:
   * - After ship placement/removal (terrain changes)
   * - After bomb detonation (affected cells must update)
   * - Batch refresh operations after multiple terrain edits
   * - Undo/redo operations that modify terrain
   *
   * **Side Effects**:
   * - Removes old terrain edge classes
   * - Applies new terrain coloring
   * - Updates element appearance immediately
   *
   * @instance
   * @public
   * @returns {void}
   */
  recolor () {
    this.uncolor()
    this.colorize()
  }
}
