import { bh } from '../terrains/all/js/bh.js'
import { trackClick } from './gtag.js'
import { SavedCustomMap } from '../terrains/all/js/map.js'
import { createTabManager } from './TabManager.js'
import { NavigationService } from './NavigationService.js'

/**
 * @typedef {import('./types/domain.types.js').MapProvider} MapProvider
 * Map provider abstraction for accessing current map and terrain state.
 * Enables dependency injection and testability of map-dependent services.
 */

/**
 * @typedef {import('./types/ui.types.js').TabManagerInstance} TabManager
 * Tab manager instance for managing UI tabs and their visibility/handlers.
 * Handles tab configuration, listeners, and mode-specific setup.
 */

/**
 * @typedef {import('./types/callbacks.types.js').VoidCallback} NavigationServiceInstance
 * Navigation service instance for handling mode switches and page navigation.
 * Manages transitions between different game modes (build, hide, seek, etc.).
 */

/**
 * @typedef {import('./types/config.types.js').ModeConfig} ModeConfig
 * Configuration object for a specific hunt mode.
 * @property {string[]} current - Currently active tabs for this mode.
 * @property {Object.<string, Function>} handlers - Event handlers for available tabs.
 */

/**
 * MapProvider adapter that provides access to the global bh map/terrain.
 * Abstracts access to singleton bh object for better testability and loose coupling.
 * Implements MapProvider interface to decouple dependencies from global state.
 * @class
 * @implements {MapProvider}
 */
class BhMapProvider {
  /**
   * Get current map instance from global bh singleton.
   * Returns the map currently being displayed or edited.
   * @returns {Object} Current map object with rows, cols, and ship data.
   */
  getCurrentMap () {
    return bh.map
  }

  /**
   * Get maps manager instance from global bh singleton.
   * Returns the manager that stores and provides access to all available maps.
   * @returns {Object} Maps manager with methods to get/set/create maps.
   */
  getMaps () {
    return bh.maps
  }

  /**
   * Get current terrain instance from global bh singleton.
   * Returns the currently active terrain configuration (sea, space, etc.).
   * @returns {Object} Current terrain object with shape definitions and rules.
   */
  getTerrain () {
    return bh.terrain
  }
}

/**
 * ImportHandler - Handles map import functionality.
 * Encapsulates file input creation, JSON parsing, validation, and storage logic.
 * Provides user feedback via browser dialogs for success/error cases.
 * @class
 */
class ImportHandler {
  /**
   * Handle map import from JSON file.
   * Creates file input, parses JSON, validates for duplicates, and saves to storage.
   * Shows confirmation dialog if map with same title exists, alert on success/error.
   * @static
   * @returns {void}
   */
  static handleImport () {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'

    input.onchange = async e => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const map = new SavedCustomMap(JSON.parse(text))
        const maps = bh.maps

        if (maps.getMap(map.title) || maps.getCustomMap(map.title)) {
          if (
            !confirm(
              'A map with this title already exists. Do you want to overwrite it?'
            )
          ) {
            return
          }
        }

        map.saveToLocalStorage()
        trackClick(map, 'import map')
        alert('Map imported successfully.')
      } catch (err) {
        alert('Invalid JSON: ' + err.message)
      }
    }

    input.click()
  }
}

// Mode configurations - extracted to reduce duplication and complexity
/**
 * Current tabs for each hunt mode.
 * Maps mode identifiers to arrays of active tab names for that mode.
 * Keys: 'build', 'hide', 'seek', 'list', 'rules', 'print'
 * @type {Object.<string, string[]>}
 */
const MODE_CURRENT_TABS = {
  build: ['build', 'add'],
  hide: ['hide'],
  seek: ['seek'],
  list: ['list'],
  rules: ['rules'],
  print: ['print']
}

/**
 * Available navigation handlers for each hunt mode.
 * Maps mode identifiers to arrays of handler names accessible from that mode.
 * Each handler corresponds to a navigation method in NavigationService.
 * Keys: 'build', 'hide', 'seek', 'list', 'rules', 'print'
 * @type {Object.<string, string[]>}
 */
