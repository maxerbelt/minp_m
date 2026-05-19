import { standardShot } from './Weapon.js'

/**
 * @typedef {Object} Weapon
 * @property {string} letter - Single-character identifier for the weapon
 * @property {string} [tag] - Weapon tag shown in UI and save data
 * @property {string[]} [cursors] - Cursor graphics for targeting steps
 * @property {string} [launchCursor] - Cursor graphic shown during launch
 * @property {string} [name] - Weapon display name
 * @property {string} [plural] - Pluralized weapon name
 * @property {string} [classname] - CSS class name for the weapon
 * @property {string} [tip] - Tooltip text for the weapon
 * @property {boolean} [hasFlash] - Whether the weapon shows a flash effect
 * @property {number} [totalCursors] - Total number of selection cursors
 * @property {boolean} [isLimited] - Whether the weapon has limited ammo
 * @property {boolean} [destroys] - Whether the weapon destroys targets
 * @property {number} [points] - Points awarded for a hit
 * @property {string} [buttonHtml] - Custom weapon button HTML
 * @property {string[]} [hints] - Hint text shown for weapon use
 * @property {boolean} [animateOnTarget] - Whether to animate on target
 * @property {boolean} [explodeOnTarget] - Whether to explode on target
 */

/**
 * @typedef {{ [letter: string]: Weapon }} WeaponByLetterMap
 */

// ============================================================================
// WeaponCatalogue - Weapon Collection Repository
// ============================================================================

/**
 * Repository for managing available weapons in a game terrain/variant
 * Provides centralized access to weapon collections and metadata
 * Caches weapon indices for efficient lookups
 */
export class WeaponCatelogue {
  /**
   * Initializes weapon catalogue with collection of weapon instances
   * Builds internal indices for efficient lookups
   * @param {Weapon[]} weapons - Array of weapon instances to catalog
   */
  constructor (weapons) {
    /**
     * Array of available weapon instances
     * @type {Weapon[]}
     * @private
     */
    this.weapons = Array.isArray(weapons) ? weapons : []

    /**
     * Lookup map for weapons by their letter identifier
     * @type {WeaponByLetterMap}
     * @private
     */
    this.weaponsByLetter = {}

    /**
     * Default weapon used when no other weapon available
     * Typically represents "standard shot" with no special effects
     * @type {Weapon}
     * @private
     */
    this.defaultWeapon = standardShot

    // Build internal indices for efficient lookups
    this._indexWeaponsByLetter()
  }

  /**
   * Gets weapon tags (identifiers) for all weapons in catalogue
   * Useful for UI rendering and weapon selection
   * @returns {Array<string>} Array of weapon tag strings
   */
  get tags () {
    return this.weapons
      .map(weapon => weapon.tag)
      .filter(tag => typeof tag === 'string')
  }

  /**
   * Gets all cursor graphics used across all weapons
   * Includes both targeting and launch cursors for complete UI set
   * Flattened to single array for easy iteration
   * @returns {Array<string>} Flattened array of unique cursor names
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
   * Useful for keyboard shortcuts and save files
   * @param {string} letter - Single character weapon identifier
   * @returns {Weapon|undefined} Matching weapon or undefined if not found
   */
  getWeaponByLetter (letter) {
    if (typeof letter !== 'string') {
      return undefined
    }

    return this.weaponsByLetter[letter]
  }

  /**
   * Checks if catalogue contains weapon with given letter
   * @param {string} letter - Single character weapon identifier
   * @returns {boolean} True if weapon exists in catalogue
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
   * @returns {number} Total number of weapons
   */
  get count () {
    return this.weapons.length
  }

  /**
   * Gets weapon at specified index
   * @param {number} index - Array index
   * @returns {Weapon|undefined} Weapon at index or undefined
   */
  getWeaponAt (index) {
    return this.weapons[index]
  }

  /**
   * Gets all weapons as array
   * Useful for iteration in UI or selection loops
   * @returns {Weapon[]} Copy of weapons array
   */
  getAllWeapons () {
    return [...this.weapons]
  }

  /**
   * Private: Builds letter-to-weapon index for O(1) lookups
   * Called during construction to cache weapon indices
   * @private
   * @returns {void}
   */
  _indexWeaponsByLetter () {
    this.weaponsByLetter = Object.fromEntries(
      this.weapons.map(weapon => [weapon.letter, weapon])
    )
  }

  /**
   * Updates weapons in catalogue.
   * @param {Weapon[]} weapons - New weapon collection
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
