import { Random } from './Random.js'

/**
 * Utility functions for coordinate manipulation, array operations, and DOM element handling.
 * Provides helpers for shuffling, sorting by distance, key-coordinate conversions,
 * CSV parsing, and lazy property computation.
 *
 * @module utilities
 */

/**
 * @typedef {[number|bigint, number|bigint, number?]} Coordinate
 * 2D or 3D coordinate tuple where first two elements are row and column,
 * optional third element represents depth/color/z-value (may be number or bigint).
 */

/**
 * @typedef {Object} MinMaxBounds
 * Bounding box information computed from coordinate arrays.
 * @property {number} minX - Minimum x (column) coordinate across all points
 * @property {number} maxX - Maximum x (column) coordinate across all points
 * @property {number} minY - Minimum y (row) coordinate across all points
 * @property {number} maxY - Maximum y (row) coordinate across all points
 * @property {number} depth - Maximum z-value + 1, or 2 if no z-values present
 * @property {boolean} hasColor - True if any coordinate contained a z-value/color
 */

/**
 * Shuffles the elements of an array in place using Fisher-Yates algorithm.
 * Provides random permutation with uniform distribution across all possible orderings.
 *
 * @template T
 * @param {T[]} array - The array to shuffle (modified in place)
 * @returns {T[]} The shuffled array (same reference as input)
 * @example
 * const arr = [1, 2, 3, 4, 5];
 * shuffleArray(arr); // [3, 1, 5, 2, 4] (random order)
 */
export function shuffleArray (array) {
  return Random.shuffleArray(array)
}

/**
 * Selects a random element from an array with uniform probability.
 *
 * @template T
 * @param {T[]} array - The array to select from
 * @returns {T|undefined} Random element from the array, or undefined if array is empty
 * @example
 * randomElement([1, 2, 3]) // 2 (random element)
 * randomElement([]) // undefined
 */
export function randomElement (array) {
  return Random.element(array)
}

/**
 * Shuffles an array and sorts it by Euclidean distance to a reference point.
 * Creates a copy of the input list, shuffles it randomly, then sorts by proximity.
 * Useful for randomized nearest-neighbor selection with tie-breaking by shuffle.
 *
 * @param {number} refRow - Reference row coordinate
 * @param {number} refCol - Reference column coordinate
 * @param {Array<Array<number>>} list - List of [row, col] coordinate pairs
 * @returns {Array<Array<number>>} Shuffled and sorted by distance to (refRow, refCol)
 * @example
 * shuffleSortClosestTo(5, 5, [[6, 6], [5, 5], [10, 10]]) // [[5, 5], [6, 6], [10, 10]] (sorted by distance)
 */
export function shuffleSortClosestTo (refRow, refCol, list) {
  return sortClosestTo(refRow, refCol, Random.shuffleArray([...list]))
}

/**
 * Sorts a list of coordinates by Euclidean distance to a reference point.
 * Sorts the input array in place using hypot for accurate distance calculation.
 * Closer points come first (ascending distance order).
 *
 * @param {number} refRow - Reference row coordinate
 * @param {number} refCol - Reference column coordinate
 * @param {Array<Array<number>>} list - List of [row, col] coordinate pairs (sorted in place)
 * @returns {Array<Array<number>>} Same list, sorted by distance (closest first)
 * @example
 * sortClosestTo(0, 0, [[3, 4], [1, 0], [0, 0]]) // [[0, 0], [1, 0], [3, 4]] (by distance)
 */
export function sortClosestTo (refRow, refCol, list) {
  return list.sort(([r1, c1], [r2, c2]) => {
    const d1 = Math.hypot(r1 - refRow, c1 - refCol)
    const d2 = Math.hypot(r2 - refRow, c2 - refCol)
    return d1 - d2
  })
}

/**
 * Finds the closest coordinate to a reference point.
 * Returns null if the list is empty (after sorting, at(0) returns undefined).
 *
 * @param {number} refRow - Reference row coordinate
 * @param {number} refCol - Reference column coordinate
 * @param {Array<Array<number>>} list - List of [row, col] coordinate pairs (modified by sort)
 * @returns {Array<number>|null} Closest [row, col] coordinate, or null if list empty
 * @example
 * closestTo(5, 5, [[6, 6], [10, 10]]) // [6, 6]
 * closestTo(5, 5, []) // null
 */
