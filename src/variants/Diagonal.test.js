/* eslint-env jest */
import { describe, jest, beforeEach, it, expect } from '@jest/globals'

/* global describe, jest, beforeEach, it, expect */

import { Diagonal } from './Diagonal.js'

describe('Diagonal', () => {
  it('r function uses Blinker.r', () => {
    expect(Diagonal.r).toBeDefined()
  })

  it('f function uses Blinker.r', () => {
    expect(Diagonal.f).toBeDefined()
  })

  it('rf function uses Blinker.r', () => {
    expect(Diagonal.rf).toBeDefined()
  })
})
