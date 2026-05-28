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
 * Represents a weapon that can be used on maps with ammo and targeting capabilities.
 *
 * @typedef {new (...args: any[]) => any} Constructor
 * Generic constructor type for class-based mixins and extensions.
 *
 * @typedef {Array<number>} RangeElement
 * A range element [row, colStart, colEnd] representing a contiguous span of land in a row.
 * @property {number} 0 - Row index
 * @property {number} 1 - Starting column (inclusive)
 * @property {number} 2 - Ending column (inclusive)
 */

/**
 * Creates a function to check if an element is within a range.
 * Geometry helper for checking if a point falls within a row range.
 * Used to test if coordinates fall within a RangeElement land area.
 *
 * @param {number} r - Row coordinate to check
 * @param {number} c - Column coordinate to check
 * @returns {(element: RangeElement) => boolean} Predicate function testing if element [row, colStart, colEnd] contains point (r, c)
 * @example
 * const checker = inRange(5, 10)
 * const range = [5, 8, 12]
 * checker(range) // returns true
 */
export const inRange = (r, c) => element =>
  element[0] === r && element[1] <= c && element[2] >= c
/**
 * Base class for terrain maps with common functionality.
 * Handles map geometry, terrain tracking, and basic operations.
 * Provides lazy-loaded properties for performance and terrain management features.
 *
 * @class BhMap
 * @classdesc Central map system managing terrain dimensions, land areas, subterrains, and game mechanics.
 * Supports rectangular grids with terrain variations, land/water distinction, and weapon systems.
 */
export class BhMap {
  /** @type {string} - Map title/display name shown to players */
  title
  /** @type {string} - Internal map identifier/name used for storage and references */
  name
  /** @type {number} - Number of rows in the map grid (y-dimension; 0 to rows-1) */
  rows
  /** @type {number} - Number of columns in the map grid (x-dimension; 0 to cols-1) */
  cols
  /** @type {number|Object<string, number>} - Ship count: single number or map {letter: count} for multi-type fleets */
  shipNum
  /** @type {Array<RangeElement>} - Array of land area ranges [row, colStart, colEnd] for pre-generated maps */
  landArea
  /** @type {Set<string>} - Set of land cell coordinates as "r,c" strings for custom maps */
  land
  /** @type {Object} - Terrain configuration object with subterrains and display properties */
  terrain
  /** @type {bigint} - Bitfield/bitboard representation of land cells for efficient queries */
  landBits
  /** @type {bigint} - Bitfield representation of default terrain (non-land) cells */
  defaultTerrainBits
  /** @type {Mask} - Mask object representing default terrain accessibility (lazy-loaded) */
  defaultTerrainMask
  /** @type {Mask} - Mask object representing land area cells (computed from landArea/land) */
  landMask
  /** @type {SubTerrainTrackers} - Tracker managing subterrain regions, zones, and properties */
  subterrainTrackers
  /** @type {boolean} - True if pre-generated from built-in maps, false if user-created */
  isPreGenerated
  /** @type {Array<Weapon>} - Array of weapons available for placement/use on this map */
  weapons

  /**
   * Creates a new BhMap instance with terrain configuration.
   * Initializes lazy-loaded properties for masks and terrain tracking.
   * Sets up land masks from either landArea ranges or individual coordinates.
   *
   * @constructor
   * @param {string} title - The map title/display name shown to players
   * @param {Array<number>} size - Map dimensions as [rows, cols] - both positive integers
   * @param {number|Object<string, number>} shipNum - Number of ships (single count) or ship-type map {letter: count}
   * @param {Array<RangeElement>} landArea - Land areas as ranges [row, colStart, colEnd]; empty array for custom maps
   * @param {string} name - Internal map name identifier used for storage and references
   * @param {Object} mapTerrain - Terrain configuration with subterrains, properties, and optional weapons
   * @param {Set<string>} [land] - Optional Set of land coordinates as "r,c" strings; created empty if undefined
   * @throws {Error} Logs warning if terrain.subterrains is missing and uses default bh.terrain
   * @returns {void}
   * @description Initializes land masks and terrain trackers. Lazy-loads defaultTerrainBits and defaultTerrainMask.
   * @example
   * const map = new BhMap('Forest Map', [20, 30], 10, [[10, 5, 25]], 'forest_1', terrainConfig)
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
   * Always includes standardShot, then adds terrain-specific weapons if available.
   * Called during construction to populate the weapons array.
   *
   * @protected
   * @returns {Array<Weapon>} Initialized weapons array with standardShot plus terrain weapons
   * @description Terrain weapons are obtained from terrain.weapons.getAllWeapons() if available.
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
   * Dimensions match this map (cols × rows).
   *
   * @public
   * @readonly
   * @returns {Mask} A new empty mask with dimensions matching this map (cols × rows)
   * @see Mask.empty
   */
  get blankMask () {
    return Mask.empty(this.cols, this.rows)
  }

