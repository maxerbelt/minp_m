import { bh } from '../terrains/all/js/bh.js'
import { parsePair } from '../core/utilities.js'
import { Mask } from '../grid/rectangle/mask.js'
import { SubBoard } from '../grid/subBoard.js'
import { Zip } from '../core/Zip.js'

// WeaponSystem is used in JSDoc typedefs but not directly in code

/**
 * @typedef {Object} PositionedWeaponSystem
 * WeaponSystem with row/col coordinates
 * @property {number} id - Unique identifier for weapon system
 * @property {Object} weapon - Weapon instance with damage/hit properties
 * @property {number} row - Row coordinate of weapon on board
 * @property {number} col - Column coordinate of weapon on board
 * @property {boolean} [hit] - Whether weapon has been hit by enemy fire
 * @property {boolean} [damaged] - Whether weapon is damaged but not hit (unloaded)
 * @property {number} [ammo] - Current ammunition count
 * @property {Function} [hasAmmo] - Check if weapon has ammunition
 * @property {Function} [ammoRemaining] - Get remaining ammunition
 * @property {Function} [ammoCapacity] - Get ammunition capacity
 * @property {Function} [animateDetonation] - Animation function for detonation
 * @property {Function} [reset] - Reset weapon state
 */

/**
 * @typedef {Object|PositionedWeaponSystem} Rack
 * Weapon rack (WeaponSystem or positioned variant)
 */

/**
 * @typedef {Object} Placement
 * Placement configuration interface
 * @property {SubBoard} board - Board defining placement
 * @property {Object<string, Rack>} [weapons] - Weapon systems by coordinate key
 * @property {number} [variant] - Placement variant index
 */

/**
 * @typedef {Object} HitResult
 * Hit processing result interface
 * @property {string} letter - Ship letter identifier
 * @property {string|null} info - Hit information message
 * @property {string|null} damaged - Damage type indicator ('burnt', 'skull', 'damaged')
 * @property {Array<{key: string, cell: [number, number], damaged: string}>} list - Array of hit results
 * @property {Array<{key: string, cell: [number, number], damaged: string}>} misses - Array of miss results
 */

/**
 * @typedef {Object} DamageResult
 * Damage processing result interface
 * @property {Array<{key: string, cell: [number, number], damaged: string}>} hits - Array of hit coordinates
 * @property {Array<{key: string, cell: [number, number], damaged: string}>} misses - Array of miss coordinates
 * @property {number} dtaps - Number of double taps (already hit cells)
 */

/**
 * @typedef {[number, number]} CoordinatePair
 * Array coordinate pair [row, column]
 */

/**
 * @typedef {[string, Rack]} WeaponEntry
 * Weapon entry pair for iteration [coordKey, weaponSystem]
 * @description Format is ["row,col", weaponSystem] for tracking weapon positions
 */

/**
 * @typedef {Object} ShipShape
 * Ship shape definition
 * @property {string} symmetry - Symmetry type
 * @property {string} letter - Ship letter identifier
 * @property {Object<string, any>} weaponSystem - Weapon system configuration
 * @property {string} [tallyGroup] - Tally group identifier
 * @property {(filter?: Function) => ShipShape[]} [placeables] - Available placement variants
 * @property {(variant: number, r: number, c: number) => CoordinatePair[]} [placeCells] - Calculate placement cells
 */

/**
 * @typedef {Object} ShipCellGrid
 * Grid tracking occupied ship cells
 * @property {(r: number, c: number) => boolean} hasRC - Check if cell is occupied
 * @property {(r: number, c: number, cell: Object) => void} setCell - Set cell value
 * @property {(r: number, c: number, inBoundsFn: Function) => boolean} isAreaClearAroundXY - Check no adjacent ships
 */

/**
 * @typedef {Object} MapInterface
 * Game map interface
 * @property {(r: number, c: number) => boolean} isLand - Check if cell is land
 * @property {(r: number, c: number) => boolean} inBounds - Check if coordinates in bounds
 * @property {(r: number, c: number) => CoordinatePair[]} surround - Get surrounding cells
 */

/**
 * @typedef {Object} UIViewModel
 * UI view model interface
 * @property {(r: number, c: number) => any} gridCellAt - Get grid cell at coordinates
 * @property {(cell: any, damaged: string) => void} useAmmoInCell - Mark ammo used in cell
 * @property {() => number} cellSize - Get cell size in pixels
 */

/**
 * @typedef {Object} GameModel
 * Game model interface
 * @property {UIViewModel} UI - UI view model
 * @property {any} loadOut - Ship loadout manager
 * @property {any} [opponent] - Opponent ship reference
 * @property {() => void} updateUI - Update UI display
 */

/**
 * @typedef {Object} WeaponAtPosition
 * Weapon positioned at specific location
 * @property {(r: number, c: number) => boolean} hasAmmo - Check ammunition availability
 * @property {number} [ammo] - Ammunition count
 * @property {() => number} [ammoRemaining] - Get remaining ammunition
 * @property {() => number} [ammoCapacity] - Get ammunition capacity
 * @property {string} [letter] - Weapon letter identifier
 * @property {number} id - Weapon system unique ID
 * @property {boolean} [hit] - Whether weapon has been hit
 * @property {boolean} [damaged] - Whether weapon is damaged
 * @property {any} [weapon] - Weapon instance with properties
 * @property {(cell: any, cellSize: number) => void} [animateDetonation] - Animation function
 * @property {() => void} [reset] - Reset weapon state
 */

/**
 * @typedef {Object} MagazineHitResult
 * Result of magazine hit processing
 * @property {string} damaged - Damage type indicator
 * @property {string|null} info - Hit information message
 * @property {Array} hits - Hit cells from detonation
 * @property {Array} misses - Miss cells from detonation
 */

/**
 * Internal: Get first element from array or iterator
 * Handles strings, arrays, and iterators safely with type checking.
 * @param {string | any[] | IterableIterator<any>} arr - Array, string, or iterable
 * @returns {any|null} First element or null if empty/invalid
 * @private
 */
function firstElement (arr) {
  if (!arr) return null
  if (typeof arr === 'string' && arr.length > 0) return arr[0]
  if (Array.isArray(arr) && arr.length > 0) return arr[0]
  // For iterators, convert to array first
  if (arr && typeof arr[Symbol.iterator] === 'function') {
    const arr_temp = Array.from(arr)
    return arr_temp.length > 0 ? arr_temp[0] : null
  }
  return null
}

