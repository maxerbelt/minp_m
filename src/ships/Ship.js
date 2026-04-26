import { bh } from '../terrains/all/js/bh.js'
import { parsePair } from '../core/utilities.js'
import { Mask } from '../grid/rectangle/mask.js'
import { WeaponSystem } from '../weapon/WeaponSystem.js'
import { SubBoard } from '../grid/subBoard.js'
import { Zip } from '../core/Zip.js'

/**
 * @param {string | any[]} arr
 */
function firstElement (arr) {
  return arr && arr.length > 0 ? arr[0] : null
}

export class Ship {
  /**
   * @param {number} id
   * @param {string} symmetry
   * @param {string} letter
   * @param {{ '1,1': { id: number; }; }} [weapons]
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
    if (weapons) {
      this.weapons = weapons
    }
  }

  get weaponsById () {
    if (this._weaponsById) {
      return this._weaponsById
    }
    this._weaponsById = new Map()
    return this._weaponsById
  }
  get weapons () {
    if (this._weapons) {
      return this._weapons
    }
    if (!this._weaponsById?.size) return {}
    this._weapons = this._idWeaponMapToWeaponPositionObject()
    return this._weapons
  }
  set weapons (weapons) {
    this._createOrUpdateWeapons(weapons)
  }
  _idWeaponMapToWeaponPositionObject () {
    return this._weaponEntriesFromIdMap().reduce((obj, [key, weapon]) => {
      obj[key] = weapon
      return obj
    }, {})
  }
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
  _importWeapons (weapons) {
    const numWeapon = this.numWeapons
    if (numWeapon === 0) {
      return this._weaponsFromShape(weapons)
    } else {
      return this._weaponsFromPlacement(weapons)
    }
  }
  _createOrUpdateWeaponsArray (weapons) {
    const allAreArrays = weapons.every(Array.isArray)
    if (allAreArrays) {
      this._createOrUpdateWeaponsRaw(weapons)
      return
    }
    this._weaponArray = weapons
  }
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
  get _weaponArray () {
    if (this.__weaponArray) {
      return this.__weaponArray
    }
    this.__weaponArray = this._defaultWeaponArray
    return this.__weaponArray
  }
  get _defaultWeaponArray () {
    return this._weaponsById?.values() || []
  }
  set _weaponArray (weapons) {
    this.__weaponArray = [...weapons]
  }
  /**
   * Check if any weapons are equipped
   */
  get hasWeapon () {
    return this.numWeapons > 0
  }
  get numWeapons () {
    return this._weaponArray.length
  }

  get cells () {
    // console.trace()
    return this._cellsArray || this.board.toCoords
  }
  set cells (cells) {
    this._cellsArray = cells
    this.board = Mask.fromCoordsSquare(cells)
  }
  get board () {
    return this._board || this._shape?.board || Mask.empty(0, 0)
  }
  set board (board) {
    this._board = board
    this.size = board.occupancy
    this.hits = board.emptyMask
  }
  get height () {
    return this.board.height
  }
  get width () {
    return this.board.width
  }
  get minSize () {
    return Math.min(this.height, this.width)
  }
  get maxSize () {
    return Math.max(this.height, this.width)
  }

  resetBoard () {
    /**
     * @type {any[]}
     */
    this._cellsArray = []
    this.placed = false
    this.board = this.shape()?.board || Mask.empty(0, 0)
  }

  static id = 1

  static next () {
    Ship.id++
  }

  /**
   * @param {any[]} ships
   */
  static noOfHits (ships) {
    return ships.reduce(
      (/** @type {any} */ sum, /** @type {{ getTotalHits: () => any; }} */ s) =>
        sum + s.getTotalHits(),
      0
    )
  }
  /**
   * @param {any[]} ships
   */
  static noOfSunk (ships) {
    return ships.reduce(
      (/** @type {string | number} */ sum, /** @type {{ sunk: any; }} */ s) =>
        sum + (s.sunk ? 1 : 0),
      0
    )
  }

