/**
 * @file Shape.js - Ship shape definition and variant generation system
 * @description Core Shape class managing ship geometry, weapon systems, damage properties,
 * and variant placement generation. Handles multi-format rack coordinate parsing, damage
 * protection levels (vulnerable/hardened/immune), and delegation to terrain-specific
 * variant factories for placement generation. Supports various symmetry types: Asymmetric,
 * Orbit4F, Invariant, Orbit4R, Blinker, and Diagonal.
 */

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
 * Coordinate pair representing grid position
 * @typedef {[number, number]} CoordinatePair
 * @property {number} 0 - Row index (0-based)
 * @property {number} 1 - Column index (0-based)
 */

/**
 * Weapon rack position input in various formats
 *
 * Flexible input format accepting multiple representations of rack coordinates:
 * - **Set<string>**: Set of "r,c" coordinate string keys (compact representation)
 * - **Array<string>**: Array of "r,c" coordinate string keys
 * - **Array<Array<number>>**: Array of [row, col] numeric coordinate pairs
 * - **null**: No racks available (immutable once set in constructor)
 *
 * @typedef {Set<string>|Array<string|Array<number>>|null} RackInput
 * @example
 * new Shape('A', 'D', cells, 'Cruisers', tip, new Set(['0,1', '1,0']))
 * new Shape('B', 'S', cells, 'Destroyers', tip, ['0,1', '1,0'])
 * new Shape('C', 'H', cells, 'Carriers', tip, [[0,1], [1,0]])
 */

/**
 * Weapons indexed by coordinate key
 * Maps "r,c" coordinate strings to WeaponSystem instances
 * @typedef {Object<string, WeaponSystem>} WeaponMap
 * @example
 * {
 *   '0,1': WeaponSystem { weapon: Missile, ... },
 *   '1,0': WeaponSystem { weapon: Laser, ... }
 * }
 */

/**
 * Subterrain type for shape validation
 * Represents a specific terrain type (water, asteroid, land, etc.)
 * Used to determine valid placement terrains for ships
 * @typedef {Object} SubTerrain
 * @property {string} name - Terrain name identifier
 * @property {Object} terrain - Parent terrain configuration
 */

/**
 * Factory function for creating ammunition payload at weapon racks
 * Called once per rack position to generate ammunition for that weapon
 * @callback AmmoBuilder
 * @returns {any} Ammunition payload for weapon at rack position
 * @example
 * const ammo = () => ({ rounds: 10, type: 'explosive' })
 */

/**
 * Variant factory for generating ship placement variants
 * Encapsulates variant generation logic for a specific symmetry type.
 * Caches boards and provides lazy evaluation of placement options.
 * @typedef {Object} VariantFactory
 * @property {(variantIndex: number) => Mask} boardFor - Get board mask for variant index
 * @property {() => number} numVariants - Get total number of available variants
 * @property {() => Array<Object>} placeables - Get all placeable variant objects
 * @property {(cellHeight: number) => any} shrunkUnder - Get shrink information for cell height
 */

export const token = 'geoffs-hidden-battle'

/**
 * Ship shape definition with geometry, variants, and weapon systems
 *
 * Manages core ship properties including placement geometry, damage profile (vulnerable/hardened/immune),
 * weapon attachment points, and variant generation. Shape acts as a template that can be instantiated
 * into actual Ship objects on game boards.
 *
 * **Key Responsibilities:**
 * - Store ship geometry (cells, board mask, footprint)
 * - Manage weapon attachment racks and constraint validation
 * - Track damage properties (vulnerability, hardening, immunity)
 * - Delegate variant generation to terrain-specific factories
 * - Support flexible rack coordinate input formats
 *
 * **Variant Generation:** Creates variant placement options using symmetry-specific factories:
 * - D (Asymmetric): No symmetry, all rotations/reflections
 * - A (Orbit4F): 4-fold rotation symmetry
 * - S (Invariant): Single unchanging variant
 * - H (Orbit4R): 4-fold rotation with reflection
 * - L (Blinker): Alternating placement patterns
 * - G (Diagonal): Diagonal symmetry
 *
 * @class Shape
 * @example
 * const shape = new Shape(
 *   'A',                          // letter
 *   'D',                          // symmetry (Asymmetric)
 *   [[0,0], [0,1], [1,0]],       // cells
 *   'Cruisers',                   // tally group
 *   { text: 'Placement tip' },    // tip
 *   new Set(['0,1', '1,0'])       // racks
 * )
 */
