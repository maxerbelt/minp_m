import { ToTitleCase } from '../../core/utils.js'

class ShapeManager {
  #options = {}
  #moduleCache = {}
  #builderCache = {}
  #defaultCache = ShapeManager.newThrowingCacheWith(
    type => ToTitleCase(type) + ' indexer not loaded'
  )
  state = 'idle'
  current = null
  requestId = 0
  static types = ['triangle', 'rectangle', 'hexagon']
  static loaders = {
    triangle: () => import('../../grid/triangle/TriIndex.js'),
    rectangle: () => import('../../grid/rectangle/RectIndex.js'),
    hexagon: () => import('../../grid/hexagon/CubeIndex.js')
  }
  static newFilledCache (value) {
    return fillObject(ShapeManager.types, value)
  }
  static newCacheWith (prop) {
    return mapToObject(ShapeManager.types, prop)
  }
  static newThrowingCacheWith (prop) {
    return mapToObject(ShapeManager.types, type => {
      return () => {
        throw new Error(prop(type))
      }
    })
  }
  static createIndexerBuilder (type, module) {
    switch (type) {
      case 'triangle':
        return side => module.TriIndex.getInstance(side)
      case 'rectangle':
        return (width, height) => module.RectIndex.getInstance(width, height)
      case 'hexagon':
        return radius => module.CubeIndex.getInstance(radius)
    }
  }
  static #instance

  static getInstance () {
    if (!ShapeManager.#instance) {
      ShapeManager.#instance = new ShapeManager()
    }
    return ShapeManager.#instance
  }

  constructor () {
    if (ShapeManager.#instance) {
      throw new Error('Use getInstance()')
    }
  }

  get types () {
    const builderCache = this.#builderCache
    return {
      triangle: side => ({
        type: 'triangle',
        side,
        get indexer () {
          return builderCache['triangle'](this.side)
        }
      }),
      rectangle: (width, height) => ({
        type: 'rectangle',
        width,
        height,
        get indexer () {
          return builderCache['rectangle'](this.width, this.height)
        }
      }),
      hexagon: radius => ({
        type: 'hexagon',
        radius,
        get indexer () {
          return builderCache['hexagon'](this.radius)
        }
      }) /*,
    triangleRect: (height, width) => ({
      type: 'triangle-rect',
      height,
      width,
      get indexer () {
        return new TriRectIndex(this.height, this.width)
      }
    })
      */
    }
  }

  async select (type) {
    const id = ++this.requestId
    this.state = 'loading'

    try {
      const builder = await this.getBuilderFor(type)

      // stale request check
      if (id !== this.requestId) return null
      this.currentIndexerBuilder = builder
      this.state = 'ready'

      return this.currentIndexerBuilder
    } catch (err) {
      if (id !== this.requestId) return null

      this.state = 'error'
      throw err
    }
  }
  async getBuilderFor (type) {
    let builder = this.#builderCache[type]
    if (builder) return builder
    const module =
      this.#moduleCache[type] || (await ShapeManager.loaders[type]())
    this.#moduleCache[type] = module
    builder = ShapeManager.createIndexerBuilder(type, module)
    this.#builderCache[type] = builder
    return builder
  }

  getBuilder () {
    return this.#builderCache[this.current] || this.#defaultCache[this.current]
  }

  getState () {
    return this.state
  }
  addOption (option) {
    this.#options[option.name] = option
  }

  get with () {
    return this.#options
  }
  get display () {
    return this.#options?.['display']
  }
  preload (types) {
    // background only — no state change
    for (const type of types) {
      this.preLoadFor(type)
    }
  }

  preLoadFor (type) {
    this.getBuilderFor(type)
      .then(builder => {
        this.currentIndexerBuilder = builder
      })
      .catch(err => {
        console.error(`Failed to preload indexer for ${type}:`, err)
      })
  }
  loadOptionFor (type, option) {
    option
      .loadAllFor(type)
      .then(builder => {
        this.currentIndexerBuilder = builder
      })
      .catch(err => {
        console.error(`Failed to preload options for ${type}:`, err)
      })
  }
}

function mapToObject (arr, propgetter) {
  return arr.reduce((acc, key) => {
    acc[key] = propgetter(key)
    return acc
  }, {})
}
function fillObject (arr, value) {
  return arr.reduce((acc, key) => {
    acc[key] = value
    return acc
  }, {})
}
export { ShapeManager }
