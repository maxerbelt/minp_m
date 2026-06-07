import { CellUI, NodeUI } from './cellUI.js'
import { bh } from '../terrains/all/js/bh.js'
import { CellClassManager } from './helpers/CellClassManager.js'
import { ShipCellDisplayer } from './helpers/ShipCellDisplayer.js'
import { makeKey, parsePair } from '../core/utilities.js'
import { SurroundingCellsHelper } from './helpers/SurroundingCellsHelper.js'
import { dragNDrop } from '../selection/dragndrop.js'
import { CustomMap } from '../terrains/all/js/map.js'
import { LoadOut } from './loadout.js'
/**
 * @fileoverview GridBoard class for managing game board cell interactions and displays
 * Handles cell marking, hover effects, drag-drop zones, and board state visualization
 * @module gridBoard
 */

/** @typedef {import('../selection/Brush.js').Brush} Brush  */
/** @typedef {import('../ships/ship.js').Ship} Ship  */
/**
 * A coordinate pair representing a single cell on the game board.
 * Format: [row, col] where row is Y-axis and col is X-axis.
 * Used extensively for targeting, positioning, and layout calculations.
 *
 * row, column
 * @typedef {[number, number]} Coord
 * x, y
 * @typedef {[number, number]} XY
 */

/**
 * Ship/weapon placement information.
 *
 * @typedef {Object} PlacementData
 * @property {Object} board - Board representation of placement
 * @property {Function} board.occupiedLocations - Get occupied cell coordinates
 * @property {Function} canPlace - Validate placement against grid
 * @property {Function} cantPlaceReason - Get reason for placement rejection
 * @property {Object} notGood - Terrain conflict grid
 * @property {Function} notGood.at - Get terrain conflict value at coordinates
 * @property {Function} getHighlightClass
 */
/**
 * @typedef {Object} FireResult
 * @property {number} hits - Number of hits scored
 * @property {number} shots - Number of shots fired
 * @property {string} sunk - Ship letter or count of sunk ships
 * @property {number} dtap - Double-tap count
 * @property {number} reveals - Cells revealed
 * @property {string} info - Info message
 */

/**
 * CSS class names for cell state visualization.
 * Used to mark cells with visual indicators for gameplay state and targeting feedback.
 * @enum {string}
 * @readonly
 * @const
 */
const UI_CLASSES = {
  /** Cell is hidden from view (e.g., obscured by fog of war) */
  HIDDEN: 'hidden',
  /** Cell contains destroyed/sunk ship structure */
  DESTROYED: 'destroyed',
  /** Cell has been hit (direct damage received) */
  HIT: 'hit',
  /** Cell has ship placed on it */
  PLACED: 'placed',
  /** Cell is active/selected for interaction */
  ACTIVE: 'active',
  /** Cell is empty (no ship, no hit) */
  EMPTY: 'empty',
  /** Cell contains weapon rack or armed position */
  WEAPON: 'weapon',
  /** Medium weapon splash size indicator */
  MEDIUM: 'medium',
  /** Small weapon splash size indicator */
  SMALL: 'small',
  /** Alternative/secondary weapon indicator */
  ALT: 'alt'
}

/**
 * Map configuration and boundary validation.
 * Defines grid dimensions and provides boundary checking for coordinate validation.
 * @typedef {Object} GridMap
 * @property {number} rows - Number of rows in grid (height in cells)
 * @property {number} cols - Number of columns in grid (width in cells)
 * @property {((row: number, col: number) => boolean)|undefined} [inBounds] - Function to validate coordinates within bounds
 */

/**
 * Game state model with configuration and rules.
 * Contains placement constraints and UI references for interactive gameplay.
 * @typedef {Object} GameModel
 * @property {Object} placement - Placement rules and state constraints
 * @property {Object} UI - User interface element references and handlers
 * @property {any} [additionalConfig] - Optional additional game configuration
 */

/**
 * Armed weapon rack slot configuration.
 * Represents a single weapon installation on a ship with status tracking.
 * @typedef {Object} WeaponSlot
 * @property {Object} weapon - Weapon information object
 * @property {string} weapon.letter - Weapon identifier letter (A, B, C, etc.)
 * @property {number} weapon.power - Base damage power rating
 * @property {number} ammo - Remaining ammunition count for this rack
 */

/**
 * Handles mouse entry into cell during hover targeting.
 * Displays weapon preview (splash, trajectory, etc.) for the targeted cell.
 * @typedef {(weaponSource: any, row: number, col: number) => void} CellHoverEnterCallback
 * @param {any} weaponSource - Weapon system providing targeting data
 * @param {number} row - Row coordinate (y-axis, 0-based) of entered cell
 * @param {number} col - Column coordinate (x-axis, 0-based) of entered cell
 */

/**
 * Handles mouse departure from cell after hover targeting.
 * Cleans up weapon preview and hover-related visual indicators.
 * @typedef {(row: number, col: number) => void} CellHoverLeaveCallback
 * @param {number} row - Row coordinate (y-axis, 0-based) of exited cell
 * @param {number} col - Column coordinate (x-axis, 0-based) of exited cell
 */

/**
 * Marks a cell as a miss with optional damage type indicator.
 * Applies CSS styling to show no ship was hit at this location.
 * @typedef {(row: number, col: number, damageType?: string) => void} CellMissCallback
 * @param {number} row - Row coordinate (y-axis, 0-based) of miss location
 * @param {number} col - Column coordinate (x-axis, 0-based) of miss location
 * @param {string} [damageType] - Optional damage type class (e.g., 'splash', 'fire')
 */

/**
 * @typedef {(row: number, col: number, ship: ShipObject) => void} CellDisplayCallback
 * Callback to display a cell with ship information.
 */

/**
 * Transforms grid coordinates to a computed value or object.
 * Used for coordinate-based queries, mappers, and data extraction.
 * @typedef {(row: number, col: number) => any} CoordToValueCallback
 * @param {number} row - Row coordinate (y-axis, 0-based)
 * @param {number} col - Column coordinate (x-axis, 0-based)
 * @returns {any} Transformed value or object
 */

