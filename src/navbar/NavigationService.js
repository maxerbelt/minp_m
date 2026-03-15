import { storeShips } from '../waters/saveCustomMap.js'
import { trackTab, trackClick } from './gtag.js'

/**
 * NavigationService - Handles mode switching and page navigation
 * Encapsulates logic for switching between game modes and storing state
 */
export class NavigationService {
  constructor (paramManager, mapProvider) {
    this.paramManager = paramManager
    this.mapProvider = mapProvider
  }

  /**
   * Switch to a different game mode
   */
  switchToMode (targetPage, huntMode, mapName = null) {
    if (!targetPage) return

    const params = this._buildModeParams(mapName)
    this._storeAndNavigate(params, huntMode, targetPage)
  }

  /**
   * Build URL parameters for mode switch
   * @private
   */
  _buildModeParams (mapName = null) {
    const params = new URLSearchParams()
    const map = this.mapProvider.getCurrentMap()

    if (!mapName && map) {
      params.append('height', map.rows)
      params.append('width', map.cols)
    }

    const finalMapName = mapName || map?.title
    if (finalMapName) {
      params.append('mapName', finalMapName)
    }

    return params
  }

  /**
   * Store current state and navigate to new page
   * @private
   */
  _storeAndNavigate (params, huntMode, targetPage) {
    const map = this.mapProvider.getCurrentMap()
    const result = storeShips(params, huntMode, targetPage, map)

    if (result) {
      globalThis.location.href = result
    }
  }

  /**
   * Switch to specific mode pages
   */
  switchToSeek (huntMode) {
    this.switchToMode('battleseek', huntMode)
  }

  switchToHide (huntMode) {
    this.switchToMode('index', huntMode)
  }

  switchToBuild (huntMode) {
    this.switchToMode('battlebuild', huntMode)
  }

  switchToList (huntMode) {
    this.switchToMode('maplist', huntMode)
  }

  switchToRules (huntMode) {
    this.switchToMode('rules', huntMode)
  }

  /**
   * Handle import from JSON file
   */
  switchToImportMode (SavedCustomMapClass, mapProvider) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'

    input.onchange = async e => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const map = new SavedCustomMapClass(JSON.parse(text))
        const maps = mapProvider.getMaps()

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

  /**
   * Navigate to external link with tracking
   */
  navigateExternal (url, trackingLabel) {
    if (trackingLabel) {
      trackTab(trackingLabel)
    }
    globalThis.location.href = url
  }

  /**
   * Trigger browser print
   */
  printPage () {
    trackTab('print')
    globalThis.print()
  }

  /**
   * Navigate to blog
   */
  navigateToBlog () {
    const blogUrl =
      'https://geoffburns.blogspot.com/2015/10/pencil-and-paper-battleships.html'
    this.navigateExternal(blogUrl, 'go to blog')
  }

  /**
   * Navigate to source code
   */
  navigateToSource () {
    const sourceUrl = 'https://github.com/GeoffBurns/battleship'
    this.navigateExternal(sourceUrl, 'go to source code')
  }
}
