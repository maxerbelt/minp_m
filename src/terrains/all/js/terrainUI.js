import { bh } from './bh.js'
import { ChooseFromListUI } from '../../../navbar/chooseUI.js'
import { ParameterManager } from '../../../navbar/ParameterManager.js'

/**
 * Show the terrain selection UI.
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
 * @param {URLSearchParams} urlParams
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
 * @param {Object|null} newTerrainMap
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
 * @param {number|null|undefined} height
 * @param {number|null|undefined} width
 * @param {string} mapName
 * @returns {{height:string,width:string,x:string}}
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
 * @param {URLSearchParams} urlParams
 * @param {Record<string,string>} params
 * @returns {void}
 */
function updateUrlParameters (urlParams, params) {
  Object.entries(params).forEach(([key, value]) => {
    urlParams.set(key, value)
  })
}

/**
 * Replace current history state without forcing a reload.
 * @param {URL} url
 * @returns {void}
 */
function updateBrowserHistory (url) {
  try {
    globalThis.history.replaceState(null, '', url.href)
  } catch (e) {
    console.debug('Could not update history:', e)
  }
}
