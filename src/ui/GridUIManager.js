/**
 * GridUIManager - Manages grid-specific UI button patterns
 * Encapsulates morphology, transform, and action button wiring
 *
 * Usage:
 *   const gridUI = new GridUIManager(hexCanvas, {
 *     morphology: { dilateBtn: 'dilateBtn', erodeBtn: 'erodeBtn' },
 *     transform: { rotateBtn: 'rotateBtn', flipButtons: '.flipBtn' }
 *   })
 *   gridUI.wireMorphologyButtons()
 *   gridUI.wireTransformButtons()
 */
export class GridUIManager {
  /**
   * Initialize manager with canvas and button configurations
   * @param {GridCanvas} gridCanvas - The canvas controller
   * @param {Object} config - Configuration for button patterns
   */
  constructor (gridCanvas, config = {}) {
    this.canvas = gridCanvas
    this.morphologyConfig = config.morphology || {}
    this.transformConfig = config.transform || {}
    this.actionConfig = config.action || {}
    this.buttonHandlers = new Map()
  }

  // ============================================================================
  // Generic Helper Methods for Button Wiring
  // ============================================================================

  /**
   * Wire a set of buttons with consistent event handling
   * @private
   * @param {Array<{id: string}>} buttonConfigs - Button configuration objects
   * @param {string} prefix - Prefix for handler storage keys
   * @param {Function} handlerFactory - Function that creates event handler from config item
   */
  _wireButtons (buttonConfigs, prefix, handlerFactory) {
    for (const config of buttonConfigs) {
      const btn = document.getElementById(config.id)
      if (!btn) continue

      const handler = handlerFactory(config)
      btn.addEventListener('click', handler)
      this.buttonHandlers.set(`${prefix}-${config.id}`, handler)
    }
  }

  /**
   * Extract button configurations from a config object using mappings
   * @private
   * @param {Object} config - Configuration object
   * @param {Object<string, {prop: string, value: any}>} mappings - Property to value mappings
   * @param {string} valueKey - Key to use for the value in result objects
   * @returns {Array<{id: string, [valueKey]: any}>} Button configurations
   */
  _extractButtons (config, mappings, valueKey) {
    const buttons = []
    for (const [key, { prop, value }] of Object.entries(mappings)) {
      if (config[prop]) {
        buttons.push({ id: config[prop], [valueKey]: value })
      }
    }
    return buttons
  }

  /**
   * Wire morphology buttons (dilate, erode, cross)
   * Provides consistent button handling for grid types
   * @param {Array<{id, operation}>} buttons - Button configurations
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
   * @param {Array<{id, mapName}>} buttons - Button configurations
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
   * @param {Array<{id, action}>} buttons - Button configurations
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
   */
  _applyAction (action) {
    if (!this.canvas.grid || !this.canvas.grid.mask) return

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
   */
  cleanup () {
    // Note: Full cleanup would require storing original handlers
    // For now, caller should manage DOM cleanup
    this.buttonHandlers.clear()
  }

  /**
   * Get registered handler for a button
   * @param {string} buttonName - Button ID with prefix (e.g., 'morph-dilateBtn')
   */
  getHandler (buttonName) {
    return this.buttonHandlers.get(buttonName)
  }
}
