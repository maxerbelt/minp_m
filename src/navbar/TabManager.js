/**
 * @typedef {Object} TabConfig
 * @property {string[]} [current=[]] - Tab names to mark as current.
 * @property {Object.<string, EventListener>} [handlers={}] - Map of tab names to handler functions.
 */

/**
 * @typedef {Object} TabInstance
 * @property {string} name - Tab name identifier.
 * @property {HTMLElement|null} element - DOM element for this tab.
 * @property {Set<EventListener>} handlers - Set of registered event handlers.
 * @property {Function} addClickListener - Add click listener.
 * @property {Function} overrideClickListener - Replace click listener.
 * @property {Function} markAsCurrent - Mark as current tab.
 * @property {Function} cleanup - Clean up resources.
 */

/**
 * @typedef {Object} TabManagerInstance
 * @property {Object.<string, TabInstance>} tabs - Map of tab names to Tab instances.
 * @property {string|null} currentMode - Current active hunt mode.
 * @property {Function} initializeTabs - Initialize tabs.
 * @property {Function} getTab - Get tab instance.
 * @property {Function} setCurrentMode - Set current mode.
 * @property {Function} getCurrentMode - Get current mode.
 * @property {Function} isMode - Check if mode matches current.
 * @property {Function} configureForMode - Configure for mode.
 * @property {Function} addListener - Add event listener.
 * @property {Function} replaceListener - Replace event listener.
 * @property {Function} cleanup - Clean up all tabs.
 */

/**
 * Tab - Represents a single navigation tab with event handling.
 * Manages tab DOM element, event listeners, and visual state.
 * Encapsulates all DOM interactions and listener management for a single tab.
 * @class
 * @implements {TabInstance}
 */
class Tab {
  /**
   * Creates a new Tab instance.
   * @param {string} name - Tab name (used to find element with id `tab-{name}`).
   */
  constructor (name) {
    /** @type {string} Tab name identifier */
    this.name = name
    /** @type {HTMLElement|null} DOM element for this tab */
    this.element = document.getElementById(`tab-${this.name}`)
    /** @type {Set<EventListener>} Set of registered event handlers */
    this.handlers = new Set()
  }

  /**
   * Add click listener while tracking it for later removal.
   * Listener is attached to DOM and registered for cleanup.
   * @param {EventListener} handler - Click event handler function.
   * @returns {void}
   */
  addClickListener (handler) {
    this._attachEventListener(handler)
    this.handlers.add(handler)
  }

  /**
   * Replace all listeners with a single new one.
   * Removes all existing handlers and attaches the new one.
   * Useful for switching between different interaction modes.
   * @param {EventListener} handler - New click event handler function.
   * @returns {void}
   */
  overrideClickListener (handler) {
    this._removeAllListeners()
    this.addClickListener(handler)
  }

  /**
   * Mark this tab as the current active location.
   * Adds 'you-are-here' CSS class to visually highlight the active tab.
   * @returns {void}
   */
  markAsCurrent () {
    if (this.element) {
      this.element.classList.add('you-are-here')
    }
  }

  /**
   * Clean up tab resources and listeners.
   * Detaches all event listeners and clears internal state.
   * Should be called before tab is removed from DOM.
   * @returns {void}
   */
  cleanup () {
    this._removeAllListeners()
  }

  // ============================================================================
  // Private Helpers - Event Listener Management
  // ============================================================================

  /**
   * Attach a click event listener to the tab element.
   * Centralizes listener attachment with proper type casting.
   * @private
   * @param {EventListener} handler - Event handler to attach.
   * @returns {void}
   */
  _attachEventListener (handler) {
    if (this.element) {
      this.element.addEventListener(
        'click',
        /** @type {EventListener} */ (handler)
      )
    }
  }

  /**
   * Detach a click event listener from the tab element.
   * Centralizes listener removal with proper type casting.
   * @private
   * @param {EventListener} handler - Event handler to detach.
   * @returns {void}
   */
  _detachEventListener (handler) {
    if (this.element) {
      this.element.removeEventListener(
        'click',
        /** @type {EventListener} */ (handler)
      )
    }
  }

  /**
   * Remove all registered event listeners and clear the handler set.
   * Ensures complete cleanup of all attached listeners.
   * @private
   * @returns {void}
   */
  _removeAllListeners () {
    for (const handler of this.handlers) {
      this._detachEventListener(handler)
    }
    this.handlers.clear()
  }
}

/**
 * TabManager - Centralized tab creation and navigation management.
 * Manages tab UI state, event listeners, and mode-based visibility/behavior.
 * Orchestrates multiple Tab instances and coordinates mode-specific configuration.
 * @class
 * @implements {TabManagerInstance}
 */
