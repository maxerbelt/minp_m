/**
 * @typedef {string | Element} ComponentLoaderInsertPoint
 */

/**
 * @callback ComponentLoaderCallback
 * @param {string} [html]
 * @returns {void | Promise<void>}
 */

/**
 * @typedef {Object} ComponentLoaderCacheStats
 * @property {number} cachedComponents
 * @property {number} loading
 */

/**
 * ComponentLoader handles fetching HTML components and rendering them into the DOM.
 * It manages caching, concurrent loads, and callback invocation with centralized error handling.
 */
export class ComponentLoader {
  constructor () {
    this.cache = new Map()
    this.loadingPromises = new Map()
  }

  /**
   * Loads a component, inserts it into the DOM, and invokes a callback.
   * @param {ComponentLoaderInsertPoint} insertPoint
   * @param {string} componentPath
   * @param {ComponentLoaderCallback|null} callback
   * @returns {Promise<string>}
   */
  async loadComponent (insertPoint, componentPath, callback = null) {
    try {
      const html = await this._fetchComponent(componentPath)
      this._insertHtml(insertPoint, html)
      await this._invokeCallback(callback, html)
      return html
    } catch (error) {
      this._handleLoadError(insertPoint, error, callback)
      throw error
    }
  }

  /**
   * Loads a component using cache if available.
   * @param {ComponentLoaderInsertPoint} insertPoint
   * @param {string} componentPath
   * @param {ComponentLoaderCallback|null} callback
   * @returns {Promise<string>}
   */
  async loadComponentCached (insertPoint, componentPath, callback = null) {
    return this.loadComponent(insertPoint, componentPath, callback)
  }

  /**
   * Preloads a component into cache without inserting it.
   * @param {string} componentPath
   * @returns {Promise<string>}
   */
  async preloadComponent (componentPath) {
    try {
      return await this._fetchComponent(componentPath)
    } catch (error) {
      console.error(`Failed to preload component ${componentPath}:`, error)
      throw error
    }
  }

  /**
   * Returns an existing cached component or begins fetching it.
   * @private
   * @param {string} componentPath
   * @returns {Promise<string>}
   */
  async _fetchComponent (componentPath) {
    const cachedPromise = this.loadingPromises.get(componentPath)
    if (cachedPromise) {
      return cachedPromise
    }

    const fetchPromise = this._createFetchPromise(componentPath)
    this.loadingPromises.set(componentPath, fetchPromise)

    try {
      return await fetchPromise
    } finally {
      this.loadingPromises.delete(componentPath)
    }
  }

  /**
   * Creates a promise for fetching component HTML.
   * @private
   * @param {string} componentPath
   * @returns {Promise<string>}
   */
  async _createFetchPromise (componentPath) {
    const response = await fetch(componentPath)

    if (!response.ok) {
      throw new Error(
        `HTTP error fetching ${componentPath}: ${response.status}`
      )
    }

    const html = await response.text()
    this.cache.set(componentPath, html)
    return html
  }

  /**
   * Inserts HTML content into the target element.
   * @private
   * @param {ComponentLoaderInsertPoint} insertPoint
   * @param {string} html
   * @returns {void}
   */
  _insertHtml (insertPoint, html) {
    const element = this._resolveInsertPoint(insertPoint)
    if (element) {
      element.innerHTML = html
    }
  }

  /**
   * Resolves an insert point to a DOM element reference.
   * @private
   * @param {ComponentLoaderInsertPoint} insertPoint
   * @returns {Element|null}
   */
  _resolveInsertPoint (insertPoint) {
    if (typeof insertPoint === 'string') {
      return document.getElementById(insertPoint)
    }

    return insertPoint instanceof Element ? insertPoint : null
  }

  /**
   * Invokes a callback safely.
   * @private
   * @param {ComponentLoaderCallback|null} callback
   * @param {string} html
   * @returns {Promise<void>}
   */
  async _invokeCallback (callback, html) {
    if (typeof callback !== 'function') {
      return
    }

    try {
      await callback(html)
    } catch (error) {
      console.log('Callback error:', error)
    }
  }

  /**
   * Handles load failures and reports errors through callback.
   * @private
   * @param {ComponentLoaderInsertPoint} insertPoint
   * @param {Error} error
   * @param {ComponentLoaderCallback|null} callback
   * @returns {void}
   */
  _handleLoadError (insertPoint, error, callback) {
    console.error(`Failed to load component at ${insertPoint}:`, error)

    if (typeof callback !== 'function') {
      return
    }

    try {
      callback(error)
    } catch (callbackError) {
      console.log('Error callback failed:', callbackError)
    }
  }

  /**
   * Clears the cached component HTML.
   * @returns {void}
   */
  clearCache () {
    this.cache.clear()
  }

  /**
   * Returns cache and loading statistics.
   * @returns {ComponentLoaderCacheStats}
   */
  getCacheStats () {
    return {
      cachedComponents: this.cache.size,
      loading: this.loadingPromises.size
    }
  }
}

/**
 * Creates a new ComponentLoader instance.
 * @returns {ComponentLoader}
 */
export function createComponentLoader () {
  return new ComponentLoader()
}