const MODE_AVAILABLE_HANDLERS = {
  build: ['hide', 'seek', 'list', 'rules', 'import'],
  hide: ['build', 'add', 'seek', 'list', 'rules', 'import'],
  seek: ['build', 'add', 'hide', 'list', 'rules', 'import'],
  list: ['build', 'add', 'hide', 'seek', 'rules', 'import'],
  rules: ['build', 'add', 'hide', 'seek', 'list', 'import'],
  print: ['build', 'add', 'hide', 'seek', 'list', 'rules', 'import']
}

/**
 * Tab manager instance for managing tab visibility and event handling.
 * Initialized in setupTabs() and persists for the session.
 * @type {TabManager|null}
 */
let tabManager = null

/**
 * Navigation service instance for handling mode transitions and navigation.
 * Initialized in setupTabs() and persists for the session.
 * Manages navigation between build/hide/seek/list/rules/print modes.
 * @type {NavigationServiceInstance|null}
 */
let navigationService = null

/**
 * Map provider instance for accessing current map/terrain state.
 * Created as new BhMapProvider() and used by NavigationService.
 * Provides abstraction layer over global bh singleton.
 * @type {BhMapProvider}
 */
const mapProvider = new BhMapProvider()

/**
 * Exported tabs object for backward compatibility with legacy code.
 * Populated in _populateTabsExport() with references to all tab DOM elements.
 * Allows direct access to tab instances without going through tabManager.
 * @type {Object.<string, Object|null>}
 */
export const tabs = {
  build: null,
  add: null,
  hide: null,
  seek: null,
  list: null,
  rules: null,
  import: null,
  about: null,
  print: null,
  source: null
}

/**
 * Legacy switchTo function - maintained for backward compatibility with old code.
 * Delegates to navigationService if available and target is provided.
 * Used by legacy code that needs to switch modes without refactoring.
 * @param {string} target - Target mode/tab to switch to ('build', 'hide', etc.).
 * @param {string} huntMode - Current hunt mode identifier for context.
 * @param {string} [mapName] - Optional map name to load in target mode.
 * @returns {void}
 */
export function switchTo (target, huntMode, mapName) {
  if (navigationService && target) {
    navigationService.switchToMode(target, huntMode, mapName)
  }
}

/**
 * Create handlers object for a given hunt mode.
 * Maps tab names (hide, seek, list, rules, build, add, import) to their handler functions.
 * Handler functions invoke appropriate navigationService methods or ImportHandler.
 * Only creates handlers needed by the mode; others are filtered in _getModeConfig.
 * @private
 * @param {string} mode - Current hunt mode identifier.
 * @returns {Object.<string, Function>} Map of tab names to navigation handler functions.
 */
function _createModeHandlers (mode) {
  return {
    hide: () => navigationService.switchToHide(mode),
    seek: () => navigationService.switchToSeek(mode),
    list: () => navigationService.switchToList(mode),
    rules: () => navigationService.switchToRules(mode),
    build: () => navigationService.switchToBuild(mode),
    add: () => navigationService.switchToBuild(mode),
    import: () => ImportHandler.handleImport()
  }
}

/**
 * Get mode-specific configuration with current tabs and handlers.
 * Builds configuration by:
 * 1. Creating all possible handlers for the mode
 * 2. Filtering to only include handlers available for this mode
 * 3. Including the current tabs from MODE_CURRENT_TABS
 * Returns object ready for tabManager.configureForMode().
 * @private
 * @param {string} mode - Hunt mode identifier ('build', 'hide', 'seek', etc.).
 * @returns {ModeConfig} Mode configuration with current tabs and filtered handlers.
 */
