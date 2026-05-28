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

/**
 * @typedef {[number, number]} CoordinatePair
 * Array coordinate pair [row, column]
 */

/**
 * @typedef {Set<string>|Array<string|Array<number>>|null} RackInput
 * Weapon rack position input in various formats:
 * - Set<string>: Set of "r,c" coordinate keys
 * - Array<string>: Array of "r,c" coordinate keys
 * - Array<Array<number>>: Array of [r, c] coordinate pairs
 * - null: No racks available
 */

/**
 * @typedef {Object<string, WeaponSystem>} WeaponMap
 * Weapons indexed by coordinate key ("r,c" format)
 */

/**
 * @typedef {Object} SubTerrain
 * Subterrain type for shape validation
 * Used to determine valid terrain types for ship placement
 */

/**
 * @callback AmmoBuilder
 * Factory function for creating ammunition payload at weapon racks
 * @returns {any} Ammunition payload for a weapon rack
 */

/**
 * @typedef {Object} VariantFactory
 * Factory for generating ship placement variants
 * @property {(variantIndex: number) => Mask} boardFor - Get board for variant
 * @property {() => number} numVariants - Get variant count
 * @property {() => Array} placeables - Get placeable variants
 * @property {(cellHeight: number) => any} shrunkUnder - Get shrink information
 */

export const token = 'geoffs-hidden-battle'

export class Shape {
  /**
   * Map of symmetry type codes to variant constructor classes
   * Used to instantiate appropriate variant generator for each symmetry type.
   * @static
   * @type {Object<string, Function>}
   */
  static variantConstructors = {
    D: Asymmetric,
    A: Orbit4F,
    S: Invariant,
    H: Orbit4R,
    L: Blinker,
    G: Diagonal
  }

  /**
   * Creates a ship shape with specified properties and variant generation.
   * Shape manages placement variants, weapon systems, and damage properties.
   *
   * @constructor
   * @param {string} letter - Ship letter identifier (A-Z, e.g., 'A', 'B', 'C')
   * @param {string} symmetry - Symmetry type for variant generation
   *   ('D'=Asymmetric, 'A'=Orbit4F, 'S'=Invariant, 'H'=Orbit4R, 'L'=Blinker, 'G'=Diagonal)
   * @param {CoordinatePair[]} cells - Array of [row, col] coordinates defining ship shape
   * @param {string} tallyGroup - Grouping identifier for tally calculations (e.g., 'Cruisers')
   * @param {Object} tip - UI tip/styling information for ship placement visual display
   * @param {RackInput} [racks] - Weapon rack positions (Set, Array, or null)
   *   If provided, enables weapon attachment at specified coordinates
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
    this.canAttachWeapons = this._hasValidRackInput(racks)

    this.isAttachedToRack = false
    this.terrain = bh.terrain
    this.subterrain = null
    this.validator = Function.prototype
    this.zoneDetail = 0
    this.tip = tip
    this.tallyGroup = tallyGroup
    this.notes = []
    const area = cells.length
    this.area = area
    this.footBoard = this._board.dilateExpand()
    this.footPrint = this.footBoard.occupancy
    this.size = area
  }
  /**
   * Weapons attached to this shape's racks.
   * Only populated after attachWeapon() is called.
   *
   * @readonly
   * @returns {WeaponMap} Attached weapons indexed by coordinate key
   *   Empty object if no weapons attached
   */
  get attachedWeapons () {
    return this._attachedWeapons || {}
  }

  /**
   * Set weapons attached to shape's racks
   * @param {WeaponMap} weapons - Weapons object indexed by coordinate
   */
  set attachedWeapons (weapons) {
    this._attachedWeapons = weapons
  }

  /**
   * Tip/styling information for this shape.
   * Used for UI display during ship placement selection.
   *
   * @readonly
   * @returns {Object} Tip configuration object
   */
  get tip () {
    return this._tip
  }

  /**
   * Set tip/styling information
   * @param {Object} newTip - New tip value for UI display
   */
  set tip (newTip) {
    this._tip = newTip
  }

  /**
   * Shape displacement (average of area and footprint).
   *
   * @readonly
   * @returns {number} Displacement value (calculated property)
   */
  get displacement () {
    return (this.area + this.footPrint) / 2
  }

