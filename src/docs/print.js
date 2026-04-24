import { fetchNavBar } from '../navbar/navbar.js'
import { setupPrint } from './setupPrint.js'
import { showShipInfo } from './shipprint.js'
import { showWeapons } from './weaponprint.js'
import { makeFriend } from '../navbar/headerUtils.js'
import { enemy } from '../waters/enemy.js'

/**
 * @typedef {Object} FleetEntity
 * @property {Array} ships - Array of ship objects
 * @property {Object} loadOut - Loadout configuration
 * @property {Object} UI - UI interface
 */

/**
 * Initializes the print page display
 */
export async function initializePrintPage () {
  await loadNavigation()
  const printMap = setupPrint()
  if (printMap) {
    displayFleetInformation()
  }
}

/**
 * Loads and displays the navigation bar
 * @returns {Promise<void>}
 */
async function loadNavigation () {
  await fetchNavBar('print', 'Battleship')
}

/**
 * Displays ship and weapon information for both fleets
 */
function displayFleetInformation () {
  const friend = makeFriend()
  showShipInfo(friend)
  showShipInfo(enemy)
  showWeapons(friend)
  showWeapons(enemy)
}

// Initialize on module load
initializePrintPage()
