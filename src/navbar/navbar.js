import { bh } from '../terrains/all/js/bh.js'
import { assembleTerrains } from '../terrains/all/js/gameMaps.js'
import { ComponentLoader } from './ComponentLoader.js'
import { setupTrack } from './gtag.js'
import { setupTerrain } from '../terrains/all/js/terrainUI.js'
import { setupTabs } from './setupTabs.js'
import { storeShips } from '../waters/saveCustomMap.js'

/**
 * Singleton component loader instance
 * @type {ComponentLoader}
 */
const componentLoader = new ComponentLoader()

/**
 * Path to navbar component HTML file
 * @type {string}
 */
const NAVBAR_COMPONENT_PATH = './navbars.html'

/**
 * HTML element ID for navbar container
 * @type {string}
 */
const NAVBAR_CONTAINER_ID = 'navbar'

/**
 * HTML element ID for print title display
 * @type {string}
 */
const PRINT_TITLE_ELEMENT_ID = 'print-title'

/**
 * Switch current game mode to edit mode for a specific map
 * Prepares URL parameters and navigates to the map editor
 * @param {Object} [map] - Map object with title property
 * @param {boolean} [huntMode] - Whether in hunt/battle mode
 * @returns {void}
 */
export function switchToEdit (map, huntMode) {
  const mapName = map?.title
  const params = _buildSwitchModeParams(mapName)
  _storeAndNavigateToMode(params, huntMode, 'battlebuild', map)
}

/**
 * Initialize and render navbar with setup routines
 * Performs full navbar initialization including GA tracking, terrain setup, theme, and tabs
 * @param {string} tab - Current tab identifier
 * @param {string} title - Page title for print header
 * @returns {Promise<void>}
 */
export async function fetchNavBar (tab, title) {
  // Initialize analytics
  setupTrack()

  // Parse URL parameters
  const urlParams = new URLSearchParams(globalThis.location.search)

  // Setup game terrain configurations
  assembleTerrains()
  setupTerrain(urlParams)

  // Apply user theme and test mode settings
  bh.setTheme()
  bh.setTest(urlParams)

  // Load navbar component with caching
  await componentLoader.loadComponentCached(
    NAVBAR_CONTAINER_ID,
    NAVBAR_COMPONENT_PATH
  )

  // Set print title in document
  _setPrintTitle(title)

  // Setup tab navigation for current view
  setupTabs(tab)
}

/**
 * Build URL parameters for mode switching
 * @private
 * @param {string} [mapName] - Optional map name to include in params
 * @returns {URLSearchParams} Parameters for navigation
 */
function _buildSwitchModeParams (mapName) {
  const params = new URLSearchParams()

  if (mapName) {
    params.append('edit', mapName)
    params.append('terrain', bh.terrain?.tag || '')
  }

  return params
}

/**
 * Store game state and navigate to new mode
 * @private
 * @param {URLSearchParams} params - URL parameters to pass
 * @param {boolean} huntMode - Hunt/battle mode flag
 * @param {string} targetMode - Target page/mode identifier
 * @param {Object} map - Current map object
 * @returns {void}
 */
function _storeAndNavigateToMode (params, huntMode, targetMode, map) {
  storeShips(params, huntMode, targetMode, map)
  const url = `./battlebuild.html?${params.toString()}`
  globalThis.location.href = url
}

/**
 * Set the print title display element
 * @private
 * @param {string} title - Title text to display
 * @returns {void}
 */
function _setPrintTitle (title) {
  const titleElement = document.getElementById(PRINT_TITLE_ELEMENT_ID)
  if (titleElement) {
    titleElement.textContent = title
  }
}