  /**
   * Setting displacement is not allowed as it's calculated.
   *
   * @param {number} _newDisplacement - Ignored parameter
   * @throws {Error} Always throws - displacement is calculated from area and footprint
   */
  set displacement (_newDisplacement) {
    throw new Error(
      'Displacement cannot be set directly. It is calculated from area and footprint.'
    )
  }

  /**
   * Cells vulnerable to specific weapons.
   *
   * @readonly
   * @returns {Array<string>} Vulnerable weapon codes array
   */
  get vulnerable () {
    return this._getOrInitArrayProperty('_vulnerable')
  }

  /**
   * Set vulnerable cells
   * @param {Array} newVulnerable - New vulnerable array
   */
  set vulnerable (newVulnerable) {
    this._vulnerable = newVulnerable
  }

  /**
   * Cells hardened against weapon damage.
   *
   * @readonly
   * @returns {Array<string>} Hardened weapon codes array
   */
  get hardened () {
    return this._getOrInitArrayProperty('_hardened')
  }

  /**
   * Set hardened cells
   * @param {Array} newHardened - New hardened array
   */
  set hardened (newHardened) {
    this._hardened = newHardened
  }

  /**
   * Cells immune to weapon damage.
   *
   * @readonly
   * @returns {Array<string>} Immune weapon codes array
   */
  get immune () {
    return this._getOrInitArrayProperty('_immune')
  }

  /**
   * Set immune cells
   * @param {Array} newImmune - New immune array
   */
  set immune (newImmune) {
    this._immune = newImmune
  }

  /**
   * Internal: Get or initialize a named array property.
   * Lazily initializes empty array on first access.
   * Used for vulnerable, hardened, and immune cell arrays.
   *
   * @private
   * @param {string} property - Internal property name (e.g., '_vulnerable')
   * @returns {Array<string>} Array value stored in property (auto-initialized if undefined)
   */
  _getOrInitArrayProperty (property) {
    if (this[property]) return this[property]
    this[property] = []
    return this[property]
  }

  /**
   * Internal: Normalize a rack coordinate value into a row/column pair.
   * Handles string ("r,c" format) and array ([r, c]) coordinate formats.
   *
   * @private
   * @param {string|CoordinatePair|any} value - Coordinate value in various formats
   * @returns {CoordinatePair} Valid [row, column] pair or [NaN, NaN] if invalid
   */
  _parseRackCoordinate (value) {
    if (typeof value === 'string') {
      return parsePair(value)
    }
    if (Array.isArray(value) && value.length >= 2) {
      return [value[0], value[1]]
    }
    return [Number.NaN, Number.NaN]
  }

  /**
   * Internal: Normalize rack coordinates from various input formats.
   * Converts all rack input types to validated [row, col] coordinate pairs.
   * Filters out invalid/NaN coordinates.
   *
   * @private
   * @param {RackInput} racks - Rack coordinates in various formats
   * @returns {CoordinatePair[]} Array of valid [row, col] coordinate pairs
   */
  _normalizeRackCoordinates (racks) {
    if (!this._hasValidRackInput(racks)) return []

    return Zip.toArray(racks)
      .map(v => this._parseRackCoordinate(v))
      .filter(this._isFiniteCoordinate)
  }

  /**
   * Internal: Check whether the rack input contains any coordinates.
   * Validates that racks container is not empty and not null.
   *
   * @private
   * @param {RackInput} racks - Rack input container (Set, Array, or null)
   * @returns {boolean} True if racks container has at least one coordinate
   */
  _hasValidRackInput (racks) {
    if (!racks) return false
    if (racks instanceof Set) return racks.size > 0
    return Array.isArray(racks) && racks.length > 0
  }

  /**
   * Internal: Validate coordinate pair values.
   * Used to filter out invalid/NaN coordinates from normalized coordinates.
   *
   * @private
   * @param {CoordinatePair} coord - Coordinate pair [row, col]
   * @returns {boolean} True if both row and column are finite numbers
   */
  _isFiniteCoordinate ([r, c]) {
    return Number.isFinite(r) && Number.isFinite(c)
  }

