/**
 * @typedef {'dilate'|'erode'|'cross'} MorphologyOperation
 */

/**
 * @typedef {'r90'|'r180'|'r270'|'fx'|'fy'|'fxy'} TransformMapName
 */

/**
 * @typedef {'empty'|'full'|'inverse'} MaskAction
 */

/**
 * @typedef {Object} ButtonConfig
 * @property {string} id - HTML element ID
 */

/**
 * @typedef {Object} MorphologyButtonConfig
 * @property {string} id - HTML element ID
 * @property {MorphologyOperation} operation - Operation type
 */

/**
 * @typedef {Object} TransformButtonConfig
 * @property {string} id - HTML element ID
 * @property {TransformMapName} mapName - Transform map name
 */

/**
 * @typedef {Object} ActionButtonConfig
 * @property {string} id - HTML element ID
 * @property {MaskAction} action - Action type
 */

/**
 * @typedef {Object} MorphologyConfig
 * @property {string} [dilateBtn] - Dilate button ID
 * @property {string} [erodeBtn] - Erode button ID
 * @property {string} [crossBtn] - Cross button ID
 */

/**
 * @typedef {Object} TransformConfig
 * @property {string} [rotateBtn] - Rotate button ID
 * @property {TransformMapName} [rotateMap] - Default rotate map
 * @property {string|Array} [flipButtons] - Flip button selector or array
 */

/**
 * @typedef {Object} ActionConfig
 * @property {string} [emptyBtn] - Empty button ID
 * @property {string} [fullBtn] - Full button ID
 * @property {string} [inverseBtn] - Inverse button ID
 */

/**
 * @typedef {Object} GridUIConfig
 * @property {MorphologyConfig} [morphology] - Morphology button configuration
 * @property {TransformConfig} [transform] - Transform button configuration
 * @property {ActionConfig} [action] - Action button configuration
 */

/**
 * @typedef {Object} HandlerEntry
 * @property {HTMLElement} btn - The button element
 * @property {Function} handler - The event handler function
 */

/**
 * GridUIManager - Manages grid-specific UI button patterns
 * Encapsulates morphology, transform, and action button wiring
 *
 * @class GridUIManager
 * @example
 *   const gridUI = new GridUIManager(hexCanvas, {
 *     morphology: { dilateBtn: 'dilateBtn', erodeBtn: 'erodeBtn' },
 *     transform: { rotateBtn: 'rotateBtn', flipButtons: '.flipBtn' }
 *   })
 *   gridUI.wireMorphologyButtons()
 *   gridUI.wireTransformButtons()
 *   gridUI.cleanup()
 */
export class GridUIManager {
  /**
   * Initialize manager with canvas and button configurations
   * @param {Object} gridCanvas - The canvas controller
   * @param {Object} gridCanvas.grid - Grid data structure
   * @param {Function} [gridCanvas.applyMorphology] - Apply morphology operation
   * @param {Function} [gridCanvas.applyTransform] - Apply transform operation
   * @param {Function} [gridCanvas.updateButtonStates] - Update button UI state
   * @param {GridUIConfig} [config={}] - Configuration for button patterns
   */
  constructor (gridCanvas, config = {}) {
    /** @type {Object} Reference to grid canvas */
    this.canvas = gridCanvas

    /** @type {MorphologyConfig} Morphology button configuration */
    this.morphologyConfig = config.morphology || {}

    /** @type {TransformConfig} Transform button configuration */
    this.transformConfig = config.transform || {}

    /** @type {ActionConfig} Action button configuration */
    this.actionConfig = config.action || {}

    /** @type {Map<string, HandlerEntry>} Map of button handlers for cleanup */
    this.buttonHandlers = new Map()
  }

  // ============================================================================
  // Generic Helper Methods for Button Wiring
  // ============================================================================

  /**
   * Wire a set of buttons with consistent event handling
   * @private
   * @param {ButtonConfig[]} buttonConfigs - Button configuration objects
   * @param {string} prefix - Prefix for handler storage keys
   * @param {Function} handlerFactory - Function that creates event handler from config item
   * @returns {void}
   */
  _wireButtons (buttonConfigs, prefix, handlerFactory) {
    for (const config of buttonConfigs) {
      const btn = document.getElementById(config.id)
      if (!btn) continue

      const handler = handlerFactory(config)
      btn.addEventListener('click', handler)
      const key = `${prefix}-${config.id}`
      this.buttonHandlers.set(key, { btn, handler })
    }
  }

  /**
   * Extract button configurations from a config object using mappings
   * @private
   * @param {Object} config - Configuration object
   * @param {Object<string, {prop: string, value: any}>} mappings - Property to value mappings
   * @param {string} valueKey - Key to use for the value in result objects
   * @returns {ButtonConfig[]} Button configurations
   */
  _extractButtons (config, mappings, valueKey) {
    const buttons = []
    for (const [, { prop, value }] of Object.entries(mappings)) {
      if (config[prop]) {
        buttons.push({ id: config[prop], [valueKey]: value })
      }
    }
    return buttons
  }

