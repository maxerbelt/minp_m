import { bh } from '../terrains/all/js/bh.js'

/**
 * @typedef {Object} GTagMap
 * @property {string} [title] - Display name/title of the map
 * @property {string} [terrain] - Terrain type identifier (e.g., 'sea', 'space')
 * @property {number} [rows] - Board height in cells
 * @property {number} [cols] - Board width in cells
 */

/**
 * @typedef {Object} GTagEventParams
 * @property {string} [level_name] - Name of the current level/map
 * @property {string} [terrain] - Terrain type being played
 * @property {number} [height] - Board height
 * @property {number} [width] - Board width
 * @property {string} [mode] - Game mode from document.title
 * @property {string} [event_category] - Category of engagement event
 * @property {string} [event_label] - Label/identifier for the event
 * @property {boolean} [success] - Whether the level was completed successfully
 */

/**
 * Google Analytics Tracking ID for this application.
 * Format: G-XXXXXX (GA4 measurement ID)
 * @type {string}
 * @const
 */
const GA_ID = 'G-J2METC1TPT'

/**
 * Enumeration of event names sent to Google Analytics.
 * Used to track different types of user interactions throughout the game.
 * @type {Object<string, string>}
 * @const
 * @property {string} LEVEL_END - Event fired when a game level completes
 * @property {string} BUTTON_CLICK - Event fired when user clicks a button
 * @property {string} TAB_CLICK - Event fired when user switches tabs/views
 */
const EVENT_NAMES = {
  LEVEL_END: 'level_end',
  BUTTON_CLICK: 'button_click',
  TAB_CLICK: 'tab_click'
}

/**
 * Global gtag function reference from Google Analytics.
 * Provides access to the gtag tracking function if Google Analytics is loaded.
 * Call gtag('event', eventName, eventParams) to track user interactions.
 * @type {(Function|undefined)}
 * @see https://developers.google.com/analytics/devguides/collection/gtagjs
 */
export const gtag = globalThis.gtag

/**
 * Track level completion event to Google Analytics.
 * Sends event data including map information and completion status.
 * Safely handles cases where Google Analytics is not initialized.
 *
 * @public
 * @param {GTagMap} [map] - Map object containing game level information.
 *                          Falls back to bh.map if not provided.
 * @param {boolean} [success=false] - Whether the level was completed successfully.
 *                                    True for level completion, false for abandonment.
 * @returns {void} No return value; sends event to Google Analytics asynchronously.
 */
export function trackLevelEnd (map, success) {
  if (!_ensureGAInitialized()) return

  map = map || bh.map
  const params = {
    ..._buildCommonMapParams(map),
    success: !!success
  }

  globalThis.gtag('event', EVENT_NAMES.LEVEL_END, params)
}

/**
 * Track button click engagement event to Google Analytics.
 * Records user interaction with game UI buttons and controls.
 * Safely handles cases where Google Analytics is not initialized.
 *
 * @public
 * @param {GTagMap} [map] - Map object containing game level information.
 *                          Falls back to bh.map if not provided.
 * @param {string} button - Button identifier or descriptive label.
 *                          Should uniquely identify the button that was clicked.
 * @returns {void} No return value; sends event to Google Analytics asynchronously.
 */
export function trackClick (map, button) {
  if (!_ensureGAInitialized()) return

  map = map || bh.map
  const params = {
    event_category: 'Engagement',
    event_label: button,
    ..._buildCommonMapParams(map)
  }

  globalThis.gtag('event', EVENT_NAMES.BUTTON_CLICK, params)
}

/**
 * Track tab navigation event to Google Analytics.
 * Records user navigation between different UI tabs or views.
 * Safely handles cases where Google Analytics is not initialized.
 *
 * @public
 * @param {string} tab - Tab identifier or descriptive label.
 *                       Should uniquely identify which tab/view was selected.
 * @returns {void} No return value; sends event to Google Analytics asynchronously.
 */