/**
 * Transforms grid coordinates to DOM element or null.
 * Used for cell lookups and coordinate-to-DOM mappings.
 * @typedef {(row: number, col: number) => HTMLElement|null} CoordToElementCallback
 * @param {number} row - Row coordinate (y-axis, 0-based)
 * @param {number} col - Column coordinate (x-axis, 0-based)
 * @returns {HTMLElement|null} Cell DOM element or null if not found
 */

/**
 * Safely retrieves all child DOM elements from a board container.
 * Returns empty array if board is null or missing, preventing errors in iteration.
 * Used internally for batch operations on all board cells.
 * @param {HTMLElement|null} board - The board container element (or null)
 * @returns {HTMLCollection|Array<HTMLElement>} Child cell elements or empty array
 * @private
 */
const getBoardChildren = (/** @type {HTMLElement|null} */ board) => {
  /** @type {HTMLCollection|Array<HTMLElement>} */
  return board?.children || []
}

export class GridBoard {
  /**
   * Creates a new GridBoard instance for managing board cell interactions.
   * Initializes board reference and optional map configuration for coordinate validation.
   * If map is not provided, falls back to global bh.map when needed.
   * @constructor
   * @param {HTMLElement|null} boardElement - The board DOM element (can be null for static usage)
   * @param {GridMap} [map] - Optional map configuration (dimensions and bounds checking)
   */
  constructor (boardElement, map) {
    /** @type {HTMLElement|null} */
    this.board = boardElement
    /** @type {GridMap|null} */
    this._map = map ?? null
  }

  /**
   * Gets the map configuration with lazy initialization from global bh.map.
   * Provides reliable map access and ensures inBounds method exists for validation.
   * Creates default bounds checking function if not provided by map.
   *
   * **Behavior**:
   * - Returns cached map if already initialized
   * - Falls back to global bh.map if instance map not set
   * - Guarantees inBounds method exists for coordinate validation
   * - Provides sensible default if bh.map is also unavailable
   * @returns {GridMap} The map configuration object with guaranteed bounds checking
   * @type {GridMap}
   * @public
   */
  get map () {
    if (this._map == null) {
      /** @type {any} */
      const globalMap = bh.map
      /** @type {GridMap} */
      this._map = globalMap ?? { rows: 0, cols: 0 }
    }
    // Ensure inBounds method exists for boundary checking
    if (typeof this._map.inBounds !== 'function') {
      const rows = this._map.rows ?? 0
      const cols = this._map.cols ?? 0
      this._map.inBounds = (row, col) => {
        return row >= 0 && row < rows && col >= 0 && col < cols
      }
    }
    return this._map
  }

  /**
   * CSS class names for placement validity highlighting.
   * Represents color-coded feedback for ship placement validity (good → worse).
   * Ordered from most valid to least valid placement options.
   *
   * **Classes**:
   * - 'good': Placement is valid and optimal
   * - 'notgood': Placement is valid but suboptimal
   * - 'bad': Placement may overlap or violate constraints
   * - 'worse': Placement is invalid or blocked
   *
   * @type {string[]}
   * @static
   * @readonly
   * @const
   */
  static #HIGHLIGHT_CLASSES = ['good', 'notgood', 'bad', 'worse']

