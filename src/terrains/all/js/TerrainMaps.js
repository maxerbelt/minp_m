import { CustomBlankMap, EditedCustomMap, SavedCustomMap } from './map.js'
import { terrainsMaps } from './maps.js'
import { token } from '../../../ships/Shape.js'
import { oldToken } from './terrain.js'

// gameMapTypes

export class TerrainMaps {
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

  _oldOldLastMapKey () {
    return `${oldToken}.map-name`
  }
  _oldLastMapKey () {
    return `${oldToken}.${this.key}-last-map-name`
  }
  _lastMapKey () {
    return `${token}.${this.terrain?.tag}.${this.key}-last-map-name`
  }

  getLastMapTitleRaw () {
    const title = localStorage.getItem(this._lastMapKey())
    if (this.key !== 'SeaAndLand') return title
    return (
      title ||
      localStorage.getItem(this._oldLastMapKey()) ||
      localStorage.getItem(this._oldOldLastMapKey())
    )
  }
  getLastMapTitle () {
    const title = this.getLastMapTitleRaw()
    return title || this.list[0]?.title || ''
  }
  getLastMap () {
    const title = this.getLastMapTitleRaw()
    return this.getMap(title) || this.list[0]
  }

  storeLastMap () {
    localStorage.setItem(this._lastMapKey(), this.current.title)
  }

  _lastWidthKey () {
    return `${token}.custom-map-width`
  }
  _lastHeightKey () {
    return `${token}.custom-map-height`
  }
  _oldLastWidthKey () {
    return `${oldToken}.custom-map-width`
  }
  _oldLastHeightKey () {
    return `${oldToken}.custom-map-height`
  }
  getLastWidth (defaultWidth) {
    const width =
      Number.parseInt(localStorage.getItem(this._lastWidthKey()), 10) ||
      Number.parseInt(localStorage.getItem(this._oldLastWidthKey()), 10)
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
      Number.parseInt(localStorage.getItem(this._lastHeightKey()), 10) ||
      Number.parseInt(localStorage.getItem(this._oldLastHeightKey()), 10)
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
      localStorage.setItem(this._lastHeightKey(), height)
    }
  }
  storeLastWidth (width) {
    if (width) {
      localStorage.setItem(this._lastWidthKey(), width)
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
