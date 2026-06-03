import { standardShot } from './Weapon.js'

/**
 * @typedef {Object} Weapon
 * @property {string} tag - Unique weapon identifier/name for display and lookup
 * @property {string} letter - Single-character keyboard shortcut (A-Z), used for selection
 * @property {string[]} cursors - Array of cursor graphic names for targeting UI display
 * @property {string} [launchCursor] - Optional cursor graphic displayed during fire/launch phase
 * @property {*} [effect] - Optional special effect handler or behavior modifier
 * @property {number} [range] - Optional effective range in grid units (how far projectile travels)
 * @property {number} [damage] - Optional damage value dealt on impact
 * @property {string} [name] - Optional display name (defaults to tag if not provided)
 * @property {boolean} [isLimited] - Optional flag indicating finite ammunition (default false)
 * @property {boolean} [destroys] - Optional flag indicating weapon destroys terrain (default false)
 */

/**
 * @typedef {Object} WeaponCatalogueOptions
 * @property {Weapon[]} [weapons] - Array of weapon instances (defaults to empty array)
 * @property {Weapon} [defaultWeapon] - Fallback weapon when selection unavailable (defaults to standardShot)
 */

/**
 * @typedef {Record<string, Weapon>} WeaponByLetterMap
 * Lookup map for O(1) weapon retrieval by single-character identifier.
 * Keys are weapon letter codes (A-Z, case-sensitive), values are Weapon instances.
 * Built during initialization and updated when weapons collection changes.
 */

/**
 * Repository for managing available weapons in a game terrain/variant.
 *
 * Provides centralized access to weapon collections, metadata, and keyboard shortcuts.
 * Implements efficient O(1) letter-based lookups via cached indices for fast weapon selection.
 * Supports serialization for save/load operations and UI rendering.
 *
 * Key features:
 * - O(1) lookup by letter via cached weaponsByLetter map
 * - Automatic index maintenance when weapons added/updated
 * - Defensive copying to prevent external modification
 * - Type validation for robustness
 * - Default weapon fallback for invalid selections
 *
 * @class WeaponCatalogue
 * @example
 * const catalogue = new WeaponCatalogue([weaponA, weaponB, weaponC]);
 * const weapon = catalogue.getWeaponByLetter('A'); // O(1) lookup
 * const count = catalogue.count; // Get total weapons
 * const tags = catalogue.tags; // Get all weapon identifiers
 */
export class WeaponCatalogue {
  /**
   * Initializes weapon catalogue with collection of weapon instances.
   *
   * Creates a new weapon repository with automatic index caching for O(1) letter-based
   * lookups. Validates input and defensively handles non-array values by using
   * an empty array. Builds the weaponsByLetter cache immediately.
   *
   * @param {Weapon[]|undefined} weapons - Array of weapon instances to catalog
   *   (optional, defaults to empty array if not an array)
   * @throws {TypeError} Will not throw; silently uses empty array for invalid input
   *
   * @example
   * const catalogue = new WeaponCatalogue();
   * // Creates empty catalogue with standardShot as default
   *
   * @example
   * const catalogue = new WeaponCatalogue([weaponA, weaponB]);
   * // Creates catalogue with two weapons, indexed by their letter property
   */
  constructor (weapons) {
    /**
     * Array of available weapon instances in catalogue.
     *
     * Maintained in the order provided during construction or addWeapons().
     * Preserves order for consistent UI rendering and sequential access.
     * Can be accessed via getWeaponAt(index) or allWeapons getter.
     *
     * @type {Weapon[]}
     * @private
     * @access private
     */
    this.weapons = Array.isArray(weapons) ? weapons : []

    /**
     * Lookup map for weapons by their letter identifier.
     *
     * Built and cached during initialization for efficient O(1) lookups.
     * Maps single-character codes (weapon.letter) to weapon instances.
     * Keys are case-sensitive (e.g., 'A' and 'a' are different keys).
     * Rebuilt whenever weapons collection is updated via addWeapons().
     *
     * @type {WeaponByLetterMap}
     * @private
     * @access private
     */
    this.weaponsByLetter = {}

    /**
     * Default weapon used as fallback when no other weapon available.
     *
     * Typically represents "standard shot" with no special effects.
     * Used when:
     * - Selection is invalid or not found
     * - Catalogue is empty
     * - Weapon selection fails for any reason
     *
     * Can be overridden via direct assignment if needed.
     *
     * @type {Weapon}
     * @private
     * @access private
     */
    this.defaultWeapon = standardShot

    // Build internal indices for efficient lookups
    this._indexWeaponsByLetter()
  }

