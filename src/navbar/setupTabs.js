import { bh } from '../terrains/all/js/bh.js'
import { trackClick } from './gtag.js'
import { SavedCustomMap } from '../terrains/all/js/map.js'
import { createTabManager } from './TabManager.js'
import { NavigationService } from './NavigationService.js'

/**
 * MapProvider adapter that provides access to the global bh map/terrain
 * Abstracts access to singleton bh object for better testability
 *
 * @class
 */
class BhMapProvider {
  /**
   * Get current map instance
   * @returns {Object} Current map object
   */
  getCurrentMap () {
    return bh.map
  }

  /**
   * Get maps manager instance
   * @returns {Object} Maps manager instance
   */
  getMaps () {
    return bh.maps
  }

  /**
   * Get current terrain instance
   * @returns {Object} Current terrain object
   */
  getTerrain () {
    return bh.terrain
  }
}

/**
 * ImportHandler - Handles map import functionality
 * Encapsulates file input creation, parsing, and saving logic
 *
 * @class
 */
class ImportHandler {
  /**
   * Handle map import from JSON file
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
const MODE_CURRENT_TABS = {
  build: ['build', 'add'],
  hide: ['hide'],
  seek: ['seek'],
  list: ['list'],
  rules: ['rules'],
  print: ['print']
}

const MODE_AVAILABLE_HANDLERS = {
  build: ['hide', 'seek', 'list', 'rules', 'import'],
  hide: ['build', 'add', 'seek', 'list', 'rules', 'import'],
  seek: ['build', 'add', 'hide', 'list', 'rules', 'import'],
  list: ['build', 'hide', 'seek', 'rules', 'import'],
  rules: ['build', 'hide', 'seek', 'list', 'import'],
  print: ['build', 'hide', 'seek', 'list', 'rules', 'import']
}

// Module-level tab and navigation management
/** @type {TabManager|null} Tab manager instance */
let tabManager = null
/** @type {NavigationService|null} Navigation service instance */
let navigationService = null
/** @type {BhMapProvider} Map provider instance */
const mapProvider = new BhMapProvider()

/**
 * Exported tabs object for backward compatibility
 * @type {Object.<string, Tab|null>}
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
 * Legacy switchTo function - maintained for backward compatibility
 * @param {string} target - Target tab/mode to switch to
 * @param {string} huntMode - Hunt mode identifier
 * @param {string} [mapName] - Optional map name
 * @returns {void}
 */
export function switchTo (target, huntMode, mapName) {
  if (navigationService && target) {
    navigationService.switchToMode(target, huntMode, mapName)
  }
}

/**
 * Create handlers object for a given hunt mode
 * Maps tab names to navigation handler functions
 * @private
 * @param {string} mode - Current hunt mode
 * @returns {Object.<string, Function>} Map of tab names to handler functions
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
 * Get mode-specific configuration with current tabs and handlers
 * Dynamically generates handler subsets based on mode-specific needs
 * @private
 * @param {string} mode - Hunt mode identifier
 * @returns {Object} Mode configuration with current tabs and handlers
 */
function _getModeConfig (mode) {
  // Get all possible handlers
  const allHandlers = _createModeHandlers(mode)

  // Filter handlers to only those available for this mode
  const handlers = {}
  const availableHandlerNames = MODE_AVAILABLE_HANDLERS[mode] || []
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
 * Initialize tab manager and navigation service
 * @private
 * @returns {void}
 */
function _initializeServices () {
  tabManager = createTabManager()
  navigationService = new NavigationService(null, mapProvider)
}

/**
 * Setup tabs and navigation for the application
 * Initializes tab manager, navigation service, and configures UI based on mode
 * @param {string} huntMode - Initial hunt mode ('build', 'hide', 'seek', etc.)
 * @returns {void}
 */
export function setupTabs (huntMode) {
  _initializeServices()
  _populateTabsExport()
  _configureForHuntMode(huntMode)
}

/**
 * Configure tabs for the given hunt mode
 * @private
 * @param {string} huntMode - Hunt mode to configure for
 * @returns {void}
 */
function _configureForHuntMode (huntMode) {
  tabManager.setCurrentMode(huntMode)
  _configureTabsForMode(huntMode)
}

/**
 * Populate exported tabs object with manager instances
 * Provides backward compatibility by exposing tab instances
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
 * Configure tab handlers and visibility based on mode
 * Sets up event listeners and visual states for all tabs
 * @private
 * @param {string} huntMode - Current hunt mode
 * @returns {void}
 */
function _configureTabsForMode (huntMode) {
  // Get mode-specific configuration
  const config = _getModeConfig(huntMode)

  // Apply mode configuration
  tabManager.configureForMode(huntMode, config)

  // Add special handlers for print, about, and source tabs
  tabManager.addListener('print', () => navigationService.printPage())
  tabManager.addListener('about', () => navigationService.navigateToBlog())
  tabManager.addListener('source', () => navigationService.navigateToSource())

  // Handle import tab for non-import modes
  if (huntMode !== 'import') {
    tabManager.addListener('import', () => ImportHandler.handleImport())
  }
}
