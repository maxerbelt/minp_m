/* eslint-env jest */

/* global describe, it, expect, beforeEach, jest */

import { expect, jest } from '@jest/globals'

jest.unstable_mockModule('../terrains/all/js/bh.js', () => ({
  bh: {
    terrain: {
      ships: {
        types: { B: 'Battleship', D: 'Destroyer', S: 'Submarine' },
        colors: { B: '#0066cc', D: '#0099ff', S: '#66ccff' },
        letterColors: { B: 'blue', D: 'light-blue', S: 'cyan' },
        description: {
          B: 'A powerful battleship',
          D: 'A quick destroyer',
          S: 'A stealthy submarine'
        },
        shipSunkDescriptions: {
          Battleship: 'The battleship has sunk',
          Destroyer: 'The destroyer has sunk',
          Submarine: 'The submarine has sunk'
        }
      }
    }
  }
}))

jest.unstable_mockModule('../utilities.js', () => ({
  makeKey: jest.fn((r, c) => `${r},${c}`),
  lazy: jest.fn((obj, prop, fn) => {
    Object.defineProperty(obj, prop, {
      get: function () {
        if (!this._lazy) this._lazy = {}
        if (!(prop in this._lazy)) {
          this._lazy[prop] = fn.call(this)
        }
        return this._lazy[prop]
      }
    })
  }),
  minMaxXY: jest.fn(arr => {
    let minX = Infinity,
      minY = Infinity,
      hasColor = false
    let maxX = -Infinity,
      maxY = -Infinity,
      depth = -Infinity
    if (!arr || arr.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, depth: 2, hasColor: false }
    }
    for (const element of arr) {
      const x = element[0]
      const y = element[1]
      const z = element.at ? element.at(2) : element[2]

      if (x < minX) minX = x
      if (x > maxX) maxX = x

      if (y < minY) minY = y
      if (y > maxY) maxY = y

      if (z && z > depth) depth = z
    }
    if (depth === -Infinity) {
      depth = 2
    } else {
      hasColor = true
      depth += 1
    }
    return { minX, maxX, minY, maxY, depth, hasColor }
  }),
  randomElement: jest.fn(array => array[0])
}))

jest.unstable_mockModule('../variants/Invariant.js', () => ({
  Invariant: jest.fn().mockImplementation(() => ({
    numVariants: jest.fn().mockReturnValue(1),
    placeables: jest.fn().mockReturnValue([])
  }))
}))

jest.unstable_mockModule('../variants/Orbit4R.js', () => ({
  Orbit4R: jest.fn().mockImplementation(() => ({
    numVariants: jest.fn().mockReturnValue(4),
    placeables: jest.fn().mockReturnValue([])
  }))
}))

jest.unstable_mockModule('../variants/asymmetric.js', () => ({
  Asymmetric: jest.fn().mockImplementation(() => ({
    numVariants: jest.fn().mockReturnValue(4),
    placeables: jest.fn().mockReturnValue([])
  }))
}))

jest.unstable_mockModule('../variants/Diagonal.js', () => ({
  Diagonal: jest.fn().mockImplementation(() => ({
    numVariants: jest.fn().mockReturnValue(2),
    placeables: jest.fn().mockReturnValue([])
  }))
}))

jest.unstable_mockModule('../variants/Orbit4F.js', () => ({
  Orbit4F: jest.fn().mockImplementation(() => ({
    numVariants: jest.fn().mockReturnValue(4),
    placeables: jest.fn().mockReturnValue([])
  }))
}))

jest.unstable_mockModule('../variants/Blinker.js', () => ({
  Blinker: jest.fn().mockImplementation(() => ({
    numVariants: jest.fn().mockReturnValue(2),
    placeables: jest.fn().mockReturnValue([])
  }))
}))

jest.unstable_mockModule('../weapon/WeaponSystem.js', () => ({
  WeaponSystem: jest.fn().mockImplementation(weapon => ({ weapon }))
}))

const { Shape, token } = await import('./Shape.js')
const { Asymmetric } = await import('../variants/asymmetric.js')
const { Orbit4F } = await import('../variants/Orbit4F.js')
const { Invariant } = await import('../variants/Invariant.js')
const { Orbit4R } = await import('../variants/Orbit4R.js')
const { Blinker } = await import('../variants/Blinker.js')
const { Diagonal } = await import('../variants/Diagonal.js')
const { bh } = await import('../terrains/all/js/bh.js')

