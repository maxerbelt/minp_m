import { CustomBlankMap, EditedCustomMap, SavedCustomMap } from './map.js'
import { terrainsMaps } from './maps.js'
import { token } from '../ships/Shape.js'
import { oldToken } from './terrain.js'

// gameMapTypes

export class TerrainMaps {
  constructor (terrain, list, currentMap, weaponPreference) {
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
    this.shipDescription = terrain.ships.description
    this.shapesByLetter = terrain.ships.shapesByLetter
    this.minWidth = terrain.minWidth
    this.maxWidth = terrain.maxWidth
    this.minHeight = terrain.minHeight
    this.maxHeight = terrain.maxHeight
    this.weaponPreference = weaponPreference
  }

  get newFleetForTerrain () {
    return this.terrain.newFleetForTerrain
  }
  clearBlankWith (r, c) {
    this.current = new CustomBlankMap(r, c, this.terrain)
  }
  clearBlank () {
    this.current = new CustomBlankMap(
      this.current.rows,
      this.current.cols,
      this.terrain
    )
  }
  setToBlank (r, c) {
    if (this.current instanceof CustomBlankMap) this.current.setSize(r, c)
    else this.clearBlankWith(r, c)
  }
  setTo (mapName) {
    this.current = this.getMap(mapName) || this.list[0]
  }
  setToMap (map) {
    this.current = map || this.list[0]
  }
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
  hasMapSize (r, c) {
    return this.mapWithSize(r, c) !== undefined
  }

  mapWithSize (r, c) {
    return this.list.find(m => m.rows === r && m.cols === c)
  }

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
  prefilledMapIndex (mapName) {
    return this.list.findIndex(m => m.title === mapName)
  }

  getCustomMap (mapName) {
    if (!mapName) return
    return SavedCustomMap.load(mapName)
  }

  getEditableMap (mapName) {
    if (!mapName) return null
    return EditedCustomMap.load(mapName)
  }

  getMap (mapName) {
    if (!mapName) return null
    let map = this.list.find(m => m.title === mapName)
    if (!map) map = this.getCustomMap(mapName)
    return map
  }

  getMapOfSize (height, width) {
    if (!height || !width) return null
    let map = this.list.find(m => m.rows === height && m.cols === width)
    if (!map) map = this.getCustomMapOfSize(height, width)
    return map
  }
  getCustomMapOfSize (height, width) {
    if (!height || !width) return null
    const list = this.customMapList()
    return list.find(m => m.rows === height && m.cols === width)
  }

  oldoldLastMapLocalStorageKey = `${oldToken}.map-name`
  oldLastMapLocalStorageKey = `${oldToken}.${this.key}-last-map-name`
  lastMapLocalStorageKey () {
    return `${token}.${this.terrain?.tag}.${this.key}-last-map-name`
  }

  getLastMapTitleRaw () {
    const title = localStorage.getItem(this.lastMapLocalStorageKey())

    if (this.key !== 'SeaAndLand') {
      return title
    }
    return title || this.getOldLastMapTitle() || this.getOldOldLastMapTitle()
  }
  getLastMapTitle () {
    const title = this.getLastMapTitleRaw()
    return title || this.list[0]?.title || ''
  }
  getLastMap () {
    const title = this.getLastMapTitleRaw()
    return this.getMap(title) || this.list[0]
  }

  getOldOldLastMapTitle () {
    return localStorage.getItem(this.oldoldLastMapLocalStorageKey)
  }
  getOldLastMapTitle () {
    return localStorage.getItem(this.oldLastMapLocalStorageKey)
  }
  storeLastMap () {
    localStorage.setItem(this.lastMapLocalStorageKey(), this.current.title)
  }

  lastWidthStorageKey = `${token}.custom-map-width`
  lastHeightStorageKey = `${token}.custom-map-height`
  oldLastWidthStorageKey = `${oldToken}.custom-map-width`
  oldLastHeightStorageKey = `${oldToken}.custom-map-height`
  getLastWidth (defaultWidth) {
    const width =
      Number.parseInt(localStorage.getItem(this.lastWidthStorageKey), 10) ||
      Number.parseInt(localStorage.getItem(this.oldLastWidthStorageKey), 10)
    if (
      Number.isNaN(width) ||
      width < this.terrain.minWidth ||
      width > this.terrain.maxWidth
    )
      return defaultWidth || this.terrain.minWidth
    return width
  }
  getLastHeight (defaultHeight) {
    const height =
      Number.parseInt(localStorage.getItem(this.lastHeightStorageKey), 10) ||
      Number.parseInt(localStorage.getItem(this.oldLastHeightStorageKey), 10)
    if (
      Number.isNaN(height) ||
      height < this.terrain.minHeight ||
      height > this.terrain.maxHeight
    )
      return defaultHeight || this.terrain.minHeight
    return height
  }
  storeLastHeight (height) {
    if (height) {
      localStorage.setItem(this.lastHeightStorageKey, height)
    }
  }
  storeLastWidth (width) {
    if (width) {
      localStorage.setItem(this.lastWidthStorageKey, width)
    }
  }
  storeLastCustomSize (width, height) {
    this.storeLastWidth(width)
    this.storeLastHeight(height)
  }

  customMapList () {
    return this.terrain.getCustomMaps(SavedCustomMap.load)
  }

  maps () {
    return this.list.concat(this.customMapList())
  }
  preGenMapList () {
    return this.list
  }

  mapTitles () {
    const result = this.list
      .map(m => m.title)
      .concat(this.terrain.getCustomMapTitles())

    return result
  }

  noOfShipOfShape (shape) {
    return this.current.shipNum[shape.letter]
  }
  inBounds (r, c) {
    return this.current.inBounds(r, c)
  }
  zoneInfo (r, c, zoneDetail) {
    return this.current.zoneInfo(r, c, zoneDetail)
  }

  inAllBounds (r, c, height, width) {
    return this.current.inAllBounds(r, c, height, width)
  }

  isLand (r, c) {
    return this.current.isLand(r, c)
  }
  static get numTerrains () {
    return terrainsMaps.list.length
  }

  static currentTerrainMaps (newCurrent) {
    if (newCurrent && terrainsMaps.current !== newCurrent) {
      terrainsMaps.setCurrent(newCurrent)
    }
    return terrainsMaps.current
  }

  static setByIndex (idx) {
    if (idx) {
      return terrainsMaps.setByIndex(idx)
    }
    return null
  }
  static setToDefault () {
    return terrainsMaps.setToDefault()
  }
}
