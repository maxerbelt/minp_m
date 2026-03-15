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
   * Show element by removing hidden class
   * @param {string|HTMLElement} elementOrId - Element ID or element
   * @param {boolean} recordHistory - Whether to record visibility change
   * @returns {boolean} - Success indicator
   */
  show (elementOrId, recordHistory = true) {
    const element = this._getElement(elementOrId)
    if (!element) return false

    const elementId = typeof elementOrId === 'string' ? elementOrId : element.id
    const wasHidden = element.classList.contains(this.hiddenClassName)
    element.classList.remove(this.hiddenClassName)

    if (recordHistory && wasHidden) {
      this._recordVisibilityChange(elementId, true)
    }
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
    const wasVisible = !element.classList.contains(this.hiddenClassName)
    element.classList.add(this.hiddenClassName)

    if (recordHistory && wasVisible) {
      this._recordVisibilityChange(elementId, false)
    }
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
   * Show multiple elements
   * @param {string[]|HTMLElement[]} elementIds - Array of element IDs or elements
   * @returns {number} - Count of successfully shown elements
   */
  showMultiple (elementIds) {
    let count = 0
    for (const elementId of elementIds) {
      if (this.show(elementId)) {
        count++
      }
    }
    return count
  }

  /**
   * Hide multiple elements
   * @param {string[]|HTMLElement[]} elementIds - Array of element IDs or elements
   * @returns {number} - Count of successfully hidden elements
   */
  hideMultiple (elementIds) {
    let count = 0
    for (const elementId of elementIds) {
      if (this.hide(elementId)) {
        count++
      }
    }
    return count
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