  /**
   * Internal: Build Set of coordinate keys from rack positions mask.
   * Converts mask occupancy to coordinate key format.
   *
   * @private
   * @returns {Set<string>} Set of coordinate keys in "r,c" format
   */
  _buildRacksFromPositions () {
    return new Set(this.rackPositions.toCoords.map(([r, c]) => makeKey(r, c)))
  }

  /**
   * Height of shape bounding box.
   *
   * @readonly
   * @returns {number} Height in cells
   */
  get height () {
    return this.board.height
  }

  /**
   * Width of shape bounding box.
   *
   * @readonly
   * @returns {number} Width in cells
   */
  get width () {
    return this.board.width
  }

  /**
   * Board mask defining shape occupancy.
   * Returns cached board or generates from variant index 1.
   *
   * @readonly
   * @returns {Mask} Occupancy mask representing ship shape
   */
  get board () {
    return this._board || this.boardFor(1) || Mask.empty(0, 0)
  }

  /**
   * Set board mask and update size
   * @param {Mask} board - New board mask
   */
  set board (board) {
    this._board = board
    this.size = board.occupancy
  }

  /**
   * Square board representation (W×H square containing board).
   * Used for generating placement variants.
   *
   * @readonly
   * @returns {Mask} Squared board mask with padding
   */
  get boardSquare () {
    return this.board.square
  }

  /**
   * Minimum dimension of shape (width or height).
   *
   * @readonly
   * @returns {number} Minimum size in cells
   */
  get minSize () {
    return Math.min(this.width, this.height)
  }

  /**
   * Maximum dimension of shape (width or height).
   *
   * @readonly
   * @returns {number} Maximum size in cells
   */
  get maxSize () {
    return Math.max(this.width, this.height)
  }

  /**
   * Original cell coordinates defining shape.
   *
   * @readonly
   * @returns {CoordinatePair[]} Array of [row, col] coordinate pairs
   */
  get cells () {
    return this._originalCells
  }

  /**
   * Set cell coordinates (updates board representation)
   * Recalculates board mask from new coordinates.
   * @param {CoordinatePair[]} cells - New cell coordinates
   */
  set cells (cells) {
    this._originalCells = cells
    this.board = Mask.fromCoordsSquare(cells)
  }

  /**
   * Weapon rack positions.
   * Returns null if no racks were provided in constructor.
   *
   * @readonly
   * @returns {Set<string>|null} Set of "r,c" coordinate keys or null
   */
  get racks () {
    if (this._racksWasNull) return null
    if (this._racksSet) return this._racksSet
    return this._buildRacksFromPositions()
  }

  /**
   * Check if shape can exist on given subterrain.
   * Validates terrain compatibility for ship placement.
   *
   * @param {SubTerrain} subterrain - Subterrain type to check
   * @returns {boolean} True if shape's subterrain matches given type
   */
  canBeOn (subterrain) {
    return this.subterrain === subterrain
  }

  /**
   * Get protection level against weapon type.
   * Checks vulnerability/hardening/immunity status for damage calculation.
   *
   * @param {string} weapon - Weapon type code to check protection against
   * @returns {number} Protection level:
   *   0=vulnerable (extra damage),
   *   1=normal (standard damage),
   *   2=hardened (reduced damage),
   *   3=immune (no damage)
   */
  protectionAgainst (weapon) {
    if (this.immune.includes(weapon)) return 3
    if (this.hardened.includes(weapon)) return 2
    if (this.vulnerable.includes(weapon)) return 0
    return 1
  }

  /**
   * Attach weapons to all rack positions on this shape.
   * Creates weapon system at each rack position using provided factory.
   *
   * @param {AmmoBuilder} ammoBuilder
   *   Factory function called once per rack to create ammunition payload
   * @returns {WeaponMap} Attached weapons indexed by "r,c" coordinate key
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
   * Internal: Verify shape has weapon rack positions.
   *
   * @private
   * @throws {Error} If shape has no racks available for weapons
   */
  _assertCanAttachWeapons () {
    if (!this.canAttachWeapons) {
      throw new Error('Cannot attach weapon to shape ' + this.letter)
    }
  }

  /**
   * Internal: Verify weapon not already attached.
   * Ensures attachWeapon() is called at most once per shape.
   *
   * @private
   * @throws {Error} If weapon already attached to this shape
   */
  _assertWeaponNotAttached () {
    if (this.isAttachedToRack) {
      throw new Error('Weapon already attached to shape ' + this.letter)
    }
  }

