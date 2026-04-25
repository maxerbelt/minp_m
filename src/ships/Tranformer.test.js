/* eslint-env jest */

/* global describe, it, expect, beforeEach, jest */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

let Transformer, TransformableVariants
// Mock dependencies with dynamic imports
jest.unstable_mockModule('../terrains/all/js/terrain.js', () => ({
  mixed: { title: 'Mixed Terrain', type: 'mixed' }
}))
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
jest.unstable_mockModule('../variants/TransformableVariants.js', () => ({
  TransformableVariants: jest.fn(function (forms) {
    this.forms = forms
    this.index = 0
    this.formsIdx = 0
    this.placeables = jest.fn().mockReturnValue([])
  })
}))
jest.unstable_mockModule('../variants/Variant3.js', () => ({
  Variant3: jest.fn(function (cells, subGroups, symmetry) {
    this.cells = cells
    this.subGroups = subGroups
    this.symmetry = symmetry
  })
}))
beforeEach(async () => {
  const specialShapesModule = await import('./Transformer.js')
  Transformer = specialShapesModule.Transformer

  const transformableVariantsModule = await import(
    '../variants/TransformableVariants.js'
  )
  TransformableVariants = transformableVariantsModule.TransformableVariants

  jest.clearAllMocks()
})

describe('Transformer', () => {
  let mockForm1
  let mockForm2
  let mockForms
  let transformer

  beforeEach(() => {
    jest.clearAllMocks()

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
    it('should initialize with first form properties', () => {
      expect(transformer.letter).toBe('T')
      expect(transformer.symmetry).toBe('ASYM')
    })

    it('should store all forms', () => {
      expect(transformer.forms).toEqual(mockForms)
    })

    it('should create formVariants from forms', () => {
      expect(TransformableVariants).toHaveBeenCalledWith(mockForms)
    })

    it('should calculate total variants', () => {
      expect(transformer.totalVariants).toBe(7)
    })

    it('should set canTransform to true', () => {
      expect(transformer.canTransform).toBe(true)
    })

    it('should use first form description text and tip', () => {
      expect(transformer.descriptionText).toBe('Form 1')
    })

    it('should set group to X', () => {
      expect(transformer.group).toBe('X')
    })
  })

  describe('index getter', () => {
    it('should return formVariants index', () => {
      transformer.formVariants.index = 5
      expect(transformer.index).toBe(5)
    })
  })

  describe('formsIdx getter', () => {
    it('should return formVariants formsIdx', () => {
      transformer.formVariants.formsIdx = 1
      expect(transformer.formsIdx).toBe(1)
    })
  })

  describe('currentForm getter', () => {
    it('should return first form by default', () => {
      expect(transformer.currentForm).toBe(mockForm1)
    })

    it('should return second form when formsIdx is 1', () => {
      transformer.formVariants.formsIdx = 1
      expect(transformer.currentForm).toBe(mockForm2)
    })
  })

  describe('attachedWeapons getter and setter', () => {
    it('should get attachedWeapons from current form', () => {
      mockForm1.attachedWeapons = ['weapon1']
      expect(transformer.attachedWeapons).toEqual(['weapon1'])
    })

    it('should set attachedWeapons to all forms', () => {
      const newWeapons = ['newWeapon1', 'newWeapon2']
      const original1 = mockForm1.attachedWeapons
      const original2 = mockForm2.attachedWeapons
      transformer.attachedWeapons = newWeapons
      expect(mockForm1.attachedWeapons).toBe(newWeapons)
      expect(mockForm2.attachedWeapons).toBe(newWeapons)
    })

    it('should not set if newAttachedWeapons is null', () => {
      const original1 = mockForm1.attachedWeapons
      const original2 = mockForm2.attachedWeapons
      transformer.attachedWeapons = null
      expect(mockForm1.attachedWeapons).toBe(original1)
      expect(mockForm2.attachedWeapons).toBe(original2)
    })

    it('should not set if newAttachedWeapons is empty', () => {
      const original1 = mockForm1.attachedWeapons
      const original2 = mockForm2.attachedWeapons
      transformer.attachedWeapons = []
      expect(mockForm1.attachedWeapons).toBe(original1)
      expect(mockForm2.attachedWeapons).toBe(original2)
    })

    it('should not set if forms is empty', () => {
      const emptyTransformer = new Transformer([mockForm1])
      emptyTransformer.forms = []
      emptyTransformer.attachedWeapons = ['newWeapon']
      expect(mockForm1.attachedWeapons).toEqual([])
    })
  })

  describe('descriptionText getter', () => {
    it('should return current form description text', () => {
      expect(transformer.descriptionText).toBe('Form 1')
      transformer.formVariants.formsIdx = 1
      expect(transformer.descriptionText).toBe('Form 2')
    })
  })

  describe('tip getter and setter', () => {
    it('should get tip from current form', () => {
      expect(transformer.tip).toBe('Place form 1')
    })

    it('should set tip to all forms', () => {
      transformer.tip = 'New tip'
      expect(mockForm1.tip).toBe('New tip')
      expect(mockForm2.tip).toBe('New tip')
    })

    it('should not set if newTip is null', () => {
      const original1 = mockForm1.tip
      const original2 = mockForm2.tip
      transformer.tip = null
      expect(mockForm1.tip).toBe(original1)
      expect(mockForm2.tip).toBe(original2)
    })

    it('should not set if newTip is empty', () => {
      const original1 = mockForm1.tip
      const original2 = mockForm2.tip
      transformer.tip = ''
      expect(mockForm1.tip).toBe(original1)
      expect(mockForm2.tip).toBe(original2)
    })
  })

  describe('displacement getter and setter', () => {
    it('should get displacement from current form', () => {
      expect(transformer.displacement).toBe(4)
    })

    it('should not set displacement', () => {
      transformer.displacement = 20
      expect(transformer.displacement).toBe(4)
    })
  })

  describe('vulnerable getter and setter', () => {
    it('should get vulnerable from current form', () => {
      mockForm1.vulnerable = ['cell1']
      expect(transformer.vulnerable).toEqual(['cell1'])
    })

    it('should set vulnerable to all forms', () => {
      const newVulnerable = ['cell1', 'cell2']
      transformer.vulnerable = newVulnerable
      expect(mockForm1.vulnerable).toEqual(newVulnerable)
      expect(mockForm2.vulnerable).toEqual(newVulnerable)
    })

    it('should not set if newVulnerable is null', () => {
      const original1 = mockForm1.vulnerable
      transformer.vulnerable = null
      expect(mockForm1.vulnerable).toBe(original1)
    })
  })

  describe('hardened getter and setter', () => {
    it('should get hardened from current form', () => {
      mockForm1.hardened = ['cell1']
      expect(transformer.hardened).toEqual(['cell1'])
    })

    it('should set hardened to all forms', () => {
      const newHardened = ['cell1']
      transformer.hardened = newHardened
      expect(mockForm1.hardened).toEqual(newHardened)
      expect(mockForm2.hardened).toEqual(newHardened)
    })
  })

  describe('immune getter and setter', () => {
    it('should get immune from current form', () => {
      mockForm1.immune = ['cell1']
      expect(transformer.immune).toEqual(['cell1'])
    })

    it('should set immune to all forms', () => {
      const newImmune = ['cell1']
      transformer.immune = newImmune
      expect(mockForm1.immune).toEqual(newImmune)
      expect(mockForm2.immune).toEqual(newImmune)
    })
  })

  describe('description', () => {
    it('should return description from current form', () => {
      const result = transformer.description()
      expect(result).toBe('Form 1 Description')
      expect(mockForm1.description).toHaveBeenCalled()
    })
  })

  describe('protectionAgainst', () => {
    it('should return protection from current form', () => {
      const weapon = { name: 'cannon' }
      const result = transformer.protectionAgainst(weapon)
      expect(result).toBe('protected')
      expect(mockForm1.protectionAgainst).toHaveBeenCalledWith(weapon)
    })
  })

  describe('attachWeapon', () => {
    it('should call attachWeapon on current form', () => {
      const ammoBuilder = jest.fn()
      transformer.attachWeapon(ammoBuilder)
      expect(mockForm1.attachWeapon).toHaveBeenCalledWith(ammoBuilder)
    })
  })

  describe('variants', () => {
    it('should return formVariants', () => {
      const result = transformer.variants()
      expect(result).toBe(transformer.formVariants)
    })
  })

  describe('placeables', () => {
    it('should return placeables from formVariants', () => {
      transformer.variants().placeables = jest
        .fn()
        .mockReturnValue(['p1', 'p2'])
      const result = transformer.placeables()
      expect(result).toEqual(['p1', 'p2'])
    })
  })

  describe('sunkDescription', () => {
    it('should return sunk description from current form with default separator', () => {
      const result = transformer.sunkDescription()
      expect(result).toBe('Form 1 sunk')
      expect(mockForm1.sunkDescription).toHaveBeenCalledWith(' ')
    })

    it('should pass custom separator to current form', () => {
      transformer.sunkDescription('|')
      expect(mockForm1.sunkDescription).toHaveBeenCalledWith('|')
    })
  })

  describe('shipSunkDescriptions', () => {
    it('should return ship sunk descriptions from current form', () => {
      const result = transformer.shipSunkDescriptions()
      expect(result).toEqual(['desc1'])
      expect(mockForm1.shipSunkDescriptions).toHaveBeenCalled()
    })
  })

  describe('type', () => {
    it('should return T', () => {
      expect(transformer.type()).toBe('T')
    })
  })
})
