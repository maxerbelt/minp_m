/**
 * Safely stringifies a value to JSON while handling circular references,
 * functions, symbols, BigInt, and deep object graphs.
 *
 * @template T
 * @param {T} obj - Value to stringify.
 * @param {{space?: number, depth?: number}} [options={}] - Formatting options, including `space` and `depth`.
 * @returns {string} JSON string representation.
 * @throws {TypeError} When options are invalid.
 */
export function safeStringify (obj, { space = 2, depth = Infinity } = {}) {
  if (!Number.isFinite(space) || space < 0) {
    throw new TypeError('space must be a non-negative finite number')
  }

  if (depth < 0 || (depth !== Infinity && !Number.isFinite(depth))) {
    throw new TypeError(
      'depth must be a non-negative finite number or Infinity'
    )
  }

  const seen = new WeakSet()

  /**
   * @param {unknown} value
   * @param {number} currentDepth
   * @returns {unknown}
   */
  function helper (value, currentDepth) {
    if (typeof value === 'bigint') {
      return `${value.toString()}n`
    }

    if (typeof value === 'function') {
      return `[Function ${value.name || 'anonymous'}]`
    }

    if (typeof value === 'symbol') {
      return value.toString()
    }

    if (value === null || typeof value !== 'object') {
      return value
    }

    if (seen.has(value)) {
      return '[Circular]'
    }

    if (currentDepth >= depth) {
      return '[Truncated]'
    }

    seen.add(value)

    if (Array.isArray(value)) {
      return value.map(item => helper(item, currentDepth + 1))
    }

    const typedValue = /** @type {Record<string, unknown>} */ (value)
    const result = /** @type {Record<string, unknown>} */ ({})
    for (const key of Object.keys(value)) {
      /** @type {Record<string, unknown>} */ ;(result)[key] = helper(
        typedValue[key],
        currentDepth + 1
      )
    }

    return result
  }

  return JSON.stringify(helper(obj, 0), null, space)
}
