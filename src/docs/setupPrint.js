import { bh } from '../terrains/all/js/bh.js'
import { enemy } from '../waters/enemy.js'
import { setupPrintOptions } from '../navbar/setupOptions.js'
import { showRules, makeFriend } from '../navbar/headerUtils.js'

/**
 * @typedef {Object} FleetEntity
 * @property {Array} ships - Array of ship objects
 * @property {Object} loadOut - Loadout configuration with weapon systems
 * @property {Object} UI - UI interface for building boards and scores
 */

/**
 * @typedef {Object} PrintCallbacks
 * @property {Function} resetBoardSize - Callback to reset board size
 * @property {Function} refresh - Callback to refresh display
 */

let friendFleet = {}

/**
 * Resets board size for both friend and enemy fleets
 * @param {FleetEntity} friend
 * @param {FleetEntity} enemy
 */
function resetBoardSize (friend, enemy) {
  friend.UI.resetBoardSizePrint()
  enemy.UI.resetBoardSizePrint()
}

/**
 * Refreshes the print display for both fleets
 * @param {FleetEntity} friend
 * @param {FleetEntity} enemy
 */
function refreshDisplay (friend, enemy) {
  friend.setMap()
  enemy.setMap()
  friend.UI.buildBoardPrint()
  enemy.UI.buildBoardPrint()
  friend.UI.showMapTitle()
  enemy.UI.showMapTitle()
  friend.UI.score.buildTally(friend.ships, friend.loadOut.weaponSystems, friend.UI)
  enemy.UI.score.buildTally(enemy.ships, enemy.loadOut.weaponSystems, enemy.UI)
  document.title = "Geoff's Hidden Battle - " + bh.map.title
  showRules(friend)
}

/**
 * Sets up print functionality with map selection and display callbacks
 * @returns {boolean} Whether print setup was successful
 */
export function setupPrint () {
  friendFleet = makeFriend()
  const printMap = setupPrintOptions(
    resetBoardSize.bind(null, friendFleet, enemy),
    refreshDisplay.bind(null, friendFleet, enemy),
    'print'
  )
  refreshDisplay(friendFleet, enemy)
  return printMap
}
