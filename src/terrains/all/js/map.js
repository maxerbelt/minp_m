import { makeKey, lazy } from '../../../core/utilities.js'
import { Random } from '../../../core/Random.js'
import { oldToken } from './terrain.js'
import { SubTerrainTrackers } from './SubTerrainTrackers.js'
import { bh } from './bh.js'
import { standardShot } from '../../../weapon/Weapon.js'
import { Mask } from '../../../grid/rectangle/mask.js'
import { getCopyNumKey, makeTitle } from './makeTitle.js'

/**
 * @typedef {import('../../../weapon/Weapon.js').Weapon} Weapon
 * @typedef {new (...args: any[]) => any} Constructor
 * @typedef {Array<number>} RangeElement - A range element [row, colStart, colEnd] representing a row and column span
 */

/**
 * Creates a function to check if an element is within a range.
 * Geometry helper for checking if a point falls within a row range.
 *
 * @param {number} r - Row coordinate to check
 * @param {number} c - Column coordinate to check
 * @returns {(element: RangeElement) => boolean} Function that tests if element [r, c1, c2] contains point (r, c)
 */
export const inRange = (r, c) => element =>
  element[0] == r && element[1] <= c && element[2] >= c
/**
 * Base class for terrain maps with common functionality.
 * Handles map geometry, terrain tracking, and basic operations.
 * Provides lazy-loaded properties and terrain management features.
 *
 * @class BhMap
 * @classdesc Central map system managing terrain, dimensions, land areas, and game mechanics
 */
export class BhMap {
  /** @type {string} - Map title/display name shown to players */
  title
  /** @type {string} - Internal map identifier/name used for storage and references */
  name
  /** @type {number} - Number of rows in the map grid */
  rows
  /** @type {number} - Number of columns in the map grid */
  cols
  /** @type {number|Object<string, number>} - Number of ships or map of ship counts by type letter */
  shipNum
  /** @type {Array<RangeElement>} - Array of land area ranges [row, colStart, colEnd] */
  landArea
  /** @type {Set<string>} - Set of land cell coordinates as comma-separated strings */
  land
  /** @type {Object} - Terrain configuration object with subterrains and properties */
  terrain
  /** @type {bigint} - Bitfield representation of land areas for efficient storage */
  landBits
  /** @type {bigint} - Bitfield representation of default (non-land) terrain areas */
  defaultTerrainBits
  /** @type {Mask} - Mask object representing default terrain cells */
  defaultTerrainMask
  /** @type {Mask} - Mask object representing land area cells */
  landMask
  /** @type {SubTerrainTrackers} - Tracker managing subterrain regions and zones */
  subterrainTrackers
  /** @type {boolean} - Whether this map is pre-generated (true) or custom (false) */
  isPreGenerated
  /** @type {Array<Weapon>} - Array of weapons available for use on this map */
  weapons

