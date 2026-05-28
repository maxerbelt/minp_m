// @ts-nocheck
// JSDoc type inference limitation: TypeScript doesn't infer properties on object literal methods
// using 'this' binding. The @ts-nocheck is necessary for this design pattern.
// All methods are properly typed with JSDoc annotations for IDE support.

/**
 * @fileoverview Terrain Manager Module
 *
 * Provides a global singleton manager for terrain configurations and operations.
 * Handles storage, retrieval, and switching between different terrain types with
 * support for custom map dimensions and terrain lookup by tag.
 *
 * The terrains singleton uses an object literal pattern to maintain a unified
 * public API for terrain management across the application.
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
 * @description Configuration object representing a single terrain type with
 * properties and behavior for map rendering and game mechanics
 */

/**
 * @typedef {Object} TerrainManager
 * @description Global singleton manager for terrain configurations and operations.
 * Maintains the active terrain state, terrain registry, and custom map constraints.
 * Provides methods for terrain lookup by tag and terrain switching operations.
 *
 * @property {Terrain|null} current
 *   The currently active terrain instance, or null if none is set.
 *   Updated via setCurrent() or setByTag() methods.
 *
 * @property {Terrain[]} terrains
 *   Registry of all available terrain instances. Populated via add() or setCurrent().
 *   Acts as the source of truth for all registered terrains in the application.
 *
 * @property {Terrain|null} default
 *   The default terrain to fallback to, or null if not set.
 *   Set via setDefault() method for initialization purposes.
 *
 * @property {number} minWidth
 *   Minimum width constraint for custom map dimensions.
 *   Getter that returns MIN_CUSTOM_WIDTH constant.
 *
 * @property {number} maxWidth
 *   Maximum width constraint for custom map dimensions.
 *   Getter that returns MAX_CUSTOM_WIDTH constant.
 *
 * @property {number} minHeight
 *   Minimum height constraint for custom map dimensions.
 *   Getter that returns MIN_CUSTOM_HEIGHT constant.
 *
 * @property {number} maxHeight
 *   Maximum height constraint for custom map dimensions.
 *   Getter that returns MAX_CUSTOM_HEIGHT constant.
 *
 * @property {(newT: Terrain) => void} add
 *   Registers a terrain instance in the registry.
 *   No-op if terrain is already registered (prevents duplicates).
 *
 * @property {(newCurrent: Terrain) => Terrain} setCurrent
 *   Sets the active terrain and registers it in the registry.
 *   Returns the newly set current terrain.
 *
 * @property {(newCurrent: Terrain) => Terrain} setDefault
 *   Sets the default terrain and current terrain simultaneously.
 *   Convenience method for initialization. Returns the newly set default.
 *
 * @property {() => string[]} allBodyTags
 *   Retrieves body tags from all registered terrains.
 *   Useful for UI rendering and terrain validation.
 *
 * @property {(tag: string|null|undefined) => Terrain|null|undefined} setByTag
 *   Finds and sets terrain by tag, updating the current terrain.
 *   Returns the found terrain or undefined if not found. Returns null if tag is falsy.
 *
 * @property {(tag: string|null|undefined) => Terrain|null|undefined} getByTag
 *   Finds terrain by tag without changing the current terrain.
 *   Read-only lookup. Returns the found terrain or undefined if not found.
 *   Returns null if tag is falsy.
 */

/**
 * Global terrain manager for storing, retrieving, and switching between terrain configurations.
 *
 * This singleton manages the current active terrain, default terrain, and maintains a registry
 * of all available terrains. It provides methods for terrain lookup, registration, and activation.
 * It also exposes custom map dimension constraints for validation purposes.
 *
 * Design Pattern:
 * - Uses object literal singleton pattern with bound methods
 * - Maintains mutable state properties: current, terrains, default
 * - Exposes dimension constraints via getter properties
 * - All state modifications go through dedicated methods to maintain consistency
 *
 * Usage Example:
 * ```javascript
 * // Register a terrain
 * terrains.add(myTerrain)
 * // Set as current
 * terrains.setCurrent(myTerrain)
 * // Find by tag
 * const found = terrains.getByTag('desert')
 * ```
 *
 * @type {TerrainManager}
 * @public
 * @global
 */
