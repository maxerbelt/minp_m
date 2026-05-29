/**
 * @fileoverview Rules page initialization and display module
 *
 * Handles the setup and display of the battleship rules page, including
 * navigation setup, terrain selection, content loading, and fleet display.
 * This module executes initialization on module load.
 *
 * @module rules
 * @requires terrains/all/js/bh.js
 * @requires terrains/all/js/terrainUI.js
 * @requires network/network.js
 * @requires navbar/navbar.js
 * @requires navbar/headerUtils.js
 */

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
 * @description Represents a single ship in a fleet with health and dimension info
 * @property {string} id - Unique ship identifier
 * @property {string} name - Ship name/type (e.g., "Battleship", "Cruiser")
 * @property {number} length - Ship length in grid cells
 * @property {number} health - Current ship health (damage taken)
 * @property {number} maxHealth - Maximum ship health (undamaged state)
 */

/**
 * @typedef {Object} LoadOut
 * @description Configuration for weapon assignments and loadout settings
 * @property {Object.<string, string>} [weapons] - Weapon assignments by location
 * @property {string} [strategy] - Loadout strategy identifier
 */

/**
 * @typedef {Object} FleetUI
 * @description UI interface for fleet display and interaction
 * @property {HTMLElement} [container] - Container element for fleet display
 * @property {boolean} [visible] - Fleet visibility state
 */

/**
 * @typedef {Object} FleetEntity
 * @description Represents a complete fleet with ships, loadout, and UI
 * @property {ShipEntity[]} ships - Array of ship objects in the fleet
 * @property {LoadOut} loadOut - Loadout configuration with weapon assignments
 * @property {FleetUI} UI - UI interface for fleet display and interaction
 */

/**
 * Initializes the rules page display with navigation, terrain selection, and rule content
 *
 * Orchestrates the complete setup of the rules page by:
 * 1. Loading navigation bar
 * 2. Setting up terrain selection interface
 * 3. Loading rules content from server
 * 4. Configuring display elements
 * 5. Displaying rules with a friendly fleet
 *
 * This is the main entry point for rules page initialization and is called
 * automatically when the module loads.
 *
 * @async
 * @function initializeRulesPage
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
 * Fetches the navigation bar component and renders it with 'rules' context
 * and 'Battleship' branding.
 *
 * @async
 * @function loadNavigation
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
 * Configures the terrain selector UI element that allows users to choose
 * different game terrains (sea, space, etc.) on the rules page.
 *
 * @function setupTerrainSelection
 * @returns {void}
 * @private
 */
function setupTerrainSelection () {
  terrainSelect()
}

/**
 * Loads the rules content component from the server
 *
 * Fetches the 'howToPlay.html' component and inserts it into the 'rules'
 * container on the page.
 *
 * @async
 * @function loadRulesContent
 * @returns {Promise<void>} Resolves when rules content is loaded and rendered
 * @throws {Error} If component fetch fails
 * @private
 */
async function loadRulesContent () {
  await fetchComponent('rules', './howToPlay.html')
}

/**
 * Configures and displays the page layout elements
 *
 * Shows the secondary header bar and hides the map selector to provide
 * a focused rules display experience.
 *
 * @function configureDisplay
 * @returns {void}
 * @private
 */
function configureDisplay () {
  show2ndBar()
  hideMapSelector()
}

/**
 * Creates a friend fleet and displays the rules interface
 *
 * Instantiates a friendly player fleet using the current terrain's fleet
 * generator and displays the complete rules interface with the fleet displayed.
 *
 * @function displayRules
 * @returns {void}
 * @private
 */
function displayRules () {
  const friend = makeFriend()
  showRules(friend, bh.terrain.newFleetForTerrain, true)
}

/**
 * Initializes the rules page when the module loads
 * @type {Promise<void>}
 */
// Initialize on module load
await initializeRulesPage()
