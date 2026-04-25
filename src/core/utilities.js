import { Random } from './Random.js'

/**
 * Shuffles the elements of an array in place using Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle
 * @returns {Array} The shuffled array
 */
export function shuffleArray (array) {
  return Random.shuffleArray(array)
}

/**
 * Selects a random element from an array.
 * @param {Array} array - The array to select from
 * @returns {*} Random element from the array
 */
export function randomElement (array) {
  return Random.element(array)
}

/**
 * Shuffles an array and sorts it by distance to a reference point.
 * @param {number} refRow - Reference row
 * @param {number} refCol - Reference column
 * @param {Array<Array<number>>} list - List of coordinates
 * @returns {Array<Array<number>>} Shuffled and sorted list
 */
export function shuffleSortClosestTo (refRow, refCol, list) {
  return sortClosestTo(refRow, refCol, Random.shuffleArray([...list]))
}

/**
 * Sorts a list of coordinates by distance to a reference point.
 * @param {number} refRow - Reference row
 * @param {number} refCol - Reference column
 * @param {Array<Array<number>>} list - List of coordinates
 * @returns {Array<Array<number>>} Sorted list
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
 * @param {number} refRow - Reference row
 * @param {number} refCol - Reference column
 * @param {Array<Array<number>>} list - List of coordinates
 * @returns {Array<number>|null} Closest coordinate or null
 */
export function closestTo (refRow, refCol, list) {
  return sortClosestTo(refRow, refCol, list).at(0) || null
}

/**
 * Finds the furthest coordinate from a reference point.
 * @param {number} refRow - Reference row
 * @param {number} refCol - Reference column
 * @param {Array<Array<number>>} list - List of coordinates
 * @returns {Array<number>|null} Furthest coordinate or null
 */
export function furtherestFrom (refRow, refCol, list) {
  return sortClosestTo(refRow, refCol, list).at(-1) || null
}

/**
 * Shuffles and finds the furthest coordinate from a reference point.
 * @param {number} refRow - Reference row
 * @param {number} refCol - Reference column
 * @param {Array<Array<number>>} list - List of coordinates
 * @returns {Array<number>|null} Furthest shuffled coordinate or null
 */
export function shuffleFurtherestFrom (refRow, refCol, list) {
  return shuffleSortClosestTo(refRow, refCol, list).at(-1) || null
}

/**
 * Shuffles and finds the closest coordinate to a reference point.
 * @param {number} refRow - Reference row
 * @param {number} refCol - Reference column
 * @param {Array<Array<number>>} list - List of coordinates
 * @returns {Array<number>|null} Closest shuffled coordinate or null
 */
export function shuffleClosestTo (refRow, refCol, list) {
  return shuffleSortClosestTo(refRow, refCol, list).at(0) || null
}

/**
 * Removes duplicate values from a CSV string.
 * @param {string} str - CSV string
 * @param {string} delimiter - Delimiter character
 * @returns {string} Deduplicated CSV string
 */
export function dedupCSV (str, delimiter) {
  const uniqueSet = [...new Set(str.split(delimiter))].join(delimiter)
  return uniqueSet
}

/**
 * Creates a key string from row and column coordinates.
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @returns {string} Key string
 */
export function makeKey (row, col) {
  return `${row},${col}`
}

/**
 * Parses a key string into row and column coordinates.
 * @param {string} key - Key string
 * @returns {Array<number>} [row, col]
 */
export function parsePair (key) {
  const pair = key.split(',')
  const row = Number.parseInt(pair[0])
  const col = Number.parseInt(pair[1])
  return [row, col]
}

/**
 * Creates a key string with ID from row, column, and ID.
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 * @param {number} id - ID
 * @returns {string} Key-ID string
 */
export function makeKeyId (row, col, id) {
  return `${row},${col}:${id}`
}

/**
 * Combines a key and ID into a key-ID string.
 * @param {string} key - Key string
 * @param {number} id - ID
 * @returns {string} Key-ID string
 */