  /**
   * Creates a new BhMap instance with terrain configuration.
   * Initializes lazy-loaded properties for masks and terrain tracking.
   * Sets up land masks from either landArea ranges or individual coordinates.
   *
   * @constructor
   * @param {string} title - The map title/display name
   * @param {Array<number>} size - Array [rows, cols] defining map dimensions
   * @param {number|Object<string, number>} shipNum - Number of ships or map of ship-type counts (e.g., {A: 2, B: 1})
   * @param {Array<RangeElement>} landArea - Array of land area ranges [row, colStart, colEnd]
   * @param {string} name - The internal map name identifier
   * @param {Object} mapTerrain - The terrain configuration object with subterrains and properties
   * @param {Set<string>} [land] - Optional set of land coordinates; created as empty Set if not provided
   * @throws {Error} Logs warning if terrain is invalid and uses default bh.terrain
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

    const landMask = this.blankMask
    if (this.landArea && this.landArea.length > 0) {
      landMask.setRanges(this.landArea)
    } else {
      for (const coord of this.land) {
        const [row, col] = coord.split(',').map(Number)
        landMask.set(col, row)
      }
    }
    this.landMask = landMask
    this.landBits = landMask.bits

    lazy(this, 'defaultTerrainBits', () => {
      return this.landMask.invertedBits
    })

    lazy(this, 'defaultTerrainMask', () => {
      const mask = this.blankMask
      mask.bits = this.defaultTerrainBits
      return mask
    })

    if (!this?.terrain?.subterrains) {
      console.log('map called with bad parameter : ', this.terrain)
      this.terrain = bh.terrain
    }

    this.subterrainTrackers = new SubTerrainTrackers(this?.terrain?.subterrains)
    this.subterrainTrackers.calc(this)
    this.isPreGenerated = true
    /** @type {Array<import('../../../weapon/Weapon.js').Weapon>} */
    this.weapons = this._initializeWeapons()
  }
  /**
   * Initializes weapons for this map based on terrain.
   * Includes standard shot plus any terrain-specific weapons from the terrain configuration.
   *
   * @protected
   * @returns {Array<Weapon>} Initialized weapons array with standard shot and terrain weapons
   */
  _initializeWeapons () {
    const weapons = [standardShot]
    if (this.terrain?.weapons?.getAllWeapons) {
      const terrainWeapons = this.terrain.weapons.getAllWeapons()
      weapons.push(...terrainWeapons)
    }
    return weapons
  }

  /**
   * Gets an empty mask for this map's dimensions.
   * All cells are initially unset (0) and ready for marking.
   *
   * @public
   * @returns {Mask} A new empty mask with dimensions matching this map (cols × rows)
   */
  get blankMask () {
    return Mask.empty(this.cols, this.rows)
  }

  /**
   * Gets a full mask for this map's dimensions.
   * All cells are set (1) and enabled for operations.
   *
   * @public
   * @returns {Mask} A new full mask with all cells enabled and dimensions matching this map
   */
  get fullMask () {
    return Mask.full(this.cols, this.rows)
  }

  /**
   * Gets extra armed fleet shapes for this map.
   * Includes ships that are attached to weapon racks.
   *
   * @public
   * @returns {Array<Object>} Array of ship shape objects with armed weapons attached to racks
   */
  get extraArmedFleetForMap () {
    const repeatShapes = this.newShapesForMap
    const ships = bh.extraFleetBuilder(repeatShapes, s => s.isAttachedToRack)
    return ships
  }

  /**
   * Gets the new fleet shapes for this map.
   * Includes all ships based on shipNum configuration.
   *
   * @public
   * @returns {Array<Object>} Array of ship shape objects ready for placement
   */
  get newFleetForMap () {
    const repeatShapes = this.newShapesForMap
    const ships = bh.fleetBuilder(repeatShapes)
    return ships
  }

  /**
   * Gets the base shapes repeated according to ship numbers.
   * Each base shape is duplicated according to shipNum configuration.
   *
   * @public
   * @returns {Array<Object>} Array of repeated ship shape objects for fleet composition
   */
  get newShapesForMap () {
    const terrain = this.terrain
    const baseShapes = terrain.ships.baseShapes
    const shipNum = this.shipNum
    const repeatShapes = baseShapes.flatMap(
      s => new Array(shipNum[s.letter] || 0).fill(s) || []
    )
    return repeatShapes
  }
  /**
   * Gets a random edge position, optionally biased by row/column.
   * If a row or column is provided, selects an edge closer to that coordinate.
   *
   * @public
   * @param {number} [r] - Optional row coordinate to bias edge selection (top edge if < rows/2)
   * @param {number} [c] - Optional column coordinate to bias edge selection (left edge if < cols/2)
   * @returns {Array<number>} [row, col] coordinates on the map edge
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
   * Gets the nearest corner to the specified coordinates.
   * Returns the corner (top-left, top-right, bottom-left, or bottom-right) closest to the given point.
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Array<number>} [row, col] coordinates of the nearest corner
   */
  nearestCornerTo (r, c) {
    const r0 = r < this.rows / 2 ? this.rows - 1 : 0
    const c0 = c < this.cols / 2 ? this.cols - 1 : 0
    return [r0, c0]
  }

  /**
   * Gets a random position on a specific edge.
   * Edges are numbered: 0=top, 1=bottom, 2=left, 3=right.
   *
   * @public
   * @param {number} [edge] - Edge number (0-3); randomly selected if undefined
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
   * Gets a random row index within map bounds.
   *
   * @public
   * @returns {number} Random row between 0 and rows-1 (inclusive)
   */
  randomRow () {
    return Random.integerWithMax(this.rows)
  }

  /**
   * Gets a random column index within map bounds.
   *
   * @public
   * @returns {number} Random column between 0 and cols-1 (inclusive)
   */
  randomColumn () {
    return Random.integerWithMax(this.cols)
  }

  /**
   * Checks if coordinates are within map bounds.
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if 0 <= r < rows and 0 <= c < cols, false otherwise
   */
  inBounds (r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols
  }

  /**
   * Creates a blank grid of the map dimensions.
   *
   * @public
   * @returns {Array<Array<?Object>>} 2D array of rows × cols filled with null values
   */
  get blankGrid () {
    return Array.from({ length: this.rows }, () =>
      new Array(this.cols).fill(null)
    )
  }

  /**
   * Gets all surrounding coordinates including the center position.
   * Returns up to 9 coordinates: the center and up to 8 neighbors (filtered by inBounds).
   *
   * @public
   * @param {number} r - Row coordinate of center
   * @param {number} c - Column coordinate of center
   * @returns {Array<Array<number>>} Array of [row, col] coordinates within bounds
   */
  surroundArea (r, c) {
    let surroundings = []
    this.surroundBase(r, c, this.inBounds.bind(this), surroundings)
    return surroundings
  }

  /**
   * Gets all surrounding coordinates excluding the center position.
   * Returns up to 8 coordinates: the neighbors excluding the center point.
   *
   * @public
   * @param {number} r - Row coordinate of center
   * @param {number} c - Column coordinate of center
   * @returns {Array<Array<number>>} Array of [row, col] coordinates within bounds, excluding center
   */
  surround (r, c) {
    let surroundings = []
    const isValid = (rr, cc) => (cc !== c || rr !== r) && this.inBounds(rr, cc)
    this.surroundBase(r, c, isValid, surroundings)
    return surroundings
  }

  /**
   * Base method for getting surrounding coordinates with custom validation.
   * Adds coordinates to surrounding array if they pass the isValid check.
   *
   * @public
   * @param {number} r - Center row coordinate
   * @param {number} c - Center column coordinate
   * @param {(rr: number, cc: number) => boolean} isValid - Validation function for coordinates
   * @param {Array<Array<number>>} surroundings - Array to populate with valid [row, col] coordinates
   * @returns {void}
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
   *
   * @public
   * @param {number} r - Starting row (top-left)
   * @param {number} c - Starting column (top-left)
   * @param {number} height - Height of the rectangular area
   * @param {number} width - Width of the rectangular area
   * @returns {boolean} True if all cells (r, r+height) × (c, c+width) are within bounds
   */
  inAllBounds (r, c, height, width) {
    return r >= 0 && r + height < this.rows && c + width >= 0 && c < this.cols
  }

  /**
   * Adds land at the specified coordinates.
   * Only applicable to custom maps; base class throws error.
   *
   * @public
   * @param {number} _r - Row coordinate (unused in base class)
   * @param {number} _c - Column coordinate (unused in base class)
   * @throws {Error} Always throws "Not a custom map" in base class
   * @returns {void}
   */
  addLand (_r, _c) {
    throw new Error('Not a custom map')
  }

  /**
   * Gets the subterrain at the specified coordinates.
   * Subterrains represent specific terrain variations (water types, ground types, etc.).
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object} The subterrain object with properties like isDefault, tag, etc.
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
   * Zone detail includes information about terrain zones and their properties.
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object} Zone detail information with zone properties
   */
  zoneDetail (r, c) {
    return this.subterrainTrackers.zoneDetail(r, c)
  }

  /**
   * Gets the zone at the specified coordinates.
   * A zone represents a region of similar terrain properties.
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {Object} Zone information object
   */
  zone (r, c) {
    return this.subterrainTrackers.zone(r, c)
  }

  /**
   * Gets zone information at the specified coordinates.
   * Can optionally use provided zone detail instead of calculating it.
   *
   * @public
   * @param {number} y - Row coordinate
   * @param {number} x - Column coordinate
   * @param {Object} [zoneDetail] - Optional pre-calculated zone detail to use instead of fetching
   * @returns {Object} Zone information object
   */
  zoneInfo (x, y, zoneDetail) {
    return this.subterrainTrackers.zoneInfo(x, y, zoneDetail)
  }

  /**
   * Checks if the specified coordinates are land.
   * Uses the landMask to determine if a cell is land or water.
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if the position is land, false if water
   */
  isLand (r, c) {
    return this.landMask.test(c, r)
  }

  /**
   * Gets the tag for the terrain at the specified coordinates.
   * Tags identify terrain types (e.g., 'water', 'grass', 'rock', 'asteroid').
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {string} Terrain tag string, or empty string if no tag found
   */
  tag (r, c) {
    return this.terrain.subterrainTag(this.isLand(r, c)) || ''
  }

  /**
   * Gets all possible terrain tags for this map's terrain.
   * Aggregates all subterrain tags into a single concatenated string.
   *
   * @public
   * @returns {string} Concatenated string of all subterrain tags
   */
  allTags () {
    return this.terrain.allSubterrainTag() || ''
  }

  /**
   * Applies terrain tags to a cell element.
   * Removes all existing terrain tags and applies the appropriate one.
   * Also applies light/dark checkerboard styling based on row+col parity.
   *
   * @public
   * @param {Object} cell - DOM element or object with add/remove methods for CSS classes
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {void}
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
   * Converts a BhMap to an EditedCustomMap for persistence and editing.
   *
   * @public
   * @param {string} [newTitle] - Optional new title for the saved map; auto-generated if omitted
   * @returns {EditedCustomMap} A new saved custom map instance with all land data copied
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
   * The cloned map is stored with localStorage key based on the new title.
   *
   * @public
   * @param {string} [newTitle] - Optional new title for the cloned map; auto-generated if omitted
   * @returns {EditedCustomMap} A new cloned map instance stored in localStorage
   */
  clone (newTitle) {
    newTitle = newTitle || makeTitle(this.terrain, this.cols, this.rows)

    const clonedMap = this.savedMap(newTitle)
    clonedMap.saveToLocalStorage(newTitle)
    return clonedMap
  }

  /**
   * Gets the export name for this map.
   * Used when exporting map data; appends ' copy' suffix to the internal name.
   *
   * @public
   * @returns {string} The export name (internal name + ' copy')
   */
  exportName () {
    return this.name + ' copy'
  }

  /**
   * Converts this map to a JSON string for export.
   * Filters out bigint values which cannot be serialized to JSON.
   *
   * @public
   * @param {string} [newTitle] - Optional title for the exported map; uses exportName() if omitted
   * @returns {string} Formatted JSON string representation of the map data
   */
  jsonString (newTitle) {
    newTitle = newTitle || this.exportName()
    const exportingMap = this.savedMap(newTitle)
    return exportingMap.jsonString()
  }
}

