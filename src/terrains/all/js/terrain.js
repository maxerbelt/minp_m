/**
 * @fileoverview Terrain Configuration Module
 *
 * Provides core terrain management with support for multiple subterrains, ship/weapon catalogues,
 * custom map storage, and terrain-specific customizations. Terrains represent distinct game
 * environments (e.g., Sea and Land, Space) with their own rules, units, and visual properties.
 *
 * @module terrains/all/js/terrain
 */

import { SubTerrainBase } from './SubTerrainBase.js'
import { bh } from './bh.js'
import { BhConstants } from './constants.js'

const {
  MIN_CUSTOM_WIDTH,
  MAX_CUSTOM_WIDTH,
  MIN_CUSTOM_HEIGHT,
  MAX_CUSTOM_HEIGHT
} = BhConstants

/**
 * @typedef {import('./SubTerrainBase.js').SubTerrainBase} SubTerrain
 * @description A distinct terrain environment (water, land, space, etc.) within a terrain
 */

/**
 * @typedef {import('../../../weapon/WeaponCatelogue.js').Weapon} Weapon
 * @description Single weapon configuration with letter, name, ammo, and damage properties
 */

/**
 * @typedef {import('../../../weapon/WeaponCatelogue.js').WeaponCatalogue} WeaponCatalogue
 * @description Container for all weapons with lookup and indexing methods
 */

/**
 * @typedef {import('../../../ships/ShipGroups.js').ShipCatalogue|null} TerrainShipCatalogue
 * @description Ship definitions and catalogues for a terrain (or null if not available)
 */

/**
 * @typedef {Record<string, string|URL>} TerrainSoundConfig
 * @description Sound effect configuration mapping (e.g., { hit: "sound.mp3", miss: "miss.mp3" })
 */

/**
 * @typedef {(letter: string, middle: string) => string} SunkDescriptionFn
 * @description Function that generates sunk ship descriptions
 */

/**
 * @typedef {(shapes: unknown) => void} AddShapesFn
 * @description Function that adds ship shapes to a catalogue
 */

/**
 * @typedef {(weapons: unknown) => void} AddWeaponsFn
 * @description Function that adds weapons to a catalogue
 */

/**
 * @typedef {(letter: string, description: string, el: HTMLElement, key: string) => string | null} TextContentRenderer
 * @description Renders unit text content. Returns string to set, or null to skip
 */

/**
 * @typedef {(letter: string, description: string, el: HTMLElement, key: string) => string} InnerHTMLRenderer
 * @description Renders unit inner HTML content
 */

/**
 * @typedef {(letter: string, description: string, el: HTMLElement, key: string, className: string) => boolean} ClassPredicate
 * @description Predicate function determining if CSS class should be applied to unit element
 */

/**
 * @typedef {Object} CustomMap
 * @property {string} title - The custom map's display title
 * @description A custom map configuration with a title property
 */

/**
 * Represents a terrain with ships, subterrains, and custom maps management.
 *
 * The Terrain class serves as the central configuration object for a game terrain,
 * managing:
 * - Ship definitions and catalogues for the terrain
 * - Subterrains (different map types like water, land, space)
 * - Weapon definitions and lookup
 * - Custom map storage and retrieval
 * - Sound effects configuration
 * - Dimensional constraints for custom maps
 *
 * Each terrain has a set of subterrains, where one is designated as the default and
 * another as the "land" subterrain. The terrain tracks whether it has transforms
 * and manages weapon/ship attachments to map elements.
 *
 * @class Terrain
 * @see SubTerrainBase for subterrain structure
 * @see WeaponCatalogue for weapon management
 * @see ShipCatalogue for ship management
 */
