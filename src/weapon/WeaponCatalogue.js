import { standardShot } from './Weapon.js'

/**
 * @typedef {Object} Weapon
 * @property {string} tag - Unique weapon identifier/name
 * @property {string} letter - Single-character keyboard shortcut identifier
 * @property {string[]} cursors - Array of cursor graphics for targeting
 * @property {string} [launchCursor] - Optional cursor graphic for launch/fire action
 * @property {*} [effect] - Optional special effect or behavior
 * @property {number} [range] - Optional effective range in grid units
 * @property {number} [damage] - Optional damage value
 */

/**
 * @typedef {Record<string, Weapon>} WeaponByLetterMap
 * Lookup map for O(1) weapon retrieval by single-character identifier
 * Keys are weapon letter codes, values are Weapon instances
 */

/**
 * Repository for managing available weapons in a game terrain/variant
 * Provides centralized access to weapon collections and metadata
 * Caches weapon indices for efficient lookups via letter identifier
 * Supports keyboard shortcuts and save/load serialization
 *
 * @class WeaponCatalogue
 */
export class WeaponCatalogue {
  /**
   * Initializes weapon catalogue with collection of weapon instances
   * Builds internal indices for efficient O(1) letter lookups
   * Validates input and defaults to empty array if not array type
   *
   * @param {Weapon[]} weapons - Array of weapon instances to catalog
   */
  constructor (weapons) {
    /**
     * Array of available weapon instances
     * Maintained in order for consistent indexing
     *
     * @type {Weapon[]}
     * @private
     */
    this.weapons = Array.isArray(weapons) ? weapons : []

    /**
     * Lookup map for weapons by their letter identifier
     * Built and cached for efficient O(1) lookups
     * Maps single-character codes to weapon instances
     *
     * @type {WeaponByLetterMap}
     * @private
     */
    this.weaponsByLetter = {}

    /**
     * Default weapon used when no other weapon available
     * Typically represents "standard shot" with no special effects
     * Used as fallback when selection is invalid or unavailable
     *
     * @type {Weapon}
     * @private
     */
    this.defaultWeapon = standardShot

    // Build internal indices for efficient lookups
    this._indexWeaponsByLetter()
  }

  /**
   * Gets weapon tags (identifiers) for all weapons in catalogue
   * Filters to include only valid string tags
   * Useful for UI rendering and weapon selection dropdowns
   *
   * @returns {string[]} Array of weapon tag strings
   */
  get tags () {
    return this.weapons
      .map(weapon => weapon.tag)
      .filter(tag => typeof tag === 'string')
  }

  /**
   * Gets all cursor graphics used across all weapons
   * Includes both targeting cursors and launch cursors for complete UI set
   * Flattened to single array for easy iteration and preloading
   * Filters to include only valid string cursor names
   *
   * @returns {string[]} Flattened array of cursor graphic names
   */
  get cursors () {
    return this.weapons.flatMap(weapon => {
      const cursorList = Array.isArray(weapon.cursors)
        ? weapon.cursors.filter(cursor => typeof cursor === 'string')
        : []
      if (typeof weapon.launchCursor === 'string' && weapon.launchCursor) {
        cursorList.push(weapon.launchCursor)
      }
      return cursorList
    })
  }

  /**
   * Gets weapon by single-character letter identifier
   * Uses cached index for O(1) lookup performance
   * Useful for keyboard shortcuts, save files, and command parsing
   * Returns undefined for invalid input or missing weapons
   *
   * @param {string} letter - Single character weapon identifier (e.g., 'A', 'M')
   * @returns {Weapon|undefined} Matching weapon instance or undefined if not found
   */
  getWeaponByLetter (letter) {
    if (typeof letter !== 'string') {
      return undefined
    }

    return this.weaponsByLetter[letter]
  }

  /**
   * Checks if catalogue contains weapon with given letter
   * Efficient check for weapon existence using cached index
   * Safe to use with any input type (validates string type)
   *
   * @param {string} letter - Single character weapon identifier to check
   * @returns {boolean} True if weapon with letter exists in catalogue, false otherwise
   */
  hasWeaponLetter (letter) {
    return (
      typeof letter === 'string' &&
      this.weaponsByLetter &&
      letter in this.weaponsByLetter
    )
  }

  /**
   * Gets count of weapons in catalogue
   * Constant-time operation reflecting weapons array length
   *
   * @returns {number} Total number of weapons in catalogue
   */
  get count () {
    return this.weapons.length
  }

  /**
   * Gets weapon at specified array index
   * Returns undefined for out-of-bounds indices
   * Useful for iteration and random selection
   *
   * @param {number} index - Zero-based array index (0 to count-1)
   * @returns {Weapon|undefined} Weapon at index or undefined if index out of bounds
   */
  getWeaponAt (index) {
    return this.weapons[index]
  }

  /**
   * Gets all weapons as array
   * Returns a shallow copy to prevent external modification
   * Useful for iteration in UI rendering or selection loops
   *
   * @returns {Weapon[]} Shallow copy of weapons array
   */
  getAllWeapons () {
    return [...this.weapons]
  }

  /**
   * Builds letter-to-weapon index for O(1) lookups
   * Called during construction and after weapons update
   * Creates efficient cache mapping letter codes to weapon instances
   * Overwrites previous index completely
   *
   * @private
   * @returns {void}
   */
  _indexWeaponsByLetter () {
    this.weaponsByLetter = Object.fromEntries(
      this.weapons.map(weapon => [weapon.letter, weapon])
    )
  }

  /**
   * Updates weapons in catalogue with new collection
   * Replaces all existing weapons and rebuilds index cache
   * Validates input is array before applying update
   * Silently ignores non-array input for defensive programming
   *
   * @param {Weapon[]} weapons - New weapon collection to set
   * @returns {void}
   */
  addWeapons (weapons) {
    if (!Array.isArray(weapons)) {
      return
    }

    this.weapons = weapons
    this._indexWeaponsByLetter()
  }
}
