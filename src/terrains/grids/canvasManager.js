import { ShapeManager } from './indexerManager.js'

/**
 * @typedef {Function} ModuleLoader
 * @returns {Promise<Object>} Promise resolving to dynamically imported module
 */

/**
 * @typedef {Object} LoadResult
 * @property {Function} canvas - Canvas builder function
 * @property {Function} draw - Draw builder function
 */

/**
 * @typedef {Object} LoadAllResult
 * @property {Function} canvas - Canvas builder function
 * @property {Function} draw - Draw builder function
 */

/**
 * Manages dynamic loading and creation of canvas and draw instances for grid shapes
 *
 * Singleton pattern that caches loaded modules and builder functions for triangle,
 * rectangle, and hexagon grid types. Each shape supports multiple subtypes including
 * occupancyMask, colorMask, occupancyPacked, and colorPacked representations.
 *
 * @class CanvasManager
 * @example
 * const manager = CanvasManager.getInstance(['occupancyMask', 'colorPacked'])
 * const { canvas, draw } = await manager.loadFor('rectangle', 'occupancyMask')
 */
class CanvasManager {
  /** @type {Object} - Module cache indexed by [type][subType] */
  #moduleCache = ShapeManager.newCacheWith(() => ({}))

  /** @type {Object} - Draw module cache indexed by [type][subType] */
  #drawModuleCache = ShapeManager.newCacheWith(() => ({}))

  /** @type {Object} - Canvas builder cache indexed by [type][subType] */
  #canvasCache = ShapeManager.newCacheWith(() => ({}))

  /** @type {Object} - Draw builder cache indexed by [type][subType] */
  #drawCache = ShapeManager.newCacheWith(() => ({}))

  /** @type {string} */
  name = 'display'

  /** @type {CanvasManager|null} - Singleton instance */
  static #instance = null

  /**
   * Get or create singleton instance
   *
   * If instance exists and new subTypes are provided, merges them into the
   * existing set of subTypes to support dynamic expansion of available types.
   *
   * @static
   * @param {string[]} [subTypes] - Grid subtypes to support (merged with existing)
   * @returns {CanvasManager} Singleton instance
   * @throws {Error} If constructor is called directly instead of using getInstance
   *
   * @example
   * const manager1 = CanvasManager.getInstance(['occupancyMask'])
   * const manager2 = CanvasManager.getInstance(['colorPacked'])
   * // manager1 === manager2, subTypes now include both types
   */
  static getInstance (subTypes) {
    if (!CanvasManager.#instance) {
      CanvasManager.#instance = new CanvasManager(subTypes || [])
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

  /**
   * Constructor - use getInstance() instead
   *
   * @constructor
   * @param {string[]} subTypes - Initial grid subtypes to support
   * @throws {Error} If called directly (use getInstance instead)
   * @private
   */
  constructor (subTypes = []) {
    if (CanvasManager.#instance) {
      throw new Error('Use getInstance()')
    }
    /** @type {string[]} - Grid subtypes supported by this manager */
    this.subTypes = subTypes
  }

  /**
   * Available grid subtypes
   *
   * @static
   * @type {string[]}
   * @constant
   */
  static subTypes = [
    'occupancyMask',
    'colorMask',
    'occupancyPacked',
    'colorPacked'
  ]

  /**
   * Available depth representations for grid data
   *
   * @static
   * @type {string[]}
   * @constant
   */
  static depthEnum = ['occupancy', 'color']

  /**
   * Available store types for grid data
   *
   * @static
   * @type {string[]}
   * @constant
   */
  static storeTypes = ['mask', 'packed']

  /**
   * Filter subTypes by store type and depth
   *
   * @static
   * @param {string} storeType - Store type ('mask' or 'packed')
   * @param {string} depth - Depth type ('occupancy' or 'color')
   * @returns {string[]} Matching subTypes
   *
   * @example
   * CanvasManager.getSubTypes('mask', 'occupancy')  // ['occupancyMask']
   * CanvasManager.getSubTypes('packed', 'color')    // ['colorPacked']
   */
  static getSubTypes (storeType, depth) {
    return CanvasManager.subTypes.filter(subType => {
      const [store, subDepth] = subType.split(/(?=[A-Z])/)
      return store === storeType && subDepth === depth
    })
  }

  /**
   * Module loaders for draw classes by shape type and subType
   *
   * Maps shape types to their corresponding draw module imports.
   * Each loader returns a Promise resolving to the module containing the Draw class.
   *
   * @static
   * @type {Object<string, Object<string, ModuleLoader>>}
   * @constant
   */
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
      colorPacked: () => import('../../ui/hexagon/colorpackedhexdraw.js')
    }
  }

