import { CellUI } from './CellUI.js'
import { bh } from '../terrains/all/js/bh.js'
import { CellClassManager } from './helpers/CellClassManager.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'
import { makeKey, parsePair } from '../core/utilities.js'
import { SurroundingCellsHelper } from './helpers/SurroundingCellsHelper.js'
import { dragNDrop } from '../selection/dragndrop.js'

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

/**
 * @typedef {Object} GridMap
 * @property {number} rows - Number of rows in grid
 * @property {number} cols - Number of columns in grid
 * @property {(row: number, col: number) => boolean} [inBounds] - Check if coordinate is in bounds
 */

/**
 * @typedef {Object} GameModel
 * @property {Object} placement - Placement rules and state
 */

/**
 * @typedef {(weaponSource: any, row: number, col: number) => void} CellHoverEnterCallback
 * Callback fired when mouse enters a cell during hover targeting.
 * @description Receives weapon source data and cell coordinates for aiming display
 */

/**
 * @typedef {Object} ShipObject
 * @property {number[][]} [cells] - Array of [column, row] cell positions for ship
 * @property {Function} [rackAt] - Method to check weapon slot at coordinates
 */

/**
 * @typedef {(row: number, col: number) => void} CellHoverLeaveCallback
 * Callback fired when mouse leaves a cell during hover targeting.
 * @description Receives cell coordinates for cleanup of hover-related display
 */

/**
 * @typedef {(row: number, col: number) => void} CellMissCallback
 * Callback to mark a cell as a miss (no hit).
 */

/**
 * @typedef {(row: number, col: number, ship: any) => void} CellDisplayCallback
 * Callback to display a cell with ship information.
 */

/**
 * @typedef {(row: number, col: number) => any} CoordToValueCallback
 * Callback that transforms coordinates to a value.
 */

/**
 * @typedef {(row: number, col: number) => HTMLElement} CoordToElementCallback
 * Callback that transforms coordinates to an HTMLElement.
 */

/**
 * Retrieves all child elements from a board element.
 * @param {HTMLElement|null} board - The board element
 * @returns {HTMLCollection|Array} Child elements or empty collection
 * @private
 */
const getBoardChildren = (/** @type {HTMLElement|null} */ board) =>
  board?.children || []

export class GridBoard {
  /**
   * Creates a new GridBoard instance for managing board cell interactions.
   * @param {HTMLElement|null} boardElement - The board DOM element
   * @param {GridMap} [map] - Optional map configuration (defaults to current map from bh)
   */
  constructor (boardElement, map) {
    this.board = boardElement
    this._map = map
  }

  /**
   * Gets the map configuration, defaulting to global bh.map if not set.
   * @type {GridMap}
   */
  get map () {
    if (this._map == null) {
      this._map = bh.map
    }
    return this._map
  }
  /**
   * Factory method to create a GridBoard from territory name.
   * Looks up board element by '{territory}-board' ID.
   * @param {string} territory - Territory name (e.g., 'friendly', 'enemy')
   * @param {GridMap} [map] - Optional map configuration
   * @returns {GridBoard} New GridBoard instance
   * @static
   */
  static create (territory, map) {
    const board = document.getElementById(territory + '-board')
    return new GridBoard(board, map)
  }

  /**
   * Gets node at coordinates, optionally creating it if missing.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {HTMLElement|null} Node element or null if not found
   */
  nodeAt (x, y) {
    return CellUI.nodeAt(this.board, x, y, this.map)
  }

  /**
   * Gets or creates node at coordinates.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {HTMLElement} Node element
   */
  node (x, y) {
    return CellUI.node(this.board, x, y, this.map)
  }

  /**
   * Marks a friendly weapon rack cell with weapon CSS class if equipped.
   * Queries ship for weapon at coordinates and adds WEAPON class if present.
 
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {Ship} ship - Ship object with weapon rack information
   * @param {GridMap} [map] - Optional map configuration; defaults to bh.map if omitted
   * @returns {void}
   */
  markFriendlyWeapon (x, y, ship) {
    const weaponSlot = ship.rackAt?.(x, y)
    if (weaponSlot) {
      // Try using node for flexible lookup (works with or without map)
      let cell = this.node(x, y)
      if (cell) {
        cell.classList.add(UI_CLASSES.WEAPON)
      }
    }
  }

