import { CustomBlankMap, EditedCustomMap, SavedCustomMap } from './map.js'
import { terrainsMaps } from './maps.js'
import { token } from '../../../ships/Shape.js'
import { oldToken } from './terrain.js'

/**
 * Constants for localStorage key prefixes and suffixes.
 */
const STORAGE_KEYS = {
  MAP_NAME: 'last-map-name',
  CUSTOM_WIDTH: 'custom-map-width',
  CUSTOM_HEIGHT: 'custom-map-height'
}

/**
 * Manages terrain maps, including predefined maps, custom maps, and localStorage persistence.
 * Provides methods for map selection, creation, and configuration management.
 */
export class TerrainMaps {
  /**
   * Creates a new TerrainMaps instance.
   * @param {Object} terrain - The terrain configuration
   * @param {Array} list - Array of predefined maps
   * @param {Object} currentMap - The currently selected map
   * @param {Object} weaponPreference - Weapon preferences
   * @param {Object} [shipsCatalogue=null] - Optional ships catalogue override
   * @param {Object} [weaponsCatalogue=null] - Optional weapons catalogue override
   */
  constructor (
    terrain,
    list,
    currentMap,
    weaponPreference,
    shipsCatalogue = null,
    weaponsCatalogue = null
  ) {
    if (shipsCatalogue) terrain.ships = shipsCatalogue
    if (weaponsCatalogue) terrain.weapons = weaponsCatalogue

    this.list = list
    this.current = currentMap
    this.terrain = terrain
    this.title = terrain.title || 'Unknown'
    this.key = terrain.key || 'unknown'
    this.baseShapes = terrain.ships.baseShapes
    this.shipSunkDescriptions = terrain.ships.sunkDescriptions
    this.shipLetterColors = terrain.ships.letterColors
    this.shipDescription = terrain.ships.description
    this.shipTypes = terrain.ships.types
    this.shipColors = terrain.ships.colors
    this.shapesByLetter = terrain.ships.shapesByLetter
    this.minWidth = terrain.minWidth
    this.maxWidth = terrain.maxWidth
    this.minHeight = terrain.minHeight
    this.maxHeight = terrain.maxHeight
    this.weaponPreference = weaponPreference
  }

  /**
   * Creates a map containing all ships and weapons for testing purposes.
   * @param {Array} mapList - The list of maps to base this on
   * @param {Object} shipsCatalogue - The ships catalogue
   * @param {Object} weaponsCatalogue - The weapons catalogue
   * @returns {Object} A new map with all ships and weapons
   */
  createAllShipsAndWeaponsMap (mapList, shipsCatalogue, weaponsCatalogue) {
    const allShipsAndWeapons = mapList
      .at(-1)
      .clone(`All ${this.title} Ships and Weapons`)
    allShipsAndWeapons.shipNum = shipsCatalogue.baseShapes.reduce(
      (acc, shape) => {
        acc[shape.letter] = 1
        return acc
      },
      {}
    )
    allShipsAndWeapons.name = `All ${this.title} Ships and Weapons Map`
    if (weaponsCatalogue) {
      allShipsAndWeapons.weapons = [
        weaponsCatalogue.defaultWeapon,
        ...weaponsCatalogue.weapons
      ]
    }
    return allShipsAndWeapons
  }

  /**
   * Gets the new fleet for the terrain.
   * @returns {*} The new fleet
   */
  get newFleetForTerrain () {
    return this.terrain.newFleetForTerrain
  }

  /**
   * Creates a new blank map with specified dimensions.
   * @param {number} r - Number of rows
   * @param {number} c - Number of columns
   */
  clearBlankWith (r, c) {
    this.current = new CustomBlankMap(r, c, this.terrain)
  }

  /**
   * Creates a new blank map with current map's dimensions.
   */
  clearBlank () {
    this.current = new CustomBlankMap(
      this.current.rows,
      this.current.cols,
      this.terrain
    )
  }

  /**
   * Sets the current map to a blank map with specified dimensions.
   * @param {number} r - Number of rows
   * @param {number} c - Number of columns
   */
  setToBlank (r, c) {
    if (this.current instanceof CustomBlankMap) this.current.setSize(r, c)
    else this.clearBlankWith(r, c)
  }

