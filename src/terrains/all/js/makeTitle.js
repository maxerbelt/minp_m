import { oldToken } from './terrain.js'

/**
 * Generates a localStorage key for storing copy numbers of maps.
 * @param {Object} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map
 * @param {number} rows - Number of rows in the map
 * @returns {string} The localStorage key for the copy number
 */
export function getCopyNumKey (terrain, cols, rows) {
  return `${oldToken}.${terrain.key}-index-${cols}x${rows}`
}

/**
 * Retrieves the current copy number from localStorage.
 * @param {Object} terrain - The terrain object
 * @param {number} cols - Number of columns in the map
 * @param {number} rows - Number of rows in the map
 * @returns {number} The current copy number, or NaN if not found
 */
function getCopyNum (terrain, cols, rows) {
  return Number.parseInt(
    localStorage.getItem(getCopyNumKey(terrain, cols, rows))
  )
}

/**
 * Stores the copy number in localStorage.
 * @param {Object} terrain - The terrain object
 * @param {number} cols - Number of columns in the map
 * @param {number} rows - Number of rows in the map
 * @param {number} index - The copy number to store
 */
function setCopyNum (terrain, cols, rows, index) {
  localStorage.setItem(getCopyNumKey(terrain, cols, rows), index)
}

/**
 * Gets the next available copy number for a terrain map.
 * @param {Object} terrain - The terrain object
 * @param {number} cols - Number of columns in the map
 * @param {number} rows - Number of rows in the map
 * @returns {number} The next copy number (starting from 1 if none exists)
 */
function getNextCopyNum (terrain, cols, rows) {
  return getCopyNum(terrain, cols, rows) + 1 || 1
}

/**
 * Generates a unique title for a terrain map copy.
 * @param {Object} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map
 * @param {number} rows - Number of rows in the map
 * @returns {string} A unique title in the format "terrainKey-copyNum-colsxrows"
 */
export function makeTitle (terrain, cols, rows) {
  const index = getNextCopyNum(terrain, cols, rows)
  setCopyNum(terrain, cols, rows, index)
  return `${terrain.key}-${index}-${cols}x${rows}`
}
