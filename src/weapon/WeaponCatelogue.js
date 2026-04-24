import { standardShot } from './Weapon.js'

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
   * @param {Array<Object>} weapons - Array of weapon instances to catalog
   */
  constructor (weapons) {
    /**
     * Array of available weapon instances
     * @type {Array<Object>}
     * @private
     */
    this.weapons = weapons

    /**
     * Default weapon used when no other weapon available
     * Typically represents "standard shot" with no special effects
     * @type {Object}
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
    return this.weapons.map(weapon => weapon.tag)
  }

  /**
   * Gets all cursor graphics used across all weapons
   * Includes both targeting and launch cursors for complete UI set
   * Flattened to single array for easy iteration
   * @returns {Array<string>} Flattened array of unique cursor names
   */
  get cursors () {
    return this.weapons.flatMap(weapon => {
      const cursorList = [...weapon.cursors]
      if (weapon.launchCursor) {
        cursorList.push(weapon.launchCursor)
      }
      return cursorList
    })
  }

  /**
   * Gets weapon by single-character letter identifier
   * Useful for keyboard shortcuts and save files
   * @param {string} letter - Single character weapon identifier
   * @returns {Object|undefined} Matching weapon or undefined if not found
   */
  getWeaponByLetter (letter) {
    return this.weaponsByLetter?.[letter]
  }

  /**
   * Checks if catalogue contains weapon with given letter
   * @param {string} letter - Single character weapon identifier
   * @returns {boolean} True if weapon exists in catalogue
   */
  hasWeaponLetter (letter) {
    return letter in (this.weaponsByLetter || {})
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
   * @returns {Object|undefined} Weapon at index or undefined
   */
  getWeaponAt (index) {
    return this.weapons[index]
  }

  /**
   * Gets all weapons as array
   * Useful for iteration in UI or selection loops
   * @returns {Array<Object>} Copy of weapons array
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
   * Deprecated: Updates weapons in catalogue (use constructor instead)
   * @deprecated Create new WeaponCatalogue instance instead
   * @param {Array<Object>} weapons - New weapon collection
   * @returns {void}
   */
  addWeapons (weapons) {
    this.weapons = weapons
    this._indexWeaponsByLetter()
  }
}
