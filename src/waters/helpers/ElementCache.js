/**
 * Cache for frequently accessed DOM button elements.
 * Reduces repetitive document.getElementById() calls and improves code clarity.
 * @typedef {Object} ElementCacheButtons
 * @property {HTMLButtonElement|null} newPlacement - Button for new placement
 * @property {HTMLButtonElement|null} rotate - Button for rotate action
 * @property {HTMLButtonElement|null} rotateLeft - Button for rotate-left action
 * @property {HTMLButtonElement|null} flip - Button for flip action
 * @property {HTMLButtonElement|null} transform - Button for transform action
 * @property {HTMLButtonElement|null} test - Button for test action
 * @property {HTMLButtonElement|null} seek - Button for seek action
 * @property {HTMLButtonElement|null} stop - Button for stop action
 * @property {HTMLButtonElement|null} undo - Button for undo action
 * @property {HTMLButtonElement|null} auto - Button for auto action
 */

/**
 * Cache for frequently accessed DOM tray container elements.
 * Organizes UI elements by category for quick access and type safety.
 * @typedef {Object} ElementCacheTrays
 * @property {HTMLDivElement|null} container - Main tray container
 * @property {HTMLDivElement|null} ship - Ship tray
 * @property {HTMLDivElement|null} plane - Plane/aircraft tray
 * @property {HTMLDivElement|null} special - Special units tray
 * @property {HTMLDivElement|null} brush - Brush/terrain tray
 * @property {HTMLDivElement|null} weapon - Weapon tray
 * @property {HTMLDivElement|null} building - Building/structure tray
 */

/**
 * Caches DOM elements to reduce repetitive document.getElementById() calls.
 * Improves performance and provides centralized element access with proper typing.
 * All cached elements are lazily initialized and may be null if elements don't exist in DOM.
 *
 * @class ElementCache
 */
export class ElementCache {
  /**
   * Initializes the cache with button and tray element references.
   * Queries the DOM for all managed elements and stores references.
   * Elements that don't exist in the DOM will be null.
   */
  constructor () {
    /** @type {ElementCacheButtons} */
    this.buttons = {
      newPlacement: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('newPlacement')
      ),
      rotate: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('rotateBtn')
      ),
      rotateLeft: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('rotateLeftBtn')
      ),
      flip: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('flipBtn')
      ),
      transform: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('transformBtn')
      ),
      test: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('testBtn')
      ),
      seek: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('seekBtn')
      ),
      stop: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('stopBtn')
      ),
      undo: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('undoBtn')
      ),
      auto: /** @type {HTMLButtonElement|null} */ (
        document.getElementById('autoBtn')
      )
    }

    /** @type {ElementCacheTrays} */
    this.trays = {
      container: /** @type {HTMLDivElement|null} */ (
        document.getElementById('tray-container')
      ),
      ship: /** @type {HTMLDivElement|null} */ (
        document.getElementById('shipTray')
      ),
      plane: /** @type {HTMLDivElement|null} */ (
        document.getElementById('planeTray')
      ),
      special: /** @type {HTMLDivElement|null} */ (
        document.getElementById('specialTray')
      ),
      brush: /** @type {HTMLDivElement|null} */ (
        document.getElementById('brushTray')
      ),
      weapon: /** @type {HTMLDivElement|null} */ (
        document.getElementById('weaponTray')
      ),
      building: /** @type {HTMLDivElement|null} */ (
        document.getElementById('buildingTray')
      )
    }
  }

  /**
   * Gets a button element by property name.
   * Provides type-safe access to cached button elements.
   * Returns null if the button wasn't found during initialization or name is invalid.
   *
   * @param {string} name - Button name/property key (e.g., 'rotate', 'undo', 'test')
   * @returns {HTMLButtonElement|null} The button element or null if not found
   */
  getButtonByName (name) {
    return this.buttons[name]
  }

  /**
   * Gets all tray elements as an array.
   * Provides convenient access to all tray containers for batch operations.
   * May include null values if trays weren't found during initialization.
   *
   * @returns {Array<HTMLDivElement|null>} Array of tray elements
   */
  getAllTrays () {
    return [
      this.trays.ship,
      this.trays.plane,
      this.trays.special,
      this.trays.building,
      this.trays.weapon
    ]
  }

  /**
   * Gets tray container by unit/item type code.
   * Maps game item types to their corresponding UI tray containers.
   * Includes fallback lazy-loading of tray elements if not cached.
   * Returns null if type is not recognized or tray element not found.
   *
   * Type mapping:
   * - 'A': Aircraft/Plane tray
   * - 'S': Ship tray
   * - 'M', 'T', 'X': Special units tray
   * - 'G': Building/Ground structure tray
   * - 'W': Weapon tray
   *
   * @param {string} type - Unit type code (single character: A, S, M, T, X, G, W)
   * @returns {HTMLDivElement|null} The tray container for the type, or null if not found
   */
  getTrayByType (type) {
    const typeToTrayKey = {
      A: 'plane',
      S: 'ship',
      M: 'special',
      T: 'special',
      X: 'special',
      G: 'building',
      W: 'weapon'
    }

    const trayKey = typeToTrayKey[type]
    if (!trayKey) return null

    let tray = this.trays[trayKey]
    if (!tray) {
      const trayIdMap = {
        ship: 'shipTray',
        plane: 'planeTray',
        special: 'specialTray',
        building: 'buildingTray',
        weapon: 'weaponTray'
      }
      const trayId = trayIdMap[trayKey]
      if (trayId) {
        tray = /** @type {HTMLDivElement|null} */ (
          document.getElementById(trayId)
        )
        if (tray) {
          this.trays[trayKey] = tray
        }
      }
    }

    return tray
  }
}
