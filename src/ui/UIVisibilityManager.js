/**
 * UIVisibilityManager - Coordinated DOM visibility and CSS class management
 * Provides methods to show, hide, and toggle elements with consistent behavior
 *
 * Usage:
 *   const uiMgr = new UIVisibilityManager()
 *   uiMgr.show('game-board')
 *   uiMgr.hideMultiple(['menu', 'settings'])
 *   uiMgr.toggle('debug-panel')
 */
export class UIVisibilityManager {
  constructor (hiddenClassName = 'hidden') {
    this.hiddenClassName = hiddenClassName
    this.visibilityHistory = new Map()
  }

  /**
   * Get DOM element safely
   * @private
   * @param {string|HTMLElement} elementOrId - Element or element ID
   * @returns {HTMLElement|null}
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
   * @param {HTMLElement} element - The DOM element
   * @param {string} elementId - The element ID for history
   * @param {boolean} shouldShow - True to show, false to hide
   * @param {boolean} recordHistory - Whether to record the change
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
   * @param {string|HTMLElement} elementOrId - Element ID or element
   * @param {boolean} recordHistory - Whether to record visibility change
   * @returns {boolean} - Success indicator
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
   * @param {string|HTMLElement} elementOrId - Element ID or element
   * @param {boolean} recordHistory - Whether to record visibility change
   * @returns {boolean} - Success indicator
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
   * @param {string|HTMLElement} elementOrId - Element ID or element
   * @returns {boolean} - Final visibility state (true = visible)
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
   * Set visibility explicitly
   * @param {string|HTMLElement} elementOrId - Element ID or element
   * @param {boolean} isVisible - True to show, false to hide
   * @returns {boolean} - Success indicator
   */
  setVisible (elementOrId, isVisible) {
    return isVisible ? this.show(elementOrId) : this.hide(elementOrId)
  }

  /**
   * Check element visibility
   * @param {string|HTMLElement} elementOrId - Element ID or element
   * @returns {boolean} - True if visible (doesn't have hidden class)
   */
  isVisible (elementOrId) {
    const element = this._getElement(elementOrId)
    if (!element) return false
    return !element.classList.contains(this.hiddenClassName)
  }

  /**
   * Perform an action on multiple elements
   * @private
   * @param {string[]|HTMLElement[]} elementIds - Array of element IDs or elements
   * @param {string} action - 'show' or 'hide'
   * @returns {number} - Count of successfully processed elements
   */
  _performOnMultiple (elementIds, action) {
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
   * @param {string[]|HTMLElement[]} elementIds - Array of element IDs or elements
   * @returns {number} - Count of successfully shown elements
   */
  showMultiple (elementIds) {
    return this._performOnMultiple(elementIds, 'show')
  }

  /**
   * Hide multiple elements
   * @param {string[]|HTMLElement[]} elementIds - Array of element IDs or elements
   * @returns {number} - Count of successfully hidden elements
   */
  hideMultiple (elementIds) {
    return this._performOnMultiple(elementIds, 'hide')
  }

  /**
   * Show one set of elements while hiding another
   * Common pattern: show game board, hide menu
   * @param {string[]|HTMLElement[]} toShow - Elements to show
   * @param {string[]|HTMLElement[]} toHide - Elements to hide
   * @returns {Object} - { successful: boolean, shown: number, hidden: number }
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
   * @param {string} elementId - Element ID
   * @param {boolean} isVisible - Visibility state
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
    // Keep only last 50 changes per element
    if (history.length > 50) {
      history.shift()
    }
  }

  /**
   * Get visibility change history for element
   * @param {string} elementId - Element ID
   * @returns {Array} - History of visibility changes
   */
  getHistory (elementId) {
    return this.visibilityHistory.get(elementId) || []
  }

  /**
   * Clear all history records
   */
  clearHistory () {
    this.visibilityHistory.clear()
  }
}
