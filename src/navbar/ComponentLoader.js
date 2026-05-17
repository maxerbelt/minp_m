/**
 * @typedef {string | Element} ComponentLoaderInsertPoint
 * Target location where component HTML will be inserted.
 */

/**
 * @callback ComponentLoaderSuccessCallback
 * Callback invoked when component is successfully loaded.
 * @param {string} html - The loaded HTML content.
 * @returns {void | Promise<void>}
 */

/**
 * @callback ComponentLoaderErrorCallback
 * Callback invoked when component loading fails.
 * @param {Error} error - The error that occurred.
 * @returns {void | Promise<void>}
 */

/**
 * @typedef {Object} ComponentLoaderCacheStats
 * Statistics about loader cache state.
 * @property {number} cachedComponents - Number of cached components.
 * @property {number} loading - Number of in-flight fetch operations.
 */

/**
 * ComponentLoader handles fetching HTML components and rendering them into the DOM.
 * Features:
 * - Automatic caching of fetched components
 * - Concurrent load deduplication to prevent multiple fetches of same component
 * - Callback support for both success and error scenarios
 * - Centralized error handling with detailed error messages
 * - Flexible insert point resolution (element ID or DOM reference)
 */
export class ComponentLoader {
  /**
   * Creates a new ComponentLoader instance.
   * Initializes cache and loading promise tracking.
   */
  constructor () {
    /** @type {Map<string, string>} Cache of loaded component HTML by path */
    this.cache = new Map()
    /** @type {Map<string, Promise<string>>} In-flight fetch promises by path */
    this.loadingPromises = new Map()
  }

  /**
   * Loads a component, inserts it into the DOM, and invokes callbacks.
   * Deduplicates concurrent requests for the same component path.
   * @param {ComponentLoaderInsertPoint} insertPoint - Where to insert the component.
   * @param {string} componentPath - Path to component file.
   * @param {ComponentLoaderSuccessCallback|null} [successCallback=null] - Called on successful load.
   * @param {ComponentLoaderErrorCallback|null} [errorCallback=null] - Called if load fails.
   * @returns {Promise<string>} The loaded HTML content.
   * @throws {Error} If component fetch fails after all retries.
   */
  async loadComponent (
    insertPoint,
    componentPath,
    successCallback = null,
    errorCallback = null
  ) {
    try {
      const html = await this._fetchComponent(componentPath)
      this._insertHtml(insertPoint, html)
      await this._invokeSuccessCallback(successCallback, html)
      return html
    } catch (error) {
      this._handleComponentError(insertPoint, error, errorCallback)
      throw error
    }
  }

  /**
   * Preloads a component into cache without inserting it into DOM.
   * Useful for preemptively loading components before they're needed.
   * @param {string} componentPath - Path to component file.
   * @returns {Promise<string>} The loaded HTML content.
   * @throws {Error} If component fetch fails.
   */
  async preloadComponent (componentPath) {
    try {
      const html = await this._fetchComponent(componentPath)
      return html
    } catch (error) {
      console.error(`Failed to preload component from ${componentPath}:`, error)
      throw error
    }
  }

  /**
   * Returns an existing cached component or begins fetching it.
   * Deduplicates concurrent requests for same path by returning existing promise.
   * @private
   * @param {string} componentPath - Path to component file.
   * @returns {Promise<string>} HTML content from cache or fetch.
   */
  async _fetchComponent (componentPath) {
    // Return existing in-flight fetch to deduplicate concurrent requests
    if (this.loadingPromises.has(componentPath)) {
      return this.loadingPromises.get(componentPath)
    }

    // Return cached result if available
    if (this.cache.has(componentPath)) {
      return this.cache.get(componentPath)
    }

    // Create new fetch and track it to deduplicate concurrent requests
    const fetchPromise = this._performFetch(componentPath)
    this.loadingPromises.set(componentPath, fetchPromise)

    try {
      const html = await fetchPromise
      return html
    } finally {
      this.loadingPromises.delete(componentPath)
    }
  }

