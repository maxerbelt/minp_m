import { bh } from '../terrain/bh.js'
import { parsePair, makeKeyAndId } from '../utilities.js'
import { Mask } from '../grid/mask.js'
import { WeaponSystem } from '../weapon/WeaponSystem.js'
import { SubBoard } from '../grid/subBoard.js'

function firstElement (arr) {
  return arr && arr.length > 0 ? arr[0] : null
}

export class Ship {
  constructor (id, symmetry, letter, weapons) {
    this.id = id
    this.symmetry = symmetry
    this.letter = letter
    this.hits = Mask.empty(0, 0)
    this.size = 1
    this.placed = false
    this.sunk = false
    this.variant = 0
    this.weaponPositions = Mask.empty(0, 0)
    this.weaponsById = new Map()
    this.weapons = weapons || {}
  }
  get cells () {
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
    this._cellsArray = []
    this.placed = false
    this.board = this.shape()?.board || Mask.empty(0, 0)
  }

  static id = 1

  static next () {
    Ship.id++
  }

  static noOfHits (ships) {
    return ships.reduce((sum, s) => sum + s.getTotalHits(), 0)
  }
  static noOfSunk (ships) {
    return ships.reduce((sum, s) => sum + (s.sunk ? 1 : 0), 0)
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
   */
  recordHit (r, c) {
    this.hits.set(c, r, 1)
  }

  /**
   * Check if ship has been hit at (r, c)
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

  /**
   * Check if any weapons are equipped
   */
  hasWeapons () {
    if (this.weaponsById.size > 0) return true
    if (!this.weapons) return false
    return Object.keys(this.weapons).length > 0
  }

  static createShipsFromShapes (shapes) {
    Ship.id = 1
    WeaponSystem.id = 1
    return Ship.extraShipsFromShapes(shapes)
  }
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
   * Get serialized weapon IDs and positions
   */
  serializeWeaponPositions () {
    return this.getAllWeaponEntries()
      .map(([coordKey, weapon]) => makeKeyAndId(coordKey, weapon.id))
      .join('|')
  }

  /**
   * Find weapon system at position (r, c)
   */
  rackAt (r, c) {
    const coordKey = `${r},${c}`
    return this._findWeaponAt(coordKey)
  }

  /**
   * Internal: Find weapon by coordinate key or position
   */
  _findWeaponAt (coordKey) {
    // Check legacy weapons object first (for backward compatibility with tests)
    if (this.weapons?.[coordKey]) {
      return this.weapons[coordKey]
    }
    // Search weaponsById Map by coordinates
    for (const weapon of this.weaponsById.values()) {
      const weaponKey = `${weapon.row},${weapon.col}`
      if (weaponKey === coordKey) {
        return weapon
      }
    }
    return undefined
  }

  /**
   * Get first weapon system from all weapons
   */
  getPrimaryWeaponSystem () {
    return firstElement(this.getAllWeapons())
  }

  /**
   * Get primary weapon from first weapon system
   */
  getPrimaryWeapon () {
    const system = this.getPrimaryWeaponSystem()
    return system?.weapon
  }
  /**
   * Find closest loaded weapon rack to given coordinates
   */
  findClosestLoadedRack (r, c) {
    const loadedRacks = this.getLoadedWeaponEntries()
    if (loadedRacks.length === 0) return null
    return this._findClosestRack(loadedRacks, r, c)
  }

  /**
   * Internal: Calculate closest rack from list by distance
   */
  _findClosestRack (entries, r, c) {
    return entries.reduce((closest, current) => {
      const [closestKey] = closest
      const [currentKey] = current
      const [closestR, closestC] = closestKey.split(',').map(Number)
      const [currentR, currentC] = currentKey.split(',').map(Number)
      const closestDist = Math.hypot(closestR - r, closestC - c)
      const currentDist = Math.hypot(currentR - r, currentC - c)
      return currentDist < closestDist ? current : closest
    })
  }
  /**
   * Find weapon system by its unique ID
   */
  getWeaponBySystemId (id) {
    // Check weaponsById Map first (preferred)
    if (this.weaponsById.has(id)) {
      return this.weaponsById.get(id)
    }
    // Fall back to weapons object (for test compatibility)
    for (const weapon of Object.values(this.weapons || {})) {
      if (weapon.id === id) {
        return weapon
      }
    }
    return undefined
  }

  /**
   * Check if this ship matches the given ID
   */
  matchesId (id) {
    return this.id === id
  }

  /**
   * Get self if ID matches, null otherwise
   */
  getShipById (id) {
    return this.id === id ? this : null
  }

  /**
   * Format weapon coordinates and IDs as string (e.g., "1,2:10|2,3:11")
   */
  makeKeyIds () {
    return this.getAllWeaponEntries()
      .map(([key, weapon]) => `${key}:${weapon.id}`)
      .join('|')
  }

  /**
   * Get all [coordKey, weapon] entries for loaded weapons
   */
  getLoadedWeaponEntries () {
    return this.getAllWeaponEntries().filter(([, weapon]) => {
      return this._isWeaponLoaded(weapon)
    })
  }

  /**
   * Internal: Check if weapon has ammunition
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
    // For test compatibility, use weapons object if available
    if (this.weapons && Object.keys(this.weapons).length > 0) {
      return Object.entries(this.weapons)
    }
    // Build from weaponsById Map
    return [...this.weaponsById.values()].map(weapon => [
      `${weapon.row},${weapon.col}`,
      weapon
    ])
  }

  /**
   * Get all equipped weapons as array
   */
  getAllWeapons () {
    if (this.weapons && Object.keys(this.weapons).length > 0) {
      return Object.values(this.weapons)
    }
    return Array.from(this.weaponsById.values())
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
    return this.getTotalAmmo() > 0
  }

  /**
   * Get remaining ammunition count across all weapons
   */
  getTotalAmmo () {
    if (this.sunk) return 0
    return this.getAllWeapons().reduce(
      (sum, w) => sum + (w.ammoRemaining?.() ?? 0),
      0
    )
  }

  /**
   * Get total ammunition capacity across all weapons
   */
  getTotalAmmoCapacity () {
    if (this.sunk) return 0
    return this.getAllWeapons().reduce(
      (sum, w) => sum + (w.ammoTotal?.() ?? 0),
      0
    )
  }
  static createFromShape (shape) {
    const ship = new Ship(Ship.id, shape.symmetry, shape.letter)
    // Convert shape's weapon system to ship format
    if (shape.weaponSystem) {
      ship.setWeaponsFromShape(shape.weaponSystem)
    }
    ship._shape = shape
    return ship
  }

  /**
   * Populate weapons from shape's weapon system
   */
  setWeaponsFromShape (shapeWeaponSystem) {
    this.weaponsById.clear()
    this.weaponPositions = Mask.empty(this.size, this.size)

    for (const [key, weaponSystem] of Object.entries(shapeWeaponSystem)) {
      // Skip non-object values (in case of test mocks or invalid data)
      if (typeof weaponSystem !== 'object' || weaponSystem === null) {
        continue
      }
      const [r, c] = parsePair(key)
      if (r !== undefined && c !== undefined) {
        weaponSystem.row = r
        weaponSystem.col = c
        if (weaponSystem.id !== undefined) {
          this.weaponsById.set(weaponSystem.id, weaponSystem)
        }
        if (this.weaponPositions) {
          this.weaponPositions.set(r, c, 1)
        }
      }
    }
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

  placeCells (variant, r0, c0) {
    const shape = this.shape()
    return shape.placeCells(variant, r0, c0)
  }
  /**
   * Process multiple cells for damage
   */
  processCellDamage (model, cells) {
    const results = { hits: [], misses: [] }
    for (const cell of cells) {
      const [r, c] = cell
      if (this.isHitAt(r, c)) continue // Already hit
      this.processHitAt(model, r, c, results, cell)
    }
    return results
  }

  /**
   * Internal: Process single cell damage result
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
   */
  hitAt (model, r, c) {
    this.recordHit(r, c)
    const weaponAtPosition = this.rackAt(r, c)
    let info = null
    let damaged = null

    if (weaponAtPosition && model) {
      const result = this._processMagazineHit(weaponAtPosition, model, r, c)
      if (result) {
        damaged = result.damaged
        info = result.info
      }
    }

    return this._determineHitResult(info, damaged)
  }

  /**
   * Internal: Process hit on weapon magazine
   */
  _processMagazineHit (weaponSystem, model, r, c) {
    const isLoaded = this._isWeaponLoaded(weaponSystem)
    if (!isLoaded) {
      weaponSystem.damaged = true
      return { damaged: 'damaged', info: null }
    }
    return this._processLoadedMagazineHit(weaponSystem, model, r, c)
  }

  /**
   * Internal: Process hit on loaded magazine with detonation possibility
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
   */
  _processDetonation (weapon, cell, viewModel, model, r, c, damaged) {
    const detonationInfo = 'Magazine Detonated'
    weapon.animateDetonation(cell, viewModel.cellSizeScreen())
    const { hits, misses } = this.processCellDamage(
      model,
      bh.map.surround(r, c)
    )
    return { damaged, info: detonationInfo, hits, misses }
  }

  /**
   * Internal: Determine final hit result
   */
  _determineHitResult (info, damaged) {
    if (this.isSunk()) {
      this.sunk = true
      return { letter: this.letter, info, damaged, list: [], misses: [] }
    }
    return { letter: '', info, damaged, list: [], misses: [] }
  }

  /**
   * Remove ship from placement
   */
  removeFromPlacement () {
    this.resetBoard()
    this.resetHits()
    this.sunk = false
  }

  /**
   * Place ship at given cells with automatic hit/sunk reset
   */
  placeAtCells (cells) {
    this.cells = cells
    this.resetHits()
    this.sunk = false
    return cells
  }
  /**
   * Place ship at given cells with automatic hit/sunk reset
   */
  placeAtBoard (board) {
    this.board = board
    this.resetHits()
    this.sunk = false
  }

  /**
   * Place using variant placement object
   */
  placeVariant (placeable, r, c) {
    const placement = placeable.placeAt(r, c)
    this.placePlacement(placement)
  }

  placePlacement (placement) {
    this.placed = true
    this.board = placement.board
    if (placement.weapons) {
      this.variant = placement.variant
      this.weapons = placement.weapons
    }
  }

  /**
   * Get available placement variants for this ship
   */
  getAvailablePlacements () {
    return this.shape?.placeables() || []
  }
  isRightZone (r, c) {
    const shipType = this.type()
    const isLand = bh.map.isLand(r, c)
    // area rules
    if (shipType === 'G' && !isLand) return false
    if (shipType === 'S' && isLand) return false

    return true
  }
  noTouchCheck (r, c, shipCellGrid) {
    const map = bh.map
    for (let nr = r - 1; nr <= r + 1; nr++)
      for (let nc = c - 1; nc <= c + 1; nc++) {
        if (map.inBounds(nr, nc) && shipCellGrid[nr][nc]) return false
      }
    return true
  }
  isAllRightZone (placing) {
    placing.some(([r, c]) => {
      return this.isRightZone(r, c) === false
    })
  }
  /**
   * Check if ship can be placed at variant and position
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
   */
  _isPlacementInBounds (cells, map) {
    return !cells.some(([r, c]) => !map.inBounds(r, c))
  }

  /**
   * Internal: Check placement zone requirements
   */
  _isPlacementInCorrectZone (cells) {
    return !this.isAllRightZone(cells)
  }

  /**
   * Internal: Check no overlapping ships
   */
  _isPlacementNotOverlapping (cells, map, shipCellGrid) {
    return !cells.some(([r, c]) => map.inBounds(r, c) && shipCellGrid[r][c])
  }

  /**
   * Internal: Check no adjacent ships
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
  static maxMinSizeIn (arr) {
    const mm = arr.reduce(
      (m, o) => (o.minSize === 0 ? m : Math.max(m, o.minSize)),
      0
    )
    console.log(
      `maxMin Size: ${mm} :`,
      arr.map(o => `${o.letter}: ${o.width},${o.height}`).join('; ')
    )
    return mm
  }
  static minSizeIn (arr) {
    return arr.reduce(
      (m, o) => (o.minSize === 0 ? m : Math.min(m, o.minSize)),
      0
    )
  }
  static maxSizeIn (arr) {
    return arr.reduce((m, o) => Math.max(m, o.maxSize), Infinity)
  }

  /**
   * Check if ship belongs to tally group
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