export function makeKeyAndId (key, id) {
  return `${key}:${id}`
}

/**
 * Parses a key-ID string into row, column, and ID.
 * @param {string} keyId - Key-ID string
 * @returns {Array<number>|null} [row, col, id] or null
 */
export function parseTriple (keyId) {
  if (!keyId) return null
  const triple = keyId.split(':')
  const pair = triple[0]?.split(',')
  const row = Number.parseInt(pair[0])
  const col = Number.parseInt(pair[1])
  const id = Number.parseInt(triple[1])
  return [row, col, id]
}

/**
 * Extracts coordinates from a cell element's dataset.
 * @param {HTMLElement} cell - Cell element
 * @returns {Array<number>} [row, col]
 */
export function coordsFromCell (cell) {
  const row = Number.parseInt(cell.dataset.r)
  const col = Number.parseInt(cell.dataset.c)
  return [row, col]
}

/**
 * Retrieves a list of numbers from a cell's dataset.
 * @param {HTMLElement} cell - Cell element
 * @returns {Array<number>|null} List of numbers or null
 */
export function listFromCell (cell) {
  const retrievedJson = cell.dataset.numbers
  if (!retrievedJson) return null
  const stringArray = JSON.parse(retrievedJson) || []
  return stringArray.map(numStr => parseInt(numStr, 10))
}

/**
 * Retrieves a list of keys from a cell's dataset.
 * @param {HTMLElement} cell - Cell element
 * @param {string} key - Dataset key
 * @returns {Array<string>|null} List of keys or null
 */
export function keyListFromCell (cell, key) {
  const retrieved = cell.dataset[key]
  if (!retrieved) return null
  return retrieved.split('|') || []
}

/**
 * Retrieves a list of key-IDs from a cell's dataset.
 * @param {HTMLElement} cell - Cell element
 * @param {string} key - Dataset key
 * @returns {Array<string>|null} List of key-IDs or null
 */
export function keyIdsListFromCell (cell, key) {
  const retrieved = cell.dataset[key]
  if (!retrieved) return null
  return retrieved.split('|') || []
}

/**
 * Adds a key to a cell's dataset, deduplicating values.
 * @param {HTMLElement} cell - Cell element
 * @param {string} key - Dataset key
 * @param {string} addon - Value to add
 */
export function addKeyToCell (cell, key, addon) {
  const retrieved = cell.dataset[key]
  let result = ''
  if (!retrieved) {
    result = addon
  } else {
    result = retrieved + '|' + addon
  }
  cell.dataset[key] = dedupCSV(result, '|')
}

/**
 * Adds multiple keys to a cell's dataset, deduplicating values.
 * @param {HTMLElement} cell - Cell element
 * @param {string} key - Dataset key
 * @param {Array<string>} addons - Values to add
 */
export function addKeysToCell (cell, key, addons) {
  const retrieved = cell.dataset[key]
  let result = ''
  if (!retrieved) {
    result = addons.join('|')
  } else {
    result = retrieved + '|' + addons.join('|')
  }
  cell.dataset[key] = dedupCSV(result, '|')
}

/**
 * Sets coordinate data on a cell element.
 * @param {HTMLElement} cell - Cell element
 * @param {number} row - Row coordinate
 * @param {number} col - Column coordinate
 */
export function setCellCoords (cell, row, col) {
  cell.dataset.r = row
  cell.dataset.c = col
}

/**
 * Sets a list of numbers on a cell's dataset.
 * @param {HTMLElement} cell - Cell element
 * @param {Array<number>} list - List of numbers
 */
export function setCellList (cell, list) {
  cell.dataset.numbers = JSON.stringify(list)
}

/**
 * Returns the first element of an array.
 * @param {Array} arr - The array
 * @returns {*} First element or null
 */
export function first (arr) {
  if (!arr || arr.length === 0) return null
  return arr[0]
}