export class Terrain {
  /**
   * Creates a new Terrain instance.
   *
   * Initializes all terrain properties including ship/weapon catalogues, subterrains,
   * storage configuration, and dimensional constraints. The terrain derives a unique key
   * from its title (lowercased, spaces replaced with hyphens) for localStorage operations.
   *
   * Sets up default sizing constraints for custom maps and establishes which subterrain
   * is the default and which represents land.
   *
   * @param {string} title - The display title of the terrain (e.g., "Sea and Land", "Space")
   * @param {TerrainShipCatalogue} shipCatalogue - The ship catalogue for this terrain (or null)
   * @param {SubTerrain[]} subterrains - Array of subterrain definitions. Must have at least 1.
   *   - First or marked subterrain becomes default
   *   - First marked as land becomes land subterrain
   * @param {string} tag - The internal tag for this terrain (used for body class, etc.)
   * @param {string} [mapHeading='Waters'] - The heading displayed for maps section
   * @param {string} [fleetHeading='Fleet'] - The heading displayed for fleet section
   * @param {TerrainSoundConfig} [sounds={}] - Sound effects configuration (URL mappings)
   *
   * @throws {Error} If subterrains array is empty
   * @public
   * @example
   * const terrain = new Terrain(
   *   "Sea and Land",
   *   shipCatalogue,
   *   [waterSubterrain, landSubterrain],
   *   "sea-land",
   *   "Waters",
   *   "Fleet",
   *   { hit: new URL("hit.mp3"), miss: new URL("miss.mp3") }
   * )
   */
  constructor (
    title,
    shipCatalogue,
    subterrains,
    tag,
    mapHeading,
    fleetHeading,
    sounds = {}
  ) {
    /** @type {string} */
    this.title = title || 'Unknown'
    /** @type {string} */
    this.key = title.toLowerCase().replaceAll(/\s+/g, '-')
    /** @type {TerrainShipCatalogue} */
    this.ships = shipCatalogue
    /** @type {WeaponCatalogue|null} */
    this.weapons = null //weaponsCatalogue
    /** @type {TerrainSoundConfig} */
    this.sounds = sounds
    /** @type {boolean} */
    this.hasTransforms = false
    /** @type {number} */
    this.minWidth = MIN_CUSTOM_WIDTH
    /** @type {number} */
    this.maxWidth = MAX_CUSTOM_WIDTH
    /** @type {number} */
    this.minHeight = MIN_CUSTOM_HEIGHT
    /** @type {number} */
    this.maxHeight = MAX_CUSTOM_HEIGHT
    /** @type {SubTerrain[]} */
    this.subterrains = subterrains
    /** @type {Object[]} */
    this.zones = subterrains.flatMap(s => s.zones)
    /** @type {SubTerrain} */
    this.defaultSubterrain =
      subterrains.find(s => s.isDefault) || subterrains[0]
    /** @type {SubTerrain} */
    this.landSubterrain = subterrains.find(s => s.isTheLand) || subterrains[1]
    /** @type {string} */
    this.tag = tag
    /** @type {string} */
    this.mapHeading = mapHeading || 'Waters'
    /** @type {string} */
    this.fleetHeading = fleetHeading || 'Fleet'
    /** @type {string} */
    this.bodyTag = this.defaultSubterrain.tag
    /** @type {boolean} */
    this.hasUnattachedWeapons = true
    /** @type {boolean} */
    this.hasAttachedWeapons = false
  }

  /**
   * Customizes unit descriptions for a given element tag.
   * Applies text content and/or HTML customization to all unit elements with the given tag.
   *
   * @param {string} elementTag - The element tag to customize
   * @param {TextContentRenderer} [textContent] - Function to set text content. Called with (letter, description, el, key)
   * @param {InnerHTMLRenderer} [innerHTML] - Function to set inner HTML. Called with (letter, description, el, key)
   *
   * @returns {void}
   * @static
   * @public
   * @example
   * Terrain.customizeUnitDescriptions('ship',
   *   (letter, description, el, key) => `Custom: ${description}`,
   *   (letter, description, el, key) => `<span>${letter}</span>`
   * )
   */
  static customizeUnitDescriptions (elementTag, textContent, innerHTML) {
    bh.customizeUnits(
      elementTag,
      (
        /** @type {string} */ letter,
        /** @type {string} */ description,
        /** @type {HTMLElement} */ el,
        /** @type {string} */ key
      ) => {
        if (typeof textContent === 'function') {
          el.textContent = textContent(letter, description, el, key)
        }
        if (typeof innerHTML === 'function') {
          el.innerHTML = innerHTML(letter, description, el, key)
        }
      }
    )
  }

