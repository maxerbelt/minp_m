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
 * @property {Terrain|null} current - The currently active terrain
 * @property {Terrain[]} terrains - Registry of all available terrains
 * @property {Terrain|null} default - The default terrain to use
 * @property {number} minWidth - Minimum width for custom maps
 * @property {number} maxWidth - Maximum width for custom maps
 * @property {number} minHeight - Minimum height for custom maps
 * @property {number} maxHeight - Maximum height for custom maps
 * @property {(newT: Terrain) => void} add - Adds a terrain to the registry
 * @property {(newCurrent: Terrain) => Terrain} setCurrent - Sets a terrain as current
 * @property {(newCurrent: Terrain) => Terrain} setDefault - Sets a terrain as default
 * @property {() => string[]} allBodyTags - Gets all terrain body tags
 * @property {(tag: string|null|undefined) => Terrain|null|undefined} setByTag - Sets terrain by tag
 * @property {(tag: string|null|undefined) => Terrain|null|undefined} getByTag - Gets terrain by tag
 */

/**
 * Global terrain manager for storing, retrieving, and switching between terrain configurations.
 * Manages the current active terrain, default terrain, and a registry of all available terrains.
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
   * @returns {number} The minimum custom map width
   */
  get minWidth () {
    return MIN_CUSTOM_WIDTH
  },

  /**
   * Gets the maximum width for custom maps.
   * @returns {number} The maximum custom map width
   */
  get maxWidth () {
    return MAX_CUSTOM_WIDTH
  },

  /**
   * Gets the minimum height for custom maps.
   * @returns {number} The minimum custom map height
   */
  get minHeight () {
    return MIN_CUSTOM_HEIGHT
  },

  /**
   * Gets the maximum height for custom maps.
   * @returns {number} The maximum custom map height
   */
  get maxHeight () {
    return MAX_CUSTOM_HEIGHT
  },

  /**
   * Adds a terrain to the registry if it's not already present.
   * @param {Terrain} newT - The terrain to add
   * @returns {void}
   */
  add: function (newT) {
    if (!this.terrains.includes(newT)) {
      this.terrains.push(newT)
    }
  },

  /**
   * Sets a terrain as the current active terrain and adds it to the registry.
   * @param {Terrain} newCurrent - The terrain to set as current
   * @returns {Terrain} The terrain that was set as current
   */
  setCurrent: function (newCurrent) {
    this.add(newCurrent)
    this.current = newCurrent
    return this.current
  },

  /**
   * Sets a terrain as both the current active terrain and the default terrain.
   * @param {Terrain} newCurrent - The terrain to set as default and current
   * @returns {Terrain} The terrain that was set as default
   */
  setDefault: function (newCurrent) {
    this.default = this.setCurrent(newCurrent)
    return this.default
  },

  /**
   * Gets the body tags of all registered terrains.
   * @returns {string[]} Array of body tag strings from all terrains
   */
  allBodyTags () {
    return this.terrains.map(t => t.bodyTag)
  },

  /**
   * Finds and sets a terrain as current by its tag.
   * @param {string|null|undefined} tag - The tag to search for
   * @returns {Terrain|null|undefined} The terrain with the matching tag, or null/undefined if not found
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
   * @param {string|null|undefined} tag - The tag to search for
   * @returns {Terrain|null|undefined} The terrain with the matching tag, or null/undefined if not found
   */
  getByTag (tag) {
    if (tag) {
      return this.terrains.find(t => t.tag === tag)
    }
    return null
  }
}
