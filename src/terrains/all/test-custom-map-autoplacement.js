#!/usr/bin/env node

/* global process */

/**
 * Test: Custom map auto-placement in space terrain
 *
 * Reproduces the issue where custom maps fail to auto-place ships in space terrain.
 * This test script validates that:
 * - Custom maps can be created in space terrain
 * - Ships are correctly instantiated from custom maps
 * - Custom maps can be saved and loaded from localStorage
 * - Auto-placement works with loaded custom maps
 * - Space terrain behaves consistently compared to sea/land terrain
 *
 * @module test-custom-map-autoplacement
 * @requires ../../ships/Shape.js
 * @requires ./bh.js
 * @requires ./map.js
 * @requires ../space/js/spaceAndAsteroidsMaps.js
 * @requires ../sea/js/seaAndLandMaps.js
 */

// Setup module resolution

// Import test utilities
import('../../ships/Shape.js')
  .then(async ShapeModule => {
    const { token } = ShapeModule

    /**
     * Mock localStorage implementation for testing
     * @type {Object}
     * @property {Function} getItem - Retrieve item from store
     * @property {Function} setItem - Save item to store
     * @property {Function} removeItem - Delete item from store
     * @property {Function} clear - Clear all items from store
     */
    const localStorage = (() => {
      const store = {}
      return {
        /**
         * Get value from mock storage
         * @param {string} key - Storage key
         * @returns {string|null} Stored value or null if not found
         */
        getItem: key => store[key] || null,
        /**
         * Set value in mock storage
         * @param {string} key - Storage key
         * @param {string} value - Value to store
         * @returns {void}
         */
        setItem: (key, value) => {
          store[key] = value
        },
        /**
         * Remove value from mock storage
         * @param {string} key - Storage key
         * @returns {void}
         */
        removeItem: key => {
          delete store[key]
        },
        /**
         * Clear all items from mock storage
         * @returns {void}
         */
        clear: () => {
          Object.keys(store).forEach(k => delete store[k])
        }
      }
    })()

    globalThis.localStorage = localStorage

    // Import after mocking
    const { bh } = await import('./bh.js')
    const { CustomBlankMap, SavedCustomMap } = await import('./map.js')
    const { spaceAndAsteroidsMaps } = await import(
      '../space/js/spaceAndAsteroidsMaps.js'
    )
    const { seaAndLandMaps } = await import('../sea/js/seaAndLandMaps.js')

    /**
     * Log section header to console
     * @param {string} title - Section title
     * @returns {void}
     */
    const logSection = title => {
      console.log(`\n=== ${title} ===\n`)
    }

    /**
     * Log test result with status
     * @param {string} message - Result message
     * @param {boolean} [success=true] - Whether test passed
     * @returns {void}
     */
    const logResult = (message, success = true) => {
      const prefix = success ? '✓' : '❌'
      console.log(`  ${prefix} ${message}`)
    }

    logSection('Testing Custom Map Auto-Placement')

    // Test 1: Create a custom map in space terrain
    {
      console.log('Test 1: Create custom map in space terrain')
      bh.terrainMaps = spaceAndAsteroidsMaps
      /**
       * @type {CustomBlankMap}
       */
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
        /**
         * @type {Array<Object>}
         */
        const newFleetForMap = spaceCustomMap.newFleetForMap
        console.log(`  Fleet created: ${newFleetForMap.length} ships`)
        if (newFleetForMap.length === 0) {
          logResult('No ships created for placement', false)
        } else {
          logResult(`${newFleetForMap.length} ships ready`, true)
        }
      } catch (err) {
        logResult(
          `Error creating fleet: ${
            err instanceof Error ? err.message : String(err)
          }`,
          false
        )
      }

      // Test 3: Save the custom map to localStorage
      console.log('\nTest 3: Save custom map to localStorage')
      spaceCustomMap.saveToLocalStorage()
      /**
       * @type {string|null}
       */
      const saved = localStorage.getItem(`${token}.${spaceCustomMap.title}`)
      if (saved) {
        /**
         * @type {Object}
         */
        const obj = JSON.parse(saved)
        logResult('Saved to localStorage', true)
        console.log(`  Saved terrain: ${obj.terrain}`)
        console.log(`  Saved weapons: ${obj.weapons.length} items`)
      } else {
        logResult('Failed to save to localStorage', false)
      }

      // Test 4: Load the custom map back
      console.log('\nTest 4: Load custom map from localStorage')
      /**
       * @type {CustomBlankMap|null}
       */
      const loadedMap = SavedCustomMap.load(spaceCustomMap.title)
      if (loadedMap) {
        logResult('Loaded from localStorage', true)
        console.log(`  Loaded terrain: ${loadedMap.terrain.title}`)
        console.log(`  Loaded weapons: ${loadedMap.weapons.length}`)
        console.log(
          `  Loaded ships available: ${Object.entries(loadedMap.shipNum)
            .map(([letter, count]) => `${letter}:${count}`)
            .join(', ')}`
        )

        // Test 5: Attempt auto-placement with the loaded map
        console.log('\nTest 5: Attempt auto-placement with loaded map')
        bh.map = loadedMap
        try {
          /**
           * @type {Array<Object>}
           */
          const shipsForPlacement = loadedMap.newFleetForMap
          console.log(
            `  Ships ready for placement: ${shipsForPlacement.length}`
          )

          if (shipsForPlacement.length > 0) {
            /**
             * @type {Object}
             */
            const firstShip = shipsForPlacement[0]
            console.log(
              `  First ship: Letter=${firstShip.letter}, Size=${firstShip.size}`
            )

            /**
             * @type {Object|null}
             */
            const shape = firstShip.shape()
            if (shape) {
              logResult(`Ship has shape with minSize=${shape.minSize}`, true)
            } else {
              logResult('Ship has no shape', false)
            }
          } else {
            logResult('No ships available for placement', false)
          }
        } catch (err) {
          logResult(
            `Error during placement: ${
              err instanceof Error ? err.message : String(err)
            }`,
            false
          )
        }
      } else {
        logResult('Could not load map', false)
      }
    }

    // Test 6: Compare with sea/land terrain
    console.log('\nTest 6: Compare with sea/land terrain')
    bh.terrainMaps = seaAndLandMaps
    /**
     * @type {CustomBlankMap}
     */
    const seaCustomMap = new CustomBlankMap(10, 10, bh.terrain)
    seaCustomMap.title = 'Test Sea Map'
    seaCustomMap.shipNum = { A: 1, B: 1, C: 1 } // Sea terrain ship counts

    try {
      /**
       * @type {Array<Object>}
       */
      const seaFleet = seaCustomMap.newFleetForMap
      console.log(`  Sea terrain fleet: ${seaFleet.length} ships`)
      console.log(`  Sea map weapons: ${seaCustomMap.weapons.length}`)
    } catch (err) {
      console.log(
        `  ERROR: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    logSection('Test Complete')
    process.exit(0)
  })
  .catch(err => {
    /**
     * Handle fatal errors during test execution
     * @type {Error}
     */
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Fatal error:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  })
