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

  /**
   * @param {string} letter - Ship letter identifier
   * @param {string} symmetry - Symmetry type (e.g., 'D', 'A', 'S', 'H', 'L', 'G')
   * @param {Array<[number, number]>} cells - Cell coordinates defining ship shape
   * @param {string} tallyGroup - Grouping for tally calculations
   * @param {any} tip - Tip/styling information
   * @param {Set<string>|Array<string>|Array<[number, number]>|null} [racks] - Weapon rack coordinates
   */
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
  /**
   * Weapons attached to this shape's racks
   * @returns {Object} Attached weapons indexed by coordinate
   */
  get attachedWeapons () {
    return this._attachedWeapons || {}
  }

  /**
   * Set weapons attached to shape's racks
   * @param {Object} weapons - Weapons object indexed by coordinate
   */
  set attachedWeapons (weapons) {
    this._attachedWeapons = weapons
  }

  /**
   * Tip/styling information for this shape
   * @returns {any} Tip configuration
   */
  get tip () {
    return this._tip
  }

  /**
   * Set tip/styling information
   * @param {any} newTip - New tip value
   */
  set tip (newTip) {
    this._tip = newTip
  }

  /**
   * Shape displacement (average of area and footprint)
   * @returns {number} Displacement value (calculated property)
   */
  get displacement () {
    return (this.area + this.footPrint) / 2
  }

  /**
   * Setting displacement is not allowed as it's calculated
   * @param {number} _newDisplacement
   * @throws {Error} Displacement is calculated from area and footprint
   */
  set displacement (_newDisplacement) {
    throw new Error(
      'Displacement cannot be set directly. It is calculated from area and footprint.'
    )
  }

  /**
   * Cells vulnerable to specific weapons
   * @returns {Array} Vulnerable cells array
   */
  get vulnerable () {
    if (this._vulnerable) return this._vulnerable
    this._vulnerable = []
    return this._vulnerable
  }

  /**
   * Set vulnerable cells
   * @param {Array} newVulnerable - New vulnerable array
   */
  set vulnerable (newVulnerable) {
    this._vulnerable = newVulnerable
  }

  /**
   * Cells hardened against weapon damage
   * @returns {Array} Hardened cells array
   */
  get hardened () {
    if (this._hardened) return this._hardened
    this._hardened = []
    return this._hardened
  }

  /**
   * Set hardened cells
   * @param {Array} newHardened - New hardened array
   */
  set hardened (newHardened) {
    this._hardened = newHardened
  }

  /**
   * Cells immune to weapon damage
   * @returns {Array} Immune cells array
   */
  get immune () {
    if (this._immune) return this._immune
    this._immune = []
    return this._immune
  }

  /**
   * Set immune cells
   * @param {Array} newImmune - New immune array
   */
  set immune (newImmune) {
    this._immune = newImmune
  }

  /**
   * Internal: Extract row and column from various coordinate formats
   * @param {string|Array<number>|any} value - Coordinate in various formats
   * @returns {[number, number]} Array of [row, column] or [NaN, NaN] if invalid
   * @private
   */
  _extractRackCoordinate (value) {
    if (typeof value === 'string') {
      return parsePair(value)
    }
    if (Array.isArray(value) && value.length >= 2) {
      return [value[0], value[1]]
    }
    return [Number.NaN, Number.NaN]
  }

  /**
   * Internal: Normalize rack coordinates from various input formats
   * @param {Set<any>|Array<any>|null} racks - Rack coordinates in various formats
   * @returns {Array<[number, number]>} Array of valid [row, col] coordinate pairs
   * @private
   */
  _normalizeRackCoordinates (racks) {
    if (!racks) return []

    const coordinates = Zip.toArray(racks)
    return coordinates
      .map(v => this._extractRackCoordinate(v))
      .filter(([r, c]) => Number.isFinite(r) && Number.isFinite(c))
  }

  /**
   * Internal: Check if rack coordinates are present
   * @param {Set<any>|Array<any>|null} racks - Rack coordinates
   * @returns {boolean} True if racks container has coordinates
   * @private
   */
  _hasRackCoordinates (racks) {
    if (!racks) return false
    if (racks instanceof Set) return racks.size > 0
    if (Array.isArray(racks)) return racks.length > 0
    return false
  }

  /**
   * Internal: Build Set of coordinate keys from rack positions mask
   * @returns {Set<string>} Set of coordinate keys in "r,c" format
   * @private
   */
  _buildRacksFromPositions () {
    const rackSet = new Set()
    for (const [r, c] of this.rackPositions.toCoords) {
      rackSet.add(makeKey(r, c))
    }
    return rackSet
  }

  /**
   * Height of shape bounding box
   * @returns {number} Height in cells
   */
  get height () {
    return this.board.height
  }

  /**
   * Width of shape bounding box
   * @returns {number} Width in cells
   */
  get width () {
    return this.board.width
  }

  /**
   * Board mask defining shape occupancy
   * @returns {Mask} Occupancy mask
   */
  get board () {
    return this._board || this.boardFor(1) || Mask.empty(0, 0)
  }

  /**
   * Set board mask
   * @param {Mask} board - New board mask
   */
  set board (board) {
    this._board = board
    this.size = board.occupancy
  }

  /**
   * Square board representation (W×H square containing board)
   * @returns {Mask} Squared board mask
   */
  get boardSquare () {
    return this.board.square
  }

  /**
   * Minimum dimension of shape (width or height)
   * @returns {number} Minimum size
   */
  get minSize () {
    return Math.min(this.width, this.height)
  }

  /**
   * Maximum dimension of shape (width or height)
   * @returns {number} Maximum size
   */
  get maxSize () {
    return Math.max(this.width, this.height)
  }

  /**
   * Original cell coordinates defining shape
   * @returns {Array<[number, number]>} Array of [row, col] pairs
   */
  get cells () {
    return this._originalCells
  }

  /**
   * Set cell coordinates (updates board representation)
   * @param {Array<[number, number]>} cells - New cell coordinates
   */
  set cells (cells) {
    this._originalCells = cells
    this.board = Mask.fromCoordsSquare(cells)
  }

  /**
   * Weapon rack positions
   * @returns {Set<string>|null} Set of rack coordinate keys or null if no racks
   */
  get racks () {
    if (this._racksWasNull) return null
    if (this._racksSet) return this._racksSet
    return this._buildRacksFromPositions()
  }
  /**
   * Check if shape can exist on given subterrain
   * @param {string} subterrain - Subterrain type to check
   * @returns {boolean} True if shape matches subterrain
   */
  canBeOn (subterrain) {
    return this.subterrain === subterrain
  }

  /**
   * Get protection level against weapon type
   * @param {string} weapon - Weapon type code
   * @returns {number} Protection level: 0=vulnerable, 1=normal, 2=hardened, 3=immune
   */
  protectionAgainst (weapon) {
    if (this.immune.includes(weapon)) return 3
    if (this.hardened.includes(weapon)) return 2
    if (this.vulnerable.includes(weapon)) return 0
    return 1
  }

  /**
   * Attach weapons to all rack positions on this shape
   * @param {Function} ammoBuilder - Factory function creating ammunition for each rack
   * @returns {Object} Attached weapons indexed by coordinate
   * @throws {Error} If no racks available or weapon already attached
   */
  attachWeapon (ammoBuilder) {
    this._assertCanAttachWeapons()
    this._assertWeaponNotAttached()

    this.attachedWeapons = this._buildAttachedWeapons(ammoBuilder)
    this.isAttachedToRack = true
    return this.attachedWeapons
  }

  /**
   * Internal: Verify shape has weapon rack positions
   * @throws {Error} If shape has no racks
   * @private
   */
  _assertCanAttachWeapons () {
    if (!this.canAttachWeapons) {
      throw new Error('Cannot attach weapon to shape ' + this.letter)
    }
  }

  /**
   * Internal: Verify weapon not already attached
   * @throws {Error} If weapon already attached to this shape
   * @private
   */
  _assertWeaponNotAttached () {
    if (this.isAttachedToRack) {
      throw new Error('Weapon already attached to shape ' + this.letter)
    }
  }

  /**
   * Internal: Build weapon objects at all rack positions
   * @param {Function} ammoBuilder - Factory creating ammunition for each position
   * @returns {Object} Weapons indexed by coordinate key
   * @private
   */
  _buildAttachedWeapons (ammoBuilder) {
    const attached = {}
    for (const [r, c] of this.rackPositions.toCoords) {
      attached[makeKey(r, c)] = ammoBuilder()
    }
    return attached
  }

  /**
   * Get weapon system representation with all rack positions
   * @returns {Object|null} Object mapping coordinates to WeaponSystem instances, or null if not attached
   */
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
  /**
   * Get board for specific variant index
   * @param {number} variantIndex - Variant index to get board for
   * @returns {Mask} Board mask for variant
   */
  boardFor (variantIndex) {
    const variants = this.variants()
    return variants.boardFor(variantIndex)
  }

  /**
   * Get variant factory for this shape's symmetry type
   * @returns {Invariant|Orbit4F|Asymmetric|Orbit4R|Blinker|Diagonal} Variant instance
   * @throws {Error} If symmetry type is unknown
   */
  variants () {
    const VariantClass = Shape.variantConstructors[this.symmetry]
    if (!VariantClass) {
      throw new Error('Unknown symmetry type for ship letter: ' + this.letter)
    }
    return new VariantClass(this.boardSquare, this.validator, this.zoneDetail)
  }

  /**
   * Get number of available placement variants
   * @returns {number} Total variant count for this shape
   */
  numVariants () {
    return this.variants().numVariants()
  }

  /**
   * Get all placeable variant objects for this shape
   * @returns {Array} Placeable variant objects
   */
  placeables () {
    return this.variants().placeables()
  }

  /**
   * Check if shape shrinks under given cell height
   * @param {number} cellHeight - Cell height threshold
   * @returns {any} Shrink information for display scaling
   */
  infoShrunkUnder (cellHeight) {
    return this.variants().shrunkUnder(cellHeight)
  }

  /**
   * Get ship type from terrain configuration
   * @returns {string} Ship type code
   */
  type () {
    return this.terrain.ships.types[this.letter]
  }

  /**
   * Get ship color from terrain configuration
   * @returns {string} Ship color value
   */
  color () {
    return this.terrain.ships.colors[this.letter]
  }

  /**
   * Get letter color scheme from terrain
   * @returns {Object} Letter color configuration
   */
  letterColors () {
    return this.terrain.ships.letterColors[this.letter]
  }

  /**
   * Get ship description text
   * @returns {string} Human-readable ship description
   */
  description () {
    return this.terrain.ships.description[this.letter]
  }

  /**
   * Get sunk ship description with optional separator
   * @param {string} [middle=' '] - Separator between ship name and status
   * @returns {string} Full sunk description text
   */
  sunkDescription (middle = ' ') {
    return this.description() + middle + this.shipSunkDescriptions()
  }

  /**
   * Get sunk status descriptions for ship type
   * @returns {string} Sunk status text for this ship type
   */
  shipSunkDescriptions () {
    return this.terrain.ships.shipSunkDescriptions[this.type()]
  }
}
