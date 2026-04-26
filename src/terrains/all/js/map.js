import { makeKey, lazy } from '../../../core/utilities.js'
import { Random } from '../../../core/Random.js'
import { oldToken } from './terrain.js'
import { SubTerrainTrackers } from './SubTerrainTrackers.js'
import { bh } from './bh.js'
import { standardShot } from '../../../weapon/Weapon.js'
import { Mask } from '../../../grid/rectangle/mask.js'
import { getCopyNumKey, makeTitle } from './makeTitle.js'

// geometry helper
/**
 * Creates a function to check if an element is within a range.
 * @param {number} r - Row coordinate
 * @param {number} c - Column coordinate
 * @returns {Function} Function that tests if an element [r2, c1, c2] contains the point (r, c)
 */
export const inRange = (r, c) => element =>
  element[0] == r && element[1] <= c && element[2] >= c

/**
 * Base class for terrain maps with common functionality.
 * Handles map geometry, terrain tracking, and basic operations.
 */
export class BhMap {
  /**
   * Creates a new BhMap instance.
   * @param {string} title - The map title
   * @param {Array<number>} size - Array [rows, cols] defining map dimensions
   * @param {Object} shipNum - Object mapping ship letters to quantities
   * @param {Array} landArea - Array of land area ranges
   * @param {string} name - The map name
   * @param {Object} mapTerrain - The terrain configuration
   * @param {Set} land - Set of land coordinates
   */
  constructor (title, size, shipNum, landArea, name, mapTerrain, land) {
    this.title = title
    this.name = name
    this.rows = size[0]
    this.cols = size[1]
    this.shipNum = shipNum
    this.landArea = landArea
    this.land = land instanceof Set ? land : new Set()
    this.terrain = mapTerrain || bh.terrain

    lazy(this, 'landBits', () => {
      const mask = this.blankMask
      mask.setRanges(this.landArea)
      return mask.bits
    })

    lazy(this, 'defaultTerrainBits', () => {
      return this.landMask.invertBits
    })

    lazy(this, 'defaultTerrainMask', () => {
      const mask = this.blankMask
      mask.bits = this.defaultTerrainBits
      return mask
    })

    lazy(this, 'landMask', () => {
      const mask = this.blankMask
      mask.bits = this.landBits
      return mask
    })

    if (!this?.terrain?.subterrains) {
      console.log('map called with bad parameter : ', this.terrain)
      this.terrain = bh.terrain
    }

    this.subterrainTrackers = new SubTerrainTrackers(this?.terrain?.subterrains)
    this.subterrainTrackers.calc(this)
    this.isPreGenerated = true
    this.weapons = [standardShot]
  }
  /**
   * Gets an empty mask for this map's dimensions.
   * @returns {Mask} A new empty mask
   */
  get blankMask () {
    return Mask.empty(this.cols, this.rows)
  }

  /**
   * Gets a full mask for this map's dimensions.
   * @returns {Mask} A new full mask
   */
  get fullMask () {
    return Mask.full(this.cols, this.rows)
  }

  /**
   * Gets extra armed fleet shapes for this map.
   * @returns {Array} Array of ship shapes attached to racks
   */
  get extraArmedFleetForMap () {
    const repeatShapes = this.newShapesForMap
    const ships = bh.extraFleetBuilder(repeatShapes, s => s.isAttachedToRack)
    return ships
  }

  /**
   * Gets the new fleet shapes for this map.
   * @returns {Array} Array of ship shapes
   */
  get newFleetForMap () {
    const repeatShapes = this.newShapesForMap
    const ships = bh.fleetBuilder(repeatShapes)
    return ships
  }

