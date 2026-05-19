/**
 * Converts a value to title case.
 *
 * @param {string|number|boolean|bigint|null|undefined} value - The input value to convert.
 * @returns {string} The title-cased string, or empty string if input is null, undefined, or an empty string.
 */
export function toTitleCase (value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const str = typeof value === 'string' ? value : String(value)
  return str.toLowerCase().replaceAll(/\b\w/g, s => s.toUpperCase())
}
