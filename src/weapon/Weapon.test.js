/**
 * @fileoverview Unit tests for Weapon base class and StandardShot subclass.
 * Tests abstract class behavior, weapon properties, curse management, and helper methods.
 * Uses Jest mocking for bh and errorMsg dependencies.
 */

import { describe, jest, it, expect, beforeEach } from '@jest/globals'

/**
 * @typedef {Object} MockBh
 * @property {boolean} seekingMode - Whether game is in seeking/hide mode
 * @property {string} mapHeading - Display name for grid/map
 */

/**
 * @typedef {Object} WeaponInstance
 * @property {string} name - Weapon display name
 * @property {string} letter - Single-character weapon identifier
 * @property {boolean} isLimited - Whether ammunition is limited
 * @property {boolean} destroys - Whether weapon destroys targets
 * @property {number} points - Victory points awarded for successful hit
 * @property {boolean} hasFlash - Whether weapon has visual flash effect
 * @property {number} totalCursors - Total number of cursor graphics
 * @property {number} splashPower - Splash damage radius (-1 = no splash)
 * @property {string} plural - Plural form of weapon name
 * @property {string|null} launchCursor - Optional launch cursor graphic
 * @property {number} postSelectCursor - Cursor offset after selection
 * @property {Array<string>} cursors - Array of targeting cursor graphics
 * @property {string} tag - Unique weapon tag identifier
 * @property {string} classname - CSS-friendly weapon class name
 */

/**
 * Weapon base class under test
 * Assigned in beforeEach after mocking dependencies
 * Type is not fully known at compile time due to dynamic import with jest mocking
 * @type {any}
 */
let Weapon

/**
 * StandardShot subclass under test
 * Assigned in beforeEach after mocking dependencies
 * Type is not fully known at compile time due to dynamic import with jest mocking
 * @type {any}
 */
let StandardShot

/**
 * Mock bh module - battle history and game state management
 * @type {MockBh}
 */
let bh

/**
 * Mock errorMsg function - formats error messages with weapon context
 * @type {jest.Mock}
 */
let errorMsg

jest.unstable_mockModule('../terrains/all/js/bh.js', () => {
  return {
    bh: {
      seekingMode: false,
      mapHeading: 'Grid'
    }
  }
})

jest.unstable_mockModule('../core/errorMsg.js', () => ({
  errorMsg: jest.fn()
}))

/**
 * Setup hook: Dynamically imports Weapon classes and mocks after module setup
 * Resets module state before each test to ensure isolation
 * Required because bh and errorMsg are mocked with jest.unstable_mockModule
 *
 * @returns {Promise<void>}
 * @async
 */
beforeEach(async () => {
  const weaponModule = await import('./Weapon.js')
  Weapon = weaponModule.Weapon
  StandardShot = weaponModule.StandardShot

  const bhModule = await import('../terrains/all/js/bh.js')
  bh = bhModule.bh

  const errorMsgModule = await import('../core/errorMsg.js')
  errorMsg = errorMsgModule.errorMsg
})

/**
 * Test suite for Weapon base class and StandardShot subclass
 * Tests instantiation, properties, cursors, hints, and helper methods
 */
