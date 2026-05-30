/**
 * @fileoverview Map Title Generation Module
 *
 * Generates unique, deterministic titles for custom game maps with automatic
 * copy numbering. Uses localStorage to persist copy counters across browser sessions,
 * allowing users to create multiple variations of maps with the same dimensions.
 *
 * Key Features:
 * - Generates titles in format: `{terrainKey}-{copyNum}-{cols}x{rows}`
 * - Persists copy numbering across browser sessions via localStorage
 * - Automatic increment of copy numbers for duplicate configurations
 * - Support for multiple terrain types with independent counters
 *
 * @module terrains/all/js/makeTitle
 */

import { oldToken } from './terrain.js'

/**
 * Terrain configuration object with unique identifier.
 * @typedef {Object} TerrainObject
 * @property {string} key - Unique identifier for the terrain type (e.g., 'seaAndLand', 'spaceAndAsteroids')
 * @description Used to generate unique storage keys and map titles for different terrain configurations
 */

/**
 * Generates a localStorage key for storing copy numbers of maps.
 * Used to maintain a counter for each unique map configuration.
 *
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer, typically 16-22)
 * @param {number} rows - Number of rows in the map grid (positive integer, typically 6-12)
 * @returns {string} The localStorage key in format `{oldToken}.{terrain.key}-index-{cols}x{rows}`
 * @static
 * @public
 *
 * @example
 * getCopyNumKey({ key: 'forest' }, 10, 10)
 * // Returns: "oldToken.forest-index-10x10"
 *
 * @remarks
 * - Key format ensures no collisions between different terrain types and dimensions
 * - Uses oldToken prefix to isolate keys within application scope
 * - Dimensions are included to track separate counters for each map size
 */
export function getCopyNumKey (terrain, cols, rows) {
  return `${oldToken}.${terrain.key}-index-${cols}x${rows}`
}

/**
 * Retrieves the current copy number from localStorage.
 * Returns NaN if no copy number has been set previously.
 *
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer, typically 16-22)
 * @param {number} rows - Number of rows in the map grid (positive integer, typically 6-12)
 * @returns {number} The current copy number, or NaN if not found in localStorage
 * @static
 * @private
 *
 * @remarks
 * - Uses localStorage.getItem() with getCopyNumKey() to retrieve the value
 * - Returns NaN when key doesn't exist (Number.parseInt(null) returns NaN)
 * - NaN is used as a sentinel value to indicate no counter has been set
 */
function getCopyNum (terrain, cols, rows) {
  return Number.parseInt(
    localStorage.getItem(getCopyNumKey(terrain, cols, rows))
  )
}

/**
 * Stores the copy number in localStorage for a specific terrain map configuration.
 * This persists the counter across browser sessions and page reloads.
 *
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer, typically 16-22)
 * @param {number} rows - Number of rows in the map grid (positive integer, typically 6-12)
 * @param {number} index - The copy number to store (positive integer, typically 1 or greater)
 * @returns {void} No return value; updates localStorage as side effect
 * @static
 * @private
 *
 * @remarks
 * - Uses localStorage.setItem() with getCopyNumKey() as key
 * - Automatically converts index to string for storage
 * - Persists data across browser sessions
 * - Called automatically by getNextCopyNum() and makeTitle()
 *
 * @see getCopyNumKey for key generation
 * @see getNextCopyNum for typical usage
 */
function setCopyNum (terrain, cols, rows, index) {
  localStorage.setItem(getCopyNumKey(terrain, cols, rows), index)
}

/**
 * Gets the next available copy number for a terrain map configuration.
 * Increments the stored counter or returns 1 if no counter exists.
 *
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer, typically 16-22)
 * @param {number} rows - Number of rows in the map grid (positive integer, typically 6-12)
 * @returns {number} The next copy number (1 if none exists, otherwise getCopyNum(terrain, cols, rows) + 1)
 * @static
 * @private
 *
 * @remarks
 * - Returns 1 on first call (getCopyNum returns NaN, NaN + 1 = NaN which coerces to false, || 1)
 * - Returns incremented value on subsequent calls
 * - Does not persist the result; caller must call setCopyNum() to save
 * - Logic: `getCopyNum(terrain, cols, rows) + 1 || 1`
 *   - If getCopyNum returns NaN: NaN + 1 = NaN, falsy, returns 1
 *   - If getCopyNum returns n: n + 1, truthy, returns n + 1
 *
 * @see getCopyNum for retrieval logic
 * @see setCopyNum for persistence
 * @see makeTitle for typical usage
 */
function getNextCopyNum (terrain, cols, rows) {
  return getCopyNum(terrain, cols, rows) + 1 || 1
}

/**
 * Generates a unique title for a terrain map copy and increments the stored counter.
 * Each call to this function automatically increments the copy number for that terrain configuration.
 *
 * This is the primary public API for generating deterministic, unique map titles. It combines
 * the terrain key, a unique copy number, and map dimensions into a single string identifier.
 *
 * @param {TerrainObject} terrain - The terrain object containing a key property
 * @param {number} cols - Number of columns in the map grid (positive integer, typically 16-22)
 * @param {number} rows - Number of rows in the map grid (positive integer, typically 6-12)
 * @returns {string} A unique title in format `{terrainKey}-{copyNum}-{cols}x{rows}`
 *   Example: "forest-1-10x10", "forest-2-10x10", "mountains-1-8x8"
 * @static
 * @public
 *
 * @example
 * // First call creates counter starting at 1
 * makeTitle({ key: 'forest' }, 10, 10) // Returns: "forest-1-10x10"
 *
 * // Subsequent calls increment counter
 * makeTitle({ key: 'forest' }, 10, 10) // Returns: "forest-2-10x10"
 *
 * // Different dimensions have separate counters
 * makeTitle({ key: 'forest' }, 8, 8)   // Returns: "forest-1-8x8"
 *
 * // Different terrain types have separate counters
 * makeTitle({ key: 'mountains' }, 8, 8) // Returns: "mountains-1-8x8"
 *
 * @remarks
 * - Side effect: Automatically increments localStorage counter for this terrain/dimension combination
 * - Deterministic: Same terrain and dimensions always produce incrementing titles
 * - Persistent: Copy numbers survive page reloads via localStorage
 * - Thread-safe within single-threaded JavaScript context
 * - Each terrain/cols/rows combination maintains independent counter
 *
 * @see getCopyNumKey for key generation logic
 * @see getNextCopyNum for counter retrieval
 * @see setCopyNum for counter persistence
 */
export function makeTitle (terrain, cols, rows) {
  const index = getNextCopyNum(terrain, cols, rows)
  setCopyNum(terrain, cols, rows, index)
  return `${terrain.key}-${index}-${cols}x${rows}`
}