  /**
   * Wire morphology buttons (dilate, erode, cross)
   * Provides consistent button handling for grid types
   * @param {MorphologyButtonConfig[]} [buttons=[]] - Button configurations
   * @returns {void}
   */
  wireMorphologyButtons (buttons = []) {
    const buttonConfigs =
      buttons.length > 0 ? buttons : this._extractMorphologyButtons()
    this._wireButtons(
      buttonConfigs,
      'morph',
      config => () => this.canvas.applyMorphology(config.operation)
    )
  }

  /**
   * Wire transform buttons (rotate, flip)
   * Handles both single rotate and multiple flip buttons
   * @param {TransformButtonConfig[]} [buttons=[]] - Button configurations
   * @returns {void}
   */
  wireTransformButtons (buttons = []) {
    const buttonConfigs =
      buttons.length > 0 ? buttons : this._extractTransformButtons()
    this._wireButtons(
      buttonConfigs,
      'transform',
      config => () => this.canvas.applyTransform(config.mapName)
    )
  }

  /**
   * Wire action buttons (empty, full, inverse, etc.)
   * @param {ActionButtonConfig[]} [buttons=[]] - Button configurations
   * @returns {void}
   */
  wireActionButtons (buttons = []) {
    const buttonConfigs =
      buttons.length > 0 ? buttons : this._extractActionButtons()
    this._wireButtons(
      buttonConfigs,
      'action',
      config => () => this._applyAction(config.action)
    )
  }

  /**
   * Apply a mask action (empty, full, inverse)
   * @private
   * @param {MaskAction} action - Action to apply
   * @returns {void}
   */
  _applyAction (action) {
    if (!this.canvas.grid?.mask) return

    const mask = this.canvas.grid.mask
    switch (action) {
      case 'empty':
        mask.bits = 0n
        break
      case 'full':
        mask.bits = mask.fullMask()
        break
      case 'inverse':
        mask.bits = mask.fullMask() ^ mask.bits
        break
      default:
        return
    }

    this.canvas.grid.setBits(mask.bits)
    this.canvas.grid.redraw()
    this.canvas.updateButtonStates()
  }

  /**
   * Extract morphology button configs from canvas configuration
   * @private
   * @returns {MorphologyButtonConfig[]}
   */
  _extractMorphologyButtons () {
    const mappings = {
      dilate: { prop: 'dilateBtn', value: 'dilate' },
      erode: { prop: 'erodeBtn', value: 'erode' },
      cross: { prop: 'crossBtn', value: 'cross' }
    }
    return this._extractButtons(this.morphologyConfig, mappings, 'operation')
  }

  /**
   * Extract transform button configs from canvas configuration
   * @private
   * @returns {TransformButtonConfig[]}
   */
  _extractTransformButtons () {
    const buttons = []
    const config = this.transformConfig

    if (config.rotateBtn) {
      buttons.push({ id: config.rotateBtn, mapName: config.rotateMap || 'r90' })
    }
    if (config.flipButtons) {
      // Handle both array and selector string
      if (typeof config.flipButtons === 'string') {
        const elements = document.querySelectorAll(config.flipButtons)
        elements.forEach(el => {
          const mapName = el.dataset.map || 'fx'
          buttons.push({ id: el.id, mapName })
        })
      } else if (Array.isArray(config.flipButtons)) {
        config.flipButtons.forEach(btn => {
          buttons.push({ ...btn })
        })
      }
    }

    return buttons
  }

  /**
   * Extract action button configs from canvas configuration
   * @private
   * @returns {ActionButtonConfig[]}
   */
  _extractActionButtons () {
    const mappings = {
      empty: { prop: 'emptyBtn', value: 'empty' },
      full: { prop: 'fullBtn', value: 'full' },
      inverse: { prop: 'inverseBtn', value: 'inverse' }
    }
    return this._extractButtons(this.actionConfig, mappings, 'action')
  }

  /**
   * Clean up all event listeners
   * Removes all registered listeners and clears the handler map
   * Safe and idempotent - can be called multiple times
   * @returns {void}
   */
  cleanup () {
    for (const [, { btn, handler }] of this.buttonHandlers) {
      if (btn && typeof btn.removeEventListener === 'function') {
        btn.removeEventListener('click', handler)
      }
    }
    this.buttonHandlers.clear()
  }

  /**
   * Get registered handler for a button
   * @param {string} buttonName - Button ID with prefix (e.g., 'morph-dilateBtn')
   * @returns {Function|undefined} The handler function or undefined if not found
   */
  getHandler (buttonName) {
    const entry = this.buttonHandlers.get(buttonName)
    return entry ? entry.handler : undefined
  }
}
