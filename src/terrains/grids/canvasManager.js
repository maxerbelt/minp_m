import { ShapeManager } from './indexerManager.js'
import { toTitleCase } from '../../core/utils.js'
class CanvasManager {
  #moduleCache = ShapeManager.newCacheWith(() => ({}))
  #drawModuleCache = ShapeManager.newCacheWith(() => ({}))
  #canvasCache = ShapeManager.newCacheWith(() => ({}))
  #drawCache = ShapeManager.newCacheWith(() => ({}))
  #defaultDrawCache = CanvasManager.newThrowingCacheWith(
    (type, subType) =>
      toTitleCase(type) + ' ' + toTitleCase(subType) + ' Draw class not loaded'
  )
  #defaultCanvasCache = CanvasManager.newThrowingCacheWith(
    (type, subType) =>
      toTitleCase(type) +
      ' ' +
      toTitleCase(subType) +
      ' Canvas class not loaded'
  )
  name = 'display'
  static newThrowingCacheWith (prop) {
    return mapToCache(ShapeManager.types, key => {
      return CanvasManager.newThrowingSubCacheWith(prop, key)
    })
  }
  static newThrowingSubCacheWith (prop, type) {
    return mapToCache(CanvasManager.subTypes, key => {
      return () => {
        throw new Error(prop(type, key))
      }
    })
  }
  static #instance = null
  static getInstance (subTypes) {
    if (!CanvasManager.#instance) {
      CanvasManager.#instance = new CanvasManager(subTypes)
    }

    const instance = CanvasManager.#instance
    if (
      subTypes &&
      instance.subTypes &&
      subTypes.length > 0 &&
      instance.subTypes.length > 0
    ) {
      const uniqueSubTypes = [...new Set([...instance.subTypes, ...subTypes])]
      instance.subTypes = uniqueSubTypes
    } else if (subTypes && subTypes.length > 0) {
      instance.subTypes = subTypes
    }

    return instance
  }

  constructor (subTypes) {
    if (CanvasManager.#instance) {
      throw new Error('Use getInstance()')
    }
    this.subTypes = subTypes
  }

  static subTypes = [
    'occupancyMask',
    'colorMask',
    'occupancyPacked',
    'colorPacked'
  ]
  static depthEnum = ['occupancy', 'color']
  static storeTypes = ['mask', 'packed']
  static getSubTypes (storeType, depth) {
    return CanvasManager.subTypes.filter(subType => {
      const [store, subDepth] = subType.split(/(?=[A-Z])/)
      return store === storeType && subDepth === depth
    })
  }

  static drawLoaders = {
    triangle: {
      occupancyMask: () => import('../../ui/triangle/triDraw.js'),
      colorMask: () => null,
      occupancyPacked: () => null,
      colorPacked: () => null
    },
    rectangle: {
      occupancyMask: () => import('../../ui/rectangle/rectdraw.js'),
      colorMask: () => import('../../ui/rectangle/rectdrawcolor.js'),
      occupancyPacked: () => import('../../ui/rectangle/packeddraw.js'),
      colorPacked: () => import('../../ui/rectangle/colorpackeddraw.js')
    },
    hexagon: {
      occupancyMask: () => import('../../ui/hexagon/hexDraw.js'),
      colorMask: () => null,
      occupancyPacked: () => import('../../ui/hexagon/packedHexDraw.js'),
      colorPacked: () => import('../../ui/hexagon/colorPackedHexDraw.js')
    }
  }
  static loaders = {
    triangle: {
      occupancyMask: () => import('../../ui/triangle/triDraw.js'),
      colorMask: () => null,
      occupancyPacked: () => null,
      colorPacked: () => null
    },
    rectangle: {
      occupancyMask: () => import('../../ui/rectangle/rectdraw.js'),
      colorMask: () => import('../../ui/rectangle/rectdrawcolor.js'),
      occupancyPacked: () => import('../../ui/rectangle/packeddraw.js'),
      colorPacked: () => import('../../ui/rectangle/colorpackeddraw.js')
    },
    hexagon: {
      occupancyMask: () => import('../../ui/hexagon/HexCanvas.js'),
      colorMask: () => null,
      occupancyPacked: () => import('../../ui/hexagon/packedHexDraw.js'),
      colorPacked: () => import('../../ui/hexagon/ColorPackedHexCanvas.js')
    }
  }
  static createDrawCreator (type, subType, module) {
    switch (type) {
      case 'triangle':
        switch (subType) {
          case 'occupancyMask':
            return (
              canvasId,
              side = 3,
              offsetX = 300,
              offsetY = 300,
              size = 25
            ) =>
              module.TriDraw.getInstance(canvasId, side, offsetX, offsetY, size)
        }
        break
      case 'rectangle':
        switch (subType) {
          case 'occupancyMask':
            return (
              canvasId,
              width = 10,
              height = 10,
              cellSize = 25,
              offsetX = 0,
              offsetY = 0,
              depth = 2
            ) =>
              module.RectDraw.getInstance(
                canvasId,
                width,
                height,
                cellSize,
                offsetX,
                offsetY,
                depth
              )
          case 'colorMask':
            return (
              canvasId,
              width = 10,
              height = 10,
              cellSize = 25,
              offsetX = 0,
              offsetY = 0,
              depth = 4
            ) =>
              module.RectDrawColor.getInstance(
                canvasId,
                width,
                height,
                cellSize,
                offsetX,
                offsetY,
                depth
              )
          case 'occupancyPacked':
            return (
              canvasId,
              width = 10,
              height = 10,
              cellSize = 25,
              offsetX = 0,
              offsetY = 0,
              depth = 4
            ) =>
              module.PackedDraw.getInstance(
                canvasId,
                width,
                height,
                cellSize,
                offsetX,
                offsetY,
                depth
              )
          case 'colorPacked':
            return (
              canvasId,
              width = 10,
              height = 10,
              cellSize = 25,
              offsetX = 0,
              offsetY = 0,
              depth = 4
            ) =>
              module.ColorPackedDraw.getInstance(
                canvasId,
                width,
                height,
                cellSize,
                offsetX,
                offsetY,
                depth
              )
        }
        break
      case 'hexagon':
        switch (subType) {
          case 'occupancyMask':
            return (
              canvasId,
              radius = 3,
              offsetX = 300,
              offsetY = 300,
              hexSize = 25
            ) =>
              module.HexDraw.getInstance(
                canvasId,
                radius,
                offsetX,
                offsetY,
                hexSize
              )

          case 'occupancyPacked':
            return (
              canvasId,
              radius = 3,
              offsetX = 300,
              offsetY = 300,
              hexSize = 25
            ) =>
              module.PackedHexDraw.getInstance(
                canvasId,
                radius,
                offsetX,
                offsetY,
                hexSize
              )
          case 'colorPacked':
            return (
              canvasId,
              radius = 3,
              offsetX = 300,
              offsetY = 300,
              hexSize = 25,
              depth = 4
            ) =>
              module.ColorPackedHexDraw.getInstance(
                canvasId,
                radius,
                offsetX,
                offsetY,
                hexSize,
                depth
              )
        }
        break
    }
  }
  static createCanvasCreator (type, subType, module) {
    switch (type) {
      case 'triangle':
        switch (subType) {
          case 'occupancyMask':
            return (canvasId, gridInstance, config = {}) =>
              module.TriDraw.getInstance(canvasId, gridInstance, config)
        }
        break
      case 'rectangle':
        switch (subType) {
          case 'occupancyMask':
            return (canvasId, gridInstance, config = {}) =>
              module.RectCanvas.getInstance(canvasId, gridInstance, config)
          case 'colorMask':
            return (canvasId, gridInstance, config = {}) =>
              module.RectCanvasColor.getInstance(canvasId, gridInstance, config)

          case 'occupancyPacked':
            return (canvasId, gridInstance, config = {}) =>
              module.PackedDraw.getInstance(canvasId, gridInstance, config)
          case 'colorPacked':
            return (canvasId, gridInstance, config = {}) =>
              module.ColorPackedDraw.getInstance(canvasId, gridInstance, config)
        }
        break
      case 'hexagon':
        switch (subType) {
          case 'occupancyMask':
            return (
              canvasId,
              radius = 3,
              offsetX = 300,
              offsetY = 300,
              hexSize = 25
            ) =>
              module.HexDraw.getInstance(
                canvasId,
                radius,
                offsetX,
                offsetY,
                hexSize
              )

          case 'occupancyPacked':
            return (
              canvasId,
              radius = 3,
              offsetX = 300,
              offsetY = 300,
              hexSize = 25
            ) =>
              module.PackedHexDraw.getInstance(
                canvasId,
                radius,
                offsetX,
                offsetY,
                hexSize
              )
          case 'colorPacked':
            return (
              canvasId,
              radius = 3,
              offsetX = 300,
              offsetY = 300,
              hexSize = 25,
              depth = 4
            ) =>
              module.ColorPackedHexDraw.getInstance(
                canvasId,
                radius,
                offsetX,
                offsetY,
                hexSize,
                depth
              )
        }
        break
    }
  }

  async getCanvasBuilder (type, subType) {
    let builder = this.#canvasCache[type][subType]
    if (builder) return builder
    const module =
      this.#moduleCache[type][subType] || (await CanvasManager.loaders[type]())
    this.#moduleCache[type][subType] = module
    builder = CanvasManager.createCanvasCreator(type, subType, module)
    this.#canvasCache[type][subType] = builder
    return builder
  }
  async getDrawBuilder (type, subType) {
    let builder = this.#drawCache[type][subType]
    if (builder) return builder
    const module =
      this.#drawModuleCache[type][subType] ||
      (await CanvasManager.loaders[type]())
    this.#drawModuleCache[type][subType] = module
    builder = CanvasManager.createDrawCreator(type, subType, module)
    this.#drawCache[type][subType] = builder
    return builder
  }
  async loadFor (type, subType) {
    const canvas = await this.getCanvasBuilder(type, subType)
    const draw = await this.getDrawBuilder(type, subType)
    return { canvas, draw }
  }

  async loadAllFor (type, subTypes = this.subTypes) {
    const results = {}
    for (const subType of subTypes) {
      const { canvas, draw } = await this.loadFor(type, subType)
      results[subType] = { canvas, draw }
    }
    return results
  }
  preload (type, subTypes = this.subTypes) {
    // background only — no state change
    for (const subType of subTypes) {
      this.loadFor(type, subType)
        .then(({ canvas, draw }) => {
          this.canvas = canvas
          this.draw = draw
          this.currentSubType = subType
        })
        .catch(err => {
          console.error(`Failed to preload display classes for ${type}:`, err)
        })
    }
  }
}
function mapToCache (arr, type, propgetter) {
  if (typeof propgetter !== 'function') {
    propgetter = type
    type = undefined
  }
  return arr.reduce((acc, key) => {
    acc[key] = propgetter(key, type)
    return acc
  }, {})
}
export { CanvasManager }