/**
 * Ship - Represents a single game ship with placement, weapons, and hit tracking
 *
 * Ships maintain their own state including:
 * - Position and size on game board (board, cells, size)
 * - Equipped weapons and ammunition (weapons, weaponsById)
 * - Hit tracking and damage state (hits, sunk, placed)
 * - Connection to shape definition for placement variants (shape)
 *
 * Weapons are tracked by coordinate key ("row,col") and internal ID.
 * Hits are recorded in a Mask object tracking which cells have been targeted.
 * Ships can have multiple placement variants with different weapon configurations.
 *
 * @class Ship
 * @property {number} id - Unique ship identifier
 * @property {string} symmetry - Ship symmetry type
 * @property {string} letter - Single letter identifier (A-Z)
 * @property {SubBoard|Mask} hits - Mask tracking hit locations on this ship
 * @property {SubBoard} [_board] - Board representing ship cells (internal)
 * @property {number} size - Number of cells occupied by ship
 * @property {boolean} placed - Whether ship has been placed on board
 * @property {boolean} sunk - Whether all cells have been hit
 * @property {number} variant - Current placement variant index
 * @property {ShipShape} [_shape] - Ship shape definition (cached, internal)
 * @property {[number, number][]} [_cellsArray] - Array of ship cells (cached, internal)
 * @property {Map<number, Rack>} [_weaponsById] - Weapons indexed by ID (cached, internal)
 * @property {Object<string, Rack>} [_weapons] - Weapons indexed by coordinate (cached, internal)
 */
export class Ship {
  /**
   * Create a new ship instance
   * @param {number} id - Unique ship identifier
   * @param {string} symmetry - Ship symmetry type (e.g., 'vert', 'horiz')
   * @param {string} letter - Ship letter identifier (A-Z)
   * @param {Object<string, Rack>} [weapons] - Initial weapons configuration (optional)
   *   Format: {"row,col": weaponSystem, ...}
   */
  constructor (id, symmetry, letter, weapons) {
    this.id = id
    this.symmetry = symmetry
    this.letter = letter
    this.hits = Mask.empty(0, 0)
    this.size = 1
    this.placed = false
    this.sunk = false
    this.variant = 0
    this._board = undefined
    this._shape = undefined
    this._cellsArray = undefined
    this._weaponsById = undefined
    this.__weaponArray = undefined
    this._weapons = undefined
    if (weapons) {
      this.weapons = weapons
    }
  }

  /**
   * Get weapons indexed by unique ID
   * Lazily initializes Map on first access.
   * @returns {Map<number, Rack>} Map of weapon systems by ID
   */
  get weaponsById () {
    if (this._weaponsById) {
      return this._weaponsById
    }
    this._weaponsById = new Map()
    return this._weaponsById
  }
  /**
   * Get weapons indexed by coordinate key ("row,col")
   * Lazily generates from weaponsById map on first access.
   * @returns {Object<string, Rack>} Object with coordinate keys mapping to weapon systems
   */
  get weapons () {
    if (this._weapons) {
      return this._weapons
    }
    if (!this._weaponsById?.size) return {}
    this._weapons = this._idWeaponMapToWeaponPositionObject()
    return this._weapons
  }
  /**
   * Set weapons from various input formats (Map, Array, Set, or Object)
   * Automatically converts input to internal weaponsById Map format.
   * @param {Map<number, Rack>|Array<Rack>|Array<[string, Rack]>|Object<string, Rack>} weapons
   *   Weapons in various formats
   */
  set weapons (weapons) {
    this._createOrUpdateWeapons(weapons)
  }
  /**
   * Internal: Convert weapon ID map to coordinate-keyed object
   * Transforms weaponsById Map to weapons object indexed by coordinate key.
   * @returns {Object<string, Rack>} Weapon object indexed by coordinate keys ("row,col")
   * @private
   */
  _idWeaponMapToWeaponPositionObject () {
    return this._weaponEntriesFromIdMap().reduce(
      /**
       * @param {Object<string, Rack>} obj
       * @param {[string, Rack]} entry
       */
      (obj, [key, weapon]) => {
        obj[key] = weapon
        return obj
      },
      {}
    )
  }
  /**
   * Internal: Create or update weapons from various input formats
   * Converts input to appropriate internal format (weaponsById Map or raw entries).
   * Delegates to specialized handlers based on input type (array, set, map, object).
   * @param {Map<number, Rack>|Array<Rack>|Array<[string, Rack]>|Set<any>|Object<string, Rack>} weapons
   *   Weapons in various input formats
   * @returns {void}
   * @throws {Error} If weapons format is unrecognized
   * @private
   */
  _createOrUpdateWeapons (weapons) {
    const type = Zip.getType(weapons)
    switch (type) {
      case 'array':
      case 'set':
        this._createOrUpdateWeaponsArray([...weapons])
        return
      case 'map':
        this._weaponsById = weapons
        return
      case 'object':
        this._createOrUpdateWeaponsRaw(Object.entries(weapons))
        return
      default:
        throw new Error(
          'Invalid weaponsById format: expected Map, Array, Set, or Object'
        )
    }
  }
  /**
   * Internal: Import weapons and route to appropriate handler
   * Routes to either shape import or placement import based on existing weapons.
   * @param {Map<number, Rack>|Array<[string, Rack]>|Object<string, Rack>} weapons
   *   Weapons data in raw format
   * @returns {{weaponsById: Map<number, Rack>, weaponArray: Rack[]}}
   *   Object with {weaponsById, weaponArray} after processing
   * @private
   */
  _importWeapons (weapons) {
    const numWeapon = this.numWeapons
    if (numWeapon === 0) {
      return this._weaponsFromShape(weapons)
    } else {
      return this._weaponsFromPlacement(weapons)
    }
  }
  /**
   * Internal: Create or update weapons from array input
   * Distinguishes between arrays of entries and arrays of weapon objects.
   * If all items are arrays, treats as coordinate-key pairs; otherwise stores as weapon array.
   * @param {Array<Rack>|Array<[string, Rack]>} weapons
   *   Array of weapons or [coordKey, weapon] pairs
   * @returns {void}
   * @private
   */
  _createOrUpdateWeaponsArray (weapons) {
    const allAreArrays = weapons.every(Array.isArray)
    if (allAreArrays) {
      this._createOrUpdateWeaponsRaw(weapons)
      return
    }
    this._weaponArray = weapons
  }
  /**
   * Internal: Create or update weapons from raw entries (coordinate-keyed pairs)
   * Processes coordinate-keyed weapon entries and imports them appropriately.
   * Skips empty weapon lists. Updates internal weaponsById and weaponArray.
   * @param {Array<[string, Rack]>} weapons
   *   Array of [coordKey, weaponSystem] pairs
   * @returns {void}
   * @private
   */
  _createOrUpdateWeaponsRaw (weapons) {
    const numNew = weapons.length
    if (numNew === 0) {
      return
    }
    // const weaponIDs = weapons.map(w => w.id)
    // console.trace('Setting weaponsById:', weaponIDs, weapons)
    const { weaponsById, weaponArray } = this._importWeapons(weapons)
    if (!weaponsById?.size) return {}
    this._weaponsById = weaponsById
    this._weaponArray = weaponArray
    this._weapons = this._idWeaponMapToWeaponPositionObject()
  }
  /**
   * Internal: Get cached weapon array or initialize from default
   * Lazily initializes weaponArray from weaponsById on first access.
   * @returns {Rack[]} Array of weapon systems
   * @private
   */
  get _weaponArray () {
    if (this.__weaponArray) {
      return this.__weaponArray
    }
    this.__weaponArray = this._defaultWeaponArray
    return this.__weaponArray
  }
  /**
   * Internal: Generate default weapon array from weaponsById Map
   * Creates array of all weapons from weaponsById Map values.
   * @returns {Rack[]} Array of all weapons or empty array if no weaponsById
   * @private
   */
  get _defaultWeaponArray () {
    const values = this._weaponsById?.values()
    return values ? Array.from(values) : []
  }
  /**
   * Internal: Set cached weapon array
   * Creates a copy of the weapons array to maintain independence.
   * @param {Rack[]} weapons - Array of weapon systems to cache
   * @returns {void}
   * @private
   */
  set _weaponArray (weapons) {
    this.__weaponArray = Array.isArray(weapons) ? [...weapons] : []
  }
  /**
   * Check if any weapons are equipped
   * @returns {boolean} True if at least one weapon is equipped
   */
  get hasWeapon () {
    return this.numWeapons > 0
  }
  /**
   * Get total number of equipped weapons
   * @returns {number} Count of weapon systems (0 if none equipped)
   */
  get numWeapons () {
    return this._weaponArray?.length || this.weaponsById?.size || 0
  }

