import {
  getParamSize,
  isEditMode,
  getParamMap,
  getParamMapType
} from './getParam.js'
import { bh } from '../terrains/all/js/bh.js'
import { terrains } from '../terrains/all/js/terrains.js'
import { toTitleCase } from '../core/utils.js'

/**
 * Gets the current terrain body tag, with fallback to 'sea'.
 * @private
 * @param {string} [context=''] - Context for warning message
 * @returns {string} Body tag
 */
function getCurrentBodyTag (context = '') {
  const bodyTag = bh?.terrain?.bodyTag
  if (!bodyTag) {
    console.warn('No terrain map found for terrain tag', context)
  }
  return bodyTag || 'sea'
}

/**
 * Updates the page state with new URL and title tokens.
 * @param {Array<[string, string]>} tokens - Key-value pairs for title replacement
 * @param {URL} url - New URL to push to history
 */
function updateState (tokens, url) {
  const pageTitle = document.getElementById('page-title')
  let template = pageTitle?.dataset?.template
  if (template) {
    document.title = replaceTokens(template, tokens)
  }

  history.pushState({}, '', url)
}

/**
 * Replaces tokens in a template string.
 * @private
 * @param {string} template - Template string
 * @param {string} key - Token key
 * @param {string} value - Replacement value
 * @returns {string} Updated template
 */
function replaceToken (template, key, value) {
  const temp = template.replaceAll('{' + key + '}', value)
  return temp.replaceAll('[' + key + ']', toTitleCase(value))
}

/**
 * Replaces multiple tokens in a template string.
 * @param {string} template - Template string
 * @param {Array<[string, string]>} pairs - Key-value pairs
 * @returns {string} Updated template
 */
export function replaceTokens (template, pairs) {
  for (const [key, value] of pairs) {
    template = replaceToken(template, key, value)
  }
  return template
}

/**
 * Base function to set URL parameters and update state.
 * @private
 * @param {URLSearchParams} urlParams - URL parameters
 * @param {Object} paramChanges - Parameters to delete and set
 * @param {Array<[string, string]>} stateTokens - Tokens for state update
 * @param {URL} url - URL object
 */
function updateUrlAndState (urlParams, paramChanges, stateTokens, url) {
  // Delete specified parameters
  if (paramChanges.delete) {
    paramChanges.delete.forEach(key => urlParams.delete(key))
  }
  // Set specified parameters
  if (paramChanges.set) {
    Object.entries(paramChanges.set).forEach(([key, value]) => {
      urlParams.set(key, value)
    })
  }
  updateState(stateTokens, url)
}

/**
 * Sets size parameters (height and width) in the URL and updates state.
 * @param {number} height - New height value
 * @param {number} width - New width value
 */
export function setSizeParams (height, width) {
  const url = new URL(globalThis.location)
  const urlParams = url.searchParams
  const [currentHeight, currentWidth] = getParamSize(urlParams)

  const mode = isEditMode(urlParams) ? 'edit' : 'create'
  const mapName = getParamMap(urlParams)
  const bodyTag = getCurrentBodyTag('setSizeParams')

  if (
    height &&
    width &&
    !Number.isNaN(height) &&
    !Number.isNaN(width) &&
    (height !== currentHeight || width !== currentWidth || mapName)
  ) {
    updateUrlAndState(
      urlParams,
      {
        delete: ['mapName'],
        set: {
          height: height.toString(),
          width: width.toString(),
          terrain: bodyTag
        }
      },
      [
        ['mode', mode],
        ['mapName', mapName || ''],
        ['height', height.toString()],
        ['width', width.toString()],
        ['x', 'x'],
        ['mapType', ''],
        ['terrain', terrains?.current?.bodyTag || '']
      ],
      url
    )
  }
}
/**
 * Sets map name parameter in the URL and updates state.
 * @param {string} title - New map title
 */
export function setMapParams (title) {
  const url = new URL(globalThis.location)
  const urlParams = url.searchParams

  const currentMapName = getParamMap(urlParams)
  const bodyTag = getCurrentBodyTag('setMapParams')

  if (title && title !== currentMapName) {
    updateUrlAndState(
      urlParams,
      {
        delete: ['width', 'height'],
        set: {
          mapName: title,
          terrain: bodyTag
        }
      },
      [
        ['mapName', currentMapName || ''],
        ['mode', ''],
        ['height', ''],
        ['width', ''],
        ['x', ''],
        ['mapType', ''],
        ['terrain', bodyTag]
      ],
      url
    )
  }
}
/**
 * Sets map type parameter in the URL and updates state.
 * @param {string} mapType - New map type
 */
export function setMapTypeParams (mapType) {
  mapType = mapType?.split(' ', 1)[0]
  const url = new URL(globalThis.location)
  const urlParams = url.searchParams
  const currentMapType = getParamMapType(urlParams)
  const terrainTag = urlParams.getAll('terrain')[0]
  const currentTerrain = terrains?.current
  let bodyTag = currentTerrain?.bodyTag

  if (currentTerrain?.tag !== terrainTag) {
    const newTerrainMap = bh.setTerrainByTag(terrainTag)
    bodyTag = newTerrainMap?.terrain?.bodyTag
  }

  if (!bodyTag) {
    console.warn('No terrain map found for terrain tag', 'setMapTypeParams')
    bodyTag = 'sea'
  }

  if (mapType && currentMapType !== mapType) {
    updateUrlAndState(
      urlParams,
      {
        delete: ['mapName', 'height', 'width'],
        set: {
          terrain: bodyTag,
          mapType
        }
      },
      [
        ['mode', ''],
        ['mapName', ''],
        ['height', ''],
        ['width', ''],
        ['x', ''],
        ['mapType', mapType],
        ['terrain', bodyTag]
      ],
      url
    )
  }
}
