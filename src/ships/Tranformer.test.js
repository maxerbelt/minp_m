/**
 * @fileoverview Comprehensive test suite for Transformer class
 *
 * Tests the Transformer class which represents a ship that can transform between multiple forms.
 * Each form is a distinct ship configuration with different cells, properties, and capabilities.
 *
 * Architecture:
 * - Transformer extends Shape, inheriting basic ship properties
 * - Contains multiple forms (shape variants) that can be switched between
 * - Delegates form-specific operations to current form while managing all forms' shared properties
 * - Uses TransformableVariants to manage variant generation across all forms
 *
 * Test Coverage:
 * - Constructor initialization and property setup
 * - Property getters and setters (with delegation to current form)
 * - Shared property mutation (setting property on all forms)
 * - Form switching and currentForm tracking
 * - Variant generation and form variants management
 * - Method delegation to current form (description, protectionAgainst, attachWeapon, etc.)
 * - Sunk ship descriptions with custom separators
 *
 * Mock Dependencies:
 * - terrain.js: Terrain definitions (mixed terrain type)
 * - Shape.js: Base Shape class with constructor and properties
 * - TransformableVariants.js: Variant container for multiple forms
 * - Variant3.js: Individual variant representation
 *
 * @module Transformer.test
 * @requires @jest/globals
 * @requires ../Transformer.js (module under test)
 * @requires ../terrains/all/js/terrain.js (mocked)
 * @requires ./Shape.js (mocked)
 * @requires ../variants/TransformableVariants.js (mocked)
 * @requires ../variants/Variant3.js (mocked)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

let Transformer, TransformableVariants

/**
 * Mock terrain data for testing
 * Provides minimal terrain configuration needed for Shape construction
 *
 * @type {Object}
 * @property {string} title - Terrain display name
 * @property {string} type - Terrain type identifier
 */
jest.unstable_mockModule('../terrains/all/js/terrain.js', () => ({
  mixed: { title: 'Mixed Terrain', type: 'mixed' }
}))

/**
 * Mock Shape class for testing
 * Simulates Shape constructor and properties without actual grid logic
 *
 * @constructor
 * @param {string} letter - Ship identifier letter
 * @param {string} symmetry - Symmetry type (e.g., 'ASYM', 'HORIZONTAL')
 * @param {Array<Array<number>>} cells - Cell coordinates of ship shape
 * @param {string} group - Ship group identifier
 * @param {string} tip - UI tooltip text
 * @param {Object} racks - Weapon rack configuration
 * @property {number} displacement - Ship displacement value (default 5)
 * @property {Object} board - Mock board with addLayers method
 * @property {number} size - Number of cells in the shape
 */
jest.unstable_mockModule('./Shape.js', () => ({
  Shape: jest.fn(function (letter, symmetry, cells, group, tip, racks) {
    this.letter = letter
    this.symmetry = symmetry
    this.cells = cells
    this.group = group
    this.tip = tip
    this.racks = racks
    this.displacement = 5
    this.board = { addLayers: jest.fn() }
    this.size = cells ? cells.length : 0
  })
}))

/**
 * Mock TransformableVariants class for testing
 * Manages variant generation and tracking across multiple forms
 *
 * @constructor
 * @param {Array<Object>} forms - Array of ship form objects
 * @property {Array<Object>} forms - Stored forms
 * @property {number} index - Current variant index
 * @property {number} formsIdx - Current form index (0 = form1, 1 = form2, etc.)
 * @property {Function} placeables - Returns placeable items from variants (mocked to return empty array)
 */
jest.unstable_mockModule('../variants/TransformableVariants.js', () => ({
  TransformableVariants: jest.fn(function (forms) {
    this.forms = forms
    this.index = 0
    this.formsIdx = 0
    this.placeables = jest.fn().mockReturnValue([])
  })
}))

/**
 * Mock Variant3 class for testing
 * Represents a single variant configuration
 *
 * @constructor
 * @param {Array<Array<number>>} cells - Cell coordinates
 * @param {Array<Object>} subGroups - Sub-grouping of cells
 * @param {string} symmetry - Symmetry type
 */
