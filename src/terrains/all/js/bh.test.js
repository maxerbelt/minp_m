import { bh } from './bh.js'
import { jest } from '@jest/globals'

describe('bh map proxy', () => {
  let originalCurrent

  beforeEach(() => {
    originalCurrent = bh.terrainMaps.current
    bh.terrainMaps.current = {
      setToMap: jest.fn(),
      current: { rows: 1, cols: 1 }
    }
  })

  afterEach(() => {
    bh.terrainMaps.current = originalCurrent
  })

  test('setting bh.map forwards the map object to terrainMaps.current.setToMap', () => {
    const map = { rows: 18, cols: 7 }
    bh.map = map
    expect(bh.terrainMaps.current.setToMap).toHaveBeenCalledWith(map)
  })
})
