/**
 * @typedef {Object} VisibilityRecord
 * @property {boolean} visible - Whether element was visible
 * @property {number} timestamp - Change timestamp
 */

/**
 * @typedef {Object} VisibilityChangeResult
 * @property {boolean} successful - Whether any changes occurred
 * @property {number} shown - Count of shown elements
 * @property {number} hidden - Count of hidden elements
 */

/**
 * UIVisibilityManager - Coordinated DOM visibility and CSS class management
 * Provides methods to show, hide, and toggle elements with consistent behavior
 *
 * @class UIVisibilityManager
 * @example
 *   const uiMgr = new UIVisibilityManager()
 *   uiMgr.show('game-board')
 *   uiMgr.hideMultiple(['menu', 'settings'])
 *   uiMgr.toggle('debug-panel')
 */
export class UIVisibilityManager {
  /**
   * Create visibility manager with optional custom hidden class name
   * @param {string} [hiddenClassName='hidden'] - CSS class name for hidden state
   */
  constructor (hiddenClassName = 'hidden') {
    /** @type {string} CSS class name applied to hidden elements */
    this.hiddenClassName = hiddenClassName

    /** @type {Map<string, VisibilityRecord[]>} History of visibility changes per element */
    this.visibilityHistory = new Map()
  }

  /**
   * Get DOM element safely
   * @private
   * @param {string|HTMLElement} elementOrId - Element or element ID
   * @returns {HTMLElement|null} DOM element or null if not found
   * @throws {TypeError} If elementOrId is invalid type
   */
  _getElement (elementOrId) {
    if (elementOrId instanceof HTMLElement) {
      return elementOrId
    }
    if (typeof elementOrId === 'string') {
      return document.getElementById(elementOrId)
    }
    return null
  }

  /**
   * Perform the visibility change operation
   * @private
   * @param {HTMLElement} element - The DOM element to modify
   * @param {string} elementId - The element ID for history tracking
   * @param {boolean} shouldShow - True to show, false to hide
   * @param {boolean} recordHistory - Whether to record the change in history
   * @returns {void}
   */
  _performVisibilityChange (element, elementId, shouldShow, recordHistory) {
    const wasVisible = !element.classList.contains(this.hiddenClassName)
    const isChanging =
      (shouldShow && !wasVisible) || (!shouldShow && wasVisible)

    if (shouldShow) {
      element.classList.remove(this.hiddenClassName)
    } else {
      element.classList.add(this.hiddenClassName)
    }

    if (recordHistory && isChanging) {
      this._recordVisibilityChange(elementId, shouldShow)
    }
  }

  /**
   * Show element by removing hidden class
   * @param {string|HTMLElement} elementOrId - Element ID or HTMLElement instance
   * @param {boolean} [recordHistory=true] - Whether to record visibility change
   * @returns {boolean} True if element was successfully shown, false otherwise
   */
  show (elementOrId, recordHistory = true) {
    const element = this._getElement(elementOrId)
    if (!element) return false

    const elementId = typeof elementOrId === 'string' ? elementOrId : element.id
    this._performVisibilityChange(element, elementId, true, recordHistory)
    return true
  }

  /**
   * Hide element by adding hidden class
   * @param {string|HTMLElement} elementOrId - Element ID or HTMLElement instance
   * @param {boolean} [recordHistory=true] - Whether to record visibility change
   * @returns {boolean} True if element was successfully hidden, false otherwise
   */
  hide (elementOrId, recordHistory = true) {
    const element = this._getElement(elementOrId)
    if (!element) return false

    const elementId = typeof elementOrId === 'string' ? elementOrId : element.id
    this._performVisibilityChange(element, elementId, false, recordHistory)
    return true
  }

  /**
   * Toggle element visibility
   * @param {string|HTMLElement} elementOrId - Element ID or HTMLElement instance
   * @returns {boolean} Final visibility state (true = visible, false = hidden)
   */
  toggle (elementOrId) {
    const element = this._getElement(elementOrId)
    if (!element) return false

    const isVisible = !element.classList.contains(this.hiddenClassName)
    if (isVisible) {
      this.hide(elementOrId)
      return false
    } else {
      this.show(elementOrId)
      return true
    }
  }

