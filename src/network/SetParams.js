/**
 * URL parameter management for map configuration and state updates.
 * Provides utilities for setting and updating URL parameters related to map dimensions,
 * names, and types, with automatic page title and browser history management.
 *
 * @module network/SetParams
 * @typedef {import('./types/params.types.js').ParameterChanges} ParameterChanges
 * @typedef {import('./types/shared.types.js').TokenPair} TokenPair
 * @typedef {import('./types/terrain.types.js').TerrainData} TerrainData
 * @typedef {import('./types/params.types.js').MapConfiguration} MapConfiguration
 */

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
 * Gets the current terrain body tag with fallback to 'sea'.
 * Retrieves the terrain's body tag from the global terrain handler (bh),
 * used for applying CSS classes based on the current terrain type.
 *
 * @private
 * @param {string} [context=''] - Context identifier for warning messages (e.g., function name)
 * @returns {string} Body tag identifier ('sea', 'space', 'asteroid', etc.), defaults to 'sea'
 * @example
 * const bodyTag = getCurrentBodyTag('setSizeParams') // returns 'sea' or current terrain
 */
function getCurrentBodyTag (context = '') {
  const bodyTag = bh?.terrain?.bodyTag
  if (!bodyTag) {
    console.warn('No terrain map found for terrain tag', context)
  }
  return bodyTag || 'sea'
}

/**
 * Updates the page state with new URL and page title.
 * Updates the document title by replacing tokens in the page title template,
 * then pushes a new state to the browser history without reloading the page.
 *
 * @private
 * @param {TokenPair[]} tokens - Array of [key, value] pairs for template substitution
 * @param {URL} url - URL object with updated parameters to push to history
 * @returns {void}
 * @example
 * updateState([['mapName', 'MyMap']], new URL(window.location))
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
 * Replaces a single token in a template string.
 * Replaces both curly-bracket tokens ({key}) and square-bracket tokens ([key]) in the template.
 * Curly-bracket tokens are replaced as-is, while square-bracket tokens are replaced with
 * title-cased values (first letter uppercase).
 *
 * @private
 * @param {string} template - Template string containing tokens to replace
 * @param {string} key - Token key (without brackets)
 * @param {string} value - Replacement value for the token
 * @returns {string} Template with tokens replaced
 * @example
 * replaceToken('Map: {name} [{name}]', 'name', 'mymap')
 * // returns 'Map: mymap [Mymap]'
 */
function replaceToken (template, key, value) {
  const temp = template.replaceAll('{' + key + '}', value)
  return temp.replaceAll('[' + key + ']', toTitleCase(value))
}

/**
 * Replaces multiple tokens in a template string.
 * Iterates through token pairs and replaces each token in the template.
 * Tokens can use curly brackets ({key}) or square brackets ([key]) formats.
 *
 * @param {string} template - Template string containing tokens to replace
 * @param {TokenPair[]} pairs - Array of [key, value] token replacement pairs
 * @returns {string} Template with all tokens replaced
 * @example
 * replaceTokens('Mode: {mode}, Map: {map}', [['mode', 'edit'], ['map', 'test']])
 * // returns 'Mode: edit, Map: test'
 */
export function replaceTokens (template, pairs) {
  for (const [key, value] of pairs) {
    template = replaceToken(template, key, value)
  }
  return template
}

/**
 * Updates URL parameters and page state based on changes.
 * Applies parameter deletions and additions to the URL search parameters,
 * then updates the page state with new tokens for the page title.
 *
 * @private
 * @param {URLSearchParams} urlParams - URL search parameters to modify
 * @param {ParameterChanges} paramChanges - Object specifying which parameters to delete and set
 * @param {TokenPair[]} stateTokens - Tokens for updating page title via updateState
 * @param {URL} url - URL object to push to browser history
 * @returns {void}
 * @example
 * updateUrlAndState(urlParams,
 *   { delete: ['mapName'], set: { height: '8', width: '10' } },
 *   [['height', '8'], ['width', '10']],
 *   new URL(window.location)
 * )
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
 * Sets size parameters (height and width) in the URL and updates page state.
 * Updates the URL with new map dimensions if they differ from current parameters,
 * clearing the mapName parameter in the process. Updates page title and browser history.
 * Only applies changes if both height and width are valid numbers and differ from current values.
 *
 * @param {number} height - New map height in cells (must be a valid positive number)
 * @param {number} width - New map width in cells (must be a valid positive number)
 * @returns {void}
 * @example
 * setSizeParams(8, 10) // Sets URL to height=8&width=10 and removes mapName
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
 * Sets map name parameter in the URL and updates page state.
 * Updates the URL with the new map name if it differs from the current mapName parameter,
 * clearing height and width parameters in the process. Updates page title and browser history.
 * Only applies changes if title is provided and differs from current mapName.
 *
 * @param {string} title - New map title/name to set in URL as mapName parameter
 * @returns {void}
 * @example
 * setMapParams('MyCustomMap') // Sets URL to mapName=MyCustomMap and removes height/width
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
 * Sets map type parameter in the URL and updates page state.
 * Updates the URL with the new map type (extracting first word if multiple words provided),
 * clearing height, width, and mapName parameters. Syncs terrain system with URL terrain parameter.
 * Updates page title and browser history. Only applies changes if mapType differs from current value.
 *
 * @param {string} mapType - New map type identifier (first word is extracted if contains spaces)
 * @returns {void}
 * @example
 * setMapTypeParams('asteroid') // Sets URL to mapType=asteroid and updates terrain
 * setMapTypeParams('space terrain') // Extracts 'space' and sets URL to mapType=space
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
