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

  /**
   * Wire morphology buttons (dilate, erode, cross)
   * Provides consistent button handling for grid types
   * @param {Array<{id, operation}>} buttons - Button configurations
   */
  wireMorphologyButtons (buttons = []) {
    // Use provided buttons or extract from config
    const buttonConfigs =
      buttons.length > 0 ? buttons : this._extractMorphologyButtons()

    for (const { id, operation } of buttonConfigs) {
      const btn = document.getElementById(id)
      if (!btn) continue

      const handler = () => this.canvas.applyMorphology(operation)
      btn.addEventListener('click', handler)
      this.buttonHandlers.set(`morph-${id}`, handler)
    }
  }

  /**
   * Wire transform buttons (rotate, flip)
   * Handles both single rotate and multiple flip buttons
   * @param {Array<{id, mapName}>} buttons - Button configurations
   */
  wireTransformButtons (buttons = []) {
    // Use provided buttons or extract from config
    const buttonConfigs =
      buttons.length > 0 ? buttons : this._extractTransformButtons()

    for (const { id, mapName } of buttonConfigs) {
      const btn = document.getElementById(id)
      if (!btn) continue

      const handler = () => this.canvas.applyTransform(mapName)
      btn.addEventListener('click', handler)
      this.buttonHandlers.set(`transform-${id}`, handler)
    }
  }

  /**
   * Wire action buttons (empty, full, inverse, etc.)
   * @param {Array<{id, action}>} buttons - Button configurations
   */
  wireActionButtons (buttons = []) {
    const buttonConfigs =
      buttons.length > 0 ? buttons : this._extractActionButtons()

    for (const { id, action } of buttonConfigs) {
      const btn = document.getElementById(id)
      if (!btn) continue

      const handler = () => this._applyAction(action)
      btn.addEventListener('click', handler)
      this.buttonHandlers.set(`action-${id}`, handler)
    }
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
    const buttons = []
    const config = this.morphologyConfig

    if (config.dilateBtn) {
      buttons.push({ id: config.dilateBtn, operation: 'dilate' })
    }
    if (config.erodeBtn) {
      buttons.push({ id: config.erodeBtn, operation: 'erode' })
    }
    if (config.crossBtn) {
      buttons.push({ id: config.crossBtn, operation: 'cross' })
    }

    return buttons
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
    const buttons = []
    const config = this.actionConfig

    if (config.emptyBtn) buttons.push({ id: config.emptyBtn, action: 'empty' })
    if (config.fullBtn) buttons.push({ id: config.fullBtn, action: 'full' })
    if (config.inverseBtn)
      buttons.push({ id: config.inverseBtn, action: 'inverse' })

    return buttons
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
