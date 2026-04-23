import { bh } from '../terrains/all/js/bh.js'
import { Invariant } from '../variants/Invariant.js'
import { Orbit4R } from '../variants/Orbit4R.js'
import { Asymmetric } from '../variants/asymmetric.js'
import { Diagonal } from '../variants/Diagonal.js'
import { Orbit4F } from '../variants/Orbit4F.js'
import { Blinker } from '../variants/Blinker.js'
import { makeKey, parsePair } from '../core/utilities.js'
import { WeaponSystem } from '../weapon/WeaponSystem.js'
import { Mask } from '../grid/rectangle/mask.js'
import { Zip } from '../core/Zip.js'

export const token = 'geoffs-hidden-battle'

export class Shape {
  static variantConstructors = {
    D: Asymmetric,
    A: Orbit4F,
    S: Invariant,
    H: Orbit4R,
    L: Blinker,
    G: Diagonal
  }

  constructor (letter, symmetry, cells, tallyGroup, tip, racks) {
    this.letter = letter
    this.symmetry = symmetry
    this._board = Mask.fromCoords(cells)
    this._originalCells = cells
    this._racksWasNull = racks == null
    this._racksSet = racks instanceof Set ? racks : null
    this.rackPositions = Mask.fromCoordsSquare(
      this._normalizeRackCoordinates(racks)
    )
    this.canAttachWeapons = this._hasRackCoordinates(racks)

    this.isAttachedToRack = false
    this.terrain = bh.terrain
    this.subterrain = null
    this.validator = Function.prototype
    this.zoneDetail = 0
    this.tip = tip
    this.tallyGroup = tallyGroup
    const area = cells.length
    this.area = area
    this.footBoard = this._board.dilateExpand()
    this.footPrint = this.footBoard.occupancy
    this.size = area
  }
  get attachedWeapons () {
    return this._attachedWeapons || {}
  }
  set attachedWeapons (weapons) {
    this._attachedWeapons = weapons
  }
  get tip () {
    return this._tip
  }
  set tip (newTip) {
    this._tip = newTip
  }

  get displacement () {
    return (this.area + this.footPrint) / 2
  }
  set displacement (_newDisplacement) {
    // Displacement is calculated from area and footprint, so it cannot be set directly.
    throw new Error(
      'Displacement cannot be set directly. It is calculated from area and footprint.'
    )
  }
  get vulnerable () {
    if (this._vulnerable) return this._vulnerable
    this._vulnerable = []
    return this._vulnerable
  }
  set vulnerable (newVulnerable) {
    this._vulnerable = newVulnerable
  }
  get hardened () {
    if (this._hardened) return this._hardened
    this._hardened = []
    return this._hardened
  }
  set hardened (newHardened) {
    this._hardened = newHardened
  }
  get immune () {
    if (this._immune) return this._immune
    this._immune = []
    return this._immune
  }
  set immune (newImmune) {
    this._immune = newImmune
  }

  _normalizeRackCoordinates (racks) {
    if (!racks) return []

    const coordinates = Zip.toArray(racks)
    return coordinates
      .map(this._extractRackCoordinates)
      .filter(([r, c]) => Number.isFinite(r) && Number.isFinite(c))
  }

  _extractRackCoordinates (value) {
    if (typeof value === 'string') {
      return parsePair(value)
    }
    if (Array.isArray(value) && value.length >= 2) {
      return [value[0], value[1]]
    }
    return [Number.NaN, Number.NaN]
  }

  _hasRackCoordinates (racks) {
    if (!racks) return false
    if (racks instanceof Set) return racks.size > 0
    if (Array.isArray(racks)) return racks.length > 0
    return false
  }

  _buildRacksFromPositions () {
    const rackSet = new Set()
    for (const [r, c] of this.rackPositions.toCoords) {
      rackSet.add(makeKey(r, c))
    }
    return rackSet
  }

  get height () {
    return this.board.height
  }
  get width () {
    return this.board.width
  }
  get board () {
    return this._board || this.boardFor(1) || Mask.empty(0, 0)
  }
  get boardSquare () {
    return this.board.square
  }
  set board (board) {
    this._board = board
    this.size = board.occupancy
  }
  get minSize () {
    return Math.min(this.width, this.height)
  }
  get maxSize () {
    return Math.max(this.width, this.height)
  }
  get cells () {
    return this._originalCells
  }
  set cells (cells) {
    this._originalCells = cells
    this.board = Mask.fromCoordsSquare(cells)
  }
  get racks () {
    if (this._racksWasNull) return null
    if (this._racksSet) return this._racksSet
    return this._buildRacksFromPositions()
  }
  canBeOn (subterrain) {
    return this.subterrain === subterrain
  }
  protectionAgainst (weapon) {
    if (this.immune.includes(weapon)) return 3
    if (this.hardened.includes(weapon)) return 2
    if (this.vulnerable.includes(weapon)) return 0
    return 1
  }
  attachWeapon (ammoBuilder) {
    this._assertCanAttachWeapons()
    this._assertWeaponNotAttached()

    this.attachedWeapons = this._buildAttachedWeapons(ammoBuilder)
    this.isAttachedToRack = true
    return this.attachedWeapons
  }

  _assertCanAttachWeapons () {
    if (!this.canAttachWeapons) {
      throw new Error('Cannot attach weapon to shape ' + this.letter)
    }
  }

  _assertWeaponNotAttached () {
    if (this.isAttachedToRack) {
      throw new Error('Weapon already attached to shape ' + this.letter)
    }
  }

  _buildAttachedWeapons (ammoBuilder) {
    const attached = {}
    for (const [r, c] of this.rackPositions.toCoords) {
      attached[makeKey(r, c)] = ammoBuilder()
    }
    return attached
  }

  get weaponSystem () {
    if (!this.isAttachedToRack) {
      return null
    }
    return Object.fromEntries(
      Object.entries(this.attachedWeapons || {}).map(([key, weapon]) => [
        key,
        new WeaponSystem(weapon)
      ])
    )
  }
  boardFor (variantIndex) {
    const variants = this.variants()
    return variants.boardFor(variantIndex)
  }
  variants () {
    const VariantClass = Shape.variantConstructors[this.symmetry]
    if (!VariantClass) {
      throw new Error('Unknown symmetry type for ship letter: ' + this.letter)
    }
    return new VariantClass(this.boardSquare, this.validator, this.zoneDetail)
  }
  numVariants () {
    return this.variants().numVariants()
  }
  placeables () {
    return this.variants().placeables()
  }
  infoShrunkUnder (cellHeight) {
    return this.variants().shrunkUnder(cellHeight)
  }
  type () {
    return this.terrain.ships.types[this.letter]
  }
  color () {
    return this.terrain.ships.colors[this.letter]
  }
  sunkDescription (middle = ' ') {
    return this.description() + middle + this.shipSunkDescriptions()
  }
  letterColors () {
    return this.terrain.ships.letterColors[this.letter]
  }
  description () {
    return this.terrain.ships.description[this.letter]
  }
  shipSunkDescriptions () {
    return this.terrain.ships.shipSunkDescriptions[this.type()]
  }
}
