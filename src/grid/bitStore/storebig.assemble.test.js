/* eslint-env jest */
/* global describe, it, expect, beforeEach */
import { StoreBig } from './storeBig.js'
import { Mask } from '../rectangle/mask.js'

function ascii (width, height, bits, depth = 2) {
  const m = new Mask(width, height, bits, null, depth)
  return m.toAscii
}
BigInt.prototype.toJSON = function () {
  return this.toString()
}
describe('StoreBig assemble layer operations', () => {
  let store4
  beforeEach(() => {
    store4 = new StoreBig(3, 16, 2, 4, 4)
  })
  describe('assembleColorLayers', () => {
    it('should handle empty layers array', () => {
      const result = store4.assembleColorLayers([], 4, 4)
      expect(result).toBe(0n)
    })

    it('should roundtrip with extractColorLayers', () => {
      expect(store4.bitsPerCell).toBe(2)
      let original = 0n
      original = store4.setIdx(original, 0, 1n)
      original = store4.setIdx(original, 2, 2n)
      original = store4.setIdx(original, 5, 3n)
      expect(ascii(4, 4, original, 3)).toBe('1.2.\n.3..\n....\n....')
      const layers = store4.extractColorLayers(original, 4, 4)
      const reassembled = store4.assembleColorLayers(layers, 4, 4)
      expect(ascii(4, 4, layers[0])).toBe('1...\n....\n....\n....')
      expect(ascii(4, 4, layers[1])).toBe('..1.\n....\n....\n....')
      expect(ascii(4, 4, layers[2])).toBe('....\n.1..\n....\n....')
      expect(ascii(4, 4, reassembled, 3)).toBe('1.2.\n.3..\n....\n....')
    })
  })

  describe('assembleColorLayersWithBackground', () => {
    it('should handle empty layers array', () => {
      const result = store4.assembleColorLayersWithBackground([], 4, 4)
      expect(result).toBe(0n)
    })

    it('should roundtrip with extractColorLayersWithBackground', () => {
      let original = 0n
      original = store4.setIdx(original, 0, 0n) // Background
      original = store4.setIdx(original, 1, 1n)
      original = store4.setIdx(original, 2, 2n)

      // Manually create all-color layers
      let maxColor = 2n
      const layers = new Array(Number(maxColor) + 1).fill(0n)
      layers[0] = 0n // Background layer
      layers[1] = store4.extractColorLayer(original, 1n, 4, 4) // Color 1 layer
      layers[2] = store4.extractColorLayer(original, 2n, 4, 4) // Color 2 layer

      const reassembled = store4.assembleColorLayersWithBackground(layers, 4, 4)

      // Verify match after roundtrip
      for (let i = 0; i < 16; i++) {
        expect(store4.getIdx(reassembled, i)).toBe(store4.getIdx(original, i))
      }
    })
  })
})
