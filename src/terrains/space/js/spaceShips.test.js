/* eslint-env jest */

/* global describe, it,  expect,  jest */
import { describe, it, expect, jest } from '@jest/globals'
import { spaceShipsCatalogue } from './spaceShips'
import { spaceFleet } from './spaceFleet'
// Jest test suite
describe('spaceShipsCatalogue', () => {
  it('baseShapes was set from spaceFleet via addShapes', () => {
    expect(spaceShipsCatalogue.baseShapes).toBe(spaceFleet)
  })

  it('shapesByLetter contains known letters', () => {
    expect(spaceShipsCatalogue.shapesByLetter.A).toBeDefined()
    expect(spaceShipsCatalogue.shapesByLetter.R).toBeDefined()
  })

  it('sunkDescription composes description and sunk text', () => {
    const desc = spaceShipsCatalogue.sunkDescription('A')
    expect(desc).toBe('Attack Craft Destroyed')
    const custom = spaceShipsCatalogue.sunkDescription('Q', ' - ')
    expect(custom).toBe('Space Port - Destroyed')
  })
})
