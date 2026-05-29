/**
 * Core utility functions for string manipulation and type conversions.
 * Provides flexible text formatting helpers that handle multiple input types.
 *
 * @module utils
 */

/**
 * Converts a value to title case (capitalize first letter of each word).
 *
 * Handles multiple input types by converting them to strings before processing.
 * Each word boundary is detected and the first character is uppercased while the rest
 * are lowercased. Null, undefined, and empty string inputs return an empty string without conversion.
 *
 * @param {string|number|boolean|bigint|null|undefined} value - The input value to convert.
 *   - string: processed directly
 *   - number/boolean/bigint: converted to string representation
 *   - null/undefined: returns empty string
 *   - empty string: returns empty string
 * @returns {string} The title-cased string with first letter of each word capitalized.
 *   Returns empty string if input is null, undefined, or an empty string.
 * @example
 * toTitleCase('hello world') // 'Hello World'
 * toTitleCase('the quick brown fox') // 'The Quick Brown Fox'
 * toTitleCase(42) // '42'
 * toTitleCase(true) // 'True'
 * toTitleCase(null) // ''
 * toTitleCase('') // ''
 * toTitleCase('single') // 'Single'
 */
export function toTitleCase (value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const str = typeof value === 'string' ? value : String(value)
  return str.toLowerCase().replaceAll(/\b\w/g, s => s.toUpperCase())
}