  /**
   * Show element if the condition is true, otherwise hide it
   * (Separates the show and hide operations rather than using a ternary)
   * @param {string|HTMLElement} elementOrId - Element ID or HTMLElement instance
   * @param {boolean} shouldBeVisible - Target visibility state
   * @returns {boolean} Success indicator
   */
  showIfTrue (elementOrId, shouldBeVisible) {
    if (shouldBeVisible) {
      return this.show(elementOrId)
    }
    return this.hide(elementOrId)
  }

  /**
   * Set visibility explicitly to shown or hidden state
   * @param {string|HTMLElement} elementOrId - Element ID or HTMLElement instance
   * @param {boolean} isVisible - True to show, false to hide
   * @returns {boolean} Success indicator
   * @deprecated Use {@link show} or {@link hide} directly for clarity
   */
  setVisible (elementOrId, isVisible) {
    if (isVisible) {
      return this.show(elementOrId)
    }
    return this.hide(elementOrId)
  }

  /**
   * Check element visibility
   * @param {string|HTMLElement} elementOrId - Element ID or HTMLElement instance
   * @returns {boolean} True if visible (doesn't have hidden class), false if hidden or not found
   */
  isVisible (elementOrId) {
    const element = this._getElement(elementOrId)
    if (!element) return false
    return !element.classList.contains(this.hiddenClassName)
  }

  /**
   * Perform an action on multiple elements
   * @private
   * @param {string[]|HTMLElement[]} elementIds - Array of element IDs or HTMLElement instances
   * @param {string} action - Action name: 'show' or 'hide'
   * @returns {number} Count of successfully processed elements
   * @throws {TypeError} If action is not 'show' or 'hide'
   */
  _performOnMultiple (elementIds, action) {
    if (action !== 'show' && action !== 'hide') {
      throw new TypeError(
        `Invalid action: ${action}. Expected 'show' or 'hide'.`
      )
    }
    let count = 0
    for (const elementId of elementIds) {
      if (this[action](elementId)) {
        count++
      }
    }
    return count
  }

  /**
   * Show multiple elements
   * @param {string[]|HTMLElement[]} elementIds - Array of element IDs or HTMLElement instances
   * @returns {number} Count of successfully shown elements
   */
  showMultiple (elementIds) {
    return this._performOnMultiple(elementIds, 'show')
  }

  /**
   * Hide multiple elements
   * @param {string[]|HTMLElement[]} elementIds - Array of element IDs or HTMLElement instances
   * @returns {number} Count of successfully hidden elements
   */
  hideMultiple (elementIds) {
    return this._performOnMultiple(elementIds, 'hide')
  }

  /**
   * Show one set of elements while hiding another (common pattern for scene switching)
   * @param {string[]|HTMLElement[]} toShow - Elements to show
   * @param {string[]|HTMLElement[]} toHide - Elements to hide
   * @returns {VisibilityChangeResult} Result with counts of shown/hidden elements
   */
  showWhileHiding (toShow, toHide) {
    const shown = this.showMultiple(toShow)
    const hidden = this.hideMultiple(toHide)
    return {
      successful: shown > 0 || hidden > 0,
      shown,
      hidden
    }
  }

  /**
   * Record visibility change in history
   * @private
   * @param {string} elementId - Element ID for tracking
   * @param {boolean} isVisible - Current visibility state
   * @returns {void}
   */
  _recordVisibilityChange (elementId, isVisible) {
    if (!this.visibilityHistory.has(elementId)) {
      this.visibilityHistory.set(elementId, [])
    }
    const history = this.visibilityHistory.get(elementId)
    history.push({
      visible: isVisible,
      timestamp: Date.now()
    })
    // Keep only last 50 changes per element to prevent memory bloat
    if (history.length > 50) {
      history.shift()
    }
  }

  /**
   * Get visibility change history for element
   * @param {string} elementId - Element ID to retrieve history for
   * @returns {VisibilityRecord[]} Array of visibility change records
   */
  getHistory (elementId) {
    return this.visibilityHistory.get(elementId) || []
  }

  /**
   * Clear all visibility history records
   * @returns {void}
   */
  clearHistory () {
    this.visibilityHistory.clear()
  }
}
