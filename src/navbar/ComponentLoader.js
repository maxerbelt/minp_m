/**
 * @typedef {import('./types/shared.types.js').InsertPoint} ComponentLoaderInsertPoint
 * @typedef {import('./types/callbacks.types.js').ComponentLoaderSuccessCallback} ComponentLoaderSuccessCallback
 * @typedef {import('./types/callbacks.types.js').ComponentLoaderErrorCallback} ComponentLoaderErrorCallback
 * @typedef {import('./types/ui.types.js').ComponentLoaderCacheStats} ComponentLoaderCacheStats
 */

/**
 * ComponentLoader handles fetching HTML components and rendering them into the DOM.
 * Provides efficient component loading with caching and concurrent request deduplication.
 *
 * Features:
 * - Automatic caching of fetched components with Map-based storage
 * - Concurrent load deduplication to prevent multiple fetches of same component
 * - Callback support for both success and error scenarios (async-compatible)
 * - Centralized error handling with detailed error messages and logging
 * - Flexible insert point resolution (element ID string or DOM Element reference)
 * - Cache statistics for debugging and performance monitoring
 *
 * @class ComponentLoader
 * @example
 * const loader = new ComponentLoader();
 * await loader.loadComponent('container', 'path/to/component.html',
 *   (html) => console.log('Component loaded'),
 *   (error) => console.error('Failed to load:', error)
 * );
 */
export class ComponentLoader {
  /**
   * Creates a new ComponentLoader instance.
   * Initializes internal caches for component HTML and in-flight fetch promises.
   *
   * @constructor
   */
  constructor () {
    /**
     * Cache of loaded component HTML by file path.
     * Maps component paths to their fetched HTML strings.
     *
     * @type {Map<string, string>}
     * @private
     */
    this.cache = new Map()

    /**
     * In-flight fetch promises by component path.
     * Used to deduplicate concurrent requests for the same component.
     * Promises are removed from this map once fetch completes or fails.
     *
     * @type {Map<string, Promise<string>>}
     * @private
     */
    this.loadingPromises = new Map()
  }

  /**
   * Loads a component, inserts it into the DOM, and invokes callbacks.
   * Deduplicates concurrent requests for the same component path by returning
   * the existing in-flight promise if the component is already being loaded.
   *
   * @public
   * @async
   * @param {ComponentLoaderInsertPoint} insertPoint - Where to insert the component (element ID or Element reference).
   * @param {string} componentPath - Path to component HTML file (relative or absolute URL).
   * @param {ComponentLoaderSuccessCallback|null} [successCallback=null] - Called on successful load with HTML content.
   * @param {ComponentLoaderErrorCallback|null} [errorCallback=null] - Called if load fails with Error object.
   * @returns {Promise<string|null>} Resolves with the loaded HTML content string.
   * @throws {Error} If HTTP request fails, response status is not ok, or component insertion fails.
   * @throws {Error} If insertPoint is invalid (string ID not found, or not an Element).
   *
   * @example
   * try {
   *   const html = await loader.loadComponent(
   *     'myContainer',
   *     '/components/navbar.html',
   *     (html) => console.log('Inserted:', html),
   *     (error) => console.error('Failed:', error)
   *   );
   * } catch (error) {
   *   console.error('Component load error:', error);
   * }
   */
  async loadComponent (
    insertPoint,
    componentPath,
    successCallback = null,
    errorCallback = null
  ) {
    try {
      const html = await this.#fetchComponent(componentPath)
      this.#insertHtml(insertPoint, html)
      await this.#invokeSuccessCallback(successCallback, html)
      return html
    } catch (error) {
      this.#handleComponentError(insertPoint, error, errorCallback)
      throw error
    }
  }

  /**
   * Preloads a component into cache without inserting it into DOM.
   * Useful for preemptively loading components before they're needed to reduce
   * latency when the component is later requested via loadComponent().
   *
   * @public
   * @async
   * @param {string} componentPath - Path to component HTML file.
   * @returns {Promise<string>} Resolves with the loaded HTML content string.
   * @throws {Error} If HTTP request fails or response status is not ok.
   *
   * @example
   * // Preload multiple components to reduce perceived load time
   * await Promise.all([
   *   loader.preloadComponent('/components/navbar.html'),
   *   loader.preloadComponent('/components/footer.html')
   * ]);
   */
  async preloadComponent (componentPath) {
    try {
      const html = await this.#fetchComponent(componentPath)
      return html
    } catch (error) {
      console.error(`Failed to preload component from ${componentPath}:`, error)
      throw error
    }
  }

