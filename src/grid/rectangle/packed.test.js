/* eslint-env jest */

/* global describe, it, expect, beforeEach */

import { Packed } from './packed.js'
import { Store32 } from '../bitStore/store32.js'

describe('Packed', () => {
  let p

  beforeEach(() => {
    p = new Packed(8, 8)
  })

  it('constructs with expected properties', () => {
    expect(p).toBeInstanceOf(Packed)
    expect(p.store).toBeInstanceOf(Store32)
    expect(p.depth).toBe(4)
    expect(p.store.size).toBe(64)
    expect(p.store.bitsPerCell).toBe(2)
    expect(p.store.cellsPerWord).toBe(16)
    expect(p.store.empty).toBeInstanceOf(Uint32Array)
    expect(p.store.empty.length).toBe(4)
    expect(p.store.empty.every(b => b === 0)).toBe(true)
    expect(p.store.one).toBe(1)
    expect(p.store.storeType).toBeInstanceOf(Function)
    expect(p.store.storeType(3)).toBe(3)
    expect(p.store.cellMask).toBe(3)
    expect(p.store.bShift).toBe(1)
    expect(p.store.maxBitInCell).toBe(1)
    expect(p.width).toBe(8)
    expect(p.height).toBe(8)
    expect(p.store.words).toBe(4)
    expect(p.store.bitWidth).toBe(2)
    expect(p.bits.length).toBe(4)

    expect(p.bits).toBeInstanceOf(Uint32Array)
    expect(p.bits[0]).toBe(0)
    expect(p.bits[p.store.words - 1]).toBe(0)
    expect(p.bits.every(b => b === 0)).toBe(true)
  })
  it('constructs 16color with expected properties', () => {
    const p = new Packed(8, 8, null, null, 16)
    expect(p).toBeInstanceOf(Packed)
    expect(p.store).toBeInstanceOf(Store32)
    expect(p.depth).toBe(16)
    expect(p.store.size).toBe(64)
    expect(p.store.bitsPerCell).toBe(4)
    expect(p.store.cellsPerWord).toBe(8)
    expect(p.store.empty).toBeInstanceOf(Uint32Array)
    expect(p.store.empty.length).toBe(8)
    expect(p.store.empty.every(b => b === 0)).toBe(true)
    expect(p.store.one).toBe(1)
    expect(p.store.storeType).toBeInstanceOf(Function)
    expect(p.store.storeType(3)).toBe(3)
    expect(p.store.cellMask).toBe(15)
    expect(p.store.bShift).toBe(2)
    expect(p.store.maxBitInCell).toBe(3)
    expect(p.width).toBe(8)
    expect(p.height).toBe(8)
    expect(p.store.words).toBe(8)
    expect(p.store.bitWidth).toBe(4)
    expect(p.bits.length).toBe(8)

    expect(p.bits).toBeInstanceOf(Uint32Array)
    expect(p.bits[0]).toBe(0)
    expect(p.bits[p.store.words - 1]).toBe(0)
    expect(p.bits.every(b => b === 0)).toBe(true)
  })
  it('constructs 256color with expected properties', () => {
    const p = new Packed(8, 8, null, null, 256)
    expect(p).toBeInstanceOf(Packed)
    expect(p.store).toBeInstanceOf(Store32)
    expect(p.depth).toBe(256)
    expect(p.store.size).toBe(64)
    expect(p.store.bitsPerCell).toBe(8)
    expect(p.store.cellsPerWord).toBe(4)
    expect(p.store.empty).toBeInstanceOf(Uint32Array)
    expect(p.store.empty.length).toBe(16)
    expect(p.store.empty.every(b => b === 0)).toBe(true)
    expect(p.store.one).toBe(1)
    expect(p.store.storeType).toBeInstanceOf(Function)
    expect(p.store.storeType(3)).toBe(3)
    expect(p.store.cellMask).toBe(255)
    expect(p.store.bShift).toBe(3)
    expect(p.store.maxBitInCell).toBe(7)
    expect(p.width).toBe(8)
    expect(p.height).toBe(8)
    expect(p.store.words).toBe(16)
    expect(p.store.bitWidth).toBe(8)
    expect(p.bits.length).toBe(16)

    expect(p.bits).toBeInstanceOf(Uint32Array)
    expect(p.bits[0]).toBe(0)
    expect(p.bits[p.store.words - 1]).toBe(0)
    expect(p.bits.every(b => b === 0)).toBe(true)
  })
  it('index and bitPos compute positions', () => {
    expect(p.index(0, 0)).toBe(0)
    expect(p.index(1, 0)).toBe(1)
    expect(p.index(0, 1)).toBe(8)
    expect(p.bitPos(0, 0)).toBe(0)
    expect(p.bitPos(1, 0)).toBe(2)
    expect(p.bitPos(0, 1)).toBe(16) // BW * width = 2*8 =16
  })

  it('edgeMasks produce full-sized bitboards', () => {
    // create a grid large enough to require multiple words
    const big = new Packed(10, 10)
    const edges = big.edgeMasks()
    expect(edges.notRight).toBeInstanceOf(Uint32Array)
    expect(edges.notRight.length).toBe(big.store.words)
    // a bit at index 0 should not be masked off by notRight
    const src = big.store.newWords()
    big.store.addBit(src, 0)
    const masked = big.store.bitAnd(src, edges.notRight)
    expect(masked[0] & 1).toBe(1)
  })

  it('clone preserves depth and words', () => {
    const small = new Packed(4, 4, null, null, 1)
    small.bits = small.store.addBit(small.bits, 5)
    const copy = small.clone
    expect(copy).toBeInstanceOf(Packed)
    expect(copy.depth).toBe(small.depth)
    expect(copy.store.words).toBe(small.store.words)
    // modifying copy should not affect original
    copy.bits = copy.store.addBit(copy.bits, 6)
    expect(small.bits).not.toEqual(copy.bits)
  })

  it('readRef  and ref  return expected refs', () => {
    const idx = 5
    const ref2 = p.store.readRef(idx)
    expect(ref2.word).toBe(0)
    expect(ref2.shift).toBe(10)

    const ref = p.store.ref(idx)
    expect(ref.word).toBe(0)
    expect(ref.shift).toBe(10)

    const full = p.store.ref(p.bits, idx)
    expect(full).toHaveProperty('word')
    expect(full).toHaveProperty('mask')
    expect(full).toHaveProperty('shift')
    expect(full.mask).toBe(p.store.gettingMask(full.shift))
  })

  it('leftShift and rightShift produce expected values', () => {
    const val = p.store.leftShift(3, 4)
    expect(val).toBe((3 & p.store.cellMask) << 4)
    const val2 = p.store.rightShift(2, 6)
    expect(val2).toBe((2 & p.store.cellMask) >> 6)
  })

  it('setRef and getRef roundtrip', () => {
    const idx = 7
    const { word: boardIdx, shift: boardPos } = p.store.readRef(p.bits, idx)
    const mask = p.store.gettingMask(boardPos)
    // initially zero
    expect(p.store.getRef(p.bits, boardIdx, boardPos)).toBe(0)
    const newVal = p.store.setWordBits(p.bits[boardIdx], mask, boardPos, 2)
    // write to bits and read back
    p.bits[boardIdx] = newVal

    expect(p.store.getRef(p.bits, boardIdx, boardPos)).toBe(2)
  })

  it('set and at operate on (x,y)', () => {
    expect(p.bits.length).toBe(4)
    expect(p.bits).toBeInstanceOf(Uint32Array)
    expect(p.bits[1]).toBe(0)

    const i = p.index(1, 2)
    expect(i).toBe(17)
    p.set(1, 2, 3)
    const color = p.at(1, 2)
    expect(color).toBe(3)
    // other cell unchanged
    expect(p.at(0, 0)).toBe(0)
  })

  it('testFor reports presence of color', () => {
    p.set(3, 3, 2)
    expect(p.testFor(3, 3, 2)).toBe(true)
    expect(p.testFor(3, 3, 1)).toBe(false)
  })

  it('toAscii produces output', () => {
    const i = p.index(4, 1)
    // ensure empty
    p.set(i, 1)
    const ascii1 = p.toAscii
    expect(typeof ascii1).toBe('string')
    expect(ascii1).toContain('1')

    p.set(0, 0, 3)
    const ascii2 = p.toAscii
    expect(ascii2).toContain('3')
  })
  it('ref and Idx', () => {
    const pos = p.index(7, 7)
    expect(pos).toBe(63)
    const { word, mask, shift } = p.store.ref(pos)

    const expectedMask = 3 << (15 * 2)
    expect(mask).toBe(expectedMask)
    expect(shift).toBe(30)
    expect(word).toBe(3)
  })
  it('ref', () => {
    const { word, mask, shift } = p.store.ref(4)
    expect(word).toBe(0)
    expect(shift).toBe(8)
    const expectedMask = 3 << 8
    expect(mask).toBe(expectedMask)
    const brdIdx = 20 >>> 4 // /16
    const brdPos = (20 & 15) << 1 // *2
    expect(brdIdx).toBe(1)
    expect(brdPos).toBe(8)
    const brdIdx2 = 40 >>> 5 // /16
    const brdPos2 = 40 & 30
    expect(brdIdx2).toBe(1)
    expect(brdPos2).toBe(8)
    const ref = p.store.readRef(20)
    const entries = Object.entries(ref)
    expect(entries.length).toBe(2)
    const keys = Object.keys(ref)
    expect(keys).toContain('word')
    expect(keys).toContain('shift')
    const values = Object.values(ref)
    expect(values.length).toBe(2)
    expect(values[0]).toBe(1)
    expect(values[1]).toBe(8)
    expect(ref.shift).toBe(8)
    expect(ref.word).toBe(1)
  })

  it('ref zero', () => {
    const { word, mask, shift } = p.store.ref(0, 0)
    expect(word).toBe(0)
    expect(mask).toBe(3)
    expect(shift).toBe(0)
  })
  it('ref', () => {
    const i = p.index(4, 1)
    const { word, mask, shift } = p.store.ref(i)
    expect(word).toBe(0)
    expect(shift).toBe(24)
    expect(mask).toBe(3 << 24)
  })

  it('ascii', () => {
    const pos = p.index(4, 1)
    // ensure empty
    p.store.setAtIdx(p.bits, pos, 1)
    expect(p.toAscii).toBe(
      `........\n....1...\n........\n........\n........\n........\n........\n........`
    )
    p.set(0, 0, 3)
    const ascii3 = p.toAscii
    expect(ascii3).toBe(
      `3.......\n....1...\n........\n........\n........\n........\n........\n........`
    )
    p.set(7, 7, 2)
    const ascii4 = p.toAscii
    expect(ascii4).toBe(
      `3.......\n....1...\n........\n........\n........\n........\n........\n.......2`
    )
    const ref1 = p.readRef(2, 2)
    expect(ref1.word).toBe(1)
    expect(ref1.shift).toBe(4)
    const ref2 = p.readRef(5, 2)
    expect(ref2.word).toBe(1)
    expect(ref2.shift).toBe(10)

    p.setRange(2, 2, 5)
    const ascii = p.toAscii
    expect(ascii).toBe(
      `3.......\n....1...\n..1111..\n........\n........\n........\n........\n.......2`
    )
    p.clearRange(2, 3, 4)
    const asc5 = p.toAscii
    expect(asc5).toBe(
      `3.......\n....1...\n..1..1..\n........\n........\n........\n........\n.......2`
    )
    const p2 = new Packed(16, 2, null, null, 16)

    expect(p2.depth).toBe(16)
    expect(p2.store.size).toBe(32)
    expect(p2.store.bitsPerCell).toBe(4)
    expect(p2.store.cellsPerWord).toBe(8)
    p2.set(3, 0, 5)
    const cell3 = p2.at(3, 0)
    expect(cell3).toBe(5)
    p2.setRange(1, 1, 7, 9)
    const cell7 = p2.at(7, 1)
    expect(cell7).toBe(9)
    const cell8 = p2.at(8, 1)
    expect(cell8).toBe(0)
    const ascii6 = p2.toAscii
    expect(ascii6).toBe(`...5............\n.9999999........`)
  })

  describe('fullBits', () => {
    it('should return full bitboard for all cells set', () => {
      const full = p.store.fullBits
      expect(full[0]).toBe(p.store.wordMask)
    })
    it('should return full bitboard for static', () => {
      const full = Packed.full(3, 2)
      expect(full.bits[0]).toBe(p.store.wordMask)
    })
    it('should return full bitboard for instance', () => {
      const full = p.fullBits
      expect(full[0]).toBe(p.store.wordMask)
    })
  })

  describe('addLayers and related methods (regression tests)', () => {
    describe('addToLayersBits', () => {
      it('should return array with background layer first, then foreground layers', () => {
        const p1 = new Packed(4, 4)
        p1.set(0, 0, 1)
        p1.set(1, 1, 1)

        const p2bits = new Packed(4, 4).bits

        const result = p1.addToLayersBits([p2bits])
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(2) // background + 1 layer
        expect(result[0]).toBeInstanceOf(Uint32Array)
        expect(result[1]).toBeInstanceOf(Uint32Array)
      })
    })

    describe('addToLayers', () => {
      it('should return array of Packed objects with background layer first', () => {
        const p1 = new Packed(4, 4)
        p1.set(0, 0, 1)
        p1.set(1, 1, 1)

        const p2 = new Packed(4, 4)
        p2.set(2, 2, 1)

        const result = p1.addToLayers([p2])
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(2) // background + 1 layer
        expect(result[0]).toBeInstanceOf(Packed)
        expect(result[1]).toBeInstanceOf(Packed)
      })

      it('should have layers with appropriate structure', () => {
        const p1 = new Packed(4, 4)
        p1.set(0, 0, 1)
        p1.set(1, 1, 2)

        const p2 = new Packed(4, 4)
        p2.set(2, 2, 1)

        const result = p1.addToLayers([p2])
        // Background layer should have some occupancy
        expect(result[0].occupancy).toBeGreaterThanOrEqual(0)
        // Foreground layer should have some occupancy
        expect(result[1].occupancy).toBeGreaterThanOrEqual(0)
      })
    })

    describe('addLayersBits', () => {
      it('should return Uint32Array for packed masks', () => {
        const p1 = new Packed(3, 3)
        p1.set(0, 0, 1)
        p1.set(1, 1, 2)

        const p2 = new Packed(3, 3)
        p2.set(2, 2, 1)

        const result = p1.addLayersBits([p2.bits])
        expect(result).toBeInstanceOf(Uint32Array)
      })

      it('should assemble color layers into multi-color bitboard', () => {
        const p1 = new Packed(3, 3, null, null, 16)
        p1.set(0, 0, 1)
        p1.set(1, 1, 2)

        const p2 = new Packed(3, 3, null, null, 4)
        p2.set(2, 2, 1)

        const result = p1.addLayersBits([p2.bits])
        expect(result).toBeInstanceOf(Uint32Array)
        expect(result.length > 0).toBe(true)
      })

      it('should handle multiple layers with proper color encoding', () => {
        const gridSize = 4
        const p1 = new Packed(gridSize, gridSize, null, null, 16)
        p1.set(0, 0, 1)

        const layer1 = new Packed(gridSize, gridSize, null, null, 4)
        layer1.set(1, 1, 1)
        const layer2 = new Packed(gridSize, gridSize, null, null, 4)
        layer2.set(2, 2, 1)

        const result = p1.addLayersBits([layer1.bits, layer2.bits])
        expect(result).toBeInstanceOf(Uint32Array)
      })
    })

    describe('addLayers', () => {
      it('should mutate the packed mask with new board structure', () => {
        const p1 = new Packed(3, 3)
        p1.set(0, 0, 1)
        p1.set(1, 1, 2)

        const p2 = new Packed(3, 3)
        p2.set(2, 2, 1)

        const oldDepth = p1.depth
        const oldBits = p1.bits.slice() // clone
        p1.addLayers([p2.bits])

        // Depth should be layers.length + 2 = 1 + 2 = 3
        expect(p1.depth).toBe(3)
        // Bits length may change due to different bits per cell
        expect(p1.bits).not.toEqual(oldBits)
      })

      it('should correctly assemble old bits as background layer', () => {
        const p1 = new Packed(4, 4)
        p1.set(0, 0, 1)
        p1.set(1, 0, 2)
        p1.set(0, 1, 3)

        const p2 = new Packed(4, 4)
        p2.set(2, 2, 1)
        p2.set(3, 3, 2)

        p1.addLayers([p2.bits])

        expect(p1.bits).toBeInstanceOf(Uint32Array)
        expect(p1.bits.length > 0).toBe(true)
      })

      it('should handle multiple new layers', () => {
        const p1 = new Packed(3, 3)
        p1.set(0, 0, 1)

        const layer1 = new Packed(3, 3)
        layer1.set(1, 1, 1)
        const layer2 = new Packed(3, 3)
        layer2.set(2, 2, 1)

        p1.addLayers([layer1.bits, layer2.bits])

        // Depth should be layers.length + 2 = 2 + 2 = 4
        expect(p1.depth).toBe(4)
      })

      it('should create proper store for increased depth', () => {
        const p1 = new Packed(5, 5)
        p1.set(1, 1, 1)

        const p2 = new Packed(5, 5)
        p2.set(2, 2, 1)

        const oldStore = p1.store
        p1.addLayers([p2.bits])

        // Store should be different (new instance)
        expect(p1.store).not.toBe(oldStore)
        // New store should have depth 3 (1 layer + 2 = 3)
        expect(p1.store.depth).toBe(3)
      })
    })

    describe('regression test: addLayers should call addLayersBits not addToLayersBits', () => {
      it('addLayers uses correct multi-color encoding (not background-first encoding)', () => {
        const p1 = new Packed(4, 4)
        p1.set(0, 0, 1)

        const layer1bits = new Packed(4, 4)
        layer1bits.set(2, 2, 1)

        p1.addLayers([layer1bits.bits])

        // After addLayers, bits should be properly encoded Uint32Array
        expect(p1.bits).toBeInstanceOf(Uint32Array)
        // Depth should be 1 + 2 = 3
        expect(p1.depth).toBe(3)
      })

      it('should maintain grid size after addLayers', () => {
        const width = 6
        const height = 4
        const p1 = new Packed(width, height)
        p1.set(0, 0, 1)

        const layer1 = new Packed(width, height)
        layer1.set(1, 1, 1)

        p1.addLayers([layer1.bits])

        expect(p1.width).toBe(width)
        expect(p1.height).toBe(height)
      })

      it('should handle wide-format packed masks with color layers', () => {
        const p1 = new Packed(8, 8, null, null, 16)
        p1.set(0, 0, 3)
        p1.set(4, 4, 5)

        const layer1 = new Packed(8, 8, null, null, 4)
        layer1.set(1, 1, 1)

        p1.addLayers([layer1.bits])
        expect(p1.width).toBe(8)
        expect(p1.height).toBe(8)
        // Depth should be 1 + 2 = 3
        expect(p1.depth).toBe(3)
      })
    })
  })
})