  /**
   * Get ship cells
   * Returns cached cells if available, otherwise extracts from board.
   * @returns {CoordinatePair[]} Array of [row, col] cell coordinates (empty if no board)
   */
  get cells () {
    if (this._cellsArray && this._cellsArray.length > 0) {
      return this._cellsArray
    }
    const board = this.board
    if (board && typeof board === 'object' && 'toCoords' in board) {
      const coords = board.toCoords
      if (Array.isArray(coords)) {
        return coords.map(cell =>
          Array.isArray(cell)
            ? [cell[0], cell[1]]
            : [cell?.r ?? 0, cell?.c ?? 0]
        )
      }
    }
    return []
  }
  /**
   * Set cells and update board
   * Normalizes cells to standard format and creates board from cell coordinates.
   * @param {CoordinatePair[]} cells - Array of cells to set in [row, col] format
   * @returns {void}
   */
  set cells (cells) {
    const normalizedCells = this._normalizeCells(cells)
    this._cellsArray = normalizedCells
    this.board = Mask.fromCoordsSquare(normalizedCells)
  }
  /**
   * Get ship board (Mask representing occupied cells)
   * Returns empty Mask if no board is set.
   * @returns {SubBoard|Mask} Board representing ship placement
   */
  get board () {
    return this._board || Mask.empty(0, 0)
  }
  /**
   * Set board and update ship properties
   * Updates size from board occupancy and resets hit tracking to board's empty mask.
   * @param {SubBoard|Mask|unknown} board - Board to assign
   * @returns {void}
   */
  set board (board) {
    /** @type {any} */
    const b = board
    this._board = b
    if (b && typeof b === 'object') {
      if ('occupancy' in b) {
        this.size = b.occupancy
      }
      if ('emptyMask' in b) {
        const emptyMask = b.emptyMask
        if (emptyMask) {
          this.hits = emptyMask
        }
      }
    }
  }
  /**
   * Get ship board height
   * @returns {number} Height of board (0 if no board)
   */
  get height () {
    const board = this.board
    return board && typeof board === 'object' && 'height' in board
      ? board.height
      : 0
  }
  /**
   * Get ship board width
   * @returns {number} Width of board (0 if no board)
   */
  get width () {
    const board = this.board
    return board && typeof board === 'object' && 'width' in board
      ? board.width
      : 0
  }
  /**
   * Get minimum ship size (smaller of width/height)
   * Used to determine minimum distance constraint for placement.
   * @returns {number} Minimum dimension of board (0 if no board)
   */
  get minSize () {
    const h = Number(this.height) || 0
    const w = Number(this.width) || 0
    return Math.min(h, w)
  }
  /**
   * Get maximum ship size (larger of width/height)
   * @returns {number} Maximum dimension
   */
  get maxSize () {
    const h = Number(this.height) || 0
    const w = Number(this.width) || 0
    return Math.max(h, w)
  }

  /**
   * Reset ship board and placement state
   * Clears ship cells and sets board to empty Mask, marking ship as not yet placed.
   * @returns {void}
   */
  resetBoard () {
    /**
     * @type {any[]}
     */
    this._cellsArray = []
    this.placed = false
    this.board = Mask.empty(0, 0)
  }

  /**
   * Static counter for unique ship identifiers
   * Incremented by next() method to ensure each ship gets a unique ID.
   * @type {number}
   */
  static id = 1

  /**
   * Increment static ship ID counter
   * Called after creating each new ship to prepare for the next one.
   * @returns {void}
   * @static
   */
  static next () {
    Ship.id++
  }

  /**
   * Calculate total hits across all ships
   * @param {Ship[]} ships - Array of ship instances
   * @returns {number} Total number of hits across all ships
   */
  static noOfHits (ships) {
    return ships.reduce((sum, s) => sum + s.getTotalHits(), 0)
  }
  /**
   * Count total number of sunk ships
   * @param {Ship[]} ships - Array of ship instances
   * @returns {number} Number of sunk ships in array
   */
  static noOfSunk (ships) {
    return ships.reduce((sum, s) => sum + (s.sunk ? 1 : 0), 0)
  }

  /**
   * Get turn information at given coordinates from primary weapon
   * Adjusts coordinates for hit mask offset before delegating to weapon.
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {string} Turn information string from weapon (empty string if no weapon)
   */
  getTurn (x, y) {
    // hits is a SubBoard/SubMask with offsetY, windowHeight, offsetX, windowWidth properties
    const hits = this.hits
    const offsetY = Number(
      hits && typeof hits === 'object' && 'offsetY' in hits
        ? hits.offsetY || 0
        : 0
    )
    const windowHeight = Number(
      hits && typeof hits === 'object' && 'windowHeight' in hits
        ? hits.windowHeight || 1
        : 1
    )
    const offsetX = Number(
      hits && typeof hits === 'object' && 'offsetX' in hits
        ? hits.offsetX || 0
        : 0
    )
    const windowWidth = Number(
      hits && typeof hits === 'object' && 'windowWidth' in hits
        ? hits.windowWidth || 1
        : 1
    )
    const y0 = y - offsetY - (windowHeight - 1) / 2
    const x0 = x - offsetX - (windowWidth - 1) / 2
    return this.getPrimaryWeapon()?.getTurn(this.variant, x0, y0) || ''
  }
  /**
   * Reset ship to initial state
   * Clears all hits, unsinks ship, and resets all weapons to their default state.
   * @returns {void}
   */
  reset () {
    this.resetHits()
    this.sunk = false
    this._resetAllWeapons()
  }

