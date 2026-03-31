/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */
import { jest } from '@jest/globals'
import { spaceShipsCatalogue } from './spaceShips'
import { spaceFleet } from './spaceFleet'
// Jest test suite
describe('spaceShipsCatalogue', () => {
  test('baseShapes was set from spaceFleet via addShapes', () => {
    expect(spaceShipsCatalogue.baseShapes).toBe(spaceFleet)
  })

  test('shapesByLetter contains known letters', () => {
    expect(spaceShipsCatalogue.shapesByLetter.A).toBeDefined()
    expect(spaceShipsCatalogue.shapesByLetter.R).toBeDefined()
  })

  test('sunkDescription composes description and sunk text', () => {
    const desc = spaceShipsCatalogue.sunkDescription('A')
    expect(desc).toBe('Attack Craft Destroyed')
    const custom = spaceShipsCatalogue.sunkDescription('Q', ' - ')
    expect(custom).toBe('Space Port - Destroyed')
  })
})