export class Shape {
  /**
   * Map of symmetry type codes to variant constructor classes
   *
   * Maps single-character symmetry codes to their corresponding variant factory classes.
   * Each factory generates unique placement variants based on symmetry properties.
   *
   * @static
   * @type {Object<string, Function>}
   * @property {Function} D - Asymmetric variant factory (no symmetry)
   * @property {Function} A - Orbit4F factory (4-fold rotational symmetry)
   * @property {Function} S - Invariant factory (single fixed variant)
   * @property {Function} H - Orbit4R factory (4-fold rotation with reflection)
   * @property {Function} L - Blinker factory (alternating patterns)
   * @property {Function} G - Diagonal factory (diagonal symmetry)
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
   * Creates a ship shape with specified properties and variant generation
   *
   * Initializes a ship shape template with geometry, weapon racks, and variant generation.
   * Normalizes rack coordinates from flexible input formats and prepares board representation.
   * Establishes terrain and damage properties for terrain validation and damage calculations.
   *
   * **Initialization Steps:**
   * 1. Store basic ship properties (letter, symmetry)
   * 2. Create board mask from cell coordinates
   * 3. Normalize and validate rack coordinates from flexible inputs
   * 4. Build rack position mask for weapon attachment
   * 5. Calculate ship displacement from area and footprint
   * 6. Initialize damage property arrays (vulnerable, hardened, immune)
   *
   * @constructor
   * @param {string} letter - Single character ship identifier (A-Z, e.g., 'A', 'B', 'C')
   * @param {string} symmetry - Symmetry type code for variant generation:
   *   - 'D' = Asymmetric (all rotations/reflections)
   *   - 'A' = Orbit4F (4-fold rotational symmetry)
   *   - 'S' = Invariant (single fixed variant)
   *   - 'H' = Orbit4R (4-fold rotation with reflection)
   *   - 'L' = Blinker (alternating placement patterns)
   *   - 'G' = Diagonal (diagonal symmetry)
   * @param {CoordinatePair[]} cells - Array of [row, col] coordinates defining ship occupancy
   * @param {string} tallyGroup - Grouping identifier for tally point calculations (e.g., 'Cruisers', 'Destroyers')
   * @param {Object} tip - UI tip/styling information for placement display (typically contains text and styling)
   * @param {RackInput} [racks] - Weapon attachment racks in flexible format:
   *   - Set<string>: Set of "r,c" coordinate keys
   *   - Array<string>: Array of "r,c" keys
   *   - Array<Array<number>>: Array of [r, c] pairs
   *   - null: No weapon racks available (immutable)
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
   * Weapons attached to this shape's racks
   *
   * Contains WeaponSystem instances mapped by rack coordinate keys ("r,c" format).
   * Only populated after attachWeapon() is called with an ammoBuilder factory.
   * Remains empty until explicit weapon attachment occurs.
   *
   * @readonly
   * @returns {WeaponMap} Attached weapons indexed by "r,c" coordinate keys
   *   Returns empty object {} if no weapons attached
   */
  get attachedWeapons () {
    return this._attachedWeapons || {}
  }

  /**
   * Set weapons attached to shape's racks
   *
   * Typically called internally by attachWeapon() method rather than directly.
   *
   * @param {WeaponMap} weapons - Weapons object indexed by coordinate keys ("r,c" format)
   */
  set attachedWeapons (weapons) {
    this._attachedWeapons = weapons
  }

  /**
   * Tip/styling information for this shape
   *
   * Contains UI hint text and styling configuration for ship placement interface.
   * Typically includes placement instructions or strategic information.
   *
   * @readonly
   * @returns {Object} Tip configuration with text and styling properties
   */
  get tip () {
    return this._tip
  }

  /**
   * Set tip/styling information
   *
   * Updates UI hint text and styling for placement display.
   *
   * @param {Object} newTip - New tip configuration object
   */
  set tip (newTip) {
    this._tip = newTip
  }

  /**
   * Shape displacement (calculated from area and footprint)
   *
   * Represents the effective "weight" or "volume" of the ship for game mechanics.
   * Calculated as average of cell area and footprint (including dilation).
   * Formula: (area + footPrint) / 2
   *
   * @readonly
   * @returns {number} Displacement value (always calculated, never stored)
   */
  get displacement () {
    return (this.area + this.footPrint) / 2
  }

