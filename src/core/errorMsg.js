/**
 * Error message formatting utilities
 *
 * Provides JSON-based error message formatting with support for non-serializable types
 * like BigInt. Formats objects into readable multi-line JSON with a title header.
 *
 * @module errorMsg
 */

/**
 * Replacer function for JSON.stringify to handle non-serializable types
 *
 * Converts BigInt values to strings with 'n' suffix (BigInt literal notation).
 * Returns all other values unchanged for standard JSON serialization.
 *
 * @private
 * @param {string} _key - The key being serialized (unused, required by replacer signature)
 * @param {any} value - The value to serialize
 * @returns {any} The serializable representation of the value (string for BigInt, original otherwise)
 *
 * @example
 * JSON.stringify({ value: 123n }, _replaceBigInt)
 * // Returns: '{"value":"123n"}'
 */
function _replaceBigInt (_key, value) {
  if (typeof value === 'bigint') {
    return value.toString() + 'n'
  }
  return value
}

/**
 * Format an error object as a formatted JSON string with title
 *
 * Creates a readable error message by formatting an object as indented JSON
 * with a title header. Handles special types like BigInt that JSON.stringify
 * doesn't support natively. Prefixes output with double newlines for visual separation.
 *
 * @param {string} title - Header text for the error message (displayed before JSON)
 * @param {any} obj - Error object, data structure, or any JSON-serializable value
 * @returns {string} Formatted error message with double newline prefix and JSON body
 *
 * @example
 * const msg = formatErrorMessage('Validation Error', { code: 'ERR_001', value: 123n })
 * // Returns: '\n\nValidation Error:\n{\n  "code": "ERR_001",\n  "value": "123n"\n}'
 *
 * @example
 * const msg = formatErrorMessage('Network Error', { status: 500, message: 'Internal Server Error' })
 * console.log(msg)
 * // Outputs:
 * // \n\nNetwork Error:\n{\n  "status": 500,\n  "message": "Internal Server Error"\n}
 */
function formatErrorMessage (title, obj) {
  return `\n\n${title}:\n${JSON.stringify(obj, _replaceBigInt, 2)}`
}

/**
 * Format an error object as a formatted JSON string with title
 *
 * Alias for formatErrorMessage for backwards compatibility.
 * Use formatErrorMessage for new code.
 *
 * @type {typeof formatErrorMessage}
 * @export
 *
 * @example
 * import { errorMsg } from './errorMsg.js'
 * const msg = errorMsg('Error', { code: 123 })
 */
export const errorMsg = formatErrorMessage
