import { SubTerrain } from './SubTerrain.js'
import { bh } from './bh.js'

/**
 * Represents a terrain with ships, subterrains, and custom maps management.
 */
export class Terrain {
  /**
   * @param {string} title - The title of the terrain
   * @param {Object} shipCatalogue - The ship catalogue
   * @param {SubTerrain[]} subterrains - Array of subterrains
   * @param {string} tag - The tag for the terrain
   * @param {string} [mapHeading='Waters'] - Heading for the map
   * @param {string} [fleetHeading='Fleet'] - Heading for the fleet
   * @param {Object} sounds - Sound configuration
   */
  constructor (
    title,
    shipCatalogue,
    subterrains,
    tag,
    mapHeading,
    fleetHeading,
    sounds
  ) {
    /** @type {string} */
    this.title = title || 'Unknown'
    /** @type {string} */
    this.key = title.toLowerCase().replaceAll(/\s+/g, '-')
    /** @type {Object} */
    this.ships = shipCatalogue
    /** @type {Object|null} */
    this.weapons = null //weaponsCatalogue
    /** @type {Object} */
    this.sounds = sounds
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
   * @param {string} elementTag - The element tag to customize
   * @param {Function} [textContent] - Function to set text content
   * @param {Function} [innerHTML] - Function to set inner HTML
   */
  static customizeUnitDescriptions (
    elementTag,
    textContent = Function.prototype,
    innerHTML = Function.prototype
  ) {
    bh.customizeUnits(elementTag, (letter, description, el, key) => {
      if (textContent !== Function.prototype)
        el.textContent = textContent(letter, description, el, key)
      if (innerHTML !== Function.prototype)
        el.innerHTML = innerHTML(letter, description, el, key)
    })
  }

  /**
   * Shows or hides units based on a condition.
   * @param {string} elementTag - The element tag
   * @param {Function} [hasClass] - Function to determine if class should be added
   * @param {string} [className='hidden'] - The class name to toggle
   */
  static showsUnits (
    elementTag,
    hasClass = Function.prototype,
    className = 'hidden'
  ) {
    bh.customizeUnits(elementTag, (letter, description, el, key) => {
      if (hasClass !== Function.prototype)
        if (hasClass(letter, description, el, key, className)) {
          el.classList.remove(className)
        } else {
          el.classList.add(className)
        }
    })
  }

  /**
   * Gets a new fleet for the terrain.
   * @returns {*} The new fleet
   */
  get newFleetForTerrain () {
    return bh.fleetBuilder(this.ships.baseShapes)
  }

  /**
   * Gets the subterrain tag based on land status.
   * @param {boolean} isLand - Whether it's land
   * @returns {string} The subterrain tag
   */
  subterrainTag (isLand) {
    return isLand ? this.landSubterrain.tag : this.defaultSubterrain.tag
  }

  /**
   * Gets all subterrain tags.
   * @returns {string[]} Array of subterrain tags
   */
  allSubterrainTag () {
    return this.subterrains.map(st => st.tag)
  }

  /**
   * Gets a weapon by letter.
   * @param {string} letter - The weapon letter
   * @returns {Object|null} The weapon or null
   */
  getWeapon (letter) {
    return this.weapons?.weapons.find(w => w.letter === letter) || null
  }

  /**
   * Gets a new weapon instance.
   * @param {string} letter - The weapon letter
   * @param {*} ammo - The ammo
   * @returns {Object|null} The new weapon or null
   */
  getNewWeapon (letter, ammo) {
    const weapon = this.getWeapon(letter)
    if (weapon) return weapon.clone(ammo)
    return null
  }
  /**
   * Gets the localStorage key for custom maps.
   * @returns {string} The key
   */
  customMapsLocalStorageKey () {
    return `${oldToken}.${this.key}-custom-maps`
  }

  /**
   * Gets the raw custom maps string from localStorage.
   * @returns {string} The raw string
   */
  getCustomMapsRaw () {
    return localStorage.getItem(this.customMapsLocalStorageKey()) || ''
  }

  /**
   * Sets the raw custom maps string in localStorage.
   * @param {string} csv - The CSV string
   */
  setCustomMapsRaw (csv) {
    return localStorage.setItem(this.customMapsLocalStorageKey(), csv)
  }

  /**
   * Gets the custom map set.
   * @returns {Set<string>} The set of custom maps
   */
  getCustomMapSet () {
    const customMaps = this.getCustomMapsRaw()
    if (customMaps) return new Set(customMaps.split(','))

    return new Set()
  }

  /**
   * Gets the localStorage key for a map title.
   * @param {string} title - The map title
   * @returns {string} The key
   */
  localStorageMapKey (title) {
    return `${oldToken}.${title}`
  }

  /**
   * Gets the custom map set (private helper).
   * @private
   * @returns {Set<string>} The set of custom maps
   */
  _getCustomMapSet () {
    const raw = this.getCustomMapsRaw()
    return raw ? new Set(raw.split(',')) : new Set()
  }

  /**
   * Sets the custom map set in localStorage (private helper).
   * @private
   * @param {Set<string>} customMapSet - The set to save
   */
  _setCustomMapSet (customMapSet) {
    const list = [...customMapSet].filter(
      t => t && t.length > 0 && localStorage.getItem(this.localStorageMapKey(t))
    )
    localStorage.setItem(this.customMapsLocalStorageKey(), list.join(','))
  }

  /**
   * Updates custom maps with a new title.
   * @param {string} title - The title to add
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
   * @param {string} title - The title to delete
   */
  deleteCustomMaps (title) {
    const customMaps = this._getCustomMapSet()
    customMaps.delete(title)
    this._setCustomMapSet(customMaps)
  }

  /**
   * Renames a custom map.
   * @param {Object} oldMap - The old map object
   * @param {string} newTitle - The new title
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
   * @param {Function} builder - The builder function
   * @returns {Array} Array of built maps
   */
  getCustomMaps (builder) {
    return [...this._getCustomMapSet()]
      .map(title => builder(title))
      .filter(m => m !== null)
  }

  /**
   * Gets custom map titles.
   * @returns {string[]} Array of titles
   */
  getCustomMapTitles () {
    return [...this._getCustomMapSet()]
  }

  /**
   * Gets the sunk description for a letter.
   * @param {string} letter - The letter
   * @param {string} [middle=' '] - The middle string
   * @returns {string} The description
   */
  sunkDescription (letter, middle = ' ') {
    return this.ships.sunkDescription(letter, middle)
  }

  /**
   * Adds shapes to the ships.
   * @param {*} shapes - The shapes to add
   */
  addShapes (shapes) {
    this.ships.addShapes(shapes)
  }

  /**
   * Adds weapons.
   * @param {*} weapons - The weapons to add
   */
  addWeapons (weapons) {
    this.weapons.addWeapons(weapons)
  }
}
export const MIN_CUSTOM_WIDTH = 16
export const MAX_CUSTOM_WIDTH = 22
export const MIN_CUSTOM_HEIGHT = 6
export const MAX_CUSTOM_HEIGHT = 12
export const oldToken = 'geoffs-battleship'

export const all = new SubTerrain('Air', '#a77', '#955', 'A', false, false, [])

export const mixed = new SubTerrain(
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
  const r = Number.parseInt(pair[0])
  const c = Number.parseInt(pair[1])
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
