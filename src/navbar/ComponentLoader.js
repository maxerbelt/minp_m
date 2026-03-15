/**
 * ComponentLoader - Handles loading and inserting HTML components
 * Provides reusable component loading with error handling strategies
 */
export class ComponentLoader {
  constructor () {
    this.cache = new Map()
    this.loadingPromises = new Map()
  }

  /**
   * Load component and insert into DOM
   */
  async loadComponent (insertPoint, componentPath, callback = null) {
    try {
      const html = await this._fetchComponent(componentPath)
      this._insertComponent(insertPoint, html)
      await this._executeCallback(callback)
      return html
    } catch (err) {
      this._handleError(insertPoint, err, callback)
      throw err
    }
  }

  /**
   * Load component with caching
   */
  async loadComponentCached (insertPoint, componentPath, callback = null) {
    if (this.cache.has(componentPath)) {
      const html = this.cache.get(componentPath)
      this._insertComponent(insertPoint, html)
      await this._executeCallback(callback)
      return html
    }

    return this.loadComponent(insertPoint, componentPath, callback)
  }

  /**
   * Preload component into cache without inserting
   */
  async preloadComponent (componentPath) {
    if (this.cache.has(componentPath)) {
      return this.cache.get(componentPath)
    }

    try {
      const html = await this._fetchComponent(componentPath)
      this.cache.set(componentPath, html)
      return html
    } catch (err) {
      console.error(`Failed to preload component ${componentPath}:`, err)
      throw err
    }
  }

  /**
   * Fetch component HTML from server
   * @private
   */
  async _fetchComponent (componentPath) {
    // Use cached promise if already loading
    if (this.loadingPromises.has(componentPath)) {
      return this.loadingPromises.get(componentPath)
    }

    const promise = (async () => {
      const res = await fetch(componentPath)

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const html = await res.text()
      this.cache.set(componentPath, html)
      return html
    })()

    this.loadingPromises.set(componentPath, promise)

    try {
      return await promise
    } finally {
      this.loadingPromises.delete(componentPath)
    }
  }

  /**
   * Insert HTML into DOM element
   * @private
   */
  _insertComponent (insertPoint, html) {
    const element = this._getElement(insertPoint)
    if (element) {
      element.innerHTML = html
    }
  }

  /**
   * Get DOM element by ID or element reference
   * @private
   */
  _getElement (insertPoint) {
    if (typeof insertPoint === 'string') {
      return document.getElementById(insertPoint)
    }
    return insertPoint instanceof Element ? insertPoint : null
  }

  /**
   * Execute callback safely
   * @private
   */
  async _executeCallback (callback) {
    if (typeof callback === 'function') {
      try {
        callback()
      } catch (error) {
        console.log('Callback error:', error)
      }
    }
  }

  /**
   * Handle component loading error
   * @private
   */
  _handleError (insertPoint, err, callback) {
    console.error(`Failed to load ${insertPoint}:`, err)

    if (typeof callback === 'function') {
      try {
        callback(err)
      } catch (error) {
        console.log('Error callback failed:', error)
      }
    }
  }

  /**
   * Clear component cache
   */
  clearCache () {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats () {
    return {
      cachedComponents: this.cache.size,
      loading: this.loadingPromises.size
    }
  }
}

/**
 * Create global component loader instance
 */
export function createComponentLoader () {
  return new ComponentLoader()
}
