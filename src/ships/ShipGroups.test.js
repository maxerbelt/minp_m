/* eslint-env jest */

/* global describe,  test, expect, beforeEach, jest */
import { ShipGroups, ShipCatalogue } from './ShipGroups'
import { jest } from '@jest/globals'

// Jest test suite
describe('ShipGroups', () => {
  test('constructs and stores provided data', () => {
    const sunk = { carrier: 'sunkCarrier' }
    const unitDesc = { carrier: 'large ship' }
    const unitInfo = { carrier: { size: 5 } }

    const groups = new ShipGroups(sunk, unitDesc, unitInfo)

    expect(groups.shipSunkDescriptions).toBe(sunk)
    expect(groups.unitDescriptions).toBe(unitDesc)
    expect(groups.unitInfo).toBe(unitInfo)
  })
})

describe('ShipCatalogue', () => {
  const baseShapes = [
    { letter: 'A', name: 'Alpha' },
    { letter: 'B', name: 'Beta' }
  ]

  const shipSunkDescriptions = { small: 'was destroyed', large: 'was sunk' }
  const unitDescriptions = { A: 'alpha-desc', B: 'beta-desc' }
  const unitInfo = { A: { size: 1 }, B: { size: 2 } }
  const shipGroups = new ShipGroups(
    shipSunkDescriptions,
    unitDescriptions,
    unitInfo
  )
  const letterColors = { A: '#fff', B: '#000' }
  const descriptions = { A: 'Ship A', B: 'Ship B' }
  const types = { A: 'small', B: 'large' }
  const colors = { small: 'blue', large: 'red' }

  test('initializes shapesByLetter mapping', () => {
    const cat = new ShipCatalogue(
      baseShapes,
      shipGroups,
      letterColors,
      descriptions,
      types,
      colors
    )

    expect(cat.baseShapes).toBe(baseShapes)
    expect(cat.shapesByLetter.A).toBe(baseShapes[0])
    expect(cat.shapesByLetter.B).toBe(baseShapes[1])
    expect(cat.letterColors).toBe(letterColors)
    expect(cat.descriptions).toBe(descriptions)
  })

  test('addShapes updates baseShapes and shapesByLetter', () => {
    const cat = new ShipCatalogue(
      baseShapes,
      shipGroups,
      letterColors,
      descriptions,
      types,
      colors
    )
    const newShapes = [{ letter: 'C', name: 'Gamma' }]

    cat.addShapes(newShapes)

    expect(cat.baseShapes).toBe(newShapes)
    expect(cat.shapesByLetter.C).toBe(newShapes[0])
  })

  test('sunkDescription returns concatenated description with default and custom middle', () => {
    const cat = new ShipCatalogue(
      baseShapes,
      shipGroups,
      letterColors,
      descriptions,
      types,
      colors
    )

    const defaultDesc = cat.sunkDescription('A')
    expect(defaultDesc).toBe('Ship A was destroyed')

    const custom = cat.sunkDescription('B', ' - ')
    expect(custom).toBe('Ship B - was sunk')
  })
})
