import { bh } from '../terrain/bh.js'
import { Invariant } from '../variants/Invariant.js'
import { Orbit4R } from '../variants/Orbit4R.js'
import { Asymmetric } from '../variants/asymmetric.js'
import { Diagonal } from '../variants/Diagonal.js'
import { Orbit4F } from '../variants/Orbit4F.js'
import { Blinker } from '../variants/Blinker.js'
import { makeKey } from '../utilities.js'
import { WeaponSystem } from '../weapon/WeaponSystem.js'
import { Mask } from '../grid/mask.js'

export const token = 'geoffs-hidden-battle'

export class Shape {
  constructor (letter, symmetry, cells, tallyGroup, tip, racks) {
    this.letter = letter
    this.symmetry = symmetry
    const board = Mask.fromCoords(cells)
    this._board = board
    this._originalCells = cells
    // Instead of: this.racks = new Set(racks.map(([r, c]) => makeKey(r, c)))
    this._racksWasNull = racks === null || racks === undefined // Track if racks was null
    // Extract only [r, c] coordinates from racks (can be array or Set), ignoring any z coordinate
    let racksCoords = []
    if (racks && Array.isArray(racks)) {
      racksCoords = racks.map(([r, c]) => [r, c])
    }
    // If racks is already a Set, rackPositions will be empty (since racks getter returns the Set directly)
    this.rackPositions = Mask.fromCoordsSquare(racksCoords)
    this._racksSet = racks instanceof Set ? racks : null
    this.canAttachWeapons =
      racks && (Array.isArray(racks) ? racks.length > 0 : racks.size > 0)

    this.isAttachedToRack = false
    this.terrain = bh.terrain
    this.subterrain = null
    this.validator = Function.prototype
    this.zoneDetail = 0
    this.tip = tip
    this.tallyGroup = tallyGroup
    const area = cells.length
    //  const a2 = board.occupancy
    this.footBoard = board.dilateExpand()
    this.footPrint = this.footBoard.occupancy
    this.displacement = (area + this.footPrint) / 2
    this.vulnerable = []
    this.hardened = []
    this.immune = []
    this.attachedWeapons = {}
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
    // For backward compatibility: return null if racks was originally null
    if (this._racksWasNull) return null
    // If racks was passed as a Set (from another Shape), return it directly
    if (this._racksSet) return this._racksSet
    // Otherwise build Set from rackPositions
    const rackSet = new Set()
    for (const [r, c] of this.rackPositions.toCoords) {
      rackSet.add(makeKey(r, c))
    }
    return rackSet
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
    if (!this.canAttachWeapons) {
      throw new Error('Cannot attach weapon to shape ' + this.letter)
    }
    if (this.isAttachedToRack) {
      throw new Error('Weapon already attached to shape ' + this.letter)
    }
    this.isAttachedToRack = true
    const newObject = {}
    // Instead of: for (const key of [...this.racks])
    for (const [r, c] of this.rackPositions.toCoords) {
      const key = makeKey(r, c)
      newObject[key] = ammoBuilder()
    }
    this.attachedWeapons = newObject
    return this.attachedWeapons
  }
  get weaponSystem () {
    const mapValues = w => new WeaponSystem(w)

    return Object.keys(this.attachedWeapons || {}).reduce((acc, key) => {
      acc[key] = mapValues(this.attachedWeapons[key])
      return acc
    }, {})
  }
  boardFor (variantIndex) {
    return this.variants().board(variantIndex)
  }
  variants () {
    switch (this.symmetry) {
      case 'D':
        return new Asymmetric(this.boardSquare, this.validator, this.zoneDetail)
      case 'A':
        return new Orbit4F(this.boardSquare, this.validator, this.zoneDetail)
      case 'S':
        return new Invariant(this.boardSquare, this.validator, this.zoneDetail)
      case 'H':
        return new Orbit4R(this.boardSquare, this.validator, this.zoneDetail)
      case 'L':
        return new Blinker(this.boardSquare, this.validator, this.zoneDetail)
      case 'G':
        return new Diagonal(this.boardSquare, this.validator, this.zoneDetail)
      default:
        throw new Error('Unknown symmetry type for ship letter: ' + this.letter)
    }
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
