/* eslint-env jest */

/* global describe, it, test, expect, beforeEach, jest */
import { seaAndLandShipsCatalogue } from './seaShipsCatalogue.js'
import { seaAndLandGroups } from './seaAndLandGroups.js'

describe('seaAndLandShipsCatalogue', () => {
  test('is a ShipCatalogue-like object with expected maps', () => {
    expect(seaAndLandShipsCatalogue).toHaveProperty('descriptions')
    expect(seaAndLandShipsCatalogue.descriptions.A).toBe('Aircraft Carrier')
    expect(seaAndLandShipsCatalogue).toHaveProperty('letterColors')
    expect(seaAndLandShipsCatalogue.letterColors.A).toBe('#ff6666')
    expect(seaAndLandShipsCatalogue).toHaveProperty('types')
    expect(seaAndLandShipsCatalogue.types.A).toBe('S')
    expect(seaAndLandShipsCatalogue).toHaveProperty('colors')
    expect(seaAndLandShipsCatalogue.colors.M).toBe('#ffd866')
    expect(seaAndLandShipsCatalogue).toHaveProperty('shapesByLetter')
    expect(typeof seaAndLandShipsCatalogue.shapesByLetter).toBe('object')
    // shipGroups values should be sourced from seaAndLandGroups
    expect(seaAndLandShipsCatalogue.shipSunkDescriptions).toBe(
      seaAndLandGroups.shipSunkDescriptions
    )
  })
})
