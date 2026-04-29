/**
 * Converts a string to title case.
 * @param {string} str - The input string to convert
 * @returns {string} The title-cased string, or empty string if input is falsy
 */
export function toTitleCase (str) {
  if (!str) {
    return ''
  }
  if (typeof str === 'string') {
    return str.toLowerCase().replaceAll(/\b\w/g, s => s.toUpperCase())
  }
  return str
}
