import { bh } from './bh.js'
import { ChooseFromListUI } from '../navbar/chooseUI.js'
import { ParameterManager } from '../navbar/ParameterManager.js'

export function terrainSelect () {
  const terrainTitles = (() => {
    try {
      const t = bh.terrainTitleList
      return Array.isArray(t) ? t : []
    } catch (_error) {
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

export function setupTerrain (urlParams) {
  const paramManager = new ParameterManager(urlParams)
  const terrainTag = paramManager.getTerrain()
  const newTerrainMap = bh.setTerrainByTag(terrainTag)
  const newTerrainTag = newTerrainMap?.terrain?.tag
  if (newTerrainTag && terrainTag !== newTerrainTag) {
    setTerrainParams(newTerrainMap)
  }
}

export function setTerrainParams (newTerrainMap) {
  const paramManager = new ParameterManager(
    new URLSearchParams(globalThis.location.search)
  )
  const url = new URL(globalThis.location)

  if (!newTerrainMap?.terrain?.bodyTag) {
    console.warn('No terrain map found for terrain tag', 'setTerrainParams')
  }

  const bodyTag = newTerrainMap?.terrain?.bodyTag || 'sea'
  const mode = paramManager.isEditMode() ? 'edit' : 'create'
  const mapName = paramManager.getMapName()
  const { height, width } = paramManager.getSize()
  const mapType = paramManager.getMapType()

  // Build parameter object
  let h = ''
  let w = ''
  let x = ''

  // Fallback to current map dimensions if needed
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
    h = finalHeight.toString(10)
    w = finalWidth.toString(10)
    x = 'x'
  }

  // Update URL parameters
  const urlParams = url.searchParams
  urlParams.set('mode', mode)
  urlParams.set('mapName', mapName || '')
  urlParams.set('height', h)
  urlParams.set('width', w)
  urlParams.set('x', x)
  urlParams.set('terrain', bodyTag)
  urlParams.set('mapType', mapType || '')

  // Update browser history (with error handling for test environments)
  try {
    globalThis.history.replaceState(null, '', url.href)
  } catch (e) {
    // In test environments, replaceState may be restricted; continue without updating history
    console.debug('Could not update history:', e)
  }

  bh.setTheme()
}
