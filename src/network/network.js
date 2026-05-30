/**
 * Network operations for fetching and injecting HTML components into the DOM.
 * Provides utilities for dynamically loading HTML templates and executing callbacks
 * after insertion, with comprehensive error handling and security considerations.
 *
 * @module network/network
 * @typedef {import('./types/shared.types.js').ComponentCallback} ComponentCallback
 * @typedef {import('./types/component.types.js').ComponentLoadResult} ComponentLoadResult
 * @typedef {import('./types/component.types.js').ComponentLoadConfig} ComponentLoadConfig
 *
 * @security
 * innerHTML is used for dynamic HTML insertion. Ensure the component URL is trusted
 * (same-origin or from a trusted CDN). For untrusted sources, consider sanitizing
 * HTML or using alternative methods (textContent, DOMParser, etc.).
 */

/**
 * Fetches an HTML component from a URL and inserts it into the DOM.
 *
 * Retrieves HTML content from the provided URL using the Fetch API and inserts it
 * into the DOM element with the specified ID. Optionally invokes a callback after
 * successful insertion or when an error occurs during loading or insertion.
 *
 * **Error Handling**:
 * - Network errors: Caught and logged, callback receives error
 * - HTTP errors: Non-2xx status codes throw Error
 * - DOM errors: Element not found or insertion fails
 * - Callback errors: Caught and logged without affecting operation
 *
 * **Security Notes**:
 * - Uses innerHTML which evaluates HTML and scripts; ensure URL is trusted
 * - Does not sanitize HTML content; sanitization is caller's responsibility
 * - CORS restrictions apply; URL must be same-origin or CORS-enabled
 *
 * @async
 * @param {string} insertPointId - DOM element ID where the HTML will be inserted (must exist)
 * @param {string} componentUrl - URL of the HTML component to fetch
 *   - Should be same-origin for security
 *   - Must return HTML content with 2xx status code
 *   - Must be accessible without authentication (or credentials must be configured)
 * @param {ComponentCallback} [callback] - Optional callback invoked after operation
 *   - Called with no arguments on success
 *   - Called with Error object on failure (network, HTTP, DOM, or execution error)
 *   - Exceptions in callback are caught and logged; they do not affect the operation
 * @returns {Promise<void>} Promise that resolves when HTML insertion completes
 *   - Resolves on successful insertion, regardless of callback execution
 *   - Rejects if DOM element not found (not caught internally; will throw)
 *   - Never rejects for fetch/HTTP errors (these are logged and passed to callback)
 * @throws {TypeError} If insertElement is null (DOM element not found) when accessing innerHTML
 *
 * @example
 * // Insert a component with a success callback
 * try {
 *   await fetchComponent('header', '/components/header.html', () => {
 *     console.log('Header loaded successfully')
 *   })
 * } catch (error) {
 *   console.error('Failed to insert component:', error)
 * }
 *
 * @example
 * // Insert a component with error handling in callback
 * await fetchComponent('footer', '/components/footer.html', (error) => {
 *   if (error) {
 *     console.error('Failed to load footer:', error)
 *   } else {
 *     console.log('Footer loaded and inserted')
 *   }
 * })
 *
 * @example
 * // Fetch component without callback
 * await fetchComponent('sidebar', '/components/sidebar.html')
 */
export async function fetchComponent (insertPointId, componentUrl, callback) {
  let html = ''

  try {
    const response = await fetch(componentUrl)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    html = await response.text()
  } catch (error) {
    console.error(`Failed to load ${insertPointId}:`, error)
    if (typeof callback === 'function') {
      try {
        callback(error instanceof Error ? error : new Error(String(error)))
      } catch (callbackError) {
        console.error('Error in component callback:', callbackError)
      }
    }
    return
  }

  try {
    const insertElement = document.getElementById(insertPointId)

    if (!insertElement) {
      throw new TypeError(`DOM element with id "${insertPointId}" not found`)
    }

    // eslint-disable-next-line no-unsanitized/property
    insertElement.innerHTML = html

    if (typeof callback === 'function') {
      try {
        callback()
      } catch (callbackError) {
        console.error('Error in component callback:', callbackError)
      }
    }
  } catch (error) {
    console.error(`Failed to insert component into ${insertPointId}:`, error)
    if (typeof callback === 'function') {
      try {
        callback(error instanceof Error ? error : new Error(String(error)))
      } catch (callbackError) {
        console.error('Error in component callback:', callbackError)
      }
    }
  }
}
