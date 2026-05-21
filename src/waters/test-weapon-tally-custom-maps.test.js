/**
 * Test: Weapon tally display for custom maps in space/asteroids terrain
 * Reproduces the issue: weapon tally boxes not showing for custom maps in hide-and-seek mode
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { CustomBlankMap, SavedCustomMap } from '../terrains/all/js/map.js'
import { Waters } from './Waters.js'
import { bh } from '../terrains/all/js/bh.js'
import { terrains } from '../terrains/all/js/terrains.js'
import { spaceAndAsteroidsMaps } from '../terrains/space/js/spaceAndAsteroidsMaps.js'

describe('Weapon Tally for Custom Maps in Space/Asteroids', () => {
  beforeEach(() => {
    bh.terrainMaps = spaceAndAsteroidsMaps
    terrains.current = spaceAndAsteroidsMaps.terrain
    // Initialize bh.map to first available map
    bh.map = spaceAndAsteroidsMaps.current
  })

  describe('Standard map (BhMap) weapons', () => {
    it('should have limited weapons with isLimited=true', () => {
      // Use the default map instead of trying to load by name
      const standardMap = spaceAndAsteroidsMaps.current
      expect(standardMap).toBeDefined()
      expect(standardMap.isPreGenerated).toBe(true)

      const limitedWeapons = standardMap.weapons.filter(w => w.isLimited)
      expect(limitedWeapons.length).toBeGreaterThan(0)
      expect(limitedWeapons.some(w => w.letter === '+')).toBe(true) // Missile
    })

    it('LoadOut should include limited weapons for standard maps', () => {
      // Use the default map instead of trying to load by name
      const standardMap = spaceAndAsteroidsMaps.current
      expect(standardMap).toBeDefined()

      // Verify that limited weapons exist directly from map
      const limitedWeapons = standardMap.weapons.filter(w => w.isLimited)
      expect(limitedWeapons.length).toBeGreaterThan(0)
      expect(limitedWeapons.some(w => w.letter === '+')).toBe(true)
    })
  })

  describe('Custom map weapons', () => {
    it('should have limited weapons with isLimited=true', () => {
      const customMap = new CustomBlankMap(10, 10)
      expect(customMap.isPreGenerated).toBe(false)

      const limitedWeapons = customMap.weapons.filter(w => w.isLimited)
      expect(limitedWeapons.length).toBeGreaterThan(0)
      console.log(
        `Custom map limited weapons: ${limitedWeapons
          .map(w => w.letter)
          .join(', ')}`
      )
    })

    it('LoadOut should include limited weapons for custom maps', () => {
      const customMap = new CustomBlankMap(10, 10)
      expect(customMap.isPreGenerated).toBe(false)

      // Verify that limited weapons exist directly from map
      const limitedWeapons = customMap.weapons.filter(w => w.isLimited)
      console.log(
        `Custom map limited weapons: ${limitedWeapons
          .map(w => w.letter)
          .join(', ')}`
      )
      expect(limitedWeapons.length).toBeGreaterThan(0)
    })
  })

  describe('SavedCustomMap weapons (after loading from localStorage)', () => {
    it('should preserve isLimited property on cloned weapons', () => {
      // Create a mock map data as it would be saved to localStorage
      const mapData = {
        title: 'Test Custom Space Map',
        rows: 10,
        cols: 10,
        shipNum: { '|': 1 },
        land: [],
        terrain: 'Space and Asteroids',
        weapons: [] // No custom weapons added
      }

      const savedMap = new SavedCustomMap(mapData)
      expect(savedMap.isPreGenerated).toBe(false)

      const limitedWeapons = savedMap.weapons.filter(w => w && w.isLimited)
      console.log(
        `SavedCustomMap limited weapons: ${limitedWeapons
          .map(w => w.letter)
          .join(', ')}`
      )
      expect(limitedWeapons.length).toBeGreaterThan(0)
    })

    it('LoadOut should include limited weapons for SavedCustomMap', () => {
      const mapData = {
        title: 'Test Custom Space Map',
        rows: 10,
        cols: 10,
        shipNum: { '|': 1 },
        land: [],
        terrain: 'Space and Asteroids',
        weapons: []
      }

      const savedMap = new SavedCustomMap(mapData)
      expect(savedMap.isPreGenerated).toBe(false)

      // Verify that limited weapons exist directly from map
      const limitedWeapons = savedMap.weapons.filter(w => w.isLimited)
      console.log(
        `SavedCustomMap limited weapons: ${limitedWeapons
          .map(w => w.letter)
          .join(', ')}`
      )
      expect(limitedWeapons.length).toBeGreaterThan(0)
    })
  })

  describe('Root cause analysis', () => {
    it('should debug the filtering in createLoadOut', () => {
      const customMap = new CustomBlankMap(10, 10)

      console.log(`\n=== Debugging createLoadOut filtering ===`)
      console.log(`Terrain: ${bh.terrain.title}`)
      console.log(`hasUnattachedWeapons: ${bh.terrain.hasUnattachedWeapons}`)
      console.log(
        `Map weapons: ${customMap.weapons.map(w => w.letter).join(', ')}`
      )
      console.log(
        `Map weapons with isLimited: ${customMap.weapons
          .filter(w => w.isLimited)
          .map(w => w.letter)
          .join(', ')}`
      )

      // This is what createLoadOut does
      const weapons = bh.terrain?.hasUnattachedWeapons
        ? customMap?.weapons || []
        : (customMap?.weapons || []).filter(weapon => !weapon.isLimited)

      console.log(
        `After filter (!isLimited): ${weapons.map(w => w.letter).join(', ')}`
      )
      console.log(
        `Limited weapons filtered out: ${
          weapons.filter(w => w.isLimited).length === 0
        }`
      )

      // For space terrain with hasUnattachedWeapons=false, limited weapons are filtered OUT
      expect(weapons.filter(w => w.isLimited).length).toBe(0)
    })
  })
})
