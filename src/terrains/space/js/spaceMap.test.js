import { spaceMap } from './spaceMap.js'
import { spaceWeaponsCatalogue } from './spaceWeapons.js'

describe('spaceMap', () => {
  it('includes space terrain limited weapons', () => {
    const map = spaceMap('Test Space', 10, 1, 0, 'test-space')
    const weaponTags = map.weapons.map(weapon => weapon.tag)

    expect(weaponTags).toEqual(
      expect.arrayContaining([
        ...spaceWeaponsCatalogue.weapons.map(weapon => weapon.tag)
      ])
    )
  })
})