  /**
   * Sets the current map by name.
   * @param {string} mapName - The name of the map to set
   */
  setTo (mapName) {
    this.current = this.getMap(mapName) || this.list[0]
  }

  /**
   * Sets the current map to a specific map object.
   * @param {Object} map - The map object to set as current
   */
  setToMap (map) {
    this.current = map || this.list[0]
  }

  /**
   * Saves the current custom map to localStorage.
   * @param {Object} [example] - Optional example data
   */
  addCurrentCustomMap (example) {
    if (
      !(
        this.current instanceof CustomBlankMap ||
        this.current instanceof EditedCustomMap
      )
    )
      return

    if (example) {
      this.current.example = example
    }
    this.current.saveToLocalStorage(this.current.title)
  }

  /**
   * Checks if a map exists with the specified dimensions.
   * @param {number} r - Number of rows
   * @param {number} c - Number of columns
   * @returns {boolean} True if a map with these dimensions exists
   */
  hasMapSize (r, c) {
    return this.mapWithSize(r, c) !== undefined
  }

  /**
   * Finds a map with the specified dimensions.
   * @param {number} r - Number of rows
   * @param {number} c - Number of columns
   * @returns {Object|undefined} The map with matching dimensions, or undefined
   */
  mapWithSize (r, c) {
    return this.list.find(m => m.rows === r && m.cols === c)
  }

