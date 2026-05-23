import { fetchNavBar } from '../navbar/navbar.js'
import { setupPrint } from './setupPrint.js'

/**
 * Loads and displays the navigation bar for the print page
 *
 * @async
 * @returns {Promise<void>} Resolves when navigation bar is fully loaded and rendered
 * @throws {Error} If navigation fetch fails
 * @private
 */
async function loadNavigation () {
  await fetchNavBar('print', 'Battleship')
}

/**
 * Initializes the print page display with navigation and print setup
 *
 * Orchestrates the loading of the navigation bar and print page setup,
 * then triggers the browser's native print dialog.
 *
 * @async
 * @returns {Promise<void>} Resolves when initialization is complete and print dialog is shown
 * @throws {Error} If navigation or print setup fails
 * @private
 */
async function initializePrintPage () {
  await loadNavigation()
  await setupPrint()

  globalThis.print()
}

// Initialize on module load using top-level await
await initializePrintPage()
