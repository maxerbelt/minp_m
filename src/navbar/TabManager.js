/**
 * Tab - Represents a single navigation tab with event handling
 */
class Tab {
  constructor (name) {
    this.name = name
    this.element = document.getElementById(`tab-${this.name}`)
    this.handlers = new Set()
  }

  /**
   * Add click listener while tracking it for removal
   */
  addClickListener (handler) {
    if (this.element) {
      this.element.addEventListener('click', handler)
    }
    this.handlers.add(handler)
  }

  /**
   * Replace all listeners with a single new one
   */
  overrideClickListener (handler) {
    this._clearListeners()
    this.addClickListener(handler)
  }

  /**
   * Mark this tab as current location
   */
  markAsCurrent () {
    if (this.element) {
      this.element.classList.add('you-are-here')
    }
  }

  /**
   * Remove all registered listeners
   * @private
   */
  _clearListeners () {
    for (const handler of this.handlers) {
      if (this.element) {
        this.element.removeEventListener('click', handler)
      }
    }
    this.handlers.clear()
  }

  /**
   * Clean up tab resources
   */
  cleanup () {
    this._clearListeners()
  }
}

/**
 * TabManager - Centralized tab creation and navigation
 * Manages tab UI state, listeners, and mode-based visibility
 */
export class TabManager {
  constructor () {
    this.tabs = {}
    this.currentMode = null
  }

  /**
   * Initialize all tabs for the application
   */
  initializeTabs (tabNames) {
    for (const name of tabNames) {
      this.tabs[name] = new Tab(name)
    }
  }

  /**
   * Get a specific tab
   */
  getTab (name) {
    return this.tabs[name]
  }

  /**
   * Set current mode and update tab visibility
   */
  setCurrentMode (huntMode) {
    this.currentMode = huntMode
  }

  /**
   * Get current mode
   */
  getCurrentMode () {
    return this.currentMode
  }

  /**
   * Check if a mode matches the current mode
   */
  isMode (mode) {
    return this.currentMode === mode
  }

  /**
   * Configure tab behavior for a specific mode
   */
  configureForMode (mode, tabConfig) {
    const { current = [], handlers = {} } = tabConfig

    // Mark current tabs
    for (const tabName of current) {
      this._markTabSafe(tabName)
    }

    // Add listeners to other tabs
    for (const [tabName, handler] of Object.entries(handlers)) {
      this._addHandlerSafe(tabName, handler)
    }
  }

  /**
   * Add listener to tab if not current mode
   * @private
   */
  _addHandlerSafe (tabName, handler) {
    const tab = this.getTab(tabName)
    if (tab && !this.isMode(tabName)) {
      tab.addClickListener(handler)
    }
  }

  /**
   * Mark tab as current if it exists
   * @private
   */
  _markTabSafe (tabName) {
    const tab = this.getTab(tabName)
    if (tab) {
      tab.markAsCurrent()
    }
  }

  /**
   * Add listener to tab
   */
  addListener (tabName, handler) {
    const tab = this.getTab(tabName)
    if (tab) {
      tab.addClickListener(handler)
    }
  }

  /**
   * Replace listener for tab
   */
  replaceListener (tabName, handler) {
    const tab = this.getTab(tabName)
    if (tab) {
      tab.overrideClickListener(handler)
    }
  }

  /**
   * Clean up all tabs
   */
  cleanup () {
    for (const tab of Object.values(this.tabs)) {
      tab.cleanup()
    }
  }
}

/**
 * Create TabManager pre-configured with standard game tabs
 */
export function createTabManager () {
  const manager = new TabManager()
  manager.initializeTabs([
    'build',
    'add',
    'hide',
    'seek',
    'list',
    'rules',
    'import',
    'about',
    'source',
    'print'
  ])
  return manager
}
