import { makeKey } from '../utilities.js'
import { oldToken } from './terrain.js'
import { SubTerrainTrackers } from './SubTerrainTrackers.js'
import { bh } from './bh.js'
import { standardShot } from '../weapon/Weapon.js'
import { Megabomb } from '../sea/SeaWeapons.js'
import { lazy, randomElement } from '../utilities.js'
import { Mask } from '../grid/mask.js'

// geometry helper
export const inRange = (r, c) => element =>
  element[0] == r && element[1] <= c && element[2] >= c

export class BhMap {
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
    this.weapons = [standardShot, new Megabomb(3)]
  }
  get blankMask () {
    return Mask.empty(this.cols, this.rows)
  }
  get fullMask () {
    return Mask.full(this.cols, this.rows)
  }
  get extraArmedFleetForMap () {
    const repeatShapes = this.newShapesForMap
    const ships = bh.extraFleetBuilder(repeatShapes, s => s.isAttachedToRack)
    return ships
  }
  get newFleetForMap () {
    const repeatShapes = this.newShapesForMap
    const ships = bh.fleetBuilder(repeatShapes)
    return ships
  }
  get newShapesForMap () {
    const terrain = this.terrain
    const baseShapes = terrain.ships.baseShapes
    const shipNum = this.shipNum
    const repeatShapes = baseShapes.flatMap(
      s => Array(shipNum[s.letter] || 0).fill(s) || []
    )
    return repeatShapes
  }
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
      edge = randomElement(list)
    }

    return this.randomEdgeFor(edge)
  }

  randomEdgeFor (edge) {
    edge = edge || Math.floor(Math.random() * 4)
    if (edge === 0) return [0, Math.floor(Math.random() * this.cols)]
    if (edge === 1)
      return [this.rows - 1, Math.floor(Math.random() * this.cols)]
    if (edge === 2) return [Math.floor(Math.random() * this.rows), 0]
    return [Math.floor(Math.random() * this.rows), this.cols - 1]
  }

  inBounds (r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols
  }
  get blankGrid () {
    return Array.from({ length: this.rows }, () =>
      new Array(this.cols).fill(null)
    )
  }
  surroundArea (r, c) {
    let surroundings = []
    this.surroundBase(r, c, this.inBounds.bind(this), surroundings)
    return surroundings
  }
  surround (r, c) {
    let surroundings = []
    const isValid = (rr, cc) => (cc !== c || rr !== r) && this.inBounds(rr, cc)
    this.surroundBase(r, c, isValid, surroundings)
    return surroundings
  }
  surroundBase (r, c, isValid, surroundings) {
    for (let rr = r - 1; rr <= r + 1; rr++) {
      for (let cc = c - 1; cc <= c + 1; cc++) {
        if (isValid(cc, rr)) {
          surroundings.push([rr, cc])
        }
      }
    }
  }

  inAllBounds (r, c, height, width) {
    return r >= 0 && r + height < this.rows && c + width >= 0 && c < this.cols
  }

  addLand (_r, _c) {
    throw new Error('Not a custom map')
  }

  subterrain (r, c) {
    return this.subterrainTrackers.subterrain(
      r,
      c,
      this.terrain.defaultSubterrain
    )
  }

  zoneDetail (r, c) {
    return this.subterrainTrackers.zoneDetail(r, c)
  }

  zone (r, c) {
    return this.subterrainTrackers.zone(r, c)
  }

  zoneInfo (r, c, zoneDetail) {
    return this.subterrainTrackers.zoneInfo(r, c, zoneDetail)
  }

  isLand (r, c) {
    return this.landMask.test(c, r)
  }

  tag (r, c) {
    return this.terrain.subterrainTag(this.isLand(r, c)) || ''
  }
  allTags () {
    return this.terrain.allSubterrainTag() || ''
  }

  tagCell (cell, r, c) {
    const allTags = this.allTags()
    cell.remove(...allTags)
    const tag = this.tag(r, c)

    const checker = (r + c) % 2 === 0
    cell.add(tag, checker ? 'light' : 'dark')
  }

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

  clone (newTitle) {
    newTitle = newTitle || makeTitle(this.terrain, this.cols, this.rows)

    const clonedMap = this.savedMap(newTitle)
    clonedMap.saveToLocalStorage(newTitle)
    return clonedMap
  }

  exportName () {
    return this.name + ' copy'
  }

  jsonString (newTitle) {
    newTitle = newTitle || this.exportName()
    const exportingMap = this.savedMap(newTitle)
    return exportingMap.jsonString()
  }
}
function getCopyNumKey (terrain, cols, rows) {
  return `${oldToken}.${terrain.key}-index-${cols}x${rows}`
}
function getCopyNum (terrain, cols, rows) {
  return Number.parseInt(
    localStorage.getItem(getCopyNumKey(terrain, cols, rows))
  )
}
function setCopyNum (terrain, cols, rows, index) {
  localStorage.setItem(getCopyNumKey(terrain, cols, rows), index)
}
function getNextCopyNum (terrain, cols, rows) {
  return getCopyNum(terrain, cols, rows) + 1 || 1
}
function makeTitle (terrain, cols, rows) {
  const index = getNextCopyNum(terrain, cols, rows)
  setCopyNum(terrain, cols, rows, index)
  return `${terrain.key}-${index}-${cols}x${rows}`
}