  /**
   * Gets the base shapes repeated according to ship numbers.
   * @returns {Array} Array of repeated ship shapes
   */
  get newShapesForMap () {
    const terrain = this.terrain
    const baseShapes = terrain.ships.baseShapes
    const shipNum = this.shipNum
    const repeatShapes = baseShapes.flatMap(
      s => Array(shipNum[s.letter] || 0).fill(s) || []
    )
    return repeatShapes
  }
  /**
   * Gets a random edge position, optionally biased by row/column.
   * @param {number} [r] - Optional row to bias edge selection
   * @param {number} [c] - Optional column to bias edge selection
   * @returns {Array<number>} [row, col] coordinates on the edge
   */
  randomEdge (r, c) {
    let edge = null
    let list = []

    if (r !== undefined) {
      edge = r < this.rows / 2 ? 1 : 0
      list.push(edge)
    }
    if (c !== undefined) {
      edge = c < this.cols / 2 ? 3 : 2
      list.push(edge)
    }
    if (list.length > 0) {
      edge = Random.element(list)
    }

    return this.randomEdgeFor(edge)
  }

  /**
   * Gets a random position on a specific edge.
   * @param {number} [edge] - Edge number (0=top, 1=bottom, 2=left, 3=right), random if undefined
   * @returns {Array<number>} [row, col] coordinates on the specified edge
   */
  randomEdgeFor (edge) {
    edge = edge || Random.integerWithMax(4)
    if (edge === 0) return [0, this.randomColumn()]
    if (edge === 1) return [this.rows - 1, this.randomColumn()]
    if (edge === 2) return [this.randomRow(), 0]
    return [this.randomRow(), this.cols - 1]
  }

  /**
   * Gets a random row index.
   * @returns {number} Random row between 0 and rows-1
   */
  randomRow () {
    return Random.integerWithMax(this.rows)
  }

  /**
   * Gets a random column index.
   * @returns {number} Random column between 0 and cols-1
   */
  randomColumn () {
    return Random.integerWithMax(this.cols)
  }

  /**
   * Checks if coordinates are within map bounds.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if coordinates are valid
   */
  inBounds (r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols
  }

  /**
   * Creates a blank grid of the map dimensions.
   * @returns {Array<Array>} 2D array filled with null values
   */
  get blankGrid () {
    return Array.from({ length: this.rows }, () =>
      new Array(this.cols).fill(null)
    )
  }

  /**
   * Gets all surrounding coordinates including the center position.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Array<Array<number>>} Array of [row, col] coordinates
   */
  surroundArea (r, c) {
    let surroundings = []
    this.surroundBase(r, c, this.inBounds.bind(this), surroundings)
    return surroundings
  }

  /**
   * Gets all surrounding coordinates excluding the center position.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Array<Array<number>>} Array of [row, col] coordinates
   */
  surround (r, c) {
    let surroundings = []
    const isValid = (rr, cc) => (cc !== c || rr !== r) && this.inBounds(rr, cc)
    this.surroundBase(r, c, isValid, surroundings)
    return surroundings
  }

  /**
   * Base method for getting surrounding coordinates with custom validation.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Function} isValid - Validation function for coordinates
   * @param {Array} surroundings - Array to populate with valid coordinates
   */
  surroundBase (r, c, isValid, surroundings) {
    for (let rr = r - 1; rr <= r + 1; rr++) {
      for (let cc = c - 1; cc <= c + 1; cc++) {
        if (isValid(rr, cc)) {
          surroundings.push([rr, cc])
        }
      }
    }
  }

  /**
   * Checks if a rectangular area fits within map bounds.
   * @param {number} r - Starting row
   * @param {number} c - Starting column
   * @param {number} height - Height of the area
   * @param {number} width - Width of the area
   * @returns {boolean} True if the area fits within bounds
   */
  inAllBounds (r, c, height, width) {
    return r >= 0 && r + height < this.rows && c + width >= 0 && c < this.cols
  }

  /**
   * Adds land at the specified coordinates (not implemented in base class).
   * @param {number} _r - Row coordinate
   * @param {number} _c - Column coordinate
   * @throws {Error} Always throws "Not a custom map"
   */
  addLand (_r, _c) {
    throw new Error('Not a custom map')
  }

  /**
   * Gets the subterrain at the specified coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object} The subterrain object
   */
  subterrain (r, c) {
    return this.subterrainTrackers.subterrain(
      r,
      c,
      this.terrain.defaultSubterrain
    )
  }