/**
 * Represents a custom user-created map that can be modified.
 * Extends BhMap with land editing capabilities and persistence.
 * Uses a Set of coordinates to track land instead of pre-generated ranges.
 *
 * @class CustomMap
 * @extends BhMap
 * @classdesc User-editable map with localStorage persistence
 */
export class CustomMap extends BhMap {
  /**
   * Creates a new CustomMap instance.
   * Unlike BhMap, custom maps use a Set to track land coordinates instead of ranges.
   *
   * @constructor
   * @param {string} title - The display title of the map shown to players
   * @param {Array<number>} size - Array [rows, cols] defining map dimensions
   * @param {number|Object<string, number>} shipNum - Number of ships or ship-type count map (e.g., {A: 2, B: 1})
   * @param {Set<string>} land - Set of land cell coordinates as comma-separated strings
   * @param {Object} mapTerrain - The terrain configuration object
   * @param {Object} [example] - Optional example or reference data for this map
   */
  constructor (title, size, shipNum, land, mapTerrain, example) {
    super(title, size, shipNum, [], title, mapTerrain || bh.terrain, land)
    this.isPreGenerated = false
    this.example = example
    this.weapons = this._initializeWeapons()
  }

  /**
   * Checks if the specified coordinates are land in this custom map.
   * Uses the land Set to determine land status efficiently.
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if the coordinate is in the land Set, false otherwise
   */
  isLand (r, c) {
    return this.land.has(makeKey(r, c))
  }