export function closestTo (refRow, refCol, list) {
  return sortClosestTo(refRow, refCol, list).at(0) || null
}

/**
 * Finds the furthest coordinate from a reference point.
 * Sorts by distance and returns the last element (maximum distance).
 *
 * @param {number} refRow - Reference row coordinate
 * @param {number} refCol - Reference column coordinate
 * @param {Array<Array<number>>} list - List of [row, col] coordinate pairs (modified by sort)
 * @returns {Array<number>|null} Furthest [row, col] coordinate, or null if list empty
 * @example
 * furtherestFrom(5, 5, [[6, 6], [10, 10]]) // [10, 10]
 * furtherestFrom(0, 0, []) // null
 */
export function furtherestFrom (refRow, refCol, list) {
  return sortClosestTo(refRow, refCol, list).at(-1) || null
}

/**
 * Shuffles and finds the furthest coordinate from a reference point.
 * Provides randomized furthest-point selection with tie-breaking by shuffle order.
 *
 * @param {number} refRow - Reference row coordinate
 * @param {number} refCol - Reference column coordinate
 * @param {Array<Array<number>>} list - List of [row, col] coordinate pairs
 * @returns {Array<number>|null} Furthest shuffled [row, col] coordinate, or null if list empty
 * @example
 * shuffleFurtherestFrom(5, 5, [[6, 6], [10, 10]]) // [10, 10] (furthest, with shuffle)
 */
export function shuffleFurtherestFrom (refRow, refCol, list) {
  return shuffleSortClosestTo(refRow, refCol, list).at(-1) || null
}

/**
 * Shuffles and finds the closest coordinate to a reference point.
 * Provides randomized nearest-point selection with tie-breaking by shuffle order.
 *
 * @param {number} refRow - Reference row coordinate
 * @param {number} refCol - Reference column coordinate
 * @param {Array<Array<number>>} list - List of [row, col] coordinate pairs
 * @returns {Array<number>|null} Closest shuffled [row, col] coordinate, or null if list empty
 * @example
 * shuffleClosestTo(5, 5, [[6, 6], [1, 1]]) // [6, 6] (closest, with shuffle)
 */
export function shuffleClosestTo (refRow, refCol, list) {
  return shuffleSortClosestTo(refRow, refCol, list).at(0) || null
}

/**
 * Removes duplicate values from a delimited string.
 * Splits by delimiter, deduplicates using Set, and rejoins.
 *
 * @param {string} str - Delimited string to deduplicate
 * @param {string} delimiter - Delimiter character (e.g., ',', '|')
 * @returns {string} Deduplicated delimited string, order may change
 * @example
 * dedupCSV('a,b,a,c,b', ',') // 'a,b,c' (duplicates removed)
 * dedupCSV('x|x|y', '|') // 'x|y'
 */
export function dedupCSV (str, delimiter) {
  const uniqueSet = [...new Set(str.split(delimiter))].join(delimiter)
  return uniqueSet
}

/**
 * Creates a key string from row and column coordinates.
 * Format: "row,col" suitable for use as object keys or map lookup.
 *
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @returns {string} Key string in format "row,col"
 * @example
 * makeKey(5, 10) // '5,10'
 */
export function makeKey (row, col) {
  return `${row},${col}`
}

/**
 * Converts a coordinate tuple into a key string.
 * Accepts variadic arguments or array unpacking, extracts first two elements as row and col.
 *
 * @param {...(number|bigint)} coord - Coordinate components (row, col, ...rest)
 * @returns {string} Key string in format "row,col"
 * @example
 * coordToKey(5, 10) // '5,10'
 * coordToKey(5n, 10n) // '5,10' (bigints coerced to string)
 */
export function coordToKey (...coord) {
  const [row, col] = coord
  return `${row},${col}`
}

/**
 * Parses a key string into row and column coordinates.
 * Inverse of makeKey(). Splits on comma and parses as base-10 integers.
 *
 * @param {string} key - Key string in format "row,col"
 * @returns {[number, number]} [row, col] coordinates parsed from key
 * @example
 * parsePair('5,10') // [5, 10]
 * parsePair('-3,42') // [-3, 42]
 */