  /**
   * Gets zone detail at the specified coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object} Zone detail information
   */
  zoneDetail (r, c) {
    return this.subterrainTrackers.zoneDetail(r, c)
  }

  /**
   * Gets the zone at the specified coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object} Zone information
   */
  zone (r, c) {
    return this.subterrainTrackers.zone(r, c)
  }

  /**
   * Gets zone information at the specified coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @param {Object} [zoneDetail] - Optional zone detail override
   * @returns {Object} Zone information
   */
  zoneInfo (r, c, zoneDetail) {
    return this.subterrainTrackers.zoneInfo(r, c, zoneDetail)
  }

  /**
   * Checks if the specified coordinates are land.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if the position is land
   */
  isLand (r, c) {
    return this.landMask.test(c, r)
  }

  /**
   * Gets the tag for the terrain at the specified coordinates.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {string} Terrain tag
   */
  tag (r, c) {
    return this.terrain.subterrainTag(this.isLand(r, c)) || ''
  }

  /**
   * Gets all possible terrain tags.
   * @returns {string} All subterrain tags
   */
  allTags () {
    return this.terrain.allSubterrainTag() || ''
  }

  /**
   * Applies terrain tags to a cell.
   * @param {Object} cell - The cell to tag
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   */
  tagCell (cell, r, c) {
    const allTags = this.allTags()
    cell.remove(...allTags)
    const tag = this.tag(r, c)

    const checker = (r + c) % 2 === 0
    cell.add(tag, checker ? 'light' : 'dark')
  }

  /**
   * Creates a saved version of this map with a new title.
   * @param {string} [newTitle] - Optional new title for the saved map
   * @returns {EditedCustomMap} A new saved map instance
   */
  savedMap (newTitle) {
    newTitle = newTitle || makeTitle(this.terrain, this.cols, this.rows)
    const terrain = bh.getTerrainByTag(this.terrain.tag)

    const data = { ...this }
    data.terrain = terrain
    const clone = new EditedCustomMap(data)
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.isLand(i, j)) clone.addLand(i, j)
      }
    }
    clone.title = newTitle
    return clone
  }

  /**
   * Creates a clone of this map with a new title and saves it to localStorage.
   * @param {string} [newTitle] - Optional new title for the cloned map
   * @returns {EditedCustomMap} A new cloned map instance
   */
  clone (newTitle) {
    newTitle = newTitle || makeTitle(this.terrain, this.cols, this.rows)

    const clonedMap = this.savedMap(newTitle)
    clonedMap.saveToLocalStorage(newTitle)
    return clonedMap
  }

  /**
   * Gets the export name for this map.
   * @returns {string} The export name
   */
  exportName () {
    return this.name + ' copy'
  }

  /**
   * Converts this map to a JSON string for export.
   * @param {string} [newTitle] - Optional title for the exported map
   * @returns {string} JSON string representation of the map
   */
  jsonString (newTitle) {
    newTitle = newTitle || this.exportName()
    const exportingMap = this.savedMap(newTitle)
    return exportingMap.jsonString()
  }
}

/**
 * Represents a custom user-created map that can be modified.
 * Extends BhMap with land editing capabilities.
 */
export class CustomMap extends BhMap {
  /**
   * Creates a new CustomMap instance.
   * @param {string} title - The map title
   * @param {Array<number>} size - Array [rows, cols] defining map dimensions
   * @param {Object} shipNum - Object mapping ship letters to quantities
   * @param {Set} land - Set of land coordinates
   * @param {Object} mapTerrain - The terrain configuration
   * @param {Object} [example] - Optional example data
   */
  constructor (title, size, shipNum, land, mapTerrain, example) {
    super(title, size, shipNum, [], title, mapTerrain || bh.terrain, land)
    this.isPreGenerated = false
    this.example = example
    this.weapons = [standardShot]
  }

