/**
 * Safe JSON stringification with circular reference handling.
 *
 * Provides robust JSON serialization that gracefully handles problematic values
 * like circular references, functions, symbols, BigInt, and deep object graphs.
 * All special values are converted to human-readable strings rather than throwing errors.
 *
 * @module safe
 * @example
 * // Basic usage with default formatting
 * const result = safeStringify({a: 1, b: [2, 3]});
 * // '{\n  "a": 1,\n  "b": [2, 3]\n}'
 *
 * @example
 * // Handle BigInt and circular references
 * const obj = {value: 123n, self: null};
 * obj.self = obj; // circular reference
 * const json = safeStringify(obj);
 * // {
 * //   "value": "123n",
 * //   "self": "[Circular]"
 * // }
 *
 * @example
 * // Limit recursion depth
 * const deep = {a: {b: {c: {d: 'value'}}}};
 * safeStringify(deep, {depth: 2});
 * // {"a":{"b":{"c":"[Truncated]"}}}
 */

/**
 * @typedef {Object} StringifyOptions
 * (See types/common.types.ts#StringifyOptions for canonical TypeScript definition)
 * Configuration options for safe stringification.
 * @property {number} [space=2] - Number of spaces for indentation (0 for compact, >= 0)
 * @property {number} [depth=Infinity] - Maximum recursion depth for objects (non-negative or Infinity)
 */

/**
 * Safely stringify a value to JSON while handling circular references.
 *
 * Converts any JavaScript value to JSON string, gracefully handling:
 * - **Circular references**: Replaced with `[Circular]`
 * - **Functions**: Replaced with `[Function name]` or `[Function anonymous]`
 * - **Symbols**: Converted to their string representation
 * - **BigInt**: Converted to string with 'n' suffix (e.g., `"123n"`)
 * - **Depth limit**: Objects deeper than `depth` become `[Truncated]`
 *
 * A WeakSet tracks visited objects to detect circular references without
 * affecting memory or performance for non-circular data.
 *
 * @template T
 * @param {T} obj - Value to stringify (any type, including circular structures)
 * @param {StringifyOptions} [options={}] - Formatting and depth control options
 * @returns {string} Valid JSON string with special values encoded as strings
 * @throws {TypeError} When space is negative or not finite, or when depth is invalid
 *
 * @example
 * // Handle functions and special values
 * const obj = {
 *   name: 'test',
 *   callback: function myFunc() {},
 *   big: 999999999999999999999n,
 *   sym: Symbol('id'),
 *   list: [1, 2, 3]
 * };
 * safeStringify(obj);
 * // {\n  "name": "test",\n  "callback": "[Function myFunc]", ...
 *
 * @example
 * // Compact output with no indentation
 * safeStringify({a: 1, b: 2}, {space: 0});
 * // '{"a":1,"b":2}'
 *
 * @example
 * // Truncate very deep structures
 * const nested = {level1: {level2: {level3: {level4: {level5: 'value'}}}}};
 * safeStringify(nested, {depth: 2});
 * // '{"level1":{"level2":{"level3":"[Truncated]"}}}'
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

  // WeakSet prevents infinite loops from circular references without affecting GC
  const seen = new WeakSet()

  /**
   * Recursively transform problematic values into serializable forms.
   *
   * Handles special types and circular references by replacing them with
   * descriptive string placeholders. Maintains depth tracking to truncate
   * overly deep structures.
   *
   * @private
   * @param {unknown} value - Value to transform (may be any type)
   * @param {number} currentDepth - Current recursion depth (0-based)
   * @returns {unknown} Transformed value safe for JSON.stringify
   */
  function helper (value, currentDepth) {
    // Handle BigInt: convert to string with 'n' suffix
    if (typeof value === 'bigint') {
      return `${value.toString()}n`
    }

    // Handle functions: convert to descriptive placeholder
    if (typeof value === 'function') {
      return `[Function ${value.name || 'anonymous'}]`
    }

    // Handle symbols: use toString representation
    if (typeof value === 'symbol') {
      return value.toString()
    }

    // Handle primitives and null: return as-is
    if (value === null || typeof value !== 'object') {
      return value
    }

    // Detect circular references: replace with placeholder
    if (seen.has(value)) {
      return '[Circular]'
    }

    // Check depth limit: truncate structures beyond max depth
    if (currentDepth >= depth) {
      return '[Truncated]'
    }

    // Mark this object as visited to detect future circular references
    // Mark this object as visited to detect future circular references
    seen.add(value)

    // Transform arrays: recursively process each element
    if (Array.isArray(value)) {
      return value.map(item => helper(item, currentDepth + 1))
    }

    // Transform objects: recursively process each enumerable property
    const typedValue = /** @type {Record<string, unknown>} */ (value)
    const result = /** @type {Record<string, unknown>} */ ({})
    for (const key of Object.keys(value)) {
      /** @type {Record<string, unknown>} */ result[key] = helper(
        typedValue[key],
        currentDepth + 1
      )
    }

    return result
  }

  // Transform the object and serialize to JSON with specified formatting
  return JSON.stringify(helper(obj, 0), null, space)
}
