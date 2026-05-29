/**
 * Print page initialization and orchestration module.
 *
 * Manages the print page lifecycle: loads the navigation bar, sets up the print layout,
 * and triggers the browser's native print dialog. Uses top-level await to run initialization
 * automatically when the module loads.
 *
 * The print page is typically used to generate PDFs or printed output of game rules,
 * ship loadouts, weapon configurations, and other reference materials.
 *
 * @module print
 * @throws {Error} If navigation fetch or print setup fails during initialization
 * @example
 * // This module executes automatically on import
 * import './print.js'; // Initializes and opens print dialog
 */

import { fetchNavBar } from '../navbar/navbar.js'
import { setupPrint } from './setupPrint.js'

/**
 * Load and render the navigation bar for the print page.
 *
 * Fetches the navigation bar component configured for the 'print' page with
 * the title 'Battleship', then renders it to the DOM. The navigation bar provides
 * context and page identification for printed output.
 *
 * @private
 * @async
 * @returns {Promise<void>} Resolves when the navigation bar is fully loaded and rendered
 * @throws {Error} If the navbar fetch fails or DOM rendering encounters an error
 * @example
 * await loadNavigation(); // Displays navbar with "Battleship" title
 */
async function loadNavigation () {
  await fetchNavBar('print', 'Battleship')
}

/**
 * Initialize the print page and trigger the browser print dialog.
 *
 * Orchestrates the complete print page initialization sequence:
 * 1. Loads and renders the navigation bar
 * 2. Sets up the print layout and content
 * 3. Triggers the browser's native print dialog
 *
 * This function serves as the main entry point for print page initialization.
 * It is called at module load time via top-level await, ensuring the print dialog
 * opens automatically when this module is imported.
 *
 * @private
 * @async
 * @returns {Promise<void>} Resolves after all setup is complete and print dialog is shown
 * @throws {Error} If navigation fetch, print setup, or DOM operations fail
 * @example
 * // Called automatically at module load
 * await initializePrintPage();
 * // Navigation bar is displayed, print content is rendered, print dialog opens
 */
async function initializePrintPage () {
  await loadNavigation()
  await setupPrint()

  globalThis.print()
}

/**
 * Module initialization via top-level await.
 *
 * Automatically initializes the print page when this module is imported.
 * This ensures the print dialog opens without requiring explicit function calls.
 */
await initializePrintPage()
