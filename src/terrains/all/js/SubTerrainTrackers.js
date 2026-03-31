import { bh } from './bh.js'
import { makeKey, parsePair, addCellToFootPrint } from './terrain.js'

export class SubTerrainTrackers {
  constructor (subterrains) {
    this.list = subterrains.map(s => {
      return new SubTerrainTracker(s)
    })
  }

  calc (map) {
    for (const tracker of this.list) {
      tracker.recalc(map)
    }
  }
  calcFootPrints (map) {
    for (const tracker of this.list) {
      tracker.calcFootPrint(map)
    }
  }

  subterrain (r, c, defaultValue = null) {
    for (const tracker of this.list) {
      if (tracker.total.has(makeKey(r, c))) return tracker.subterrain
    }
    return defaultValue
  }

  zoneDetail (r, c) {
    for (const tracker of this.list) {
      if (tracker.total.has(makeKey(r, c))) {
        if (tracker.margin.has(makeKey(r, c)))
          return [tracker.subterrain, tracker.m_zone]
        else if (tracker.core.has(makeKey(r, c)))
          return [tracker.subterrain, tracker.c_zone]
        else {
          throw new Error('Unknown zone')
        }
      }
    }
    throw new Error('Unknown subterrain')
  }
  zone (r, c) {
    return this.zoneDetail(r, c)[1]
  }

  zoneInfo (r, c, zoneDetail) {
    switch (zoneDetail) {
      case 0:
        return []
      case 1:
        return [this.subterrain(r, c)]
      case 2:
        return this.zoneDetail(r, c)
      default:
        throw new Error('zoneDetail not valid :', zoneDetail)
    }
  }

  setupZoneInfo (createZoneTitle, createZoneEntry) {
    const map = bh.map
    let display = []
    for (const tracker of this.list) {
      tracker.recalc(map)
      let counts = [
        createZoneTitle(tracker.subterrain.title, tracker.total),
        createZoneEntry(tracker.m_zone.title, tracker.margin),
        createZoneEntry(tracker.c_zone.title, tracker.core)
      ]
      display.push({ tracker: tracker, counts: counts })
    }
    return display
  }

  displayDisplacedArea (map, displayer) {
    for (const tracker of this.list) {
      tracker.recalc(map)
      tracker.calcFootPrint()
      const displacedArea = tracker.displacedArea

      displayer(tracker.subterrain, displacedArea)
    }
  }
}
export class SubTerrainTracker {
  constructor (subterrain) {
    this.subterrain = subterrain
    this.total = new Set()
    this.m_zone = subterrain.zones.find(z => z.isMarginal)
    this.margin = new Set()
    this.c_zone = subterrain.zones.find(z => !z.isMarginal)
    this.core = new Set()
    this.footprint = new Set()
  }
  get sizes () {
    const total = this.total.size
    const margin = this.margin.size
    const core = this.core.size
    return { total, margin, core }
  }
  get totalSize () {
    return this.total.size
  }
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
  get displacedArea () {
    return (this.total.size + this.footprint.size) / 2
  }
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
  calcFootPrint () {
    this.footprint.clear()

    this.total.forEach((_value, key) => {
      const [r, c] = parsePair(key)
      addCellToFootPrint(r, c, this.footprint)
    })
  }
}