  /**
   * Shows or hides units based on a condition.
   * Applies a CSS class to units based on whether a predicate function returns true.
   *
   * @param {string} elementTag - The element tag to process
   * @param {ClassPredicate} [hasClass] - Function to determine if class should be added. Called with (letter, description, el, key, className)
   * @param {string} [className='hidden'] - The class name to toggle
   *
   * @returns {void}
   * @static
   * @public
   * @example
   * Terrain.showsUnits('ship',
   *   (letter, description, el, key, className) => letter === 'A',
   *   'hidden'
   * )
   */
  static showsUnits (elementTag, hasClass, className = 'hidden') {
    bh.customizeUnits(
      elementTag,
      (
        /** @type {string} */ letter,
        /** @type {string} */ description,
        /** @type {HTMLElement} */ el,
        /** @type {string} */ key
      ) => {
        if (typeof hasClass === 'function') {
          if (hasClass(letter, description, el, key, className)) {
            el.classList.remove(className)
          } else {
            el.classList.add(className)
          }
        }
      }
    )
  }

  /**
   * Gets a new fleet for the terrain.
   *
   * Creates a fresh fleet instance using the terrain's base ship shapes. Typically called
   * at game initialization to set up a player's starting fleet. The fleet is built from
   * the ship catalogue's base shapes which are specific to this terrain.
   *
   * @type {*}
   * @throws {Error} If ships catalogue is null or lacks baseShapes property
   *
   * @public
   * @example
   * const playerFleet = terrain.newFleetForTerrain
   * console.log('Fleet created with', playerFleet.ships.length, 'ships')
   *
   * @remarks
   * - Pure getter: No side effects, creates new fleet each time
   * - Fleet composition varies by terrain (sea vs space vs air)
   * - Requires ships catalogue to be initialized
   */
  get newFleetForTerrain () {
    return bh.fleetBuilder(this.ships?.baseShapes || [])
  }

  /**
   * Gets the subterrain tag based on land status.
   *
   * Returns either the land subterrain's tag or the default subterrain's tag
   * depending on the isLand parameter. Used for UI rendering, CSS class selection,
   * and terrain-specific behavior branching.
   *
   * @param {boolean} isLand - Whether to return land subterrain tag (true) or default (false)
   * @returns {string} The corresponding subterrain tag (e.g., "water", "land", "space")
   *
   * @public
   * @example
   * const waterTag = terrain.subterrainTag(false) // e.g., "water"
   * const landTag = terrain.subterrainTag(true)   // e.g., "land"
   * document.body.className = terrain.subterrainTag(isLand)
   *
   * @remarks
   * - Pure function: No side effects
   * - Tags are used for CSS body class and terrain-specific styling
   * - Always returns a non-empty string from initialized subterrains
   */
  subterrainTag (isLand) {
    return isLand ? this.landSubterrain.tag : this.defaultSubterrain.tag
  }

  /**
   * Gets all subterrain tags for this terrain.
   *
   * Returns an array of all subterrain tags in the terrain's registry. Useful for
   * UI rendering (dropdowns, selections), validation, and terrain-wide operations
   * that need to iterate over all available subterrains.
   *
   * @returns {string[]} Array of all subterrain tags in registration order
   *
   * @public
   * @example
   * const allTags = terrain.allSubterrainTag()
   * console.log(allTags) // e.g., ["water", "land", "ice"]
   * allTags.forEach(tag => console.log(`Available: ${tag}`))
   *
   * @remarks
   * - Pure function: No side effects
   * - Returns tags in the order subterrains are registered
   * - Empty array if no subterrains registered (should not occur in practice)
   */
  allSubterrainTag () {
    return this.subterrains.map(st => st.tag)
  }

