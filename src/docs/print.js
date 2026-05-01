import { fetchNavBar } from '../navbar/navbar.js'
import { setupPrint } from './setupPrint.js'

/**
 * Initializes the print page display
 */
async function initializePrintPage () {
  await loadNavigation()
  await setupPrint()

  globalThis.print()
}

/**
 * Loads and displays the navigation bar
 * @returns {Promise<void>}
 */
async function loadNavigation () {
  await fetchNavBar('print', 'Battleship')
}

// Initialize on module load
initializePrintPage()
