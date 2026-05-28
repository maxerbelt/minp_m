import { oldToken } from './terrain.js'

/**
 * @typedef {Object} TerrainObject
 * @property {string} key - Unique identifier for the terrain type
 */

/**
 * Generates a localStorage key for storing copy numbers of maps.
 * Used to maintain a counter for each unique map configuration.
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer)
 * @param {number} rows - Number of rows in the map grid (positive integer)
 * @returns {string} The localStorage key in format `{oldToken}.{terrain.key}-index-{cols}x{rows}`
 * @example
 * getCopyNumKey({ key: 'forest' }, 10, 10)
 * // Returns: "oldToken.forest-index-10x10"
 */
export function getCopyNumKey (terrain, cols, rows) {
  return `${oldToken}.${terrain.key}-index-${cols}x${rows}`
}

/**
 * Retrieves the current copy number from localStorage.
 * Returns NaN if no copy number has been set previously.
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer)
 * @param {number} rows - Number of rows in the map grid (positive integer)
 * @returns {number} The current copy number, or NaN if not found in localStorage
 * @private
 */
function getCopyNum (terrain, cols, rows) {
  return Number.parseInt(
    localStorage.getItem(getCopyNumKey(terrain, cols, rows))
  )
}

/**
 * Stores the copy number in localStorage for a specific terrain map configuration.
 * This persists the counter across browser sessions.
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer)
 * @param {number} rows - Number of rows in the map grid (positive integer)
 * @param {number} index - The copy number to store (positive integer)
 * @returns {void}
 * @private
 */
function setCopyNum (terrain, cols, rows, index) {
  localStorage.setItem(getCopyNumKey(terrain, cols, rows), index)
}

/**
 * Gets the next available copy number for a terrain map configuration.
 * Increments the stored counter or returns 1 if no counter exists.
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer)
 * @param {number} rows - Number of rows in the map grid (positive integer)
 * @returns {number} The next copy number (starts from 1 if none exists, otherwise increments)
 * @private
 */
function getNextCopyNum (terrain, cols, rows) {
  return getCopyNum(terrain, cols, rows) + 1 || 1
}

/**
 * Generates a unique title for a terrain map copy and increments the stored counter.
 * Each call to this function automatically increments the copy number for that terrain configuration.
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer)
 * @param {number} rows - Number of rows in the map grid (positive integer)
 * @returns {string} A unique title in format `{terrainKey}-{copyNum}-{cols}x{rows}` (e.g., "forest-1-10x10")
 * @example
 * makeTitle({ key: 'forest' }, 10, 10) // Returns: "forest-1-10x10"
 * makeTitle({ key: 'forest' }, 10, 10) // Returns: "forest-2-10x10"
 * makeTitle({ key: 'mountains' }, 8, 8) // Returns: "mountains-1-8x8"
 */
export function makeTitle (terrain, cols, rows) {
  const index = getNextCopyNum(terrain, cols, rows)
  setCopyNum(terrain, cols, rows, index)
  return `${terrain.key}-${index}-${cols}x${rows}`
}