  /**
   * Internal: Reset state of all equipped weapons
   * Calls reset() method on each weapon if it exists.
   * @returns {void}
   * @private
   */
  _resetAllWeapons () {
    for (const weapon of this._weaponArray) {
      weapon.reset?.()
    }
  }
  /**
   * Reset hit tracking
   * @returns {void}
   */
  resetHits () {
    const board = this.board
    if (board && typeof board === 'object' && 'emptyMask' in board) {
      /** @type {any} */
      const boardAny = board
      const emptyMask = boardAny.emptyMask
      if (emptyMask) {
        this.hits = emptyMask
      }
    }
  }

  /**
   * Record a hit at coordinates (y, x)
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {void}
   */
  recordHit (x, y) {
    this.hits.set(x, y, 1)
  }

  /**
   * Check if ship has been hit at (y, x)
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @returns {boolean} True if hit has been recorded at this location
   */
  isHitAt (x, y) {
    return this.hits.test(x, y)
  }

  /**
   * Get total number of hits recorded on this ship
   * @returns {number} Total hit count
   */
  getTotalHits () {
    return this.hits.occupancy
  }

  /**
   * Check if ship is sunk (all cells have been hit)
   * @returns {boolean} True if all board cells are hit
   */
  isSunk () {
    const board = this.board
    const boardOccupancy =
      board && typeof board === 'object' && 'occupancy' in board
        ? board.occupancy
        : 0
    return this.getTotalHits() === boardOccupancy
  }

  /**
   * Internal: Get [coordKey, weapon] entries from weapons ID map
   * Converts weaponsById Map to array of [coordKey, weapon] pairs.
   * @returns {Array<[string, any]>} Array of [coordinate key, weapon] pairs
   * @private
   */
  _weaponEntriesFromIdMap () {
    if (!this._weaponsById) return []
    return Array.from(this._weaponsById, ([, weapon]) => {
      const positioned = /** @type {PositionedWeaponSystem} */ (weapon)
      return [`${positioned.row},${positioned.col}`, weapon]
    })
  }

  /**
   * Internal: Get all [coordKey, weapon] entries from internal weapon mapping
   * @returns {Array<[string, any]>} Array of [coordinate key, weapon] pairs
   * @private
   */
  _weaponEntries () {
    return Object.entries(this.weapons)
  }

  /**
   * Internal: Filter weapon entries by predicate function
   * @param {(weapon: any) => boolean} predicate - Function to test each weapon
   * @returns {Array<[string, any]>} Filtered array of [coordinate key, weapon] pairs
   * @private
   */
  _filterWeaponEntries (predicate) {
    return this._weaponEntries().filter(([, weapon]) => predicate(weapon))
  }

  /**
   * @param {{ symmetry: string; letter: string; weaponSystem: {}; }[]} shapes
   */
  /**
   * Create fleet from shape definitions, resetting ID counters
   * @param {ShipShape[]} shapes - Array of shape definitions
   * @returns {Ship[]} Array of created ships
   */
  static createShipsFromShapes (shapes) {
    Ship.id = 1
    // WeaponSystem.id is managed by WeaponSystemIdManager internally
    return Ship.extraShipsFromShapes(shapes)
  }
  /**
   * Create additional ships from shapes with optional filtering
   * @param {ShipShape[]} shapes - Array of shape definitions
   * @param {(shape: ShipShape) => boolean} [filter] - Optional filter function
   * @returns {Ship[]} Array of created ships
   */
  static extraShipsFromShapes (shapes, filter = () => true) {
    /** @type {Ship[]} */
    const ships = []
    for (const shape of shapes) {
      if (!filter?.(shape)) continue
      const newShip = Ship.createFromShape(shape)
      ships.push(newShip)
      Ship.next()
    }
    return ships
  }

  /**
   * Find weapon system at position
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {any|null} Weapon system at position or null if none
   */
  rackAt (x, y) {
    if (!this.__weaponArray?.length) return null
    const coordKey = `${x},${y}`
    return this._findWeaponAt(coordKey)
  }

  /**
   * Internal: Find weapon by coordinate key
   * @param {string} coordKey - Coordinate key formatted as "r,c"
   * @returns {any|null} Weapon system matching key or null
   * @private
   */
  _findWeaponAt (coordKey) {
    const result = this.weapons?.[coordKey]
    if (result) {
      return result
    }
    return this._weaponEntries().find(([key]) => key === coordKey)?.[1]
  }

  /**
   * Get first weapon system from all weapons
   * Returns the primary (first) weapon system or undefined if no weapons.
   * @returns {Rack|undefined} First weapon system or undefined
   */
  getPrimaryWeaponSystem () {
    return firstElement(this._weaponArray)
  }

  /**
   * Get primary weapon from first weapon system
   * Returns weapon object from primary weapon system or undefined if no weapons.
   * @returns {any|undefined} Weapon instance from primary system or undefined
   */
  getPrimaryWeapon () {
    return this.getPrimaryWeaponSystem()?.weapon
  }
  /**
   * Find closest loaded weapon rack to given coordinates
   * Searches among all loaded (ammunition-carrying) weapons for the closest one by distance.
   * @param {number} r - Row coordinate to measure distance from
   * @param {number} c - Column coordinate to measure distance from
   * @returns {Array<[string, Rack]>|null} [coordKey, weapon] pair of closest loaded weapon or null if none
   */
  findClosestLoadedRack (r, c) {
    const loadedRacks = this.getLoadedWeaponEntries()
    if (loadedRacks.length === 0) return null
    return this._findClosestRack(loadedRacks, r, c)
  }

  /**
   * Internal: Calculate closest rack from list by Euclidean distance
   * Compares distances from given point to all racks and returns the closest one.
   * @param {Array<[string, Rack]>} entries - Array of [coordKey, weapon] entries
   * @param {number} r - Row coordinate to measure distance from
   * @param {number} c - Column coordinate to measure distance from
   * @returns {Array<[string, Rack]>|null} Closest [coordKey, weapon] pair or null if entries empty
   * @private
   */
  _findClosestRack (entries, r, c) {
    if (entries.length === 0) return null
    if (entries.length === 1) return entries[0]
    const result = entries
      .slice(1)
      .reduce((/** @type {[any]} */ closest, /** @type {[any]} */ current) => {
        const [closestKey] = closest
        const [currentKey] = current
        const [closestR, closestC] = closestKey.split(',').map(Number)
        const [currentR, currentC] = currentKey.split(',').map(Number)
        const closestDist = Math.hypot(closestR - r, closestC - c)
        const currentDist = Math.hypot(currentR - r, currentC - c)
        return currentDist < closestDist ? current : closest
      }, entries[0])
    return result
  }
  /**
   * Find weapon system by its unique ID
   * Searches both weaponsById Map and weaponArray for weapon with matching ID.
   * @param {number} id - Weapon system unique identifier
   * @returns {Rack|undefined} Weapon system with matching ID or undefined if not found
   */
  getWeaponBySystemId (id) {
    if (this.weaponsById.has(id)) {
      return this.weaponsById.get(id)
    }
    return this._weaponArray.find(weapon => weapon.id === id)
  }