export const terrains = {
  /**
   * The currently active terrain instance.
   * Updated via setCurrent() and setByTag() methods.
   * @type {Terrain|null}
   * @private
   */
  current: null,

  /**
   * Registry of all available terrain instances.
   * Populated via add() and setCurrent() methods.
   * @type {Terrain[]}
   * @private
   */
  terrains: [],

  /**
   * The default terrain to fallback to.
   * Set via setDefault() method.
   * @type {Terrain|null}
   * @private
   */
  default: null,

  /**
   * Gets the minimum width for custom maps.
   * Exposes the MIN_CUSTOM_WIDTH constant for validation purposes.
   *
   * @returns {number} The minimum custom map width constraint
   */
  get minWidth () {
    return MIN_CUSTOM_WIDTH
  },

  /**
   * Gets the maximum width for custom maps.
   * Exposes the MAX_CUSTOM_WIDTH constant for validation purposes.
   *
   * @returns {number} The maximum custom map width constraint
   */
  get maxWidth () {
    return MAX_CUSTOM_WIDTH
  },

  /**
   * Gets the minimum height for custom maps.
   * Exposes the MIN_CUSTOM_HEIGHT constant for validation purposes.
   *
   * @returns {number} The minimum custom map height constraint
   */
  get minHeight () {
    return MIN_CUSTOM_HEIGHT
  },

  /**
   * Gets the maximum height for custom maps.
   * Exposes the MAX_CUSTOM_HEIGHT constant for validation purposes.
   *
   * @returns {number} The maximum custom map height constraint
   */
  get maxHeight () {
    return MAX_CUSTOM_HEIGHT
  },

  /**
   * Adds a terrain to the registry if not already present.
   *
   * This method prevents duplicate terrain instances in the registry by checking
   * for the terrain's existence before adding. It's a no-op if the terrain is
   * already registered.
   *
   * @param {Terrain} newT - The terrain instance to add to the registry
   * @returns {void}
   *
   * @remarks
   * - Side effect: May modify this.terrains array by appending newT
   * - If terrain already exists, no change occurs
   * - Used by setCurrent() and setDefault() to ensure registry consistency
   */
  add: function (newT) {
    if (!this.terrains.includes(newT)) {
      this.terrains.push(newT)
    }
  },

  /**
   * Sets a terrain as the current active terrain and registers it.
   *
   * This method updates the current property and ensures the terrain is registered
   * in the terrains array by calling add(). Used throughout the application to
   * activate terrain configurations.
   *
   * @param {Terrain} newCurrent - The terrain instance to set as the active terrain
   * @returns {Terrain} The terrain that was set as current
   *
   * @remarks
   * - Side effects: Updates this.current and may modify this.terrains array
   * - Always registers the terrain via add() before setting as current
   * - Returns the same terrain passed in for method chaining
   * - Called by setDefault() and setByTag() for consistency
   */
  setCurrent: function (newCurrent) {
    this.add(newCurrent)
    this.current = newCurrent
    return this.current
  },

  /**
   * Sets a terrain as both the current active terrain and the default terrain.
   *
   * Convenience method for initialization that updates both the default and current
   * properties in a single call. The terrain is registered in the registry via setCurrent().
   *
   * @param {Terrain} newCurrent - The terrain instance to set as default and current
   * @returns {Terrain} The terrain that was set as default
   *
   * @remarks
   * - Side effects: Updates this.default and this.current via setCurrent()
   * - Typically called during application initialization
   * - Delegates to setCurrent() for consistent registration and activation
   * - Returns the same terrain passed in for method chaining
   */
  setDefault: function (newCurrent) {
    this.default = this.setCurrent(newCurrent)
    return this.default
  },

  /**
   * Gets the body tags of all registered terrains.
   *
   * Collects the bodyTag property from each terrain in the registry. Useful for
   * UI rendering, validation, and terrain identification across the application.
   *
   * @returns {string[]} Array of body tag strings from all registered terrains
   *
   * @remarks
   * - Pure function: No side effects, depends only on this.terrains
   * - Returns an array in the same order as terrains are registered
   * - Used for populating terrain selection menus and validations
   * - Returns empty array if no terrains registered
   */
  allBodyTags () {
    return this.terrains.map(t => t.bodyTag)
  },

  /**
   * Finds and sets a terrain as current by its tag.
   *
   * Searches the registry for a terrain matching the provided tag (case-sensitive).
   * If found, sets it as the current active terrain via setCurrent().
   * Returns null for falsy tags, undefined if tag not found in registry.
   *
   * @param {string|null|undefined} tag - The terrain tag to search for (case-sensitive)
   * @returns {Terrain|null|undefined}
   *   - Returns the Terrain if found and set as current
   *   - Returns undefined if tag is truthy but not found in registry
   *   - Returns null if tag is falsy (null, undefined, empty string)
   *
   * @remarks
   * - Side effects: Updates this.current and may register terrain via setCurrent()
   * - Tag comparison is case-sensitive
   * - Only sets current if terrain is found (no error on missing terrain)
   * - Falsy tags (null, undefined) are treated as explicit null returns
   * - Useful for URL routing and UI state restoration
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
   *
   * Pure lookup method that searches the registry for a terrain matching the provided tag.
   * Unlike setByTag(), this method has no side effects and does not modify state.
   * Returns null for falsy tags, undefined if tag not found in registry.
   *
   * @param {string|null|undefined} tag - The terrain tag to search for (case-sensitive)
   * @returns {Terrain|null|undefined}
   *   - Returns the Terrain if found in registry
   *   - Returns undefined if tag is truthy but not found in registry
   *   - Returns null if tag is falsy (null, undefined, empty string)
   *
   * @remarks
   * - Pure function: No side effects, only reads state
   * - Tag comparison is case-sensitive
   * - Parallel to setByTag() but without the terrain activation
   * - Useful for validation and existence checks before activation
   * - Safe to call repeatedly without modifying application state
   */
  getByTag (tag) {
    if (tag) {
      return this.terrains.find(t => t.tag === tag)
    }
    return null
  }
}
