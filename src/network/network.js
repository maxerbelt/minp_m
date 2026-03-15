export async function fetchComponent (insertPoint, component, callback) {
  try {
    const res = await fetch(component)

    // Check if the request was successful
    if (!res.ok) {
      // Create a specific error for non-successful HTTP status codes
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    // Await the promise returned by the .text() method (or .json() if applicable)
    const html = await res.text()
    const insertableNode = document.getElementById(insertPoint)
    // Do something with the html
    insertableNode.innerHTML = html

    if (typeof callback === 'function') {
      try {
        callback()
      } catch (error) {
        console.log(error)
      }
    }
  } catch (err) {
    // The catch block handles any errors from the fetch call itself or from the processing (e.g., .text())
    console.error(`Failed to load ${insertPoint}:`, err)
    if (typeof callback === 'function') callback(err)
  }
}