describe('Shape', () => {
  let mockCells
  let shape

  beforeEach(() => {
    jest.clearAllMocks()
    mockCells = [
      [0, 0],
      [0, 1],
      [0, 2]
    ]
    shape = new Shape(
      'B',
      'D',
      mockCells,
      'battleship',
      'A powerful battleship',
      null
    )
  })

  describe('token', () => {
    it('should export correct token', () => {
      expect(token).toBe('geoffs-hidden-battle')
    })
  })

  describe('constructor', () => {
    it('should initialize with basic properties', () => {
      expect(shape.letter).toBe('B')
      expect(shape.symmetry).toBe('D')
      expect(shape.cells).toEqual(mockCells)
      expect(shape.tip).toBe('A powerful battleship')
      expect(shape.tallyGroup).toBe('battleship')
    })

    it('should initialize with null racks when racks is null', () => {
      expect(shape.racks).toBeNull()
      expect(shape.canAttachWeapons).toBeFalsy()
    })

    it('should initialize with Set of racks when racks is array', () => {
      const racks = [
        [1, 2],
        [1, 3]
      ]
      const shapeWithRacks = new Shape(
        'G',
        'S',
        mockCells,
        'gunboat',
        'tip',
        racks
      )
      expect(shapeWithRacks.racks instanceof Set).toBe(true)
      expect(shapeWithRacks.racks.size).toBe(2)
      expect(shapeWithRacks.canAttachWeapons).toBe(true)
    })

    it('should initialize with empty racks when racks is empty array', () => {
      const shapeNoRacks = new Shape('A', 'H', mockCells, 'group', 'tip', [])
      expect(shapeNoRacks.racks instanceof Set).toBe(true)
      expect(shapeNoRacks.racks.size).toBe(0)
      expect(shapeNoRacks.canAttachWeapons).toBe(false)
    })

    it('should set default values for other properties', () => {
      expect(shape.isAttachedToRack).toBe(false)
      expect(shape.subterrain).toBeNull()
      expect(shape.validator).toBe(Function.prototype)
      expect(shape.zoneDetail).toBe(0)
      expect(shape.vulnerable).toEqual([])
      expect(shape.hardened).toEqual([])
      expect(shape.immune).toEqual([])
      expect(shape.attachedWeapons).toEqual({})
    })

    it('should calculate displacement from cells and footprint', () => {
      // area = 3, footprint will be dilated by 1 cell in all directions
      // For 3 horizontal cells at [0,0],[0,1],[0,2], dilation creates 15 cells

      expect(shape.displacement).toBe((3 + 15) / 2)
    })

    it('should get terrain from bh', () => {
      expect(shape.terrain).toBe(bh.terrain)
    })
  })

  describe('canBeOn', () => {
    it('should return true if subterrain matches', () => {
      shape.subterrain = 'water'
      expect(shape.canBeOn('water')).toBe(true)
    })

    it('should return false if subterrain does not match', () => {
      shape.subterrain = 'water'
      expect(shape.canBeOn('land')).toBe(false)
    })

    it('should handle null subterrain', () => {
      shape.subterrain = null
      expect(shape.canBeOn('water')).toBe(false)
    })
  })

  describe('protectionAgainst', () => {
    it('should return 3 for immune weapons', () => {
      const weapon = { id: 'gun' }
      shape.immune = [weapon]
      expect(shape.protectionAgainst(weapon)).toBe(3)
    })

    it('should return 2 for hardened weapons', () => {
      const weapon = { id: 'missile' }
      shape.hardened = [weapon]
      expect(shape.protectionAgainst(weapon)).toBe(2)
    })

    it('should return 0 for vulnerable weapons', () => {
      const weapon = { id: 'torpedo' }
      shape.vulnerable = [weapon]
      expect(shape.protectionAgainst(weapon)).toBe(0)
    })

    it('should return 1 for neutral weapons', () => {
      const weapon = { id: 'laser' }
      expect(shape.protectionAgainst(weapon)).toBe(1)
    })

    it('should prioritize immune over other categories', () => {
      const weapon = { id: 'weapon' }
      shape.immune = [weapon]
      shape.hardened = [weapon]
      shape.vulnerable = [weapon]
      expect(shape.protectionAgainst(weapon)).toBe(3)
    })

    it('should prioritize hardened over vulnerable', () => {
      const weapon = { id: 'weapon' }
      shape.hardened = [weapon]
      shape.vulnerable = [weapon]
      expect(shape.protectionAgainst(weapon)).toBe(2)
    })
  })

  describe('attachWeapon', () => {
    it('should attach weapon when conditions are met', () => {
      const racks = [
        [1, 2],
        [1, 3]
      ]
      const shapeWithRacks = new Shape(
        'G',
        'S',
        mockCells,
        'gunboat',
        'tip',
        racks
      )

      const ammoBuilder = jest.fn().mockReturnValue({ ammo: 10 })
      const result = shapeWithRacks.attachWeapon(ammoBuilder)

      expect(shapeWithRacks.isAttachedToRack).toBe(true)
      expect(ammoBuilder).toHaveBeenCalledTimes(2) // Called for each rack
      expect(result['1,2']).toEqual({ ammo: 10 })
      expect(result['1,3']).toEqual({ ammo: 10 })
    })

    it('should throw error when cannot attach weapons', () => {
      const ammoBuilder = jest.fn()
      expect(() => {
        shape.attachWeapon(ammoBuilder)
      }).toThrow('Cannot attach weapon to shape B')
    })

    it('should throw error when weapon already attached', () => {
      const racks = [[1, 2]]
      const shapeWithRacks = new Shape(
        'G',
        'S',
        mockCells,
        'gunboat',
        'tip',
        racks
      )
      const ammoBuilder = jest.fn().mockReturnValue({ ammo: 10 })

      shapeWithRacks.attachWeapon(ammoBuilder)
      expect(() => {
        shapeWithRacks.attachWeapon(ammoBuilder)
      }).toThrow('Weapon already attached to shape G')
    })
  })

  describe('weaponSystem', () => {
    it('should return empty object when no weapons attached', () => {
      expect(shape.weaponSystem).toEqual({})
    })

    it('should convert attached weapons to WeaponSystem objects', () => {
      const racks = [
        [1, 2],
        [1, 3]
      ]
      const shapeWithRacks = new Shape(
        'G',
        'S',
        mockCells,
        'gunboat',
        'tip',
        racks
      )
      const ammoBuilder = jest.fn().mockReturnValue({ ammo: 10 })

      shapeWithRacks.attachWeapon(ammoBuilder)
      const weaponSystem = shapeWithRacks.weaponSystem

      expect(Object.keys(weaponSystem)).toHaveLength(2)
      expect(weaponSystem['1,2'].weapon).toEqual({ ammo: 10 })
      expect(weaponSystem['1,3'].weapon).toEqual({ ammo: 10 })
    })

    it('should return empty object when attachedWeapons is null', () => {
      shape.attachedWeapons = null
      expect(shape.weaponSystem).toEqual({})
    })
  })

  describe('variants', () => {
    it('should create Asymmetric for D symmetry', () => {
      shape.variants()
      expect(Asymmetric).toHaveBeenCalledWith(
        expect.any(Object),
        Function.prototype,
        0
      )
    })

    it('should create Orbit4F for A symmetry', () => {
      const shapeA = new Shape('B', 'A', mockCells, 'battleship', 'tip', null)
      shapeA.variants()
      expect(Orbit4F).toHaveBeenCalledWith(
        expect.any(Object),
        Function.prototype,
        0
      )
    })

    it('should create Invariant for S symmetry', () => {
      const shapeS = new Shape('B', 'S', mockCells, 'battleship', 'tip', null)
      shapeS.variants()
      expect(Invariant).toHaveBeenCalledWith(
        expect.any(Object),
        Function.prototype,
        0
      )
    })

    it('should create Orbit4R for H symmetry', () => {
      const shapeH = new Shape('B', 'H', mockCells, 'battleship', 'tip', null)
      shapeH.variants()
      expect(Orbit4R).toHaveBeenCalledWith(
        expect.any(Object),
        Function.prototype,
        0
      )
    })

    it('should create Blinker for L symmetry', () => {
      const shapeL = new Shape('B', 'L', mockCells, 'battleship', 'tip', null)
      shapeL.variants()
      expect(Blinker).toHaveBeenCalledWith(
        expect.any(Object),
        Function.prototype,
        0
      )
    })

    it('should create Diagonal for G symmetry', () => {
      const shapeG = new Shape('B', 'G', mockCells, 'battleship', 'tip', null)
      shapeG.variants()
      expect(Diagonal).toHaveBeenCalledWith(
        expect.any(Object),
        Function.prototype,
        0
      )
    })

    it('should throw error for unknown symmetry', () => {
      const shapeUnknown = new Shape(
        'B',
        'X',
        mockCells,
        'battleship',
        'tip',
        null
      )
      expect(() => {
        shapeUnknown.variants()
      }).toThrow('Unknown symmetry type')
    })

    it('should pass validator and zoneDetail to variant constructor', () => {
      shape.validator = jest.fn()
      shape.zoneDetail = 5
      shape.variants()
      expect(Asymmetric).toHaveBeenCalledWith(
        expect.any(Object),
        shape.validator,
        5
      )
    })
  })

  describe('numVariants', () => {
    it('should return number of variants from variant class', () => {
      shape.symmetry = 'D' // Asymmetric returns 4
      expect(shape.numVariants()).toBe(4)
    })

    it('should return 4 for Orbit4F (A symmetry)', () => {
      const shapeA = new Shape('B', 'A', mockCells, 'battleship', 'tip', null)
      expect(shapeA.numVariants()).toBe(4)
    })

    it('should return 1 for Invariant (S symmetry)', () => {
      const shapeS = new Shape('B', 'S', mockCells, 'battleship', 'tip', null)
      expect(shapeS.numVariants()).toBe(1)
    })
  })

  describe('placeables', () => {
    it('should return placeables from variant class', () => {
      const result = shape.placeables()
      expect(result).toEqual([])
    })
  })

  describe('type', () => {
    it('should return type for ship letter', () => {
      expect(shape.type()).toBe('Battleship')
    })

    it('should handle different letters', () => {
      const shapeD = new Shape('D', 'D', mockCells, 'destroyer', 'tip', null)
      expect(shapeD.type()).toBe('Destroyer')
    })

    it('should return undefined for unknown letter', () => {
      const shapeX = new Shape('X', 'D', mockCells, 'unknown', 'tip', null)
      expect(shapeX.type()).toBeUndefined()
    })
  })

  describe('color', () => {
    it('should return color for ship letter', () => {
      expect(shape.color()).toBe('#0066cc')
    })

    it('should handle different letters', () => {
      const shapeD = new Shape('D', 'D', mockCells, 'destroyer', 'tip', null)
      expect(shapeD.color()).toBe('#0099ff')
    })
  })

  describe('letterColors', () => {
    it('should return letter colors for ship letter', () => {
      expect(shape.letterColors()).toBe('blue')
    })

    it('should handle different letters', () => {
      const shapeS = new Shape('S', 'D', mockCells, 'submarine', 'tip', null)
      expect(shapeS.letterColors()).toBe('cyan')
    })
  })

  describe('description', () => {
    it('should return description for ship letter', () => {
      expect(shape.description()).toBe('A powerful battleship')
    })

    it('should handle different letters', () => {
      const shapeD = new Shape('D', 'D', mockCells, 'destroyer', 'tip', null)
      expect(shapeD.description()).toBe('A quick destroyer')
    })
  })

  describe('shipSunkDescriptions', () => {
    it('should return sunk description for ship type', () => {
      expect(shape.shipSunkDescriptions()).toBe('The battleship has sunk')
    })

    it('should use type to get sunk description', () => {
      const shapeD = new Shape('D', 'D', mockCells, 'destroyer', 'tip', null)
      expect(shapeD.shipSunkDescriptions()).toBe('The destroyer has sunk')
    })
  })

  describe('sunkDescription', () => {
    it('should combine description and sunk description with default separator', () => {
      const result = shape.sunkDescription()
      expect(result).toBe('A powerful battleship The battleship has sunk')
    })

    it('should combine descriptions with custom separator', () => {
      const result = shape.sunkDescription(' - ')
      expect(result).toBe('A powerful battleship - The battleship has sunk')
    })

    it('should use empty separator when specified', () => {
      const result = shape.sunkDescription('')
      expect(result).toBe('A powerful battleshipThe battleship has sunk')
    })
  })

  describe('integration', () => {
    it('should handle shape with multiple properties', () => {
      const racks = [
        [2, 0],
        [2, 2]
      ]
      const complexShape = new Shape(
        'C',
        'H',
        [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1]
        ],
        'cruiser',
        'A fast cruiser',
        racks
      )

      expect(complexShape.letter).toBe('C')
      expect(complexShape.canAttachWeapons).toBe(true)
      expect(complexShape.racks.size).toBe(2)
      expect(complexShape.numVariants()).toBe(4)
    })

    it('should track weapon attachment state', () => {
      const racks = [[0, 0]]
      const weaponShape = new Shape(
        'G',
        'S',
        mockCells,
        'gunboat',
        'tip',
        racks
      )

      expect(weaponShape.isAttachedToRack).toBe(false)
      const ammoBuilder = jest.fn().mockReturnValue({ caliber: 76 })
      weaponShape.attachWeapon(ammoBuilder)
      expect(weaponShape.isAttachedToRack).toBe(true)
    })

    it('should allow modification of protection lists', () => {
      const weapon = { id: 'gun' }
      shape.vulnerable.push(weapon)
      expect(shape.protectionAgainst(weapon)).toBe(0)

      shape.vulnerable = []
      shape.hardened.push(weapon)
      expect(shape.protectionAgainst(weapon)).toBe(2)
    })
  })

  describe('constructor - additional edge cases', () => {
    it('should handle single cell shape', () => {
      const singleCell = [[5, 5]]
      const smallShape = new Shape(
        'P',
        'S',
        singleCell,
        'probe',
        'A small probe',
        null
      )
      expect(smallShape.cells).toEqual(singleCell)
      // Single cell dilates to 3x3 grid = 9 cells
      expect(smallShape.displacement).toBe((1 + 9) / 2)
    })

    it('should handle large number of cells', () => {
      const largeCells = []
      for (let i = 0; i < 100; i++) {
        largeCells.push([i, i])
      }
      const largeShape = new Shape(
        'M',
        'D',
        largeCells,
        'massive',
        'A massive shape',
        null
      )
      expect(largeShape.cells.length).toBe(100)
      expect(largeShape.displacement).toBeGreaterThan(0)
    })

    it('should properly initialize racks when passing empty Set', () => {
      const shapeWithEmptySet = new Shape(
        'A',
        'S',
        mockCells,
        'group',
        'tip',
        []
      )
      expect(shapeWithEmptySet.racks.size).toBe(0)
      expect(shapeWithEmptySet.canAttachWeapons).toBe(false)
    })

    it('should deduplicate racks with duplicate coordinates', () => {
      const duplicateRacks = [
        [1, 1],
        [1, 1],
        [2, 2]
      ]
      const shapeWithDupes = new Shape(
        'D',
        'D',
        mockCells,
        'destroyer',
        'tip',
        duplicateRacks
      )
      // Set automatically deduplicates
      expect(shapeWithDupes.racks.size).toBe(2)
    })
  })

  describe('displacement calculation - variations', () => {
    it('should calculate correct displacement for 2-cell shape', () => {
      const twoCells = [
        [0, 0],
        [0, 1]
      ]
      const shape2 = new Shape('X', 'S', twoCells, 'group', 'tip', null)
      // area = 2, footprint will be dilated
      expect(shape2.displacement).toBe((2 + 12) / 2)
    })

    it('should calculate correct displacement for 5-cell shape', () => {
      const fiveCells = [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
        [2, 0]
      ]
      const shape5 = new Shape('Y', 'H', fiveCells, 'group', 'tip', null)

      expect(shape5.board.toAsciiWith()).toBe('111\n11.')
      expect(shape5.board.width).toBe(3)
      expect(shape5.board.height).toBe(2)
      expect(shape5.board.store.width).toBe(3)
      expect(shape5.board.store.height).toBe(2)
      expect(shape5.footBoard.width).toBe(5)
      expect(shape5.footBoard.height).toBe(4)
      expect(shape5.footBoard.store.width).toBe(5)
      expect(shape5.footBoard.store.height).toBe(4)
      expect(shape5.footBoard.toAsciiWith()).toBe('11111\n11111\n11111\n1111.')
      expect(shape5.footPrint).toEqual(19)
      // area = 5, footprint will be dilated to 19 cells
      expect(shape5.displacement).toBe((5 + 19) / 2)
    })
  })

  describe('attachWeapon - additional scenarios', () => {
    it('should create separate ammo objects for each rack', () => {
      const racks = [
        [0, 0],
        [1, 1],
        [2, 2]
      ]
      const shapeMultiRack = new Shape(
        'M',
        'S',
        mockCells,
        'multi',
        'tip',
        racks
      )

      const ammoBuilder = jest
        .fn()
        .mockReturnValueOnce({ ammo: 10 })
        .mockReturnValueOnce({ ammo: 20 })
        .mockReturnValueOnce({ ammo: 30 })

      const result = shapeMultiRack.attachWeapon(ammoBuilder)

      expect(Object.keys(result)).toHaveLength(3)
      expect(ammoBuilder).toHaveBeenCalledTimes(3)
    })

    it('should preserve ammo builder state across racks', () => {
      const racks = [
        [1, 0],
        [1, 1]
      ]
      const shapeWithRacks = new Shape(
        'R',
        'D',
        mockCells,
        'racks',
        'tip',
        racks
      )

      const sharedObject = { sharedState: 0 }
      const ammoBuilder = jest.fn(() => sharedObject)

      shapeWithRacks.attachWeapon(ammoBuilder)
      const weapons = shapeWithRacks.attachedWeapons

      // Both racks should reference the same object reference
      expect(Object.values(weapons)[0]).toBe(sharedObject)
      expect(Object.values(weapons)[1]).toBe(sharedObject)
    })

    it('should maintain weapon attachment state after multiple calls to weaponSystem', () => {
      const racks = [[0, 0]]
      const shapeWithRacks = new Shape(
        'S',
        'S',
        mockCells,
        'state',
        'tip',
        racks
      )

      const ammoBuilder = jest.fn().mockReturnValue({ ammo: 5 })
      shapeWithRacks.attachWeapon(ammoBuilder)

      const ws1 = shapeWithRacks.weaponSystem
      const ws2 = shapeWithRacks.weaponSystem

      expect(Object.keys(ws1)).toHaveLength(1)
      expect(Object.keys(ws2)).toHaveLength(1)
      expect(shapeWithRacks.isAttachedToRack).toBe(true)
    })
  })

  describe('weaponSystem - edge cases', () => {
    it('should handle shape with single rack', () => {
      const racks = [[5, 5]]
      const singleRackShape = new Shape(
        'U',
        'A',
        mockCells,
        'single',
        'tip',
        racks
      )

      const ammoBuilder = jest.fn().mockReturnValue({ power: 100 })
      singleRackShape.attachWeapon(ammoBuilder)
      const ws = singleRackShape.weaponSystem

      expect(Object.keys(ws)).toHaveLength(1)
      expect(ws['5,5'].weapon).toEqual({ power: 100 })
    })

    it('should maintain consistent key mapping between attachedWeapons and weaponSystem', () => {
      const racks = [
        [0, 1],
        [0, 2],
        [0, 3]
      ]
      const coordShape = new Shape('C', 'D', mockCells, 'coord', 'tip', racks)

      const ammoBuilder = jest.fn().mockReturnValue({ test: 'weapon' })
      coordShape.attachWeapon(ammoBuilder)

      const weaponSys = coordShape.weaponSystem
      const weaponKeys = Object.keys(weaponSys)
      const attachedKeys = Object.keys(coordShape.attachedWeapons)

      expect(weaponKeys).toEqual(attachedKeys)
    })
  })

  describe('variants - with custom validators and zoneDetails', () => {
    it('should pass updated zoneDetail to variant constructors', () => {
      const zones = [0, 1, 5, 10, -1]
      zones.forEach(zoneValue => {
        jest.clearAllMocks()
        const testShape = new Shape('Z', 'D', mockCells, 'zone', 'tip', null)
        testShape.zoneDetail = zoneValue
        testShape.variants()
        expect(Asymmetric).toHaveBeenCalledWith(
          expect.any(Object),
          Function.prototype,
          zoneValue
        )
      })
    })

    it('should pass custom validator function to variants', () => {
      const customValidator = jest.fn()
      const validatorShape = new Shape(
        'V',
        'S',
        mockCells,
        'valid',
        'tip',
        null
      )
      validatorShape.validator = customValidator
      validatorShape.variants()
      expect(Invariant).toHaveBeenCalledWith(
        expect.any(Object),
        customValidator,
        0
      )
    })

    it('should call placeables on variant object', () => {
      const result = shape.placeables()
      expect(result).toBeDefined()
    })
  })

  describe('protection system - comprehensive scenarios', () => {
    it('should return correct values with all categories populated', () => {
      const w1 = { id: 1 }
      const w2 = { id: 2 }
      const w3 = { id: 3 }
      const w4 = { id: 4 }

      shape.immune = [w1]
      shape.hardened = [w2]
      shape.vulnerable = [w3]

      expect(shape.protectionAgainst(w1)).toBe(3) // immune
      expect(shape.protectionAgainst(w2)).toBe(2) // hardened
      expect(shape.protectionAgainst(w3)).toBe(0) // vulnerable
      expect(shape.protectionAgainst(w4)).toBe(1) // neutral
    })

    it('should handle weapons in multiple categories correctly', () => {
      const weapon = { id: 'multi' }

      // Test that immune takes precedence
      shape.immune.push(weapon)
      shape.hardened.push(weapon)
      expect(shape.protectionAgainst(weapon)).toBe(3)

      // Reset and test hardened precedence
      jest.clearAllMocks()
      shape = new Shape(
        'B',
        'D',
        mockCells,
        'battleship',
        'A powerful battleship',
        null
      )
      shape.hardened.push(weapon)
      shape.vulnerable.push(weapon)
      expect(shape.protectionAgainst(weapon)).toBe(2)
    })

    it('should handle empty weapon lists', () => {
      const weapon = { id: 'test' }
      expect(shape.immune.length).toBe(0)
      expect(shape.hardened.length).toBe(0)
      expect(shape.vulnerable.length).toBe(0)
      expect(shape.protectionAgainst(weapon)).toBe(1)
    })
  })

  describe('canBeOn - comprehensive scenarios', () => {
    it('should handle multiple subterrains correctly', () => {
      const terrains = ['water', 'land', 'air', 'underground']
      terrains.forEach(terrain => {
        shape.subterrain = terrain
        expect(shape.canBeOn(terrain)).toBe(true)
        terrains.forEach(other => {
          if (other !== terrain) {
            expect(shape.canBeOn(other)).toBe(false)
          }
        })
      })
    })

    it('should distinguish between null and undefined subterrain', () => {
      shape.subterrain = null
      expect(shape.canBeOn(null)).toBe(true) // null matches null
      expect(shape.canBeOn('water')).toBe(false)

      shape.subterrain = undefined
      expect(shape.canBeOn(undefined)).toBe(true) // undefined matches undefined
      expect(shape.canBeOn(null)).toBe(false)
    })
  })

  describe('description methods - empty terrain data', () => {
    it('should handle missing ship type gracefully', () => {
      const unknownShape = new Shape(
        'X',
        'D',
        mockCells,
        'unknown',
        'tip',
        null
      )
      expect(unknownShape.type()).toBeUndefined()
    })

    it('should handle missing descriptions', () => {
      // This tests behavior when terrain data is incomplete
      const shape1 = new Shape('B', 'D', mockCells, 'battleship', 'tip', null)
      expect(shape1.description()).toBeDefined()
    })
  })

  describe('symmetry variants - all types', () => {
    const symmetryTests = [
      { letter: 'B', symmetry: 'D', VariantClass: Asymmetric },
      { letter: 'C', symmetry: 'A', VariantClass: Orbit4F },
      { letter: 'D', symmetry: 'S', VariantClass: Invariant },
      { letter: 'E', symmetry: 'H', VariantClass: Orbit4R },
      { letter: 'F', symmetry: 'L', VariantClass: Blinker },
      { letter: 'G', symmetry: 'G', VariantClass: Diagonal }
    ]

    symmetryTests.forEach(({ letter, symmetry, VariantClass }) => {
      it(`should correctly instantiate ${VariantClass.name} for "${symmetry}" symmetry`, () => {
        jest.clearAllMocks()
        const testShape = new Shape(
          letter,
          symmetry,
          mockCells,
          'test',
          'tip',
          null
        )
        testShape.variants()
        expect(VariantClass).toHaveBeenCalled()
      })
    })
  })

  describe('numVariants - all symmetry types', () => {
    const variantCounts = [
      { symmetry: 'D', expectedCount: 4 },
      { symmetry: 'A', expectedCount: 4 },
      { symmetry: 'S', expectedCount: 1 },
      { symmetry: 'H', expectedCount: 4 },
      { symmetry: 'L', expectedCount: 2 },
      { symmetry: 'G', expectedCount: 2 }
    ]

    variantCounts.forEach(({ symmetry, expectedCount }) => {
      it(`should return ${expectedCount} variants for "${symmetry}" symmetry`, () => {
        const testShape = new Shape(
          'T',
          symmetry,
          mockCells,
          'test',
          'tip',
          null
        )
        expect(testShape.numVariants()).toBe(expectedCount)
      })
    })
  })

  describe('color and type lookups - all ship letters', () => {
    it('should return correct color for each defined letter', () => {
      const letters = ['B', 'D', 'S']
      const expectedColors = ['#0066cc', '#0099ff', '#66ccff']

      letters.forEach((letter, index) => {
        const testShape = new Shape(letter, 'D', mockCells, 'test', 'tip', null)
        expect(testShape.color()).toBe(expectedColors[index])
      })
    })

    it('should return correct type for each defined letter', () => {
      const letters = ['B', 'D', 'S']
      const expectedTypes = ['Battleship', 'Destroyer', 'Submarine']

      letters.forEach((letter, index) => {
        const testShape = new Shape(letter, 'D', mockCells, 'test', 'tip', null)
        expect(testShape.type()).toBe(expectedTypes[index])
      })
    })
  })

  describe('letterColors - all ship types', () => {
    it('should return correct letterColors for each letter', () => {
      const letterColorTests = [
        { letter: 'B', expected: 'blue' },
        { letter: 'D', expected: 'light-blue' },
        { letter: 'S', expected: 'cyan' }
      ]

      letterColorTests.forEach(({ letter, expected }) => {
        const testShape = new Shape(letter, 'D', mockCells, 'test', 'tip', null)
        expect(testShape.letterColors()).toBe(expected)
      })
    })
  })

  describe('sunkDescription - variations', () => {
    it('should handle special character separators', () => {
      const separators = [' | ', ' :: ', '\n', '\t', '']
      separators.forEach(sep => {
        const result = shape.sunkDescription(sep)
        expect(result).toContain(shape.description())
        expect(result).toContain(shape.shipSunkDescriptions())
      })
    })

    it('should maintain correct order (description then sunk)', () => {
      const result = shape.sunkDescription(' + ')
      const parts = result.split(' + ')
      expect(parts[0]).toBe(shape.description())
      expect(parts[1]).toBe(shape.shipSunkDescriptions())
    })
  })

  describe('state management', () => {
    it('should maintain independent state for different shape instances', () => {
      const shape1 = new Shape('B', 'D', mockCells, 'b', 'tip', null)
      const shape2 = new Shape('D', 'D', mockCells, 'd', 'tip', null)

      shape1.vulnerable.push({ id: 'test' })
      expect(shape2.vulnerable).toHaveLength(0)
    })

    it('should maintain protection state independently', () => {
      const shape1 = new Shape('B', 'D', mockCells, 'b', 'tip', null)
      const shape2 = new Shape('B', 'D', mockCells, 'b', 'tip', null)

      const weapon = { id: 'w' }
      shape1.immune.push(weapon)

      expect(shape1.protectionAgainst(weapon)).toBe(3)
      expect(shape2.protectionAgainst(weapon)).toBe(1)
    })

    it('should not share racks between instances', () => {
      const racks1 = [[0, 0]]
      const racks2 = [[1, 1]]

      const shape1 = new Shape('R', 'D', mockCells, 'r1', 'tip', racks1)
      const shape2 = new Shape('R', 'D', mockCells, 'r2', 'tip', racks2)

      expect(shape1.racks).not.toBe(shape2.racks)
      expect(shape1.racks.size).toBe(1)
      expect(shape2.racks.size).toBe(1)
    })
  })

  describe('constructor - duplicate beforeEach cleanup', () => {
    // Note: There were duplicate beforeEach blocks in the original test file
    // This test ensures state is properly reset between tests
    it('should have clean state for each test', () => {
      expect(shape.letter).toBe('B')
      expect(shape.isAttachedToRack).toBe(false)
      expect(shape.vulnerable).toEqual([])
    })
  })
})
