/**
 * @fileoverview Rules page initialization and display module
 *
 * Handles the setup and display of the battleship rules page, including
 * navigation setup, terrain selection, content loading, and fleet display.
 * This module executes initialization on module load.
 *
 * **Key Responsibilities:**
 * - Load and render navigation bar
 * - Setup terrain selection UI
 * - Load rules content from server
 * - Configure page display elements
 * - Display rules with a friend fleet instance
 *
 * **Side Effects:**
 * - Modifies DOM on module load (via initializeRulesPage)
 * - Fetches remote content (navbar, rules HTML)
 * - Initializes terrain selection UI
 *
 * @module rules
 * @requires terrains/all/js/bh.js
 * @requires terrains/all/js/terrainUI.js
 * @requires network/network.js
 * @requires navbar/navbar.js
 * @requires navbar/headerUtils.js
 * @see {@link module:setupPrint} - Print page initialization pattern
 * @see {@link module:shipprint} - Ship display patterns
 */

/** @import { FleetEntity } from './types/index.d.ts' */

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
 * **Process Flow:**
 * ```
 * loadNavigation() → setupTerrainSelection() → loadRulesContent()
 * → configureDisplay() → displayRules()
 * ```
 *
 * **Side Effects:**
 * - Modifies the DOM (navigation, terrain selector, rules content)
 * - Loads remote content from server
 * - Initializes global terrain context
 *
 * @async
 * @function initializeRulesPage
 * @returns {Promise<void>} Resolves when the rules page is fully initialized
 * @throws {Error} If navigation fetch fails - navigation bar cannot be loaded
 * @throws {Error} If component fetch fails - rules content cannot be loaded from server
 * @throws {Error} If terrain selection setup fails - terrain UI cannot be initialized
 * @export
 * @example
 * // Called automatically on module load:
 * await initializeRulesPage()
 * // Results in fully initialized rules page with fleet display
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
 * and 'Battleship' branding. This creates the top-level navigation UI that
 * allows users to navigate between different pages.
 *
 * **Context Parameters:**
 * - pageId: 'rules' - Identifies this as the rules page for active state styling
 * - branding: 'Battleship' - Header title displayed in navigation
 *
 * **Side Effects:**
 * - Inserts navigation bar HTML into DOM
 * - May register event listeners for navigation links
 * - Sets up active page highlighting
 *
 * @async
 * @function loadNavigation
 * @returns {Promise<void>} Resolves when the navigation bar is fully rendered and active
 * @throws {Error} If fetchNavBar fails - typically network error or invalid page context
 * @throws {Error} If DOM navigation container is missing
 * @private
 * @example
 * await loadNavigation()
 * // Navigation bar now visible with 'rules' as active page
 */
async function loadNavigation () {
  await fetchNavBar('rules', 'Battleship')
}

/**
 * Sets up and initializes the terrain selection interface
 *
 * Configures the terrain selector UI element that allows users to choose
 * different game terrains (sea, space, etc.) on the rules page. This
 * enables dynamic switching between terrain-specific rules and visualizations.
 *
 * **Supported Terrains:**
 * - Sea (default water-based terrain)
 * - Space (asteroid/space-based terrain)
 * - Land (land-based terrain)
 *
 * **Side Effects:**
 * - Initializes terrain selector UI elements
 * - Sets up event listeners for terrain switching
 * - May reload content based on selected terrain
 * - Updates bh.terrain context
 *
 * **Depends On:**
 * - bh.terrain - Global terrain context
 * - DOM element with id 'terrainSelector' or similar
 *
 * @function setupTerrainSelection
 * @returns {void} Synchronous initialization
 * @throws {Error} If terrain selector DOM element is missing
 * @throws {Error} If terrain definition data is unavailable
 * @private
 * @example
 * setupTerrainSelection()
 * // Terrain selector now active and responding to user input
 */
function setupTerrainSelection () {
  terrainSelect()
}