  /**
   * Gets weapon tags (identifiers) for all weapons in catalogue.
   *
   * Extracts and filters the tag property from each weapon instance.
   * Only includes valid string tags (filters out null/undefined tags).
   * Tags are unique identifiers used for display, selection, and serialization.
   *
   * Useful for:
   * - UI rendering (dropdown lists, menus)
   * - Weapon selection validation
   * - Save file serialization
   * - Configuration and reporting
   *
   * @returns {string[]} Array of weapon tag strings, filtered for validity
   * @access public
   *
   * @example
   * const tags = catalogue.tags;
   * // Returns: ['StandardShot', 'Missile', 'Laser', ...]
   */
  get tags () {
    return this.weapons
      .map(weapon => weapon.tag)
      .filter(tag => typeof tag === 'string')
  }

  /**
   * Gets all cursor graphics used across all weapons in the catalogue.
   *
   * Aggregates both targeting cursors and launch cursors from all weapons
   * into a single flattened array. Includes cursors from weapon.cursors array
   * plus optional weapon.launchCursor. Filters to include only valid strings.
   *
   * Useful for:
   * - Preloading cursor assets before gameplay
   * - UI resource management
   * - Asset inventory tracking
   * - Cursor configuration validation
   *
   * @returns {string[]} Flattened array of unique cursor graphic names
   * @access public
   *
   * @example
   * const cursors = catalogue.cursors;
   * // Returns: ['crosshair', 'targeting', 'fire', 'missile-lock', ...]
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
   * Gets weapon by single-character letter identifier.
   *
   * Performs O(1) lookup using cached weaponsByLetter index for fast retrieval.
   * Validates that input is a string before lookup (type-safe).
   * Returns undefined if letter is invalid type, empty, or not found in catalogue.
   *
   * Useful for:
   * - Keyboard shortcut handling (player presses 'A' → get weapon)
   * - Save/load file parsing
   * - Command-line weapon selection
   * - Weapon picker validation
   *
   * @param {string} letter - Single character weapon identifier (e.g., 'A', 'M')
   *   - Case-sensitive (e.g., 'a' and 'A' are different)
   *   - Should be non-empty string
   * @returns {Weapon|undefined} Matching weapon instance if found, undefined otherwise
   * @access public
   *
   * @example
   * const missile = catalogue.getWeaponByLetter('M');
   * if (!missile) console.log('Weapon not found');
   *
   * @example
   * const weapon = catalogue.getWeaponByLetter('invalid');
   * // Returns: undefined (multi-character string)
   */
  getWeaponByLetter (letter) {
    if (typeof letter !== 'string') {
      return undefined
    }

    return this.weaponsByLetter[letter]
  }

  /**
   * Checks if catalogue contains weapon with given letter identifier.
   *
   * Performs O(1) lookup using cached weaponsByLetter index.
   * Type-safe: validates string type and handles edge cases gracefully.
   * Returns false for non-string input, empty strings, or missing weapons.
   *
   * Useful for:
   * - Weapon availability validation before selection
   * - Command validation before execution
   * - Input validation in event handlers
   * - UI state management (enable/disable controls)
   *
   * @param {string} letter - Single character weapon identifier to check
   *   - Case-sensitive
   *   - Should be valid string type
   * @returns {boolean} True if weapon with letter exists, false if not found or invalid input
   * @access public
   *
   * @example
   * if (catalogue.hasWeaponLetter('M')) {
   *   const missile = catalogue.getWeaponByLetter('M');
   * }
   *
   * @example
   * catalogue.hasWeaponLetter('X'); // false (not in catalogue)
   * catalogue.hasWeaponLetter(5);   // false (not a string)
   * catalogue.hasWeaponLetter('');  // false (empty string)
   */
  hasWeaponLetter (letter) {
    return (
      typeof letter === 'string' &&
      this.weaponsByLetter &&
      letter in this.weaponsByLetter
    )
  }

  /**
   * Gets count of weapons in catalogue.
   *
   * Returns the total number of weapons available in this catalogue.
   * Constant-time O(1) operation reflecting weapons array length.
   * Returns 0 for empty catalogue.
   *
   * Useful for:
   * - UI validation (check if weapons available)
   * - Loop bounds (iterate over all weapons)
   * - State tracking (weapon inventory size)
   * - Empty catalogue detection
   *
   * @returns {number} Total number of weapons (0 or more)
   * @access public
   *
   * @example
   * if (catalogue.count === 0) {
   *   console.log('No weapons available');
   * }
   *
   * @example
   * for (let i = 0; i < catalogue.count; i++) {
   *   const weapon = catalogue.getWeaponAt(i);
   * }
   */
  get count () {
    return this.weapons.length
  }