  /**
   * Gets a weapon by its letter from the weapon catalogue.
   *
   * Searches the terrain's weapon collection for a weapon matching the given letter.
   * Handles both modern public method interface and legacy direct property access for
   * backward compatibility. Returns null if weapon not found or catalogue unavailable.
   *
   * @param {string} letter - The weapon letter to search for (case-sensitive, typically uppercase)
   * @returns {Weapon|null} The weapon object if found, null otherwise
   *
   * @public
   * @example
   * const sword = terrain.getWeapon('S')
   * if (sword) {
   *   console.log('Found weapon:', sword.name)
   * }
   *
   * @remarks
   * - Pure function: No side effects, only reads state
   * - Letter matching is case-sensitive
   * - Returns null if weapons catalogue is unavailable
   * - Gracefully handles both API and direct property access patterns
   * - Safe to call repeatedly
   */
  getWeapon (letter) {
    // Access weapons through public interface if available
    if (!this.weapons) return null
    if (typeof this.weapons.getWeaponByLetter === 'function') {
      const result = this.weapons.getWeaponByLetter(letter)
      return result ?? null
    }
    // Fallback: direct access through type assertion for backward compatibility
    const catalogue = /** @type {any} */ (this.weapons)
    const weapons = catalogue.weapons
    if (Array.isArray(weapons)) {
      return weapons.find(w => w.letter === letter) || null
    }
    return null
  }

  /**
   * Gets a new weapon instance with custom ammo configuration.
   *
   * Creates a clone of a weapon for the given letter with the specified ammo
   * configuration. Returns null if the weapon is not found or cannot be cloned.
   *
   * @param {string} letter - The weapon letter to clone
   * @param {unknown} ammo - The ammo configuration for the new weapon instance
   * @returns {Weapon|null} A cloned weapon instance, or null if not found or not clonable
   *
   * @public
   * @example
   * const newWeapon = terrain.getNewWeapon('S', { count: 5 })
   * if (newWeapon) {
   *   console.log('Created new weapon with ammo count:', newWeapon.ammo.count)
   * }
   *
   * @remarks
   * - Creates a new instance via clone() method on the weapon
   * - Requires weapon to have a clone(ammo) method
   * - Returns null if weapon not found or doesn't support cloning
   * - Safe to call repeatedly; each call creates independent instance
   */
  getNewWeapon (letter, ammo) {
    const weapon = this.getWeapon(letter)
    if (!weapon) return null
    // Cast to any to access clone method that may not be in Weapon type
    const weaponWithClone = /** @type {any} */ (weapon)
    if (typeof weaponWithClone.clone === 'function') {
      return weaponWithClone.clone(ammo)
    }
    return null
  }
  /**
   * Gets the localStorage key for custom maps.
   * Constructs a unique key combining the terrain's key with a prefix.
   * Used to store comma-separated list of custom map titles.
   *
   * @returns {string} The localStorage key for this terrain's custom maps index
   *
   * @public
   * @example
   * const key = terrain.customMapsLocalStorageKey()
   * // Returns: "terrain-key.sea-land-custom-maps"
   */
  customMapsLocalStorageKey () {
    return `${oldToken}.${this.key}-custom-maps`
  }

  /**
   * Gets the raw custom maps string from localStorage.
   * Retrieves the comma-separated list of custom map titles stored for this terrain.
   *
   * @returns {string} The raw CSV string of custom map titles, or empty string if none exist
   *
   * @public
   * @example
   * const csv = terrain.getCustomMapsRaw()
   * // Returns: "My Map,Another Map,Test Map"
   */
  getCustomMapsRaw () {
    return localStorage.getItem(this.customMapsLocalStorageKey()) || ''
  }

  /**
   * Sets the raw custom maps string in localStorage.
   * Stores a comma-separated list of custom map titles for this terrain.
   *
   * @param {string} csv - The CSV string of custom map titles
   * @returns {void}
   *
   * @public
   * @example
   * terrain.setCustomMapsRaw("My Map,Another Map")
   */
  setCustomMapsRaw (csv) {
    localStorage.setItem(this.customMapsLocalStorageKey(), csv)
  }

  /**
   * Gets the custom map set.
   * Parses the raw custom maps string and returns a Set for easy manipulation.
   *
   * @returns {Set<string>} Set of custom map titles, empty Set if none exist
   *
   * @public
   * @example
   * const maps = terrain.getCustomMapSet()
   * console.log(maps.size) // number of custom maps
   */
  getCustomMapSet () {
    const customMaps = this.getCustomMapsRaw()
    if (customMaps) return new Set(customMaps.split(','))

    return new Set()
  }