  /**
   * Gets a full mask for this map's dimensions.
   * All cells are set (1) and enabled for operations.
   * Dimensions match this map (cols × rows).
   *
   * @public
   * @readonly
   * @returns {Mask} A new full mask with all cells enabled and dimensions matching this map
   * @see Mask.full
   */
  get fullMask () {
    return Mask.full(this.cols, this.rows)
  }

  /**
   * Gets extra armed fleet shapes for this map.
   * Includes ships that are attached to weapon racks or have armed configurations.
   * Uses newShapesForMap and filters by isAttachedToRack predicate.
   *
   * @public
   * @readonly
   * @returns {Array<Object>} Array of ship shape objects with armed weapons attached to racks
   * @see newFleetForMap
   */
  get extraArmedFleetForMap () {
    const repeatShapes = this.newShapesForMap
    const ships = bh.extraFleetBuilder(repeatShapes, s => s.isAttachedToRack)
    return ships
  }

  /**
   * Gets the new fleet shapes for this map.
   * Includes all ships based on the current shipNum configuration.
   * Uses the base shapes repeated according to shipNum.
   *
   * @public
   * @readonly
   * @returns {Array<Object>} Array of ship shape objects ready for placement on this map
   * @see newShapesForMap
   */
  get newFleetForMap () {
    const repeatShapes = this.newShapesForMap
    const ships = bh.fleetBuilder(repeatShapes)
    return ships
  }

  /**
   * Gets the base shapes repeated according to ship numbers.
   * Each base shape is duplicated according to shipNum configuration.
   * Handles both single-number shipNum and object {letter: count} formats.
   *
   * @public
   * @readonly
   * @returns {Array<Object>} Array of repeated ship shape objects for fleet composition
   * @description If shipNum is a single number, all base shapes are repeated that many times.
   * If shipNum is an object {letter: count}, each base shape is repeated by its letter count.
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
   * Selects top/bottom edge based on row, left/right edge based on column.
   *
   * @public
   * @param {number} [r] - Optional row coordinate to bias edge selection (top edge if < rows/2)
   * @param {number} [c] - Optional column coordinate to bias edge selection (left edge if < cols/2)
   * @returns {Array<number>} [row, col] coordinates on a map edge
   * @description Edge selection: 0=top, 1=bottom, 2=left, 3=right.
   * If both r and c provided, randomly chooses between the two biased edges.
   * @example
   * randomEdge(5, 15) // Returns edge closer to (5, 15)
   * randomEdge() // Returns random edge
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
   * @param {number} r - Row coordinate of reference point
   * @param {number} c - Column coordinate of reference point
   * @returns {Array<number>} [row, col] coordinates of the nearest corner
   * @description Corners: [0,0] (top-left), [0, cols-1] (top-right),
   * [rows-1, 0] (bottom-left), [rows-1, cols-1] (bottom-right)
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
   * @description Edge numbering: 0=top (r=0), 1=bottom (r=rows-1), 2=left (c=0), 3=right (c=cols-1)
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
   * Grid is a 2D array: rows × cols with all cells set to null.
   * Useful for initialization before populating cells.
   *
   * @public
   * @readonly
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
   * Forms a 3×3 grid centered at (r, c) where all positions are within bounds.
   *
   * @public
   * @param {number} r - Row coordinate of center
   * @param {number} c - Column coordinate of center
   * @returns {Array<Array<number>>} Array of [row, col] coordinates within bounds (max 9 items)
   */
  surroundArea (r, c) {
    let surroundings = []
    this.surroundBase(r, c, this.inBounds.bind(this), surroundings)
    return surroundings
  }