export function parsePair (key) {
  const pair = key.split(',')
  const row = Number.parseInt(pair[0], 10)
  const col = Number.parseInt(pair[1], 10)
  return [row, col]
}

/**
 * Creates a key string with ID from row, column, and ID.
 * Format: "row,col:id" combining coordinate and identifier for composite lookup.
 *
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @param {number} id - Numeric identifier
 * @returns {string} Key-ID string in format "row,col:id"
 * @example
 * makeKeyId(5, 10, 42) // '5,10:42'
 */
export function makeKeyId (row, col, id) {
  return `${row},${col}:${id}`
}

/**
 * Combines a key and ID into a key-ID string.
 * Appends ID to existing key string using colon separator.
 *
 * @param {string} key - Key string (typically "row,col" format)
 * @param {number} id - Numeric identifier
 * @returns {string} Key-ID string in format "key:id"
 * @example
 * makeKeyAndId('5,10', 42) // '5,10:42'
 */
export function makeKeyAndId (key, id) {
  return `${key}:${id}`
}

/**
 * Parses a key-ID string into row, column, and ID.
 * Inverse of makeKeyId(). Validates format before parsing and returns null on invalid input.
 * Requires format "row,col:id" with finite numeric values.
 *
 * @param {string} keyId - Key-ID string in format "row,col:id"
 * @returns {[number, number, number]|null} [row, col, id] if valid format, null otherwise
 * @example
 * parseTriple('5,10:42') // [5, 10, 42]
 * parseTriple('invalid') // null
 * parseTriple('5,10') // null (missing ID part)
 * parseTriple('') // null (empty string)
 */
export function parseTriple (keyId) {
  if (!keyId) return null

  const triple = keyId.split(':')
  if (triple.length < 2 || !triple[0]) return null

  const pair = triple[0].split(',')
  if (pair.length < 2) return null

  const row = Number.parseInt(pair[0], 10)
  const col = Number.parseInt(pair[1], 10)
  const id = Number.parseInt(triple[1], 10)

  if (!Number.isFinite(row) || !Number.isFinite(col) || !Number.isFinite(id)) {
    return null
  }

  return [row, col, id]
}

/**
 * Extracts coordinates from a cell element's dataset attributes.
 * Reads data-r and data-c attributes, defaulting to '0' if not present.
 *
 * @param {HTMLElement} cell - Cell element with data-r and data-c attributes
 * @returns {Array<number>} [row, col] coordinates parsed from dataset, defaults to [0, 0]
 * @example
 * // <div data-r="5" data-c="10"></div>
 * coordsFromCell(cell) // [5, 10]
 * // <div></div>
 * coordsFromCell(cell) // [0, 0] (defaults)
 */
export function coordsFromCell (cell) {
  const row = Number.parseInt(cell.dataset.r ?? '0', 10)
  const col = Number.parseInt(cell.dataset.c ?? '0', 10)
  return [row, col]
}

/**
 * Retrieves a list of numbers from a cell's data-numbers JSON attribute.
 * Parses JSON string and converts each string element to integer.
 *
 * @param {HTMLElement} cell - Cell element with optional data-numbers attribute
 * @returns {number[]|null} Array of parsed integers from JSON, or null if attribute missing/empty
 * @example
 * // <div data-numbers='["5", "10", "42"]'></div>
 * listFromCell(cell) // [5, 10, 42]
 * // <div></div>
 * listFromCell(cell) // null
 */
export function listFromCell (cell) {
  const retrievedJson = cell.dataset.numbers
  if (!retrievedJson) return null

  const stringArray = /** @type {string[]} */ (JSON.parse(retrievedJson) || [])
  return stringArray.map(numStr => Number.parseInt(numStr, 10))
}

/**
 * Retrieves a list of keys from a cell's dataset attribute.
 * Splits pipe-delimited string to extract multiple string values.
 *
 * @param {HTMLElement} cell - Cell element
 * @param {string} key - Dataset attribute name (without 'data-' prefix)
 * @returns {Array<string>|null} Array of pipe-delimited strings, or null if attribute missing
 * @example
 * // <div data-roles="admin|user|guest"></div>
 * keyListFromCell(cell, 'roles') // ['admin', 'user', 'guest']
 * // <div></div>
 * keyListFromCell(cell, 'roles') // null
 */
