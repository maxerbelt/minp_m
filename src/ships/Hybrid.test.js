/* eslint-env jest */

/* global describe, it, expect, beforeEach, jest */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Variables for dynamically imported modules
let Hybrid, mixed, Variant3

beforeEach(async () => {
  const specialShapesModule = await import('./Hybrid.js')
  Hybrid = specialShapesModule.Hybrid

  const terrainModule = await import('../terrains/all/js/terrain.js')
  mixed = terrainModule.mixed

  const variant3Module = await import('../variants/Variant3.js')
  Variant3 = variant3Module.Variant3

  jest.clearAllMocks()
})
describe('Hybrid', () => {
  let mockSubGroup1
  let mockSubGroup2
  let mockSubGroups
  let hybrid

  beforeEach(() => {
    jest.clearAllMocks()

    mockSubGroup1 = {
      cells: [
        [0, 0],
        [1, 1]
      ],
      board: {
        bits: 65n,
        occupancy: 2,
        expand: jest.fn((_w, _h) => ({
          occupancy: 2,
          bits: 65n,
          expand: jest.fn((_w, _h) => ({
            occupancy: 2,
            bits: 65n
          })),
          addLayers: jest.fn()
        })),
        addLayers: jest.fn()
      },
      subterrain: { title: 'Water' },
      faction: 0,
      setBoardFromSecondary: jest.fn()
    }

    mockSubGroup2 = {
      cells: [
        [2, 2],
        [3, 3],
        [4, 4]
      ],
      board: {
        bits: 68736258048n,
        occupancy: 3,
        expand: jest.fn((_w, _h) => ({ occupancy: 3, bits: 68736258048n })),
        addLayers: jest.fn()
      },
      subterrain: { title: 'Land' },
      faction: 0,
      setBoardFromSecondary: jest.fn()
    }

    mockSubGroups = [mockSubGroup1, mockSubGroup2]

    hybrid = new Hybrid(
      'Custom Hybrid',
      'H',
      'D',
      [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4]
      ],
      mockSubGroups,
      'Custom tip',
      {}
    )
  })

  describe('constructor', () => {
    it('should initialize with provided properties', () => {
      expect(hybrid.letter).toBe('H')
      expect(hybrid.symmetry).toBe('D')
      expect(hybrid.area).toBe(5)
    })

    it('should set primary to first subgroup', () => {
      expect(hybrid.primary).toBe(mockSubGroup1)
    })

    it('should set secondary to second subgroup', () => {
      expect(hybrid.secondary).toBe(mockSubGroup2)
    })

    it('should call setBoardFromSecondary on primary', () => {
      expect(mockSubGroup1.setBoardFromSecondary).toHaveBeenCalledWith(
        hybrid.board,
        mockSubGroup2.board
      )
    })

    it('should store all subGroups', () => {
      expect(hybrid.subGroups).toEqual(mockSubGroups)
    })

    it('should calculate faction for each subgroup', () => {
      expect(mockSubGroup1.faction).toBe(0.4)
      expect(mockSubGroup2.faction).toBe(0.6)
    })

    it('should set description text', () => {
      expect(hybrid.descriptionText).toBe('Custom Hybrid')
    })

    it('should set subterrain to mixed', () => {
      expect(hybrid.subterrain).toBe(mixed)
    })

    it('should set group to X', () => {
      expect(hybrid.tallyGroup).toBe('X')
    })

    it('should use custom tip if provided', () => {
      const customHybrid = new Hybrid(
        'Test',
        'T',
        'D',
        [[0, 0]],
        [mockSubGroup1],
        'Custom Tip',
        {}
      )
      expect(customHybrid.tip).toBe('Custom Tip')
    })

    it('should use default tip if not provided', () => {
      const defaultHybrid = new Hybrid(
        'Default Test',
        'T',
        'D',
        [[0, 0]],
        [mockSubGroup1],
        null,
        {}
      )
      expect(defaultHybrid.tip).toContain('Default Test')
    })
  })

  describe('displacementFor', () => {
    it('should calculate displacement for matching subterrain', () => {
      const subterrain = mockSubGroup1.subterrain
      const result = hybrid.displacementFor(subterrain)
      expect(result).toBe(6.800000000000001)
    })

    it('should calculate displacement for different subterrain', () => {
      const subterrain = mockSubGroup2.subterrain
      const result = hybrid.displacementFor(subterrain)
      expect(result).toBe(10.2)
    })

    it('should return 0 if no matching subterrain', () => {
      const subterrain = { title: 'Sky' }
      const result = hybrid.displacementFor(subterrain)
      expect(result).toBe(0)
    })

    it('should handle multiple matching groups', () => {
      const subterrain = { title: 'Water' }
      mockSubGroup1.subterrain = subterrain
      mockSubGroup2.subterrain = subterrain
      const result = hybrid.displacementFor(subterrain)
      expect(result).toBe(17)
    })

    it('should handle zero displacement', () => {
      const result = hybrid.displacementFor({ title: 'Water' })
      expect(result).toBe(0)
    })
  })

  describe('variants', () => {
    it('should return Variant3 instance', () => {
      const variant = hybrid.variants()
      expect(variant).toBeInstanceOf(Variant3)
    })

    it('should create variants with correct parameters', () => {
      const variant = hybrid.variants()
      expect(variant.symmetry).toBe('D')
      expect(variant.list.length).toBe(8)
      expect(variant.standardGroup.board.occupancy).toEqual(2)
      expect(variant.specialGroups[0].board.occupancy).toEqual(3)
    })
  })

  describe('type', () => {
    it('should return M', () => {
      expect(hybrid.type()).toBe('M')
    })
  })

  describe('sunkDescription', () => {
    it('should return Destroyed', () => {
      expect(hybrid.sunkDescription()).toBe('Destroyed')
    })

    it('should ignore separator parameter', () => {
      expect(hybrid.sunkDescription('|')).toBe('Destroyed')
    })
  })

  describe('description', () => {
    it('should return description text', () => {
      expect(hybrid.description()).toBe('Custom Hybrid')
    })

    it('should return custom description if set', () => {
      hybrid.descriptionText = 'New Description'
      expect(hybrid.description()).toBe('New Description')
    })
  })

  describe('integration scenarios', () => {
    it('should handle hybrid with different faction weights', () => {
      const group1 = {
        cells: [[0, 0]],
        board: {
          occupancy: 1,
          bits: 1n,
          expand: jest.fn((_w, _h) => ({ occupancy: 1, bits: 1n }))
        },
        subterrain: { title: 'Water' },
        faction: 0,
        setBoardFromSecondary: jest.fn()
      }
      const group2 = {
        cells: [
          [1, 1],
          [2, 2],
          [3, 3]
        ],
        board: {
          occupancy: 3,
          bits: 4239n,
          expand: jest.fn((_w, _h) => ({ occupancy: 3, bits: 4239n }))
        },
        subterrain: { title: 'Land' },
        faction: 0,
        setBoardFromSecondary: jest.fn()
      }
      const h = new Hybrid(
        'Test',
        'T',
        'D',
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [3, 3]
        ],
        [group1, group2],
        null,
        {}
      )
      expect(group1.faction).toBe(0.25)
      expect(group2.faction).toBe(0.75)
    })

    it('should handle single subgroup', () => {
      const group = {
        cells: [[0, 0]],
        board: {
          occupancy: 1,
          bits: 1n,
          expand: jest.fn((_w, _h) => ({ occupancy: 1, bits: 1n }))
        },

        subterrain: { title: 'Water' },
        faction: 0,
        setBoardFromSecondary: jest.fn()
      }
      const h = new Hybrid('Single', 'S', 'D', [[0, 0]], [group], null, {})
      expect(h.primary).toBe(group)
      expect(h.secondary).toBe(undefined)
      expect(group.faction).toBe(1)
    })

    it('should calculate displacement correctly with multiple calls', () => {
      const water = mockSubGroup1.subterrain
      const land = mockSubGroup2.subterrain
      const waterDisp = hybrid.displacementFor(water)
      const landDisp = hybrid.displacementFor(land)
      expect(waterDisp + landDisp).toBe(17)
    })
  })
})
