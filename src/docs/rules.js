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
 * @typedef {Object} ShipEntity
 * @property {string} id - Unique ship identifier
 * @property {string} name - Ship name/type
 * @property {number} length - Ship length in grid cells
 * @property {number} health - Current ship health
 * @property {number} maxHealth - Maximum ship health
 */

/**
 * @typedef {Object} FleetEntity
 * @property {ShipEntity[]} ships - Array of ship objects in the fleet
 * @property {Object} loadOut - Loadout configuration with weapon assignments
 * @property {Object} UI - UI interface for fleet display and interaction
 */

/**
 * Initializes the rules page display with navigation, terrain selection, and rule content
 *
 * Orchestrates the complete setup of the rules page by loading navigation,
 * setting up terrain selection, loading rules content, configuring display
 * elements, and displaying rules with a friendly fleet.
 *
 * @async
 * @returns {Promise<void>} Resolves when the rules page is fully initialized
 * @throws {Error} If navigation, content loading, or display configuration fails
 * @export
 */
export async function initializeRulesPage () {
  await loadNavigation()
  setupTerrainSelection()
  await loadRulesContent()
  configureDisplay()
  displayRules()
}

/**
 * Loads and displays the navigation bar for the rules page
 *
 * @async
 * @returns {Promise<void>} Resolves when the navigation bar is fully rendered
 * @throws {Error} If navigation fetch or rendering fails
 * @private
 */
async function loadNavigation () {
  await fetchNavBar('rules', 'Battleship')
}

/**
 * Sets up and initializes the terrain selection interface
 *
 * @returns {void}
 * @private
 */
function setupTerrainSelection () {
  terrainSelect()
}

/**
 * Loads the rules content component from the server
 *
 * @async
 * @returns {Promise<void>} Resolves when rules content is loaded and rendered
 * @throws {Error} If component fetch fails
 * @private
 */
async function loadRulesContent () {
  await fetchComponent('rules', './howToPlay.html')
}

/**
 * Configures and displays the page elements
 *
 * Shows the secondary header bar and hides the map selector to provide
 * a focused rules display experience.
 *
 * @returns {void}
 * @private
 */
function configureDisplay () {
  show2ndBar()
  hideMapSelector()
}

/**
 * Creates a friend fleet and displays the rules
 *
 * Instantiates a friendly player fleet and displays the rules interface
 * with the fleet and the current terrain's new fleet generator function.
 *
 * @returns {void}
 * @private
 */
function displayRules () {
  const friend = makeFriend()
  showRules(friend, bh.terrain.newFleetForTerrain, true)
}

// Initialize on module load
await initializeRulesPage()