  /**
   * Returns an existing cached component or begins fetching it.
   * Implements intelligent deduplication: if the same component path is already
   * being fetched concurrently, returns the existing promise instead of making
   * another fetch request. Cached results bypass the fetch entirely.
   *
   * Request deduplication order:
   * 1. Check if fetch is already in-flight → return existing promise
   * 2. Check if HTML is already cached → return cached HTML
   * 3. Start new fetch → track promise → cache result
   *
   * @async
   * @param {string} componentPath - Path to component HTML file.
   * @returns {Promise<string | undefined>} Resolves with HTML content from cache or fetch.
   * @throws {Error} If HTTP request fails or response status is not ok.
   *
   * @example
   * // Multiple concurrent calls for same path automatically deduplicated
   * const [html1, html2] = await Promise.all([
   *   this.#fetchComponent('path/to/component.html'),
   *   this.#fetchComponent('path/to/component.html')  // Uses same promise as html1
   * ]);
   */
  async #fetchComponent (componentPath) {
    // Return existing in-flight fetch to deduplicate concurrent requests
    if (this.loadingPromises.has(componentPath)) {
      return this.loadingPromises.get(componentPath)
    }

    // Return cached result if available
    if (this.cache.has(componentPath)) {
      return this.cache.get(componentPath)
    }

