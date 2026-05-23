import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { fetchComponent } from '../network/network.js'
import { setupPrintOptions } from '../navbar/setupOptions.js'
import { showRules, makeFriend } from '../navbar/headerUtils.js'

/**
 * @typedef {Object} ShipEntity
 * @property {string} id - Unique ship identifier
 * @property {string} name - Ship name/type
 * @property {number} length - Ship length in grid cells
 * @property {number} health - Current ship health
 * @property {number} maxHealth - Maximum ship health
 */

/**
 * @typedef {Object} LoadOutEntity
 * @property {Object} weaponSystems - Weapon systems and their configurations
 */

/**
 * @typedef {Object} UIEntity
 * @property {Function} resetBoardSizePrint - Reset print board size display
 * @property {Function} buildBoardPrint - Build the print board display
 * @property {Function} showMapTitle - Display the map title
 * @property {Object} score - Score/tally display interface
 */

/**
 * @typedef {Object} FleetEntity
 * @property {ShipEntity[]} ships - Array of ship objects in the fleet
 * @property {LoadOutEntity} loadOut - Loadout configuration with weapon systems
 * @property {UIEntity} UI - UI interface for building boards and scores
 * @property {Function} setMap - Set the map/terrain for the fleet
 * @property {Function} [opponent] - Opponent reference (optional)
 * @property {Function} [shipCellGrid] - Ship cell grid reference (optional)
 */

/**
 * @typedef {Object} PrintSetupResult
 * @property {Object} printMap - Selected map configuration
 * @property {FleetEntity} friendFleet - Friendly fleet instance
 */

/**
 * Resets board size for both friend and enemy fleets
 *
 * Triggers board size reset for both the friendly and enemy fleets'
 * print display interfaces.
 *
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
 * Updates maps, rebuilds board displays, refreshes map titles, recalculates
 * tallies, updates document title, and displays rules for both fleets.
 *
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
 * @async
 * @returns {Promise<void>} Resolves when rules content is loaded
 * @throws {Error} If component fetch fails
 * @private
 */
async function loadRulesContent () {
  await fetchComponent('rules', './howToPlay.html')
}

/**
 * Sets up print functionality with map selection and display callbacks
 *
 * Initializes a friendly fleet, establishes print options with callbacks
 * for board size reset and display refresh, loads rules content, and
 * performs an initial display refresh.
 *
 * @async
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
