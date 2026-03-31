import { bh } from '../terrains/all/js/bh.js'
import { trackClick } from './gtag.js'
import { SavedCustomMap } from '../terrains/all/js/map.js'
import { createTabManager } from './TabManager.js'
import { NavigationService } from './NavigationService.js'

/**
 * MapProvider adapter that provides access to the global bh map/terrain
 */
class BhMapProvider {
  getCurrentMap () {
    return bh.map
  }

  getMaps () {
    return bh.maps
  }

  getTerrain () {
    return bh.terrain
  }
}

// Module-level tab and navigation management
let tabManager = null
let navigationService = null
const mapProvider = new BhMapProvider()

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
 */
export function switchTo (target, huntMode, mapName) {
  if (navigationService && target) {
    navigationService.switchToMode(target, huntMode, mapName)
  }
}

export function setupTabs (huntMode) {
  // Create the tab manager with all standard game tabs
  tabManager = createTabManager()

  // Create navigation service with map provider
  navigationService = new NavigationService(null, mapProvider)

  // Populate the exported tabs object for backward compatibility
  _populateTabsExport()

  // Set current mode in tab manager
  tabManager.setCurrentMode(huntMode)

  // Configure all tabs based on the current mode
  _configureTabsForMode(huntMode)
}

/**
 * Populate exported tabs object with manager instances
 * @private
 */
function _populateTabsExport () {
  for (const name of [
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
  ]) {
    tabs[name] = tabManager.getTab(name)
  }
}

/**
 * Configure tab handlers and visibility based on mode
 * @private
 */
function _configureTabsForMode (huntMode) {
  // Define mode-specific configurations with current tabs and click handlers
  const modeConfigs = {
    build: {
      current: ['build', 'add'],
      handlers: {
        hide: () => navigationService.switchToHide(huntMode),
        seek: () => navigationService.switchToSeek(huntMode),
        list: () => navigationService.switchToList(huntMode),
        rules: () => navigationService.switchToRules(huntMode),
        import: () => _handleImport()
      }
    },
    hide: {
      current: ['hide'],
      handlers: {
        build: () => navigationService.switchToBuild(huntMode),
        add: () => navigationService.switchToBuild(huntMode),
        seek: () => navigationService.switchToSeek(huntMode),
        list: () => navigationService.switchToList(huntMode),
        rules: () => navigationService.switchToRules(huntMode),
        import: () => _handleImport()
      }
    },
    seek: {
      current: ['seek'],
      handlers: {
        build: () => navigationService.switchToBuild(huntMode),
        add: () => navigationService.switchToBuild(huntMode),
        hide: () => navigationService.switchToHide(huntMode),
        list: () => navigationService.switchToList(huntMode),
        rules: () => navigationService.switchToRules(huntMode),
        import: () => _handleImport()
      }
    },
    list: {
      current: ['build', 'list'],
      handlers: {
        hide: () => navigationService.switchToHide(huntMode),
        seek: () => navigationService.switchToSeek(huntMode),
        rules: () => navigationService.switchToRules(huntMode),
        import: () => _handleImport()
      }
    },
    rules: {
      current: ['build', 'rules'],
      handlers: {
        hide: () => navigationService.switchToHide(huntMode),
        seek: () => navigationService.switchToSeek(huntMode),
        list: () => navigationService.switchToList(huntMode),
        import: () => _handleImport()
      }
    },
    print: {
      current: ['build', 'print'],
      handlers: {
        hide: () => navigationService.switchToHide(huntMode),
        seek: () => navigationService.switchToSeek(huntMode),
        list: () => navigationService.switchToList(huntMode),
        rules: () => navigationService.switchToRules(huntMode),
        import: () => _handleImport()
      }
    }
  }

  // Get configuration for current mode
  const config = modeConfigs[huntMode] || { current: [], handlers: {} }

  // Apply mode configuration
  tabManager.configureForMode(huntMode, config)

  // Add special handlers for print, about, and source tabs
  tabManager.addListener('print', () => navigationService.printPage())
  tabManager.addListener('about', () => navigationService.navigateToBlog())
  tabManager.addListener('source', () => navigationService.navigateToSource())

  // Handle import tab for non-import modes
  if (huntMode !== 'import') {
    tabManager.addListener('import', () => _handleImport())
  }
}

/**
 * Handle map import from JSON file
 * @private
 */
function _handleImport () {
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