    // Create new fetch and track it to deduplicate concurrent requests
    const fetchPromise = this.#performFetch(componentPath)
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
   * Silently skips insertion if target element cannot be resolved.
   *
   * @param {ComponentLoaderInsertPoint} insertPoint - Target element ID string or Element reference.
   * @param {string} html - HTML content string to insert into target element.
   * @returns {void}
   * @throws {Error} Implicitly throws if innerHTML assignment fails (e.g., due to security policies).
   */
  #insertHtml (insertPoint, html) {
    const element = this.#resolveInsertPoint(insertPoint)
    if (element) {
      element.innerHTML = html
    }
  }

  /**
   * Resolves an insert point to a DOM element reference.
   * Accepts either string element ID (looked up via document.getElementById())
   * or direct Element reference. Returns null if insert point type is neither string nor Element.
   *
   * @param {ComponentLoaderInsertPoint} insertPoint - Element ID string or Element DOM reference.
   * @returns {Element|null} Resolved Element reference, or null if element not found or invalid type.
   *
   * @example
   * // String ID lookup
   * const el1 = this.#resolveInsertPoint('my-container'); // returns element or null
   *
   * // Direct element reference
   * const el2 = this.#resolveInsertPoint(document.body); // returns document.body
   */
  #resolveInsertPoint (insertPoint) {
    if (typeof insertPoint === 'string') {
      return document.getElementById(insertPoint)
    }

    return insertPoint instanceof Element ? insertPoint : null
  }

  /**
   * Safely invokes success callback with loaded HTML content.
   * Handles both synchronous and asynchronous callbacks without rethrowing errors.
   * If callback is not a function, silently returns. Callback errors are caught,
   * logged to console, and not rethrown to prevent cascading failures.
   *
   * @async
   * @param {ComponentLoaderSuccessCallback|null} callback - Success callback function or null/undefined.
   * @param {string} html - Loaded HTML content string to pass to callback.
   * @returns {Promise<void>} Always resolves (never rejects), resolves when callback completes.
   */
  async #invokeSuccessCallback (callback, html) {
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
   * Handles component loading failures with detailed logging and error callback invocation.
   * Constructs informative error message including insert point description and delegates
   * to error callback asynchronously. Callback errors are caught and logged separately.
   *
   * @param {ComponentLoaderInsertPoint} insertPoint - Target element where component was to be inserted.
   * @param {Error} error - The Error object that occurred during component load.
   * @param {ComponentLoaderErrorCallback|null} errorCallback - Error handler callback or null/undefined.
   * @returns {void}
   */
  #handleComponentError (insertPoint, error, errorCallback) {
    const location = this.#describeInsertPoint(insertPoint)
    console.error(`Failed to load component at ${location}:`, error)

    // Invoke error callback asynchronously to prevent blocking
    this.#invokeErrorCallback(errorCallback, error).catch(err => {
      console.error('Unhandled error in error callback:', err)
    })
  }

  /**
   * Creates a human-readable string description of an insert point for error messages.
   * Safely handles string IDs, Element references, and invalid types by generating
   * appropriate descriptions or fallback text.
   *
   * @param {ComponentLoaderInsertPoint} insertPoint - Element ID string or Element reference.
   * @returns {string} Human-readable description for error logging (e.g., "element with id 'my-div'").
   *
   * @example
   * this.#describeInsertPoint('container')        // "element with id "container""
   * this.#describeInsertPoint(document.body)      // "BODY element"
   * this.#describeInsertPoint({})                 // "unknown element"
   */
  #describeInsertPoint (insertPoint) {
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
   * Handles both synchronous and asynchronous error callbacks without rethrowing.
   * If callback is not a function, silently returns. Callback errors are caught,
   * logged to console.error(), and not rethrown to prevent cascading failures.
   *
   * @async
   * @param {ComponentLoaderErrorCallback|null} errorCallback - Error callback function or null/undefined.
   * @param {Error} error - The Error object that occurred during component load.
   * @returns {Promise<void>} Always resolves (never rejects), resolves when callback completes.
   */
  async #invokeErrorCallback (errorCallback, error) {
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
   * Performs HTTP fetch request and caches successful result.
   * Validates response status (via response.ok) and extracts text content.
   * Caches result in this.cache only on success. Throws Error if HTTP
   * request fails, network error occurs, or response.ok is false.
   *
   * @async
   * @param {string} componentPath - Path or URL to component HTML file.
   * @returns {Promise<string>} Resolves with HTML content string.
   * @throws {Error} If fetch fails (network error).
   * @throws {Error} If response.ok is false (includes status code in message).
   *
   * @example
   * // Successful fetch and cache
   * const html = await this.#performFetch('/components/nav.html');
   * // html is cached in this.cache
   *
   * // Failed fetch
   * try {
   *   await this.#performFetch('/missing.html'); // 404 response
   * } catch (error) {
   *   // error: "HTTP error fetching /missing.html: status 404"
   * }
   */
  async #performFetch (componentPath) {
    const response = await fetch(componentPath)

    if (!response.ok) {
      throw new Error(
        `HTTP error fetching ${componentPath}: status ${response.status}`
      )
    }

    const html = await response.text()
    // Cache successful result for future requests
    this.cache.set(componentPath, html)
    return html
  }

  /**
   * Clears all cached component HTML from the cache.
   * Useful for memory management in single-page applications or forcing
   * fresh component loads. In-flight fetch promises are not affected.
   *
   * @public
   * @returns {void}
   *
   * @example
   * // Force fresh loads of all components
   * loader.clearCache();
   * await loader.loadComponent('container', 'component.html');
   */
  clearCache () {
    this.cache.clear()
  }

  /**
   * Returns current cache and loading statistics for monitoring and debugging.
   * Provides visibility into loader internal state: number of cached components
   * and number of currently in-flight fetch requests.
   *
   * @public
   * @returns {ComponentLoaderCacheStats} Object with cachedComponents and loading counts.
   *
   * @example
   * const stats = loader.getCacheStats();
   * console.log(`Cached: ${stats.cachedComponents}, Loading: ${stats.loading}`);
   * // Output: "Cached: 5, Loading: 2"
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
 * Provides a convenient way to instantiate ComponentLoader with default settings
 * without using the `new` keyword.
 *
 * @function
 * @returns {ComponentLoader} New ComponentLoader instance with empty cache and loadingPromises.
 *
 * @example
 * const loader = createComponentLoader();
 * await loader.loadComponent('container', 'nav.html');
 *
 * @example
 * // Equivalent to:
 * const loader = new ComponentLoader();
 */
export function createComponentLoader () {
  return new ComponentLoader()
}
