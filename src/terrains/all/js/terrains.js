// @ts-nocheck - JSDoc type inference limitation with object literal methods and 'this' binding

/**
 * @fileoverview Terrain Manager Module
 *
 * Provides a global singleton manager for terrain configurations and operations.
 * Handles storage, retrieval, and switching between different terrain types with
 * support for custom map dimensions and terrain lookup by tag.
 *
 * @module terrains/all/js/terrains
 */

import {
  MIN_CUSTOM_WIDTH,
  MAX_CUSTOM_WIDTH,
  MIN_CUSTOM_HEIGHT,
  MAX_CUSTOM_HEIGHT
} from './terrain.js'

/**
 * @typedef {import('./terrain.js').Terrain} Terrain
 */

/**
 * @typedef {Object} TerrainManager
 * @description Global singleton manager for terrain configurations and operations
 * @property {Terrain|null} current - The currently active terrain instance, or null if none is set
 * @property {Terrain[]} terrains - Registry of all available terrain instances
 * @property {Terrain|null} default - The default terrain to fallback to, or null if not set
 * @property {number} minWidth - Minimum width constraint for custom map dimensions
 * @property {number} maxWidth - Maximum width constraint for custom map dimensions
 * @property {number} minHeight - Minimum height constraint for custom map dimensions
 * @property {number} maxHeight - Maximum height constraint for custom map dimensions
 * @property {(newT: Terrain) => void} add - Registers a terrain if not already present
 * @property {(newCurrent: Terrain) => Terrain} setCurrent - Sets the active terrain and registers it
 * @property {(newCurrent: Terrain) => Terrain} setDefault - Sets default and current terrain simultaneously
 * @property {() => string[]} allBodyTags - Retrieves body tags from all registered terrains
 * @property {(tag: string|null|undefined) => Terrain|null|undefined} setByTag - Finds and sets terrain by tag
 * @property {(tag: string|null|undefined) => Terrain|null|undefined} getByTag - Finds terrain by tag without changing current
 */

/**
 * Global terrain manager for storing, retrieving, and switching between terrain configurations.
 *
 * This singleton manages the current active terrain, default terrain, and maintains a registry
 * of all available terrains. It provides methods for terrain lookup, registration, and activation.
 * It also exposes custom map dimension constraints for validation purposes.
 *
 * @type {TerrainManager}
 */
export const terrains = {
  /** @type {Terrain|null} */
  current: null,
  /** @type {Terrain[]} */
  terrains: [],
  /** @type {Terrain|null} */
  default: null,

  /**
   * Gets the minimum width for custom maps.
   * @returns {number} The minimum custom map width constant
   */
  get minWidth () {
    return MIN_CUSTOM_WIDTH
  },

  /**
   * Gets the maximum width for custom maps.
   * @returns {number} The maximum custom map width constant
   */
  get maxWidth () {
    return MAX_CUSTOM_WIDTH
  },

  /**
   * Gets the minimum height for custom maps.
   * @returns {number} The minimum custom map height constant
   */
  get minHeight () {
    return MIN_CUSTOM_HEIGHT
  },

  /**
   * Gets the maximum height for custom maps.
   * @returns {number} The maximum custom map height constant
   */
  get maxHeight () {
    return MAX_CUSTOM_HEIGHT
  },

  /**
   * Adds a terrain to the registry if it's not already present.
   * Prevents duplicate terrain instances in the registry.
   * @param {Terrain} newT - The terrain instance to add
   * @returns {void}
   */
  add: function (newT) {
    if (!this.terrains.includes(newT)) {
      this.terrains.push(newT)
    }
  },

  /**
   * Sets a terrain as the current active terrain and registers it if necessary.
   * Updates the current property and ensures the terrain is in the registry.
   * @param {Terrain} newCurrent - The terrain instance to set as current
   * @returns {Terrain} The terrain that was set as current
   */
  setCurrent: function (newCurrent) {
    this.add(newCurrent)
    this.current = newCurrent
    return this.current
  },

  /**
   * Sets a terrain as both the current active terrain and the default terrain.
   * This is a convenience method for initializing both properties at once.
   * @param {Terrain} newCurrent - The terrain instance to set as default and current
   * @returns {Terrain} The terrain that was set as default
   */
  setDefault: function (newCurrent) {
    this.default = this.setCurrent(newCurrent)
    return this.default
  },

  /**
   * Gets the body tags of all registered terrains.
   * Collects the bodyTag property from each terrain in the registry.
   * @returns {string[]} Array of body tag strings from all terrains
   */
  allBodyTags () {
    return this.terrains.map(t => t.bodyTag)
  },

  /**
   * Finds and sets a terrain as current by its tag.
   * Searches the registry for a terrain matching the provided tag and sets it as current if found.
   * @param {string|null|undefined} tag - The tag to search for (case-sensitive)
   * @returns {Terrain|null|undefined} The terrain with the matching tag, or undefined if not found
   */
  setByTag (tag) {
    if (tag) {
      const newTerrain = this.terrains.find(t => t.tag === tag)
      if (newTerrain) this.setCurrent(newTerrain)

      return newTerrain
    }
    return null
  },

  /**
   * Finds a terrain by its tag without changing the current terrain.
   * Searches the registry for a terrain matching the provided tag without side effects.
   * @param {string|null|undefined} tag - The tag to search for (case-sensitive)
   * @returns {Terrain|null|undefined} The terrain with the matching tag, or undefined if not found
   */
  getByTag (tag) {
    if (tag) {
      return this.terrains.find(t => t.tag === tag)
    }
    return null
  }
}
