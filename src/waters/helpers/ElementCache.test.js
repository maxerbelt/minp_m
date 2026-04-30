import { ElementCache } from './ElementCache.js'

describe('ElementCache', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="shipTray"></div>
      <div id="planeTray"></div>
      <div id="specialTray"></div>
      <div id="buildingTray"></div>
      <div id="weaponTray"></div>
    `
  })

  test('returns the building tray for type G', () => {
    const cache = new ElementCache()
    cache.trays.building = null

    expect(cache.getTrayByType('G')).toBe(
      document.getElementById('buildingTray')
    )
  })

  test('returns null for unknown type codes', () => {
    const cache = new ElementCache()
    expect(cache.getTrayByType('Z')).toBeNull()
  })
})
