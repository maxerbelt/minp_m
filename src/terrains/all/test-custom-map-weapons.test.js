/**
 * Test: Verify custom maps have correct weapons in space terrain
 */
import { CustomBlankMap, SavedCustomMap } from './js/map.js'

describe('Custom Maps Weapon Initialization', () => {
  describe('CustomBlankMap in space terrain', () => {
    it('should initialize weapons from terrain', () => {
      // Create a terrain with weapons catalogue
      const mockWeaponCatalogue = {
        getAllWeapons: () => [
          { letter: '+', name: 'Bomb' },
          { letter: '|', name: 'Destroy' },
          { letter: '^', name: 'DestroyOne' }
        ]
      }

      const mockTerrain = {
        key: 'space',
        title: 'Space and Asteroids',
        subterrains: [],
        ships: { baseShapes: [] },
        weapons: mockWeaponCatalogue
      }

      const customMap = new CustomBlankMap(10, 10, mockTerrain)

      // Verify weapons array exists
      expect(customMap.weapons).toBeDefined()
      expect(Array.isArray(customMap.weapons)).toBe(true)

      // Should have more than just standardShot (at minimum: standardShot + 3 space weapons)
      expect(customMap.weapons.length).toBeGreaterThan(1)
    })

    it('should include space-specific weapons', () => {
      const mockWeaponCatalogue = {
        getAllWeapons: () => [
          { letter: '+', name: 'Bomb' },
          { letter: '|', name: 'Destroy' },
          { letter: '^', name: 'DestroyOne' }
        ]
      }

      const mockTerrain = {
        key: 'space',
        title: 'Space and Asteroids',
        subterrains: [],
        ships: { baseShapes: [] },
        weapons: mockWeaponCatalogue
      }

      const customMap = new CustomBlankMap(10, 10, mockTerrain)
      const weaponLetters = customMap.weapons.map(w => w.letter)

      // Space terrain should have specific weapons
      const hasSpaceWeapons = weaponLetters.some(letter =>
        ['+', '|', '^'].includes(letter)
      )

      expect(hasSpaceWeapons).toBe(true)
    })
  })

  describe('CustomBlankMap without weapon catalogue', () => {
    it('should still work with terrain without weapons', () => {
      const mockTerrain = {
        key: 'default',
        title: 'Default',
        subterrains: [],
        ships: { baseShapes: [] }
        // no weapons property
      }

      const customMap = new CustomBlankMap(10, 10, mockTerrain)

      // Should still have at least standardShot
      expect(customMap.weapons).toBeDefined()
      expect(Array.isArray(customMap.weapons)).toBe(true)
      expect(customMap.weapons.length).toBeGreaterThan(0)
    })
  })
})