  /**
   * Gets all surrounding coordinates excluding the center position.
   * Returns up to 8 coordinates: the neighbors excluding the center point.
   * Forms a 3×3 grid minus the center cell where all positions are within bounds.
   *
   * @public
   * @param {number} r - Row coordinate of center
   * @param {number} c - Column coordinate of center
   * @returns {Array<Array<number>>} Array of [row, col] coordinates within bounds, excluding center (max 8 items)
   */
  surround (r, c) {
    let surroundings = []
    const isValid = (rr, cc) => (cc !== c || rr !== r) && this.inBounds(rr, cc)
    this.surroundBase(r, c, isValid, surroundings)
    return surroundings
  }

  /**
   * Base method for getting surrounding coordinates with custom validation.
   * Iterates 3×3 grid centered at (r, c) and adds coordinates passing isValid check.
   * Helper method used by surroundArea() and surround().
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
   * Tests whether a rect starting at (r,c) with given height/width stays in bounds.
   *
   * @public
   * @param {number} r - Starting row (top-left)
   * @param {number} c - Starting column (top-left)
   * @param {number} height - Height of the rectangular area (rows)
   * @param {number} width - Width of the rectangular area (columns)
   * @returns {boolean} True if all cells (r to r+height-1) × (c to c+width-1) are within bounds
   */
  inAllBounds (r, c, height, width) {
    return r >= 0 && r + height < this.rows && c + width >= 0 && c < this.cols
  }

  /**
   * Adds land at the specified coordinates.
   * Only applicable to custom maps; base class throws error.
   * Override in subclasses like CustomMap to implement land modification.
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
   * Subterrains represent specific terrain variations like water types or ground types.
   * Retrieved from subterrainTrackers based on land/water status at coordinates.
   *
   * @public
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {Object} The subterrain object with properties like isDefault, tag, icon, etc.
   * @description Returns terrain.defaultSubterrain if coordinates are invalid.
   */
  subterrain (x, y) {
    return this.subterrainTrackers.subterrain(
      x,
      y,
      this.terrain.defaultSubterrain
    )
  }

  /**
   * Gets zone detail at the specified coordinates.
   * Zone detail includes terrain zone classification and properties.
   * Used for rendering and logical terrain queries.
   *
   * @public
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {Object} Zone detail object with zone properties and metadata
   */
  zoneDetail (x, y) {
    return this.subterrainTrackers.zoneDetail(x, y)
  }

  /**
   * Gets the zone at the specified coordinates.
   * A zone represents a region of similar terrain properties and visual appearance.
   *
   * @public
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @returns {Object} Zone information object
   */
  zone (x, y) {
    return this.subterrainTrackers.zone(x, y)
  }

  /**
   * Gets zone information at the specified coordinates.
   * Can optionally reuse provided zone detail for efficiency.
   *
   * @public
   * @param {number} x - Column coordinate
   * @param {number} y - Row coordinate
   * @param {Object} [zoneDetail] - Optional pre-calculated zone detail (avoids recalculation)
   * @returns {Object} Zone information object
   */
  zoneInfo (x, y, zoneDetail) {
    return this.subterrainTrackers.zoneInfo(x, y, zoneDetail)
  }

  /**
   * Checks if the specified coordinates are land.
   * Uses the landMask bitboard to efficiently determine if a cell is land or water.
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {boolean} True if the position is land, false if water/default terrain
   */
  isLand (r, c) {
    return this.landMask.test(c, r)
  }