  /**
   * Gets the export name for this custom map.
   * For custom maps, the export name is the title itself.
   *
   * @public
   * @returns {string} The map's title (no suffix appended)
   */
  exportName () {
    return this.title
  }

  /**
   * Converts this map to a plain object for JSON serialization.
   * Excludes bigint and function properties which cannot be serialized.
   *
   * @public
   * @returns {Object} Plain object with all map properties suitable for JSON.stringify()
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
   * Bigint values are filtered out as they cannot be serialized to JSON.
   *
   * @public
   * @returns {string} Pretty-printed (2-space indent) JSON string of the map data
   */
  jsonString () {
    const data = this.jsonObj()
    return JSON.stringify(
      data,
      (_key, value) => (typeof value === 'bigint' ? undefined : value),
      2
    )
  }

  /**
   * Saves this map to localStorage.
   * Stores the JSON representation and updates the terrain's custom maps list.
   *
   * @public
   * @param {string} [title] - Optional title for the saved map; auto-generated if omitted
   * @param {string} [key] - Optional localStorage key; computed from title if omitted
   * @returns {void}
   */
  saveToLocalStorage (title, key) {
    title = title || makeTitle(this.terrain, this.cols, this.rows)
    key = key || this.localStorageKey(title)

    localStorage.setItem(key, this.jsonString())

    this.terrain.updateCustomMaps(title)
  }

