import { describe, jest, beforeEach, it, expect } from '@jest/globals'


import { Invariant } from './Invariant.js'

describe('Invariant', () => {
  it('r function returns same index', () => {
    expect(Invariant.r(0)).toBe(0)
    expect(Invariant.r(5)).toBe(5)
  })
})