jest.unstable_mockModule('../variants/Variant3.js', () => ({
  Variant3: jest.fn(function (cells, subGroups, symmetry) {
    this.cells = cells
    this.subGroups = subGroups
    this.symmetry = symmetry
  })
}))

/**
 * Setup: Load module under test and dependencies
 *
 * Imports the Transformer class and TransformableVariants from their modules.
 * Must run before any test to ensure modules are loaded.
 * Uses dynamic imports to allow Jest mocking to take effect.
 *
 * @async
 * @function
 * @returns {Promise<void>}
 *
 * @description
 * This beforeEach hook:
 * 1. Imports Transformer class from ./Transformer.js
 * 2. Imports TransformableVariants from ../variants/TransformableVariants.js
 * 3. Clears all Jest mock call histories from previous tests
 *
 * Must be placed before all describe() blocks to execute before tests run.
 */
beforeEach(async () => {
  const specialShapesModule = await import('./Transformer.js')
  Transformer = specialShapesModule.Transformer

  const transformableVariantsModule = await import(
    '../variants/TransformableVariants.js'
  )
  TransformableVariants = transformableVariantsModule.TransformableVariants

  jest.clearAllMocks()
})

/**
 * Test Suite: Transformer class
 *
 * Comprehensive test coverage for the Transformer ship class.
 * Tests form management, property delegation, and transformation capabilities.
 *
 * Test structure:
 * - Constructor tests: initialization and property setup
 * - Property getter/setter tests: delegation and form switching
 * - Form management tests: currentForm tracking and formsIdx
 * - Method delegation tests: operations delegated to current form
 * - Edge case tests: null values, empty arrays, boundary conditions
 */
