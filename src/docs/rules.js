import { bh } from '../terrains/all/js/bh.js'
import { terrainSelect } from '../terrains/all/js/terrainUI.js'
import { fetchComponent } from '../network/network.js'
import { fetchNavBar } from '../navbar/navbar.js'
import {
  show2ndBar,
  hideMapSelector,
  makeFriend,
  showRules
} from '../navbar/headerUtils.js'

/**
 * @typedef {Object} FleetEntity
 * @property {Array} ships - Array of ship objects
 * @property {Object} loadOut - Loadout configuration
 * @property {Object} UI - UI interface
 */

/**
 * Initializes the rules page display
 */
export async function initializeRulesPage () {
  await loadNavigation()
  setupTerrainSelection()
  await loadRulesContent()
  configureDisplay()
  displayRules()
}

/**
 * Loads and displays the navigation bar
 * @returns {Promise<void>}
 */
async function loadNavigation () {
  await fetchNavBar('rules', 'Battleship')
}

/**
 * Sets up terrain selection interface
 */
function setupTerrainSelection () {
  terrainSelect()
}

/**
 * Loads the rules content component
 * @returns {Promise<void>}
 */
async function loadRulesContent () {
  await fetchComponent('rules', './howToPlay.html')
}

/**
 * Configures the page display elements
 */
function configureDisplay () {
  show2ndBar()
  hideMapSelector()
}

/**
 * Creates friend fleet and displays rules
 */
function displayRules () {
  const friend = makeFriend()
  showRules(friend, bh.terrain.newFleetForTerrain, true)
}

// Initialize on module load
initializeRulesPage()
