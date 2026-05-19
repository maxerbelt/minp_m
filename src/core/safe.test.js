import { describe, it, expect } from '@jest/globals'
import { safeStringify } from './safe.js'

describe('safeStringify', () => {
  it('serializes primitives and objects safely', () => {
    const obj = { a: 1, b: 'text', c: true }
    expect(safeStringify(obj)).toBe(JSON.stringify(obj, null, 2))
  })

  it('renders circular references as [Circular]', () => {
    const obj = { a: 1 }
    obj.self = obj
    expect(safeStringify(obj)).toContain('"self": "[Circular]"')
  })

  it('renders functions, symbols and BigInt values safely', () => {
    const value = {
      fn: function testFn () {},
      sym: Symbol('x'),
      big: 123n
    }
    const result = safeStringify(value)
    expect(result).toContain('[Function testFn]')
    expect(result).toContain('Symbol(x)')
    expect(result).toContain('123n')
  })

  it('returns [Truncated] for values exceeding depth', () => {
    const obj = { a: { b: { c: { d: 4 } } } }
    const result = safeStringify(obj, { depth: 2, space: 0 })
    expect(result).toContain('"b":"[Truncated]"')
  })

  it('throws for invalid options', () => {
    expect(() => safeStringify({}, { space: -1 })).toThrow(TypeError)
    expect(() => safeStringify({}, { depth: -1 })).toThrow(TypeError)
  })
})