  /**
   * Check if this ship matches the given ID
   * @param {number} id - Ship ID to check
   * @returns {boolean} True if this ship's ID matches
   */
  matchesId (id) {
    return this.id === id
  }

  /**
   * Get self if ID matches, null otherwise
   * Used for finding ship in fleet by ID.
   * @param {number} id - Ship ID to match
   * @returns {Ship|null} This ship if ID matches, null otherwise
   */
  getShipById (id) {
    return this.id === id ? this : null
  }

  /**
   * Format weapon coordinates and IDs as string (e.g., "1,2:10|2,3:11")
   * Useful for serialization and debugging weapon placement.
   * @returns {string} Pipe-delimited string of "row,col:id" pairs
   */
  makeKeyIds () {
    return this._weaponEntries()
      .map(([key, weapon]) => `${key}:${weapon.id}`)
      .join('|')
  }

  /**
   * Get all [coordKey, weapon] entries for loaded weapons
   * Loaded weapons are those with ammunition remaining.
   * @returns {Array<[string, Rack]>} Array of [coordinate key, weapon] pairs for loaded weapons
   */
  getLoadedWeaponEntries () {
    return this._filterWeaponEntries(weapon => this._isWeaponLoaded(weapon))
  }

  /**
   * Internal: Check if weapon has ammunition
   * @param {{ hasAmmo?: () => boolean; ammo?: number }} weapon
   * @returns {boolean} True if weapon is loaded and has ammunition
   */
  _isWeaponLoaded (weapon) {
    if (typeof weapon.hasAmmo === 'function') {
      return weapon.hasAmmo()
    }
    return weapon.ammo > 0
  }

  /**
   * Get all [coordKey, weapon] entries as key-value pairs
   * @returns {Array<[string, any]>} Array of [coordinate, weapon] pairs
   */
  getAllWeaponEntries () {
    return this._weaponEntries()
  }

  /**
   * Get all weapon locations as coordinate pairs
   * @returns {Array<[number, number]>} Array of [row, col] coordinate pairs
   */
  getAllWeaponLocations () {
    return this._weaponEntries().map(([key]) => parsePair(key))
  }
  /**
   * Get all equipped weapons as array
   * Returns weapons in order from weaponArray.
   * @returns {Rack[]} Array of all weapon systems
   */
  getAllWeapons () {
    return this._weaponArray
  }

  /**
   * Get first loaded weapon from all weapons
   * Returns first weapon with available ammunition.
   * @returns {Rack|null} First loaded weapon or null if none
   */
  getFirstLoadedWeapon () {
    return firstElement(this.getLoadedWeapons())
  }

  /**
   * Get all loaded weapons
   * Filters weapons to return only those with available ammunition.
   * @returns {Rack[]} Array of loaded weapon systems
   */
  getLoadedWeapons () {
    return this.getAllWeapons().filter(w => this._isWeaponLoaded(w))
  }

  /**
   * Check if ship has ammunition remaining
   * @returns {boolean} True if any weapon has ammunition
   */
  hasAmmoRemaining () {
    return this.ammoRemainingTotal() > 0
  }

  /**
   * Get remaining ammunition count across all weapons
   * @returns {number} Total remaining ammunition (0 if sunk)
   */
  ammoRemainingTotal () {
    if (this.sunk) return 0
    return this.getAllWeapons().reduce(
      (sum, w) => sum + (w.ammoRemaining?.() ?? 0),
      0
    )
  }

  /**
   * Get total ammunition capacity across all weapons
   * @returns {number} Total ammunition capacity (0 if sunk)
   */
  ammoCapacityTotal () {
    if (this.sunk) return 0
    return this.getAllWeapons().reduce(
      (sum, w) => sum + (w.ammoCapacity?.() ?? 0),
      0
    )
  }

  /**
   * Create a ship instance from a shape definition
   * Initializes ship with shape's symmetry, letter, and weapon system.
   * @param {ShipShape} shape - Shape definition containing symmetry, letter, and weaponSystem
   * @returns {Ship} New ship instance with shape properties applied
   * @static
   */
  static createFromShape (shape) {
    const ship = new Ship(Ship.id, shape.symmetry, shape.letter)
    // Convert shape's weapon system to ship format
    if (shape.weaponSystem) {
      ship.weapons = shape.weaponSystem
    }

    ship._shape = shape
    return ship
  }

  /**
   * Internal: Process weapon system data and assign row/col coordinates
   * Converts various weapon input formats to normalized weaponsById Map and weaponArray.
   * Assigns row/col coordinates to each weapon from coordinate key format.
   * @param {Map<number, Rack>|Array<Rack>|Array<[string, Rack]>|any} weaponsToProcess
   *   Weapon systems to process in various formats
   * @param {boolean} [preserveExisting=false]
   *   If true, preserve existing weaponsById instead of creating new Map
   * @returns {{weaponsById: Map<number, Rack>, weaponArray: Rack[]}}
   *   Object with normalized {weaponsById, weaponArray} after coordinate assignment
   * @private
   */
  _processWeaponCoordinates (weaponsToProcess, preserveExisting = false) {
    let weaponsById = preserveExisting ? this.weaponsById : new Map()
    let weaponArray = preserveExisting ? this._weaponArray : []

    const processedWeapons = this._normalizeWeaponsInput(weaponsToProcess)

    for (const item of processedWeapons) {
      this._processWeaponItem(item, weaponsById, weaponArray, preserveExisting)
    }

    return { weaponsById, weaponArray }
  }

  /**
   * Internal: Normalize weapons input to array format for processing
   * Converts Maps and other iterables to array format consistently.
   * @param {Map<number, Rack>|Array<Rack>|Array<[string, Rack]>} weaponsToProcess
   *   Input weapons data in various formats
   * @returns {Array<[string|number, Rack]|Rack>}
   *   Normalized array of weapon items (entries or single weapons)
   * @private
   */
  _normalizeWeaponsInput (weaponsToProcess) {
    if (Array.isArray(weaponsToProcess)) {
      return weaponsToProcess
    }
    if (weaponsToProcess instanceof Map) {
      return Array.from(weaponsToProcess.entries())
    }
    return Array.from(weaponsToProcess || [])
  }