  /**
   * Gets the localStorage key for a specific map title.
   * Constructs a unique key for storing a custom map's configuration data.
   *
   * @param {string} title - The map title
   * @returns {string} The localStorage key for this map's data
   *
   * @public
   * @example
   * const key = terrain.localStorageMapKey("My Map")
   * // Returns: "terrain-key.My Map"
   */
  localStorageMapKey (title) {
    return `${oldToken}.${title}`
  }

  /**
   * Gets the custom map set (private helper).
   * Internal method to retrieve and parse the custom maps from storage.
   *
   * @private
   * @returns {Set<string>} Set of custom map titles
   *
   * @example
   * const maps = this._getCustomMapSet()
   * maps.add('New Map')
   */
  _getCustomMapSet () {
    const raw = this.getCustomMapsRaw()
    return raw ? new Set(raw.split(',')) : new Set()
  }

  /**
   * Sets the custom map set in localStorage (private helper).
   * Filters valid map titles and saves them back to storage.
   * Only includes maps that have data stored in localStorage.
   *
   * @private
   * @param {Set<string>} customMapSet - The set of custom map titles to persist
   * @returns {void}
   *
   * @example
   * const maps = new Set(['Map1', 'Map2'])
   * this._setCustomMapSet(maps)
   */
  _setCustomMapSet (customMapSet) {
    const list = [...customMapSet].filter(
      t =>
        typeof t === 'string' &&
        t.length > 0 &&
        localStorage.getItem(this.localStorageMapKey(t))
    )
    localStorage.setItem(this.customMapsLocalStorageKey(), list.join(','))
  }

  /**
   * Updates custom maps with a new title.
   * Adds a new custom map to the terrain's collection if it's not already present.
   * Does nothing if the map title already exists.
   *
   * @param {string} title - The title of the custom map to add
   * @returns {void}
   *
   * @public
   * @example
   * terrain.updateCustomMaps('My New Map')
   */
  updateCustomMaps (title) {
    const customMaps = this._getCustomMapSet()
    if (customMaps.has(title)) {
      return
    }
    customMaps.add(title)
    this._setCustomMapSet(customMaps)
  }

  /**
   * Deletes a custom map.
   * Removes a custom map title from the terrain's collection.
   * Does nothing if the map title doesn't exist.
   *
   * @param {string} title - The title of the custom map to delete
   * @returns {void}
   *
   * @public
   * @example
   * terrain.deleteCustomMaps('Old Map')
   */
  deleteCustomMaps (title) {
    const customMaps = this._getCustomMapSet()
    customMaps.delete(title)
    this._setCustomMapSet(customMaps)
  }

  /**
   * Renames a custom map.
   * Updates a custom map's title in both the map object and the terrain's collection.
   *
   * @param {CustomMap} oldMap - The custom map object to rename
   * @param {string} newTitle - The new title for the map
   * @returns {void}
   *
   * @public
   * @example
   * const map = { title: 'Old Name' }
   * terrain.renameCustomMaps(map, 'New Name')
   * console.log(map.title) // "New Name"
   */
  renameCustomMaps (oldMap, newTitle) {
    const customMaps = this._getCustomMapSet()
    customMaps.delete(oldMap.title)
    oldMap.title = newTitle
    customMaps.add(oldMap.title)
    this._setCustomMapSet(customMaps)
  }

  /**
   * Gets custom maps using a builder function.
   * Maps over custom map titles, building objects for each using the provided factory function.
   * Filters out any null results from the builder.
   *
   * @param {(title: string) => unknown} builder - Factory function that takes a title and returns a custom map object
   * @returns {Array<unknown>} Array of built custom map objects, excluding nulls
   *
   * @public
   * @example
   * const maps = terrain.getCustomMaps(title => ({
   *   title,
   *   created: new Date()
   * }))
   */
  getCustomMaps (builder) {
    return [...this._getCustomMapSet()]
      .map(title => builder(title))
      .filter(m => m != null)
  }

  /**
   * Gets custom map titles.
   * Returns an array of all custom map titles for this terrain.
   *
   * @returns {string[]} Array of custom map titles
   *
   * @public
   * @example
   * const titles = terrain.getCustomMapTitles()
   * console.log('Available maps:', titles)
   */
  getCustomMapTitles () {
    return [...this._getCustomMapSet()]
  }