  /**
   * Marks all weapon rack cells for a ship with weapon CSS class.
   * Iterates through ship's cells and applies weapon marking to each.
   * @param {Ship} ship - Ship object with weapon rack and cell occupation data
   * @returns {void}
   */
  markShipsWeapons (ship) {
    if (!ship.cells) return

    for (const [x, y] of ship.cells) {
      this.markFriendlyWeapon(x, y, ship)
    }
  }

  /**
   * Displays surrounding ship cell attributes.
   * @param {Ship} ship - Ship object
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   */
  surroundShipAt (x, y, ship) {
    return CellUI.surroundShipAt(this.board, x, y, ship)
  }

  /**
   * Updates cell at specified board coordinates to display placed ship.
   * Convenience method combining grid lookup and display.
   * Silently skips out-of-bounds coordinates to handle edge cases gracefully.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {Ship} ship - Ship object to display
   * @returns {void}
   */
  cellPlacedAt (x, y, ship) {
    const map = bh.map
    if (!map || !('inBounds' in map)) return
    const inBoundsMethod = /** @type {(r: number, c: number) => boolean} */ (
      map.inBounds
    )
    if (!inBoundsMethod?.call(map, y, x)) return
    const cell = this.nodeAt(x, y)
    ShipCellDisplayer.displayPlacedCell(cell, ship, y, x)
  }
  /**
   * Displays surrounding cells with miss indicator.
   * Marks all neighbors (but not original cells) as miss for area-of-effect.
   *
   * @param {Set<string>} surroundingKeys - Set of surrounding cell keys
   * @param {CellMissCallback} cellMiss - Callback to mark cells as miss: (row, col) => void
   * @returns {void}
   */
  #displaySurroundingMisses (surroundingKeys, cellMiss) {
    for (const key of surroundingKeys) {
      const [y, x] = parsePair(key)
      cellMiss(x, y)
    }
  }
  /**
   * Marks a cell as a miss (no ship hit).
   * Skips if cell already has a ship placed to protect ships.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @param {string} [damageType] - Optional damage indicator class
   * @returns {void}
   */
  cellMiss (x, y, damageType) {
    const cell = CellUI.node(this.board, x, y)

    if (cell.classList.contains('placed')) return
    cell.classList.add('miss')
    if (damageType) {
      cell.classList.add(damageType)
    }
    cell.classList.remove('wake')
  }
  /**
   * Displays center cells using provided display function.
   * Typically marks original cells with ship or hit indicators.
   *
   * @param {Iterable<[number, number]>} cells - Original cell coordinates
   * @param {Ship} ship - Ship object for display
   * @param {CellDisplayCallback} displayFn - Callback to display cells: (row, col, ship) => void
   * @returns {void}
   */
  #displayCenterCells (cells, ship, displayFn) {
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
   * @param {CellMissCallback} cellMiss - Callback to mark surrounding cells as miss
   * @param {CellDisplayCallback} [display] - Optional callback to display center cells
   * @returns {void}
   */
  displaySurround (cells, ship, cellMiss, display) {
    const surroundingKeys = this.hollowCells(cells)
    this.#displaySurroundingMisses(surroundingKeys, cellMiss)
    if (display) {
      this.#displayCenterCells(cells, ship, display)
    }
  }
  /**
   * Adds a marked-as-placed visual to ship cell and surroundings.
   * Calls display surround with callbacks to render miss/surround effects.
   * Displays ship placement result and surrounding terrain state.
   *
   * Side effects:
   * - Invokes this.displaySurround() with cellMiss and cellPlacedAt callbacks
   * - Updates board display to show placement result
   *
   * @param {Array<[number, number]>} cells - Placed cell coordinates as [row, col] tuples
   * @param {Ship} ship - Ship that was placed
   * @returns {void}
   */
  markPlaced (cells, ship) {
    this.displaySurround(
      cells,
      ship,
      (x, y) => {
        this.cellMiss(x, y)
        this.surroundShipAt(x, y, ship)
      },
      (x, y, ship) => this.cellPlacedAt(x, y, ship)
    )
  }
  /**
   * Converts coordinate pairs to set of cell keys.
   * Keys are formatted as 'col-row' for keyed lookups.
   *
   * @param {Iterable<[number, number]>} cells - Iterable of [row, col] coordinate pairs
   * @returns {Set<string>} Set of cell keys
   */
  #cellSet (cells) {
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
    const original = this.#cellSet(cells)
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
    const surroundings = new Set()
    for (const [x, y] of cells) {
      this.surround(x, y, surroundings)
    }
    return surroundings
  }

  /**
   * Adds surrounding cells to container using specified strategy.
   * Generic method that delegates to SurroundingCellsHelper with flexible result format.
   *
   * @param {number} y - Row coordinate of center cell
   * @param {number} x - Column coordinate of center cell
   * @param {Set<string>|Object<string, HTMLElement>|any[]} container - Container to accumulate results
   * @param {'keySet'|'objectMap'|'array'} strategy - Result format strategy
   * @param {CoordToValueCallback} [maker] - Callback for 'objectMap'/'array' strategies (required for those)
   * @returns {void}
   * @throws {Error} If maker callback required but not provided for chosen strategy
   */
  #addSurroundingCells (x, y, container, strategy, maker) {
    let result
    const currentMap = this.map

    switch (strategy) {
      case 'keySet': {
        result = SurroundingCellsHelper.asKeySet(currentMap, x, y)
        // @ts-ignore - container is Set when strategy is keySet
        result.forEach(key => container.add(key))
        break
      }
      case 'objectMap': {
        if (!maker) throw new Error('maker required for objectMap strategy')
        result = SurroundingCellsHelper.asObjectMap(currentMap, x, y, maker)
        Object.assign(container, result)
        break
      }
      case 'array': {
        if (!maker) throw new Error('maker required for array strategy')
        result = SurroundingCellsHelper.asArray(currentMap, x, y, maker)
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
   * @param {number} y - Row coordinate of center cell
   * @param {number} x - Column coordinate of center cell
   * @param {Set<string>} container - Set to accumulate surrounding cell keys
 
   * @returns {void}
   */
  surround (x, y, container) {
    // @ts-ignore - map compatible with GridMap when defined
    this.#addSurroundingCells(x, y, container, 'keySet')
  }

  /**
   * Adds surrounding cells as object mappings to container.
   * Retrieves neighbors and applies maker function to each coordinate.
   *
   * @param {number} x - Column coordinate of center cell
   * @param {number} y - Row coordinate of center cell
   * @param {Object} container - Object to accumulate surrounding cell mappings
   * @param {CoordToElementCallback} maker - Callback to transform [row, col] → HTMLElement
   * @returns {void}
   */
  surroundObj (x, y, container, maker) {
    this.#addSurroundingCells(x, y, container, 'objectMap', maker)
  }

  /**
   * Adds surrounding cells to array container.
   * Retrieves neighbors and applies maker function to each coordinate.
   *
   * @param {number} x - Column coordinate of center cell
   * @param {number} y - Row coordinate of center cell
   * @param {any[]} container - Array to accumulate surrounding cell elements
   * @param {CoordToValueCallback} maker - Callback to transform [row, col] → any value
   * @returns {void}
   */
  surroundList (x, y, container, maker) {
    this.#addSurroundingCells(x, y, container, 'array', maker)
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
    const surroundings = container || {}
    for (const cell of cells) {
      const { x, y } = CellUI.getCoords(cell)
      this.surroundObj(
        x,
        y,
        surroundings,
        CellUI.nodeAt.bind(CellUI, this.board)
      )
    }
    return Object.values(surroundings)
  }
  /**
   * Attaches hover event listeners to all board cells (static factory).
   * Shows/hides area-of-effect or targeting information on hover.
   * @param {HTMLElement|null} boardElement - The board element
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @param {CellHoverEnterCallback} onEnter - Mouseenter handler
   * @param {CellHoverLeaveCallback} onLeave - Mouseleave handler
   * @param {Object} [thisRef] - Context for onLeave binding
   * @param {any} [weaponSource] - Weapon source data passed to onEnter
   * @returns {void}
   * @static
   */
  static addHover (boardElement, map, onEnter, onLeave, thisRef, weaponSource) {
    const grid = new GridBoard(boardElement, map)
    grid.addHover(onEnter, onLeave, thisRef, weaponSource)
  }
  /**
   * Attaches hover event listeners to all board cells.
   * Shows/hides area-of-effect or targeting information on hover.
   *
   * @param {CellHoverEnterCallback} onEnter - Mouseenter handler
   * @param {CellHoverLeaveCallback} onLeave - Mouseleave handler
   * @param {Object} [thisRef] - Context for onLeave binding
   * @param {any} [weaponSource] - Weapon source data passed to onEnter
   * @returns {void}
   */
  addHover (onEnter, onLeave, thisRef, weaponSource) {
    this.#forEachBoardCell((/** @type {HTMLElement} */ el) => {
      const { x, y } = CellUI.getCoords(el)
      // @ts-ignore - addEventListener signature compatible at runtime
      el.addEventListener('mouseenter', onEnter.bind(null, weaponSource, y, x))
      // @ts-ignore - addEventListener signature compatible at runtime
      el.addEventListener('mouseleave', onLeave.bind(thisRef, y, x))
    })
  }
  /**
   * Removes all area-of-effect highlight classes from board (static factory).
   * Clears target and splash effect visual indicators.
   *
   * @param {HTMLElement|null} boardElement - The board element
   * @returns {void}
   * @static
   */
  static removeHighlightAoE (boardElement) {
    const grid = new GridBoard(boardElement)
    grid.removeHighlightAoE()
  }
  /**
   * Removes all area-of-effect highlight classes from board.
   * Clears target and splash effect visual indicators.
   *
   * @returns {void}
   */
  removeHighlightAoE () {
    const tags = ['target', ...Object.values(bh.splashTags)]
    this.#forEachBoardCell((/** @type {HTMLElement} */ el) =>
      el.classList.remove(...tags)
    )
  }
  /**
   * Builds board grid for screen
   * Creates grid with row/column labels for printing.
   *
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  static createScreenGrid (boardElement, onClick, thisRef, map) {
    const grid = new GridBoard(boardElement, map)
    grid.createScreenGrid(onClick, thisRef)
  }
  /**
   * Builds board grid for interactive display with optional click handlers.
   * Creates grid cells and binds click events if handler provided.
   *
   * @param {((row: number, col: number, event: MouseEvent) => void)|undefined} [onClick] - Click handler (row, col) bound
   * @param {Object} [thisRef] - Context object for click handler binding
   * @returns {void}
   */
  createScreenGrid (onClick, thisRef) {
    if (!this.board) return

    this.board.innerHTML = ''
    const map = this.map

    for (const [x, y] of this.locations()) {
      if (onClick) {
        CellUI.createAndAppendTo(
          this.board,
          x,
          y,
          map,
          onClick.bind(thisRef, y, x)
        )
      } else {
        CellUI.createAndAppendTo(this.board, x, y, map, onClick)
      }
    }
  }
  /**
   * Builds board grid for print output with labels.
   * Creates grid with row/column labels for printing.
   *
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   */
  static createPrintableGrid (boardElement, map) {
    const grid = new GridBoard(boardElement, map)
    grid.createPrintableGrid()
  }
  /**
   * Builds board grid for print output with labels.
   * Creates grid with row/column labels for printing.
   *
   * @returns {void}
   */
  createPrintableGrid () {
    if (!this.board) return

    this.board.innerHTML = ''
    const map = this.map
    CellUI.createEmptyNodeAndAppendTo(this.board)
    for (let x = 0; x < map.cols; x++) {
      CellUI.createColLabelNodeAndAppendTo(this.board, x)
    }
    for (let y = 0; y < map.rows; y++) {
      CellUI.createRowLabelNodeAndAppendTo(this.board, map.rows, y)
      for (let x = 0; x < map.cols; x++) {
        CellUI.createAndAppendTo(this.board, x, y, map)
      }
    }
  }
  /**
   * Iterates over all cells in the board, calling callback for each.
   * Provides functional interface to board cell enumeration.
   *
   * @param {(cell: HTMLElement) => void} callback - Function to call for each cell
   * @returns {void}
   * @private
   */
  #forEachBoardCell (callback) {
    for (const cell of getBoardChildren(this.board)) {
      callback(/** @type {HTMLElement} */ (cell))
    }
  }

  /**
   * Generator for all cell coordinates in the board.
   * Yields coordinates in row-major order: top-left to bottom-right.
   * @yields {[number, number]} Cell coordinates as [x, y] tuples
   * @returns {Generator<[number, number]>} Generator of coordinate pairs
   */
  *locations () {
    for (let y = 0; y < this.map.rows; y++) {
      for (let x = 0; x < this.map.cols; x++) {
        yield [x, y]
      }
    }
  }
  /**
   * Clears all cell classes from every cell in the board.
   * Returns board to base state (only terrain coloring remains).
   *
   * @returns {void}
   */
  clearClasses () {
    this.#forEachBoardCell((/** @type {HTMLElement} */ cell) =>
      CellClassManager.clearCell(cell)
    )
  }
  /**
   * Marks weapon cells on the friendly board with the 'weapon' class.
   * Iterates through all ships and their cells, adding the weapon class to cells that have armed weapons.
   * Called during game initialization to visually distinguish weapon-equipped cells.
   *
   * @public
   * @param {Array<ShipObject>} ships - Array of ship objects with cells and rackAt method
   * @returns {void}
   */
  markFleetWeapons (ships) {
    if (!ships) return
    for (const ship of ships) {
      this.markShipsWeapons(ship)
    }
  }
  /**
   * Configures board cells for ship placement with standard drop and drag-enter handlers.
   * Consolidated pattern used by placement and additional weapon scenarios.
   * Clears existing styling and enables standard drag-drop interactions.
   *
   * Side effects:
   * - Clears visual styling from all board cells using ShipCellDisplayer.clearPlaceCell
   * - Invokes dragNDrop.drop() and dragNDrop.dragEnter() on each cell
   * - Calls additionalSetup callback on each cell if provided
   *
   * @param {GameModel} model - Game model containing placement rules and state
   * @param {(cell:HTMLElement)=>void} [additionalSetup] - Optional callback for additional cell configuration
   * @returns {void}
   */
  #configureBoardCellsForDrop (model, additionalSetup) {
    this.#forEachBoardCell(cell => {
      ShipCellDisplayer.clearPlaceCell(cell)
      if (additionalSetup) {
        additionalSetup(cell)
      }
      dragNDrop.drop(cell, model, this)
      dragNDrop.dragEnter(cell, model, this)
    })
  }

  /**
   * Prepares board cells for standard ship placement with drop handlers.
   * Clears existing visuals and enables drag-drop interactions.
   *
   * @param {GameModel} model - Game model with placement configuration
   * @returns {void}
   */
  makeDroppable (model) {
    this.#configureBoardCellsForDrop(model)
  }

  /**
   * Prepares board cells for additional weapon placement with enhanced drop handlers.
   * Includes weapon-specific drop behavior in addition to standard handlers.
   *
   * Side effects:
   * - Invokes dragNDrop.addWeaponDrop(model, this)
   * - Configures board cells with both standard and weapon-specific drop handlers
   *
   * @param {GameModel} model - Game model with weapon placement configuration
   * @returns {void}
   */
  makeAddDroppable (model, viewModel) {
    dragNDrop.addWeaponDrop(model, viewModel)
    this.#configureBoardCellsForDrop(model, cell => {
      dragNDrop.addDrop(cell, model, viewModel)
    })
  }

  /**
   * Enables terrain brush dragging interactions on all board cells.
   * Prepares cells to respond to brush tool drag-enter events.
   *
   * Side effects:
   * - Invokes dragNDrop.dragBrushEnter on each board cell
   *
   * @returns {void}
   */
  makeBrushable () {
    this.#forEachBoardCell(cell => {
      dragNDrop.dragBrushEnter(cell, this)
    })
  }
}