class TabManager {
  /**
   * Creates a new TabManager instance.
   * Initializes empty tab registry and sets no initial mode.
   */
  constructor () {
    /** @type {Object.<string, Tab>} Map of tab names to Tab instances */
    this.tabs = {}
    /** @type {string|null} Current active hunt mode, null if no mode set */
    this.currentMode = null
  }

  /**
   * Initialize all tabs for the application.
   * Creates Tab instances for each name provided and registers them.
   * @param {string[]} tabNames - Names of tabs to initialize.
   * @returns {void}
   */
  initializeTabs (tabNames) {
    for (const name of tabNames) {
      this.tabs[name] = new Tab(name)
    }
  }

  /**
   * Get a specific tab instance.
   * Retrieves a previously registered Tab instance by name.
   * @param {string} name - Tab name to retrieve.
   * @returns {Tab|undefined} Tab instance or undefined if not found.
   */
  getTab (name) {
    return this.tabs[name]
  }

  /**
   * Set the current active hunt mode.
   * Updates the mode state for tab configuration decisions.
   * @param {string} huntMode - Mode identifier to set as current.
   * @returns {void}
   */
  setCurrentMode (huntMode) {
    this.currentMode = huntMode
  }

  /**
   * Get the current active hunt mode.
   * Returns the active mode or null if no mode has been set.
   * @returns {string|null} Current mode identifier or null if not set.
   */
  getCurrentMode () {
    return this.currentMode
  }

  /**
   * Check if a given mode matches the current mode.
   * Useful for conditional logic based on active mode.
   * @param {string} mode - Mode identifier to check against current.
   * @returns {boolean} True if mode matches current mode, false otherwise.
   */
  isMode (mode) {
    return this.currentMode === mode
  }

  /**
   * Configure tab behavior for a specific mode.
   * Marks current tabs with visual indicator and adds listeners to inactive tabs.
   * Enables mode-specific tab behavior and navigation patterns.
   * @param {string} _mode - Mode identifier (for future mode-specific logic).
   * @param {TabConfig} tabConfig - Configuration with current tabs and handlers.
   * @returns {void}
   */
  configureForMode (_mode, tabConfig) {
    const { current = [], handlers = {} } = tabConfig

    // Mark tabs that are current in this mode
    for (const tabName of current) {
      this._markTabIfExists(tabName)
    }

    // Add click handlers to tabs that are not current
    for (const [tabName, handler] of Object.entries(handlers)) {
      this._addHandlerIfNotCurrent(tabName, handler)
    }
  }

  /**
   * Add event listener to tab if it exists.
   * Public API for adding listeners to specific tabs.
   * Silently ignores if tab does not exist.
   * @param {string} tabName - Name of tab to add listener to.
   * @param {EventListener} handler - Click event handler function.
   * @returns {void}
   */
  addListener (tabName, handler) {
    const tab = this.getTab(tabName)
    if (tab) {
      tab.addClickListener(handler)
    }
  }

  /**
   * Replace event listener for tab.
   * Removes all existing listeners and adds a new one.
   * Useful for switching between interaction modes.
   * @param {string} tabName - Name of tab to replace listener for.
   * @param {EventListener} handler - New click event handler function.
   * @returns {void}
   */
  replaceListener (tabName, handler) {
    const tab = this.getTab(tabName)
    if (tab) {
      tab.overrideClickListener(handler)
    }
  }

  /**
   * Clean up all tabs and their resources.
   * Detaches all listeners and clears internal state.
   * Should be called when TabManager is no longer needed.
   * @returns {void}
   */
  cleanup () {
    for (const tab of Object.values(this.tabs)) {
      tab.cleanup()
    }
  }

  // ============================================================================
  // Private Helpers - Tab Configuration
  // ============================================================================

  /**
   * Add handler to tab only if tab is not the current mode.
   * Avoids adding listeners to the currently active tab.
   * Helper for configureForMode to attach listeners conditionally.
   * @private
   * @param {string} tabName - Name of tab to potentially add handler to.
   * @param {EventListener} handler - Click event handler function.
   * @returns {void}
   */
  _addHandlerIfNotCurrent (tabName, handler) {
    const tab = this.getTab(tabName)
    if (tab && !this.isMode(tabName)) {
      tab.addClickListener(handler)
    }
  }

  /**
   * Mark tab as current if it exists.
   * Adds visual indication that this tab represents the active location.
   * Helper for configureForMode to visually highlight active tabs.
   * @private
   * @param {string} tabName - Name of tab to mark as current.
   * @returns {void}
   */
  _markTabIfExists (tabName) {
    const tab = this.getTab(tabName)
    if (tab) {
      tab.markAsCurrent()
    }
  }
}

/**
 * Create TabManager pre-configured with standard game tabs.
 * Factory function for creating fully initialized TabManager.
 * @returns {TabManager} TabManager instance with all standard tabs initialized.
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
