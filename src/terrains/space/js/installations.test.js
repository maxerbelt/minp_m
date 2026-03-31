/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */

import { shelter, mine, commandCenter } from './installations'
import { Installation, CoreInstallation } from './spaceShapes'
import { jest } from '@jest/globals'

// Jest test suite
describe('installations exports', () => {
  test('shelter is an Installation with correct description and letter', () => {
    expect(shelter).toBeInstanceOf(Installation)
    expect(shelter.description()).toBe('Shelter')
    expect(shelter.letter).toBe('S')
    expect(shelter.type()).toBe('G')
  })

  test('mine is Installation with expected cell count', () => {
    expect(mine).toBeInstanceOf(Installation)
    expect(Array.isArray(mine.cells)).toBe(true)
    expect(mine.cells.length).toBeGreaterThanOrEqual(4)
    expect(mine.description()).toBe('Mine')
  })

  test('commandCenter is CoreInstallation with hardened and notes', () => {
    expect(commandCenter).toBeInstanceOf(CoreInstallation)
    expect(commandCenter.description()).toBe('Command Center')
    expect(Array.isArray(commandCenter.hardened)).toBe(true)
    expect(commandCenter.hardened).toContain('+')
    expect(Array.isArray(commandCenter.notes)).toBe(true)
    expect(commandCenter.notes.join(' ')).toMatch(/Command Center/)
  })
})
