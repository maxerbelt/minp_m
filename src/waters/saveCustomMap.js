import { bh } from '../terrains/all/js/bh.js'
import { trackLevelEnd } from '../navbar/gtag.js'
import { custom } from './custom.js'

/**
 * Weapon object containing ammunition and firing configuration.
 * @typedef {Object} Weapon
 * @property {string} letter - Single-character identifier for the weapon
 * @property {number} ammo - Current ammunition count (0 or more for limited weapons)
 * @property {boolean} [unlimited] - Optional flag indicating unlimited ammo weapons
 * @property {string} tag - Weapon type tag (e.g., 'missile', 'rail')
 * @property {boolean} isLimited - Whether this weapon has limited ammunition
 */

/**
 * Custom map object containing terrain and weapon configuration.
 * @typedef {Object} CustomMapData
 * @property {number} rows - Number of rows in the map grid
 * @property {number} cols - Number of columns in the map grid
 * @property {string} title - Display title of the map
 * @property {Object} shipNum - Ship count configuration
 * @property {Array<string>} land - Array of land cell coordinates
 * @property {Array<Weapon>} weapons - Array of weapons available on this map
 * @property {string} terrain - Terrain type identifier
 */

/**
 * Check if any ships have been placed in the custom map.
 * Queries the custom map state to determine if the player has placed any ships.
 *
 * @returns {boolean} True if ships have been placed, false otherwise
 * @private
 */
function hasPlacedShips () {
  return custom.getPlacedShipCount() > 0
}

/**
 * Filter weapons to only include those with available ammunition or unlimited ammo.
 * Removes weapons that have been depleted (ammo = 0) and are not marked as unlimited.
 * Used during save operations to persist only viable weapons for the next game.
 *
 * @param {Array<Weapon>} weapons - Array of weapon objects to filter
 * @returns {Array<Weapon>} Filtered array containing only weapons with ammo or unlimited status
 * @private
 */
function filterWeaponsWithAmmo (weapons) {
  return weapons.filter(weapon => weapon.ammo > 0 || weapon.unlimited)
}

/**
 * Save a custom map configuration with placed ships to persistent storage.
 * Performs the following operations when ships are placed:
 * - Tracks level completion via analytics
 * - Filters weapons to remove ammo-depleted items
 * - Stores custom map data locally
 * - Adds map to battle history for future reference
 *
 * Side effects:
 * - Modifies the map.weapons array in place, removing depleted weapons
 * - Updates localStorage via custom.store()
 * - Updates global bh.maps collection
 * - Triggers analytics tracking via trackLevelEnd()
 *
 * @param {CustomMapData} map - The map object to save with placed ships
 * @returns {void}
 * @public
 */
export function saveCustomMap (map) {
  trackLevelEnd(map, false)

  if (hasPlacedShips()) {
    map.weapons = filterWeaponsWithAmmo(map.weapons)
    custom.store()
    bh.maps.addCurrentCustomMap(custom.getPlacedShipsData())
  }
}

/**
 * Store custom ships and generate navigation URL based on build mode.
 * When in build mode, persists ships and modifies URL parameters accordingly.
 * The URL can optionally include 'placedShips' parameter to signal placed ships,
 * or skip the mapName parameter if no ships were placed.
 *
 * @param {URLSearchParams} urlParams - URL parameters object to modify with placement status
 * @param {string} buildMode - Current build mode ('build' enters special save mode, other values skip persistence)
 * @param {string} targetPage - Target HTML page name for navigation (without .html extension)
 * @param {CustomMapData} map - The map object containing placed ships and weapon configuration
 * @returns {string} Complete navigation URL with encoded parameters and target page
 * @example
 * // Returns: './battlehide.html?terrain=space&placedShips='
 * storeShips(params, 'build', 'battlehide', customMap)
 * @public
 */
export function storeShips (urlParams, buildMode, targetPage, map) {
  if (buildMode === 'build') {
    handleBuildMode(urlParams, map)
  }
  return `./${targetPage}.html?${urlParams.toString()}`
}

/**
 * Execute build mode specific logic for storing ships and updating URL parameters.
 * This function handles the state-dependent behavior when a user explicitly saves or continues
 * from build/placement mode:
 *
 * If ships are placed:
 * - Saves the custom map configuration with weapons filtering
 * - Adds 'placedShips' parameter to signal the next page that ships have been placed
 *
 * If no ships are placed:
 * - Removes the 'mapName' parameter so the game doesn't try to load a non-existent map
 *
 * @param {URLSearchParams} urlParams - URL parameters object to modify in place
 * @param {CustomMapData} map - The map object containing ship and weapon configuration
 * @returns {void}
 * @private
 */
function handleBuildMode (urlParams, map) {
  if (hasPlacedShips()) {
    saveCustomMap(map)
    urlParams.append('placedShips', '')
  } else {
    urlParams.delete('mapName')
  }
}
