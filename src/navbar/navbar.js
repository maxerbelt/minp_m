import { bh } from '../terrains/all/js/bh.js'
import { assembleTerrains } from '../terrains/all/js/gameMaps.js'
import { ComponentLoader } from './ComponentLoader.js'
import { setupTrack } from './gtag.js'
import { setupTerrain } from '../terrains/all/js/terrainUI.js'
import { setupTabs } from './setupTabs.js'
import { storeShips } from '../waters/saveCustomMap.js'

/**
 * @typedef {Object} MapObject
 * @property {string} [title]
 */

/**
 * @typedef {Object} NavbarConfig
 * @property {string} tab
 * @property {string} title
 */

/** @type {ComponentLoader} */
const componentLoader = new ComponentLoader()

const NAVBAR_COMPONENT_PATH = './navbars.html'
const NAVBAR_CONTAINER_ID = 'navbar'
const PRINT_TITLE_ELEMENT_ID = 'print-title'
const BATTLEBUILD_PAGE = './battlebuild.html'
const PARAM_EDIT = 'edit'
const PARAM_TERRAIN = 'terrain'

/**
 * Switch current game mode to edit mode for a specific map.
 * Prepares URL parameters and navigates to the map editor.
 * @param {MapObject} [map] - Map object with optional title property.
 * @param {string} [buildMode] - Current build mode ('build' or other).
 * @returns {void}
 */
export function switchToEdit (map, buildMode) {
  const params = _createEditModeParams(map?.title)
  _navigateToTarget(buildMode, BATTLEBUILD_PAGE, params, map)
}

/**
 * Initialize and render navbar with setup routines.
 * Performs full navbar initialization including analytics, terrain setup, theme, and tabs.
 * @param {string} tab - Current tab identifier.
 * @param {string} title - Page title for print header.
 * @returns {Promise<void>}
 */
export async function fetchNavBar (tab, title) {
  setupTrack()

  const urlParams = _createUrlParams(globalThis.location.search)

  assembleTerrains()
  setupTerrain(urlParams)

  bh.setTheme()
  bh.setTest(urlParams)

  console.debug('fetchNavBar - loading navbar component...')
  await _loadNavbarComponent()
  console.debug('fetchNavBar - navbar component loaded; checking DOM wiring')
  try {
    const weaponBtn = document.getElementById('weaponBtn')
    const tallyBox = document.getElementById('enemy-tallyBox')
    console.debug('fetchNavBar - weaponBtn present:', !!weaponBtn)
    console.debug('fetchNavBar - enemy-tallyBox present:', !!tallyBox)
  } catch (err) {
    console.debug('fetchNavBar - DOM check failed', err)
  }

  _setPrintTitle(title)
  setupTabs(tab)
}

/**
 * Create URLSearchParams from a query string.
 * @private
 * @param {string} queryString - Browser location search string.
 * @returns {URLSearchParams} Parsed URL parameters.
 */
function _createUrlParams (queryString) {
  return new URLSearchParams(queryString)
}

/**
 * Build edit-mode URL parameters.
 * @private
 * @param {string} [mapName] - Optional map name to include in params.
 * @returns {URLSearchParams} Parameters for navigation.
 */
function _createEditModeParams (mapName) {
  const params = new URLSearchParams()

  if (mapName) {
    params.set(PARAM_EDIT, mapName)
    _appendTerrainTag(params)
  }

  return params
}

/**
 * Append the current terrain tag to params when available.
 * @private
 * @param {URLSearchParams} params - Parameters to update.
 * @returns {void}
 */
function _appendTerrainTag (params) {
  const terrainTag = bh.terrain?.tag
  if (terrainTag) {
    params.set(PARAM_TERRAIN, terrainTag)
  }
}

/**
 * Navigate to the target mode after persisting state.
 * @private
 * @param {string} buildMode - Current build mode ('build' or other).
 * @param {string} targetPage - Target page path.
 * @param {URLSearchParams} params - URL parameters to pass.
 * @param {MapObject} [map] - Current map object.
 * @returns {void}
 */
function _navigateToTarget (buildMode, targetPage, params, map) {
  storeShips(params, buildMode, targetPage, map)
  globalThis.location.href = _buildNavigationUrl(targetPage, params)
}

/**
 * Build the navigation URL for a target page and search params.
 * @private
 * @param {string} targetPage - Target page path.
 * @param {URLSearchParams} params - Parameters to append.
 * @returns {string} Navigation URL.
 */
function _buildNavigationUrl (targetPage, params) {
  const query = params.toString()
  return query ? `${targetPage}?${query}` : targetPage
}

/**
 * Load navbar component HTML into the DOM.
 * @private
 * @returns {Promise<void>}
 */
function _loadNavbarComponent () {
  return componentLoader.loadComponent(
    NAVBAR_CONTAINER_ID,
    NAVBAR_COMPONENT_PATH
  )
}

/**
 * Set the print title display element.
 * @private
 * @param {string} title - Title text to display.
 * @returns {void}
 */
function _setPrintTitle (title) {
  _setTextContentById(PRINT_TITLE_ELEMENT_ID, title)
}

/**
 * Set an element's text content by ID.
 * @private
 * @param {string} elementId - Element ID.
 * @param {string} text - Text content to apply.
 * @returns {void}
 */
function _setTextContentById (elementId, text) {
  const element = document.getElementById(elementId)
  if (element) {
    element.textContent = text
  }
}