  /**
   * Gets the sunk description for a ship letter.
   * Generates a descriptive string for when a ship with the given letter is sunk.
   *
   * @param {string} letter - The ship letter
   * @param {string} [middle=' '] - The middle string to insert in the description
   * @returns {string} The sunk description or empty string if ships catalogue unavailable
   *
   * @throws {Error} If ships catalogue is null and method is called
   * @public
   * @example
   * const desc = terrain.sunkDescription('A', ' was ')
   * console.log(desc) // e.g., "Ship A was sunk"
   */
  sunkDescription (letter, middle = ' ') {
    if (!this.ships) {
      throw new Error('Ships catalogue is not available for this terrain')
    }
    return this.ships.sunkDescription(letter, middle)
  }

  /**
   * Adds shapes to the ships catalogue.
   * Registers shape definitions with the terrain's ship collection.
   *
   * @param {*} shapes - The shapes to add to the ships catalogue
   * @returns {void}
   *
   * @throws {Error} If ships catalogue is null
   * @public
   * @example
   * terrain.addShapes({ shipType: 'A', width: 5, height: 3 })
   */
  addShapes (shapes) {
    if (!this.ships) {
      throw new Error('Ships catalogue is not available for this terrain')
    }
    this.ships.addShapes(shapes)
  }

  /**
   * Adds weapons to the terrain's weapon catalogue.
   * Registers weapon definitions with the terrain and reindexes them for quick lookup.
   *
   * This method handles both direct property access (legacy) and public method calls.
   * It attempts to use public methods when available, falling back to direct property
   * access for backward compatibility.
   *
   * @param {Weapon[]} weapons - The weapons array to add to the catalogue
   * @returns {void}
   *
   * @throws {Error} If weapons catalogue is null
   * @public
   * @example
   * terrain.addWeapons([{ letter: 'S', name: 'Sword' }])
   */
  addWeapons (weapons) {
    if (!this.weapons) {
      throw new Error('Weapons catalogue is not available for this terrain')
    }

    // Try public method first if available
    if (typeof this.weapons.addWeapons === 'function') {
      this.weapons.addWeapons(weapons)
      return
    }

    // Fallback: direct property assignment with reindexing
    // Access private properties through type assertion for backward compatibility
    const weaponsCatalogue = /** @type {any} */ (this.weapons)
    if (typeof weaponsCatalogue._indexWeaponsByLetter === 'function') {
      weaponsCatalogue.weapons = weapons
      weaponsCatalogue._indexWeaponsByLetter()
    }
  }
}

/**
 * Legacy storage token key used for localStorage operations.
 * Prefix for all custom map storage keys (deprecated but maintained for backward compatibility).
 * @type {string}
 * @constant
 * @private
 * @example
 * // Used internally by terrains for localStorage operations
 * const key = `${oldToken}.map-name`
 */
export const oldToken = 'geoffs-battleship'

/**
 * Generic Air/Universal subterrain that accepts any placement.
 * Used for shapes not constrained to specific terrain types (water, land, space).
 * This subterrain has permissive validation to prevent arbitrary zone rejection.
 * @type {SubTerrainBase}
 * @constant
 * @public
 * @example
 * // Matches any subterrain for universal shapes
 * terrain.subterrains.includes(all)
 */
export const all = new SubTerrainBase(
  'Air',
  '#a77',
  '#955',
  'A',
  false,
  false,
  []
)

// The generic Air subterrain must accept any placement location for shapes
// that are not constrained to land or sea. This prevents arbitrary zone
// validation from rejecting universal placement shapes.
all.canBe = () => true
all.validator = () => true

/**
 * Mixed-terrain subterrain for hybrid terrain maps.
 * Allows shapes and placements that span multiple terrain types.
 * @type {SubTerrainBase}
 * @constant
 * @public
 * @example
 * // Used for maps combining multiple terrain types
 * terrain.subterrains.includes(mixed)
 */
export const mixed = new SubTerrainBase(
  'Mixed',
  '#888',
  '#666',
  'M',
  false,
  false,
  []
)

