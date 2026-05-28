import { terrains } from './terrains.js'

/**
 * @typedef {import('./terrain.js').Terrain} Terrain
 */

/**
 * @typedef {import('./terrains.js').TerrainManager} TerrainManager
 */

/**
 * Audio manager for playing terrain-specific sound effects.
 * @typedef {Object} AudioManager
 * @property {(id: string, url: string) => void} playAfterLoad - Plays a sound after loading
 */

/**
 * Battle handler singleton object managing terrain, maps, and game state.
 * Provides global access to terrain configurations, ship/fleet builders,
 * and utilities for theme switching, bounds checking, and unit customization.
 *
 * @typedef {Object} BattleHandler
 * @property {Object.<string, any>} terrainMaps - Current terrain map container
 * @property {HTMLElement|null} widthUI - UI element for width display
 * @property {HTMLElement|null} heightUI - UI element for height display
 * @property {Terrain} terrain - Current active terrain (getter)
 * @property {string} terrainTitle - Title of current terrain (getter)
 * @property {string} mapHeading - Map heading from current terrain (getter)
 * @property {string} fleetHeading - Fleet heading from current terrain (getter)
 * @property {Object|undefined} sounds - Sound configuration from current terrain (getter)
 * @property {Function} playBoom - Plays terrain-specific boom sound
 * @property {boolean} hasTransforms - Whether current terrain has transforms (getter)
 * @property {Terrain|null} defaultTerrain - Default terrain fallback (getter)
 * @property {Function} terrainByTitle - Finds terrain by title
 * @property {Function} shipSunkText - Gets sunk ship description
 * @property {Function} shipDescription - Gets ship type description
 * @property {Terrain[]} terrainList - Array of all terrains (getter)
 * @property {Object} ships - Ship configuration from current terrain (getter)
 * @property {Object} shipTypes - Ship type definitions (getter)
 * @property {Object[]} subTerrains - Subterrain array (getter)
 * @property {string[]} subTerrainTags - Subterrain tag strings (getter)
 * @property {Function} subTerrainTagFromCell - Finds subterrain tag from element
 * @property {Function} shipType - Gets ship type by letter
 * @property {Object|null} terrainMap - Current terrain map (getter/setter)
 * @property {Object|null} maps - Current maps container (getter/setter)
 * @property {Object|null} map - Current active map (getter/setter)
 * @property {Function} inBounds - Checks if position is in bounds
 * @property {Function} isLand - Checks if position is land terrain
 * @property {Function} shapesByLetter - Gets shapes for a ship letter
 * @property {Function} shipBuilder - Ship builder function
 * @property {Function} fleetBuilder - Fleet builder function
 * @property {Function} setTheme - Applies terrain theme to UI
 * @property {Function} setTest - Configures test mode from URL parameters
 * @property {string[]} terrainTitleList - Array of terrain titles (getter)
 * @property {Function} setTerrainByTitle - Sets terrain by title
 * @property {Function} setTerrainByTag - Sets terrain by tag
 * @property {Function} getTerrainByTag - Gets terrain by tag without changing current
 * @property {Object} splashTags - Damage/effect classification tags (getter)
 * @property {Object.<string, string>} typeDescriptions - Ship type descriptions
 * @property {Object.<string, string>} unitDescriptions - Unit type descriptions
 * @property {Function} customizeUnits - Customizes unit elements
 * @property {AudioManager} audio - Audio playback manager
 * @property {boolean} [test] - Test mode flag
 */

/**
 * Global battle handler singleton.
 * Manages terrain configurations, maps, theme switching, and game state.
 * Prefers mocked terrain module when available (for testing), falls back to defaults.
 *
 * @type {BattleHandler|null}
 */
let bhLocal = null
try {
  // prefer an already-mocked terrain module (tests mock ../terrain/terrain.js)
  // eslint-disable-next-line no-undef
  const terrainModule = /** @type {any} */ (require('./terrain.js'))
  if (terrainModule?.bh) bhLocal = terrainModule.bh
} catch {
  // Fallback when terrain module is not available (common in test environments)
  console.debug('Terrain module not available, using default terrain')
}