  getTurn (r, c) {
    const r0 = r - this.hits.offsetY - (this.hits.windowHeight - 1) / 2
    const c0 = c - this.hits.offsetX - (this.hits.windowWidth - 1) / 2
    return this.getPrimaryWeapon()?.getTurn(this.variant, r0, c0) || ''
  }
  reset () {
    this.resetHits()
    this.sunk = false
    this._resetAllWeapons()
  }

  /**
   * Internal: Reset state of all equipped weapons
   */
  _resetAllWeapons () {
    for (const weapon of this._weaponArray) {
      weapon.reset?.()
    }
  }
  resetHits () {
    this.hits = this.board?.emptyMask
  }

  /**
   * Record a hit at coordinates (r, c)
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {void}
   */
  recordHit (r, c) {
    this.hits.set(c, r, 1)
  }

  /**
   * Check if ship has been hit at (r, c)
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if hit has been recorded at this location
   */
  isHitAt (r, c) {
    return this.hits.test(c, r)
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
    return this.getTotalHits() === this.board.occupancy
  }

  _weaponEntriesFromIdMap () {
    if (!this._weaponsById) return []
    return Array.from(this._weaponsById, ([, weapon]) => [
      `${weapon.row},${weapon.col}`,
      weapon
    ])
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
  static createShipsFromShapes (shapes) {
    Ship.id = 1
    WeaponSystem.id = 1
    return Ship.extraShipsFromShapes(shapes)
  }
  /**
   * @param {{ symmetry: string; letter: string; weaponSystem: {}; }[]} shapes
   */
  static extraShipsFromShapes (shapes, filter = () => true) {
    const ships = []
    for (const shape of shapes) {
      if (!filter(shape)) continue
      const newShip = Ship.createFromShape(shape)
      ships.push(newShip)
      Ship.next()
    }
    return ships
  }

  /**
   * Find weapon system at position (r, c)
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
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
   */
  getPrimaryWeaponSystem () {
    return firstElement(this._weaponArray)
  }

  /**
   * Get primary weapon from first weapon system
   */
  getPrimaryWeapon () {
    return this.getPrimaryWeaponSystem()?.weapon
  }
  /**
   * Find closest loaded weapon rack to given coordinates
   * @param {number} r
   * @param {number} c
   */
  findClosestLoadedRack (r, c) {
    const loadedRacks = this.getLoadedWeaponEntries()
    if (loadedRacks.length === 0) return null
    return this._findClosestRack(loadedRacks, r, c)
  }

  /**
   * Internal: Calculate closest rack from list by distance
   * @param {any[]} entries
   * @param {number} r
   * @param {number} c
   */
  _findClosestRack (entries, r, c) {
    return entries.reduce(
      (/** @type {[any]} */ closest, /** @type {[any]} */ current) => {
        const [closestKey] = closest
        const [currentKey] = current
        const [closestR, closestC] = closestKey.split(',').map(Number)
        const [currentR, currentC] = currentKey.split(',').map(Number)
        const closestDist = Math.hypot(closestR - r, closestC - c)
        const currentDist = Math.hypot(currentR - r, currentC - c)
        return currentDist < closestDist ? current : closest
      }
    )
  }
  /**
   * Find weapon system by its unique ID
   * @param {number} id
   */
  getWeaponBySystemId (id) {
    if (this.weaponsById.has(id)) {
      return this.weaponsById.get(id)
    }
    return this._weaponArray.find(weapon => weapon.id === id)
  }

  /**
   * Check if this ship matches the given ID
   * @param {any} id
   */
  matchesId (id) {
    return this.id === id
  }

  /**
   * Get self if ID matches, null otherwise
   * @param {number} id
   */
  getShipById (id) {
    return this.id === id ? this : null
  }

  /**
   * Format weapon coordinates and IDs as string (e.g., "1,2:10|2,3:11")
   */
  makeKeyIds () {
    return this._weaponEntries()
      .map(([key, weapon]) => `${key}:${weapon.id}`)
      .join('|')
  }

  /**
   * Get all [coordKey, weapon] entries for loaded weapons
   */
  getLoadedWeaponEntries () {
    return this._filterWeaponEntries((/** @type {any} */ weapon) =>
      this._isWeaponLoaded(weapon)
    )
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
   */
  getAllWeapons () {
    return this._weaponArray
  }

  /**
   * Get first loaded weapon from all weapons
   */
  getFirstLoadedWeapon () {
    return firstElement(this.getLoadedWeapons())
  }

  /**
   * Get all loaded weapons
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
   * @param {Map<number, any>|Array<any>} weaponsToProcess - Weapon systems to process
   * @param {boolean} [preserveExisting=false] - If true, preserve existing weaponsById instead of creating new
   * @returns {Object} Object with {weaponsById, weaponArray} after coordinate assignment
   * @private
   */
  _processWeaponCoordinates (weaponsToProcess, preserveExisting = false) {
    let weaponsById = preserveExisting ? this.weaponsById : new Map()
    let weaponArray = preserveExisting ? this._weaponArray : []

    const processedWeapons = Array.isArray(weaponsToProcess)
      ? weaponsToProcess
      : Array.from(weaponsToProcess.entries || weaponsToProcess)

    for (const item of processedWeapons) {
      const [key, weaponSystem] = Array.isArray(item) ? item : [, item]

      // Skip non-object values (test mocks, invalid data)
      if (typeof weaponSystem !== 'object' || weaponSystem === null) {
        continue
      }

      const [r, c] = parsePair(key)
      if (r != null && c != null) {
        weaponSystem.row = r
        weaponSystem.col = c

        if (weaponSystem.id != null) {
          weaponsById.set(weaponSystem.id, weaponSystem)
          if (!preserveExisting || !weaponArray.includes(weaponSystem)) {
            weaponArray.push(weaponSystem)
          }
        }
      }
    }

    return { weaponsById, weaponArray }
  }

  /**
   * Internal: Import weapons from shape definition
   * @param {any} shapeWeaponSystem - Shape's weapon system data
   * @returns {Object} Object with {weaponsById, weaponArray}
   * @private
   */
  _weaponsFromShape (shapeWeaponSystem) {
    return this._processWeaponCoordinates(shapeWeaponSystem)
  }

  /**
   * Internal: Import weapons from placement, updating existing weapons
   * @param {any} placeWeaponSystem - Placement weapon system data
   * @returns {Object} Object with {weaponsById, weaponArray}
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
   * @param {any} variant
   * @param {any} r0
   * @param {any} c0
   */
  placeCells (variant, r0, c0) {
    const shape = this.shape()
    return shape.placeCells(variant, r0, c0)
  }
  /**
   * Process multiple cells for damage and record hits/misses
   * @param {any} model - Game model with UI and opponent references
   * @param {Array<[number, number]>} cells - Array of [row, col] cells to process
   * @returns {Object} Result object with {hits, misses, dtaps} arrays and count
   * @private
   */
  _processCellDamage (model, cells) {
    const results = { hits: [], misses: [], dtaps: 0 }
    for (const cell of cells) {
      const [r, c] = cell
      if (this.isHitAt(r, c)) {
        results.dtaps++
        continue // Already hit (double tap)
      }
      this.processHitAt(model, r, c, results, cell)
    }
    return results
  }

  /**
   * Internal: Process single cell damage result (hit or miss)
   * @param {any} model - Game model reference
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {{ hits: Array; misses: Array; dtaps?: number }} results - Accumulator for hit/miss results
   * @param {[number, number]} cell - Cell coordinate pair
   * @returns {void}
   * @private
   */
  processHitAt (model, r, c, results, cell) {
    if (this.board.test(c, r)) {
      const { damaged } = this.hitAt(model, r, c)
      results.hits.push({ key: `${r},${c}`, cell, damaged: damaged || 'burnt' })
    } else {
      results.misses.push({ key: `${r},${c}`, cell, damaged: 'burnt' })
    }
  }

  /**
   * Process hit at specific coordinates (record hit, check for weapon damage)
   * @param {any} model - Game model with UI and loadout
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object} Hit result with {letter, info, damaged, list, misses}
   */
  hitAt (model, r, c) {
    this.recordHit(r, c)
    const weaponAtPosition = this.rackAt(c, r)
    let info = null
    let damaged = null
    let hits = []
    let misses = []

    if (weaponAtPosition && model) {
      const result = this._processMagazineHit(weaponAtPosition, model, r, c)
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
   * @param {{ damaged: boolean }} weaponSystem - Weapon system at impact point
   * @param {any} model - Game model
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object|null} Result with {damaged, info, hits, misses} or null if weapon not loaded
   * @private
   */
  _processMagazineHit (weaponSystem, model, r, c) {
    const isLoaded = this._isWeaponLoaded(weaponSystem)
    if (!isLoaded) {
      weaponSystem.damaged = true
      return { damaged: 'damaged', info: null, hits: [], misses: [] }
    }
    return this._processLoadedMagazineHit(weaponSystem, model, r, c)
  }

  /**
   * Internal: Process hit on loaded magazine with potential detonation
   * @param {{ hit: boolean; weapon: { volatile: boolean } }} weaponSystem - Loaded weapon system
   * @param {{ opponent: { updateUI?: () => void }; UI: any; loadOut: { useAmmo: (w: any) => void } }} model - Game model
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object|null} Detonation result if weapon is volatile
   * @private
   */
  _processLoadedMagazineHit (weaponSystem, model, r, c) {
    weaponSystem.hit = true
    const damaged = 'skull'
    model.opponent?.updateUI()
    const viewModel = model.UI
    model.loadOut.useAmmo(weaponSystem)
    const cell = viewModel.gridCellAt(r, c)
    viewModel.useAmmoInCell(cell, damaged)

    if (weaponSystem.weapon?.volatile) {
      return this._processDetonation(
        weaponSystem.weapon,
        cell,
        viewModel,
        model,
        r,
        c,
        damaged
      )
    }
    return { damaged: damaged, info: null, hits: [], misses: [] }
  }

  /**
   * Internal: Process magazine detonation damage in surrounding cells
   * @param {{ animateDetonation: (cell: any, cellSize: number) => void }} weapon - Volatile weapon
   * @param {any} cell - Grid cell where detonation occurs
   * @param {{ cellSizeScreen: () => number }} viewModel - View model
   * @param {any} model - Game model
   * @param {number} r - Row coordinate of detonation center
   * @param {number} c - Column coordinate of detonation center
   * @param {string} damaged - Damage type indicator
   * @returns {Object} Detonation result with {damaged, info, hits, misses}
   * @private
   */
  _processDetonation (weapon, cell, viewModel, model, r, c, damaged) {
    const detonationInfo = 'Magazine Detonated'
    weapon.animateDetonation(cell, viewModel.cellSizeScreen())
    const { hits, misses } = this._processCellDamage(
      model,
      bh.map.surround(r, c)
    )
    return { damaged, info: detonationInfo, hits, misses }
  }

  /**
   * Internal: Determine final hit result (check if sunk)
   * @param {string} info - Hit information message
   * @param {any} damaged - Damage type indicator
   * @param {Array} [hits=[]] - Array of hit results
   * @param {Array} [misses=[]] - Array of miss results
   * @returns {Object} Final hit result with {letter, info, damaged, list, misses}
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
   * Place ship at given cells with automatic hit/sunk reset
   * @param {Array<[number, number]>} cells - Array of [row, col] coordinate pairs
   * @returns {Array<[number, number]>} The cells where ship was placed
   */
  placeAtCells (cells) {
    const board = SubBoard.fromCoords(cells, null, new Mask(0, 0))
    this.placeAtBoard(board)
    return cells
  }

  /**
   * Place ship at given board with automatic hit/sunk reset
   * @param {SubBoard} board - Board defining ship placement
   * @returns {void}
   */
  placeAtBoard (board) {
    this.board = board
    this.sunk = false
  }

  /**
   * Place using variant placement object at given coordinates
   * @param {{ placeAt: (r: number, c: number) => any }} placeable - Placeable variant object
   * @param {number} r - Row coordinate for placement
   * @param {number} c - Column coordinate for placement
   * @returns {void}
   */
  placeVariant (placeable, r, c) {
    const placement = placeable.placeAt(c, r)
    this.placePlacement(placement)
  }

  /**
   * Apply placement object with board and weapons configuration
   * @param {{ board: SubBoard; weapons: Object; variant: number }} placement - Placement configuration
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
   */
  getAvailablePlacements () {
    return this.shape?.placeables() || []
  }

  /**
   * Check if location is in valid zone for this ship type (land/sea based on ship type)
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if location is in correct zone for ship type
   */
  isRightZone (r, c) {
    const shipType = this.type()
    const isLand = bh.map.isLand(r, c)
    // Ground ships must be on land, sea ships must be on water
    if (shipType === 'G' && !isLand) return false
    if (shipType === 'S' && isLand) return false

    return true
  }

  /**
   * Check if cell grid location is clear of adjacent ships (no touching)
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Array<Array<any>>} shipCellGrid - Grid tracking occupied cells by ships
   * @returns {boolean} True if no adjacent ships detected (8-way neighborhood clear)
   */
  noTouchCheck (r, c, shipCellGrid) {
    const map = bh.map
    // Check 8-connected neighborhood (all adjacent cells)
    for (let nr = r - 1; nr <= r + 1; nr++)
      for (let nc = c - 1; nc <= c + 1; nc++) {
        if (map.inBounds(nr, nc) && shipCellGrid[nr][nc]) return false
      }
    return true
  }

  /**
   * Internal: Check if any cell in placement is in wrong zone for ship type
   * @param {Array<[number, number]>} placing - Placement cells as [row, col] pairs
   * @returns {boolean} True if any cell violates zone requirements
   * @private
   */
  isAllRightZone (placing) {
    return placing.some(([r, c]) => {
      return this.isRightZone(r, c) === false
    })
  }
  /**
   * Check if ship can be placed at variant and position
   * @param {number} variant - Placement variant index
   * @param {number} r0 - Starting row position
   * @param {number} c0 - Starting column position
   * @param {Array<Array<any>>} shipCellGrid - Grid tracking occupied cells by ships
   * @returns {boolean} True if placement is valid at this location
   */
  canPlace (variant, r0, c0, shipCellGrid) {
    const placing = this.placeCells(variant, r0, c0)
    const validations = [
      () => this._validatePlacementBounds(placing),
      () => this._validatePlacementZone(placing),
      () => this._validatePlacementOverlap(placing, shipCellGrid),
      () => this._validatePlacementTouching(placing, shipCellGrid)
    ]

    return validations.every(validate => validate())
  }

  /**
   * Internal: Validate placement is within map bounds
   * @param {Array<[number, number]>} cells - Placement cells as [row, col] pairs
   * @returns {boolean} True if all cells are in bounds
   * @private
   */
  _validatePlacementBounds (cells) {
    const map = bh.map
    return !cells.some(([r, c]) => !map.inBounds(r, c))
  }

  /**
   * Internal: Validate placement is in correct zone (land/sea based on ship type)
   * @param {Array<[number, number]>} cells - Placement cells as [row, col] pairs
   * @returns {boolean} True if all cells are in correct zone
   * @private
   */
  _validatePlacementZone (cells) {
    return !this.isAllRightZone(cells)
  }

  /**
   * Internal: Validate placement doesn't overlap existing ships
   * @param {Array<[number, number]>} cells - Placement cells as [row, col] pairs
   * @param {Array<Array<any>>} shipCellGrid - Grid tracking occupied cells
   * @returns {boolean} True if no overlapping ships detected
   * @private
   */
  _validatePlacementOverlap (cells, shipCellGrid) {
    const map = bh.map
    return !cells.some(([r, c]) => map.inBounds(r, c) && shipCellGrid[r][c])
  }

  /**
   * Internal: Validate placement doesn't touch adjacent ships
   * @param {Array<[number, number]>} cells - Placement cells as [row, col] pairs
   * @param {Array<Array<any>>} shipCellGrid - Grid tracking occupied cells
   * @returns {boolean} True if no adjacent ships detected
   * @private
   */
  _validatePlacementTouching (cells, shipCellGrid) {
    return !cells.some(([r, c]) => !this.noTouchCheck(r, c, shipCellGrid))
  }

  /**
   * Serialize ship state for JSON
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
   * Add ship to grid at its current position
   * @param {any[][]} shipCellGrid
   */
  addToGrid (shipCellGrid) {
    for (const [c, r] of this.board.occupiedLocations()) {
      if (
        r >= 0 &&
        r < shipCellGrid.length &&
        c >= 0 &&
        c < shipCellGrid[r].length
      ) {
        shipCellGrid[r][c] = { id: this.id, letter: this.letter }
      }
    }
  }

  /**
   * Get shape definition for this ship
   */
  shape () {
    if (this._shape) return this._shape

    this._shape = bh.shapesByLetter(this.letter)
  }
  /**
   * @param {any[]} arr
   */
  static maxMinSizeIn (arr) {
    const mm = arr.reduce(
      (/** @type {number} */ m, /** @type {{ minSize: number; }} */ o) =>
        o.minSize === 0 ? m : Math.max(m, o.minSize),
      0
    )
    console.log(
      `maxMin Size: ${mm} :`,
      arr
        .map(
          (/** @type {{ letter: any; width: any; height: any; }} */ o) =>
            `${o.letter}: ${o.width},${o.height}`
        )
        .join('; ')
    )
    return mm
  }
  /**
   * @param {any[]} arr
   */
  static minSizeIn (arr) {
    return arr.reduce(
      (/** @type {number} */ m, /** @type {{ minSize: number; }} */ o) =>
        o.minSize === 0 ? m : Math.min(m, o.minSize),
      0
    )
  }
  /**
   * @param {any[]} arr
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
   * @param {any} tallyGroup
   */
  isInTallyGroup (tallyGroup) {
    const shape = this.shape()
    if (!shape) {
      console.log('shape not found for', this)
      return false
    }
    return shape.tallyGroup === tallyGroup
  }

  /**
   * Get shape definition for this ship
   * @returns {Shape} Shape object defining this ship's form and properties
   */
  shape () {
    if (this._shape) return this._shape

    this._shape = bh.shapesByLetter(this.letter)
    return this._shape
  }

  /**
   * Get ship type classification (e.g., 'G' for ground, 'S' for sea)
   * @returns {string} Ship type code
   */
  type () {
    return bh.shipType(this.letter)
  }

  /**
   * Get description for sunk ship
   * @param {string} [middle=' '] - String to insert between ship name and status
   * @returns {string} Description text for sunk ship state
   */
  getSunkDescription (middle = ' ') {
    return bh.shipSunkText(this.letter, middle)
  }

  /**
   * Get general description of ship
   * @returns {string} Description text for ship
   */
  getDescription () {
    return bh.shipDescription(this.letter)
  }
}

bh.shipBuilder = Ship.createFromShape
bh.fleetBuilder = Ship.createShipsFromShapes
bh.extraFleetBuilder = Ship.extraShipsFromShapes
