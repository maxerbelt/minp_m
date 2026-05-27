import { SubTerrainBase } from './SubTerrainBase.js'
import { bh } from './bh.js'

/**
 * @typedef {import('./SubTerrainBase.js').SubTerrainBase} SubTerrain
 * @typedef {import('../../../weapon/WeaponCatelogue.js').Weapon} Weapon
 * @typedef {import('../../../weapon/WeaponCatelogue.js').WeaponCatelogue} WeaponCatalogue
 * @typedef {import('../../../ships/ShipGroups.js').ShipCatalogue|null} TerrainShipCatalogue
 * @typedef {Record<string, string|URL>} TerrainSoundConfig
 * @typedef {(letter: string, middle: string) => string} SunkDescriptionFn
 * @typedef {(shapes: unknown) => void} AddShapesFn
 * @typedef {(weapons: unknown) => void} AddWeaponsFn
 * @typedef {(letter: string, description: string, el: HTMLElement, key: string) => string | null} TextContentRenderer
 * @typedef {(letter: string, description: string, el: HTMLElement, key: string) => string} InnerHTMLRenderer
 * @typedef {(letter: string, description: string, el: HTMLElement, key: string, className: string) => boolean} ClassPredicate
 * @typedef {{ title: string }} CustomMap
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
   * Creates a fresh fleet instance using the terrain's base ship shapes.
   * Used to initialize a player's fleet at game start.
   *
   * @returns {*} A new fleet object built from the terrain's ship base shapes
   * @throws {Error} If ships catalogue is null or lacks baseShapes
   *
   * @public
   * @example
   * const playerFleet = terrain.newFleetForTerrain
   * console.log('Fleet created with', playerFleet.ships.length, 'ships')
   */
  get newFleetForTerrain () {
    return bh.fleetBuilder(this.ships?.baseShapes || [])
  }

  /**
   * Gets the subterrain tag based on land status.
   * Selects between the land subterrain tag or default subterrain tag.
   *
   * @param {boolean} isLand - Whether to use land subterrain (true) or default (false)
   * @returns {string} The corresponding subterrain tag
   *
   * @public
   * @example
   * const waterTag = terrain.subterrainTag(false) // e.g., "water"
   * const landTag = terrain.subterrainTag(true)   // e.g., "land"
   */
  subterrainTag (isLand) {
    return isLand ? this.landSubterrain.tag : this.defaultSubterrain.tag
  }

  /**
   * Gets all subterrain tags.
   * Returns an array of tags for all subterrains in this terrain.
   * Useful for UI rendering or terrain-wide operations.
   *
   * @returns {string[]} Array of all subterrain tags in order
   *
   * @public
   * @example
   * const allTags = terrain.allSubterrainTag()
   * console.log(allTags) // e.g., ["water", "land", "ice"]
   */
  allSubterrainTag () {
    return this.subterrains.map(st => st.tag)
  }

  /**
   * Gets a weapon by letter from the weapon catalogue.
   * Searches the terrain's weapon collection for a weapon matching the given letter.
   *
   * @param {string} letter - The weapon letter to search for
   * @returns {Weapon|null} The weapon object if found, null otherwise
   *
   * @public
   * @example
   * const sword = terrain.getWeapon('S')
   * if (sword) {
   *   console.log('Found weapon:', sword)
   * }
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
   * Gets a new weapon instance with specified ammo.
   * Creates a clone of the weapon for the given letter with custom ammo configuration.
   *
   * @param {string} letter - The weapon letter
   * @param {unknown} ammo - The ammo configuration for the new weapon
   * @returns {Weapon|null} A cloned weapon instance or null if not found
   *
   * @public
   * @example
   * const newWeapon = terrain.getNewWeapon('S', { count: 5 })
   * if (newWeapon) {
   *   console.log('Created new weapon')
   * }
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
export const MIN_CUSTOM_WIDTH = 16
export const MAX_CUSTOM_WIDTH = 22
export const MIN_CUSTOM_HEIGHT = 6
export const MAX_CUSTOM_HEIGHT = 12
export const oldToken = 'geoffs-battleship'

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
 * A matcher for subterrain validation.
 */
export class Matcher {
  /**
   * @param {Function} validator - The validator function
   * @param {number} zoneDetail - The zone detail level
   * @param {SubTerrain} subterrain - The subterrain
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
   * Checks if a subterrain can be matched.
   * @param {SubTerrain} subterrain - The subterrain to check
   * @returns {boolean} Whether it can be
   */
  canBe (subterrain) {
    return subterrain === this.subterrain
  }
}

/**
 * Makes a key from row and column.
 * @param {number} r - Row
 * @param {number} c - Column
 * @returns {string} The key
 */
export function makeKey (r, c) {
  return `${r},${c}`
}

/**
 * Parses a key into row and column.
 * @param {string} key - The key
 * @returns {[number, number]} Array with row and column
 */
export function parsePair (key) {
  const pair = key.split(',')
  const r = Number.parseInt(pair[0], 10)
  const c = Number.parseInt(pair[1], 10)
  return [r, c]
}

/**
 * Adds cells to the footprint around a given cell.
 * @param {number} r - Row
 * @param {number} c - Column
 * @param {Set<string>} fp - The footprint set
 */
export function addCellToFootPrint (r, c, fp) {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      fp.add(`${r + i},${c + j}`)
    }
  }
}
