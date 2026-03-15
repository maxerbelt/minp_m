import { Zone } from './Zone.js'

describe('Zone minimal import', () => {
  test('Zone can be constructed', () => {
    const z = new Zone('Test', 'T', true)
    expect(z).toBeInstanceOf(Zone)
    expect(z.title).toBe('Test')
    expect(z.letter).toBe('T')
    expect(z.isMarginal).toBe(true)
  })
})