  /**
   * Internal: Process single weapon item and update collections
   * Extracts coordinate key and weapon system, assigns coordinates, and updates maps.
   * @param {[string|number, Rack]|Rack} item
   *   [key, weaponSystem] pair or single Rack
   * @param {Map<number, Rack>} weaponsById - Weapons by ID map to update
   * @param {Rack[]} weaponArray - Weapons array to update
   * @param {boolean} preserveExisting
   *   Whether to preserve existing collections when adding new weapons
   * @returns {void}
   * @private
   */
  _processWeaponItem (item, weaponsById, weaponArray, preserveExisting) {
    const [key, weaponSystem] = Array.isArray(item) ? item : [undefined, item]

    // Skip non-object values (test mocks, invalid data)
    if (typeof weaponSystem !== 'object' || weaponSystem === null) {
      return
    }

    const [r, c] = parsePair(key)
    if (r != null && c != null) {
      this._assignCoordinatesToWeapon(weaponSystem, r, c)
      this._updateWeaponCollections(
        weaponSystem,
        weaponsById,
        weaponArray,
        preserveExisting
      )
    }
  }

  /**
   * Internal: Assign row and column coordinates to weapon system
   * Mutates the weapon system to add row and col properties.
   * @param {Rack} weaponSystem - Weapon system to update
   * @param {number} r - Row coordinate to assign
   * @param {number} c - Column coordinate to assign
   * @returns {void}
   * @private
   */
  _assignCoordinatesToWeapon (weaponSystem, r, c) {
    const positioned = /** @type {PositionedWeaponSystem} */ (weaponSystem)
    positioned.row = r
    positioned.col = c
  }

  /**
   * Internal: Update weapon collections with new weapon system
   * Adds weapon to weaponsById Map by ID and to weaponArray if not already present.
   * @param {Rack} weaponSystem - Weapon system to add
   * @param {Map<number, Rack>} weaponsById - Weapons by ID map to update
   * @param {Rack[]} weaponArray - Weapons array to update
   * @param {boolean} preserveExisting
   *   Whether to preserve existing collections when adding new weapons
   * @returns {void}
   * @private
   */
  _updateWeaponCollections (
    weaponSystem,
    weaponsById,
    weaponArray,
    preserveExisting
  ) {
    if (weaponSystem.id != null) {
      weaponsById.set(weaponSystem.id, weaponSystem)
      if (!preserveExisting || !weaponArray.includes(weaponSystem)) {
        weaponArray.push(weaponSystem)
      }
    }
  }

  /**
   * Internal: Import weapons from shape definition
   * Creates new weaponsById Map from shape's weapon system configuration.
   * @param {Object<string, Rack>|any} shapeWeaponSystem - Shape's weapon system data
   * @returns {{weaponsById: Map<number, Rack>, weaponArray: Rack[]}}
   *   Object with {weaponsById, weaponArray} populated from shape
   * @private
   */
  _weaponsFromShape (shapeWeaponSystem) {
    return this._processWeaponCoordinates(shapeWeaponSystem)
  }

  /**
   * Internal: Import weapons from placement, updating existing weapons
   * Updates existing weapons with placement variant coordinate keys.
   * Preserves weapon objects while updating their coordinate positions.
   * @param {Array<[string, Rack]>|any} placeWeaponSystem
   *   Placement weapon system data with coordinate keys
   * @returns {{weaponsById: Map<number, Rack>, weaponArray: Rack[]}}
   *   Object with {weaponsById, weaponArray} updated from placement
   * @private
   */
  _weaponsFromPlacement (placeWeaponSystem) {
    const zipped = Zip.match(this._weaponArray, placeWeaponSystem)

    // Map zipped entries to coordinate key format for processing
    const coordKeyedWeapons = []
    for (const [weaponSystem, [coordKey]] of zipped) {
      if (weaponSystem) {
        coordKeyedWeapons.push([coordKey, weaponSystem])
      }
    }

    return this._processWeaponCoordinates(coordKeyedWeapons, true)
  }
  /**
   * Create a clone of this ship
   */
  clone () {
    const shape = this.shape()
    const clonedShip = Ship.createFromShape(shape)
    Ship.next()
    return clonedShip
  }

  /**
   * Calculate placement cells for given variant at position
   * Delegates to shape's placeCells method if available.
   * @param {number} variant - Placement variant index
   * @param {number} r0 - Starting row coordinate
   * @param {number} c0 - Starting column coordinate
   * @returns {CoordinatePair[]} Array of [row, col] cell coordinates (empty if no shape)
   */
  placeCells (variant, r0, c0) {
    const shape = this.shape()
    if (!shape || typeof shape.placeCells !== 'function') {
      return []
    }
    return shape.placeCells(variant, r0, c0) || []
  }
  /**
   * Process multiple cells for damage and record hits/misses
   * @param {GameModel} model - Game model with UI and opponent references
   * @param {CoordinatePair[]} cells - Array of [row, col] cells to process
   * @returns {DamageResult} Result object with {hits, misses, dtaps} arrays and count
   * @private
   */
  _processCellDamage (model, cells) {
    const results = { hits: [], misses: [], dtaps: 0 }
    for (const cell of cells) {
      const [y, x] = cell
      if (this.isHitAt(x, y)) {
        results.dtaps++
        continue // Already hit (double tap)
      }
      this.processHitAt(model, x, y, results, cell)
    }
    return results
  }

  /**
   * Internal: Process single cell damage result (hit or miss)
   * Checks if cell is on ship board; if yes, marks as hit; if no, marks as miss.
   * Accumulates results in provided DamageResult object.
   * @param {GameModel} model - Game model reference
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @param {DamageResult} results
   *   Accumulator for hit/miss results (modified in place)
   * @param {CoordinatePair} cell - Cell coordinate pair [row, col]
   * @returns {void}
   * @private
   */
  processHitAt (model, x, y, results, cell) {
    const board = this.board
    if (
      board &&
      typeof board === 'object' &&
      'test' in board &&
      typeof board.test === 'function'
    ) {
      if (board.test(x, y)) {
        const { damaged } = this.hitAt(model, x, y)
        results.hits.push({
          key: `${y},${x}`,
          cell,
          damaged: damaged || 'burnt'
        })
      } else {
        results.misses.push({ key: `${y},${x}`, cell, damaged: 'burnt' })
      }
    }
  }

  /**
   * Process hit at specific coordinates (record hit, check for weapon damage)
   * @param {GameModel} model - Game model with UI and loadout
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {HitResult} Hit result with {letter, info, damaged, list, misses}
   */
  hitAt (model, x, y) {
    this.recordHit(x, y)
    const weaponAtPosition = this.rackAt(x, y)
    let info = null
    let damaged = null
    let hits = []
    let misses = []

    if (weaponAtPosition && model) {
      const result = this._processMagazineHit(weaponAtPosition, model, x, y)
      if (result) {
        damaged = result.damaged
        info = result.info
        hits = result.hits || []
        misses = result.misses || []
      }
    }

    return this._determineHitResult(info, damaged, hits, misses)
  }

