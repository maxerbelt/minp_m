/**
 * @typedef {Object} TrayManagerElementCache
 * @property {() => HTMLDivElement[]} getAllTrays - Returns array of all tray DOM elements
 * @property {Object.<string, HTMLDivElement|null>} [trays] - Named tray element references
 */

/**
 * @typedef {Object} TrayStateOptions
 * @property {boolean} [clearContent=false] - Clear tray innerHTML
 * @property {boolean} [markEmpty=false] - Add 'empty' class to trays
 * @property {boolean} [unmarkEmpty=false] - Remove 'empty' class from trays
 * @property {boolean} [show=false] - Remove 'hidden' class from trays
 * @property {boolean} [hide=false] - Add 'hidden' class to trays
 */

/**
 * Callback function for operating on a tray element.
 * @callback TrayAction
 * @param {HTMLDivElement} tray - The tray element to operate on
 * @returns {void}
 */

/**
 * Adapter function for transforming tray item data with positional context.
 * @callback TrayItemAdapter
 * @param {HTMLElement} element - The tray item element
 * @param {number} trayIndex - Index of the parent tray
 * @param {number} itemIndex - Index of the item within the tray
 * @param {HTMLDivElement[]} trays - Array of all tray elements
 * @returns {*} Transformed data or computed result
 */

/**
 * Manages UI state and DOM operations for ship and brush trays.
 * Handles tray visibility, content clearing, and item iteration with
 * centralized state management to eliminate duplication.
 *
 * @class TrayManager
 */