/**
 * Subterrain validator matcher for zone-based placement validation.
 *
 * Represents a validation matcher for subterrains, combining a validator function,
 * zone detail level, and specific subterrain reference. Used in placement rules
 * to determine if shapes can be placed at specific locations within zones.
 *
 * @class Matcher
 * @public
 * @example
 * const matcher = new Matcher(
 *   (zone) => zone.depth < 5,
 *   2,
 *   waterSubterrain
 * )
 */
export class Matcher {
  /**
   * Creates a new Matcher instance.
   *
   * Initializes the matcher with a validation function, zone detail requirement,
   * and target subterrain reference.
   *
   * @param {Function} validator - Predicate function to validate zone eligibility
   * @param {number} zoneDetail - Zone detail level requirement (typically 0-3)
   * @param {SubTerrain} subterrain - The subterrain this matcher applies to
   * @public
   */
  constructor (validator, zoneDetail, subterrain) {
    /** @type {Function} */
    this.validator = validator
    /** @type {number} */
    this.zoneDetail = zoneDetail
    /** @type {SubTerrain} */
    this.subterrain = subterrain
  }

  /**
   * Checks if a subterrain matches this matcher's subterrain.
   *
   * Simple equality check to determine if a given subterrain is the one this
   * matcher was configured for.
   *
   * @param {SubTerrain} subterrain - The subterrain to check
   * @returns {boolean} True if the subterrain matches this matcher's subterrain, false otherwise
   *
   * @public
   * @example
   * if (matcher.canBe(waterSubterrain)) {
   *   console.log('This matcher applies to water terrain')
   * }
   */
  canBe (subterrain) {
    return subterrain === this.subterrain
  }
}

/**
 * Creates a string key from row and column coordinates.
 *
 * Generates a comma-separated coordinate string suitable for use as object keys
 * or storage identifiers. Used throughout the system for position tracking.
 *
 * @param {number} r - The row coordinate (0-based)
 * @param {number} c - The column coordinate (0-based)
 * @returns {string} Comma-separated coordinate key (e.g., "5,3")
 *
 * @public
 * @example
 * const key = makeKey(5, 3)
 * console.log(key) // "5,3"
 *
 * @see parsePair For the inverse operation
 */
export function makeKey (r, c) {
  return `${r},${c}`
}

/**
 * Parses a coordinate string key into row and column numbers.
 *
 * Inverse operation of makeKey(). Converts comma-separated coordinate strings
 * back into numeric row and column values with base-10 parsing.
 *
 * @param {string} key - The coordinate key (e.g., "5,3")
 * @returns {[number, number]} Array with [row, column] as numeric values
 *
 * @public
 * @example
 * const [row, col] = parsePair("5,3")
 * console.log(row, col) // 5 3
 *
 * @see makeKey For the inverse operation
 */
export function parsePair (key) {
  const pair = key.split(',')
  const r = Number.parseInt(pair[0], 10)
  const c = Number.parseInt(pair[1], 10)
  return [r, c]
}

/**
 * Adds all cells in a 3x3 grid around a center cell to a footprint set.
 *
 * Expands a footprint to include the center cell and all 8 neighbors (including
 * diagonals). Used for calculating placement constraints and collision detection
 * around a position.
 *
 * The 3x3 grid includes:
 * - The center cell (r, c)
 * - All 4 orthogonal neighbors (up, down, left, right)
 * - All 4 diagonal neighbors
 *
 * @param {number} r - The center row coordinate
 * @param {number} c - The center column coordinate
 * @param {Set<string>} fp - The footprint set to add cells to. Cells are added as strings via makeKey()
 * @returns {void}
 *
 * @public
 * @example
 * const footprint = new Set()
 * addCellToFootPrint(5, 5, footprint)
 * console.log(footprint.size) // 9 (center + 8 neighbors)
 * console.log(footprint.has('5,5')) // true
 * console.log(footprint.has('4,4')) // true (diagonal)
 *
 * @see makeKey For understanding the key format
 */
export function addCellToFootPrint (r, c, fp) {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      fp.add(`${r + i},${c + j}`)
    }
  }
}