export function keyListFromCell (cell, key) {
  const retrieved = cell.dataset[key]
  if (!retrieved) return null
  return retrieved.split('|') || []
}

/**
 * Adds a key to a cell's dataset attribute, deduplicating pipe-delimited values.
 * If attribute exists, appends new value; otherwise creates new attribute.
 * Calls dedupCSV to remove any duplicate values.
 *
 * @param {HTMLElement} cell - Cell element to modify
 * @param {string} key - Dataset attribute name (without 'data-' prefix)
 * @param {string} addon - Value to add
 * @returns {void}
 * @example
 * // <div data-tags="a|b"></div>
 * addKeyToCell(cell, 'tags', 'c'); // data-tags="a|b|c"
 * addKeyToCell(cell, 'tags', 'b'); // data-tags="a|b|c" (deduped)
 */
export function addKeyToCell (cell, key, addon) {
  const retrieved = cell.dataset[key]
  let result = ''
  if (retrieved) {
    result = retrieved + '|' + addon
  } else {
    result = addon
  }
  cell.dataset[key] = dedupCSV(result, '|')
}

/**
 * Adds multiple keys to a cell's dataset attribute, deduplicating pipe-delimited values.
 * If attribute exists, appends all new values; otherwise creates new attribute.
 * Calls dedupCSV to remove any duplicate values from the combined result.
 *
 * @param {HTMLElement} cell - Cell element to modify
 * @param {string} key - Dataset attribute name (without 'data-' prefix)
 * @param {Array<string>} addons - Array of values to add
 * @returns {void}
 * @example
 * // <div data-tags="a"></div>
 * addKeysToCell(cell, 'tags', ['b', 'c']); // data-tags="a|b|c"
 * addKeysToCell(cell, 'tags', ['a', 'd']); // data-tags="a|b|c|d" (deduped)
 */
export function addKeysToCell (cell, key, addons) {
  const retrieved = cell.dataset[key]
  let result = ''
  if (retrieved) {
    result = retrieved + '|' + addons.join('|')
  } else {
    result = addons.join('|')
  }
  cell.dataset[key] = dedupCSV(result, '|')
}

/**
 * Sets coordinate data on a cell element's dataset attributes.
 * Writes row to data-r and column to data-c as strings.
 *
 * @param {HTMLElement} cell - Cell element to modify
 * @param {number} row - Row coordinate value
 * @param {number} col - Column coordinate value
 * @returns {void}
 * @example
 * const cell = document.createElement('div');
 * setCellCoords(cell, 5, 10); // cell.dataset.r = '5', cell.dataset.c = '10'
 */
export function setCellCoords (cell, row, col) {
  cell.dataset.r = String(row)
  cell.dataset.c = String(col)
}

/**
 * Sets a list of numbers on a cell's data-numbers JSON attribute.
 * Serializes array to JSON string for storage in dataset.
 *
 * @param {HTMLElement} cell - Cell element to modify
 * @param {Array<number>} list - Array of numbers to store
 * @returns {void}
 * @example
 * const cell = document.createElement('div');
 * setCellList(cell, [5, 10, 42]); // cell.dataset.numbers = '[5,10,42]'
 */
export function setCellList (cell, list) {
  cell.dataset.numbers = JSON.stringify(list)
}

/**
 * Returns the first element of an array, or null if array is empty or falsy.
 *
 * @template T
 * @param {T[]} arr - The array to extract from
 * @returns {T|null} First element if array non-empty, null otherwise
 * @example
 * first([1, 2, 3]) // 1
 * first([]) // null
 * first(null) // null
 */
export function first (arr) {
  if (!arr || arr.length === 0) return null
  return arr[0]
}

/**
 * Finds the closest coordinate key to a reference point.
 * Uses parsePair as the coordinate extraction function for key format "row,col".
 *
 * @param {Array<string>} coordsList - List of coordinate keys in "row,col" format
 * @param {number} refRow - Reference row coordinate
 * @param {number} refCol - Reference column coordinate
 * @returns {string|null} Closest coordinate key, or null if list empty
 * @example
 * findClosestCoordKey(['0,0', '5,5', '10,10'], 6, 6) // '5,5'
 */
