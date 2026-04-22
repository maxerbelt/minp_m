/**
 * Replacer function for JSON.stringify to handle non-serializable types
 * @private
 * @param {string} _key - The key being serialized (unused)
 * @param {any} value - The value to serialize
 * @returns {any} The serializable representation of the value
 */
function _replaceBigInt (_key, value) {
  if (typeof value === 'bigint') {
    return value.toString() + 'n'
  }
  return value
}

/**
 * Format an error object as a formatted JSON string with title
 * Handles special types like BigInt that JSON.stringify doesn't support natively
 * @param {string} title - Header text for the error message
 * @param {any} obj - Error object or data to serialize
 * @returns {string} Formatted error message with double newline prefix
 * @example
 * const msg = formatErrorMessage('Validation Error', { code: 'ERR_001', value: 123n })
 * // Returns: '\n\nValidation Error:\n{\n  "code": "ERR_001",\n  "value": "123n"\n}'
 */
export function formatErrorMessage (title, obj) {
  return `\n\n${title}:\n${JSON.stringify(obj, _replaceBigInt, 2)}`
}

// Backwards compatibility alias
export const errorMsg = formatErrorMessage