  /**
   * Setting displacement is not allowed (read-only calculated property)
   *
   * Displacement is automatically calculated from area and footprint.
   * To change displacement, modify the ship's cell coordinates instead.
   *
   * @param {number} _newDisplacement - Ignored parameter
   * @throws {Error} Always throws - displacement is read-only and calculated
   */
  set displacement (_newDisplacement) {
    throw new Error(
      'Displacement cannot be set directly. It is calculated from area and footprint.'
    )
  }

  /**
   * Weapon types this ship is vulnerable to
   *
   * Array of weapon codes for which this ship takes extra damage.
   * Checked in protectionAgainst() to return protection level 0.
   * Lazily initialized as empty array on first access.
   *
   * @readonly
   * @returns {Array<string>} Weapon codes causing extra damage to this ship
   */
  get vulnerable () {
    return this._getOrInitArrayProperty('_vulnerable')
  }

  /**
   * Set weapon vulnerability profile
   * @param {Array<string>} newVulnerable - Weapon codes for vulnerability
   */
  set vulnerable (newVulnerable) {
    this._vulnerable = newVulnerable
  }

  /**
   * Weapon types this ship is hardened against
   *
   * Array of weapon codes for which this ship takes reduced damage.
   * Checked in protectionAgainst() to return protection level 2.
   * Lazily initialized as empty array on first access.
   *
   * @readonly
   * @returns {Array<string>} Weapon codes dealing reduced damage to this ship
   */
  get hardened () {
    return this._getOrInitArrayProperty('_hardened')
  }

  /**
   * Set weapon hardening profile
   * @param {Array<string>} newHardened - Weapon codes for hardening
   */
  set hardened (newHardened) {
    this._hardened = newHardened
  }

  /**
   * Weapon types this ship is immune to
   *
   * Array of weapon codes for which this ship takes no damage.
   * Checked first in protectionAgainst() to return protection level 3.
   * Lazily initialized as empty array on first access.
   *
   * @readonly
   * @returns {Array<string>} Weapon codes dealing no damage to this ship
   */
  get immune () {
    return this._getOrInitArrayProperty('_immune')
  }

  /**
   * Set weapon immunity profile
   * @param {Array<string>} newImmune - Weapon codes for immunity
   */
  set immune (newImmune) {
    this._immune = newImmune
  }

  /**
   * Get or initialize a named array property with lazy initialization
   *
   * Returns existing array or creates and caches a new empty array.
   * Used for damage profiles (vulnerable, hardened, immune) to support
   * lazy initialization pattern and reduce memory for unused properties.
   *
   * @private
   * @param {string} property - Internal property name (e.g., '_vulnerable', '_hardened', '_immune')
   * @returns {Array<string>} Array value stored in property, auto-initialized if undefined
   */
  _getOrInitArrayProperty (property) {
    if (this[property]) return this[property]
    this[property] = []
    return this[property]
  }

  /**
   * Parse a rack coordinate value into a standard [row, col] pair
   *
   * Handles multiple input formats for rack coordinates:
   * - String "r,c" format (parsed via parsePair utility)
   * - Array format [r, c] with at least 2 elements (first 2 extracted)
   * - Invalid formats return [NaN, NaN] for filtering
   *
   * @private
   * @param {string|CoordinatePair|any} value - Coordinate in various formats
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
   * Normalize rack coordinates from various input formats to standard pairs
   *
   * Processes all rack input types (Set, Array, or null) into validated coordinate pairs.
   * Pipeline: input validation → array conversion → parsing → NaN filtering
   *
   * @private
   * @param {RackInput} racks - Rack coordinates in flexible format
   * @returns {CoordinatePair[]} Array of valid [row, col] coordinate pairs only
   */
  _normalizeRackCoordinates (racks) {
    if (!this._hasValidRackInput(racks)) return []

    return Zip.toArray(racks)
      .map(v => this._parseRackCoordinate(v))
      .filter(this._isFiniteCoordinate)
  }

  /**
   * Check if rack input contains at least one coordinate
   *
   * Validates that racks container exists and is not empty.
   * Handles Set, Array, and null input types.
   *
   * @private
   * @param {RackInput} racks - Rack input container (Set<string>, Array, or null)
   * @returns {boolean} True if racks exists and has at least one coordinate
   */
  _hasValidRackInput (racks) {
    if (!racks) return false
    if (racks instanceof Set) return racks.size > 0
    return Array.isArray(racks) && racks.length > 0
  }

  /**
   * Validate that coordinate pair has finite numeric values
   *
   * Used in filter pipeline to exclude invalid/NaN coordinates.
   * Both row and column must be finite numbers.
   *
   * @private
   * @param {CoordinatePair} coord - Coordinate pair [row, col] to validate
   * @returns {boolean} True if both row and column are finite numbers
   */
  _isFiniteCoordinate ([r, c]) {
    return Number.isFinite(r) && Number.isFinite(c)
  }