export function findClosestCoordKey (coordsList, refRow, refCol) {
  return findClosestCoord(coordsList, refRow, refCol, parsePair)
}

/**
 * Finds the closest coordinate to a reference point using Euclidean distance.
 * Supports generic coordinate types via optional getter function for flexible input types.
 * Uses Math.sqrt and Math.pow for accurate distance calculation (not optimized with hypot).
 *
 * @template T
 * @param {T[]} coordsList - List of coordinates (raw or opaque)
 * @param {number} refRow - Reference row coordinate
 * @param {number} refCol - Reference column coordinate
 * @param {function(T):[number, number]} [getter] - Function to extract [row, col] from coordinate.
 *   If omitted, assumes coordinate is directly [number, number].
 * @returns {T|null} Closest coordinate from list, or null if list empty
 * @example
 * findClosestCoord([[0, 0], [5, 5], [10, 10]], 6, 6) // [5, 5]
 * findClosestCoord(['0,0', '5,5'], 6, 6, parsePair) // '5,5' (with getter)
 */
export function findClosestCoord (coordsList, refRow, refCol, getter) {
  let closestCoord = null
  let minDistance = Infinity
  for (const coord of coordsList) {
    const point = getter
      ? getter(coord)
      : /** @type {[number, number]} */ (coord)
    const row = point[0]
    const col = point[1]
    const distance = Math.sqrt(
      Math.pow(row - refRow, 2) + Math.pow(col - refCol, 2)
    )

    if (distance < minDistance) {
      minDistance = distance
      closestCoord = coord
    }
  }

  return closestCoord
}

/**
 * Defines a lazy (computed-once) property on an object.
 * On first access, invokes fn to compute the value, then replaces the getter with a data property.
 * Subsequent accesses return the cached value without recomputation.
 *
 * @param {Object} obj - The object to define property on
 * @param {string} prop - Property name to create
 * @param {Function} fn - Function to compute the value (called with `this` context)
 * @returns {void}
 * @example
 * const obj = {};
 * lazy(obj, 'computed', function() {
 *   console.log('computing...');
 *   return 42;
 * });
 * console.log(obj.computed); // logs 'computing...', returns 42
 * console.log(obj.computed); // returns 42 (cached, no log)
 */
export function lazy (obj, prop, fn) {
  Object.defineProperty(obj, prop, {
    get () {
      const value = fn.call(this)
      Object.defineProperty(this, prop, { value })
      return value
    },
    configurable: true
  })
}

/**
 * Normalizes numeric coordinate values by converting bigints to numbers.
 * Private helper for handling mixed numeric types in coordinate tuples.
 *
 * @param {number|bigint} value - Numeric coordinate value
 * @returns {number} Value coerced to number (bigints converted, numbers returned as-is)
 * @private
 */
function _coerceCoordinate (value) {
  if (typeof value === 'bigint') {
    return Number(value)
  }
  return value
}

/**
 * Computes min/max bounds over a list of 2D or 3D coordinates.
 * Handles mixed number/bigint types via coercion. Returns zero bounds for empty input.
 * If coordinates include z-values (3rd element), computes maximum depth and sets hasColor=true.
 *
 * @param {Array<Coordinate>} arr - Array of [row, col] or [row, col, z] coordinate tuples
 * @returns {MinMaxBounds} Bounding box with minX/maxX (columns), minY/maxY (rows), depth, and hasColor flag
 * @example
 * minMaxXY([[0, 0], [5, 10], [3, 7]]) // {minX: 0, maxX: 10, minY: 0, maxY: 5, depth: 2, hasColor: false}
 * minMaxXY([[0, 0, 1], [5, 10, 3]]) // {minX: 0, maxX: 10, minY: 0, maxY: 5, depth: 4, hasColor: true}
 * minMaxXY([]) // {minX: 0, maxX: 0, minY: 0, maxY: 0, depth: 2, hasColor: false}
 */