/**
 * Finds the closest coordinate key to a reference point.
 * @param {Array<string>} coordsList - List of coordinate keys
 * @param {number} refRow - Reference row
 * @param {number} refCol - Reference column
 * @returns {string|null} Closest coordinate key or null
 */
export function findClosestCoordKey (coordsList, refRow, refCol) {
  return findClosestCoord(coordsList, refRow, refCol, parsePair)
}

/**
 * Finds the closest coordinate to a reference point.
 * @param {Array} coordsList - List of coordinates
 * @param {number} refRow - Reference row
 * @param {number} refCol - Reference column
 * @param {Function} [getter] - Function to extract coordinates
 * @returns {*} Closest coordinate or null
 */
export function findClosestCoord (coordsList, refRow, refCol, getter) {
  let closestCoord = null
  let minDistance = Infinity
  for (const coord of coordsList) {
    const [row, col] = getter ? getter(coord) : coord
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
 * Defines a lazy property on an object.
 * @param {Object} obj - The object
 * @param {string} prop - Property name
 * @param {Function} fn - Function to compute the value
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
 * Calculates min/max coordinates and depth from an array of points.
 * @param {Array<Array<number>>} arr - Array of [x, y, z?] points
 * @returns {Object} Min/max bounds and depth info
 */
function _coerceCoordinate (value) {
  if (typeof value === 'bigint') {
    return Number(value)
  }
  return value
}

export function minMaxXY (arr) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let depth = -Infinity
  let hasColor = false

  if (!arr || arr.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, depth: 2, hasColor: false }
  }

  for (const element of arr) {
    const x = _coerceCoordinate(element[0])
    const y = _coerceCoordinate(element[1])
    const z = element.at(2)
    const zValue = z == null ? z : _coerceCoordinate(z)

    if (x < minX) minX = x
    if (x > maxX) maxX = x

    if (y < minY) minY = y
    if (y > maxY) maxY = y

    if (zValue && zValue > depth) depth = zValue
  }
  if (depth === -Infinity) {
    depth = 2
  } else {
    hasColor = true
    depth += 1
  }
  return { minX, maxX, minY, maxY, depth, hasColor }
}

/**
 * Clones a node multiple times with numeric suffixes.
 * @param {Node} node - Node to clone
 * @param {number} count - Number of clones
 */
export function cloneWithSuffix (node, count) {
  const parent = node.parentNode

  for (let i = 1; i <= count; i++) {
    const clone = node.cloneNode(true)

    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    parent.insertBefore(clone, node.nextSibling)
  }
}

/**
 * Clones a node deeply multiple times with numeric suffixes on all IDs.
 * @param {Node} node - Node to clone
 * @param {number} count - Number of clones
 */
export function cloneWithSuffixDeep (node, count) {
  const parent = node.parentNode

  for (let i = 1; i <= count; i++) {
    const clone = node.cloneNode(true)

    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    clone.querySelectorAll('[id]').forEach(el => {
      el.id = `${el.id}-${i}`
    })

    parent.insertBefore(clone, node.nextSibling)
  }
}

/**
 * Clones a node with lifecycle management (removes old clones first).
 * @param {Node} node - Node to clone
 * @param {number} count - Number of clones
 */
export function cloneWithLifecycle (node, count) {
  const parent = node.parentNode
  const cloneClass = `${node.id}-clone`

  // Remove existing clones
  parent.querySelectorAll(`.${cloneClass}`).forEach(el => el.remove())

  // Create new clones
  let last = node

  for (let i = 1; i <= count; i++) {
    const clone = node.cloneNode(true)

    clone.classList.add(cloneClass)

    if (clone.id) {
      clone.id = `${node.id}-${i}`
    }

    clone.querySelectorAll('[id]').forEach(el => {
      el.id = `${el.id}-${i}`
    })

    parent.insertBefore(clone, last.nextSibling)
    last = clone
  }
}
