// @ts-check

/**
 * @typedef {'null'|'undefined'|'array'|'object'|'map'|'set'|'date'|'regexp'|'error'|'weakmap'|'weakset'|'promise'|'arraybuffer'|'dataview'|'string'|'number'|'nan'|'boolean'|'function'|'bigint'|'symbol'|'uint8array'|'float32array'} TypeString
 * Comprehensive type identification string covering all JavaScript types including primitives, built-ins, and typed arrays.
 *
 * @typedef {[any, any]} Pair
 * A tuple containing exactly two elements for binary zip operations.
 *
 * @typedef {any[]} Tuple
 * A variable-length tuple containing N elements from N input collections in zip operations.
 */

/**
 * Utility class for zipping multiple arrays or iterables into tuples.
 * Provides both strict (minimum-length) and lenient (maximum-length) zipping strategies,
 * with automatic type coercion via toArray() for flexible input handling.
 * Supports pairing, N-ary zipping, and optional size-matching validation.
 *
 * @class Zip
 * @static
 */
export class Zip {
  /**
   * Determines the JavaScript type of a value
   * @static
   * @param {any} value - The value to type-check
   * @returns {TypeString} The type name string ('null', 'undefined', 'array', 'object', 'map', 'set', 'date', 'regexp', 'error', 'string', 'number', 'nan', 'boolean', 'function', 'bigint', 'symbol', or typed array names)
   */
  static getType (value) {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (Array.isArray(value)) return 'array'

    const type = typeof value

    // Primitives
    if (type !== 'object') {
      if (type === 'number' && Number.isNaN(value)) return 'nan'
      return type // 'string', 'number', 'boolean', 'function', 'bigint', 'symbol'
    }

    // Built-ins via toString (cross-realm safe)
    const tag = Object.prototype.toString.call(value).slice(8, -1)

    switch (tag) {
      case 'Array':
        return 'array'
      case 'Object':
        return 'object'
      case 'Map':
        return 'map'
      case 'Set':
        return 'set'
      case 'Date':
        return 'date'
      case 'RegExp':
        return 'regexp'
      case 'Error':
        return 'error'
      case 'WeakMap':
        return 'weakmap'
      case 'WeakSet':
        return 'weakset'
      case 'Promise':
        return 'promise'
      case 'ArrayBuffer':
        return 'arraybuffer'
      case 'DataView':
        return 'dataview'
    }

    // Typed arrays
    if (ArrayBuffer.isView(value)) {
      return tag.toLowerCase() // e.g. 'uint8array', 'float32array'
    }

    return tag.toLowerCase() // fallback for anything else
  }

  /**
   * Converts any value to an array representation
   * - null/undefined → []
   * - array → array (returned as-is)
   * - string → array of characters
   * - Map → array of [key, value] pairs
   * - Set → array of values
   * - plain object → array of [key, value] pairs
   * - iterable → Array.from(iterable)
   * - other → [value] (wrapped in array)
   * @static
   * @param {any} value - The value to convert
   * @returns {any[]} Array representation of the value
   */
  static toArray (value) {
    if (value == null) return [] // null or undefined
    if (Array.isArray(value)) return value

    const type = Zip.getType(value)

    switch (type) {
      case 'string':
        return value.split('') // split string into array of characters
      case 'map':
        return Array.from(value.entries()) // convert Map to array of [key, value] pairs
      case 'set':
        return Array.from(value.values()) // convert Set to array of values
      case 'object':
        return Object.entries(value) // convert plain object to array of [key, value] pairs
      default:
        if (typeof value[Symbol.iterator] === 'function') {
          return Array.from(value) // convert any iterable to array
        }
        return [value] // wrap non-iterable in an array
    }
  }

  /**
   * Core zip implementation supporting both strict (min length) and lenient (max length) modes.
   * Handles type coercion via toArray() and provides optional size validation.
   *
   * @private
   * @param {any[]} arrays - Array of inputs to convert and zip via toArray()
   * @param {boolean} padToLongest - true to pad tuples to max length, false to stop at min length
   * @param {boolean} [match=false] - If true, throws Error if input sizes don't match exactly
   * @returns {Tuple[]} Array of tuples where each tuple is [element0, element1, ...elementN]
   * @throws {Error} When match=true and input collections have different sizes
   */
  static _zip (arrays, padToLongest, match = false) {
    if (arrays.length === 0) return []

    // Convert all inputs to arrays once and cache the results
    const convertedArrays = arrays.map(arr => Zip.toArray(arr))

    const max = Math.max(...convertedArrays.map(arr => arr.length))
    const min = Math.min(...convertedArrays.map(arr => arr.length))
    if (match && max !== min) {
      throw new Error('input collections do not match in sizes')
    }

    // Determine target length based on strategy
    const targetLength = padToLongest ? max : min

    // Build result tuples, padding with undefined as needed in lenient mode
    const result = new Array(targetLength)
    for (let i = 0; i < targetLength; i++) {
      result[i] = convertedArrays.map(arr =>
        i < arr.length ? arr[i] : undefined
      )
    }

    return result
  }

