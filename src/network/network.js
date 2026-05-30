/**
 * Network operations for fetching and injecting HTML components into the DOM.
 * Provides utilities for dynamically loading HTML templates and executing callbacks
 * after insertion, with comprehensive error handling.
 *
 * @module network/network
 * @typedef {import('./types/shared.types.js').ComponentCallback} ComponentCallback
 * @typedef {import('./types/component.types.js').ComponentLoadResult} ComponentLoadResult
 */

/**
 * Fetches an HTML component from a URL and inserts it into the DOM.
 * Retrieves HTML content from the provided URL using the Fetch API and inserts it
 * into the DOM element with the specified ID. Optionally invokes a callback after
 * insertion or if an error occurs. Note: Uses innerHTML which can be vulnerable
 * to XSS attacks; ensure the URL source is trusted.
 *
 * @async
 * @param {string} insertPointId - DOM element ID where the HTML will be inserted
 * @param {string} componentUrl - URL of the HTML component to fetch (must be same-origin or CORS-enabled)
 * @param {ComponentCallback} [callback] - Optional callback invoked after insertion (called with error on failure)
 * @returns {Promise<void>} Promise that resolves when component is inserted and callback (if provided) completes
 * @throws {Error} Does not throw directly; errors are caught and logged, callback receives error if provided
 *
 * @example
 * // Insert a component with a success callback
 * await fetchComponent('header', '/components/header.html', () => {
 *   console.log('Header loaded successfully')
 * })
 *
 * @example
 * // Insert a component with error handling
 * await fetchComponent('footer', '/components/footer.html', (error) => {
 *   if (error) {
 *     console.error('Failed to load footer:', error)
 *   }
 * })
 */
export async function fetchComponent (insertPointId, componentUrl, callback) {
  try {
    const response = await fetch(componentUrl)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const insertElement = document.getElementById(insertPointId)
    insertElement.innerHTML = html

    if (typeof callback === 'function') {
      try {
        callback()
      } catch (error) {
        console.error(error)
      }
    }
  } catch (error) {
    console.error(`Failed to load ${insertPointId}:`, error)
    if (typeof callback === 'function') callback(error)
  }
}
