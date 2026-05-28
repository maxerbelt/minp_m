import { bh } from './bh.js'
import { ChooseFromListUI } from '../../../navbar/chooseUI.js'
import { ParameterManager } from '../../../navbar/ParameterManager.js'

/**
 * @typedef {Object} DimensionResult
 * @property {string} height - The map height as a string
 * @property {string} width - The map width as a string
 * @property {string} x - The separator character 'x' or empty string
 */

/**
 * @typedef {Object} UrlParams
 * @property {string} mode - The game mode ('create' or 'edit')
 * @property {string} mapName - The selected map name
 * @property {string} height - The map height
 * @property {string} width - The map width
 * @property {string} x - The separator character
 * @property {string} terrain - The terrain body tag (e.g., 'sea', 'space')
 * @property {string} mapType - The map type identifier
 */

/**
 * Show the terrain selection UI.
 * Displays available terrains and handles terrain switching with map dimension preservation.
 * @returns {void}
 */
export function terrainSelect () {
  /** @type {string[]} */
  const terrainTitles = (() => {
    try {
      const t = bh.terrainTitleList
      return Array.isArray(t) ? t : []
    } catch {
      // during tests bh may not have terrainMaps.list defined; just return
      // an empty list without logging, to keep console output clean.
      return []
    }
  })()

  const terrainUI = new ChooseFromListUI(terrainTitles, 'chooseTerrain')
  terrainUI.setup(
    /**
     * Callback when a terrain is selected from the UI.
     * Preserves map dimensions if they exist, updates URL parameters, and reloads the page.
     * @param {number} _index - The index of the selected terrain (unused)
     * @param {string} title - The title of the selected terrain
     * @returns {void}
     */
    function (_index, title) {
      const old = bh.map
      const height = old?.rows
      const width = old?.cols
      bh.setTerrainByTitle(title)
      if (height && width) {
        const paramManager = new ParameterManager(
          new URLSearchParams(globalThis.location.search)
        )
        paramManager.setSize(height, width)
        paramManager.updateHistoryState()
      }
      setTerrainParams(bh.maps)
      globalThis.location.reload()
    },
    null,
    bh.terrainTitle
  )
}

/**
 * Configure terrain selection from URL search parameters.
 * Validates the terrain tag from URL and switches to the appropriate terrain if needed.
 * @param {URLSearchParams} urlParams - URL query parameters
 * @returns {void}
 */
export function setupTerrain (urlParams) {
  const paramManager = new ParameterManager(urlParams)
  const terrainTag = paramManager.getTerrain()
  const newTerrainMap = bh.setTerrainByTag(terrainTag)
  const newTerrainTag = newTerrainMap?.terrain?.tag
  if (newTerrainTag && terrainTag !== newTerrainTag) {
    setTerrainParams(newTerrainMap)
  }
}

/**
 * Update URL parameters to reflect the selected terrain and map.
 * Updates browser history with the new terrain, map name, and dimensions.
 * @param {Object|null} newTerrainMap - The new terrain map configuration
 * @param {Object} newTerrainMap.terrain - The terrain configuration object
 * @param {string} newTerrainMap.terrain.bodyTag - The terrain body tag identifier
 * @returns {void}
 */
export function setTerrainParams (newTerrainMap) {
  const paramManager = new ParameterManager(
    new URLSearchParams(globalThis.location.search)
  )
  const url = new URL(globalThis.location.href)

  if (!newTerrainMap?.terrain?.bodyTag) {
    console.warn('No terrain map found for terrain tag', 'setTerrainParams')
  }

  const bodyTag = newTerrainMap?.terrain?.bodyTag || 'sea'
  const mode = paramManager.isEditMode() ? 'edit' : 'create'
  const mapName = paramManager.getMapName()
  const { height, width } = paramManager.getSize()
  const mapType = paramManager.getMapType()

  // Determine final dimensions with fallback
  const finalDimensions = getFinalDimensions(height, width, mapName)

  // Build URL parameters
  updateUrlParameters(url.searchParams, {
    mode,
    mapName: mapName || '',
    ...finalDimensions,
    terrain: bodyTag,
    mapType: mapType || ''
  })

  // Update browser history
  updateBrowserHistory(url)

  bh.setTheme()
}

/**
 * Determine final height/width values for URL parameters.
 * Validates dimensions and falls back to current map dimensions if needed.
 * @param {number|null|undefined} height - The requested map height
 * @param {number|null|undefined} width - The requested map width
 * @param {string} mapName - The selected map name
 * @returns {DimensionResult} Object with height, width, and separator
 * @private
 */
function getFinalDimensions (height, width, mapName) {
  let finalHeight = height
  let finalWidth = width

  if (mapName && (Number.isNaN(height) || Number.isNaN(width))) {
    const map = bh.map
    finalHeight = map?.rows
    finalWidth = map?.cols
  }

  if (
    finalHeight &&
    finalWidth &&
    !Number.isNaN(finalHeight) &&
    !Number.isNaN(finalWidth)
  ) {
    return {
      height: finalHeight.toString(10),
      width: finalWidth.toString(10),
      x: 'x'
    }
  }

  return { height: '', width: '', x: '' }
}

/**
 * Set multiple query parameters on the current URL.
 * Updates the URLSearchParams object with all provided parameter key-value pairs.
 * @param {URLSearchParams} urlParams - The URL search parameters to update
 * @param {Record<string,string>} params - The parameters to set
 * @returns {void}
 * @private
 */
function updateUrlParameters (urlParams, params) {
  Object.entries(params).forEach(([key, value]) => {
    urlParams.set(key, value)
  })
}

/**
 * Replace current history state without forcing a reload.
 * Uses history.replaceState to update the browser URL and history without triggering navigation.
 * @param {URL} url - The new URL to set in browser history
 * @returns {void}
 * @private
 */
function updateBrowserHistory (url) {
  try {
    globalThis.history.replaceState(null, '', url.href)
  } catch (e) {
    console.debug('Could not update history:', e)
  }
}