  /**
   * Internal: Process hit on weapon magazine (check if loaded/vulnerable)
   * Determines whether weapon is loaded and delegates to appropriate handler.
   * @param {Rack} weaponSystem - Weapon system at impact point
   * @param {GameModel} model - Game model
   * @param {number} y - Row coordinate of hit
   * @param {number} x - Column coordinate of hit
   * @returns {MagazineHitResult|null}
   *   Result with {damaged, info, hits, misses} or null if weapon not loaded
   * @private
   */
  _processMagazineHit (weaponSystem, model, x, y) {
    const isLoaded = this._isWeaponLoaded(weaponSystem)
    if (!isLoaded) {
      return this._handleUnloadedWeaponHit(weaponSystem, model)
    }
    return this._handleLoadedWeaponHit(weaponSystem, model, x, y)
  }

  /**
   * Internal: Handle hit on unloaded weapon system
   * Marks weapon as damaged and updates UI. No detonation occurs.
   * @param {Rack} weaponSystem - Weapon system that was hit
   * @param {GameModel} model - Game model for UI updates
   * @returns {MagazineHitResult}
   *   Damage result with damaged='damaged', no hits/misses
   * @private
   */
  _handleUnloadedWeaponHit (weaponSystem, model) {
    weaponSystem.damaged = true
    model.updateUI()
    return { damaged: 'damaged', info: null, hits: [], misses: [] }
  }

  /**
   * Internal: Handle hit on loaded weapon system
   * Marks weapon as hit, uses ammunition, and checks for volatile detonation.
   * @param {Rack} weaponSystem - Loaded weapon system that was hit
   * @param {GameModel} model - Game model for UI/ammo updates
   * @param {number} y - Row coordinate of hit
   * @param {number} x - Column coordinate of hit
   * @returns {MagazineHitResult}
   *   Damage result with damaged='skull', may include detonation hits/misses
   * @private
   */
  _handleLoadedWeaponHit (weaponSystem, model, x, y) {
    weaponSystem.hit = true
    const damaged = 'skull'
    // model.opponent?.updateUI()

    const viewModel = model.UI
    if (!bh.seekingMode) {
      model.loadOut.useAmmo(weaponSystem)
    }

    const cell = viewModel.gridCellAt(y, x)
    viewModel.useAmmoInCell(cell, damaged)
    model.updateUI()

    if (weaponSystem.weapon?.volatile) {
      return this._processDetonation(
        weaponSystem.weapon,
        cell,
        viewModel,
        model,
        x,
        y,
        damaged
      )
    }

    return { damaged, info: null, hits: [], misses: [] }
  }

  /**
   * Internal: Process magazine detonation damage in surrounding cells
   * For volatile weapons: animates detonation and processes damage in 3x3 area.
   * @param {WeaponAtPosition} weapon - Volatile weapon that detonated
   * @param {any} cell - Grid cell where detonation occurs
   * @param {UIViewModel} viewModel - View model for animation
   * @param {GameModel} model - Game model for processing surrounding damage
   * @param {number} y - Row coordinate of detonation center
   * @param {number} x - Column coordinate of detonation center
   * @param {string} damaged - Damage type indicator ('skull')
   * @returns {MagazineHitResult}
   *   Detonation result with damaged, info='Magazine Detonated', hits/misses arrays
   * @private
   */
  _processDetonation (weapon, cell, viewModel, model, x, y, damaged) {
    const detonationInfo = 'Magazine Detonated'
    weapon.animateDetonation(cell, viewModel.cellSize())
    const { hits, misses } = this._processCellDamage(
      model,
      bh.map.surround(y, x)
    )
    return { damaged, info: detonationInfo, hits, misses }
  }

  /**
   * Internal: Determine final hit result (check if sunk)
   * If ship is sunk after this hit, returns letter for display. Otherwise returns empty string.
   * @param {string|null} info - Hit information message (e.g., 'Magazine Detonated')
   * @param {string|null} damaged - Damage type indicator ('burnt', 'skull', 'damaged')
   * @param {Array<{key: string, cell: CoordinatePair, damaged: string}>} [hits=[]]
   *   Array of hit results from damage processing
   * @param {Array<{key: string, cell: CoordinatePair, damaged: string}>} [misses=[]]
   *   Array of miss results from damage processing
   * @returns {HitResult}
   *   Final hit result with {letter, info, damaged, list, misses}
   *   letter is non-empty only if ship sank
   * @private
   */
  _determineHitResult (info, damaged, hits = [], misses = []) {
    if (this.isSunk()) {
      this.sunk = true
      return { letter: this.letter, info, damaged, list: [], misses: misses }
    }
    return { letter: '', info, damaged, list: hits, misses: misses }
  }

  /**
   * Remove ship from placement
   */
  removeFromPlacement () {
    this.resetBoard()
    this.sunk = false
  }

  /**
   * Internal: Normalize cells to standard [row, col] format
   * Converts various cell formats (arrays, objects with r/c or [0]/[1]) to standard pairs.
   * @param {CoordinatePair[]|any[]} cells - Array of cells in various formats
   * @returns {[number, number][]} Normalized cells as [row, col] pairs
   * @private
   */
  _normalizeCells (cells) {
    if (!Array.isArray(cells)) return []
    const result = []
    for (const cell of cells) {
      if (Array.isArray(cell) && cell.length >= 2) {
        result.push([cell[0], cell[1]])
      } else if (cell && typeof cell === 'object') {
        const r = cell.r ?? cell[0] ?? 0
        const c = cell.c ?? cell[1] ?? 0
        result.push([r, c])
      } else {
        result.push([0, 0])
      }
    }
    return result
  }

  /**
   * Place ship at cells with board creation
   * Creates a SubBoard from normalized cell coordinates and places ship at that board.
   * @param {CoordinatePair[]} cells - Array of [row, col] cells to place ship at
   * @returns {[number, number][]} Normalized cells that were placed
   */
  placeAtCells (cells) {
    const normalizedCells = this._normalizeCells(cells)
    const board = SubBoard.fromCoords(normalizedCells, null, new Mask(0, 0))
    this._cellsArray = normalizedCells
    this.placeAtBoard(board)
    return normalizedCells
  }