/**
 * Loads the rules content component from the server
 *
 * Fetches the 'howToPlay.html' component and inserts it into the 'rules'
 * container on the page. This provides the dynamic, terrain-aware rules
 * documentation that users see.
 *
 * **Content Source:**
 * - File: ./howToPlay.html
 * - Container ID: 'rules'
 * - Content Type: HTML (dynamically loaded)
 *
 * **Content Includes:**
 * - Game rules and objectives
 * - Ship placement rules
 * - Attack mechanics
 * - Win conditions
 * - Terrain-specific variations (if terrain-aware version)
 *
 * **Side Effects:**
 * - Replaces contents of DOM element with id 'rules'
 * - May trigger content parsing and script execution
 * - Updates page layout
 *
 * **Error Handling:**
 * - If fetch fails, container remains unchanged or shows error state
 * - Network errors are propagated to caller
 *
 * @async
 * @function loadRulesContent
 * @returns {Promise<void>} Resolves when rules content is loaded and rendered in DOM
 * @throws {Error} If component fetch fails - typically 404, network error, or parse error
 * @throws {Error} If 'rules' container element does not exist in DOM
 * @private
 * @example
 * await loadRulesContent()
 * // Rules HTML now visible in 'rules' container
 */
async function loadRulesContent () {
  await fetchComponent('rules', './howToPlay.html')
}

/**
 * Configures and displays the page layout elements
 *
 * Shows the secondary header bar and hides the map selector to provide
 * a focused rules display experience. This optimizes the UI for reading rules
 * rather than playing the game.
 *
 * **UI Changes:**
 * - Shows secondary header bar (2nd navigation/controls bar)
 * - Hides map selector (since rules page doesn't need map selection)
 * - Adjusts layout for optimal rules reading
 *
 * **Side Effects:**
 * - Modifies visibility and CSS classes of header elements
 * - May trigger layout reflow/repaint
 * - Updates DOM element display properties
 *
 * **Affects Elements:**
 * - Secondary header/bar element (display: block/flex)
 * - Map selector element (display: none)
 *
 * @function configureDisplay
 * @returns {void} Synchronous DOM updates
 * @throws {Error} If required DOM elements (header, map selector) are missing
 * @private
 * @example
 * configureDisplay()
 * // Page layout optimized for rules display
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
 * This shows an example fleet configuration to users while they read the rules.
 *
 * **Fleet Generation:**
 * - Uses bh.terrain.newFleetForTerrain to generate terrain-appropriate fleet
 * - Creates a friend fleet for display purposes
 * - Fleet configuration depends on current terrain selection
 *
 * **Display Configuration:**
 * - Calls showRules with friend fleet
 * - Sets displayNewFleet to true (shows generated fleet)
 * - Configures for public display mode (not combat)
 *
 * **Side Effects:**
 * - Creates a new FleetEntity instance
 * - Renders fleet board display
 * - Updates rules display with fleet visualization
 * - May register additional UI event listeners
 *
 * **Fleet Properties:**
 * - Generated from current terrain rules
 * - Includes ships configured per terrain
 * - Shows initial placement state
 * - Type: {@link FleetEntity}
 *
 * @function displayRules
 * @returns {void} Synchronous operation (async rendering handled by showRules)
 * @throws {Error} If makeFriend fails - fleet generation error
 * @throws {Error} If bh.terrain context is invalid or missing
 * @throws {Error} If showRules fails - display configuration error
 * @private
 * @example
 * displayRules()
 * // Rules page now shows example fleet configuration
 */
function displayRules () {
  // @type {FleetEntity}
  const friend = makeFriend()
  showRules(friend, bh.terrain.newFleetForTerrain, true)
}

/**
 * Initializes the rules page when the module loads
 *
 * **Execution Timing:** Immediately upon module import (top-level await)
 *
 * **Initialization Sequence:**
 * 1. loadNavigation() - Fetch and render navbar
 * 2. setupTerrainSelection() - Initialize terrain selector
 * 3. loadRulesContent() - Fetch rules HTML
 * 4. configureDisplay() - Show/hide UI elements
 * 5. displayRules() - Render example fleet and rules display
 *
 * **Key Behaviors:**
 * - Runs automatically on page load
 * - Blocks page initialization until complete
 * - Ensures UI is fully initialized before user interaction
 * - Generates example fleet for rules demonstration
 *
 * **Dependencies:**
 * - All imported modules must be loaded before this executes
 * - DOM must be ready (this is an HTML module, loaded in <script type="module">)
 * - Terrain definitions must be available
 *
 * **Error Propagation:**
 * - If initialization fails, error is logged to console
 * - Page may be partially initialized
 * - User can still see partial content
 *
 * @type {Promise<void>}
 */
// Initialize on module load
await initializeRulesPage()
