#!/usr/bin/env node

/**
 * Test: Custom map auto-placement in space terrain
 * Reproduces the issue where custom maps fail to auto-place ships in space terrain
 */

// Setup module resolution
const path = require('path')
process.env.NODE_OPTIONS = '--experimental-vm-modules'

const { fileURLToPath } = require('url')
const moduleUrl = `file://${__filename}`

// Import test utilities
import('../../ships/Shape.js')
  .then(async ShapeModule => {
    const { token } = ShapeModule

    // Mock localStorage
    const localStorage = (() => {
      const store = {}
      return {
        getItem: key => store[key] || null,
        setItem: (key, value) => {
          store[key] = value
        },
        removeItem: key => {
          delete store[key]
        },
        clear: () => {
          Object.keys(store).forEach(k => delete store[k])
        }
      }
    })()

    global.localStorage = localStorage

    // Import after mocking
    const { bh } = await import('./bh.js')
    const { CustomBlankMap, SavedCustomMap, EditedCustomMap } = await import(
      './map.js'
    )
    const { spaceAndAsteroidsMaps } = await import(
      '../space/js/spaceAndAsteroidsMaps.js'
    )
    const { seaAndLandMaps } = await import('../sea/js/seaAndLandMaps.js')

    console.log('\n=== Testing Custom Map Auto-Placement ===\n')

    // Test 1: Create a custom map in space terrain
    console.log('Test 1: Create custom map in space terrain')
    bh.terrainMaps = spaceAndAsteroidsMaps
    const spaceCustomMap = new CustomBlankMap(10, 10, bh.terrain)
    spaceCustomMap.title = 'Test Space Map'
    spaceCustomMap.shipNum = { '|': 1, '+': 1, '^': 1 } // Space terrain ship counts

    console.log(`  Created: "${spaceCustomMap.title}"`)
    console.log(`  Terrain: ${spaceCustomMap.terrain.title}`)
    console.log(`  Weapons count: ${spaceCustomMap.weapons.length}`)
    console.log(
      `  Ships available: ${Object.entries(spaceCustomMap.shipNum)
        .map(([letter, count]) => `${letter}:${count}`)
        .join(', ')}`
    )

    // Test 2: Check ships that can be created from this map
    console.log('\nTest 2: Check ship creation from custom map')
    try {
      const newFleetForMap = spaceCustomMap.newFleetForMap
      console.log(`  Fleet created: ${newFleetForMap.length} ships`)
      if (newFleetForMap.length === 0) {
        console.log('  ❌ ERROR: No ships created for placement!')
      }
    } catch (err) {
      console.log(`  ❌ ERROR creating fleet: ${err.message}`)
    }

    // Test 3: Save the custom map to localStorage
    console.log('\nTest 3: Save custom map to localStorage')
    spaceCustomMap.saveToLocalStorage()
    const saved = localStorage.getItem(`${token}.${spaceCustomMap.title}`)
    if (saved) {
      const obj = JSON.parse(saved)
      console.log(`  ✓ Saved to localStorage`)
      console.log(`  Saved terrain: ${obj.terrain}`)
      console.log(`  Saved weapons: ${obj.weapons.length} items`)
    }

    // Test 4: Load the custom map back
    console.log('\nTest 4: Load custom map from localStorage')
    const loadedMap = SavedCustomMap.load(spaceCustomMap.title)
    if (loadedMap) {
      console.log(`  ✓ Loaded from localStorage`)
      console.log(`  Loaded terrain: ${loadedMap.terrain.title}`)
      console.log(`  Loaded weapons: ${loadedMap.weapons.length}`)
      console.log(
        `  Loaded ships available: ${Object.entries(loadedMap.shipNum)
          .map(([letter, count]) => `${letter}:${count}`)
          .join(', ')}`
      )
    } else {
      console.log(`  ❌ ERROR: Could not load map`)
    }

    // Test 5: Attempt auto-placement with the loaded map
    console.log('\nTest 5: Attempt auto-placement with loaded map')
    bh.map = loadedMap
    try {
      // Get ships for placement
      const shipsForPlacement = loadedMap.newFleetForMap
      console.log(`  Ships ready for placement: ${shipsForPlacement.length}`)

      if (shipsForPlacement.length > 0) {
        const firstShip = shipsForPlacement[0]
        console.log(
          `  First ship: Letter=${firstShip.letter}, Size=${firstShip.size}`
        )

        // Test if ship has a shape
        const shape = firstShip.shape()
        if (shape) {
          console.log(`  ✓ Ship has shape with minSize=${shape.minSize}`)
        } else {
          console.log(`  ❌ ERROR: Ship has no shape!`)
        }
      } else {
        console.log(`  ❌ ERROR: No ships available for placement`)
      }
    } catch (err) {
      console.log(`  ❌ ERROR during placement: ${err.message}`)
    }

    // Test 6: Compare with sea/land terrain
    console.log('\nTest 6: Compare with sea/land terrain')
    bh.terrainMaps = seaAndLandMaps
    const seaCustomMap = new CustomBlankMap(10, 10, bh.terrain)
    seaCustomMap.title = 'Test Sea Map'
    seaCustomMap.shipNum = { A: 1, B: 1, C: 1 } // Sea terrain ship counts

    try {
      const seaFleet = seaCustomMap.newFleetForMap
      console.log(`  Sea terrain fleet: ${seaFleet.length} ships`)
      console.log(`  Sea map weapons: ${seaCustomMap.weapons.length}`)
    } catch (err) {
      console.log(`  ERROR: ${err.message}`)
    }

    console.log('\n=== Test Complete ===\n')
    process.exit(0)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
