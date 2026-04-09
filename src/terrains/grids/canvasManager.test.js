/* eslint-env jest */
/* global describe, it, expect, beforeAll, beforeEach, jest */

import {
  beforeAll,
  beforeEach,
  describe,
  it,
  expect,
  jest
} from '@jest/globals'
import { CanvasManager } from './canvasManager.js'

describe('CanvasManager', () => {
  let manager
  let triangleModule
  let rectangleModule

  beforeAll(() => {
    manager = CanvasManager.getInstance()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    triangleModule = {
      TriDraw: {
        getInstance: jest.fn((canvasId, side, offsetX, offsetY, size) => ({
          canvasId,
          side,
          offsetX,
          offsetY,
          size
        }))
      }
    }

    rectangleModule = {
      RectCanvas: {
        getInstance: jest.fn((canvasId, gridInstance, config) => ({
          canvasId,
          gridInstance,
          config
        }))
      },
      RectCanvasColor: {
        getInstance: jest.fn((canvasId, gridInstance, config) => ({
          canvasId,
          gridInstance,
          config
        }))
      }
    }

    CanvasManager.loaders = {
      triangle: jest.fn(() => Promise.resolve(triangleModule)),
      rectangle: jest.fn(() => Promise.resolve(rectangleModule)),
      hexagon: jest.fn(() => Promise.resolve({}))
    }
  })

  it('should return the same instance and merge subTypes', () => {
    const first = CanvasManager.getInstance(['colorMask'])
    const second = CanvasManager.getInstance(['occupancyPacked'])
    expect(first).toBe(second)
    expect(first.subTypes).toEqual(
      expect.arrayContaining(['colorMask', 'occupancyPacked'])
    )
  })

  it('should filter subTypes by store type and depth', () => {
    expect(CanvasManager.getSubTypes('occupancy', 'Mask')).toEqual([
      'occupancyMask'
    ])
    expect(CanvasManager.getSubTypes('color', 'Packed')).toEqual([
      'colorPacked'
    ])
    expect(CanvasManager.getSubTypes('mask', 'Color')).toEqual([])
  })

  it('should create a triangle draw builder for occupancyMask', () => {
    const builder = CanvasManager.createDrawCreator(
      'triangle',
      'occupancyMask',
      triangleModule
    )
    const result = builder('canvas-id', 5, 10, 15, 20)
    expect(triangleModule.TriDraw.getInstance).toHaveBeenCalledWith(
      'canvas-id',
      5,
      10,
      15,
      20
    )
    expect(result).toEqual({
      canvasId: 'canvas-id',
      side: 5,
      offsetX: 10,
      offsetY: 15,
      size: 20
    })
  })

  it('should create a rectangle canvas builder for colorMask', () => {
    const builder = CanvasManager.createCanvasCreator(
      'rectangle',
      'colorMask',
      rectangleModule
    )
    const grid = { width: 8, height: 8 }
    const config = { foo: 'bar' }
    const result = builder('rect-canvas', grid, config)
    expect(rectangleModule.RectCanvasColor.getInstance).toHaveBeenCalledWith(
      'rect-canvas',
      grid,
      config
    )
    expect(result).toEqual({
      canvasId: 'rect-canvas',
      gridInstance: grid,
      config
    })
  })

  it('should load and cache canvas builders', async () => {
    const builder1 = await manager.getCanvasBuilder('triangle', 'occupancyMask')
    expect(CanvasManager.loaders.triangle).toHaveBeenCalledTimes(1)
    const builder2 = await manager.getCanvasBuilder('triangle', 'occupancyMask')
    expect(builder2).toBe(builder1)
    const result = builder1('canvas-id', 4, 5, 6, 7)
    expect(result.side).toBe(4)
  })

  it('should load and cache draw builders', async () => {
    const builder1 = await manager.getDrawBuilder('triangle', 'occupancyMask')
    expect(CanvasManager.loaders.triangle).toHaveBeenCalledTimes(1)
    const builder2 = await manager.getDrawBuilder('triangle', 'occupancyMask')
    expect(builder2).toBe(builder1)
  })

  it('should return canvas and draw builders from loadFor', async () => {
    const loaded = await manager.loadFor('triangle', 'occupancyMask')
    expect(loaded).toHaveProperty('canvas')
    expect(loaded).toHaveProperty('draw')
  })

  it('should load all requested subTypes with loadAllFor', async () => {
    const results = await manager.loadAllFor('triangle', ['occupancyMask'])
    expect(results.occupancyMask).toHaveProperty('canvas')
    expect(results.occupancyMask).toHaveProperty('draw')
  })

  it('preload should call loadFor without throwing', () => {
    manager.preload('rectangle', ['colorMask'])
    expect(CanvasManager.loaders.rectangle).toHaveBeenCalled()
  })
})
