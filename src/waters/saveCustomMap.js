import { bh } from '../terrains/all/js/bh.js'
import { trackLevelEnd } from '../navbar/gtag.js'
import { custom } from './custom.js'

/**
 * Check if any ships have been placed in the custom map.
 * @returns {boolean} True if ships are placed, false otherwise.
 * @private
 */
function hasPlacedShips () {
  return custom.getPlacedShipCount() > 0
}

/**
 * Filter weapons to only include those with ammo or unlimited ammo.
 * @param {Array} weapons - Array of weapon objects.
 * @returns {Array} Filtered array of weapons.
 * @private
 */
function filterWeaponsWithAmmo (weapons) {
  return weapons.filter(weapon => weapon.ammo > 0 || weapon.unlimited)
}

/**
 * Save a custom map with placed ships.
 * Tracks the level end, filters weapons, stores custom data, and adds to battle history.
 * @param {Object} map - The map object to save.
 * @param {Array} map.weapons - Array of weapon objects on the map.
 */
export function saveCustomMap (map) {
  trackLevelEnd(map, false)

  if (hasPlacedShips()) {
    map.weapons = filterWeaponsWithAmmo(map.weapons)
    custom.store()
    bh.maps.addCurrentCustomMap(custom.placedShips())
  }
}

/**
 * Store ships and generate navigation URL based on build mode.
 * @param {URLSearchParams} urlParams - URL parameters object.
 * @param {string} buildMode - Current build mode ('build' or other).
 * @param {string} targetPage - Target page name for navigation.
 * @param {Object} map - The map object.
 * @returns {string} Navigation URL with parameters.
 */
export function storeShips (urlParams, buildMode, targetPage, map) {
  if (buildMode === 'build') {
    handleBuildMode(urlParams, map)
  }
  return `./${targetPage}.html?${urlParams.toString()}`
}

/**
 * Handle build mode specific logic for storing ships.
 * @param {URLSearchParams} urlParams - URL parameters to modify.
 * @param {Object} map - The map object.
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
