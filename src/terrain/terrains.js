import {
  MIN_CUSTOM_WIDTH,
  MAX_CUSTOM_WIDTH,
  MIN_CUSTOM_HEIGHT,
  MAX_CUSTOM_HEIGHT
} from './terrain.js'

export const terrains = {
  current: null,
  terrains: [],
  default: null,
  get minWidth () {
    return MIN_CUSTOM_WIDTH
  },
  get maxWidth () {
    return MAX_CUSTOM_WIDTH
  },
  get minHeight () {
    return MIN_CUSTOM_HEIGHT
  },
  get maxHeight () {
    return MAX_CUSTOM_HEIGHT
  },
  add: function (newT) {
    if (!this.terrains.includes(newT)) {
      this.terrains.push(newT)
    }
  },
  setCurrent: function (newCurrent) {
    this.add(newCurrent)
    this.current = newCurrent
    return this.current
  },
  setDefault: function (newCurrent) {
    this.default = this.setCurrent(newCurrent)
  },
  allBodyTags () {
    return this.terrains.map(t => t.bodyTag)
  },
  setByTag (tag) {
    if (tag) {
      const newTerrain = this.terrains.find(t => t.tag === tag)
      if (newTerrain) this.setCurrent(newTerrain)

      return newTerrain
    }
    return null
  },
  getByTag (tag) {
    if (tag) {
      return this.terrains.find(t => t.tag === tag)
    }
    return null
  }
}
