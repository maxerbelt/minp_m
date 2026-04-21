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
  set weaponsById (weaponsById) {
    console.trace('Setting weaponsById:', weaponsById)
    let wid
    const numNew = Object.values(weaponsById).length
    if (numNew === 0) {
      return
    }
    const numWeapon = this._weaponsById?.size || 0
    if (numWeapon === 0) {
      wid = this.weaponsFromShape(weaponsById)
    } else {
      wid = this.weaponsFromPlacement(weaponsById)
    }

    this._weaponsById = wid
  }
  get weapons () {
    if (this._weapons) {
      return this._weapons
    }
    this._weapons = this._weaponEntriesFromIdMap().reduce(
      (obj, [key, weapon]) => {
        obj[key] = weapon
        return obj
      },
      {}
    )
    return this._weapons
  }
  set weapons (weapons) {
    console.trace()
    this._weapons = weapons
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

  getTurn () {
    return this.getPrimaryWeapon()?.getTurn(this.variant) || ''
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
    for (const weapon of this.getAllWeapons()) {
      weapon.reset?.()
    }
  }
  resetHits () {
    this.hits = this.board?.emptyMask
  }

  /**
   * Record a hit at coordinates (r, c)
   * @param {number} r
   * @param {number} c
   */
  recordHit (r, c) {
    this.hits.set(c, r, 1)
  }

  /**
   * Check if ship has been hit at (r, c)
   * @param {any} r
   * @param {any} c
   */
  isHitAt (r, c) {
    return this.hits.test(c, r)
  }

  /**
   * Get total number of hits recorded
   */
  getTotalHits () {
    return this.hits.occupancy
  }

  /**
   * Check if ship is sunk (all cells hit)
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

  _weaponEntries () {
    return Object.entries(this.weapons)
  }

  _weaponArray () {
    return Object.values(this.weapons)
  }

  /**
   * @param {{ (weapon: any): any; (arg0: any): unknown; }} predicate
   */
  _filterWeaponEntries (predicate) {
    return this._weaponEntries().filter(([, weapon]) => predicate(weapon))
  }

  /**
   * Check if any weapons are equipped
   */
  hasWeapons () {
    return this._weaponArray().length > 0
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
   * @param {number} r
   * @param {number} c
   */
  rackAt (r, c) {
    const coordKey = `${r},${c}`
    return this._findWeaponAt(coordKey)
  }
  _hasLegacyWeaponEntries
  /**
   * Internal: Find weapon by coordinate key or position
   * @param {string} coordKey
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
    return firstElement(this._weaponArray())
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
    return this._weaponArray().find(weapon => weapon.id === id)
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
   * @param {{ hasAmmo: () => any; ammo: number; }} weapon
   */
  _isWeaponLoaded (weapon) {
    if (typeof weapon.hasAmmo === 'function') {
      return weapon.hasAmmo()
    }
    return weapon.ammo > 0
  }

  /**
   * Get all [coordKey, weapon] entries as key-value pairs
   */
  getAllWeaponEntries () {
    return this._weaponEntries()
  }
  getAllWeaponLocations () {
    return this._weaponEntries().map(([key]) => parsePair(key))
  }
  /**
   * Get all equipped weapons as array
   */
  getAllWeapons () {
    return this._weaponArray()
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

  /**   * Check if ship has ammunition remaining
   */
  hasAmmoRemaining () {
    return this.ammoRemainingTotal() > 0
  }

  /**
   * Get remaining ammunition count across all weapons
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
   */
  ammoCapacityTotal () {
    if (this.sunk) return 0
    return this.getAllWeapons().reduce(
      (sum, w) => sum + (w.ammoCapacity?.() ?? 0),
      0
    )
  }
  /**
   * @param {import("../terrains/sea/js/SeaShape.js").SeaVessel} shape
   */
  static createFromShape (shape) {
    const ship = new Ship(Ship.id, shape.symmetry, shape.letter)
    // Convert shape's weapon system to ship format
    if (shape.weaponSystem) {
      ship.weaponsById = shape.weaponSystem
    }

    ship._shape = shape
    return ship
  }

  /**
   * Populate weapons from shape's weapon system
   * @param {any} shapeWeaponSystem
   */
  setWeaponsFromShape (shapeWeaponSystem) {
    this.weaponsById = shapeWeaponSystem
  }

  /**
   * @param {Map<any, any> | { weaponsById: Map<any, any>; weaponPositions: any; } | ArrayLike<any> | { [s: string]: any; }} shapeWeaponSystem
   */
  weaponsFromShape (shapeWeaponSystem) {
    let weaponsById = new Map()

    const wpsList = Object.entries(shapeWeaponSystem)
    for (const [key, weaponSystem] of wpsList) {
      // Skip non-object values (in case of test mocks or invalid data)
      if (typeof weaponSystem !== 'object' || weaponSystem === null) {
        continue
      }
      const [r, c] = parsePair(key)
      if (r != null && c != null) {
        weaponSystem.row = r
        weaponSystem.col = c
        if (weaponSystem.id != null) {
          weaponsById.set(weaponSystem.id, weaponSystem)
        }
      }
    }
    return weaponsById
  }
  /**
   * @param {Map<any, any> | { weaponsById: Map<any, any>; weaponPositions: any; } | ArrayLike<any> | { [s: string]: any; }} placeWeaponSystem
   */
  weaponsFromPlacement (placeWeaponSystem) {
    let weaponsById = this.weaponsById || new Map()

    const zipped = Zip.lenient(
      weaponsById.entries(),
      Object.entries(placeWeaponSystem)
    )
    //    for (const [[idKey, weaponSystem], [coordKey, oldWeaponSystem]] of zipped) {
    for (const [[, weaponSystem], [coordKey]] of zipped) {
      // Skip non-object values (in case of test mocks or invalid data)
      if (typeof weaponSystem !== 'object' || weaponSystem === null) {
        continue
      }
      const [r, c] = parsePair(coordKey)
      if (r != null && c != null) {
        weaponSystem.row = r
        weaponSystem.col = c
      }
    }
    return weaponsById
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
   * Process multiple cells for damage
   * @param {any} model
   * @param {any} cells
   */
  _processCellDamage (model, cells) {
    const results = { hits: [], misses: [], dtaps: 0 }
    for (const cell of cells) {
      const [r, c] = cell
      if (this.isHitAt(r, c)) {
        results.dtaps++
        continue // Already hit
      }
      this.processHitAt(model, r, c, results, cell)
    }
    return results
  }

  /**
   * Internal: Process single cell damage result
   * @param {any} model
   * @param {any} r
   * @param {any} c
   * @param {{ hits: any; misses: any; dtaps?: number; }} results
   * @param {any} cell
   */
  processHitAt (model, r, c, results, cell) {
    if (this.board.test(r, c)) {
      const { damaged } = this.hitAt(model, r, c)
      results.hits.push({ key: `${r},${c}`, cell, damaged: damaged || 'burnt' })
    } else {
      results.misses.push({ key: `${r},${c}`, cell, damaged: 'burnt' })
    }
  }

  /**
   * Process hit at specific coordinates
   * @param {any} model
   * @param {any} r
   * @param {any} c
   */
  hitAt (model, r, c) {
    this.recordHit(r, c)
    const weaponAtPosition = this.rackAt(r, c)
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
   * Internal: Process hit on weapon magazine
   * @param {{ damaged: boolean; }} weaponSystem
   * @param {any} model
   * @param {any} r
   * @param {any} c
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
   * Internal: Process hit on loaded magazine with detonation possibility
   * @param {{ hit: boolean; weapon: { volatile: any; }; }} weaponSystem
   * @param {{ opponent: { updateUI: () => void; }; UI: any; loadOut: { useAmmo: (arg0: any) => void; }; }} model
   * @param {any} r
   * @param {any} c
   */
  _processLoadedMagazineHit (weaponSystem, model, r, c) {
    const damaged = 'skull'
    model.opponent?.updateUI()
    const viewModel = model.UI
    weaponSystem.hit = true
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
    return null
  }

  /**
   * Internal: Process magazine detonation in adjacent cells
   * @param {{ animateDetonation: (arg0: any, arg1: any) => void; }} weapon
   * @param {any} cell
   * @param {{ cellSizeScreen: () => any; }} viewModel
   * @param {any} model
   * @param {any} r
   * @param {any} c
   * @param {string} damaged
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
   * Internal: Determine final hit result
   * @param {string} info
   * @param {any} damaged
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
   * @param {number[][]} cells
   */
  placeAtCells (cells) {
    const board = SubBoard.fromCoords(cells, null, new Mask(0, 0))
    this.placeAtBoard(board)
    return cells
  }
  /**
   * Place ship at given cells with automatic hit/sunk reset
   * @param {SubBoard} board
   */
  placeAtBoard (board) {
    this.board = board
    this.sunk = false
  }

  /**
   * Place using variant placement object
   * @param {{ placeAt: (arg0: any, arg1: any) => any; }} placeable
   * @param {any} r
   * @param {any} c
   */
  placeVariant (placeable, r, c) {
    const placement = placeable.placeAt(r, c)
    this.placePlacement(placement)
  }

  /**
   * @param {{ board: any; weapons: {}; variant: number; }} placement
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
   * @param {any} r
   * @param {any} c
   */
  isRightZone (r, c) {
    const shipType = this.type()
    const isLand = bh.map.isLand(r, c)
    // area rules
    if (shipType === 'G' && !isLand) return false
    if (shipType === 'S' && isLand) return false

    return true
  }
  /**
   * @param {number} r
   * @param {number} c
   * @param {any[][]} shipCellGrid
   */
  noTouchCheck (r, c, shipCellGrid) {
    const map = bh.map
    for (let nr = r - 1; nr <= r + 1; nr++)
      for (let nc = c - 1; nc <= c + 1; nc++) {
        if (map.inBounds(nr, nc) && shipCellGrid[nr][nc]) return false
      }
    return true
  }
  /**
   * @param {[any, any][]} placing
   */
  isAllRightZone (placing) {
    return placing.some(([r, c]) => {
      return this.isRightZone(r, c) === false
    })
  }
  /**
   * Check if ship can be placed at variant and position
   * @param {any} variant
   * @param {any} r0
   * @param {any} c0
   * @param {any} shipCellGrid
   */
  canPlace (variant, r0, c0, shipCellGrid) {
    const placing = this.placeCells(variant, r0, c0)
    const map = bh.map

    if (!this._isPlacementInBounds(placing, map)) return false
    if (!this._isPlacementInCorrectZone(placing)) return false
    if (!this._isPlacementNotOverlapping(placing, map, shipCellGrid))
      return false
    if (!this._isPlacementNotTouching(placing, shipCellGrid)) return false

    return true
  }

  /**
   * Internal: Check placement bounds
   * @param {[any, any][]} cells
   * @param {{ inBounds: (arg0: any, arg1: any) => any; }} map
   */
  _isPlacementInBounds (cells, map) {
    return !cells.some(([r, c]) => !map.inBounds(r, c))
  }

  /**
   * Internal: Check placement zone requirements
   * @param {any} cells
   */
  _isPlacementInCorrectZone (cells) {
    return !this.isAllRightZone(cells)
  }

  /**
   * Internal: Check no overlapping ships
   * @param {[any, any][]} cells
   * @param {{ inBounds: (arg0: any, arg1: any) => any; }} map
   * @param {{ [x: string]: { [x: string]: any; }; }} shipCellGrid
   */
  _isPlacementNotOverlapping (cells, map, shipCellGrid) {
    return !cells.some(([r, c]) => map.inBounds(r, c) && shipCellGrid[r][c])
  }

  /**
   * Internal: Check no adjacent ships
   * @param {[any, any][]} cells
   * @param {any} shipCellGrid
   */
  _isPlacementNotTouching (cells, shipCellGrid) {
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
      weapons: this.weapons,
      hitPositions: this.hits.toCoords
    }
  }

  /**
   * Add ship to grid at its current position
   * @param {any[][]} shipCellGrid
   */
  addToGrid (shipCellGrid) {
    for (const [c, r] of this.board.locations()) {
      shipCellGrid[r][c] = { id: this.id, letter: this.letter }
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
   * Get ship type classification
   */
  type () {
    return bh.shipType(this.letter)
  }

  /**
   * Get description for sunk ship
   */
  getSunkDescription (middle = ' ') {
    return bh.shipSunkText(this.letter, middle)
  }

  /**
   * Get general description of ship
   */
  getDescription () {
    return bh.shipDescription(this.letter)
  }
}

bh.shipBuilder = Ship.createFromShape
bh.fleetBuilder = Ship.createShipsFromShapes
bh.extraFleetBuilder = Ship.extraShipsFromShapes
