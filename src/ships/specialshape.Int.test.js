/* eslint-env jest */

/* global describe, it, expect, beforeEach, jest */

import { expect, jest } from '@jest/globals'
import { Building, SeaVessel } from '../terrains/sea/js/SeaShape.js'

import { Hybrid } from './SpecialShapes.js'
import { SpecialCells, StandardCells } from './SubShape.js'
import { Mask } from '../grid/rectangle/mask.js'
import { Variant3 } from '../variants/Variant3.js'
import { Placeable3 } from '../variants/Placeable3.js'
const occupancyCoords = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1]
]

describe('Hybrid shape', () => {
  let navalDockCells
  let navalPierCells
  let navalBase
  let navalPier
  let navalPier2
  let navalDock

  beforeEach(() => {
    navalPierCells = new SpecialCells(
      [
        [0, 0],
        [1, 0]
      ],
      SeaVessel.validator,
      SeaVessel.zoneDetail,
      SeaVessel.subterrain
    )

    navalDockCells = new StandardCells(
      Building.validator,
      Building.zoneDetail,
      Building.subterrain
    )
    navalBase = new Hybrid(
      'Naval Base',
      'N',
      'D',
      occupancyCoords,
      [navalDockCells, navalPierCells],
      'place Naval Base half on land and half on sea.'
    )

    navalDock = Mask.fromCoordsSquare(
      [
        [2, 0],
        [2, 1]
      ],
      3
    )

    navalPier = Mask.fromCoordsSquare(
      [
        [0, 0],
        [1, 0]
      ],
      3
    )
    navalPier2 = Mask.fromCoordsSquare([
      [0, 0],
      [1, 0]
    ])
  })
  it('should produce variants with correct symmetries', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyOrbitType give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'
    const nbb = navalBase.board
    expect(nbb.store.bitsPerCell).toBe(2)

    const orbit = nbb.actions.orbit()
    expect(orbit).toBeDefined()
    expect(orbit.length).toBe(8)
    expect(typeof orbit[0]).toBe('bigint')
    const a = nbb.actions

    const symmetries = nbb.actions.symmetries
    expect(symmetries.length).toBe(8)
    expect(a.ascii(orbit[0])).toBe('221\n..1\n...')
    expect(a.ascii(symmetries[0])).toBe('221\n..1\n...')
    expect(a.ascii(symmetries[1])).toBe('.2.\n.2.\n11.')
    expect(a.ascii(symmetries[2])).toBe('1..\n122\n...')
    expect(a.ascii(symmetries[3])).toBe('11.\n2..\n2..')
    expect(a.ascii(symmetries[4])).toBe('122\n1..\n...')
    expect(a.ascii(symmetries[5])).toBe('..1\n221\n...')
    expect(a.ascii(symmetries[6])).toBe('2..\n2..\n11.')
    expect(a.ascii(symmetries[7])).toBe('11.\n.2.\n.2.')
    expect(a.ascii(orbit[2])).toBe('1..\n122\n...')
    const symmetry = nbb.actions.classifyOrbitType()
    expect(symmetry).toBe('ASYM')
  })

  it('should produce variants that can be rotated', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyOrbitType give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'

    const variants = navalBase.variants()
    expect(variants).toBeDefined()
    expect(variants).toBeInstanceOf(Variant3) //Asymmetric)

    expect(variants.list.length).toBe(8)
    const id = variants.list[0]
    expect(id).toBeInstanceOf(Mask)
    expect(id.toAsciiWith()).toBe('221\n..1')
    const rotate = variants.list[1]
    expect(rotate).toBeInstanceOf(Mask)
    expect(rotate.toAsciiWith()).toBe('.2\n.2\n11')
    const flip = variants.list[4]
    expect(flip).toBeInstanceOf(Mask)
    expect(flip.toAsciiWith()).toBe('122\n1..')
    const flipRotate = variants.list[5]
    expect(flipRotate).toBeInstanceOf(Mask)
    expect(flipRotate.toAsciiWith()).toBe('11\n.2\n.2') //'..1\n221\n...')
  })
  it('test assembleColorLayers', () => {
    expect(navalPier instanceof Mask).toBe(true)
    expect(navalPier.toAsciiWith()).toBe('11.\n...\n...')
    expect(navalPier.bits.toString(2)).toBe('11')
    expect(navalDock instanceof Mask).toBe(true)
    expect(navalDock.toAsciiWith()).toBe('..1\n..1\n...')
    expect(navalDock.bits.toString(2)).toBe('100100')

    const assembleStore = navalDock.defaultStore(3, 3, 3)

    const assembled = assembleStore.assembleColorLayers(
      [navalDock.bits, navalPier.bits],
      3,
      3
    )

    const assembledMask = new Mask(3, 3, assembled, null, 3)
    expect(assembledMask.bits.toString(2)).toBe('10000011010')
    expect(assembledMask.toAsciiWith()).toBe('221\n..1\n...')
  })
  it('test assembleColorLayers inverted', () => {
    expect(navalPier instanceof Mask).toBe(true)
    expect(navalPier.toAsciiWith()).toBe('11.\n...\n...')
    expect(navalPier.bits.toString(2)).toBe('11')
    expect(navalDock instanceof Mask).toBe(true)
    expect(navalDock.toAsciiWith()).toBe('..1\n..1\n...')
    expect(navalDock.bits.toString(2)).toBe('100100')

    const assembleStore = navalDock.defaultStore(
      3,
      navalDock.width,
      navalDock.height
    )

    const assembled = assembleStore.assembleColorLayers(
      [navalPier.bits, navalDock.bits],
      3,
      3
    )

    const assembledMask = new Mask(3, 3, assembled, null, 3)

    expect(assembledMask.toAsciiWith()).toBe('112\n..2\n...')
    const layers = assembledMask.extractColorLayers()
    expect(layers[0].toAsciiWith()).toBe('11.\n...\n...')
    expect(layers[1].toAsciiWith()).toBe('..1\n..1\n...')
  })

  it('test addLayer', () => {
    expect(navalPier instanceof Mask).toBe(true)
    expect(typeof navalPier.bits).toBe('bigint')
    expect(navalPier.occupancy).toBe(2)
    expect(navalPier.width).toBe(3)
    expect(navalPier.height).toBe(3)
    expect(navalPier.toAsciiWith()).toBe('11.\n...\n...')

    expect(navalDock instanceof Mask).toBe(true)
    expect(typeof navalDock.bits).toBe('bigint')
    expect(navalDock.occupancy).toBe(2)
    expect(navalDock.width).toBe(3)
    expect(navalDock.height).toBe(3)
    expect(navalDock.store.bitsPerCell).toBe(1)
    expect(navalDock.toAsciiWith()).toBe('..1\n..1\n...')

    navalDock.addLayers([navalPier])
    expect(navalDock instanceof Mask).toBe(true)
    expect(typeof navalDock.bits).toBe('bigint')
    expect(navalDock.width).toBe(3)
    expect(navalDock.height).toBe(3)
    expect(navalDock.store.width).toBe(3)
    expect(navalDock.store.height).toBe(3)
    expect(navalDock.store.bitsPerCell).toBe(2)
    expect(navalDock.store.size).toBe(9n)
    expect(navalDock.store.depth).toBe(3)
    expect(navalDock.toAsciiWith()).toBe('221\n..1\n...')
    expect(navalDock.occupancy).toBe(4)
    expect(navalDock.bits.toString(2)).toBe('10000011010')
  })
  it('test addLayer resize', () => {
    expect(navalPier2 instanceof Mask).toBe(true)
    expect(typeof navalPier2.bits).toBe('bigint')
    expect(navalPier2.occupancy).toBe(2)
    expect(navalPier2.width).toBe(2)
    expect(navalPier2.height).toBe(2)
    expect(navalPier2.toAsciiWith()).toBe('11\n..')

    expect(navalDock instanceof Mask).toBe(true)
    expect(typeof navalDock.bits).toBe('bigint')
    expect(navalDock.occupancy).toBe(2)
    expect(navalDock.width).toBe(3)
    expect(navalDock.height).toBe(3)
    expect(navalDock.store.bitsPerCell).toBe(1)
    expect(navalDock.toAsciiWith()).toBe('..1\n..1\n...')

    navalDock.addLayers([navalPier])
    expect(navalDock instanceof Mask).toBe(true)
    expect(typeof navalDock.bits).toBe('bigint')
    expect(navalDock.width).toBe(3)
    expect(navalDock.height).toBe(3)
    expect(navalDock.store.width).toBe(3)
    expect(navalDock.store.height).toBe(3)
    expect(navalDock.store.bitsPerCell).toBe(2)
    expect(navalDock.store.size).toBe(9n)
    expect(navalDock.store.depth).toBe(3)
    expect(navalDock.toAsciiWith()).toBe('221\n..1\n...')
    expect(navalDock.occupancy).toBe(4)
    expect(navalDock.bits.toString(2)).toBe('10000011010')
  })
  it('test addLayer inverted', () => {
    expect(navalPier instanceof Mask).toBe(true)
    expect(typeof navalPier.bits).toBe('bigint')
    expect(navalPier.occupancy).toBe(2)
    expect(navalPier.width).toBe(3)
    expect(navalPier.height).toBe(3)
    expect(navalPier.toAsciiWith()).toBe('11.\n...\n...')

    expect(navalDock instanceof Mask).toBe(true)
    expect(typeof navalDock.bits).toBe('bigint')
    expect(navalDock.occupancy).toBe(2)
    expect(navalDock.width).toBe(3)
    expect(navalDock.height).toBe(3)
    expect(navalDock.toAsciiWith()).toBe('..1\n..1\n...')

    navalPier.addLayers([navalDock])
    expect(navalPier instanceof Mask).toBe(true)
    expect(typeof navalPier.bits).toBe('bigint')
    expect(navalPier.width).toBe(3)
    expect(navalPier.height).toBe(3)
    expect(navalPier.store.width).toBe(3)
    expect(navalPier.store.height).toBe(3)
    expect(navalPier.store.bitsPerCell).toBe(2)
    expect(navalPier.store.size).toBe(9n)
    expect(navalPier.store.depth).toBe(3)
    expect(navalPier.toAsciiWith()).toBe('112\n..2\n...')
    expect(navalPier.occupancy).toBe(4)
  })
  it('should initialize with correct subGroups', () => {
    expect(navalBase.subGroups).toBeDefined()
    expect(navalBase.subGroups).toHaveLength(2)
    expect(navalBase.subGroups[0]).toBeInstanceOf(StandardCells)
    expect(navalBase.subGroups[1]).toBeInstanceOf(SpecialCells)
    const [standard, special] = navalBase.subGroups
    const sb = standard.board

    expect(sb instanceof Mask).toBe(true)
    expect(typeof sb.bits).toBe('bigint')
    expect(sb.width).toBe(3)
    expect(sb.height).toBe(2)
    expect(sb.store.width).toBe(3)
    expect(sb.store.height).toBe(2)
    expect(sb.store.bitsPerCell).toBe(1)
    expect(sb.store.size).toBe(6n)
    expect(sb.store.depth).toBe(1) // 2
    expect(sb.toAsciiWith()).toBe('..1\n..1')

    const spb = special.board
    expect(spb instanceof Mask).toBe(true)
    expect(typeof spb.bits).toBe('bigint')
    expect(spb.width).toBe(3)
    expect(spb.height).toBe(2)
    expect(spb.store.width).toBe(3)
    expect(spb.store.height).toBe(2)
    expect(spb.store.bitsPerCell).toBe(1)
    expect(spb.store.size).toBe(6n)
    expect(spb.toAsciiWith()).toBe('11.\n...')
  })

  it('should produce correct variants', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyOrbitType give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'

    expect(navalBase.board.store.bitsPerCell).toBe(2)
    expect(navalBase.subGroups).toHaveLength(2)
    expect(navalBase.subGroups[0]).toBeInstanceOf(StandardCells)
    expect(navalBase.subGroups[1]).toBeInstanceOf(SpecialCells)

    const orbit = navalBase.board.actions.orbit()
    expect(orbit).toBeDefined()
    expect(orbit.length).toBe(8)
    expect(typeof orbit[0]).toBe('bigint')
    const a = navalBase.board.actions

    const symmetries = navalBase.board.actions.symmetries
    expect(symmetries.length).toBe(8)
    expect(a.ascii(orbit[0])).toBe('221\n..1\n...')
    expect(navalBase.board.store.bitsPerCell).toBe(2)
    // expect(temp.toString()).toBe('221\n..1\n...')

    expect(a.ascii(orbit[1])).toBe('.2.\n.2.\n11.')
    const symmetry = navalBase.board.actions.classifyOrbitType()
    expect(symmetry).toBe('ASYM')

    const variants = navalBase.variants()
    expect(variants).toBeDefined()
    expect(variants).toBeInstanceOf(Variant3)

    expect(variants.standardGroup).toBeInstanceOf(StandardCells)
    expect(variants.specialGroups[0]).toBeInstanceOf(SpecialCells)
    expect(variants.list.length).toBe(8)

    expect(variants.list[0]).toBeInstanceOf(Mask)

    const sg0b = navalBase.subGroups[0].board
    expect(sg0b).toBeInstanceOf(Mask)
    expect(sg0b.width).toBe(3)
    expect(sg0b.height).toBe(2)
    expect(sg0b.store.bitsPerCell).toBe(1)
    expect(sg0b.toAsciiWith()).toBe('..1\n..1')
    const sg1b = navalBase.subGroups[1].board
    expect(sg1b).toBeInstanceOf(Mask)
    expect(sg1b.width).toBe(3)
    expect(sg1b.height).toBe(2)
    expect(sg1b.store.bitsPerCell).toBe(1)
    expect(sg1b.toAsciiWith()).toBe('11.\n...')

    const sb = variants.standardGroup.board
    expect(sb).toBeInstanceOf(Mask)
    expect(sb.width).toBe(3)
    expect(sb.height).toBe(2)
    expect(sb.store.bitsPerCell).toBe(1)
    expect(sb.toAsciiWith()).toBe('..1\n..1')
    const spb = variants.specialGroups[0].board
    expect(spb).toBeInstanceOf(Mask)
    expect(spb.width).toBe(3)
    expect(spb.height).toBe(2)
    expect(spb.store.bitsPerCell).toBe(1)
    expect(spb.toAsciiWith()).toBe('11.\n...')
  })
  it('should produce correct placeables', () => {
    /// pre-condition: subGroups and board are set up correctly before calling variants()
    /// board should have both layers combined and subGroups should have correct boards for Variant3 to work properly
    /// board should have classifyOrbitType give to 'ASYM' for Variant3 work with a shape with  symmetry = 'D'

    const variants = navalBase.variants()
    expect(variants).toBeInstanceOf(Variant3)

    expect(variants.list[0]).toBeInstanceOf(Mask)
    const placeable = variants.placeable(1)
    expect(placeable).toBeInstanceOf(Placeable3)

    const bb = placeable.board
    expect(bb).toBeInstanceOf(Mask)
    expect(bb.width).toBe(2)
    expect(bb.height).toBe(3)
    expect(bb.store.bitsPerCell).toBe(2)
    expect(bb.toAsciiWith()).toBe('.2\n.2\n11')

    const layers = bb.extractColorLayers()
    expect(layers[0].toAsciiWith()).toBe('..\n..\n11')
    expect(layers[1].toAsciiWith()).toBe('.1\n.1\n..')
    const special = bb.extractColorLayer(2)
    expect(special.toAsciiWith()).toBe('.1\n.1\n..')

    expect(bb.toAsciiWith()).toBe('.2\n.2\n11')
    special.bits = bb.store.extractColorLayer(bb.bits, 1, 2, 3)
    expect(special.toAsciiWith()).toBe('..\n..\n11')

    const standard = bb.extractColorLayer(1)
    expect(standard.toAsciiWith()).toBe('..\n..\n11')

    const spb = placeable.subGroups[1].board
    expect(spb).toBeInstanceOf(Mask)
    expect(spb.width).toBe(2)
    expect(spb.height).toBe(3)
    expect(spb.store.bitsPerCell).toBe(1)
    expect(spb.toAsciiWith()).toBe('.1\n.1\n..')
    const sb = placeable.subGroups[0].board
    expect(sb).toBeInstanceOf(Mask)
    expect(sb.width).toBe(2)
    expect(sb.height).toBe(3)
    expect(sb.store.bitsPerCell).toBe(1)
    expect(sb.toAsciiWith()).toBe('..\n..\n11')
  })

  it('should initialize with correct board', () => {
    expect(navalBase.board).toBeDefined()
    expect(navalBase.board instanceof Mask).toBe(true)
    expect(typeof navalBase.board.bits).toBe('bigint')
    expect(navalBase.board.width).toBe(3)
    expect(navalBase.board.height).toBe(2)
    expect(navalBase.board.store.width).toBe(3)
    expect(navalBase.board.store.height).toBe(2)

    expect(navalBase.board.store.bitsPerCell).toBe(2)
    expect(navalBase.board.store.size).toBe(6n)
    expect(navalBase.board.store.depth).toBe(3)
    expect(navalBase.board.toAsciiWith()).toBe('221\n..1')
    expect(navalBase.board.occupancy).toBe(4)
    expect(navalBase.board.depth).toBe(3)
  })
})
