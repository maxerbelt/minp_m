/**
 * @fileoverview Print functionality setup and display management module
 *
 * Handles the initialization and management of print displays for both friendly
 * and enemy fleets, including map selection, board size management, display
 * refresh, and rules integration.
 *
 * @module setupPrint
 * @requires terrains/all/js/bh.js
 * @requires waters/enemy.js
 * @requires network/network.js
 * @requires navbar/setupOptions.js
 * @requires navbar/headerUtils.js
 */

import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { fetchComponent } from '../network/network.js'
import { setupPrintOptions } from '../navbar/setupOptions.js'
import { showRules, makeFriend } from '../navbar/headerUtils.js'

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
 * @typedef {Object} LoadOutEntity
 * @description Fleet loadout configuration with weapon system assignments
 * @property {Object} weaponSystems - Weapon systems and their configurations
 * @property {string} [strategy] - Optional loadout strategy identifier
 */

/**
 * @typedef {Object} UIEntity
 * @description UI interface for fleet print display management and board rendering
 * @property {Function} resetBoardSizePrint - Reset print board size display
 * @property {Function} buildBoardPrint - Build the print board display
 * @property {Function} showMapTitle - Display the map title
 * @property {Object} score - Score/tally display interface
 * @property {Function} score.buildTally - Build tally/score display for ships and weapons
 */

/**
 * @typedef {Object} FleetEntity
 * @description Represents a complete fleet with ships, loadout, UI, and map configuration
 * @property {ShipEntity[]} ships - Array of ship objects in the fleet
 * @property {LoadOutEntity} loadOut - Loadout configuration with weapon systems
 * @property {UIEntity} UI - UI interface for building boards and scores
 * @property {Function} setMap - Set the map/terrain for the fleet
 * @property {Object} [opponent] - Opponent reference (optional)
 * @property {Object} [shipCellGrid] - Ship cell grid reference (optional)
 */

/**
 * @typedef {Object} PrintSetupResult
 * @description Result object from print setup containing map and fleet configuration
 * @property {Object} printMap - Selected map configuration with terrain settings
 * @property {FleetEntity} friendFleet - Friendly fleet instance with all configurations
 */

/**
 * Resets board size for both friend and enemy fleets
 *
 * Triggers board size reset for both the friendly and enemy fleets'
 * print display interfaces. This ensures consistent board dimensions
 * across both player and opponent displays.
 *
 * @function resetBoardSize
 * @param {FleetEntity} friend - Friendly fleet to reset
 * @param {FleetEntity} enemy - Enemy fleet to reset
 * @returns {void}
 * @private
 */
function resetBoardSize (friend, enemy) {
  friend.UI.resetBoardSizePrint()
  enemy.UI.resetBoardSizePrint()
}

/**
 * Refreshes the print display for both fleets
 *
 * Performs a complete refresh of the print display by:
 * 1. Updating maps for both fleets
 * 2. Rebuilding board displays
 * 3. Refreshing map titles
 * 4. Recalculating tallies for ships and weapons
 * 5. Updating document title
 * 6. Displaying rules interface
 *
 * @function refreshDisplay
 * @param {FleetEntity} friend - Friendly fleet to refresh
 * @param {FleetEntity} enemy - Enemy fleet to refresh
 * @returns {void}
 * @private
 */
function refreshDisplay (friend, enemy) {
  friend.setMap()
  enemy.setMap()
  friend.UI.buildBoardPrint()
  enemy.UI.buildBoardPrint()
  friend.UI.showMapTitle()
  enemy.UI.showMapTitle()
  friend.UI.score.buildTally(
    friend.ships,
    friend.loadOut.weaponSystems,
    friend.UI
  )
  enemy.UI.score.buildTally(enemy.ships, enemy.loadOut.weaponSystems, enemy.UI)
  document.title = "Geoff's Hidden Battle - " + bh.map.title
  showRules(friend)
}

/**
 * Loads the rules content component from the server
 *
 * Fetches the 'howToPlay.html' component and inserts it into the 'rules'
 * container on the page for print display.
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
 * Sets up print functionality with map selection and display callbacks
 *
 * Initializes the print display system by:
 * 1. Creating a friendly fleet instance
 * 2. Setting up print options with reset and refresh callbacks
 * 3. Loading rules content from server
 * 4. Performing initial display refresh
 *
 * The function binds callbacks to the fleet references so map selection
 * and configuration changes trigger appropriate display updates.
 *
 * @async
 * @function setupPrint
 * @returns {Promise<PrintSetupResult>} Object containing map configuration and friendly fleet
 * @throws {Error} If fleet creation or content loading fails
 * @export
 */
export async function setupPrint () {
  const friendFleet = makeFriend()
  const printMap = setupPrintOptions(
    resetBoardSize.bind(null, friendFleet, enemy),
    refreshDisplay.bind(null, friendFleet, enemy)
  )
  await loadRulesContent()
  refreshDisplay(friendFleet, enemy)
  return { printMap, friendFleet }
}