  /**
   * Sets the current map to a default blank map with land from a template.
   * @param {number} r - Number of rows
   * @param {number} c - Number of columns
   */
  setToDefaultBlank (r, c) {
    this.clearBlankWith(r, c)
    const map = this.mapWithSize(r, c)
    if (map) {
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          if (map.isLand(i, j)) {
            this.current.addLand(i, j)
          }
        }
      }
    }
  }

  /**
   * Gets the index of a predefined map by name.
   * @param {string} mapName - The name of the map
   * @returns {number} The index of the map, or -1 if not found
   */
  prefilledMapIndex (mapName) {
    return this.list.findIndex(m => m.title === mapName)
  }

  /**
   * Loads a custom map by name from localStorage.
   * @param {string} mapName - The name of the custom map
   * @returns {Object|null} The loaded custom map, or null if not found
   */
  getCustomMap (mapName) {
    if (!mapName) return null
    return SavedCustomMap.load(mapName)
  }

  /**
   * Loads an editable custom map by name from localStorage.
   * @param {string} mapName - The name of the editable map
   * @returns {Object|null} The loaded editable map, or null if not found
   */
  getEditableMap (mapName) {
    if (!mapName) return null
    return EditedCustomMap.load(mapName)
  }

  /**
   * Gets a map by name, checking both predefined and custom maps.
   * @param {string} mapName - The name of the map
   * @returns {Object|null} The map object, or null if not found
   */
  getMap (mapName) {
    if (!mapName) return null
    let map = this.list.find(m => m.title === mapName)
    if (!map) map = this.getCustomMap(mapName)
    return map
  }

  /**
   * Gets a map with specific dimensions.
   * @param {number} height - The height of the map
   * @param {number} width - The width of the map
   * @returns {Object|null} The map with matching dimensions, or null
   */
  getMapOfSize (height, width) {
    if (!height || !width) return null
    let map = this.list.find(m => m.rows === height && m.cols === width)
    if (!map) map = this.getCustomMapOfSize(height, width)
    return map
  }

  /**
   * Gets a custom map with specific dimensions.
   * @param {number} height - The height of the map
   * @param {number} width - The width of the map
   * @returns {Object|null} The custom map with matching dimensions, or null
   */
  getCustomMapOfSize (height, width) {
    if (!height || !width) return null
    const list = this.customMapList()
    return list.find(m => m.rows === height && m.cols === width)
  }

  /**
   * Generates a localStorage key for the last map name.
   * @returns {string} The localStorage key
   * @private
   */
  _getLastMapKey () {
    return `${token}.${this.terrain?.tag}.${this.key}-${STORAGE_KEYS.MAP_NAME}`
  }

  /**
   * Generates the old localStorage key for the last map name (for migration).
   * @returns {string} The old localStorage key
   * @private
   */
  _getOldLastMapKey () {
    return `${oldToken}.${this.key}-${STORAGE_KEYS.MAP_NAME}`
  }

  /**
   * Generates the very old localStorage key for the last map name (for migration).
   * @returns {string} The very old localStorage key
   * @private
   */
  _getOldOldLastMapKey () {
    return `${oldToken}.${STORAGE_KEYS.MAP_NAME}`
  }

  /**
   * Gets the raw last map title from localStorage, with fallback for old keys.
   * @returns {string|null} The last map title, or null if not found
   */
  getLastMapTitleRaw () {
    const title = localStorage.getItem(this._getLastMapKey())
    if (this.key !== 'SeaAndLand') return title
    return (
      title ||
      localStorage.getItem(this._getOldLastMapKey()) ||
      localStorage.getItem(this._getOldOldLastMapKey())
    )
  }

  /**
   * Gets the last map title, with fallback to the first predefined map.
   * @returns {string} The last map title
   */
  getLastMapTitle () {
    const title = this.getLastMapTitleRaw()
    return title || this.list[0]?.title || ''
  }

  /**
   * Gets the last map object.
   * @returns {Object} The last map object
   */
  getLastMap () {
    const title = this.getLastMapTitleRaw()
    return this.getMap(title) || this.list[0]
  }

  /**
   * Stores the current map title as the last map in localStorage.
   */
  storeLastMap () {
    localStorage.setItem(this._getLastMapKey(), this.current.title)
  }

  /**
   * Generates the localStorage key for the last custom width.
   * @returns {string} The localStorage key
   * @private
   */
  _getLastWidthKey () {
    return `${token}.${STORAGE_KEYS.CUSTOM_WIDTH}`
  }

  /**
   * Generates the old localStorage key for the last custom width.
   * @returns {string} The old localStorage key
   * @private
   */
  _getOldLastWidthKey () {
    return `${oldToken}.${STORAGE_KEYS.CUSTOM_WIDTH}`
  }

  /**
   * Parses and validates a width value from localStorage.
   * @param {number} defaultWidth - The default width to use if invalid
   * @returns {number} The validated width
   */
  getLastWidth (defaultWidth) {
    const width = this._parseStoredDimension(
      this._getLastWidthKey(),
      this._getOldLastWidthKey()
    )
    return this._validateDimension(
      width,
      this.minWidth,
      this.maxWidth,
      defaultWidth || this.minWidth
    )
  }

  /**
   * Generates the localStorage key for the last custom height.
   * @returns {string} The localStorage key
   * @private
   */
  _getLastHeightKey () {
    return `${token}.${STORAGE_KEYS.CUSTOM_HEIGHT}`
  }

  /**
   * Generates the old localStorage key for the last custom height.
   * @returns {string} The old localStorage key
   * @private
   */
  _getOldLastHeightKey () {
    return `${oldToken}.${STORAGE_KEYS.CUSTOM_HEIGHT}`
  }

  /**
   * Parses and validates a height value from localStorage.
   * @param {number} defaultHeight - The default height to use if invalid
   * @returns {number} The validated height
   */
  getLastHeight (defaultHeight) {
    const height = this._parseStoredDimension(
      this._getLastHeightKey(),
      this._getOldLastHeightKey()
    )
    return this._validateDimension(
      height,
      this.minHeight,
      this.maxHeight,
      defaultHeight || this.minHeight
    )
  }

  /**
   * Parses a dimension value from localStorage with fallback to old key.
   * @param {string} primaryKey - The primary localStorage key
   * @param {string} fallbackKey - The fallback localStorage key
   * @returns {number} The parsed dimension value
   * @private
   */
  _parseStoredDimension (primaryKey, fallbackKey) {
    const value =
      Number.parseInt(localStorage.getItem(primaryKey), 10) ||
      Number.parseInt(localStorage.getItem(fallbackKey), 10)
    return value
  }

  /**
   * Validates a dimension value against min/max bounds.
   * @param {number} value - The value to validate
   * @param {number} min - The minimum allowed value
   * @param {number} max - The maximum allowed value
   * @param {number} defaultValue - The default value to use if invalid
   * @returns {number} The validated dimension value
   * @private
   */
  _validateDimension (value, min, max, defaultValue) {
    if (Number.isNaN(value) || value < min || value > max) {
      return defaultValue
    }
    return value
  }

  /**
   * Stores the last custom height in localStorage.
   * @param {number} height - The height to store
   */
  storeLastHeight (height) {
    if (height) {
      localStorage.setItem(this._getLastHeightKey(), height)
    }
  }

  /**
   * Stores the last custom width in localStorage.
   * @param {number} width - The width to store
   */
  storeLastWidth (width) {
    if (width) {
      localStorage.setItem(this._getLastWidthKey(), width)
    }
  }

  /**
   * Stores both last custom width and height in localStorage.
   * @param {number} width - The width to store
   * @param {number} height - The height to store
   */
  storeLastCustomSize (width, height) {
    this.storeLastWidth(width)
    this.storeLastHeight(height)
  }

  /**
   * Gets the list of custom maps.
   * @returns {Array} Array of custom map objects
   */
  customMapList () {
    return this.terrain.getCustomMaps(SavedCustomMap.load)
  }

  /**
   * Gets all maps, including predefined and custom maps.
   * @returns {Array} Array of all map objects
   */
  maps () {
    return this.list.concat(this.customMapList())
  }

  /**
   * Gets the list of predefined maps.
   * @returns {Array} Array of predefined map objects
   */
  preGenMapList () {
    return this.list
  }

  /**
   * Gets all map titles, including custom map titles.
   * @returns {Array<string>} Array of all map titles
   */
  mapTitles () {
    const result = this.list
      .map(m => m.title)
      .concat(this.terrain.getCustomMapTitles())

    return result
  }

  /**
   * Gets the number of ships of a specific shape in the current map.
   * @param {Object} shape - The shape object
   * @returns {number} The number of ships
   */
  noOfShipOfShape (shape) {
    return this.current.shipNum[shape.letter]
  }

  /**
   * Checks if coordinates are within the current map bounds.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if coordinates are in bounds
   */
  inBounds (r, c) {
    return this.current.inBounds(r, c)
  }

  /**
   * Gets zone information for the specified coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {number} zoneDetail - Level of zone detail
   * @returns {Array} Zone information array
   */
  zoneInfo (r, c, zoneDetail) {
    return this.current.zoneInfo(r, c, zoneDetail)
  }

  /**
   * Checks if a rectangular area fits within the current map bounds.
   * @param {number} r - Starting row
   * @param {number} c - Starting column
   * @param {number} height - Height of the area
   * @param {number} width - Width of the area
   * @returns {boolean} True if the area fits within bounds
   */
  inAllBounds (r, c, height, width) {
    return this.current.inAllBounds(r, c, height, width)
  }

  /**
   * Checks if the specified coordinates are land in the current map.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if the position is land
   */
  isLand (r, c) {
    return this.current.isLand(r, c)
  }

  /**
   * Gets the number of registered terrains.
   * @returns {number} The number of terrains
   */
  static get numTerrains () {
    return terrainsMaps.list.length
  }

  /**
   * Gets or sets the current terrain maps configuration.
   * @param {Object} [newCurrent] - Optional new terrain maps to set
   * @returns {Object} The current terrain maps
   */
  static currentTerrainMaps (newCurrent) {
    if (newCurrent && terrainsMaps.current !== newCurrent) {
      terrainsMaps.setCurrent(newCurrent)
    }
    return terrainsMaps.current
  }

  /**
   * Sets the current terrain maps by index.
   * @param {number} idx - The index to set
   * @returns {Object|null} The terrain maps that were set, or null
   */
  static setByIndex (idx) {
    if (idx) {
      return terrainsMaps.setByIndex(idx)
    }
    return null
  }

  /**
   * Sets the current terrain maps to the default.
   * @returns {Object|null} The default terrain maps that were set
   */
  static setToDefault () {
    return terrainsMaps.setToDefault()
  }
}