export function trackTab (tab) {
  if (!_ensureGAInitialized()) return

  const params = {
    event_category: 'Engagement',
    event_label: tab,
    mode: document.title
  }

  globalThis.gtag('event', EVENT_NAMES.TAB_CLICK, params)
}

/**
 * Initialize Google Analytics tracking for the application.
 * Sets up the gtag function, configures GA with application ID, and loads the GA script.
 * Safe to call multiple times - script loading is guarded against duplicates.
 * Must be called once during application initialization before tracking events.
 *
 * @public
 * @returns {void} No return value; initializes global Google Analytics state.
 * @throws {Error} If GA_ID is missing or invalid format (expected: G-XXXXXX).
 */
export function setupTrack () {
  _initializeGA(GA_ID)
}

/**
 * Check if Google Analytics is initialized and the gtag function is available.
 * Logs a warning to the console if gtag has not been properly initialized.
 * Used by tracking functions to gracefully handle GA initialization failures.
 *
 * @private
 * @returns {boolean} True if globalThis.gtag is a function and ready to use;
 *                    false if GA not initialized (warning logged).
 */
function _ensureGAInitialized () {
  if (typeof globalThis.gtag !== 'function') {
    console.warn('Google Analytics (gtag) not initialized')
    return false
  }
  return true
}

/**
 * Build common map-related parameters for Google Analytics events.
 * Extracts and standardizes game level information for consistent event tracking.
 * Provides sensible defaults ('unknown' or 0) for missing map properties.
 * Includes current document.title as the game mode.
 *
 * @private
 * @param {GTagMap} map - Map object containing game level information.
 * @param {string} [map.title] - Map display title (defaults to 'unknown').
 * @param {string} [map.terrain] - Terrain type identifier (defaults to 'unknown').
 * @param {number} [map.rows] - Board height in cells (defaults to 0).
 * @param {number} [map.cols] - Board width in cells (defaults to 0).
 * @returns {GTagEventParams} Normalized parameters object with level_name, terrain,
 *                             height, width, and mode for GA event tracking.
 */
function _buildCommonMapParams (map) {
  return {
    level_name: map?.title || 'unknown',
    terrain: map?.terrain || 'unknown',
    height: map?.rows || 0,
    width: map?.cols || 0,
    mode: document.title
  }
}

/**
 * Initialize Google Analytics with gtag configuration and load tracking script.
 * Performs the following setup:
 * - Creates the dataLayer array on globalThis if not present
 * - Defines the gtag function that queues tracking events
 * - Calls gtag('js', ...) to initialize GA
 * - Calls gtag('config', ...) with application measurement ID
 * - Loads the GA tracking script from Google's servers if not already present
 *
 * Safe to call multiple times - checks if GA script already loaded by ID.
 *
 * @private
 * @param {string} gaId - Google Analytics ID in GA4 format (example: G-XXXXXX).
 *                        Must be a valid GA4 measurement ID.
 * @returns {void} No return value; sets up global GA state and loads script.
 * @throws {Error} If gaId is falsy/missing, with message:
 *                 'initGA: missing GA_ID (format: G-XXXXXX)'
 */
function _initializeGA (gaId) {
  if (!gaId) {
    throw new Error('initGA: missing GA_ID (format: G-XXXXXX)')
  }

  // Ensure dataLayer exists
  globalThis.dataLayer = globalThis.dataLayer || []

  // Define gtag only if not already defined
  if (!globalThis.gtag) {
    globalThis.gtag = function gtag () {
      globalThis.dataLayer.push(arguments)
    }
  }

  // Check if GA script already loaded
  const alreadyLoaded = !!document.querySelector(
    `script[src^="https://www.googletagmanager.com/gtag/js?id=${gaId}"]`
  )

  // Call basic setup immediately (safe before script loads)
  globalThis.gtag('js', new Date())
  globalThis.gtag('config', gaId, { debug_mode: true })

  // Load GA script if not already present
  if (!alreadyLoaded) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    document.head.appendChild(script)
  }
}