export function minMaxXY (arr) {
  if (!arr || arr.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, depth: 2, hasColor: false }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let depth = -Infinity

  for (const element of arr) {
    const x = _coerceCoordinate(element[0])
    const y = _coerceCoordinate(element[1])
    const z = element.length > 2 ? element[2] : undefined
    const zValue = z == null ? undefined : _coerceCoordinate(z)

    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)

    // Only update depth for truthy z values larger than current depth
    if (zValue && zValue > depth) {
      depth = zValue
    }
  }

  const hasColor = depth !== -Infinity
  return {
    minX,
    maxX,
    minY,
    maxY,
    depth: hasColor ? depth + 1 : 2,
    hasColor
  }
}

/**
 * Clones an element multiple times with numeric suffixes on the ID.
 * Inserts all clones immediately after the original node.
 * Does nothing if node has no parent element.
 *
 * @param {HTMLElement} node - Element to clone (must have parentElement)
 * @param {number} count - Number of clones to create
 * @returns {void}
 * @example
 * // <div id="template">Content</div>
 * cloneWithSuffix(templateEl, 3);
 * // Results in: <div id="template">Content</div>
 * //             <div id="template-1">Content</div>
 * //             <div id="template-2">Content</div>
 * //             <div id="template-3">Content</div>
 */
export function cloneWithSuffix (node, count) {
  const parent = node.parentElement

  if (!parent) {
    return
  }

  for (let i = 1; i <= count; i++) {
    const clone = /** @type {HTMLElement} */ (node.cloneNode(true))

    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    parent.insertBefore(clone, node.nextSibling)
  }
}

/**
 * Clones an element deeply multiple times with numeric suffixes on all IDs (including children).
 * Appends suffix to the root element's ID and all descendant IDs.
 * Inserts all clones immediately after the original node.
 * Does nothing if node has no parent element or clone is not an HTMLElement.
 *
 * @param {HTMLElement} node - Element to clone (must have parentElement)
 * @param {number} count - Number of clones to create
 * @returns {void}
 * @example
 * // <div id="wrapper"><span id="child">Content</span></div>
 * cloneWithSuffixDeep(wrapperEl, 2);
 * // Results in: <div id="wrapper"><span id="child">Content</span></div>
 * //             <div id="wrapper-1"><span id="child-1">Content</span></div>
 * //             <div id="wrapper-2"><span id="child-2">Content</span></div>
 */
export function cloneWithSuffixDeep (node, count) {
  const parent = node.parentElement

  if (!parent) {
    return
  }

  for (let i = 1; i <= count; i++) {
    const cloneNode = node.cloneNode(true)
    if (!(cloneNode instanceof HTMLElement)) {
      continue
    }
    const clone = cloneNode

    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    clone.querySelectorAll('[id]').forEach(el => {
      if (el instanceof HTMLElement) {
        el.id = `${el.id}-${i}`
      }
    })

    parent.insertBefore(clone, node.nextSibling)
  }
}

/**
 * Clones an element with lifecycle management: removes old clones before creating new ones.
 * Tracks clones via CSS class based on original node's ID (format: "nodeid-clone").
 * Appends numeric suffixes to IDs of root and descendant elements.
 * Does nothing if node has no parent element or clone is not an HTMLElement.
 *
 * @param {HTMLElement} node - Element to clone (must have id and parentElement)
 * @param {number} count - Number of clones to create
 * @returns {void}
 * @example
 * // <div id="template"><span id="item">Content</span></div>
 * cloneWithLifecycle(templateEl, 2);
 * // First call: Creates template-1, template-2 with class "template-clone"
 * // Second call: Removes template-1, template-2, then creates new template-1, template-2
 */
export function cloneWithLifecycle (node, count) {
  const parent = node.parentElement
  if (!parent) {
    return
  }
  const cloneClass = `${node.id}-clone`

  // Remove existing clones
  parent.querySelectorAll(`.${cloneClass}`).forEach(el => el.remove())

  // Create new clones
  let last = node

  for (let i = 1; i <= count; i++) {
    const cloneNode = node.cloneNode(true)
    if (!(cloneNode instanceof HTMLElement)) {
      continue
    }
    const clone = cloneNode

    clone.classList.add(cloneClass)

    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    clone.querySelectorAll('[id]').forEach(el => {
      if (el instanceof HTMLElement) {
        el.id = `${el.id}-${i}`
      }
    })

    parent.insertBefore(clone, last.nextSibling)
    last = clone
  }
}