  /**
   * Gets the localStorage key for this map.
   * The key combines the oldToken prefix with the map's title.
   *
   * @public
   * @param {string} [title] - Optional title to use in the key; uses current title if omitted
   * @returns {string} The localStorage key in format: `{oldToken}.{title}`
   */
  localStorageKey (title) {
    this.title = title || makeTitle(this.terrain, this.cols, this.rows)
    return `${oldToken}.${this.title}`
  }
}

/**
 * Mixin that adds land modification capabilities to map classes.
 * Provides methods to add, remove, and modify land at map coordinates.
 *
 * @param {Constructor} Base - The base class to extend (must have land Set, inBounds method)
 * @returns {Constructor} The extended class with modification methods
 */
const withModifyable = Base =>
  class extends Base {
    /**
     * Adds land at the specified coordinates.
     * Only adds if coordinates are within map bounds.
     *
     * @public
     * @param {number} r - Row coordinate
     * @param {number} c - Column coordinate
     * @returns {void}
     */
    addLand (r, c) {
      if (this.inBounds(r, c)) this.land.add(makeKey(r, c))
    }

    /**
     * Removes land at the specified coordinates.
     * Only removes if coordinates are within map bounds.
     *
     * @public
     * @param {number} r - Row coordinate
     * @param {number} c - Column coordinate
     * @returns {void}
     */
    removeLand (r, c) {
      if (this.inBounds(r, c)) this.land.delete(makeKey(r, c))
    }

    /**
     * Adds ships to the map's ship count.
     * Replaces the current shipNum with counts based on the provided ships array.
     *
     * @public
     * @param {Array<Object>} ships - Array of ship objects, each with a letter property
     * @returns {void}
     */
    addShips (ships) {
      this.shipNum = {}
      for (const ship of ships) {
        this.shipNum[ship.letter] = (this.shipNum[ship.letter] || 0) + 1
      }
    }

    /**
     * Sets land or water at the specified coordinates based on subterrain type.
     * If subterrain.isDefault is true, removes land (water); otherwise adds land.
     *
     * @public
     * @param {number} r - Row coordinate
     * @param {number} c - Column coordinate
     * @param {Object} subterrain - The subterrain object with isDefault property
     * @returns {void}
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
 * Extends CustomMap with the withModifyable mixin for land editing capabilities.
 * Starts with no land and can be populated by the user.
 * Inherits: addLand, removeLand, addShips, setLand from withModifyable mixin.
 *
 * @class CustomBlankMap
 * @extends CustomMap
 * @classdesc Editable blank map starting with empty land set; includes modification methods
 */
export class CustomBlankMap extends withModifyable(CustomMap) {
  /**
   * Creates a new blank custom map with empty land.
   * The title is auto-generated from terrain and dimensions.
   *
   * @constructor
   * @param {number} rows - Number of rows for the map grid
   * @param {number} cols - Number of columns for the map grid
   * @param {Object} [mapTerrain] - Optional terrain configuration; uses default if omitted
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
   * Used to generate unique identifiers for maps of the same size.
   *
   * @public
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @returns {string} The index token for this dimension combination
   */
  indexToken (rows, cols) {
    return getCopyNumKey(this.terrain, cols, rows)
  }

  /**
   * Resizes the map and removes land outside the new bounds.
   * Prunes land coordinates that fall outside the new dimensions.
   *
   * @public
   * @param {number} rows - New number of rows for the map
   * @param {number} cols - New number of columns for the map
   * @returns {void}
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
 * Extends CustomMap with loading, persistence, and management capabilities.
 * Provides static methods for loading maps and instance methods for deletion/renaming.
 *
 * @class SavedCustomMap
 * @extends CustomMap
 * @classdesc Persistent custom map loaded from and saved to localStorage
 */
export class SavedCustomMap extends CustomMap {
  /**
   * Creates a new SavedCustomMap from saved data.
   * Reconstructs weapons from the saved weapon specifications.
   *
   * @constructor
   * @param {Object} data - The saved map data object from localStorage
   * @param {string} data.title - Map title shown to players
   * @param {number} data.rows - Number of rows in the grid
   * @param {number} data.cols - Number of columns in the grid
   * @param {number|Object<string, number>} data.shipNum - Ship counts by type letter
   * @param {Array<string>} data.land - Array of land cell coordinates as strings
   * @param {string|Object} data.terrain - Terrain name or terrain object with subterrains
   * @param {Array<Object>} [data.weapons] - Array of weapon specifications with letter and ammo properties
   * @param {Object} [data.example] - Optional example or reference data
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

    // Get saved custom weapons
    const customWeapons = data.weapons.map(w =>
      this.terrain.getNewWeapon(w.letter, w.ammo)
    )

    // Include terrain's default weapons plus any custom saved weapons
    const terrainWeapons = this.terrain?.weapons?.getAllWeapons
      ? this.terrain.weapons.getAllWeapons()
      : []
    this.weapons = [standardShot, ...terrainWeapons].concat(
      customWeapons.filter(Boolean)
    )
  }

  /**
   * Loads map data from localStorage by title.
   * Returns the raw saved data object without constructing a SavedCustomMap.
   *
   * @public
   * @param {string} title - The map title to load from localStorage
   * @returns {Object|null} The loaded map data object, or null if not found
   * @static
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
   * Returns null and logs a message if the map is not found.
   *
   * @public
   * @param {string} title - The map title to load from localStorage
   * @returns {SavedCustomMap|null} The loaded SavedCustomMap instance, or null if not found
   * @static
   */
  static load (title) {
    const obj = SavedCustomMap.loadObj(title)
    if (obj) return new SavedCustomMap(obj)

    console.log("Can't Load Map : ", title)
    return null
  }

  /**
   * Gets the localStorage key for this map.
   * The key combines the oldToken prefix with the map's title.
   *
   * @public
   * @returns {string} The localStorage key in format: `{oldToken}.{title}`
   */
  localStorageKey () {
    return `${oldToken}.${this.title}`
  }

  /**
   * Removes this map from localStorage and terrain records.
   * Throws an error if deletion fails (map still in storage).
   *
   * @public
   * @throws {Error} If deletion fails with message about the localStorage key
   * @returns {void}
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
   * Removes the old map from storage and persists with the new title.
   *
   * @public
   * @param {string} newTitle - The new title/name for the map
   * @returns {void}
   */
  rename (newTitle) {
    this.remove()
    this.title = newTitle
    this.saveToLocalStorage(newTitle)
  }

  /**
   * Creates a clone of this map with a new title and saves it to localStorage.
   * Throws an error if the clone creation fails.
   *
   * @public
   * @param {string} [newTitle] - Optional new title; auto-generated if omitted
   * @throws {Error} If cloning fails with message about the localStorage key
   * @returns {EditedCustomMap} The newly created and saved clone
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

    return new EditedCustomMap(this)
  }
}

/**
 * Represents an edited custom map with modification capabilities.
 * Extends SavedCustomMap with the withModifyable mixin for land editing.
 * Provides the full interface for loading, editing, and persisting custom maps.
 * Inherits: addLand, removeLand, addShips, setLand from withModifyable mixin.
 * Inherits: load, loadObj, localStorageKey, remove, rename from SavedCustomMap.
 *
 * @class EditedCustomMap
 * @extends SavedCustomMap
 * @classdesc Fully editable custom map with persistence and modification capabilities
 */
export class EditedCustomMap extends withModifyable(SavedCustomMap) {
  /**
   * Loads an edited custom map from localStorage.
   * Returns null if not found; no log message is printed.
   *
   * @public
   * @param {string} title - The map title to load from localStorage
   * @returns {EditedCustomMap|null} The loaded EditedCustomMap with edit capabilities, or null if not found
   * @static
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
