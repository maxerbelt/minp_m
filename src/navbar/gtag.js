import { bh } from '../terrains/all/js/bh.js'

/**
 * Google Analytics Tracking ID
 * @type {string}
 */
const GA_ID = 'G-J2METC1TPT'

/**
 * Event names for Google Analytics tracking
 * @type {Object<string, string>}
 */
const EVENT_NAMES = {
  LEVEL_END: 'level_end',
  BUTTON_CLICK: 'button_click',
  TAB_CLICK: 'tab_click'
}

/**
 * Global gtag function reference from Google Analytics
 * @type {Function|undefined}
 */
export const gtag = globalThis.gtag

/**
 * Track level completion event
 * @param {Object} [map] - Map object with title, terrain, rows, cols properties
 * @param {boolean} [success=false] - Whether level was completed successfully
 * @returns {void}
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
 * Track button click engagement event
 * @param {Object} [map] - Map object with title, terrain, rows, cols properties
 * @param {string} button - Button identifier or label
 * @returns {void}
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
 * Track tab navigation event
 * @param {string} tab - Tab identifier or label
 * @returns {void}
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
 * Initialize Google Analytics tracking
 * Sets up gtag function and loads GA script if not already present
 * @returns {void}
 * @throws {Error} If GA_ID is missing or invalid
 */
export function setupTrack () {
  _initializeGA(GA_ID)
}

/**
 * Check if GA is initialized and available
 * Logs warning if gtag not available
 * @private
 * @returns {boolean} True if gtag is available
 */
function _ensureGAInitialized () {
  if (typeof globalThis.gtag !== 'function') {
    console.warn('Google Analytics (gtag) not initialized')
    return false
  }
  return true
}

/**
 * Build common map-related parameters for GA events
 * @private
 * @param {Object} map - Map object with properties
 * @param {string} [map.title] - Map display title
 * @param {string} [map.terrain] - Terrain type identifier
 * @param {number} [map.rows] - Board height
 * @param {number} [map.cols] - Board width
 * @returns {Object} Common parameters for GA events
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
 * Initialize Google Analytics with gtag configuration and script loading
 * Safe to call multiple times - checks if script already loaded
 * @private
 * @param {string} gaId - Google Analytics ID (format: G-XXXXXX)
 * @throws {Error} If GA_ID is missing or invalid
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
