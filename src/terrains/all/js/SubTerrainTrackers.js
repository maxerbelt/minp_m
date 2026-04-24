import { bh } from './bh.js'
import { makeKey, parsePair, addCellToFootPrint } from './terrain.js'

/**
 * Manages tracking of multiple subterrains on a map.
 */
export class SubTerrainTrackers {
  /**
   * @param {Array} subterrains - Array of subterrain instances to track
   */
  constructor (subterrains) {
    /** @type {SubTerrainTracker[]} */
    this.list = subterrains.map(s => {
      return new SubTerrainTracker(s)
    })
  }

  /**
   * Recalculates all trackers for the given map.
   * @param {Object} map - The map object with rows, cols, isLand, inBounds methods
   */
  calc (map) {
    for (const tracker of this.list) {
      tracker.recalc(map)
    }
  }

  /**
   * Calculates footprints for all trackers.
   */
  calcFootPrints () {
    for (const tracker of this.list) {
      tracker.calcFootPrint()
    }
  }

  /**
   * Finds the tracker for the given cell coordinates.
   * @private
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @returns {SubTerrainTracker|null} The tracker or null if not found
   */
  _findTracker (r, c) {
    for (const tracker of this.list) {
      if (tracker.total.has(makeKey(r, c))) return tracker
    }
    return null
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
    if (tracker.margin.has(key))
      return [tracker.subterrain, tracker.marginalZone]
    else if (tracker.core.has(key))
      return [tracker.subterrain, tracker.coreZone]
    else {
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
        throw new Error(`zoneDetail not valid: ${zoneDetail}`)
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
    let display = []
    for (const tracker of this.list) {
      tracker.recalc(map)
      let counts = [
        createZoneTitle(tracker.subterrain.title, tracker.total),
        createZoneEntry(tracker.marginalZone.title, tracker.margin),
        createZoneEntry(tracker.coreZone.title, tracker.core)
      ]
      display.push({ tracker: tracker, counts: counts })
    }
    return display
  }

  /**
   * Displays displaced area for each tracker.
   * @param {Object} map - The map object
   * @param {Function} displayer - Function to display the data
   */
  displayDisplacedArea (map, displayer) {
    for (const tracker of this.list) {
      tracker.recalc(map)
      tracker.calcFootPrint()
      const displacedArea = tracker.displacedArea

      displayer(tracker.subterrain, displacedArea)
    }
  }
}
/**
 * Tracks a single subterrain on a map.
 */
export class SubTerrainTracker {
  /**
   * @param {Object} subterrain - The subterrain to track
   */
  constructor (subterrain) {
    /** @type {Object} */
    this.subterrain = subterrain
    /** @type {Set<string>} */
    this.total = new Set()
    /** @type {Object} */
    this.marginalZone = subterrain.zones.find(z => z.isMarginal)
    /** @type {Set<string>} */
    this.margin = new Set()
    /** @type {Object} */
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
    this.total.clear()
    this.margin.clear()
    this.core.clear()

    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        this.set(r, c, map)
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
   * Sets the cell data for tracking.
   * @param {number} r - Row index
   * @param {number} c - Column index
   * @param {Object} map - The map object
   */
  set (r, c, map) {
    const isLand = this.subterrain.isTheLand
    if (isLand !== map.isLand(r, c)) return
    const key = makeKey(r, c)
    this.total.add(key)
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (!(i === 0 && j === 0) && map.inBounds(r + i, c + j)) {
          if (isLand !== map.isLand(r + i, c + j)) {
            this.margin.add(key)
          }
        }
      }
    }
    this.core = new Set([...this.total].filter(x => !this.margin.has(x)))
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
