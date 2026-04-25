import { bh } from './bh.js'
import { makeKey, parsePair, addCellToFootPrint } from './terrain.js'

/**
 * Manages tracking of multiple subterrains on a map.
 */
export class SubTerrainTrackers {
  /**
   * @param {Array<SubTerrain>} subterrains - Array of subterrain instances to track
   */
  constructor (subterrains) {
    /** @type {SubTerrainTracker[]} */
    this.list = subterrains.map(s => new SubTerrainTracker(s))
  }

  /**
   * Recalculates all trackers for the given map.
   * @param {Object} map - The map object with rows, cols, isLand, inBounds methods
   */
  calc (map) {
    this.list.forEach(tracker => tracker.recalc(map))
  }

  /**
   * Calculates footprints for all trackers.
   */
  calcFootPrints () {
    this.list.forEach(tracker => tracker.calcFootPrint())
  }

  /**
   * Finds the tracker for the given cell coordinates.
   * @private
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {SubTerrainTracker|null} The tracker or null if not found
   */
  _findTracker (r, c) {
    const key = makeKey(r, c)
    return this.list.find(tracker => tracker.total.has(key)) || null
  }

  /**
   * Gets the subterrain at the given coordinates.
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @param {*} defaultValue - Value to return if no subterrain found
   * @returns {*} The subterrain or default value
   */
  subterrain (r, c, defaultValue = null) {
    const tracker = this._findTracker(r, c)
    return tracker ? tracker.subterrain : defaultValue
  }

  /**
   * Gets the detailed zone information at the given coordinates.
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Array} Array with subterrain and zone
   * @throws {Error} If subterrain or zone is unknown
   */
  zoneDetail (r, c) {
    const tracker = this._findTracker(r, c)
    if (!tracker) throw new Error('Unknown subterrain')

    const key = makeKey(r, c)
    if (tracker.margin.has(key)) {
      return [tracker.subterrain, tracker.marginalZone]
    } else if (tracker.core.has(key)) {
      return [tracker.subterrain, tracker.coreZone]
    } else {
      throw new Error('Unknown zone')
    }
  }

  /**
   * Gets the zone at the given coordinates.
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {Object} The zone object
   */
  zone (r, c) {
    return this.zoneDetail(r, c)[1]
  }

  /**
   * Gets zone information based on detail level.
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @param {number} zoneDetail - Level of detail (0, 1, or 2)
   * @returns {Array} Zone information array
   * @throws {Error} If zoneDetail is invalid
   */
  zoneInfo (r, c, zoneDetail) {
    switch (zoneDetail) {
      case 0:
        return []
      case 1:
        return [this.subterrain(r, c)]
      case 2:
        return this.zoneDetail(r, c)
      default:
        throw new Error(`Invalid zone detail level: ${zoneDetail}`)
    }
  }

  /**
   * Sets up zone information for display.
   * @param {Function} createZoneTitle - Function to create zone title
   * @param {Function} createZoneEntry - Function to create zone entry
   * @returns {Array} Display data
   */
  setupZoneInfo (createZoneTitle, createZoneEntry) {
    const map = bh.map
    const display = []

    for (const tracker of this.list) {
      tracker.recalc(map)
      const counts = [
        createZoneTitle(tracker.subterrain.title, tracker.total),
        createZoneEntry(tracker.marginalZone.title, tracker.margin),
        createZoneEntry(tracker.coreZone.title, tracker.core)
      ]
      display.push({ tracker, counts })
    }

    return display
  }

  /**
   * Displays displaced area for each tracker.
   * @param {Object} map - The map object
   * @param {Function} displayer - Function to display the data
   */
  displayDisplacedArea (map, displayer) {
    this.list.forEach(tracker => {
      tracker.recalc(map)
      tracker.calcFootPrint()
      displayer(tracker.subterrain, tracker.displacedArea)
    })
  }
}

/**
 * Tracks a single subterrain on a map.
 */
export class SubTerrainTracker {
  /**
   * @param {SubTerrain} subterrain - The subterrain to track
   */
  constructor (subterrain) {
    /** @type {Object} */
    this.subterrain = subterrain
    /** @type {Set<string>} */
    this.total = new Set()
    /** @type {Zone} */
    this.marginalZone = subterrain.zones.find(z => z.isMarginal)
    /** @type {Set<string>} */
    this.margin = new Set()
    /** @type {Zone} */
    this.coreZone = subterrain.zones.find(z => !z.isMarginal)
    /** @type {Set<string>} */
    this.core = new Set()
    /** @type {Set<string>} */
    this.footprint = new Set()
  }

  /**
   * Gets the sizes of total, margin, and core areas.
   * @returns {{total: number, margin: number, core: number}}
   */
  get sizes () {
    const total = this.total.size
    const margin = this.margin.size
    const core = this.core.size
    return { total, margin, core }
  }

  /**
   * Gets the total size.
   * @returns {number}
   */
  get totalSize () {
    return this.total.size
  }

  /**
   * Recalculates the tracking data for the map.
   * @param {Object} map - The map object with rows, cols, isLand, inBounds methods
   */
  recalc (map) {
    this._clearSets()
    this._populateFromMap(map)
    this._updateCoreSet()
  }

  /**
   * Clears all tracking sets.
   * @private
   */
  _clearSets () {
    this.total.clear()
    this.margin.clear()
    this.core.clear()
  }

  /**
   * Populates tracking data from the map.
   * @private
   * @param {Object} map - The map object
   */
  _populateFromMap (map) {
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        this._processCell(r, c, map)
      }
    }
  }

  /**
   * Gets the displaced area.
   * @returns {number}
   */
  get displacedArea () {
    return (this.total.size + this.footprint.size) / 2
  }

  /**
   * Processes a single cell for tracking.
   * @private
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @param {Object} map - The map object
   */
  _processCell (r, c, map) {
    if (!this._cellBelongsToSubterrain(r, c, map)) return

    const key = makeKey(r, c)
    this.total.add(key)

    if (this._isMarginalCell(r, c, map)) {
      this.margin.add(key)
    }
  }

  /**
   * Checks if a cell belongs to this subterrain.
   * @private
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @param {Object} map - The map object
   * @returns {boolean} True if the cell belongs to this subterrain
   */
  _cellBelongsToSubterrain (r, c, map) {
    return this.subterrain.isTheLand === map.isLand(r, c)
  }

  /**
   * Checks if a cell is marginal (has different land type neighbors).
   * @private
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @param {Object} map - The map object
   * @returns {boolean} True if the cell is marginal
   */
  _isMarginalCell (r, c, map) {
    const isLand = this.subterrain.isTheLand

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue // Skip center cell

        const neighborR = r + i
        const neighborC = c + j

        if (
          map.inBounds(neighborR, neighborC) &&
          isLand !== map.isLand(neighborR, neighborC)
        ) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Updates the core set after margin calculation.
   * @private
   */
  _updateCoreSet () {
    this.core = new Set([...this.total].filter(key => !this.margin.has(key)))
  }

  /**
   * Sets the cell data for tracking (legacy method for compatibility).
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @param {Object} map - The map object
   */
  set (r, c, map) {
    this._processCell(r, c, map)
    this._updateCoreSet()
  }

  /**
   * Calculates the footprint.
   */
  calcFootPrint () {
    this.footprint.clear()

    this.total.forEach((_value, key) => {
      const [r, c] = parsePair(key)
      addCellToFootPrint(r, c, this.footprint)
    })
  }
}
