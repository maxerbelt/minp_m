import { placingTarget } from '../../../variants/makeCell3.js'
import { terrains } from './terrains.js'
import { bh } from './bh.js'

/**
 * Manages the collection of terrain maps and provides methods to switch between them.
 * Acts as a central registry for all available terrain map configurations.
 */
export const terrainsMaps = {
  /** @type {Object|null} The currently active terrain map */
  current: null,

  /** @type {Array} List of all registered terrain maps */
  list: [],

  /** @type {Function} Callback function called when the current map changes */
  onChange: Function.prototype,

  /**
   * Adds a new terrain map to the collection if it doesn't already exist.
   * @param {Object} newTM - The terrain map to add
   */
  add: function (newTM) {
    terrains.add(newTM.terrain)
    if (this.list?.includes(newTM)) return
    this.list.push(newTM)
  },

  /**
   * Sets the current terrain map and updates related systems.
   * @param {Object} newCurrent - The terrain map to set as current
   */
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

  /**
   * Sets the current terrain map by its index in the list.
   * @param {number} idx - The index of the terrain map to set
   * @returns {Object|null} The terrain map that was set, or null if invalid index
   */
  setByIndex (idx) {
    if (idx !== null && idx !== undefined) {
      const newTerrain = this.list[idx]
      if (newTerrain) this.setCurrent(newTerrain)
      return newTerrain
    }
    return null
  },

  /**
   * Sets the current terrain map by matching its terrain object.
   * @param {Object} terrain - The terrain object to match
   * @returns {Object|null} The terrain map that was set, or null if not found
   */
  setByTerrain (terrain) {
    if (terrain) {
      const newTerrain = this.list.find(t => t.tag === terrain)
      if (newTerrain) this.setCurrent(newTerrain)
      return newTerrain
    }
    return null
  },

  /**
   * Sets the current terrain map by matching its tag (case-insensitive).
   * @param {string} tag - The tag to search for
   * @returns {Object|null} The terrain map that was set, or null if not found
   */
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

  /**
   * Sets the current terrain map by matching its title.
   * @param {string} title - The title to search for
   * @returns {Object|null} The terrain map that was set, or null if not found
   */
  setByTitle (title) {
    if (title) {
      const newTerrain = this.list.find(t => t?.terrain?.title === title)
      if (newTerrain) this.setCurrent(newTerrain)
      return newTerrain
    }
    return null
  },

  /**
   * Sets the current terrain map to the default one.
   * @returns {Object|null} The default terrain map that was set
   */
  setToDefault () {
    const newTerrain = this.default
    if (newTerrain) this.setCurrent(newTerrain)
    return newTerrain
  },

  /**
   * Sets the current terrain map by tag, falling back to default or first map.
   * @param {string} tag - The tag to search for
   * @returns {Object|null} The terrain map that was set
   */
  setByTag (tag) {
    return this.setByTagBase(tag) || this.setToDefault() || this.setByIndex(0)
  }
}

bh.terrainMaps = terrainsMaps