  /**
   * Checks if the specified coordinates are land.
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if the position is land
   */
  isLand (r, c) {
    return this.land.has(makeKey(r, c))
  }

  /**
   * Gets the export name for this map.
   * @returns {string} The export name
   */
  exportName () {
    return this.title
  }

  /**
   * Converts this map to a plain object for JSON serialization.
   * @returns {Object} Plain object representation of the map
   */
  jsonObj () {
    return {
      title: this.title,
      name: this.name,
      rows: this.rows,
      cols: this.cols,
      shipNum: this.shipNum,
      landArea: this.landArea,
      land: [...this.land],
      terrain: this.terrain.title,
      isPreGenerated: this.isPreGenerated,
      example: this.example,
      weapons: this.weapons
    }
  }

  /**
   * Converts this map to a JSON string.
   * @returns {string} JSON string representation of the map
   */
  jsonString () {
    const data = this.jsonObj()
    return JSON.stringify(
      data,
      (key, value) => (typeof value === 'bigint' ? undefined : value),
      2
    )
  }

  /**
   * Saves this map to localStorage.
   * @param {string} [title] - Optional title for the saved map
   * @param {string} [key] - Optional localStorage key
   */
  saveToLocalStorage (title, key) {
    title = title || makeTitle(this.terrain, this.cols, this.rows)
    key = key || this.localStorageKey(title)

    localStorage.setItem(key, this.jsonString())

    this.terrain.updateCustomMaps(title)
  }

  /**
   * Gets the localStorage key for this map.
   * @param {string} [title] - Optional title to use in the key
   * @returns {string} The localStorage key
   */
  localStorageKey (title) {
    this.title = title || makeTitle(this.terrain, this.cols, this.rows)
    return `${oldToken}.${this.title}`
  }
}

/**
 * Mixin that adds land modification capabilities to map classes.
 * @param {Function} Base - The base class to extend
 * @returns {Function} The extended class with modification methods
 */
const withModifyable = Base =>
  class extends Base {
    /**
     * Creates a new instance with modification capabilities.
     * @param {...*} args - Arguments to pass to the base constructor
     */
    constructor (...args) {
      super(...args) // REQUIRED
    }

    /**
     * Adds land at the specified coordinates.
     * @param {number} r - Row coordinate
     * @param {number} c - Column coordinate
     */
    addLand (r, c) {
      if (this.inBounds(r, c)) this.land.add(makeKey(r, c))
    }

    /**
     * Removes land at the specified coordinates.
     * @param {number} r - Row coordinate
     * @param {number} c - Column coordinate
     */
    removeLand (r, c) {
      if (this.inBounds(r, c)) this.land.delete(makeKey(r, c))
    }

    /**
     * Adds ships to the map's ship count.
     * @param {Array} ships - Array of ship objects with letter properties
     */
    addShips (ships) {
      this.shipNum = {}
      for (const ship of ships) {
        this.shipNum[ship.letter] = (this.shipNum[ship.letter] || 0) + 1
      }
    }

    /**
     * Sets land or water at the specified coordinates based on subterrain.
     * @param {number} r - Row coordinate
     * @param {number} c - Column coordinate
     * @param {Object} subterrain - The subterrain object with isDefault property
     */
    setLand (r, c, subterrain) {
      if (subterrain.isDefault) {
        this.removeLand(r, c)
      } else {
        this.addLand(r, c)
      }
    }
  }

/**
 * Represents a blank custom map that can be modified.
 * Extends CustomMap with modification capabilities.
 */
export class CustomBlankMap extends withModifyable(CustomMap) {
  /**
   * Creates a new blank custom map.
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @param {Object} [mapTerrain] - Optional terrain configuration
   */
  constructor (rows, cols, mapTerrain) {
    super(
      makeTitle(mapTerrain || bh.terrain, cols, rows),
      [rows, cols],
      0,
      new Set(),
      mapTerrain || bh.terrain
    )
  }

  /**
   * Gets the index token for this map's dimensions.
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @returns {string} The index token
   */
  indexToken (rows, cols) {
    return getCopyNumKey(this.terrain, cols, rows)
  }