if (!bhLocal)
  bhLocal = {
    terrainMaps: { current: {} },
    widthUI: null,
    heightUI: null,

    /**
     * Gets the currently active terrain instance.
     * @returns {Terrain} The active terrain configuration
     */
    get terrain () {
      return terrains.current
    },

    /**
     * Gets the title of the currently active terrain.
     * @returns {string|undefined} The terrain title or undefined if no terrain set
     */
    get terrainTitle () {
      return terrains.current?.title
    },

    /**
     * Gets the map heading from the currently active terrain.
     * @returns {string|undefined} The map heading or undefined if no terrain set
     */
    get mapHeading () {
      return terrains.current?.mapHeading
    },

    /**
     * Gets the fleet heading from the currently active terrain.
     * @returns {string|undefined} The fleet heading or undefined if no terrain set
     */
    get fleetHeading () {
      return terrains.current?.fleetHeading
    },

    /**
     * Gets the sound configuration from the currently active terrain.
     * @returns {Object|undefined} Sound definitions or undefined if no terrain set
     */
    get sounds () {
      return terrains.current?.sounds
    },

    /**
     * Plays a boom sound effect for the specified damage type.
     * Uses terrain-specific sound configuration to generate appropriate audio.
     *
     * @param {string} type - The damage or explosion type (e.g., 'normal', 'critical')
     * @returns {void}
     * @throws {void} Logs warning if sounds unavailable or specific type not configured
     */
    playBoom (type) {
      const sounds = this.sounds
      if (!sounds) {
        console.warn('No sounds defined for current terrain')
        return
      }
      const soundUrl = this.sounds?.[type]
      if (soundUrl) {
        this.audio.playAfterLoad(type + 'Boom', soundUrl)
      } else {
        console.warn('No boom sound for type', type)
      }
    },

    /**
     * Checks if the current terrain has variant transformations.
     * @returns {boolean|undefined} True if transformations available, undefined if no terrain set
     */
    get hasTransforms () {
      return terrains.current?.hasTransforms
    },

    /**
     * Gets the default terrain fallback instance.
     * @returns {Terrain|null} The default terrain or null
     */
    get defaultTerrain () {
      return terrains.default
    },

    /**
     * Finds and returns a terrain by its display title.
     * Falls back to default terrain if title not found.
     *
     * @param {string} title - The terrain title to search for
     * @returns {Terrain} Matching terrain or default terrain if not found
     */
    terrainByTitle (title) {
      return terrains.terrains.find(t => t.title === title) || bh.defaultTerrain
    },

    /**
     * Gets the ship sunk description text from current terrain.
     * Applies specific formatting based on ship letter and middle indicator.
     *
     * @param {string} letter - The ship letter identifier
     * @param {boolean} middle - Whether the hit was to ship middle section
     * @returns {string|undefined} The descriptive text or undefined if terrain not set
     */
    shipSunkText (letter, middle) {
      return terrains?.current?.sunkDescription(letter, middle)
    },

    /**
     * Gets the description for a specific ship type.
     * Returns text explaining the ship's role and capabilities.
     *
     * @param {string} letter - The ship letter identifier
     * @returns {string|undefined} Ship description or undefined if not defined
     */
    shipDescription (letter) {
      return terrains?.current?.ships?.descriptions[letter]
    },

    /**
     * Gets the array of all available terrains.
     * @returns {Terrain[]} Array of terrain instances
     */
    get terrainList () {
      return terrains?.terrains
    },

    /**
     * Gets the ship configuration from the currently active terrain.
     * @returns {Object|undefined} Ship configuration object or undefined if no terrain set
     */
    get ships () {
      return terrains?.current?.ships
    },

    /**
     * Gets the ship type definitions mapping for the current terrain.
     * Maps ship letters to their type definitions.
     *
     * @returns {Object|undefined} Ship types by letter or undefined if no terrain set
     */
    get shipTypes () {
      return terrains?.current?.ships?.types
    },

    /**
     * Gets the subterrains (terrain variants) for the current terrain.
     * Returns empty array if no terrain or subterrains defined.
     *
     * @returns {Object[]} Array of subterrain definitions
     */
    get subTerrains () {
      return terrains?.current?.subterrains || []
    },

    /**
     * Gets tag strings for all subterrains in current terrain.
     * Tags are used as CSS class identifiers for terrain elements.
     *
     * @returns {string[]} Array of subterrain tag strings
     */
    get subTerrainTags () {
      return this.subTerrains.map(st => st.tag)
    },

    /**
     * Finds the subterrain tag from a DOM element's class list.
     * Searches for matching subterrain tags in element's CSS classes.
     *
     * @param {HTMLElement} cell - The DOM element to inspect
     * @returns {string|undefined} Matching subterrain tag or undefined if none found
     */
    subTerrainTagFromCell (cell) {
      const classlist = cell.classList
      const wanted = this.subTerrainTags

      return wanted.find(cls => classlist.contains(cls))
    },

    /**
     * Gets the ship type definition for a specific ship letter.
     * Returns configuration including health, attacks, and other properties.
     *
     * @param {string} letter - The ship letter identifier
     * @returns {Object|undefined} Ship type definition or undefined if not found
     */
    shipType (letter) {
      return terrains?.current?.ships?.types[letter]
    },

    /**
     * Gets the current active terrain map instance.
     * @returns {Object|null} The active map object or null
     */
    get terrainMap () {
      return this.terrainMaps?.current
    },

    /**
     * Sets the current active terrain map.
     * Updates terrainMaps.current if setCurrent method is available.
     *
     * @param {Object} newCurrent - The new terrain map instance to activate
     * @returns {void}
     */
    set terrainMap (newCurrent) {
      if (
        this.terrainMaps.setCurrent &&
        newCurrent &&
        this.terrainMaps?.current !== newCurrent
      ) {
        this.terrainMaps.setCurrent(newCurrent)
      }
    },

    /**
     * Gets the maps container for the current terrain.
     * Returns terrainMaps.current or empty object if undefined.
     *
     * @returns {Object} Maps container or empty object
     */
    get maps () {
      return this.terrainMaps?.current || {}
    },

    /**
     * Sets the maps container for the current terrain.
     * Updates terrainMaps.current if setCurrent method is available.
     *
     * @param {Object} newCurrent - The new maps container
     * @returns {void}
     */
    set maps (newCurrent) {
      if (
        this.terrainMaps?.setCurrent &&
        newCurrent &&
        this.terrainMaps.current !== newCurrent
      ) {
        this.terrainMaps.setCurrent(newCurrent)
      }
    },

    /**
     * Gets the currently active map from the maps container.
     * @returns {Object|undefined} The active map or undefined
     */
    get map () {
      return this.terrainMaps?.current?.current
    },

    /**
     * Sets the currently active map in the maps container.
     * Calls setToMap if available on the maps container.
     *
     * @param {Object} newMap - The new map instance to activate
     * @returns {void}
     */
    set map (newMap) {
      if (newMap && this.terrainMaps?.current?.setToMap) {
        this.terrainMaps.current.setToMap(newMap)
      }
    },

    /**
     * Checks if a position is within the current map bounds.
     * Returns false if no map is active.
     *
     * @param {number} r - The row coordinate
     * @param {number} c - The column coordinate
     * @returns {boolean} True if position is within bounds, false otherwise
     */
    inBounds (r, c) {
      return this.terrainMaps?.current?.current?.inBounds(r, c)
    },

    /**
     * Checks if a position contains land terrain in the current map.
     * Returns false if no map is active.
     *
     * @param {number} r - The row coordinate
     * @param {number} c - The column coordinate
     * @returns {boolean} True if position is land, false otherwise
     */
    isLand (r, c) {
      return this.terrainMaps?.current?.current?.isLand(r, c)
    },

    /**
     * Gets the ship shapes for a specific ship letter from current terrain map.
     * Returns undefined if no shapes defined for that letter.
     *
     * @param {string} letter - The ship letter identifier
     * @returns {Object|undefined} Shape configuration for ship type or undefined
     */
    shapesByLetter (letter) {
      return this.terrainMaps?.current?.shapesByLetter[letter]
    },

    /**
     * Function reference for building individual ships.
     * Should be set to a function that constructs ship instances.
     *
     * @type {Function}
     */
    shipBuilder: Function.prototype,

    /**
     * Function reference for building fleets of ships.
     * Should be set to a function that constructs fleet instances.
     *
     * @type {Function}
     */
    fleetBuilder: Function.prototype,

    /**
     * Applies the current terrain's theme to the document.
     * Updates HTML link elements and body class to match terrain styling.
     * Safely handles missing DOM elements.
     *
     * @returns {void}
     */
    setTheme () {
      const terrainTheme = /** @type {HTMLLinkElement|null} */ (
        document.getElementById('terrainTheme')
      )
      const terrainBoot = /** @type {HTMLLinkElement|null} */ (
        document.getElementById('boot-trn')
      )
      const favicon = /** @type {HTMLLinkElement|null} */ (
        document.getElementById('favicon')
      )

      const body = document.getElementsByTagName('body')[0]
      if (terrainTheme && terrainBoot && favicon) {
        const bodyTag = terrains?.current.bodyTag || 'default'

        if (body.classList.contains(bodyTag)) return
        body.className = 'hidden-battle ' + bodyTag
        terrainTheme.href = `./terrains/${bodyTag}/styles/${bodyTag}.css`
        terrainBoot.href = `./terrains/${bodyTag}/styles/${bodyTag}-boot.css`
        favicon.href = `./terrains/${bodyTag}/images/favicons/favicon-48x48.png`
      }
    },

    /**
     * Configures test mode from URL parameters.
     * Sets this.test flag based on presence of 'test' query parameter.
     *
     * @param {URLSearchParams} urlParams - URL search parameters
     * @returns {void}
     */
    setTest (urlParams) {
      const testTag = urlParams.getAll('test')[0]
      this.test = !!testTag
    },

    /**
     * Gets array of terrain titles from the maps container.
     * Returns empty array if terrainMaps.list is undefined (safe for early init/tests).
     *
     * @returns {string[]} Array of terrain titles
     */
    get terrainTitleList () {
      // terrainMaps.list may be undefined during tests or early initialization.
      // Return an empty array rather than throwing so callers don't have to
      // catch exceptions.
      const list = this.terrainMaps?.list || []
      return list.map(t => t?.terrain?.title)
    },

    /**
     * Sets the active terrain by title, falling back to defaults if needed.
     * Tries title lookup first, then default, then first terrain by index.
     *
     * @param {string|null|undefined} title - The terrain title to activate
     * @returns {Terrain|undefined} The activated terrain or undefined if all fallbacks fail
     */
    setTerrainByTitle (title) {
      let result = null
      if (title) {
        result = this.terrainMaps.setByTitle(title)
      }

      return (
        result ||
        this.terrainMaps.setToDefault() ||
        this.terrainMaps.setByIndex(0)
      )
    },

    /**
     * Sets the active terrain by tag, falling back to defaults if needed.
     * Tries tag lookup first, then default, then first terrain by index.
     *
     * @param {string|null|undefined} tag - The terrain body tag to activate
     * @returns {Terrain|undefined} The activated terrain or undefined if all fallbacks fail
     */
    setTerrainByTag (tag) {
      let result = null
      if (tag) {
        result = this.terrainMaps.setByTag(tag)
      }

      return (
        result ||
        this.terrainMaps.setToDefault() ||
        this.terrainMaps.setByIndex(0)
      )
    },

    /**
     * Finds and returns a terrain by tag without changing the active terrain.
     * Safe lookup that doesn't modify state.
     *
     * @param {string|null|undefined} tag - The terrain body tag to find
     * @returns {Terrain|null} Matching terrain or null if not found
     */
    getTerrainByTag (tag) {
      if (tag) {
        return terrains.getByTag(tag)
      }
      return null
    },

    /**
     * Gets classification tags for splash damage and effect visualization.
     * Maps damage/effect codes to CSS class names for UI rendering.
     *
     * @returns {Object.<string, string>} Object mapping effect codes to class names
     */
    get splashTags () {
      return {
        0: 'destroy-vulnerable',
        1: 'destroy-normal',
        2: 'destroy-hardened',
        3: 'destroy-hardened',
        4: 'destroy-hardened',
        10: 'reveal-vulnerable',
        11: 'reveal-normal',
        12: 'reveal-hardened',
        20: 'weapon-path',
        30: 'path-vulnerable',
        31: 'path-normal'
      }
    },

    /**
     * Human-readable descriptions for ship type classifications.
     * Maps single-letter ship type codes to display names.
     *
     * @type {Object.<string, string>}
     */
    typeDescriptions: {
      A: 'Air',
      G: 'Land',
      M: 'Hybrid',
      T: 'Transformer',
      X: 'Special',
      S: 'Sea',
      W: 'Weapon'
    },

    /**
     * Human-readable descriptions for unit type classifications.
     * Maps single-letter unit type codes to display names.
     *
     * @type {Object.<string, string>}
     */
    unitDescriptions: {
      A: 'Air',
      G: 'Land',
      X: 'Special',
      S: 'Sea',
      W: 'Weapon'
    },

    /**
     * Customizes unit UI elements based on unit descriptions.
     * Iterates over unit descriptions and applies custom logic to matching elements.
     *
     * @param {string} elementTag - Tag suffix for element ID lookup (e.g., 'button' searches for 'air-button')
     * @param {Function} [customize=Function.prototype] - Optional callback applied to matching elements
     *   Signature: (letter: string, description: string, element: HTMLElement, key: string) => void
     * @returns {void}
     */
    customizeUnits (elementTag, customize = Function.prototype) {
      const descriptions = Object.entries(bh.unitDescriptions)
      for (const [letter, description] of descriptions) {
        const key = description.toLowerCase() + elementTag
        const el = document.getElementById(key)
        if (el && customize !== Function.prototype) {
          customize(letter, description, el, key)
        }
      }
    },

    /**
     * Audio manager instance for playing terrain-specific sound effects.
     * Handles sound loading and playback with optional preloading.
     *
     * @type {AudioManager}
     */
    audio: {
      /**
       * Plays a sound after loading from URL.
       * Loads the sound asynchronously if not already cached.
       *
       * @param {string} id - Unique identifier for the sound
       * @param {string} url - URL to load the sound from
       * @returns {void}
       */
      playAfterLoad: (id, url) => {
        // Placeholder implementation - replaced by actual audio manager
      }
    }
  }

/**
 * Global battle handler singleton instance.
 * Manages terrain configurations, maps, UI state, and theme switching.
 *
 * @type {BattleHandler}
 */
export const bh = bhLocal
