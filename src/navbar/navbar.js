import { bh } from '../terrains/all/js/bh.js'
import { assembleTerrains } from '../terrains/all/js/gameMaps.js'
import { ComponentLoader } from './ComponentLoader.js'
import { setupTrack } from './gtag.js'
import { setupTerrain } from '../terrains/all/js/terrainUI.js'
import { setupTabs } from './setupTabs.js'
import { storeShips } from '../waters/saveCustomMap.js'

/**
 * Game map object with metadata.
 * Represents a map configuration with display information.
 *
 * @typedef {Object} MapObject
 * @property {string} [title] - Display title of the map.
 */

/**
 * Navbar configuration for initialization.
 * Specifies which tab is active and the page title.
 *
 * @typedef {Object} NavbarConfig
 * @property {string} tab - Active tab identifier.
 * @property {string} title - Page title for display.
 */

/**
 * @typedef {Object} TerrainConfig
 * @property {string} [tag] - Terrain type identifier tag.
 */

/** @type {ComponentLoader} Component loader instance for navbar HTML. */
const componentLoader = new ComponentLoader()

/** @type {string} Path to the navbar component HTML file. */
const NAVBAR_COMPONENT_PATH = './navbars.html'

/** @type {string} Container element ID for navbar component. */
const NAVBAR_CONTAINER_ID = 'navbar'

/** @type {string} Element ID for print title display. */
const PRINT_TITLE_ELEMENT_ID = 'print-title'

/** @type {string} Battle build page path for navigation. */
const BATTLEBUILD_PAGE = './battlebuild.html'

/** @type {string} URL parameter key for edit mode. */
const PARAM_EDIT = 'edit'

/** @type {string} URL parameter key for terrain type. */
const PARAM_TERRAIN = 'terrain'

/**
 * Switch current game mode to edit mode for a specific map.
 * Prepares URL parameters with map name and terrain tag, then navigates to map editor.
 * Persists game state before navigation using storeShips().
 *
 * @param {MapObject} [map] - Map object with optional title property for identification.
 * @param {string} [buildMode] - Current build mode identifier ('build' or other value).
 * @returns {void}
 */
export function switchToEdit (map, buildMode) {
  const params = _createEditModeParams(map?.title)
  _navigateToTarget(buildMode, BATTLEBUILD_PAGE, params, map)
}

/**
 * Initialize and render navbar with all setup routines.
 * Performs comprehensive navbar initialization including:
 * - Analytics setup and tracking
 * - Terrain assembly and UI setup
 * - Theme application
 * - Tab initialization
 * - Component loading and DOM wiring verification
 * - Print title configuration
 *
 * @async
 * @param {string} tab - Active tab identifier for navbar state.
 * @param {string} title - Page title text for print header display.
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
 * Parses the browser location search string into URL parameters.
 *
 * @private
 * @param {string} queryString - Browser location search string (from globalThis.location.search).
 * @returns {URLSearchParams} Parsed URL parameters object.
 */
function _createUrlParams (queryString) {
  return new URLSearchParams(queryString)
}

/**
 * Build edit-mode URL parameters with map name and terrain.
 * Creates URLSearchParams containing edit mode parameters including map identifier
 * and current terrain tag if available.
 *
 * @private
 * @param {string} [mapName] - Optional map name to include in edit parameters.
 * @returns {URLSearchParams} Parameters ready for navigation URL.
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
 * Append the current terrain tag to URL parameters when available.
 * Extracts terrain tag from bh.terrain and adds it as a URL parameter.
 * Used to preserve terrain selection across page navigation.
 *
 * @private
 * @param {URLSearchParams} params - URL parameters object to modify.
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
 * Persists game state via storeShips(), builds navigation URL,
 * and updates browser location to navigate to target page.
 *
 * @private
 * @param {string} buildMode - Current build mode identifier ('build' or other value).
 * @param {string} targetPage - Target page path for navigation (e.g., './battlebuild.html').
 * @param {URLSearchParams} params - URL parameters to include in navigation.
 * @param {MapObject} [map] - Current map object for state persistence.
 * @returns {void}
 */
function _navigateToTarget (buildMode, targetPage, params, map) {
  storeShips(params, buildMode, targetPage, map || {})
  globalThis.location.href = _buildNavigationUrl(targetPage, params)
}

/**
 * Build the navigation URL for a target page and search params.
 * Constructs a complete navigation URL by combining target page path
 * with encoded URL search parameters.
 *
 * @private
 * @param {string} targetPage - Target page path.
 * @param {URLSearchParams} params - Parameters to append as query string.
 * @returns {string} Complete navigation URL (e.g., './battlebuild.html?edit=mapName&terrain=space').
 */
function _buildNavigationUrl (targetPage, params) {
  const query = params.toString()
  return query ? `${targetPage}?${query}` : targetPage
}

/**
 * Load navbar component HTML into the DOM.
 * Uses ComponentLoader to fetch and insert navbar component HTML
 * into the navbar container element.
 *
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
 * Updates the text content of the print title element by calling _setTextContentById.
 *
 * @private
 * @param {string} title - Title text to display in the print title element.
 * @returns {void}
 */
function _setPrintTitle (title) {
  _setTextContentById(PRINT_TITLE_ELEMENT_ID, title)
}

/**
 * Set an element's text content by ID.
 * Safely finds a DOM element by ID and updates its text content.
 * Silently skips if element is not found.
 *
 * @private
 * @param {string} elementId - HTML element ID to target.
 * @param {string} text - Text content to apply to the element.
 * @returns {void}
 */
function _setTextContentById (elementId, text) {
  const element = document.getElementById(elementId)
  if (element) {
    element.textContent = text
  }
}