  /**
   * Factory method to create a GridBoard from territory name.
   * Looks up board element by DOM ID pattern '{territory}-board' and wraps it.
   * Provides convenient creation from territory identifier string.
   * @param {string} territory - Territory identifier name (e.g., 'friendly', 'enemy')
   * @param {GridMap} [map] - Optional map configuration (defaults to bh.map)
   * @returns {GridBoard} New GridBoard instance wrapping the found board element
   * @static
   * @public
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
    /** @type {HTMLElement|null} */
    return NodeUI.nodeAt(
      this.board ?? /** @type {HTMLDivElement} */ (undefined),
      x,
      y,
      this.map
    )
  }

  /**
   * Gets or creates node at coordinates.
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {HTMLDivElement} Node element
   */
  node (x, y) {
    /** @type {HTMLDivElement} */
    return NodeUI.node(
      this.board ?? /** @type {HTMLDivElement} */ (undefined),
      x,
      y,
      this.map
    )
  }

  /**
   * Marks a cell as having an active weapon with specific rotation.
   * Displays weapon indicator and applies rotation/cursor classes.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @param {string} rotationClass - Rotation indicator class (e.g., 'turn2')
   * @param {string} [extraClass] - Additional class to apply (optional)
   * @returns {HTMLDivElement} Node element
   */
  activeWeaponNode (x, y, rotationClass, extraClass) {
    const cell = this.node(x, y)
    NodeUI.addWeaponClasses(cell, rotationClass, extraClass)
    return cell
  }

  /**
   * Marks a friendly weapon rack cell with weapon CSS class if equipped.
   * Queries ship for weapon at coordinates and adds WEAPON class if present.
   * @param {number} x - Column coordinate (0-based, x-axis)
   * @param {number} y - Row coordinate (0-based, y-axis)
   * @param {Ship} ship - Ship object with weapon rack information
   * @returns {void}
   */
  markFriendlyWeapon (x, y, ship) {
    /** @type {WeaponSlot|null|undefined} */
    const weaponSlot = ship.rackAt?.(x, y)
    if (weaponSlot) {
      // Try using node for flexible lookup (works with or without map)
      /** @type {HTMLDivElement|null} */
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
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {Ship} ship - Ship object
   * @returns {void}
   */
  surroundShipAt (x, y, ship) {
    return NodeUI.surroundShipAt(
      this.board ?? /** @type {HTMLDivElement} */ (undefined),
      x,
      y,
      ship
    )
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
    /** @type {any} */
    const mapObj = this.map
    if (!mapObj.isInBoundsAt(x, y)) return
    /** @type {HTMLDivElement|null} */
    const cell = this.node(x, y)
    if (cell) {
      ShipCellDisplayer.displayPlacedCell(cell, ship, y, x)
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
    const colorMaps = this.map
    // @ts-ignore - ship.cells is iterable of [col, row] coordinate pairs
    for (const [x, y] of ship.cells) {
      const board = this.board
      if (!board) return
      const cell = this.node(x, y, colorMaps)
      // @ts-ignore - ship matches Ship type for display
      ShipCellDisplayer.displayAsRevealed(cell, ship, colorMaps)
    }
  }
  /**
   * Reveals a cell with semi-visibility indicator.
   * Semi means cell is revealed but not confirmed as hit or miss yet.
   * Returns result code for game logic based on cell state.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {FireResult} Result code: LoadOut.noResult if already revealed, LoadOut.missResult otherwise
   */
  cellSemiReveal (x, y) {
    const cell = this.node(x, y)

    if (!CellClassManager.applySemiRevealState(cell)) {
      return LoadOut.noResult
    }
    cell.textContext = ''
    return LoadOut.missResult
  }
  /**
   * Displays surrounding cells with miss indicator.
   * Marks all neighbors (but not original cells) as miss for area-of-effect.
   * Validates coordinates are in bounds before marking to prevent out-of-bounds errors.
   *
   * @param {Set<string>} surroundingKeys - Set of surrounding cell keys
   * @param {CellMissCallback} cellMiss - Callback to mark cells as miss: (row, col) => void
   * @returns {void}
   */
  #displaySurroundingMisses (surroundingKeys, cellMiss) {
    for (const key of surroundingKeys) {
      const [y, x] = parsePair(key)
      // Validate coordinates are in bounds before calling cellMiss
      if (this.map.inBounds(y, x)) {
        cellMiss(x, y)
      }
    }
  }
  /**
   * Marks a cell as a miss (no ship hit).
   * Skips if cell already has a ship placed to protect ships.
   *
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {string} [damageType] - Optional damage indicator class
   * @returns {void}
   */
  cellMiss (x, y, damageType) {
    /** @type {HTMLDivElement} */
    const cell = NodeUI.node(
      this.board ?? /** @type {HTMLDivElement} */ (undefined),
      x,
      y
    )

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
   * Renders the impact zone (original cells) of an area effect.
   *
   * **Side Effects**:
   * - Calls displayFn(row, col, ship) for each center cell coordinate
   * - Each call triggers UI updates (ship display, hit markers, etc.)
   * - Called after surrounding misses in displaySurround flow
   *
   * @param {Iterable<Coord>} cells - Original cell coordinates as [row, col] tuples
   * @param {Ship} ship - Ship object for display context
   * @param {CellDisplayCallback} displayFn - Callback to display cells (row, col, ship) => void
   * @returns {void}
   * @private
   */
  #displayCenterCells (cells, ship, displayFn) {
    for (const [row, column] of cells) {
      displayFn(row, column, ship)
    }
  }

  /**
   * Displays surrounding cells as misses and optionally center cells with custom display.
   * Core method for area-of-effect visualization during targeting/weapon effects.
   * Separates surrounding cells (hollow ring) from center cells for different styling.
   *
   * **Behavior**:
   * - Computes hollow cells (surrounding minus original) using hollowCells()
   * - Calls cellMiss callback for each hollow cell to mark as miss
   * - If display callback provided, calls it for each center cell
   * - Used for weapon splash, area effects, and targeting previews
   *
   * @param {Iterable<Coord>} cells - Original cell coordinates to compute area around
   * @param {Ship} ship - Ship object for center cell display
   * @param {CellMissCallback} cellMiss - Callback to mark surrounding cells as miss (row, col, damageType?) => void
   * @param {CellDisplayCallback} [display] - Optional callback to display center cells (row, col, ship) => void
   * @returns {void}
   * @public
   */
  displaySurround (cells, ship, cellMiss, display) {
    /** @type {Set<string>} */
    const surroundingKeys = this.hollowCells(cells)
    this.#displaySurroundingMisses(surroundingKeys, cellMiss)
    if (display) {
      this.#displayCenterCells(cells, ship, display)
    }
  }
  /**
   * Adds a marked-as-placed visual to ship cell and surroundings.
   * Combines displaySurround with cellMiss and cellPlacedAt callbacks.
   * Shows placement result and surrounding terrain state (water effects, etc.).
   *
   * **Side Effects**:
   * - Calls displaySurround() with specialized callbacks for placement context
   * - cellMiss: Marks surrounding cells with miss styling
   * - cellPlacedAt: Marks center cells with placed ship styling
   * - Updates board display to show placement result and effects
   *
   * **Callback Details**:
   * - Center cells: cellPlacedAt callback shows placed ship
   * - Surrounding cells: cellMiss marked for miss effect, then surroundShipAt called for terrain
   *
   * @param {Coord[]} cells - Placed cell coordinates as [row, col] tuples
   * @param {Ship} ship - Ship that was placed
   * @returns {void}
   * @public
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
   * Keys are formatted as 'col-row' for keyed lookups and deduplication.
   * Internal utility for cell coordinate deduplication.
   *
   * **Key Format**: 'col-row' (e.g., '3-5' for column 3, row 5)
   *
   * @param {Iterable<Coord>} cells - Iterable of [row, col] coordinate pairs
   * @returns {Set<string>} Set of cell keys for efficient lookups and deduplication
   */
  #cellSet (cells) {
    /** @type {Set<string>} */
    const result = new Set()
    for (const [row, column] of cells) {
      result.add(makeKey(column, row))
    }
    return result
  }

  /**
   * Calculates hollow set (outer ring without interior).
   * Returns surrounding cells excluding the original cells themselves.
   * Useful for area-of-effect calculations to separate splash zone from impact.
   *
   * **Formula**: hollowCells = surroundCells - originalCells
   *
   * **Use Cases**:
   * - Weapon splash effects (surround marked as miss, center marked as hit)
   * - Area movement range (movement cells minus blocking cells)
   * - Targeting preview visualization
   *
   * @param {Iterable<Coord>} cells - Iterable of [row, col] coordinate pairs forming the shape
   * @returns {Set<string>} Set of hollow cells in 'col-row' key format (e.g., '3-5')
   * @public
   */
  hollowCells (cells) {
    /** @type {Set<string>} */
    const surround = this.surroundCells(cells)
    /** @type {Set<string>} */
    const original = this.#cellSet(cells)
    return surround.difference(original)
  }

  /**
   * Calculates all cells surrounding given cells (flood fill perimeter).
   * Includes all 8 directional neighbors (orthogonal and diagonal).
   * Forms the "halo" around a shape for area-of-effect or aura calculations.
   *
   * **Characteristics**:
   * - Includes corners (diagonal neighbors)
   * - Filters out-of-bounds neighbors
   * - Deduplicates cells if multiple source cells share neighbors
   * - Used for splash zones, auras, and effect ranges
   *
   * @param {Iterable<Coord>} cells - Iterable of [row, col] coordinate pairs forming the shape
   * @returns {Set<string>} Set of surrounding cell keys in 'col-row' key format
   * @public
   */
  surroundCells (cells) {
    /** @type {Set<string>} */
    const surroundings = new Set()
    for (const [x, y] of cells) {
      this.surround(x, y, surroundings)
    }
    return surroundings
  }

  /**
   * Adds surrounding cells to container using specified strategy.
   * Generic method that delegates to SurroundingCellsHelper with flexible result format.
   * Provides unified interface for different surrounding cell data structures.
   *
   * **Strategies**:
   * - 'keySet': Accumulates cell keys in Set (maker not required)
   * - 'objectMap': Accumulates maker results in Object keyed by cell (maker required)
   * - 'array': Pushes maker results into Array (maker required)
   *
   * **Error Handling**:
   * - Throws Error if 'objectMap' or 'array' strategy used without maker callback
   * - Throws Error for unknown strategy values
   * - Silently skips out-of-bounds neighbors based on map bounds
   *
   * @param {number} x - Column coordinate of center cell (0-based, x-axis)
   * @param {number} y - Row coordinate of center cell (0-based, y-axis)
   * @param {Set<string>|Object<string, HTMLElement>|any[]} container - Container to accumulate results
   * @param {'keySet'|'objectMap'|'array'} strategy - Result format strategy ('keySet' | 'objectMap' | 'array')
   * @param {CoordToValueCallback} [maker] - Callback for 'objectMap'/'array' strategies (required for those)
   * @returns {void}
   * @throws {Error} If maker required but not provided for chosen strategy
   * @throws {Error} If strategy name is unrecognized
   * @private
   */
  #addSurroundingCells (x, y, container, strategy, maker) {
    /** @type {any} */
    let result
    /** @type {GridMap} */
    const currentMap = this.map

    switch (strategy) {
      case 'keySet': {
        result = SurroundingCellsHelper.asKeySet(
          currentMap ?? { rows: 0, cols: 0 },
          x,
          y
        )
        // @ts-ignore - container is Set when strategy is keySet
        result.forEach(key => container.add(key))
        break
      }
      case 'objectMap': {
        if (!maker) throw new Error('maker required for objectMap strategy')
        result = SurroundingCellsHelper.asObjectMap(
          currentMap ?? { rows: 0, cols: 0 },
          x,
          y,
          maker
        )
        Object.assign(container, result)
        break
      }
      case 'array': {
        if (!maker) throw new Error('maker required for array strategy')
        result = SurroundingCellsHelper.asArray(
          currentMap ?? { rows: 0, cols: 0 },
          x,
          y,
          maker
        )
        // @ts-ignore - container is array when strategy is array
        container.push(...result)
        break
      }
      default:
        throw new Error(`Unknown surround strategy: ${strategy}`)
    }
  }

  /**
   * Adds surrounding cell keys to a set container using key format.
   * Retrieves all 8 neighbors of specified cell and accumulates their string keys.
   * Filters out-of-bounds neighbors based on map configuration.
   *
   * **Key Format**: 'col-row' (e.g., '3-5' for column 3, row 5)
   *
   * @param {number} x - Column coordinate of center cell (0-based, x-axis)
   * @param {number} y - Row coordinate of center cell (0-based, y-axis)
   * @param {Set<string>} container - Set to accumulate surrounding cell keys
   * @returns {void}
   * @private
   */
  surround (x, y, container) {
    // @ts-ignore - map compatible with GridMap when defined
    this.#addSurroundingCells(x, y, container, 'keySet')
  }
  /**
   * Generator yielding cell DOM elements for each coordinate in iterable.
   * Provides lazy evaluation of coordinate-to-cell mapping without pre-allocating array.
   * Useful for iterating through cells without intermediate array allocations.
   *
   * **Note**: Coordinates are [row, col] but nodeAt expects (x, y) format,
   * so the generator automatically converts by swapping: [y, x] → nodeAt(x, y)
   *
   * @param {Iterable<Coord>} coords - Iterable of [row, col] coordinate pairs
   * @yields {HTMLElement|null} Cell element for each coordinate (may be null if out of bounds)
   * @generator
   * @private
   */
  *cellsForRClist (coords) {
    for (const [y, x] of coords) {
      yield this.nodeAt(x, y)
    }
  }
  /**
   * Adds surrounding cells as object mappings to container.
   * Retrieves neighbors and applies maker function to each coordinate.
   * Results stored in object with keys as keys and mapper output as values.
   *
   * **Strategy**: Used for flexible surrounding cell data extraction with custom mappers.
   *
   * @param {number} x - Column coordinate of center cell (0-based, x-axis)
   * @param {number} y - Row coordinate of center cell (0-based, y-axis)
   * @param {Object<string, HTMLElement>} container - Object to accumulate surrounding cell mappings
   * @param {CoordToElementCallback} maker - Callback to transform [row, col] → HTMLElement
   * @returns {void}
   * @private
   */
  surroundObj (x, y, container, maker) {
    this.#addSurroundingCells(x, y, container, 'objectMap', maker)
  }

  /**
   * Adds surrounding cells to array container using maker callback.
   * Retrieves all 8 neighbors and transforms each using maker function.
   * Accumulates results in provided array.
   *
   * **Strategy**: Used for collecting surrounding cell data with custom transformation.
   *
   * @param {number} x - Column coordinate of center cell (0-based, x-axis)
   * @param {number} y - Row coordinate of center cell (0-based, y-axis)
   * @param {any[]} container - Array to accumulate surrounding cell results
   * @param {CoordToValueCallback} maker - Callback to transform coordinates [x, y] → value
   * @returns {void}
   * @private
   */
  surroundList (x, y, container, maker) {
    this.#addSurroundingCells(x, y, container, 'array', maker)
  }

  /**
   * Gets surrounding cell DOM elements for given cell elements.
   * For each input cell, retrieves all neighbor cells and returns deduplicated array.
   * Useful for applying effects to cells surrounding a target area (e.g., weapon splash).
   *
   * **Deduplication**: If container object is provided, keys track visited cells to prevent duplicates
   * when surrounding multiple cells with overlapping neighborhoods.
   *
   * @param {Iterable<HTMLElement>} cells - Iterable of DOM cell elements to find neighbors of
   * @param {Object<string, HTMLElement>} [container] - Optional container object for deduplication tracking
   * @returns {HTMLElement[]} Array of unique surrounding cell DOM elements
   * @public
   */
  surroundCellElement (cells, container) {
    /** @type {Object<string, HTMLElement>} */
    const surroundings = container || {}
    for (const cell of cells) {
      const { x, y } = NodeUI.getXY(/** @type {HTMLDivElement} */ (cell))
      this.surroundObj(
        x,
        y,
        surroundings,
        NodeUI.node.bind(
          NodeUI,
          this.board ?? /** @type {HTMLDivElement} */ (undefined)
        )
      )
    }
    return Object.values(surroundings)
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
   * Applies highlight CSS classes to all cells occupied by ship preview.
   * Iterates through cells, validates bounds, adds 'good'/'notgood'/'bad' class.
   * Skips cells outside map bounds to prevent console errors.
   *
   * @param {GridBoard} grid - The grid board providing nodeAt for DOM access
   * @param {Coord[]} cells - Array of [col, row] cells to highlight
   * @param {boolean} isPlacementValid - Whether placement is valid (determines class type)
   * @param {PlacementData} placement - Placement object with notGood constraint grid
   *
   * @returns {void}
   */
  applyHighlights (
    /** @type {GridBoard} */ grid,
    /** @type {Coord[]} */ cells,
    /** @type {boolean} */ isPlacementValid,
    /** @type {PlacementData} */ placement
  ) {
    const bhMap = this.map
    for (const [x, y] of cells) {
      // @ts-ignore
      if (bhMap?.isInBoundsAt(x, y)) {
        const cell = grid.node(x, y)
        const cellClass = placement.getHighlightClass(isPlacementValid, x, y)
        if (cell && cellClass) {
          cell.classList.add(cellClass)
        }
      }
    }
  }
  /**
   * Attaches hover event listeners to all board cells (static factory).
   * Shows/hides area-of-effect or targeting information on mouse movement.
   * Convenience method for creating GridBoard and setting up hover handlers in one call.
   *
   * **Event Binding**:
   * - mouseenter: onEnter(weaponSource, row, col)
   * - mouseleave: onLeave.call(thisRef, row, col)
   *
   * @param {GridMap} map - Map configuration (defaults to current map)
   * @param {CellHoverEnterCallback} onEnter - Mouseenter handler for showing weapon preview
   * @param {CellHoverLeaveCallback} onLeave - Mouseleave handler for hiding weapon preview
   * @param {Object} model - Context ('this' binding) for onLeave callback
   * @param {any} viewModel - Weapon source data passed to all onEnter calls
   * @returns {void}
   * @static
   * @public
   */
  static addHover (viewModel, model, map, onEnter, onLeave) {
    const boardElement = /** @type {HTMLDivElement} */ viewModel.board
    /** @type {GridBoard} */
    const grid = new GridBoard(boardElement, map)
    grid.addHover(onEnter, onLeave, viewModel, model)
  }
  /**
   * Attaches hover event listeners to all board cells.
   * Shows/hides area-of-effect or targeting information on mouse movement.
   * Binds onEnter with weaponSource and cell coordinates.
   * Binds onLeave with cell coordinates and thisRef context.
   *
   * **Event Binding Details**:
   * - mouseenter: onEnter.bind(null, weaponSource, y, x) — note row/col order (y, x)
   * - mouseleave: onLeave.bind(thisRef, y, x) — preserves 'this' context
   *
   * **Coordinate System**:
   * - Gets (x, y) from NodeUI.getXY()), then passes (y, x) to callbacks
   * - Callbacks receive row (y) first, then col (x) — standard grid convention
   *
   * @param {CellHoverEnterCallback} onEnter - Mouseenter handler (weaponSource, row, col) => void
   * @param {CellHoverLeaveCallback} onLeave - Mouseleave handler (row, col) => void
   * @param {Object} [thisRef] - Context object for onLeave.call() binding
   * @param {any} [weaponSource] - Weapon source data passed to all onEnter calls
   * @returns {void}
   * @public
   */
  addHover (onEnter, onLeave, thisRef, weaponSource) {
    this.#forEachBoardCell((/** @type {HTMLElement} */ el) => {
      const { x, y } = NodeUI.getXY(/** @type {HTMLDivElement} */ (el))
      // @ts-ignore - addEventListener signature compatible at runtime
      el.addEventListener('mouseenter', onEnter.bind(null, weaponSource, y, x))
      // @ts-ignore - addEventListener signature compatible at runtime
      el.addEventListener('mouseleave', onLeave.bind(thisRef, y, x))
    })
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
   * Refreshes terrain coloring for all board cells.
   * Called when terrain configuration has changed.
   *
   * @returns {void}
   */
  refreshAllColor () {
    this.#forEachBoardCell((/** @type {HTMLElement} */ el) =>
      this.refreshColor(el)
    )
  }

  /**
   * Removes all weapon activation indicators from board.
   * Deactivates visual targeting display for all cells.
   *
   * @returns {void}
   */
  deactivateWeapons () {
    this.#forEachBoardCell((/** @type {HTMLElement} */ cell) =>
      CellClassManager.deactivateWeapon(cell)
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
    this.#forEachBoardCell((/** @type {HTMLElement} */ el) =>
      el.classList.remove(...tags)
    )
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
  #clearCellVisuals (cell, details, classClear) {
    const clear =
      classClear || CellClassManager.clearCell.bind(CellClassManager)
    ShipCellDisplayer.clearDetails(cell, details)
    clear(cell)
  }
  /**
   * Clears cell visuals across entire board using provided strategy.
   * Generic method applying custom clearing callback and detail level to all cells.
   *
   * @param {'none'|'content'|'all'} details - What to clear: 'none', 'content', or 'all'
   * @param {CellClassClearer} [classClearer] - Function to clear cell classes
   * @returns {void}
   */
  #clearAllCellVisuals (details, classClearer) {
    const clear =
      classClearer || CellClassManager.clearCell.bind(CellClassManager)
    this.#forEachBoardCell((/** @type {HTMLElement} */ el) =>
      this.#clearCellVisuals(/** @type {HTMLDivElement} */ (el), details, clear)
    )
  }

  /**
   * Clears all cell visuals (text, styles, and classes) from entire board.
   * Returns board to clean state with only terrain coloring.
   *
   * @returns {void}
   */
  clearVisuals () {
    this.#clearAllCellVisuals('all')
  }

  /**
   * Clears friendly board cell visuals including damage indicators.
   * Preserves terrain coloring but removes game state classes.
   * @public
   * @returns {void}
   */
  clearFriendVisuals () {
    this.#clearAllCellVisuals(
      'all',
      CellClassManager.clearFriendCell.bind(CellClassManager)
    )
  }

  /**
   * Clears only friendly cell classes, preserving text and styling.
   * Used when resetting game state without visual refresh.
   * @public
   * @returns {void}
   */
  clearFriendClasses () {
    this.#clearAllCellVisuals(
      'none',
      CellClassManager.clearFriendCell.bind(CellClassManager)
    )
  }
  /**
   * Apply CSS highlighting to splash area cells.
   *
   * Iterates splash cells and adds CSS classes for visual display.
   * Classes applied:
   * - Power-level-based class (e.g., 'power-1', 'power-2') from bh.splashTags[powerLevel]
   * - 'target' class for unified styling and easy removal
   *
   * @param {Array<SplashCell>} splashCells - [row, col, powerLevel] cells.
   *                                         PowerLevel determines color intensity (0-n).
   * @returns {void}
   */
  #applyHighlightsToCells (splashCells) {
    const ui = /** @type {any} */ (this.boardUI)
    const bhRef = /** @type {any} */ (bh)
    for (const [y, x, powerLevel] of splashCells) {
      const cell = this.nodeAt(x, y)
      const cellClass = bhRef?.splashTags?.[powerLevel]
      if (cell && cellClass) cell.classList.add(cellClass, 'target')
    }
  }

  /**
   * Removes temporary hint indicators from entire board.
   * Clears targeting or placement hints.
   * @public
   * @returns {void}
   */
  deactivateTempHints () {
    this.#forEachBoardCell((/** @type {HTMLElement} */ cell) =>
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
    this.#forEachBoardCell((/** @type {HTMLElement} */ cell) =>
      CellClassManager.clearDisplayCell(cell)
    )
  }
  /**
   * Gets all cells on board belonging to a specific ship.
   * Filters cells by matching ship ID in dataset.
   *
   * @param {number} id - Ship ID to match
   * @returns {HTMLElement[]} Array of cells belonging to the ship
   */
  shipCells (id) {
    /** @type {HTMLElement[]} */
    const list = []
    this.#forEachBoardCell((/** @type {HTMLElement} */ cell) => {
      // @ts-ignore - dataset property available on Element
      const cellId = cell?.dataset?.id ? Number.parseInt(cell.dataset.id) : null
      if (cellId === id) {
        // @ts-ignore - Element from HTMLCollection, cast to HTMLElement
        list.push(cell)
      }
    })
    return list
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
    const cell = this.node(x, y)
    if (cell == null) return
    CellClassManager.deactivateWeapon(cell)
  }

  /**
   * Deactivates weapon display on a cell.
   * Removes weapon and rotation indicators.
   *
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   */
  cellHintDeactivate (x, y) {
    const cell = this.node(x, y)
    if (cell == null) return
    CellClassManager.deactivateTempHint(cell)
  }

  /**
   * Removes all visual highlight states from board cells.
   * Clears placement validity indicators (good/notgood/bad/worse classes).
   * Restores all cells to neutral appearance after placement preview completes.
   *
   * **Side Effects**:
   * - Iterates all board cells via #forEachBoardCell
   * - Removes all classes from GridBoard.#HIGHLIGHT_CLASSES
   * - Used to clear placement feedback after placement action completes
   * - Called when placement cancelled or finalized
   *
   * **Performance**: O(n*c) where n = cells, c = highlight classes (4)
   *
   * @returns {void}
   * @public
   */
  removeHighlight () {
    this.#forEachBoardCell(el => {
      GridBoard.#HIGHLIGHT_CLASSES.forEach(cls => {
        el.classList.remove(cls)
      })
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
    /** @type {GridBoard} */
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
    /** @type {string[]} */
    const tags = ['target', ...Object.values(bh.splashTags)]
    this.#forEachBoardCell((/** @type {HTMLElement} */ el) =>
      el.classList.remove(...tags)
    )
  }
  /**
   * Builds board grid for screen display (static factory).
   * Creates interactive grid with cell elements and optional click handlers.
   * Convenience method wrapping createScreenGrid with GridBoard creation.
   * Used during game initialization to render the playable board.
   *
   * @param {HTMLElement|null} boardElement - The board container element
   * @param {((row: number, col: number, event: MouseEvent) => void)|undefined} [onClick] - Click handler for cells (row, col, event) => void
   * @param {Object} [thisRef] - Context ('this' binding) for click handler
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   * @static
   * @public
   */
  static createScreenGrid (boardElement, onClick, thisRef, map) {
    /** @type {GridBoard} */
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
    /** @type {GridMap} */
    const map = this.map

    for (const [x, y] of this.locations()) {
      if (onClick) {
        CellUI.createAndAppendTo(
          this.board ?? /** @type {HTMLDivElement} */ (undefined),
          x,
          y,
          map,
          onClick.bind(thisRef, y, x)
        )
      } else {
        CellUI.createAndAppendTo(
          this.board ?? /** @type {HTMLDivElement} */ (undefined),
          x,
          y,
          map,
          onClick
        )
      }
    }
  }
  /**
   * Builds board grid for print output with labels (static factory).
   * Creates grid with row/column labels optimized for printing.
   * Convenience method wrapping createPrintableGrid with GridBoard creation.
   *
   * @param {HTMLElement|null} boardElement - The board container element
   * @param {GridMap} [map] - Map configuration (defaults to current map)
   * @returns {void}
   * @static
   * @public
   */
  static createPrintableGrid (boardElement, map) {
    /** @type {GridBoard} */
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
    /** @type {GridMap} */
    const map = this.map
    CellUI.createEmptyNodeAndAppendTo(
      this.board ?? /** @type {HTMLDivElement} */ (undefined)
    )
    for (let x = 0; x < map.cols; x++) {
      NodeUI.createColLabelNodeAndAppendTo(
        this.board ?? /** @type {HTMLDivElement} */ (undefined),
        x
      )
    }
    for (let y = 0; y < map.rows; y++) {
      NodeUI.createRowLabelNodeAndAppendTo(
        this.board ?? /** @type {HTMLDivElement} */ (undefined),
        map.rows,
        y
      )
      for (let x = 0; x < map.cols; x++) {
        CellUI.createAndAppendTo(
          this.board ?? /** @type {HTMLDivElement} */ (undefined),
          x,
          y,
          map
        )
      }
    }
  }
  /**
   * Iterates over all cells in the board, calling callback for each.
   * Provides functional interface to board cell enumeration.
   *
   * @param {(cell: HTMLElement) => void} callback - Function to call for each cell
   * @returns {void}
   */
  #forEachBoardCell (callback) {
    for (const cell of this.cells) {
      callback(/** @type {HTMLElement} */ (cell))
    }
  }
  get cells () {
    return getBoardChildren(this.board)
  }

  /**
   * Gets armed ship cells (cells with ammo > 0).
   * Filters all board cells to find those with loaded weapons.
   *
   * @returns {HTMLElement[]} Array of armed cell DOM elements
   */
  get armedCells () {
    return this.cells.filter(
      (/** @type {any} */ c) => Number.parseInt(c?.dataset?.ammo || '0') > 0
    )
  }

  /**
   * Gets armed ship cells for a specific weapon letter.
   * Filters armed cells to those with specified weapon letter.
   *
   * @param {string} letter - Weapon letter identifier (e.g., 'M', 'R', 'T')
   * @returns {HTMLElement[]} Array of armed cells with matching weapon letter
   */
  armedCellsWithWeapon (letter) {
    return this.cells.filter(
      (/** @type {any} */ c) =>
        Number.parseInt(c?.dataset?.ammo || '0') > 0 &&
        c?.dataset?.wletter === letter
    )
  }
  /**
   * Generator for all cell coordinates in the board.
   * Yields coordinates in row-major order: top-left to bottom-right.
   * @yields {XY} Cell coordinates as [x, y] tuples
   * @returns {Generator<XY, void, void>} Generator of coordinate pairs
   */
  *locations () {
    for (let y = 0; y < this.map.rows; y++) {
      for (let x = 0; x < this.map.cols; x++) {
        yield [x, y]
      }
    }
  }
  /**
   * Clears all cell styling classes from every cell in the board.
   * Returns board to base state (only terrain coloring remains).
   * Useful when transitioning between game modes or resetting board state.
   *
   * **Side Effects**:
   * - Calls CellClassManager.clearCell on every board cell
   * - Removes all game-state classes (placed, hit, destroyed, weapon, etc.)
   * - Preserves terrain/landform coloring (colors are data, not classes)
   * - Typically called before reapplying game state after mode change
   *
   * **Performance**: O(n) where n is number of cells
   *
   * @returns {void}
   * @public
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
   * **Behavior**:
   * - Iterates through array of ship objects
   * - For each ship, calls markShipsWeapons() to mark armed cells
   * - Handles null/undefined ships gracefully with early return
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
   * **Side Effects**:
   * - Clears visual styling from all board cells using ShipCellDisplayer.clearPlaceCell
   * - Invokes dragNDrop.drop() and dragNDrop.dragEnter() on each cell for event binding
   * - Calls additionalSetup callback on each cell if provided for custom configuration
   * - Used internally by makeDroppable() and makeAddDroppable() methods
   *
   * **Parameters**:
   * - model.UI: Required for drag-drop event handlers
   * - model.placement: Used by drag-drop handlers for placement validation
   *
   * @param {GameModel} model - Game model containing placement rules and state
   * @param {(cell:HTMLElement)=>void} [additionalSetup] - Optional callback for additional cell configuration (e.g., weapon-specific setup)
   * @returns {void}
   * @private
   */
  #configureBoardCellsForDrop (model, additionalSetup) {
    this.#forEachBoardCell(cell => {
      ShipCellDisplayer.clearPlaceCell(cell)
      if (additionalSetup) {
        additionalSetup(cell)
      }
      dragNDrop.drop(cell, model, model.UI)
      dragNDrop.dragEnter(cell, model, model.UI)
    })
  }

  /**
   * Prepares board cells for standard ship placement with drop handlers.
   * Clears existing visuals and enables drag-drop interactions for ship placement.
   * Provides baseline cell configuration for placement UI state.
   *
   * **Side Effects**:
   * - Calls #configureBoardCellsForDrop with no additional setup
   * - Enables drag-drop event listeners on all board cells
   * - Clears previous cell styling
   *
   * @param {GameModel} model - Game model with placement configuration and constraints
   * @returns {void}
   * @public
   */
  makeDroppable (model) {
    this.#configureBoardCellsForDrop(model)
  }

  /**
   * Prepares board cells for additional weapon placement with enhanced drop handlers.
   * Includes weapon-specific drop behavior in addition to standard placement handlers.
   * Called after initial placement to enable weapon installation on already-placed ships.
   *
   * **Side Effects**:
   * - Invokes dragNDrop.addWeaponDrop(model, viewModel) to register weapon-specific handlers
   * - Calls #configureBoardCellsForDrop with weapon-specific additional setup
   * - Enables weapon drop targets on all board cells
   *
   * **Parameters**:
   * - viewModel: Should contain weapon selection and placement context
   * - model.UI: Required for weapon drag-drop event routing
   *
   * @param {GameModel} model - Game model with weapon placement configuration
   * @param {any} viewModel - View model for weapon placement UI state
   * @returns {void}
   * @public
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
  makeBrushable (viewModel) {
    this.#forEachBoardCell(cell => {
      dragNDrop.dragBrushEnter(cell, viewModel)
    })
  }

  /**
   * Removes and reapplies terrain coloring to cell at coordinates.
   * Updates CSS styling to reflect current terrain at location.
   * Called after terrain modifications via brush tool.
   * Ensures cell visual representation matches current map state.
   *
   * **Side Effects**:
   * - Looks up cell element by coordinates using CellUI.fromBoard
   * - Calls cellUI.recolor() to apply updated terrain colors
   * - Logs warning if board element is missing
   *
   * **Error Handling**:
   * - Returns silently if board is null (prevents errors)
   * - Handles undefined cellUI gracefully
   * - Provides console warning for debugging
   *
   * @param {number} x - Column coordinate (0-indexed, x-axis)
   * @param {number} y - Row coordinate (0-indexed, y-axis)
   * @returns {void}
   * @public
   */
  recolor (x, y) {
    const board = this.board
    if (board) {
      const cellUI = CellUI.fromBoard(
        /** @type {HTMLDivElement} */ (board),
        x,
        y,
        this.map
      )
      if (cellUI) {
        cellUI.recolor()
      }
    } else {
      console.warn('Cannot recolor cell: board element is missing')
    }
  }

  /**
   * Sets land terrain cells in square area around brush center.
   * Applies subterrain type to grid cells in square pattern centered at coordinates.
   * Validates bounds before each assignment to prevent out-of-bounds errors.
   * Updates cell colors after terrain assignment to reflect new type.
   * Recolors extended area (larger than paint area) to update neighboring cells.
   * Called internally by applyBrushOperation to execute terrain painting.
   *
   * **Bounds Validation**:
   * - Checks using map.inBounds() before each cell assignment
   * - Skips cells outside map boundaries silently
   * - Uses map.setLand() to assign terrain type
   *
   * **Area Calculation**:
   * - Iterates from min offset to max offset in both x and y
   * - Creates square area (not circular)
   * - Examples:
   *   - min=-1, max=2: 3x3 square with center offset
   *   - min=0, max=1: 1x1 single cell
   *   - min=-0.5, max=1.5: 2x2 half-size variant
   *
   * **Side Effects**:
   * - Modifies map terrain state for each valid cell
   * - Calls this.recolor() to update visual representation
   *
   * @param {number} x - Center column coordinate (0-indexed, x-axis)
   * @param {number} y - Center row coordinate (0-indexed, y-axis)
   * @param {number} min - Minimum offset from center (-1, 0, or -0.5 for half-size)
   * @param {number} max - Maximum offset from center (1, 2, or 1.5 for half-size)
   * @param {string} subterrain - Terrain type identifier to paint (e.g., 'sand', 'water', 'mountain')
   *
   * @returns {void}
   * @private
   */
  #setLandCells (
    /** @type {number} */ x,
    /** @type {number} */ y,
    /** @type {number} */ min,
    /** @type {number} */ max,
    /** @type {string} */ subterrain
  ) {
    /** @type {GridMap} */
    const currentMap = this.map
    for (let i = min; i < max; i++) {
      for (let j = min; j < max; j++) {
        // @ts-ignore
        if (currentMap.isInBoundsAt(x + i, y + j)) {
          // @ts-ignore
          currentMap.setLand(x + i, y + j, subterrain)
          this.recolor(x + i, y + j)
        }
      }
    }
  }

  /**
   * Applies brush painting operation to map at specified coordinates.
   * Sets land terrain cells in square area around cursor based on brush size.
   * Only applies to CustomMap instances (not default maps) to prevent modifying built-in maps.
   * Called on each dragenter event during brush drag operation for real-time terrain painting.
   *
   * **Brush Size Mapping**:
   * - Size > 2: Large brush (2×2 area, offsets -1 to 2)
   * - Size = 2: Medium brush (2×2 area, offsets 0 to 2)
   * - Size = 1: Small brush (1×1 area, offsets 0 to 1)
   * - Size <= 0: No operation (early return)
   *
   * **Constraints**:
   * - Only modifies CustomMap instances (not bh.map or other map types)
   * - Validates all cell coordinates using map.inBounds()
   * - Skips operation if brush or map configuration missing
   * - Returns early if brush size is 0 or negative
   *
   * **Implementation**:
   * - Checks if map is CustomMap using instanceof CustomMap
   * - Calculates min/max offsets based on brush size
   * - Calls #setLandCells to apply terrain changes
   * - Terrain type from brush.subterrain property
   *
   * @param {Brush} brush - Brush configuration with size and subterrain type
   * @param {number} x - Center column coordinate for brush operation (0-indexed, x-axis)
   * @param {number} y - Center row coordinate for brush operation (0-indexed, y-axis)
   *
   * @returns {void}
   * @public
   */
  applyBrushOperation (
    /** @type {Brush} */ brush,
    /** @type {number} */ x,
    /** @type {number} */ y
  ) {
    const size = brush?.size
    const subterrain = brush?.subterrain
    const map = this.map

    if (!(size && subterrain && map instanceof CustomMap)) return

    const min = size > 2 ? -1 : 0
    const max = size < 2 ? 1 : 2

    this.#setLandCells(x, y, min, max, subterrain)
  }
}