function _getModeConfig (mode) {
  const allHandlers = _createModeHandlers(mode)
  const availableHandlerNames = MODE_AVAILABLE_HANDLERS[mode] || []
  const handlers = {}

  for (const handlerName of availableHandlerNames) {
    if (allHandlers[handlerName]) {
      handlers[handlerName] = allHandlers[handlerName]
    }
  }

  return {
    current: MODE_CURRENT_TABS[mode] || [],
    handlers
  }
}

/**
 * Initialize tab manager and navigation service.
 * Creates new instances of TabManager and NavigationService.
 * Sets up global state for tab/navigation management.
 * Must be called before any tab operations.
 * @private
 * @returns {void}
 */
function _initializeServices () {
  tabManager = createTabManager()
  navigationService = new NavigationService(null, mapProvider)
}

/**
 * Setup tabs and navigation for the application.
 * Main entry point that orchestrates the initialization sequence:
 * 1. Initializes TabManager and NavigationService
 * 2. Populates exported tabs object for backward compatibility
 * 3. Configures tabs based on the initial hunt mode
 * Should be called once during application startup.
 * @param {string} huntMode - Initial hunt mode ('build', 'hide', 'seek', 'list', 'rules', 'print').
 * @returns {void}
 */
export function setupTabs (huntMode) {
  _initializeServices()
  _populateTabsExport()
  _configureForHuntMode(huntMode)
}

/**
 * Configure tabs for the given hunt mode.
 * Sets current mode in TabManager and triggers tab configuration for that mode.
 * @private
 * @param {string} huntMode - Hunt mode to configure for ('build', 'hide', 'seek', etc.).
 * @returns {void}
 */
function _configureForHuntMode (huntMode) {
  tabManager.setCurrentMode(huntMode)
  _configureTabsForMode(huntMode)
}

/**
 * Populate exported tabs object with manager instances.
 * Retrieves all tab DOM elements from tabManager and assigns to tabs export object.
 * Provides backward compatibility by exposing tab instances directly.
 * Enables legacy code to access tabs.build, tabs.hide, etc. without tabManager.
 * @private
 * @returns {void}
 */
function _populateTabsExport () {
  const tabNames = [
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
  ]
  for (const name of tabNames) {
    tabs[name] = tabManager.getTab(name)
  }
}

/**
 * Configure tab handlers and visibility based on hunt mode.
 * Performs complete mode-specific setup:
 * 1. Gets mode configuration (tabs and handlers)
 * 2. Configures TabManager with mode-specific settings
 * 3. Adds special listeners for print/about/source tabs
 * 4. Handles import tab visibility logic
 * @private
 * @param {string} huntMode - Current hunt mode ('build', 'hide', 'seek', etc.).
 * @returns {void}
 */
function _configureTabsForMode (huntMode) {
  const config = _getModeConfig(huntMode)
  tabManager.configureForMode(huntMode, config)

  _addSpecialTabListeners()
  _handleImportTabForNonImportMode(huntMode)
}

/**
 * Add special handlers for print, about, and source tabs.
 * These tabs are not standard mode handlers and require special navigation logic.
 * Print: opens print dialog via NavigationService.printPage()
 * About: navigates to blog via NavigationService.navigateToBlog()
 * Source: navigates to source code via NavigationService.navigateToSource()
 * @private
 * @returns {void}
 */
function _addSpecialTabListeners () {
  tabManager.addListener('print', () => navigationService.printPage())
  tabManager.addListener('about', () => navigationService.navigateToBlog())
  tabManager.addListener('source', () => navigationService.navigateToSource())
}

/**
 * Handle import tab for non-import modes.
 * When not in import mode, adds listener to import tab that triggers ImportHandler.
 * If in import mode, import is already handled by other configuration.
 * Ensures import functionality is available in all modes.
 * @private
 * @param {string} huntMode - Current hunt mode identifier.
 * @returns {void}
 */
function _handleImportTabForNonImportMode (huntMode) {
  if (huntMode !== 'import') {
    tabManager.addListener('import', () => ImportHandler.handleImport())
  }
}
