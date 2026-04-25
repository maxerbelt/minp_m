/* eslint-env jest */

/* global describe, it, expect, beforeEach */
import { jest } from '@jest/globals'
import { RectListCanvas } from './rectListCanvas.js'
import { bh } from '../../terrains/all/js/bh.js'

describe('RectListCanvas', () => {
  describe('BhMapList', () => {
    beforeEach(() => {
      // Mock bh.map
      bh.terrainMaps = {
        current: {
          current: { cols: 10, rows: 8 }
        }
      }
    })

    it('should create a RectListCanvas with map dimensions when no argument provided', () => {
      const canvas = RectListCanvas.BhMapList()
      expect(canvas).toBeInstanceOf(RectListCanvas)
      expect(canvas.width).toBe(10)
      expect(canvas.height).toBe(8)
      expect(canvas.list).toEqual([])
    })

    it('should use provided map when argument is given', () => {
      const customMap = { cols: 5, rows: 3 }
      const canvas = RectListCanvas.BhMapList(customMap)
      expect(canvas).toBeInstanceOf(RectListCanvas)
      expect(canvas.width).toBe(5)
      expect(canvas.height).toBe(3)
      expect(canvas.list).toEqual([])
    })

    it('should throw error when no map available', () => {
      // Temporarily remove the map
      const originalMaps = bh.terrainMaps
      bh.terrainMaps = null

      expect(() => {
        RectListCanvas.BhMapList()
      }).toThrow('No map available for BhMapList')

      // Restore
      bh.terrainMaps = originalMaps
    })
  })
})