  /**
   * Place ship at given board with automatic hit/sunk reset
   * @param {SubBoard|Mask|unknown} board - Board defining ship placement
   * @returns {void}
   */
  placeAtBoard (board) {
    const b = board
    if (b && typeof b === 'object' && 'toCoords' in b) {
      const toCoords = b.toCoords
      if (Array.isArray(toCoords)) {
        this._cellsArray = toCoords.map(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            return [coord[0], coord[1]]
          }
          if (coord && typeof coord === 'object') {
            const r = coord.r ?? coord[0] ?? 0
            const c = coord.c ?? coord[1] ?? 0
            return [r, c]
          }
          return [0, 0]
        })
      }
    }
    this.board = board
    this.sunk = false
  }

  /**
   * Apply placement object with board and weapons configuration
   * @param {Placement} placement - Placement configuration
   * @returns {void}
   */
  placePlacement (placement) {
    this.placed = true
    this.board = placement.board
    if (placement.weapons) {
      this.variant = placement.variant
      if (Object.keys(placement.weapons).length > 0) {
        this.weapons = placement.weapons
      }
    }
  }

  /**
   * Get available placement variants for this ship
   * @returns {any[]} Array of available placement variants
   */
  getAvailablePlacements () {
    const shape = this.shape()
    if (!shape || typeof shape.placeables !== 'function') {
      return []
    }
    return shape.placeables() || []
  }

  /**
   * Check if location is in valid zone for this ship type (land/sea based on ship type)
   * Ground ships must be on land terrain; sea ships must be on water terrain.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if location is in correct zone for ship type
   */
  isRightZone (r, c) {
    const shipType = this.type()
    const isLand = bh.map?.isLand(r, c) ?? false
    // Ground ships must be on land, sea ships must be on water
    if (shipType === 'G' && !isLand) return false
    if (shipType === 'S' && isLand) return false

    return true
  }

  /**
   * Serialize ship state to JSON-compatible object
   * Converts ship data to a serializable format excluding non-JSON objects.
   * @returns {Object} Ship state with id, symmetry, letter, size, sunk, variant, cells, weapons, hitPositions
   */
  toJSON () {
    return {
      id: this.id,
      symmetry: this.symmetry,
      letter: this.letter,
      size: this.size,
      sunk: this.sunk,
      variant: this.variant,
      cells: this.cells,
      weapons: this._serializeWeapons(),
      hitPositions: this.hits.toCoords
    }
  }

  /**
   * Serialize weapons object for JSON, filtering out non-serializable properties
   * @returns {Object} Serialized weapons object
   * @private
   */
  _serializeWeapons () {
    const serialized = {}
    const weapons = this.weapons
    for (const [key, weapon] of Object.entries(weapons)) {
      // Only serialize basic properties to avoid BigInt and complex objects
      serialized[key] = {
        id: weapon.id,
        letter: weapon.letter,
        ammo: weapon.ammo
      }
    }
    return serialized
  }

  /**
   * Place ship at grid with validation
   * Checks if placement is valid before placing ship and updating grid.
   * @param {ShipCellGrid|unknown} shipCellGrid - Grid to add ship to
   * @param {Placement} placement - Placement configuration to validate and apply
   * @returns {CoordinatePair[]|null} Ship cells if placement succeeded, null if validation failed
   */
  placeOnGrid (shipCellGrid, placement) {
    if (!placement.canPlace(shipCellGrid)) {
      return null
    }
    this.addUnplacedShipToGrid(shipCellGrid, placement)
    return this.cells
  }
  /**
   * Internal: Add unplaced ship to grid during placement
   * Updates ship placement state, computes displaced area, and adds ship to grid.
   * @param {ShipCellGrid|unknown} shipCellGrid - Grid to modify
   * @param {Placement} placement - Placement configuration to apply
   * @returns {void}
   * @private
   */
  addUnplacedShipToGrid (shipCellGrid, placement) {
    // Placement succeeded: update ship and mask
    this.placePlacement(placement)
    const displacedCells = placement.displacedArea(
      shipCellGrid._maskedGrid.width,
      shipCellGrid._maskedGrid.height
    )

    shipCellGrid._maskedGrid.joinWith(displacedCells)

    this.addToGrid(shipCellGrid)
  }
  /**
   * Add ship to grid at its current position
   * @param {ShipCellGrid|unknown} shipCellGrid - Grid to add ship to
   * @returns {void}
   */
  addToGrid (shipCellGrid) {
    const grid = shipCellGrid
    if (
      !grid ||
      typeof grid !== 'object' ||
      !('setCell' in grid) ||
      typeof grid.setCell !== 'function'
    ) {
      return
    }
    const board = this.board
    if (
      !(
        board &&
        typeof board === 'object' &&
        'occupiedLocations' in board &&
        typeof board.occupiedLocations === 'function'
      )
    ) {
      throw new Error('Invalid ship: board')
    }
    for (const [x, y] of board.occupiedLocations()) {
      grid.setCell(x, y, { id: this.id, letter: this.letter })
    }
  }

  /**
   * Get maximum minimum size among ships
   * @param {Ship[]} arr - Array of ships
   * @returns {number} Maximum of minimum sizes
   */
  static maxMinSizeIn (arr) {
    const mm = arr.reduce(
      (/** @type {number} */ m, /** @type {{ minSize: number; }} */ o) =>
        o.minSize === 0 ? m : Math.max(m, o.minSize),
      0
    )
    return mm
  }
  /**
   * Get minimum size among ships
   * @param {Ship[]} arr - Array of ships
   * @returns {number} Minimum ship size
   */
  static minSizeIn (arr) {
    return arr.reduce(
      (/** @type {number} */ m, /** @type {{ minSize: number; }} */ o) =>
        o.minSize === 0 ? m : Math.min(m, o.minSize),
      0
    )
  }
  /**
   * Get maximum size among ships
   * @param {Ship[]} arr - Array of ships
   * @returns {number} Maximum ship size
   */
  static maxSizeIn (arr) {
    return arr.reduce(
      (/** @type {number} */ m, /** @type {{ maxSize: number; }} */ o) =>
        Math.max(m, o.maxSize),
      Infinity
    )
  }

  /**
   * Check if ship belongs to tally group
   * @param {string} tallyGroup - Tally group identifier
   * @returns {boolean} True if ship is in tally group
   */
  isInTallyGroup (tallyGroup) {
    const shape = this.shape()
    if (!shape) {
      console.log('shape not found for', this)
      return false
    }
    return shape && typeof shape === 'object' && shape.tallyGroup === tallyGroup
  }

  /**
   * Get shape definition for this ship
   * @returns {ShipShape|undefined} Shape object defining this ship's form and properties
   */
  shape () {
    if (this._shape) return this._shape
    this._shape = bh.shapesByLetter?.(this.letter)
    return this._shape
  }

  /**
   * Get ship type classification (e.g., 'G' for ground, 'S' for sea)
   * Delegates to bh.shipType() for type mapping from letter.
   * @returns {string} Ship type code from ship letter identifier
   */
  type () {
    return bh.shipType(this.letter)
  }

  /**
   * Get description for sunk ship
   * Combines ship name and sunk status text with optional separator.
   * @param {string} [middle=' '] - String to insert between ship name and status
   * @returns {string} Description text for sunk ship state
   */
  getSunkDescription (middle = ' ') {
    return bh.shipSunkText(this.letter, middle)
  }

  /**
   * Get general description of ship
   * Returns descriptive text about the ship's role and characteristics.
   * @returns {string} Description text for this ship's type
   */
  getDescription () {
    return bh.shipDescription(this.letter)
  }
}

bh.shipBuilder = Ship.createFromShape
bh.fleetBuilder = Ship.createShipsFromShapes
bh.extraFleetBuilder = Ship.extraShipsFromShapes
