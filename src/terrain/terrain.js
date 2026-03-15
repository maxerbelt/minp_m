import { SubTerrain } from './SubTerrain.js'
import { bh } from './bh.js'
export class Terrain {
  constructor (
    title,
    shipCatelogue,
    subterrains,
    tag,
    weaponsCatelogue,
    mapHeading,
    fleetHeading
  ) {
    this.title = title || 'Unknown'
    this.key = title.toLowerCase().replaceAll(/\s+/g, '-')
    this.ships = shipCatelogue
    this.weapons = weaponsCatelogue
    this.minWidth = MIN_CUSTOM_WIDTH
    this.maxWidth = MAX_CUSTOM_WIDTH
    this.minHeight = MIN_CUSTOM_HEIGHT
    this.maxHeight = MAX_CUSTOM_HEIGHT
    this.subterrains = subterrains
    this.zones = subterrains.flatMap(s => s.zones)
    this.defaultSubterrain =
      subterrains.find(s => s.isDefault) || subterrains[0]
    this.landSubterrain = subterrains.find(s => s.isTheLand) || subterrains[1]
    this.tag = tag
    this.mapHeading = mapHeading || 'Waters'
    this.fleetHeading = fleetHeading || 'Fleet'
    this.bodyTag = this.defaultSubterrain.tag
    this.hasUnattachedWeapons = true
    this.hasAttachedWeapons = false
  }

  static customizeUnitDescriptions (
    elementTag,
    textContent = Function.prototype,
    innerHTML = Function.prototype
  ) {
    bh.customizeUnits(elementTag, (letter, description, el, key) => {
      if (textContent !== Function.prototype)
        el.textContent = textContent(letter, description, el, key)
      if (innerHTML !== Function.prototype)
        el.innerHTML = innerHTML(letter, description, el, key)
    })
  }
  static showsUnits (
    elementTag,
    hasClass = Function.prototype,
    className = 'hidden'
  ) {
    bh.customizeUnits(elementTag, (letter, description, el, key) => {
      if (hasClass !== Function.prototype)
        if (hasClass(letter, description, el, key, className)) {
          el.classList.remove(className)
        } else {
          el.classList.add(className)
        }
    })
  }

  get newFleetForTerrain () {
    return bh.fleetBuilder(this.ships.baseShapes)
  }
  subterrainTag (isLand) {
    return isLand ? this.landSubterrain.tag : this.defaultSubterrain.tag
  }

  allSubterrainTag () {
    return this.subterrains.map(st => st.tag)
  }
  getWeapon (letter) {
    return this.weapons.weapons.find(w => w.letter === letter)
  }
  getNewWeapon (letter, ammo) {
    const weapon = this.getWeapon(letter)
    if (weapon) return weapon.clone(ammo)
    return null
  }
  customMapsLocalStorageKey () {
    return `${oldToken}.${this.key}-custom-maps`
  }

  getCustomMapsRaw () {
    return localStorage.getItem(this.customMapsLocalStorageKey()) || ''
  }

  setCustomMapsRaw (csv) {
    return localStorage.setItem(this.customMapsLocalStorageKey(), csv)
  }

  getCustomMapSet () {
    const customMaps = this.getCustomMapsRaw()
    if (customMaps) return new Set(customMaps.split(','))

    return new Set()
  }
  localStorageMapKey (title) {
    return `${oldToken}.${title}`
  }
  updateCustomMaps (title) {
    let customMaps = this.getCustomMapSet()
    if (customMaps.has(title)) {
      return
    }
    customMaps.add(title)
    const list = [...customMaps].filter(
      t => t && t.length > 0 && localStorage.getItem(this.localStorageMapKey(t))
    )

    const csv = list.join()
    localStorage.setItem(this.customMapsLocalStorageKey(), csv)
  }
  deleteCustomMaps (title) {
    let customMaps = this.getCustomMapSet()

    customMaps.delete(title)
    localStorage.setItem(this.customMapsLocalStorageKey, [...customMaps].join())
  }
  renameCustomMaps (oldMap, newTitle) {
    let customMaps = this.getCustomMapSet()

    customMaps.delete(oldMap.title)
    oldMap.title = newTitle
    customMaps.add(oldMap.title)
    localStorage.setItem(
      this.customMapsLocalStorageKey(),
      [...customMaps].join()
    )
  }

  getCustomMaps (builder) {
    const customMaps = this.getCustomMapsRaw()
    if (!customMaps) return []
    return [...this.getCustomMapSet()]
      .map(title => builder(title))
      .filter(m => m !== null)
  }

  getCustomMapTitles () {
    const customMaps = this.getCustomMapsRaw()
    if (!customMaps) return []
    return [...this.getCustomMapSet()]
  }

  sunkDescription (letter, middle = ' ') {
    return this.ships.sunkDescription(letter, middle)
  }
  addShapes (shapes) {
    this.ships.addShapes(shapes)
  }
  addWeapons (weapons) {
    this.weapons.addWeapons(weapons)
  }
}
export const MIN_CUSTOM_WIDTH = 16
export const MAX_CUSTOM_WIDTH = 22
export const MIN_CUSTOM_HEIGHT = 6
export const MAX_CUSTOM_HEIGHT = 12
export const oldToken = 'geoffs-battleship'

export const all = new SubTerrain('Air', '#a77', '#955', 'A', false, false, [])

export const mixed = new SubTerrain(
  'Mixed',
  '#888',
  '#666',
  'M',
  false,
  false,
  []
)

export class Matcher {
  constructor (validator, zoneDetail, subterrain) {
    this.validator = validator
    this.zoneDetail = zoneDetail
    this.subterrian = subterrain
  }
  canBe (subterrain) {
    return subterrain === this.subterrain
  }
}

export function makeKey (r, c) {
  return `${r},${c}`
}
export function parsePair (key) {
  const pair = key.split(',')
  const r = Number.parseInt(pair[0])
  const c = Number.parseInt(pair[1])
  return [r, c]
}
export function addCellToFootPrint (r, c, fp) {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      fp.add(`${r + i},${c + j}`)
    }
  }
}