  /**
   * Gets the tag for the terrain at the specified coordinates.
   * Tags identify terrain types (e.g., 'water', 'grass', 'rock', 'asteroid').
   * Uses the land/water status to select the appropriate subterrain tag.
   *
   * @public
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {string} Terrain tag string (e.g., 'water'), or empty string if no tag found
   */
  tag (r, c) {
    return this.terrain.subterrainTag(this.isLand(r, c)) || ''
  }

  /**
   * Gets all possible terrain tags for this map's terrain.
   * Aggregates all subterrain tags into a single concatenated string.
   * Used to pre-load all terrain CSS classes for a map.
   *
   * @public
   * @returns {string} Concatenated string of all subterrain tags
   */
  allTags () {
    return this.terrain.allSubterrainTag() || ''
  }

  /**
   * Applies terrain tags and checkerboard styling to a cell element.
   * Removes all existing terrain tags and applies the appropriate one.
   * Also applies light/dark checkerboard styling based on row+col parity.
   * Used for map rendering and visual updates.
   *
   * @public
   * @param {Object} cell - DOM element or object with add/remove methods for CSS classes
   * @param {number} r - Row coordinate
   * @param {number} c - Column coordinate
   * @returns {void}
   * @description Even parity (r+c) % 2 === 0 gets 'light' class, odd gets 'dark' class
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
   * Copies all land data cell-by-cell from this map's landMask.
   *
   * @public
   * @param {string} [newTitle] - Optional new title for the saved map; auto-generated if omitted
   * @returns {EditedCustomMap} A new saved custom map instance with all land data copied
   * @description Iterates through all map cells and copies land status to the new EditedCustomMap.
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
   * Full persistence to browser storage occurs during this call.
   *
   * @public
   * @param {string} [newTitle] - Optional new title for the cloned map; auto-generated if omitted
   * @returns {EditedCustomMap} A new cloned map instance stored in localStorage
   * @description Calls savedMap() then saveToLocalStorage() to ensure persistence.
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
   * For BhMap instances, returns name + ' copy'. Override in subclasses for custom behavior.
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
   * Creates a new EditedCustomMap for JSON export to ensure proper formatting.
   *
   * @public
   * @param {string} [newTitle] - Optional title for the exported map; uses exportName() if omitted
   * @returns {string} Formatted JSON string representation of the map data
   * @description Bigint values are filtered during stringification to prevent errors.
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
 * Supports localStorage-based persistence for user-created maps.
 *
 * @class CustomMap
 * @extends BhMap
 * @classdesc User-editable map with localStorage persistence and modification support
 */
export class CustomMap extends BhMap {
  /**
   * Creates a new CustomMap instance.
   * Unlike BhMap, custom maps use a Set to track land coordinates instead of ranges.
   * Inherits terrain management from BhMap.
   *
   * @constructor
   * @param {string} title - The display title of the map shown to players
   * @param {Array<number>} size - Map dimensions as [rows, cols]
   * @param {number|Object<string, number>} shipNum - Ship count: single number or {letter: count} map
   * @param {Set<string>} land - Set of land cell coordinates as "r,c" strings
   * @param {Object} mapTerrain - Terrain configuration with subterrains and properties
   * @param {Object} [example] - Optional example or reference data for this map
   * @returns {void}
   * @description Sets isPreGenerated to false and uses empty landArea array.
   */
  constructor (title, size, shipNum, land, mapTerrain, example) {
    super(title, size, shipNum, [], title, mapTerrain || bh.terrain, land)
    this.isPreGenerated = false
    this.example = example
    this.weapons = this._initializeWeapons()
  }

  /**
   * Checks if the specified coordinates are land in this custom map.
   * Uses the land Set with makeKey() to check membership efficiently.
   * Overrides BhMap.isLand() which uses landMask bitfield.
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
   * For custom maps, the export name is the title itself (no suffix).
   * Overrides BhMap.exportName() which appends ' copy'.
   *
   * @public
   * @returns {string} The map's title (no ' copy' suffix)
   */
  exportName () {
    return this.title
  }

