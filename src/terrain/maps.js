import { placingTarget } from '../variants/makeCell3.js'
import { terrains } from './terrains.js'
import { bh } from './bh.js'

export const terrainsMaps = {
  current: null,
  list: [],
  onChange: Function.prototype,
  add: function (newTM) {
    terrains.add(newTM.terrain)
    if (this.list?.includes(newTM)) return
    this.list.push(newTM)
  },
  setCurrent: function (newCurrent) {
    if (newCurrent === this.current) return

    this.add(newCurrent)
    terrains.setCurrent(newCurrent.terrain)
    this.current = newCurrent
    placingTarget.boundsChecker = newCurrent.inBounds.bind(newCurrent)
    placingTarget.allBoundsChecker = newCurrent.inAllBounds.bind(newCurrent)
    placingTarget.getZone = newCurrent.zoneInfo.bind(newCurrent)

    this.onChange(newCurrent)
  },
  setByIndex (idx) {
    if (idx !== null && idx !== undefined) {
      const newTerrain = this.list[idx]
      if (newTerrain) this.setCurrent(newTerrain)
      return newTerrain
    }
    return null
  },
  setByTerrain (terrain) {
    if (terrain) {
      const newTerrain = this.list.find(t => t.tag === terrain)
      if (newTerrain) this.setCurrent(newTerrain)
      return newTerrain
    }
    return null
  },
  setByTagBase (tag) {
    if (tag) {
      tag = tag.toLowerCase()
      const newTerrain = this.list.find(
        t =>
          t?.terrain?.tag?.toLowerCase() === tag ||
          t?.terrain?.bodyTag?.toLowerCase() === tag
      )
      if (newTerrain) this.setCurrent(newTerrain)
      return newTerrain
    }
    return null
  },
  setByTitle (title) {
    if (title) {
      const newTerrain = this.list.find(t => t?.terrain?.title === title)
      if (newTerrain) this.setCurrent(newTerrain)
      return newTerrain
    }
    return null
  },
  setToDefault () {
    const newTerrain = this.default
    if (newTerrain) this.setCurrent(newTerrain)
    return newTerrain
  },
  setByTag (tag) {
    return this.setByTagBase(tag) || this.setToDefault() || this.setByIndex(0)
  }
}
bh.terrainMaps = terrainsMaps
