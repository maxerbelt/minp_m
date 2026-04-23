/* eslint-env jest */

/* global describe, it,  expect, jest */
import { spaceFleet } from './spaceFleet.js'
import { Transformer } from '../../../ships/Transformer.js'
import { Hybrid } from '../../../ships/Hybrid.js'
import { SpaceVessel, Shuttle, Installation } from './spaceShapes.js'
import { describe, it, expect, jest } from '@jest/globals'

// Jest it suite
describe('spaceFleet exports', () => {
  it('spaceFleet is an array with expected items', () => {
    expect(Array.isArray(spaceFleet)).toBe(true)
    expect(spaceFleet.length).toBeGreaterThan(20)
  })

  it('spaceFleet contains various vessel types', () => {
    const hasVessels = spaceFleet.some(item => item instanceof SpaceVessel)
    const hasShuttles = spaceFleet.some(item => item instanceof Shuttle)
    const hasInstallations = spaceFleet.some(
      item => item instanceof Installation
    )
    expect(hasVessels).toBe(true)
    expect(hasShuttles).toBe(true)
    expect(hasInstallations).toBe(true)
  })

  it('spaceFleet includes railgun Transformer', () => {
    const railgun = spaceFleet.find(item => item.description?.() === 'Railgun')
    expect(railgun).toBeDefined()
    expect(railgun).toBeInstanceOf(Transformer)
  })

  it('spaceFleet includes habitat and spacePort Hybrids', () => {
    const habitat = spaceFleet.find(item => item.description?.() === 'Habitat')
    const spacePort = spaceFleet.find(
      item => item.description?.() === 'Space Port'
    )
    expect(habitat).toBeDefined()
    expect(spacePort).toBeDefined()
    expect(habitat).toBeInstanceOf(Hybrid)
    expect(spacePort).toBeInstanceOf(Hybrid)
  })

  it('spaceFleet includes observationPost Hybrid with notes', () => {
    const obsPost = spaceFleet.find(
      item => item.description?.() === 'Observation Post'
    )
    expect(obsPost).toBeDefined()
    expect(obsPost).toBeInstanceOf(Hybrid)
    expect(Array.isArray(obsPost.notes)).toBe(true)
  })
})