  /**
   * Internal: Build weapon objects at all rack positions.
   * Calls ammoBuilder once per rack coordinate to create payload.
   *
   * @private
   * @param {AmmoBuilder} ammoBuilder
   *   Factory function creating ammunition for each rack position
   * @returns {WeaponMap} Weapons indexed by "r,c" coordinate key
   */
  _buildAttachedWeapons (ammoBuilder) {
    const attached = {}
    for (const [r, c] of this.rackPositions.toCoords) {
      attached[makeKey(r, c)] = ammoBuilder()
    }
    return attached
  }

  /**
   * Get weapon system representation with all rack positions.
   * Wraps attached weapons in WeaponSystem instances for game use.
   *
   * @readonly
   * @returns {WeaponMap|null}
   *   Object mapping "r,c" coordinates to WeaponSystem instances, or null if not attached
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
   * Get board mask for specific variant index.
   * Delegates to variant factory's boardFor method.
   *
   * @param {number} variantIndex - Variant index (1-based) to get board for
   * @returns {Mask} Board mask for specified variant
   */
  boardFor (variantIndex) {
    const variants = this.variants()
    return variants.boardFor(variantIndex)
  }

  /**
   * Get variant factory for this shape's symmetry type.
   * Creates appropriate variant generator based on symmetry value.
   *
   * @returns {VariantFactory}
   *   Variant factory (Invariant, Orbit4F, Asymmetric, Orbit4R, Blinker, or Diagonal)
   * @throws {Error} If symmetry type is unknown or not registered
   */
  variants () {
    const VariantClass = Shape.variantConstructors[this.symmetry]
    if (!VariantClass) {
      throw new Error('Unknown symmetry type for ship letter: ' + this.letter)
    }
    return new VariantClass(this.boardSquare, this.validator, this.zoneDetail)
  }

  /**
   * Get number of available placement variants.
   * Total count depends on symmetry type.
   *
   * @returns {number} Total variant count for this shape's symmetry
   */
  numVariants () {
    return this.variants().numVariants()
  }

  /**
   * Get all placeable variant objects for this shape.
   * Each variant represents a unique placement configuration.
   *
   * @returns {Array<Object>} Placeable variant objects with placement methods
   */
  placeables () {
    return this.variants().placeables()
  }

  /**
   * Check if shape shrinks under given cell height.
   * Used for responsive display scaling at small cell sizes.
   *
   * @param {number} cellHeight - Cell height threshold in pixels
   * @returns {Object} Shrink information for display scaling
   */
  infoShrunkUnder (cellHeight) {
    return this.variants().shrunkUnder(cellHeight)
  }

  /**
   * Get ship type from terrain configuration.
   * Returns type code (e.g., 'G' for ground, 'S' for sea).
   *
   * @returns {string} Ship type code from terrain.ships.types
   */
  type () {
    return this.terrain.ships.types[this.letter]
  }

  /**
   * Get ship color from terrain configuration.
   * Used for ship display and UI rendering.
   *
   * @returns {string} Ship color value from terrain.ships.colors
   */
  color () {
    return this.terrain.ships.colors[this.letter]
  }

  /**
   * Get letter color scheme from terrain.
   * Provides color configuration for ship letter display.
   *
   * @returns {Object} Letter color configuration from terrain.ships.letterColors
   */
  letterColors () {
    return this.terrain.ships.letterColors[this.letter]
  }

  /**
   * Get ship description text.
   * Human-readable text describing the ship type.
   *
   * @returns {string} Ship description from terrain.ships.description
   */
  description () {
    return this.terrain.ships.description[this.letter]
  }

  /**
   * Get sunk ship description with optional separator.
   * Combines ship name with sunk status text.
   *
   * @param {string} [middle=' '] - Separator between ship name and status
   * @returns {string} Full sunk description text
   */
  sunkDescription (middle = ' ') {
    return this.description() + middle + this.shipSunkDescriptions()
  }

  /**
   * Get sunk status descriptions for ship type.
   * Returns status text appropriate for this ship's type.
   *
   * @returns {string} Sunk status text for this ship's type from terrain config
   */
  shipSunkDescriptions () {
    return this.terrain.ships.shipSunkDescriptions[this.type()]
  }
}