  /**
   * Resizes the map and removes land outside the new bounds.
   * @param {number} rows - New number of rows
   * @param {number} cols - New number of columns
   */
  setSize (rows, cols) {
    this.title = makeTitle(this.terrain, cols, rows)
    this.rows = rows
    this.cols = cols
    for (const key of this.land) {
      const [r, c] = key.split(',').map(n => Number.parseInt(n, 10))
      if (!this.inBounds(r, c)) this.land.delete(key)
    }
  }
}

/**
 * Represents a saved custom map loaded from localStorage.
 * Extends CustomMap with loading and persistence capabilities.
 */
export class SavedCustomMap extends CustomMap {
  /**
   * Creates a new SavedCustomMap from saved data.
   * @param {Object} data - The saved map data
   */
  constructor (data) {
    super(
      data.title,
      [data.rows, data.cols],
      data.shipNum,
      new Set(data.land),
      data?.terrain?.subterrains
        ? data.terrain
        : bh.terrainByTitle(data.terrain),
      data.example
    )

    const weapons = data.weapons.map(w =>
      this.terrain.getNewWeapon(w.letter, w.ammo)
    )
    this.weapons = [standardShot].concat(weapons.filter(Boolean))
  }

  /**
   * Loads map data from localStorage by title.
   * @param {string} title - The map title
   * @returns {Object|null} The loaded map data object, or null if not found
   */
  static loadObj (title) {
    const newLocal = `${oldToken}.${title}`
    const data = localStorage.getItem(newLocal)
    if (!data) return null
    const obj = JSON.parse(data)
    return obj
  }

  /**
   * Loads a saved custom map from localStorage.
   * @param {string} title - The map title
   * @returns {SavedCustomMap|null} The loaded map, or null if not found
   */
  static load (title) {
    const obj = SavedCustomMap.loadObj(title)
    if (obj) return new SavedCustomMap(obj)

    console.log("Can't Load Map : ", title)
    return null
  }

  /**
   * Gets the localStorage key for this map.
   * @returns {string} The localStorage key
   */
  localStorageKey () {
    return `${oldToken}.${this.title}`
  }

  /**
   * Removes this map from localStorage and terrain records.
   */
  remove () {
    const key = this.localStorageKey()
    const title = this.title
    localStorage.removeItem(key)
    const check = localStorage.getItem(key)
    if (check) {
      throw new Error('Failed to delete map with key ' + key)
    }

    this.terrain.deleteCustomMaps(title)
  }

  /**
   * Renames this map and saves it with the new name.
   * @param {string} newTitle - The new title for the map
   */
  rename (newTitle) {
    this.remove()
    this.title = newTitle
    this.saveToLocalStorage(newTitle)
  }

  /**
   * Creates a clone of this map with a new title.
   * @param {string} [newTitle] - Optional new title for the clone
   */
  clone (newTitle) {
    newTitle = newTitle || makeTitle(this.terrain, this.cols, this.rows)
    this.title = newTitle
    const key = this.localStorageKey()
    this.saveToLocalStorage(newTitle, key)

    const check = localStorage.getItem(key)
    if (!check) {
      throw new Error('Failed to copy map with key ' + key)
    }
  }
}

/**
 * Represents an edited custom map with modification capabilities.
 * Extends SavedCustomMap with the withModifyable mixin.
 */
export class EditedCustomMap extends withModifyable(SavedCustomMap) {
  /**
   * Creates a new EditedCustomMap instance.
   * @param {...*} args - Arguments to pass to the base constructor
   */
  constructor (...args) {
    super(...args) // REQUIRED
  }

  /**
   * Loads an edited custom map from localStorage.
   * @param {string} title - The map title
   * @returns {EditedCustomMap|null} The loaded map, or null if not found
   */
  static load (title) {
    const obj = SavedCustomMap.loadObj(title)
    if (obj) {
      return new EditedCustomMap(obj)
    } else {
      return null
    }
  }
}