  /**
   * Module loaders for Canvas classes by shape type and subType
   *
   * Maps shape types to their corresponding Canvas module imports.
   * Each loader returns a Promise resolving to the module containing the Canvas class.
   *
   * @static
   * @type {Object<string, Object<string, ModuleLoader>>}
   * @constant
   */
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
      colorPacked: () => import('../../ui/hexagon/colorpackedhexdraw.js')
    }
  }
  /**
   * Create a draw builder function for the specified shape type and subType
   *
   * Returns a function that creates Draw instances configured with default parameters
   * for the given shape. Parameters vary by shape type (e.g., triangle uses size,
   * rectangle uses width/height, hexagon uses radius).
   *
   * @static
   * @param {string} type - Shape type ('triangle', 'rectangle', 'hexagon')
   * @param {string} subType - Grid subType ('occupancyMask', 'colorMask', etc.)
   * @param {any} module - Imported module containing Draw classes
   * @returns {Function|undefined} Builder function or undefined if combination not supported
   *
   * @example
   * const module = await import('../../ui/rectangle/rectdraw.js')
   * const builder = CanvasManager.createDrawCreator('rectangle', 'occupancyMask', module)
   * const drawer = builder('canvas-id', 10, 10)
   */
  static createDrawCreator (type, subType, module) {
    // NOSONAR - Complex shape configuration requires conditional branching
    if (type === 'triangle' && subType === 'occupancyMask') {
      return (
        /** @type {string} */ canvasId,
        side = 3,
        offsetX = 300,
        offsetY = 300,
        size = 25
      ) =>
        /** @type {any} */ (module).TriDraw.getInstance(
          canvasId,
          side,
          offsetX,
          offsetY,
          size
        )
    }
    if (type === 'rectangle') {
      if (subType === 'occupancyMask') {
        return (
          /** @type {string} */ canvasId,
          width = 10,
          height = 10,
          cellSize = 25,
          offsetX = 0,
          offsetY = 0,
          depth = 2
        ) =>
          /** @type {any} */ (module).RectDraw.getInstance(
            canvasId,
            width,
            height,
            cellSize,
            offsetX,
            offsetY,
            depth
          )
      }
      if (subType === 'colorMask') {
        return (
          /** @type {string} */ canvasId,
          width = 10,
          height = 10,
          cellSize = 25,
          offsetX = 0,
          offsetY = 0,
          depth = 4
        ) =>
          /** @type {any} */ (module).RectDrawColor.getInstance(
            canvasId,
            width,
            height,
            cellSize,
            offsetX,
            offsetY,
            depth
          )
      }
      if (subType === 'occupancyPacked') {
        return (
          /** @type {string} */ canvasId,
          width = 10,
          height = 10,
          cellSize = 25,
          offsetX = 0,
          offsetY = 0,
          depth = 4
        ) =>
          /** @type {any} */ (module).PackedDraw.getInstance(
            canvasId,
            width,
            height,
            cellSize,
            offsetX,
            offsetY,
            depth
          )
      }
      if (subType === 'colorPacked') {
        return (
          /** @type {string} */ canvasId,
          width = 10,
          height = 10,
          cellSize = 25,
          offsetX = 0,
          offsetY = 0,
          depth = 4
        ) =>
          /** @type {any} */ (module).ColorPackedDraw.getInstance(
            canvasId,
            width,
            height,
            cellSize,
            offsetX,
            offsetY,
            depth
          )
      }
    }
    if (type === 'hexagon') {
      if (subType === 'occupancyMask') {
        return (
          /** @type {string} */ canvasId,
          radius = 3,
          offsetX = 300,
          offsetY = 300,
          hexSize = 25
        ) =>
          /** @type {any} */ (module).HexDraw.getInstance(
            canvasId,
            radius,
            offsetX,
            offsetY,
            hexSize
          )
      }
      if (subType === 'occupancyPacked') {
        return (
          /** @type {string} */ canvasId,
          radius = 3,
          offsetX = 300,
          offsetY = 300,
          hexSize = 25
        ) =>
          /** @type {any} */ (module).PackedHexDraw.getInstance(
            canvasId,
            radius,
            offsetX,
            offsetY,
            hexSize
          )
      }
      if (subType === 'colorPacked') {
        return (
          /** @type {string} */ canvasId,
          radius = 3,
          offsetX = 300,
          offsetY = 300,
          hexSize = 25,
          depth = 4
        ) =>
          /** @type {any} */ (module).ColorPackedHexDraw.getInstance(
            canvasId,
            radius,
            offsetX,
            offsetY,
            hexSize,
            depth
          )
      }
    }
  }
  /**
   * Create a canvas builder function for the specified shape type and subType
   *
   * Returns a function that creates Canvas instances configured with default parameters
   * for the given shape. Parameters vary by shape type (e.g., rectangle passes gridInstance,
   * hexagon uses radius/offset).
   *
   * @static
   * @param {string} type - Shape type ('triangle', 'rectangle', 'hexagon')
   * @param {string} subType - Grid subType ('occupancyMask', 'colorMask', etc.)
   * @param {any} module - Imported module containing Canvas classes
   * @returns {Function|undefined} Builder function or undefined if combination not supported
   *
   * @example
   * const module = await import('../../ui/rectangle/rectdraw.js')
   * const builder = CanvasManager.createCanvasCreator('rectangle', 'occupancyMask', module)
   * const canvas = builder('canvas-id', gridInstance, { cellSize: 25 })
   */
  static createCanvasCreator (type, subType, module) {
    // NOSONAR - Complex shape configuration requires conditional branching
    if (type === 'triangle' && subType === 'occupancyMask') {
      return (
        /** @type {string} */ canvasId,
        /** @type {any} */ gridInstance,
        config = {}
      ) =>
        /** @type {any} */ (module).TriDraw.getInstance(
          canvasId,
          gridInstance,
          config
        )
    }
    if (type === 'rectangle') {
      if (subType === 'occupancyMask') {
        return (
          /** @type {string} */ canvasId,
          /** @type {any} */ gridInstance,
          config = {}
        ) =>
          /** @type {any} */ (module).RectCanvas.getInstance(
            canvasId,
            gridInstance,
            config
          )
      }
      if (subType === 'colorMask') {
        return (
          /** @type {string} */ canvasId,
          /** @type {any} */ gridInstance,
          config = {}
        ) =>
          /** @type {any} */ (module).RectCanvasColor.getInstance(
            canvasId,
            gridInstance,
            config
          )
      }
      if (subType === 'occupancyPacked') {
        return (
          /** @type {string} */ canvasId,
          /** @type {any} */ gridInstance,
          config = {}
        ) =>
          /** @type {any} */ (module).PackedDraw.getInstance(
            canvasId,
            gridInstance,
            config
          )
      }
      if (subType === 'colorPacked') {
        return (
          /** @type {string} */ canvasId,
          /** @type {any} */ gridInstance,
          config = {}
        ) =>
          /** @type {any} */ (module).ColorPackedDraw.getInstance(
            canvasId,
            gridInstance,
            config
          )
      }
    }
    if (type === 'hexagon') {
      if (subType === 'occupancyMask') {
        return (
          /** @type {string} */ canvasId,
          radius = 3,
          offsetX = 300,
          offsetY = 300,
          hexSize = 25
        ) =>
          /** @type {any} */ (module).HexDraw.getInstance(
            canvasId,
            radius,
            offsetX,
            offsetY,
            hexSize
          )
      }
      if (subType === 'occupancyPacked') {
        return (
          /** @type {string} */ canvasId,
          radius = 3,
          offsetX = 300,
          offsetY = 300,
          hexSize = 25
        ) =>
          /** @type {any} */ (module).PackedHexDraw.getInstance(
            canvasId,
            radius,
            offsetX,
            offsetY,
            hexSize
          )
      }
      if (subType === 'colorPacked') {
        return (
          /** @type {string} */ canvasId,
          radius = 3,
          offsetX = 300,
          offsetY = 300,
          hexSize = 25,
          depth = 4
        ) =>
          /** @type {any} */ (module).ColorPackedHexDraw.getInstance(
            canvasId,
            radius,
            offsetX,
            offsetY,
            hexSize,
            depth
          )
      }
    }
  }

  /**
   * Get or load canvas builder function for specified type and subType
   *
   * Loads and caches the module and builder function. Subsequent calls return
   * cached builder without reloading the module.
   *
   * @async
   * @param {string} type - Shape type ('triangle', 'rectangle', 'hexagon')
   * @param {string} subType - Grid subType ('occupancyMask', 'colorMask', etc.)
   * @returns {Promise<Function>} Canvas builder function
   *
   * @example
   * const builder = await manager.getCanvasBuilder('rectangle', 'occupancyMask')
   * const canvas = builder('canvas-id', gridInstance, { cellSize: 25 })
   */
  async getCanvasBuilder (type, subType) {
    const cache = /** @type {any} */ (this.#canvasCache)
    let builder = cache[type][subType]
    if (builder) return builder
    const moduleCache = /** @type {any} */ (this.#moduleCache)
    const loaders = /** @type {any} */ (CanvasManager.loaders)
    const mod = moduleCache[type][subType] || (await loaders[type]())
    moduleCache[type][subType] = mod
    builder = CanvasManager.createCanvasCreator(type, subType, mod)
    cache[type][subType] = builder
    return builder
  }

  /**
   * Get or load draw builder function for specified type and subType
   *
   * Loads and caches the module and builder function. Subsequent calls return
   * cached builder without reloading the module.
   *
   * @async
   * @param {string} type - Shape type ('triangle', 'rectangle', 'hexagon')
   * @param {string} subType - Grid subType ('occupancyMask', 'colorMask', etc.)
   * @returns {Promise<Function>} Draw builder function
   *
   * @example
   * const builder = await manager.getDrawBuilder('rectangle', 'occupancyMask')
   * const drawer = builder('canvas-id', 10, 10)
   */
  async getDrawBuilder (type, subType) {
    const cache = /** @type {any} */ (this.#drawCache)
    let builder = cache[type][subType]
    if (builder) return builder
    const moduleCache = /** @type {any} */ (this.#drawModuleCache)
    const loaders = /** @type {any} */ (CanvasManager.loaders)
    const mod = moduleCache[type][subType] || (await loaders[type]())
    moduleCache[type][subType] = mod
    builder = CanvasManager.createDrawCreator(type, subType, mod)
    cache[type][subType] = builder
    return builder
  }

  /**
   * Load both canvas and draw builders for specified type and subType
   *
   * Convenience method that loads both builders in parallel if needed.
   *
   * @async
   * @param {string} type - Shape type ('triangle', 'rectangle', 'hexagon')
   * @param {string} subType - Grid subType ('occupancyMask', 'colorMask', etc.)
   * @returns {Promise<LoadResult>} Object with canvas and draw builder functions
   *
   * @example
   * const { canvas, draw } = await manager.loadFor('rectangle', 'occupancyMask')
   */
  async loadFor (type, subType) {
    const canvas = await this.getCanvasBuilder(type, subType)
    const draw = await this.getDrawBuilder(type, subType)
    return { canvas, draw }
  }

  /**
   * Load canvas and draw builders for all specified subTypes of a shape type
   *
   * @async
   * @param {string} type - Shape type ('triangle', 'rectangle', 'hexagon')
   * @param {string[]} [subTypes=this.subTypes] - SubTypes to load (defaults to all)
   * @returns {Promise<Object<string, LoadAllResult>>} Object indexed by subType containing builders
   *
   * @example
   * const all = await manager.loadAllFor('rectangle')
   * const occupancyBuilders = all.occupancyMask
   */
  async loadAllFor (type, subTypes = this.subTypes) {
    const results = /** @type {Object<string, LoadAllResult>} */ ({})
    for (const subType of subTypes) {
      const { canvas, draw } = await this.loadFor(type, subType)
      results[subType] = { canvas, draw }
    }
    return results
  }

  /**
   * Preload modules in background without blocking
   *
   * Starts async loading of canvas and draw builders for specified subTypes.
   * Does not wait for completion - useful for warming up module cache.
   * Errors are logged but not thrown.
   *
   * @param {string} type - Shape type ('triangle', 'rectangle', 'hexagon')
   * @param {string[]} [subTypes=this.subTypes] - SubTypes to preload (defaults to all)
   * @returns {void}
   *
   * @example
   * manager.preload('rectangle', ['occupancyMask', 'colorPacked'])
   */
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
/**
 * Create a cache object by mapping array elements to generated values
 *
 * Helper function that reduces an array to an object where keys are array elements
 * and values are generated by propgetter function. Supports optional type parameter
 * for contextual generation.
 *
 * @param {string[]} arr - Array of keys to cache
 * @param {Function|string} type - Generator function or optional second parameter
 * @param {Function} [propgetter] - Generator function taking (key, type) returning cache value
 * @returns {Object<string, any>} Cache object with keys from arr and values from propgetter
 *
 * @example
 * // Direct usage with generator
 * const cache = mapToCache(['key1', 'key2'], (key) => ({ value: key }))
 *
 * @example
 * // With type context
 * const cache = mapToCache(['sub1', 'sub2'], 'triangle', (key, type) => `${type}:${key}`)
 */
function mapToCache (arr, type, propgetter) {
  if (typeof propgetter !== 'function') {
    propgetter = /** @type {Function} */ (type)
    type = /** @type {any} */ (undefined)
  }
  const results = /** @type {Object<string, any>} */ ({})
  return arr.reduce((acc, /** @type {string} */ key) => {
    acc[key] = /** @type {Function} */ (propgetter)(key, type)
    return acc
  }, results)
}

export { CanvasManager, mapToCache }