describe('Transformer', () => {
  let mockForm1
  let mockForm2
  let mockForms
  let transformer

  /**
   * Setup: Create mock forms and Transformer instance for each test
   *
   * Creates two distinct mock forms with different properties:
   * - Form 1: 2 cells, displacement 4, 3 variants
   * - Form 2: 3 cells, displacement 6, 4 variants
   *
   * Mock forms include all properties and methods Transformer delegates to:
   * - Property accessors: letter, symmetry, cells, tip, displacement
   * - Collections: vulnerable, hardened, immune, attachedWeapons
   * - Method stubs: description(), protectionAgainst(), attachWeapon()
   * - Sunk descriptions: sunkDescription(), shipSunkDescriptions()
   * - Variant generation: variants()
   *
   * Then creates a Transformer instance with both forms and resets mocks.
   *
   * @function
   * @returns {void}
   */
  beforeEach(() => {
    jest.clearAllMocks()

    /**
     * Mock first form object
     * @type {Object}
     * @property {string} letter - Ship identifier
     * @property {string} symmetry - Symmetry type
     * @property {Array<Array<number>>} cells - 2-cell configuration
     * @property {string} descriptionText - Form display text
     * @property {Object} racks - Weapon racks (empty)
     * @property {Array} attachedWeapons - Attached weapons array
     * @property {string} tip - Placement tip text
     * @property {number} displacement - 4
     * @property {Array} vulnerable - Vulnerable cells list
     * @property {Array} hardened - Hardened cells list
     * @property {Array} immune - Immune cells list
     * @property {Function} variants - Returns mock variant array (3 items)
     * @property {Function} description - Returns form description text
     * @property {Function} protectionAgainst - Returns protection status
     * @property {Function} attachWeapon - Attaches weapon, returns boolean
     * @property {Function} sunkDescription - Returns sunk description
     * @property {Function} shipSunkDescriptions - Returns sunk description array
     */
    mockForm1 = {
      letter: 'T',
      symmetry: 'ASYM',
      cells: [
        [0, 0],
        [1, 1]
      ],
      descriptionText: 'Form 1',
      racks: {},
      attachedWeapons: [],
      tip: 'Place form 1',
      displacement: 4,
      vulnerable: [],
      hardened: [],
      immune: [],
      variants: jest.fn().mockReturnValue([{}, {}, {}]),
      description: jest.fn().mockReturnValue('Form 1 Description'),
      protectionAgainst: jest.fn().mockReturnValue('protected'),
      attachWeapon: jest.fn().mockReturnValue(true),
      sunkDescription: jest.fn().mockReturnValue('Form 1 sunk'),
      shipSunkDescriptions: jest.fn().mockReturnValue(['desc1'])
    }

    /**
     * Mock second form object
     * Similar to mockForm1 but with different properties for testing form switching
     * @type {Object}
     */
    mockForm2 = {
      letter: 'T',
      symmetry: 'ASYM',
      cells: [
        [0, 0],
        [1, 1],
        [2, 2]
      ],
      descriptionText: 'Form 2',
      racks: {},
      attachedWeapons: [],
      tip: 'Place form 2',
      displacement: 6,
      vulnerable: [],
      hardened: [],
      immune: [],
      variants: jest.fn().mockReturnValue([{}, {}, {}, {}]),
      description: jest.fn().mockReturnValue('Form 2 Description'),
      protectionAgainst: jest.fn().mockReturnValue('protected'),
      attachWeapon: jest.fn(),
      sunkDescription: jest.fn().mockReturnValue('Form 2 sunk'),
      shipSunkDescriptions: jest.fn().mockReturnValue(['desc2'])
    }

    mockForms = [mockForm1, mockForm2]
    transformer = new Transformer(mockForms)
  })

  describe('constructor', () => {
    /**
     * Test: Constructor initializes with first form properties
     *
     * Verifies that Transformer constructor copies basic properties from the first form.
     * This ensures that a Transformer instance has a consistent initial state.
     *
     * @test
     */
    it('should initialize with first form properties', () => {
      expect(transformer.letter).toBe('T')
      expect(transformer.symmetry).toBe('ASYM')
    })

    /**
     * Test: Constructor stores all forms
     *
     * Verifies that the Transformer stores the complete array of forms
     * for later access and form switching operations.
     *
     * @test
     */
    it('should store all forms', () => {
      expect(transformer.forms).toEqual(mockForms)
    })

    /**
     * Test: Constructor creates formVariants from forms
     *
     * Verifies that TransformableVariants is instantiated with the forms array.
     * This is the mechanism for managing variants across all forms.
     *
     * @test
     */
    it('should create formVariants from forms', () => {
      expect(TransformableVariants).toHaveBeenCalledWith(mockForms)
    })

    /**
     * Test: Constructor calculates total variants
     *
     * Verifies that totalVariants is the sum of variants from all forms.
     * mockForm1 has 3 variants, mockForm2 has 4, so total should be 7.
     *
     * @test
     */
    it('should calculate total variants', () => {
      expect(transformer.totalVariants).toBe(7)
    })

    /**
     * Test: Constructor sets canTransform flag
     *
     * Verifies that a Transformer with multiple forms has canTransform = true.
     * This indicates the ship can change between forms.
     *
     * @test
     */
    it('should set canTransform to true', () => {
      expect(transformer.canTransform).toBe(true)
    })

    /**
     * Test: Constructor uses first form description and tip
     *
     * Verifies that the Transformer's display text comes from the first form.
     * This ensures consistent UI presentation with current form context.
     *
     * @test
     */
    it('should use first form description text and tip', () => {
      expect(transformer.descriptionText).toBe('Form 1')
    })

    /**
     * Test: Constructor sets group to 'X'
     *
     * Verifies that Transformers are assigned to group 'X'.
     * This distinguishes them from regular ships in group-based operations.
     *
     * @test
     */
    it('should set group to X', () => {
      expect(transformer.group).toBe('X')
    })
  })

  /**
   * Test Suite: index getter
   *
   * Tests the index getter which delegates to formVariants.index.
   * The index tracks the current variant position across all forms.
   */
  describe('index getter', () => {
    /**
     * Test: index getter returns formVariants index
     *
     * Verifies that Transformer.index returns the current index from formVariants.
     * This allows external code to track position in variant iteration.
     *
     * @test
     */
    it('should return formVariants index', () => {
      transformer.formVariants.index = 5
      expect(transformer.index).toBe(5)
    })
  })

  /**
   * Test Suite: formsIdx getter
   *
   * Tests the formsIdx getter which delegates to formVariants.formsIdx.
   * The formsIdx tracks which form is currently active (0, 1, 2, etc.).
   */
  describe('formsIdx getter', () => {
    /**
     * Test: formsIdx getter returns formVariants formsIdx
     *
     * Verifies that Transformer.formsIdx returns the current form index from formVariants.
     * This indicates which form is currently selected for operations.
     *
     * @test
     */
    it('should return formVariants formsIdx', () => {
      transformer.formVariants.formsIdx = 1
      expect(transformer.formsIdx).toBe(1)
    })
  })

  /**
   * Test Suite: currentForm getter
   *
   * Tests the currentForm getter which selects from forms array based on formsIdx.
   * Returns the form object that is currently active for property delegation.
   */
  describe('currentForm getter', () => {
    /**
     * Test: currentForm returns first form by default
     *
     * Verifies that when formsIdx is 0 (default), currentForm returns the first form.
     *
     * @test
     */
    it('should return first form by default', () => {
      expect(transformer.currentForm).toBe(mockForm1)
    })

    /**
     * Test: currentForm returns second form when formsIdx is 1
     *
     * Verifies that changing formsIdx causes currentForm to return the corresponding form.
     * This tests the form-switching mechanism.
     *
     * @test
     */
    it('should return second form when formsIdx is 1', () => {
      transformer.formVariants.formsIdx = 1
      expect(transformer.currentForm).toBe(mockForm2)
    })
  })

  /**
   * Test Suite: attachedWeapons getter and setter
   *
   * Tests property delegation for attachedWeapons.
   * Getter reads from currentForm, setter writes to all forms.
   * Setter guards against null/empty values and empty forms array.
   */
  describe('attachedWeapons getter and setter', () => {
    /**
     * Test: attachedWeapons getter reads from current form
     *
     * Verifies that Transformer.attachedWeapons returns the current form's weapons.
     *
     * @test
     */
    it('should get attachedWeapons from current form', () => {
      mockForm1.attachedWeapons = ['weapon1']
      expect(transformer.attachedWeapons).toEqual(['weapon1'])
    })

    /**
     * Test: attachedWeapons setter writes to all forms
     *
     * Verifies that setting attachedWeapons updates all forms.
     * This ensures all transformation variants have consistent weapons.
     *
     * @test
     */
    it('should set attachedWeapons to all forms', () => {
      const newWeapons = ['newWeapon1', 'newWeapon2']
      transformer.attachedWeapons = newWeapons
      expect(mockForm1.attachedWeapons).toBe(newWeapons)
      expect(mockForm2.attachedWeapons).toBe(newWeapons)
    })

    /**
     * Test: attachedWeapons setter does not set null
     *
     * Verifies that setting attachedWeapons to null is rejected.
     * This guards against invalid weapon configurations.
     *
     * @test
     */
    it('should not set if newAttachedWeapons is null', () => {
      const original1 = mockForm1.attachedWeapons
      const original2 = mockForm2.attachedWeapons
      transformer.attachedWeapons = null
      expect(mockForm1.attachedWeapons).toBe(original1)
      expect(mockForm2.attachedWeapons).toBe(original2)
    })

    /**
     * Test: attachedWeapons setter does not set empty array
     *
     * Verifies that setting attachedWeapons to [] is rejected.
     * Empty arrays may indicate invalid state.
     *
     * @test
     */
    it('should not set if newAttachedWeapons is empty', () => {
      const original1 = mockForm1.attachedWeapons
      const original2 = mockForm2.attachedWeapons
      transformer.attachedWeapons = []
      expect(mockForm1.attachedWeapons).toBe(original1)
      expect(mockForm2.attachedWeapons).toBe(original2)
    })

    /**
     * Test: attachedWeapons setter handles empty forms array
     *
     * Verifies that if forms array becomes empty, setter is a no-op.
     * This guards against errors when forms collection is cleared.
     *
     * @test
     */
    it('should not set if forms is empty', () => {
      const emptyTransformer = new Transformer([mockForm1])
      emptyTransformer.forms = []
      emptyTransformer.attachedWeapons = ['newWeapon']
      expect(mockForm1.attachedWeapons).toEqual([])
    })
  })

  /**
   * Test Suite: descriptionText getter
   *
   * Tests that descriptionText reflects the current form's description.
   * Changes when form is switched via formsIdx.
   */
  describe('descriptionText getter', () => {
    /**
     * Test: descriptionText returns current form description
     *
     * Verifies that descriptionText changes when currentForm changes.
     * This is used for UI display of the current transformation state.
     *
     * @test
     */
    it('should return current form description text', () => {
      expect(transformer.descriptionText).toBe('Form 1')
      transformer.formVariants.formsIdx = 1
      expect(transformer.descriptionText).toBe('Form 2')
    })
  })

  /**
   * Test Suite: tip getter and setter
   *
   * Tests tip property delegation.
   * Getter reads from currentForm, setter writes to all forms.
   * Setter guards against null and empty strings.
   */
  describe('tip getter and setter', () => {
    /**
     * Test: tip getter reads from current form
     *
     * Verifies that Transformer.tip returns currentForm.tip.
     * Used for placement instructions displayed to the player.
     *
     * @test
     */
    it('should get tip from current form', () => {
      expect(transformer.tip).toBe('Place form 1')
    })

    /**
     * Test: tip setter writes to all forms
     *
     * Verifies that setting tip updates all forms consistently.
     *
     * @test
     */
    it('should set tip to all forms', () => {
      transformer.tip = 'New tip'
      expect(mockForm1.tip).toBe('New tip')
      expect(mockForm2.tip).toBe('New tip')
    })

    /**
     * Test: tip setter rejects null
     *
     * Verifies that null values are not accepted for tip.
     *
     * @test
     */
    it('should not set if newTip is null', () => {
      const original1 = mockForm1.tip
      const original2 = mockForm2.tip
      transformer.tip = null
      expect(mockForm1.tip).toBe(original1)
      expect(mockForm2.tip).toBe(original2)
    })

    /**
     * Test: tip setter rejects empty string
     *
     * Verifies that empty strings are not accepted for tip.
     * Ensures tip always has meaningful content.
     *
     * @test
     */
    it('should not set if newTip is empty', () => {
      const original1 = mockForm1.tip
      const original2 = mockForm2.tip
      transformer.tip = ''
      expect(mockForm1.tip).toBe(original1)
      expect(mockForm2.tip).toBe(original2)
    })
  })

  /**
   * Test Suite: displacement getter and setter
   *
   * Tests displacement property management.
   * Getter reads from currentForm.
   * Setter is a no-op (read-only from Transformer perspective).
   */
  describe('displacement getter and setter', () => {
    /**
     * Test: displacement getter reads from current form
     *
     * Verifies that Transformer.displacement returns currentForm.displacement.
     * Displacement is a form-specific property (4 for form1, 6 for form2).
     *
     * @test
     */
    it('should get displacement from current form', () => {
      expect(transformer.displacement).toBe(4)
    })

    /**
     * Test: displacement setter is ignored
     *
     * Verifies that setting displacement has no effect.
     * Displacement is read-only because each form has its own displacement.
     *
     * @test
     */
    it('should not set displacement', () => {
      transformer.displacement = 20
      expect(transformer.displacement).toBe(4)
    })
  })

  /**
   * Test Suite: vulnerable getter and setter
   *
   * Tests vulnerable property delegation.
   * Getter reads from currentForm, setter writes to all forms.
   * Vulnerable cells are those susceptible to specific attack types.
   */
  describe('vulnerable getter and setter', () => {
    /**
     * Test: vulnerable getter reads from current form
     *
     * Verifies that Transformer.vulnerable returns currentForm.vulnerable.
     *
     * @test
     */
    it('should get vulnerable from current form', () => {
      mockForm1.vulnerable = ['cell1']
      expect(transformer.vulnerable).toEqual(['cell1'])
    })

    /**
     * Test: vulnerable setter writes to all forms
     *
     * Verifies that setting vulnerable updates all forms.
     * Ensures all transformation variants have consistent vulnerability.
     *
     * @test
     */
    it('should set vulnerable to all forms', () => {
      const newVulnerable = ['cell1', 'cell2']
      transformer.vulnerable = newVulnerable
      expect(mockForm1.vulnerable).toEqual(newVulnerable)
      expect(mockForm2.vulnerable).toEqual(newVulnerable)
    })

    /**
     * Test: vulnerable setter rejects null
     *
     * Verifies that null values are not accepted.
     *
     * @test
     */
    it('should not set if newVulnerable is null', () => {
      const original1 = mockForm1.vulnerable
      transformer.vulnerable = null
      expect(mockForm1.vulnerable).toBe(original1)
    })
  })

  /**
   * Test Suite: hardened getter and setter
   *
   * Tests hardened property delegation.
   * Hardened cells are resistant to damage.
   */
  describe('hardened getter and setter', () => {
    /**
     * Test: hardened getter reads from current form
     *
     * Verifies that Transformer.hardened returns currentForm.hardened.
     *
     * @test
     */
    it('should get hardened from current form', () => {
      mockForm1.hardened = ['cell1']
      expect(transformer.hardened).toEqual(['cell1'])
    })

    /**
     * Test: hardened setter writes to all forms
     *
     * Verifies that setting hardened updates all forms.
     *
     * @test
     */
    it('should set hardened to all forms', () => {
      const newHardened = ['cell1']
      transformer.hardened = newHardened
      expect(mockForm1.hardened).toEqual(newHardened)
      expect(mockForm2.hardened).toEqual(newHardened)
    })
  })

  /**
   * Test Suite: immune getter and setter
   *
   * Tests immune property delegation.
   * Immune cells cannot be damaged by certain attack types.
   */
  describe('immune getter and setter', () => {
    /**
     * Test: immune getter reads from current form
     *
     * Verifies that Transformer.immune returns currentForm.immune.
     *
     * @test
     */
    it('should get immune from current form', () => {
      mockForm1.immune = ['cell1']
      expect(transformer.immune).toEqual(['cell1'])
    })

    /**
     * Test: immune setter writes to all forms
     *
     * Verifies that setting immune updates all forms.
     *
     * @test
     */
    it('should set immune to all forms', () => {
      const newImmune = ['cell1']
      transformer.immune = newImmune
      expect(mockForm1.immune).toEqual(newImmune)
      expect(mockForm2.immune).toEqual(newImmune)
    })
  })

  /**
   * Test Suite: description method
   *
   * Tests delegation of description() method to current form.
   */
  describe('description', () => {
    /**
     * Test: description() delegates to current form
     *
     * Verifies that calling description() invokes currentForm.description().
     * Result is returned from the form's method.
     *
     * @test
     */
    it('should return description from current form', () => {
      const result = transformer.description()
      expect(result).toBe('Form 1 Description')
      expect(mockForm1.description).toHaveBeenCalled()
    })
  })

  /**
   * Test Suite: protectionAgainst method
   *
   * Tests delegation of protectionAgainst(weapon) method to current form.
   */
  describe('protectionAgainst', () => {
    /**
     * Test: protectionAgainst() delegates to current form with weapon param
     *
     * Verifies that protectionAgainst(weapon) is delegated to currentForm.
     * The weapon parameter is passed through correctly.
     *
     * @test
     */
    it('should return protection from current form', () => {
      const weapon = { name: 'cannon' }
      const result = transformer.protectionAgainst(weapon)
      expect(result).toBe('protected')
      expect(mockForm1.protectionAgainst).toHaveBeenCalledWith(weapon)
    })
  })

  /**
   * Test Suite: attachWeapon method
   *
   * Tests delegation of attachWeapon(ammoBuilder) method to current form.
   */
  describe('attachWeapon', () => {
    /**
     * Test: attachWeapon() delegates to current form
     *
     * Verifies that attachWeapon(ammoBuilder) is delegated to currentForm.
     * The ammoBuilder parameter is passed through correctly.
     *
     * @test
     */
    it('should call attachWeapon on current form', () => {
      const ammoBuilder = jest.fn()
      transformer.attachWeapon(ammoBuilder)
      expect(mockForm1.attachWeapon).toHaveBeenCalledWith(ammoBuilder)
    })
  })

  /**
   * Test Suite: variants method
   *
   * Tests that variants() returns the formVariants container.
   */
  describe('variants', () => {
    /**
     * Test: variants() returns formVariants container
     *
     * Verifies that variants() returns the TransformableVariants instance.
     * This gives access to all variants across all forms.
     *
     * @test
     */
    it('should return formVariants', () => {
      const result = transformer.variants()
      expect(result).toBe(transformer.formVariants)
    })
  })

  /**
   * Test Suite: placeables method
   *
   * Tests that placeables() returns placeables from formVariants.
   */
  describe('placeables', () => {
    /**
     * Test: placeables() returns array from formVariants
     *
     * Verifies that placeables() calls formVariants.placeables() and returns the result.
     * Placeables represent valid placement positions/shapes.
     *
     * @test
     */
    it('should return placeables from formVariants', () => {
      transformer.variants().placeables = jest
        .fn()
        .mockReturnValue(['p1', 'p2'])
      const result = transformer.placeables()
      expect(result).toEqual(['p1', 'p2'])
    })
  })

  /**
   * Test Suite: sunkDescription method
   *
   * Tests delegation of sunkDescription(separator) method to current form.
   */
  describe('sunkDescription', () => {
    /**
     * Test: sunkDescription() with default separator
     *
     * Verifies that sunkDescription() delegates to currentForm with default separator ' '.
     * The default separator is used when no argument is provided.
     *
     * @test
     */
    it('should return sunk description from current form with default separator', () => {
      const result = transformer.sunkDescription()
      expect(result).toBe('Form 1 sunk')
      expect(mockForm1.sunkDescription).toHaveBeenCalledWith(' ')
    })

    /**
     * Test: sunkDescription() with custom separator
     *
     * Verifies that a custom separator is passed to the form's method.
     *
     * @test
     */
    it('should pass custom separator to current form', () => {
      transformer.sunkDescription('|')
      expect(mockForm1.sunkDescription).toHaveBeenCalledWith('|')
    })
  })

  /**
   * Test Suite: shipSunkDescriptions method
   *
   * Tests delegation of shipSunkDescriptions() method to current form.
   */
  describe('shipSunkDescriptions', () => {
    /**
     * Test: shipSunkDescriptions() delegates to current form
     *
     * Verifies that shipSunkDescriptions() returns result from currentForm method.
     * Returns array of descriptions for ship sunk variants.
     *
     * @test
     */
    it('should return ship sunk descriptions from current form', () => {
      const result = transformer.shipSunkDescriptions()
      expect(result).toEqual(['desc1'])
      expect(mockForm1.shipSunkDescriptions).toHaveBeenCalled()
    })
  })

  /**
   * Test Suite: type method
   *
   * Tests that type() returns the ship type identifier.
   */
  describe('type', () => {
    /**
     * Test: type() returns 'T'
     *
     * Verifies that Transformer type is always 'T'.
     * This identifies the ship class in the game system.
     *
     * @test
     */
    it('should return T', () => {
      expect(transformer.type()).toBe('T')
    })
  })
})