  /**
   * Gets weapon at specified array index.
   *
   * Provides direct access to weapons by numerical position in the catalogue.
   * Returns undefined for out-of-bounds indices (negative, >= count).
   * Operates in O(1) constant time.
   *
   * Useful for:
   * - Sequential iteration over weapons
   * - Random weapon selection
   * - UI rendering (weapon list at specific position)
   * - Array-based access patterns
   *
   * @param {number} index - Zero-based array index (0 to count-1)
   *   - Negative indices return undefined (no Python-style wrapping)
   *   - Out-of-bounds indices return undefined
   * @returns {Weapon|undefined} Weapon at index if valid, undefined otherwise
   * @access public
   *
   * @example
   * const firstWeapon = catalogue.getWeaponAt(0);
   * const lastWeapon = catalogue.getWeaponAt(catalogue.count - 1);
   *
   * @example
   * catalogue.getWeaponAt(-1);             // undefined (negative index)
   * catalogue.getWeaponAt(999);            // undefined (out of bounds)
   * catalogue.getWeaponAt(catalogue.count); // undefined (out of bounds)
   */
  getWeaponAt (index) {
    return this.weapons[index]
  }

  /**
   * Gets all weapons as array.
   *
   * Returns a shallow copy of the weapons array to prevent external
   * modification of the internal catalogue state. The copy includes
   * references to the same weapon objects (not deep copy).
   *
   * Useful for:
   * - Safe iteration without modification risk
   * - UI rendering loops (weapons list, inventory)
   * - Serialization (getting full weapon set)
   * - Backup/snapshot operations
   *
   * @returns {Weapon[]} Shallow copy of weapons array (never null)
   * @access public
   *
   * @example
   * const weapons = catalogue.allWeapons;
   * weapons[0] = null; // Does NOT modify catalogue
   * console.log(catalogue.count); // Still same count
   *
   * @example
   * for (const weapon of catalogue.allWeapons) {
   *   console.log(weapon.tag); // Safe iteration
   * }
   */
  get allWeapons () {
    return [...this.weapons]
  }

  /**
   * Builds letter-to-weapon index for O(1) lookups (internal).
   *
   * Creates a weaponsByLetter cache mapping single-character letter codes
   * to weapon instances for fast retrieval. Called during initialization
   * and whenever weapons collection is updated.
   *
   * Performance: O(n) where n = number of weapons
   * - Iterates through all weapons once
   * - Creates entries in object literal
   *
   * Behavior:
   * - Overwrites previous index completely
   * - Silently skips weapons with missing/invalid letter property
   * - Duplicate letters will have last occurrence win (later weapon overwrites)
   * - Case-sensitive (treats 'A' and 'a' as different keys)
   *
   * @private
   * @access private
   * @returns {void} Mutates this.weaponsByLetter
   */
  _indexWeaponsByLetter () {
    this.weaponsByLetter = {}
    for (const weapon of this.weapons) {
      if (weapon && typeof weapon.letter === 'string') {
        this.weaponsByLetter[weapon.letter] = weapon
      }
    }
  }

  /**
   * Updates weapons in catalogue with new collection.
   *
   * Replaces all existing weapons with the provided collection and
   * automatically rebuilds the letter index for fast lookups.
   * Validates input is an array before applying changes (defensive programming).
   * Silently ignores non-array input to prevent accidental corruption.
   *
   * Important: Despite the name "add", this method REPLACES all weapons,
   * not appends. Use to set or update the entire weapon collection.
   *
   * Behavior:
   * - Validates input is Array type
   * - Returns without change if input is not an array
   * - Replaces entire weapons array (not additive)
   * - Rebuilds weaponsByLetter index automatically
   * - May orphan old weapon references if collection changed
   *
   * @param {Weapon[]|undefined} weapons - New weapon collection to set
   *   (should be an array; non-arrays silently ignored)
   * @returns {void} Updates internal state (mutates this.weapons and this.weaponsByLetter)
   * @access public
   *
   * @example
   * catalogue.addWeapons([newWeaponA, newWeaponB]);
   * // Old weapons replaced; new index built
   *
   * @example
   * catalogue.addWeapons(null); // Silently ignored
   * console.log(catalogue.count); // Unchanged
   *
   * @example
   * catalogue.addWeapons('invalid'); // Silently ignored (not an array)
   */
  addWeapons (weapons) {
    if (!Array.isArray(weapons)) {
      return
    }

    this.weapons = weapons
    this._indexWeaponsByLetter()
  }
}