  /**
   * Inserts HTML content into target element by setting innerHTML.
   * @private
   * @param {ComponentLoaderInsertPoint} insertPoint - Target element or ID.
   * @param {string} html - HTML content to insert.
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
   * Accepts either element ID string or Element reference.
   * @private
   * @param {ComponentLoaderInsertPoint} insertPoint - ID string or Element.
   * @returns {Element|null} Resolved element or null if not found.
   */
  _resolveInsertPoint (insertPoint) {
    if (typeof insertPoint === 'string') {
      return document.getElementById(insertPoint)
    }

    return insertPoint instanceof Element ? insertPoint : null
  }

  /**
   * Safely invokes success callback with loaded HTML.
   * Handles both synchronous and asynchronous callbacks.
   * @private
   * @param {ComponentLoaderSuccessCallback|null} callback - Callback to invoke.
   * @param {string} html - Loaded HTML content.
   * @returns {Promise<void>} Resolves when callback completes.
   */
  async _invokeSuccessCallback (callback, html) {
    if (typeof callback !== 'function') {
      return
    }

    try {
      await callback(html)
    } catch (error) {
      console.error('Success callback error:', error)
    }
  }

  /**
   * Handles component loading failures with logging and error callback.
   * Constructs informative error message and delegates to error callback.
   * @private
   * @param {ComponentLoaderInsertPoint} insertPoint - Where component was to be inserted.
   * @param {Error} error - The error that occurred during load.
   * @param {ComponentLoaderErrorCallback|null} errorCallback - Callback for error handling.
   * @returns {void}
   */
  _handleComponentError (insertPoint, error, errorCallback) {
    const location = this._describeInsertPoint(insertPoint)
    console.error(`Failed to load component at ${location}:`, error)

    // Invoke error callback asynchronously
    this._invokeErrorCallback(errorCallback, error).catch(err => {
      console.error('Unhandled error in error callback:', err)
    })
  }

  /**
   * Creates a string description of an insert point for error messages.
   * Handles both element IDs and Element references safely.
   * @private
   * @param {ComponentLoaderInsertPoint} insertPoint - Element ID or reference.
   * @returns {string} Human-readable description.
   */
  _describeInsertPoint (insertPoint) {
    if (typeof insertPoint === 'string') {
      return `element with id "${insertPoint}"`
    }

    if (insertPoint instanceof Element) {
      const id = insertPoint.id
      return id ? `element with id "${id}"` : `${insertPoint.tagName} element`
    }

    return 'unknown element'
  }

  /**
   * Safely invokes error callback when component load fails.
   * Handles both synchronous and asynchronous error callbacks.
   * @private
   * @param {ComponentLoaderErrorCallback|null} errorCallback - Error callback to invoke.
   * @param {Error} error - The error that occurred.
   * @returns {Promise<void>} Resolves when callback completes.
   */
  async _invokeErrorCallback (errorCallback, error) {
    if (typeof errorCallback !== 'function') {
      return
    }

    try {
      await errorCallback(error)
    } catch (callbackError) {
      console.error('Error callback invocation failed:', callbackError)
    }
  }

  /**
   * Performs HTTP fetch and caches result.
   * Validates response status and extracts text content.
   * @private
   * @param {string} componentPath - Path to component file.
   * @returns {Promise<string>} HTML content.
   * @throws {Error} If HTTP request fails or response is not ok.
   */
  async _performFetch (componentPath) {
    const response = await fetch(componentPath)

    if (!response.ok) {
      throw new Error(
        `HTTP error fetching ${componentPath}: status ${response.status}`
      )
    }

    const html = await response.text()
    // Cache successful result
    this.cache.set(componentPath, html)
    return html
  }

  /**
   * Clears all cached component HTML.
   * Useful for memory management or forcing fresh loads.
   * @returns {void}
   */
  clearCache () {
    this.cache.clear()
  }

  /**
   * Returns current cache and loading statistics.
   * Useful for debugging and monitoring loader state.
   * @returns {ComponentLoaderCacheStats} Object with cache metrics.
   */
  getCacheStats () {
    return {
      cachedComponents: this.cache.size,
      loading: this.loadingPromises.size
    }
  }
}

/**
 * Factory function for creating a new ComponentLoader instance.
 * Provides a convenient way to instantiate ComponentLoader with default settings.
 * @returns {ComponentLoader} New ComponentLoader instance.
 */
export function createComponentLoader () {
  return new ComponentLoader()
}
