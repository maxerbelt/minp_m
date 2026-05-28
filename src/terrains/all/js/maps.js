/**
 * @fileoverview Terrain Maps Management System
 *
 * Manages the collection of terrain maps and provides methods to switch between them.
 * Acts as a central registry for all available terrain map configurations with support
 * for lookup by index, terrain object, tag, or title.
 *
 * @module terrains/all/js/maps
 */

import { placingTarget } from '../../../variants/placingTarget.js'
import { terrains } from './terrains.js'
import { bh } from './bh.js'

/**
 * @typedef {Object} TerrainMap
 * @property {Object} terrain - The terrain object associated with this map
 * @property {string} [tag] - Optional tag identifier for the terrain
 * @property {Function} inBounds - Function to check if coordinates are within bounds
 * @property {Function} inAllBounds - Function to check if coordinates are within all valid areas
 * @property {Function} zoneInfo - Function to get zone information for coordinates
 */

/**
 * @callback OnMapChangeCallback
 * @param {TerrainMap} newMap - The newly activated terrain map
 * @returns {void}
 */

/**
 * Manages the collection of terrain maps and provides methods to switch between them.
 * Acts as a central registry for all available terrain map configurations.
 * Coordinates with the global terrains registry and placingTarget system.
 *
 * @type {Object}
 * @public
 * @static
 */
export const terrainsMaps = {
  /**
   * The currently active terrain map.
   * Set when a map is activated via setCurrent() or related methods.
   *
   * @type {TerrainMap|null}
   * @public
   */
  current: null,

  /**
   * List of all registered terrain maps.
   * Populated by add() method, searched by setBy* methods.
   *
   * @type {TerrainMap[]}
   * @public
   */
  list: [],

  /**
   * Callback function called when the current map changes.
   * Invoked by setCurrent() after successful map activation.
   *
   * @type {OnMapChangeCallback}
   * @public
   */
  onChange: Function.prototype,

  /**
   * Adds a new terrain map to the collection if it doesn't already exist.
   * Also registers the map's terrain with the global terrains registry.
   *
   * @param {TerrainMap} newTM - The terrain map to add
   * @returns {void}
   * @public
   */
  add: function (newTM) {
    terrains.add(newTM.terrain)
    if (this.list?.includes(newTM)) return
    this.list.push(newTM)
  },

  /**
   * Sets the current terrain map and updates related systems.
   * Updates the global terrains registry, placing target bounds checkers, and zone info getter.
   * Invokes the onChange callback if the map actually changes.
   *
   * @param {TerrainMap} newCurrent - The terrain map to set as current
   * @returns {void}
   * @public
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
   * Returns early if index is null or undefined without error.
   *
   * @param {number|null|undefined} idx - The index of the terrain map to set
   * @returns {TerrainMap|null|undefined} The terrain map that was set, or null/undefined if invalid index
   * @public
   */
  setByIndex (idx) {
    if (idx != null) {
      const newTerrain = this.list[idx]
      if (newTerrain) this.setCurrent(newTerrain)
      return newTerrain
    }
    return null
  },

  /**
   * Sets the current terrain map by matching its terrain object.
   * Searches the list for a map whose terrain matches the provided terrain object.
   *
   * @param {Object} terrain - The terrain object to match
   * @returns {TerrainMap|null|undefined} The terrain map that was set, or null if not found
   * @public
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
   * Searches for both terrain.tag and terrain.bodyTag properties.
   *
   * @param {string} tag - The tag to search for (case-insensitive)
   * @returns {TerrainMap|null|undefined} The terrain map that was set, or null if not found
   * @public
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
   * Title matching is case-sensitive.
   *
   * @param {string} title - The title to search for
   * @returns {TerrainMap|null|undefined} The terrain map that was set, or null if not found
   * @public
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
   * The default map is determined by the terrains registry.
   *
   * @returns {TerrainMap|null|undefined} The default terrain map that was set
   * @public
   */
  setToDefault () {
    const newTerrain = this.default
    if (newTerrain) this.setCurrent(newTerrain)
    return newTerrain
  },

  /**
   * Sets the current terrain map by tag, with fallback to default or first map.
   * Attempts lookup in the following order:
   * 1. Search by tag (case-insensitive)
   * 2. Fall back to default map
   * 3. Fall back to first map in list
   *
   * @param {string} tag - The tag to search for
   * @returns {TerrainMap|null} The terrain map that was set
   * @public
   */
  setByTag (tag) {
    return this.setByTagBase(tag) || this.setToDefault() || this.setByIndex(0)
  }
}

bh.terrainMaps = terrainsMaps
