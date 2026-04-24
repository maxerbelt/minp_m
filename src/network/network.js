/**
 * Fetches an HTML component and inserts it into the DOM.
 * @param {string} insertPointId - ID of the element to insert content into
 * @param {string} componentUrl - URL of the component to fetch
 * @param {Function} [callback] - Optional callback function called after insertion
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
        console.log(error)
      }
    }
  } catch (error) {
    console.error(`Failed to load ${insertPointId}:`, error)
    if (typeof callback === 'function') callback(error)
  }
}
