/**
 * @fileoverview Tab management system for navigation UI control.
 * Provides Tab and TabManager classes for managing navigation tabs, event listeners,
 * and mode-based tab visibility/behavior in the game UI.
 * @module navbar/TabManager
 */

/**
 * @typedef {import('./types/ui.types.js').TabConfig} TabConfig
 * @typedef {import('./types/ui.types.js').TabInstance} TabInstance
 * @typedef {import('./types/ui.types.js').TabManagerInstance} TabManagerInstance
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
   * Initializes the tab with a reference to its DOM element and an empty listener registry.
   * The element is found by ID using the pattern `tab-{name}`.
   *
   * @param {string} name - Tab name (used to find element with id `tab-{name}`).
   * @throws {Error} Silently handles missing elements (element will be null).
   *
   * @example
   * const buildTab = new Tab('build')
   * // Looks for element with id="tab-build"
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
   * Listener is attached to DOM and registered for cleanup on cleanup() or removeAllListeners().
   * Maintains a Set of handlers for proper event listener lifecycle management.
   *
   * @param {EventListener} handler - Click event handler function.
   * @returns {void}
   *
   * @example
   * tab.addClickListener(() => console.log('Tab clicked'))
   */
  addClickListener (handler) {
    this._attachEventListener(handler)
    this.handlers.add(handler)
  }

  /**
   * Replace all listeners with a single new one.
   * Removes all existing handlers and attaches the new one.
   * Useful for switching between different interaction modes or changing tab behavior.
   *
   * @param {EventListener} handler - New click event handler function.
   * @returns {void}
   *
   * @example
   * tab.overrideClickListener(() => navigateToRules())
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
   * Initializes an empty tab registry and sets no initial mode.
   * Use initializeTabs() or the createTabManager() factory to populate with tabs.
   *
   * @example
   * const manager = new TabManager()
   * manager.initializeTabs(['build', 'hide', 'seek'])
   */
  constructor () {
    /** @type {Object.<string, Tab>} Map of tab names to Tab instances */
    this.tabs = {}
    /** @type {string|null} Current active hunt mode, null if no mode set */
    this.currentMode = null
  }

  /**
   * Initialize all tabs for the application.
   * Creates Tab instances for each name provided and registers them in the manager.
   * Each tab is stored in the tabs registry with its name as the key.
   *
   * @param {string[]} tabNames - Names of tabs to initialize.
   * @returns {void}
   *
   * @example
   * manager.initializeTabs(['build', 'hide', 'seek', 'rules'])
   * const buildTab = manager.getTab('build')
   */
  initializeTabs (tabNames) {
    for (const name of tabNames) {
      this.tabs[name] = new Tab(name)
    }
  }

  /**
   * Get a specific tab instance.
   * Retrieves a previously registered Tab instance by name from the registry.
   *
   * @param {string} name - Tab name to retrieve.
   * @returns {Tab|undefined} Tab instance or undefined if not found.
   *
   * @example
   * const tab = manager.getTab('build')
   * if (tab) tab.markAsCurrent()
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
   * Useful for conditional logic based on active mode in configuration and UI updates.
   *
   * @param {string} mode - Mode identifier to check against current.
   * @returns {boolean} True if mode matches current mode, false otherwise.
   *
   * @example
   * if (manager.isMode('build')) {
   *   console.log('Currently in build mode')
   * }
   */
  isMode (mode) {
    return this.currentMode === mode
  }

  /**
   * Configure tab behavior for a specific mode.
   * Marks current tabs with visual indicator and adds listeners to inactive tabs.
   * Enables mode-specific tab behavior and navigation patterns.
   * Tabs marked as 'current' receive the 'you-are-here' CSS class.
   *
   * @param {string} _mode - Mode identifier (for future mode-specific logic).
   * @param {TabConfig} tabConfig - Configuration with current tabs and handlers.
   * @param {string[]} [tabConfig.current=[]] - Tab names to mark as current.
   * @param {Object.<string, EventListener>} [tabConfig.handlers={}] - Tab handlers map.
   * @returns {void}
   *
   * @example
   * manager.configureForMode('build', {
   *   current: ['build'],
   *   handlers: { hide: () => navigateToHide(), seek: () => navigateToSeek() }
   * })
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
   * Silently ignores if tab does not exist (no error thrown).
   *
   * @param {string} tabName - Name of tab to add listener to.
   * @param {EventListener} handler - Click event handler function.
   * @returns {void}
   *
   * @example
   * manager.addListener('rules', () => navigateToRules())
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
   * Useful for switching between interaction modes or changing tab behavior.
   *
   * @param {string} tabName - Name of tab to replace listener for.
   * @param {EventListener} handler - New click event handler function.
   * @returns {void}
   *
   * @example
   * manager.replaceListener('build', () => switchToEditMode())
   */
  replaceListener (tabName, handler) {
    const tab = this.getTab(tabName)
    if (tab) {
      tab.overrideClickListener(handler)
    }
  }

  /**
   * Clean up all tabs and their resources.
   * Detaches all listeners and clears internal state for all managed tabs.
   * Should be called when TabManager is no longer needed or on page unload.
   *
   * @returns {void}
   *
   * @example
   * window.addEventListener('beforeunload', () => manager.cleanup())
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
 * Factory function for creating a fully initialized TabManager with all standard game tabs.
 * Provides a convenient way to set up the tab system without manual configuration.
 *
 * @returns {TabManager} TabManager instance with all standard tabs initialized.
 *
 * @example
 * const manager = createTabManager()
 * manager.setCurrentMode('build')
 * manager.configureForMode('build', {
 *   current: ['build'],
 *   handlers: { hide: () => switchToHide(), seek: () => switchToSeek() }
 * })
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
