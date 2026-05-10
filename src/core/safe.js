export function safeStringify (obj, { space = 2, depth = Infinity } = {}) {
  const seen = new WeakSet()

  function helper (value, currentDepth) {
    if (typeof value === 'bigint') {
      return value.toString() + 'n' // preserve BigInt meaning
    }

    if (typeof value === 'function') {
      return `[Function ${value.name || 'anonymous'}]`
    }

    if (typeof value === 'symbol') {
      return value.toString()
    }

    if (typeof value !== 'object' || value === null) {
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
      return value.map(v => helper(v, currentDepth + 1))
    }

    const result = {}
    for (const key of Object.keys(value)) {
      result[key] = helper(value[key], currentDepth + 1)
    }

    return result
  }

  return JSON.stringify(helper(obj, 0), null, space)
}