  /**
   * Converts this map to a plain object for JSON serialization.
   * Excludes bigint and function properties which cannot be serialized.
   * Creates a portable representation suitable for storage and transmission.
   *
   * @public
   * @returns {Object} Plain object with: title, name, rows, cols, shipNum, landArea, land, terrain, isPreGenerated, example, weapons
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
   * Converts this map to a JSON string for storage or transmission.
   * Filters out bigint values which cannot be serialized to JSON.
   * Uses 2-space indentation for readability.
   *
   * @public
   * @returns {string} Pretty-printed (2-space indent) JSON string of the map data
   * @see jsonObj
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
   * Persists the JSON representation and updates the terrain's custom maps list.
   * Enables map recovery across browser sessions.
   *
   * @public
   * @param {string} [title] - Optional title for the saved map; auto-generated if omitted
   * @param {string} [key] - Optional localStorage key; computed from title if omitted
   * @returns {void}
   * @description Calls terrain.updateCustomMaps() to register map in terrain's custom maps.
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
   * Used for saving and retrieving maps from browser storage.
   *
   * @public
   * @param {string} [title] - Optional title to use in the key; auto-generates if omitted
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
 * Ensures all modifications respect map bounds via inBounds checks.
 *
 * @param {Constructor} Base - The base class to extend (must have land Set and inBounds method)
 * @returns {Constructor} The extended class with modification methods: addLand, removeLand, addShips, setLand
 * @description Mixin pattern using higher-order function returns a new class extending Base.
 */
const withModifyable = Base =>
  class extends Base {
    /**
     * Adds land at the specified coordinates.
     * Only adds if coordinates are within map bounds.
     * Uses makeKey to convert [r,c] to Set key format.
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
     * Uses makeKey to convert [r,c] to Set key format.
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
     * Aggregates ship counts by letter property for each ship in the array.
     *
     * @public
     * @param {Array<Object>} ships - Array of ship objects, each with a letter property
     * @returns {void}
     * @description Resets shipNum to {} then counts each ship by its letter property.
     */
    addShips (ships) {
      this.shipNum = {}
      for (const ship of ships) {
        this.shipNum[ship.letter] = (this.shipNum[ship.letter] || 0) + 1
      }
    }

    /**
     * Sets land or water at the specified coordinates based on subterrain type.
     * If subterrain.isDefault is true, removes land (making it water).
     * Otherwise adds land (making it solid terrain).
     *
     * @public
     * @param {number} r - Row coordinate
     * @param {number} c - Column coordinate
     * @param {Object} subterrain - The subterrain object with isDefault property
     * @returns {void}
     * @description Subterrain.isDefault=true means water/default terrain; false means land.
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
 * Starts with empty land Set and can be populated incrementally by the user.
 * Includes land modification methods: addLand, removeLand, addShips, setLand.
 *
 * @class CustomBlankMap
 * @extends {withModifyable(CustomMap)}
 * @classdesc Editable blank map starting with empty land set; supports full map modification
 */
export class CustomBlankMap extends withModifyable(CustomMap) {
  /**
   * Creates a new blank custom map with empty land.
   * The title is auto-generated from terrain and dimensions.
   * Ship count starts at 0 and must be set via addShips().
   *
   * @constructor
   * @param {number} rows - Number of rows for the map grid (positive integer)
   * @param {number} cols - Number of columns for the map grid (positive integer)
   * @param {Object} [mapTerrain] - Optional terrain configuration; uses bh.terrain (default) if omitted
   * @returns {void}
   * @description Title format: "{terrain.key}-{copyNum}-{cols}x{rows}"
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
   * Used to generate unique identifiers for maps of the same size configuration.
   * Delegates to getCopyNumKey() from makeTitle module.
   *
   * @public
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @returns {string} The index token for this dimension combination
   * @see getCopyNumKey
   */
  indexToken (rows, cols) {
    return getCopyNumKey(this.terrain, cols, rows)
  }

