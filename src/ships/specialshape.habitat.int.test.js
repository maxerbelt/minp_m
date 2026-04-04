/* eslint-env jest */

/* global describe, it,   beforeEach, jest */

import { expect, jest } from '@jest/globals'
import { Installation, SpaceVessel } from '../terrains/space/js/spaceShapes.js'
import { space, asteroid } from '../terrains/space/js/space.js'
import { Hybrid } from './SpecialShapes.js'
import { SpecialCells, StandardCells } from './SubShape.js'
import { Mask } from '../grid/rectangle/mask.js'
import { Variant3 } from '../variants/Variant3.js'

const occupancyCoords = [
  [0, 0],
  [1, 0],
  [2, 0]
]
describe('Hybrid shape', () => {
  let towerCells
  let basementCells
  let habitat
  let basement
  let basement2
  let tower

  beforeEach(() => {
    basementCells = new SpecialCells(
      [[0, 0]],
      Installation.validator,
      Installation.zoneDetail,
      asteroid
    )
    towerCells = new StandardCells(
      SpaceVessel.validator,
      SpaceVessel.zoneDetail,
      space
    )
    habitat = new Hybrid(
      'Habitat',
      'H',
      'H',
      occupancyCoords,
      [towerCells, basementCells],
      'place Habitat lowest level on an asteroid and the upper levels in space.'
    )

    tower = Mask.fromCoordsSquare(
      [
        [1, 0],
        [2, 0]
      ],
      3
    )

    basement = Mask.fromCoordsSquare([[0, 0]], 3)
    basement2 = Mask.fromCoordsSquare([[0, 0]])
  })
  it('should produce variants with correct symmetries', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyOrbitType give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'
    const hb = habitat.board
    expect(hb.store.bitsPerCell).toBe(2)

    const orbit = hb.actions.orbit()
    expect(orbit).toBeDefined()
    expect(orbit.length).toBe(8)
    expect(typeof orbit[0]).toBe('bigint')
    const a = hb.actions

    const symmetries = hb.actions.symmetries
    expect(symmetries.length).toBe(4)
    expect(a.ascii(orbit[0])).toBe('211\n...\n...')
    expect(a.ascii(symmetries[0])).toBe('211\n...\n...')
    expect(a.ascii(symmetries[1])).toBe('2..\n1..\n1..')

    const symmetry = hb.actions.classifyOrbitType()
    expect(symmetry).toBe('O4R')
  })

  it('should produce variants that can be rotated', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyOrbitType give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'

    const variants = habitat.variants()
    expect(variants).toBeDefined()
    expect(variants).toBeInstanceOf(Variant3) //Asymmetric)

    expect(variants.list.length).toBe(4)
    const id = variants.list[0]
    expect(id).toBeInstanceOf(Mask)
    expect(id.toAsciiWith()).toBe('211')
    const rotate = variants.list[1]
    expect(rotate).toBeInstanceOf(Mask)
    expect(rotate.toAsciiWith()).toBe('2\n1\n1')
  })
  it('test assembleColorLayers', () => {
    expect(basement instanceof Mask).toBe(true)
    expect(basement.toAsciiWith()).toBe('1..\n...\n...')
    expect(basement.bits.toString(2)).toBe('1')
    expect(tower instanceof Mask).toBe(true)
    expect(tower.toAsciiWith()).toBe('.11\n...\n...')

    const assembleStore = tower.defaultStore(3, 3, 3)

    const assembled = assembleStore.assembleColorLayers(
      [tower.bits, basement.bits],
      3,
      3
    )

    const assembledMask = new Mask(3, 3, assembled, null, 3)
    expect(assembledMask.toAsciiWith()).toBe('211\n...\n...')
  })
  it('test assembleColorLayers inverted', () => {
    expect(basement instanceof Mask).toBe(true)
    expect(basement.toAsciiWith()).toBe('1..\n...\n...')
    expect(tower instanceof Mask).toBe(true)
    expect(tower.toAsciiWith()).toBe('.11\n...\n...')

    const assembleStore = tower.defaultStore(3, tower.width, tower.height)

    const assembled = assembleStore.assembleColorLayers(
      [basement.bits, tower.bits],
      3,
      3
    )

    const assembledMask = new Mask(3, 3, assembled, null, 3)

    expect(assembledMask.toAsciiWith()).toBe('122\n...\n...')
  })

  it('test addLayer', () => {
    expect(basement instanceof Mask).toBe(true)
    expect(typeof basement.bits).toBe('bigint')
    expect(basement.occupancy).toBe(1)
    expect(basement.width).toBe(3)
    expect(basement.height).toBe(3)
    expect(basement.toAsciiWith()).toBe('1..\n...\n...')

    expect(tower instanceof Mask).toBe(true)
    expect(typeof tower.bits).toBe('bigint')
    expect(tower.occupancy).toBe(2)
    expect(tower.width).toBe(3)
    expect(tower.height).toBe(3)
    expect(tower.store.bitsPerCell).toBe(1)
    expect(tower.toAsciiWith()).toBe('.11\n...\n...')

    tower.addLayers([basement])
    expect(tower instanceof Mask).toBe(true)
    expect(typeof tower.bits).toBe('bigint')
    expect(tower.width).toBe(3)
    expect(tower.height).toBe(3)
    expect(tower.store.width).toBe(3)
    expect(tower.store.height).toBe(3)
    expect(tower.store.bitsPerCell).toBe(2)
    expect(tower.store.size).toBe(9n)
    expect(tower.store.depth).toBe(3)
    expect(tower.toAsciiWith()).toBe('211\n...\n...')
    expect(tower.occupancy).toBe(3)
  })
  it('test addLayer resize', () => {
    expect(basement2 instanceof Mask).toBe(true)
    expect(typeof basement2.bits).toBe('bigint')
    expect(basement2.occupancy).toBe(1)
    expect(basement2.width).toBe(1)
    expect(basement2.height).toBe(1)
    expect(basement2.toAsciiWith()).toBe('1')

    expect(tower instanceof Mask).toBe(true)
    expect(typeof tower.bits).toBe('bigint')
    expect(tower.occupancy).toBe(2)
    expect(tower.width).toBe(3)
    expect(tower.height).toBe(3)
    expect(tower.store.bitsPerCell).toBe(1)
    expect(tower.toAsciiWith()).toBe('.11\n...\n...')

    tower.addLayers([basement])
    expect(tower instanceof Mask).toBe(true)
    expect(typeof tower.bits).toBe('bigint')
    expect(tower.width).toBe(3)
    expect(tower.height).toBe(3)
    expect(tower.store.width).toBe(3)
    expect(tower.store.height).toBe(3)
    expect(tower.store.bitsPerCell).toBe(2)
    expect(tower.store.size).toBe(9n)
    expect(tower.store.depth).toBe(3)
    expect(tower.toAsciiWith()).toBe('211\n...\n...')
    expect(tower.occupancy).toBe(3)
  })
  it('test addLayer inverted', () => {
    expect(basement instanceof Mask).toBe(true)
    expect(typeof basement.bits).toBe('bigint')
    expect(basement.occupancy).toBe(1)
    expect(basement.width).toBe(3)
    expect(basement.height).toBe(3)
    expect(basement.toAsciiWith()).toBe('1..\n...\n...')

    expect(tower instanceof Mask).toBe(true)
    expect(typeof tower.bits).toBe('bigint')
    expect(tower.occupancy).toBe(2)
    expect(tower.width).toBe(3)
    expect(tower.height).toBe(3)
    expect(tower.toAsciiWith()).toBe('.11\n...\n...')

    basement.addLayers([tower])
    expect(basement instanceof Mask).toBe(true)
    expect(typeof basement.bits).toBe('bigint')
    expect(basement.width).toBe(3)
    expect(basement.height).toBe(3)
    expect(basement.store.width).toBe(3)
    expect(basement.store.height).toBe(3)
    expect(basement.store.bitsPerCell).toBe(2)
    expect(basement.store.size).toBe(9n)
    expect(basement.store.depth).toBe(3)
    expect(basement.toAsciiWith()).toBe('122\n...\n...')
    expect(basement.occupancy).toBe(3)
  })
  it('should initialize with correct subGroups', () => {
    expect(habitat.subGroups).toBeDefined()
    expect(habitat.subGroups).toHaveLength(2)
    expect(habitat.subGroups[0]).toBeInstanceOf(StandardCells)
    expect(habitat.subGroups[1]).toBeInstanceOf(SpecialCells)
    const [standard, special] = habitat.subGroups
    const sb = standard.board

    expect(sb instanceof Mask).toBe(true)
    expect(typeof sb.bits).toBe('bigint')
    expect(sb.width).toBe(3)
    expect(sb.height).toBe(1)
    expect(sb.store.width).toBe(3)
    expect(sb.store.height).toBe(1)
    expect(sb.store.bitsPerCell).toBe(1)
    expect(sb.store.size).toBe(3n)
    expect(sb.store.depth).toBe(1) // 2
    expect(sb.toAsciiWith()).toBe('.11')

    const spb = special.board
    expect(spb instanceof Mask).toBe(true)
    expect(typeof spb.bits).toBe('bigint')
    expect(spb.width).toBe(3)
    expect(spb.height).toBe(1)
    expect(spb.store.width).toBe(3)
    expect(spb.store.height).toBe(1)
    expect(spb.store.bitsPerCell).toBe(1)
    expect(spb.store.size).toBe(3n)
    expect(spb.toAsciiWith()).toBe('1..')
  })

  it('should produce correct variants', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyOrbitType give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'

    expect(habitat.board.store.bitsPerCell).toBe(2)
    expect(habitat.subGroups).toHaveLength(2)
    expect(habitat.subGroups[0]).toBeInstanceOf(StandardCells)
    expect(habitat.subGroups[1]).toBeInstanceOf(SpecialCells)

    const orbit = habitat.board.actions.orbit()
    expect(orbit).toBeDefined()
    expect(orbit.length).toBe(8)
    expect(typeof orbit[0]).toBe('bigint')
    const a = habitat.board.actions

    const symmetries = habitat.board.actions.symmetries
    expect(symmetries.length).toBe(4)
    expect(a.ascii(orbit[0])).toBe('211\n...\n...')
    expect(habitat.board.store.bitsPerCell).toBe(2)
    // expect(temp.toString()).toBe('221\n..1\n...')

    expect(a.ascii(orbit[1])).toBe('2..\n1..\n1..')
    const symmetry = habitat.board.actions.classifyOrbitType()
    expect(symmetry).toBe('O4R')
    const variants = habitat.variants()
    expect(variants).toBeDefined()
    expect(variants).toBeInstanceOf(Variant3)

    expect(variants.standardGroup).toBeInstanceOf(StandardCells)
    expect(variants.specialGroups[0]).toBeInstanceOf(SpecialCells)
    expect(variants.list.length).toBe(4)

    expect(variants.list[0]).toBeInstanceOf(Mask)
    const sb = variants.standardGroup.board

    expect(sb instanceof Mask).toBe(true)
    expect(typeof sb.bits).toBe('bigint')
  })

  it('should initialize with correct board', () => {
    expect(habitat.board).toBeDefined()
    expect(habitat.board instanceof Mask).toBe(true)
    expect(typeof habitat.board.bits).toBe('bigint')
    expect(habitat.board.width).toBe(3)
    expect(habitat.board.height).toBe(1)
    expect(habitat.board.store.width).toBe(3)
    expect(habitat.board.store.height).toBe(1)

    expect(habitat.board.store.bitsPerCell).toBe(2)
    expect(habitat.board.store.size).toBe(3n)
    expect(habitat.board.store.depth).toBe(3)
    expect(habitat.board.toAsciiWith()).toBe('211')
    expect(habitat.board.occupancy).toBe(3)
    expect(habitat.board.depth).toBe(3)
  })
})