export class CustomMap extends BhMap {
  constructor (title, size, shipNum, land, mapTerrain, example) {
    super(title, size, shipNum, [], title, mapTerrain || bh.terrain, land)
    this.isPreGenerated = false
    this.example = example
    this.weapons = [standardShot]
  }

  isLand (r, c) {
    return this.land.has(makeKey(r, c))
  }

  exportName () {
    return this.title
  }

  jsonObj () {
    const data = { ...this }
    delete data.terrain
    delete data.land
    data.land = [...this.land]
    data.terrain = this.terrain.title
    return data
  }
  jsonString () {
    const data = this.jsonObj()
    return JSON.stringify(data, null, 2)
  }
  saveToLocalStorage (title, key) {
    title = title || makeTitle(this.terrain, this.cols, this.rows)
    key = key || this.localStorageKey(title)

    localStorage.setItem(key, this.jsonString())

    this.terrain.updateCustomMaps(title)
  }

  localStorageKey (title) {
    this.title = title || makeTitle(this.terrain, this.cols, this.rows)
    return `${oldToken}.${this.title}`
  }
}

const withModifyable = Base =>
  class extends Base {
    constructor (...args) {
      super(...args) // REQUIRED
    }

    addLand (r, c) {
      if (this.inBounds(r, c)) this.land.add(makeKey(r, c))
    }

    removeLand (r, c) {
      if (this.inBounds(r, c)) this.land.delete(makeKey(r, c))
    }

    addShips (ships) {
      this.shipNum = {}
      for (const ship of ships) {
        this.shipNum[ship.letter] = (this.shipNum[ship.letter] || 0) + 1
      }
    }
    setLand (r, c, subterrain) {
      if (subterrain.isDefault) {
        this.removeLand(r, c)
      } else {
        this.addLand(r, c)
      }
    }
  }

export class CustomBlankMap extends withModifyable(CustomMap) {
  constructor (rows, cols, mapTerrain) {
    super(
      makeTitle(mapTerrain || bh.terrain, cols, rows),
      [rows, cols],
      0,
      new Set(),
      mapTerrain || bh.terrain
    )
  }
  indexToken (rows, cols) {
    return getCopyNumKey(this.terrain, cols, rows)
  }

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

export class SavedCustomMap extends CustomMap {
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

  static loadObj (title) {
    const newLocal = `${oldToken}.${title}`
    const data = localStorage.getItem(newLocal)
    if (!data) return null
    const obj = JSON.parse(data)
    return obj
  }

  static load (title) {
    const obj = SavedCustomMap.loadObj(title)
    if (obj) return new SavedCustomMap(obj)

    console.log("Can't Load Map : ", title)
    return null
  }

  localStorageKey () {
    return `${oldToken}.${this.title}`
  }

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

  rename (newTitle) {
    this.remove()
    this.title = newTitle
    this.saveToLocalStorage(newTitle)
  }

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

export class EditedCustomMap extends withModifyable(SavedCustomMap) {
  constructor (...args) {
    super(...args) // REQUIRED
  }

  static load (title) {
    const obj = SavedCustomMap.loadObj(title)
    if (obj) {
      return new EditedCustomMap(obj)
    } else {
      return null
    }
  }
}