  /**
   * Resizes the map and removes land outside the new bounds.
   * Prunes land coordinates that fall outside the new dimensions.
   * Updates the map title to reflect new dimensions.
   *
   * @public
   * @param {number} rows - New number of rows for the map
   * @param {number} cols - New number of columns for the map
   * @returns {void}
   * @description Iterates land Set and deletes entries where coordinates exceed new bounds.
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
 * Reconstructs weapons from saved specifications during construction.
 *
 * @class SavedCustomMap
 * @extends CustomMap
 * @classdesc Persistent custom map loaded from and saved to localStorage with full lifecycle management
 */
export class SavedCustomMap extends CustomMap {
  /**
   * Creates a new SavedCustomMap from saved data.
   * Reconstructs weapons from the saved weapon specifications.
   * Combines terrain weapons with any custom saved weapons.
   *
   * @constructor
   * @param {Object} data - The saved map data object from localStorage
   * @param {string} data.title - Map title shown to players
   * @param {number} data.rows - Number of rows in the grid
   * @param {number} data.cols - Number of columns in the grid
   * @param {number|Object<string, number>} data.shipNum - Ship counts by type letter
   * @param {Array<string>} data.land - Array of land cell coordinates as strings
   * @param {string|Object} data.terrain - Terrain name or terrain object with subterrains
   * @param {Array<Object>} [data.weapons] - Array of weapon specs with letter and ammo properties
   * @param {Object} [data.example] - Optional example or reference data
   * @returns {void}
   * @description Reconstructs weapons array with standardShot + terrain weapons + custom weapons.
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
   * Used as a utility for accessing saved map data directly.
   *
   * @public
   * @static
   * @param {string} title - The map title to load from localStorage
   * @returns {Object|null} The loaded map data object, or null if not found
   * @description Parses JSON from localStorage key `{oldToken}.{title}`
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
   * Factory method for creating SavedCustomMap instances from storage.
   *
   * @public
   * @static
   * @param {string} title - The map title to load from localStorage
   * @returns {SavedCustomMap|null} The loaded SavedCustomMap instance, or null if not found
   * @description Constructs SavedCustomMap from data loaded via loadObj().
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
   * Used for all localStorage operations on this map.
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
   * Also unregisters map from terrain's custom maps list.
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
   * Removes the old map entry and persists with the new title.
   * Updates map title and localStorage entry atomically.
   *
   * @public
   * @param {string} newTitle - The new title/name for the map
   * @returns {void}
   * @description Calls remove() then saveToLocalStorage(newTitle).
   */
  rename (newTitle) {
    this.remove()
    this.title = newTitle
    this.saveToLocalStorage(newTitle)
  }

  /**
   * Creates a clone of this map with a new title and saves it to localStorage.
   * The clone is immediately persisted and accessible via the new title.
   * Throws an error if the clone creation or storage fails.
   *
   * @public
   * @param {string} [newTitle] - Optional new title; auto-generated if omitted
   * @throws {Error} If cloning fails with message about the localStorage key
   * @returns {EditedCustomMap} The newly created and saved clone with edit capabilities
   * @description Saves clone with same key as this map, ensuring proper localStorage persistence.
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
 * Represents an edited custom map with full modification capabilities.
 * Extends SavedCustomMap with the withModifyable mixin for land editing.
 * Provides the complete interface for loading, editing, cloning, and persisting custom maps.
 * Includes all modification methods from withModifyable: addLand, removeLand, addShips, setLand.
 * Includes all persistence methods from SavedCustomMap: load, loadObj, localStorageKey, remove, rename.
 *
 * @class EditedCustomMap
 * @extends {withModifyable(SavedCustomMap)}
 * @classdesc Fully editable custom map with persistence, cloning, and modification capabilities
 */
export class EditedCustomMap extends withModifyable(SavedCustomMap) {
  /**
   * Loads an edited custom map from localStorage.
   * Returns null if not found; no log message is printed (unlike SavedCustomMap.load).
   * Factory method specifically for loading EditedCustomMap instances.
   *
   * @public
   * @static
   * @param {string} title - The map title to load from localStorage
   * @returns {EditedCustomMap|null} The loaded EditedCustomMap with edit capabilities, or null if not found
   * @description Silent failure (no console.log) to allow conditional loading.
   * @see SavedCustomMap.load - prints console message on load failure
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