  /**
   * Zips two inputs into pairs, stopping at the shortest length
   * @static
   * @param {any} a - First input (will be converted to array via toArray)
   * @param {any} b - Second input (will be converted to array via toArray)
   * @returns {Pair[]} Array of pairs [a[i], b[i]], length = min(len(a), len(b))
   * @example
   * Zip.strict([1, 2, 3], ['a', 'b']) // [[1, 'a'], [2, 'b']]
   * Zip.strict('abc', [1, 2]) // [['a', 1], ['b', 2]]
   */
  static strict (a, b) {
    return Zip.strictN(a, b)
  }

  /**
   * Zips two inputs into pairs, padding to the longest length with undefined
   * @static
   * @param {any} a - First input (will be converted to array via toArray)
   * @param {any} b - Second input (will be converted to array via toArray)
   * @returns {Pair[]} Array of pairs [a[i], b[i]], length = max(len(a), len(b)), shorter array padded with undefined
   * @example
   * Zip.lenient([1, 2, 3], ['a', 'b']) // [[1, 'a'], [2, 'b'], [3, undefined]]
   * Zip.lenient('a', [1, 2, 3]) // [['a', 1], [undefined, 2], [undefined, 3]]
   */
  static lenient (a, b) {
    return Zip.lenientN(a, b)
  }

  /**
   * Zips multiple inputs into tuples, stopping at the shortest length
   * @static
   * @param {...any} arrays - Inputs to zip (each will be converted to array via toArray)
   * @returns {Tuple[]} Array of tuples where each tuple contains one element from each input, length = min(len(a), len(b), ...)
   * @example
   * Zip.strictN([1, 2, 3], ['a', 'b'], [true, false, true]) // [[1, 'a', true], [2, 'b', false]]
   * Zip.strictN('abc', [1, 2, 3, 4]) // [['a', 1], ['b', 2], ['c', 3]]
   */
  static strictN (...arrays) {
    return Zip._zip(arrays, false)
  }

  /**
   * Zips multiple inputs into tuples, padding to the longest length with undefined
   * @static
   * @param {...any} arrays - Inputs to zip (each will be converted to array via toArray)
   * @returns {Tuple[]} Array of tuples where each tuple contains one element from each input (padded with undefined), length = max(len(a), len(b), ...)
   * @example
   * Zip.lenientN([1, 2], ['a', 'b', 'c'], [true]) // [[1, 'a', true], [2, 'b', undefined], [undefined, 'c', undefined]]
   * Zip.lenientN('a', [1, 2, 3]) // [['a', 1], [undefined, 2], [undefined, 3]]
   */
  static lenientN (...arrays) {
    return Zip._zip(arrays, true)
  }
  /**
   * Zips two inputs into pairs, requiring both inputs to have equal length.
   * Throws an error if the input sizes don't match exactly.
   *
   * @static
   * @param {any} a - First input (will be converted to array via toArray)
   * @param {any} b - Second input (will be converted to array via toArray)
   * @returns {Pair[]} Array of pairs [a[i], b[i]], where len(a) === len(b)
   * @throws {Error} If input collections do not match in sizes
   * @example
   * Zip.match([1, 2, 3], ['a', 'b', 'c']) // [[1, 'a'], [2, 'b'], [3, 'c']]
   * Zip.match([1, 2], ['a', 'b', 'c']) // Error: input collections do not match in sizes
   */
  static match (a, b) {
    return Zip.matchN(a, b)
  }

  /**
   * Zips multiple inputs into tuples, requiring all inputs to have equal length.
   * Throws an error if any input has a different size than the others.
   *
   * @static
   * @param {...any} arrays - Inputs to zip (each will be converted to array via toArray)
   * @returns {Tuple[]} Array of tuples where each tuple contains one element from each input, all inputs same length
   * @throws {Error} If input collections do not match in sizes
   * @example
   * Zip.matchN([1, 2, 3], ['a', 'b', 'c'], [true, false, true]) // [[1, 'a', true], [2, 'b', false], [3, 'c', true]]
   * Zip.matchN([1, 2], ['a', 'b', 'c']) // Error: input collections do not match in sizes
   */
  static matchN (...arrays) {
    return Zip._zip(arrays, false, true)
  }
}