export class TrayManager {
  /**
   * CSS class names for tray state management.
   *
   * @readonly
   */
  static #CSS_CLASSES = {
    EMPTY: 'empty',
    HIDDEN: 'hidden',
    HIDDEN_MISSPELLED: 'hidded' // Legacy: matches existing HTML
  }

  /**
   * Initializes the manager with an element cache.
   *
   * @param {TrayManagerElementCache} elementCache - Cache object with getAllTrays() method
   *   returning array of tray DOM elements
   */
  constructor (elementCache) {
    this.elementCache = elementCache
  }

  /**
   * Executes a function for each tray in the collection.
   *
   * @param {TrayAction} action - Function called for each tray element
   * @returns {void}
   */
  forEachTray (action) {
    for (const tray of this.elementCache.getAllTrays()) {
      action(tray)
    }
  }

  /**
   * Iterates over all items across all trays with positional context.
   * Resets itemIndex for each new tray.
   *
   * @param {TrayItemAdapter} action - Function called for each tray item with positional context
   * @returns {void}
   *
   * @example
   * manager.forEachTrayItem((element, trayIdx, itemIdx, trays) => {
   *   console.log(`Item ${itemIdx} in tray ${trayIdx}`);
   * });
   */
  forEachTrayItem (action) {
    const trays = this.elementCache.getAllTrays()
    let itemIndex = 0
    let trayIndex = 0

    for (const tray of trays) {
      for (const element of tray.children) {
        action(
          /** @type {HTMLElement} */ (element),
          trayIndex,
          itemIndex,
          trays
        )
        itemIndex++
      }
      trayIndex++
      itemIndex = 0
    }
  }

  /**
   * Finds a tray item by ship ID, applying an optional adapter function.
   * Used internally by getTrayItem and position-aware lookups.
   *
   * @param {number} shipId - Ship identifier to search for
   * @param {TrayItemAdapter} adapter - Adapter function that transforms/returns the result
   * @returns {*} Result of adapter function, or null if not found
   */
  #findTrayItemByShipId (shipId, adapter) {
    const trays = this.elementCache.getAllTrays()
    let itemIndex = 0
    let trayIndex = 0

    for (const tray of trays) {
      for (const child of tray.children) {
        const element = /** @type {HTMLElement} */ (child)
        const id = Number.parseInt(element.dataset.id, 10)
        if (id === shipId) {
          return adapter(element, trayIndex, itemIndex, trays)
        }
        itemIndex++
      }
      trayIndex++
      itemIndex = 0
    }
    return null
  }

  /**
   * Finds a tray item by ship ID, with optional context extraction.
   * Wraps #findTrayItemByShipId for public use.
   *
   * @param {number} shipId - Ship identifier to search for
   * @param {TrayItemAdapter} [adapter] - Optional transformer function.
   *   If omitted, returns the element itself.
   * @returns {HTMLElement|Object|null} The element or adapter result, or null if not found
   *
   * @example
   * // Get element directly
   * const element = manager.getTrayItemInfo(42);
   *
   * // Get with position context
   * const info = manager.getTrayItemInfo(42, (elem, trayIdx, itemIdx) => ({
   *   element: elem,
   *   position: { tray: trayIdx, item: itemIdx }
   * }));
   */
  getTrayItemInfo (shipId, adapter = el => el) {
    return this.#findTrayItemByShipId(shipId, adapter)
  }

  /**
   * Finds a tray item element by ship ID.
   * Convenience method for simple element lookup.
   *
   * @param {number} shipId - Ship identifier to search for
   * @returns {HTMLElement|null} The tray item element, or null if not found
   */
  getTrayItem (shipId) {
    return this.getTrayItemInfo(shipId)
  }

  /**
   * Applies CSS class changes to all trays based on options flags.
   * Options default to false (no-op), so only enabled flags modify state.
   *
   * @param {TrayStateOptions} [options={}] - State modification flags
   * @returns {void}
   */
  #applyTrayStateChanges (options = {}) {
    const {
      clearContent = false,
      markEmpty = false,
      unmarkEmpty = false,
      show = false,
      hide = false
    } = options

    this.forEachTray(tray => {
      if (clearContent) tray.innerHTML = ''
      if (markEmpty) tray.classList.add(TrayManager.#CSS_CLASSES.EMPTY)
      if (unmarkEmpty) tray.classList.remove(TrayManager.#CSS_CLASSES.EMPTY)
      if (show) tray.classList.remove(TrayManager.#CSS_CLASSES.HIDDEN)
      if (hide) tray.classList.add(TrayManager.#CSS_CLASSES.HIDDEN)
    })
  }

  /**
   * Sets tray visual state via CSS class changes.
   * Provides a declarative interface for multi-flag operations.
   *
   * @param {TrayStateOptions} [options={}] - State change options
   * @returns {void}
   */
  setTraysState (options = {}) {
    const {
      clearContent = true,
      markEmpty = false,
      unmarkEmpty = false,
      show = false,
      hide = false
    } = options

    this.#applyTrayStateChanges({
      clearContent,
      markEmpty,
      unmarkEmpty,
      show,
      hide
    })
  }

  // ============ Convenience state presets ============

  /**
   * Resets trays: clears content and marks empty.
   *
   * @returns {void}
   */
  resetTrays () {
    this.setTraysState({ clearContent: true, markEmpty: true })
  }

  /**
   * Clears tray content only, preserving empty/full state.
   *
   * @returns {void}
   */
  clearTrays () {
    this.setTraysState({ clearContent: true })
  }

  /**
   * Clears content and marks trays as populated (not empty).
   *
   * @returns {void}
   */
  setTrays () {
    this.setTraysState({ clearContent: true, unmarkEmpty: true })
  }

  /**
   * Makes ship trays visible and ready for display.
   * Clears brush tray and hides it.
   *
   * @returns {void}
   */
  showShipTrays () {
    this.setTraysState({
      clearContent: true,
      unmarkEmpty: true,
      show: true
    })

    // Clear and hide brush tray specifically
    if (this.elementCache.trays.brush) {
      this.elementCache.trays.brush.innerHTML = ''
      this.elementCache.trays.brush.classList.add(
        TrayManager.#CSS_CLASSES.HIDDEN_MISSPELLED
      )
    }

    this.elementCache.trays.container.classList.remove(
      TrayManager.#CSS_CLASSES.HIDDEN
    )
  }

  /**
   * Hides all ship trays and their container.
   *
   * @returns {void}
   */
  hideShipTrays () {
    this.setTraysState({ hide: true })
    this.elementCache.trays.container.classList.add(
      TrayManager.#CSS_CLASSES.HIDDEN
    )
  }

  /**
   * Makes brush tray visible and hides all ship trays.
   * Clears brush tray content.
   *
   * @returns {void}
   */
  showBrushTrays () {
    this.setTraysState({
      clearContent: true,
      unmarkEmpty: true,
      hide: true
    })

    // Prepare brush tray for display
    if (this.elementCache.trays.brush) {
      this.elementCache.trays.brush.innerHTML = ''
      this.elementCache.trays.brush.classList.remove(
        TrayManager.#CSS_CLASSES.HIDDEN_MISSPELLED
      )
    }

    this.elementCache.trays.container.classList.remove(
      TrayManager.#CSS_CLASSES.HIDDEN
    )
  }

  /**
   * Syncs tray 'empty' class with actual content state.
   * Adds 'empty' if no children, removes if children present.
   *
   * @returns {void}
   */
  checkTrays () {
    this.forEachTray(tray => {
      if (tray.children.length === 0) {
        tray.classList.add(TrayManager.#CSS_CLASSES.EMPTY)
      } else {
        tray.classList.remove(TrayManager.#CSS_CLASSES.EMPTY)
      }
    })
  }
}