describe('Weapon', () => {
  /**
   * Test: Abstract class instantiation prevention
   * Verifies that Weapon base class cannot be instantiated directly
   * Must be subclassed for concrete implementation
   */
  it('cannot be instantiated directly', () => {
    expect(() => new Weapon('Test', 'T', false, true, 1)).toThrow(
      'base class cannot be instantiated directly. Please extend it.'
    )
  })

  /**
   * Test: Property initialization in StandardShot
   * Verifies all default weapon properties are set correctly
   */
  it('initializes properties correctly', () => {
    const weapon = new StandardShot()

    expect(weapon.name).toBe('Standard Shot')
    expect(weapon.letter).toBe('-')
    expect(weapon.isLimited).toBe(false)
    expect(weapon.destroys).toBe(true)
    expect(weapon.points).toBe(1)
    expect(weapon.hasFlash).toBe(false)
    expect(weapon.totalCursors).toBe(1)
    expect(weapon.splashPower).toBe(-1)
  })

  /**
   * Test: Plural name formatting
   * Verifies weapon name is properly pluralized
   */
  it('sets plural name', () => {
    const weapon = new StandardShot()
    expect(weapon.plural).toBe('Standard Shots')
  })

  /**
   * Test: getTurn method returns empty string
   * Default behavior for weapons without turn indicator
   */
  it('getTurn returns empty string by default', () => {
    const weapon = new StandardShot()
    expect(weapon.getTurn()).toBe('')
  })

  /**
   * Test: stepIdx returns numCoords in seeking mode
   * In hide-and-seek variant, only target coordinates matter
   */
  it('stepIdx returns numCoords in seeking mode', () => {
    const weapon = new StandardShot()
    bh.seekingMode = true
    expect(weapon.stepIdx(5, 2)).toBe(5)
    bh.seekingMode = false
  })

  /**
   * Test: stepIdx accounts for launch cursor selection step
   * When launchCursor exists, adds postSelectCursor offset to step count
   */
  it('stepIdx returns numCoords + selectOffset when launchCursor exists', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = true
    weapon.postSelectCursor = 1
    expect(weapon.stepIdx(5, 3)).toBe(7)
  })

  /**
   * Test: stepIdx clamps postSelectCursor to minimum of 0
   * Ensures negative select offsets are clamped to zero
   */
  it('stepIdx clamps selectOffset to 0', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = true
    weapon.postSelectCursor = 5
    expect(weapon.stepIdx(5, 2)).toBe(5)
  })

  /**
   * Test: stepHint for targeting step 0
   * Provides UI hint message for initial targeting step
   */
  it('stepHint returns correct message for step 0', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = null
    expect(weapon.stepHint(0)).toContain('Enemy Grid')
  })

  /**
   * Test: stepHint for launch cursor selection
   * Shows different hint when launch cursor exists (friendly grid selection)
   */
  it('stepHint returns launch hint when launchCursor exists', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = { id: 1 }
    expect(weapon.stepHint(0)).toContain('Friendly Grid')
  })

  /**
   * Test: numStep returns cursors length in seeking mode
   * Hide-and-seek mode only counts targeting cursors
   */
  it('numStep returns cursors length in seeking mode', () => {
    const weapon = new StandardShot()
    weapon.cursors = [1, 2, 3]
    bh.seekingMode = true
    expect(weapon.numStep).toBe(3)
    bh.seekingMode = false
  })

  /**
   * Test: numStep returns total cursors in play mode
   * Normal play mode counts targeting + launch cursors
   */
  it('numStep returns totalCursors when not in seeking mode', () => {
    const weapon = new StandardShot()
    weapon.totalCursors = 5
    bh.seekingMode = false
    expect(weapon.numStep).toBe(5)
  })

  /**
   * Test: hasExtraSelectCursor detection
   * Verifies when launch cursor differs from first targeting cursor
   */
  it('hasExtraSelectCursor is true when launchCursor differs from first cursor', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = '3'
    weapon.cursors = ['2']
    expect(weapon.hasExtraSelectCursor).toBe(true)
  })

  /**
   * Test: hasExtraSelectCursor when launch cursor matches first cursor
   * Should be false when both cursors are identical
   */
  it('hasExtraSelectCursor is false when launchCursor is first cursor', () => {
    const weapon = new StandardShot()
    weapon.launchCursor = '2'
    weapon.cursors = ['2']
    try {
      expect(weapon.hasExtraSelectCursor).toBe(false)
    } catch (err) {
      err.message += errorMsg('weapon', weapon)
      throw err
    }
  })

  /**
   * Test: ammoStatus returns weapon mode description
   * Provides human-readable ammo/firing mode status
   */
  it('ammoStatus returns weapon name', () => {
    const weapon = new StandardShot()
    expect(weapon.ammoStatus(5)).toBe('Single Shot Mode')
  })

  /**
   * Test: info returns formatted weapon information
   * Returns human-readable weapon name with letter identifier
   */
  it('info returns name and letter', () => {
    const weapon = new StandardShot()
    expect(weapon.info()).toBe('Standard Shot (-)')
  })

  /**
   * Test: addSplash throws error when splash not applicable
   * StandardShot has no splash damage capability
   */
  it('addSplash throws error', () => {
    const weapon = new StandardShot()
    expect(() => weapon.addSplash()).toThrow(
      'Not Applicable: Standard Shot does not have splash damage'
    )
  })

  /**
   * Test: addOrthogonal calls addSplash for adjacent cells
   * Tests splash damage application to orthogonal neighbors (up/down/left/right)
   */
  it('addOrthogonal calls addSplash for 4 adjacent cells', () => {
    const weapon = new StandardShot()
    weapon.addSplash = jest.fn()
    const map = {}
    weapon.addOrthogonal(map, 5, 5, 10, {})
    expect(weapon.addSplash).toHaveBeenCalledTimes(4)
  })

  /**
   * Test: addDiagonal calls addSplash for diagonal cells
   * Tests splash damage application to diagonal neighbors (corners)
   */
  it('addDiagonal calls addSplash for 4 diagonal cells', () => {
    const weapon = new StandardShot()
    weapon.addSplash = jest.fn()
    const map = {}
    weapon.addDiagonal(map, 5, 5, 10, {})
    expect(weapon.addSplash).toHaveBeenCalledTimes(4)
  })

  /**
   * Test: addNeighbours calls orthogonal and diagonal splash methods
   * Tests combined splash application to all neighbors (8 cells total)
   */
  it('addNeighbours calls addOrthogonal and addDiagonal', () => {
    const weapon = new StandardShot()
    weapon.addOrthogonal = jest.fn()
    weapon.addDiagonal = jest.fn()
    const map = {}
    const newEffect = {}
    weapon.addNeighbours(map, 5, 5, 10, 5, newEffect)
    expect(weapon.addOrthogonal).toHaveBeenCalledWith(map, 5, 5, 10, newEffect)
    expect(weapon.addDiagonal).toHaveBeenCalledWith(map, 5, 5, 5, newEffect)
  })

  /**
   * Test: redoCoords returns origin and first target coordinate
   * Used for redo/repeat targeting from stored coordinates
   */
  it('redoCoords returns base and first coord', () => {
    const weapon = new StandardShot()
    const result = weapon.redoCoords({}, [1, 2], [[3, 4], 'target'])
    expect(result).toEqual([
      [1, 2],
      [3, 4]
    ])
  })

  /**
   * Test: centerOf calculates element center point
   * Computes center coordinates from DOM element bounding rectangle
   */
  it('centerOf returns center point of element', () => {
    const weapon = new StandardShot()
    const el = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 40,
        height: 30
      })
    }
    const center = weapon.centerOf(el)
    expect(center.x).toBe(120)
    expect(center.y).toBe(65)
  })

  /**
   * Test: classname converts name to CSS class
   * Transforms weapon name to lowercase with spaces replaced by dashes
   */
  it('classname is lowercase name with spaces replaced by dashes', () => {
    const weapon = new StandardShot()
    expect(weapon.classname).toBe('standard-shot')
  })
})

/**
 * Test suite for StandardShot subclass
 * Tests StandardShot-specific behavior and defaults
 */
describe('StandardShot', () => {
  it('constructs with correct defaults', () => {
    const shot = new StandardShot()
    expect(shot.name).toBe('Standard Shot')
    expect(shot.letter).toBe('-')
    expect(shot.isLimited).toBe(false)
    expect(shot.cursors).toEqual([''])
    expect(shot.tag).toBe('single')
  })

  /**
   * Test: aoe returns single cell with power 4
   * StandardShot area of effect is single target cell with power rating of 4
   */
  it('aoe returns single cell with power 4', () => {
    const shot = new StandardShot()
    const result = shot.aoe({}, [[5, 10]])
    expect(result).toEqual([[5, 10, 4]])
  })
})