  /**
   * Build Set of coordinate keys from rack positions mask
   *
   * Converts rackPositions mask occupancy into a Set of "r,c" coordinate keys.
   * Used when original rack input was not a Set (recovers Set format for racks getter).
   *
   * @private
   * @returns {Set<string>} Set of "r,c" coordinate string keys
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
   * Board mask defining shape occupancy
   *
   * Returns cached board mask or generates from variant index 1.
   * Represents which cells are occupied by this ship shape.
   *
   * @readonly
   * @returns {Mask} Occupancy mask representing ship shape (never null/undefined)
   */
  get board () {
    return this._board || this.boardFor(1) || Mask.empty(0, 0)
  }

  /**
   * Set board mask and update cached size
   *
   * Updates the cached board representation and recalculates ship size.
   *
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
   * Original cell coordinates defining ship shape
   *
   * Returns immutable reference to the cell array passed to constructor.
   * Use this to access raw coordinate data for serialization or validation.
   *
   * @readonly
   * @returns {CoordinatePair[]} Array of [row, col] coordinate pairs (immutable)
   */
  get cells () {
    return this._originalCells
  }

  /**
   * Set cell coordinates and update board representation
   *
   * Updates both cell storage and board mask for complete geometry update.
   * Triggers board recalculation from new coordinates.
   *
   * @param {CoordinatePair[]} cells - New cell coordinates
   */
  set cells (cells) {
    this._originalCells = cells
    this.board = Mask.fromCoordsSquare(cells)
  }

  /**
   * Weapon rack positions as coordinate key set
   *
   * Returns Set of "r,c" coordinate keys for available weapon attachment points.
   * Returns null if no racks were provided to constructor (immutable once set).
   *
   * @readonly
   * @returns {Set<string>|null} Set of "r,c" coordinate keys, or null if no racks
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
   * Get protection level against a specific weapon type
   *
   * Determines damage mitigation based on damage profile arrays.
   * Checks in priority order: Immune → Hardened → Vulnerable → Normal
   *
   * **Protection Levels:**
   * - 3 = Immune: No damage taken
   * - 2 = Hardened: Reduced damage taken
   * - 1 = Normal: Standard damage taken
   * - 0 = Vulnerable: Extra damage taken
   *
   * @param {string} weapon - Weapon type code to check protection against
   * @returns {number} Protection level:
   *   - 0 = Vulnerable (extra damage),
   *   - 1 = Normal (standard damage),
   *   - 2 = Hardened (reduced damage),
   *   - 3 = Immune (no damage)
   */
  protectionAgainst (weapon) {
    if (this.immune.includes(weapon)) return 3
    if (this.hardened.includes(weapon)) return 2
    if (this.vulnerable.includes(weapon)) return 0
    return 1
  }

  /**
   * Attach weapons to all rack positions on this shape
   *
   * Creates weapon systems at each rack coordinate using the provided factory function.
   * Pipeline validates racks exist, no weapons already attached, then builds WeaponMap.
   *
   * **Constraints:**
   * - Can only be called once per shape (enforced by isAttachedToRack flag)
   * - Shape must have racks (canAttachWeapons must be true)
   * - ammoBuilder called once per rack coordinate
   *
   * @param {AmmoBuilder} ammoBuilder
   *   Factory function called once per rack to create ammunition payload
   * @returns {WeaponMap} Attached weapons indexed by "r,c" coordinate keys
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
   * Verify shape has weapon racks available
   *
   * Internal validation ensuring weapon attachment is possible.
   *
   * @private
   * @throws {Error} If shape has no valid racks for weapon attachment
   */
  _assertCanAttachWeapons () {
    if (!this.canAttachWeapons) {
      throw new Error('Cannot attach weapon to shape ' + this.letter)
    }
  }

  /**
   * Verify weapon not already attached to this shape
   *
   * Ensures attachWeapon() called at most once per shape instance.
   * Prevents duplicate/conflicting weapon attachments.
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
   * Build weapon objects at all rack positions
   *
   * Iterates through rack coordinates and calls ammoBuilder factory
   * once per position to create weapons map.
   *
   * @private
   * @param {AmmoBuilder} ammoBuilder - Factory function creating ammunition for each rack
   * @returns {WeaponMap} Weapons indexed by "r,c" coordinate keys
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
