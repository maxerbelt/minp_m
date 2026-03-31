/* eslint-env jest */

/* global describe, it,  expect, beforeEach, jest */
import { jest } from '@jest/globals'
import {
  smugglerSS,
  smugglerMS,
  smugglerM,
  smugglerML,
  smugglerL,
  spaceMapList,
  defaultSpaceMap
} from './spaceMaps'
import { BhMap } from '../../all/js/map'
// Jest it suite
describe('spaceMaps exports', () => {
  it('smugglerSS is BhMap with correct title and weapons', () => {
    expect(smugglerSS).toBeInstanceOf(BhMap)
    expect(smugglerSS.title).toBe("Smuggler's Run SS")
    expect(Array.isArray(smugglerSS.weapons)).toBe(true)
    expect(smugglerSS.weapons.length).toBeGreaterThan(0)
  })

  it('smugglerMS, smugglerM, smugglerML, smugglerL are BhMap instances', () => {
    expect(smugglerMS).toBeInstanceOf(BhMap)
    expect(smugglerM).toBeInstanceOf(BhMap)
    expect(smugglerML).toBeInstanceOf(BhMap)
    expect(smugglerL).toBeInstanceOf(BhMap)
  })

  it('all maps have expected titles', () => {
    expect(smugglerMS.title).toBe("Smuggler's Run MS")
    expect(smugglerM.title).toBe("Smuggler's Run M")
    expect(smugglerML.title).toBe("Smuggler's Run ML")
    expect(smugglerL.title).toBe("Smuggler's Run L")
  })

  it('spaceMapList contains all five maps', () => {
    expect(spaceMapList.length).toBe(5)
    expect(spaceMapList).toContain(smugglerSS)
    expect(spaceMapList).toContain(smugglerMS)
    expect(spaceMapList).toContain(smugglerM)
    expect(spaceMapList).toContain(smugglerML)
    expect(spaceMapList).toContain(smugglerL)
  })

  it('defaultSpaceMap is smugglerSS', () => {
    expect(defaultSpaceMap).toBe(smugglerSS)
  })
})
