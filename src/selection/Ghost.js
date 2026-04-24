/**
 * Represents a ghost element for drag preview.
 */
export class Ghost {
  /**
   * Creates a Ghost instance.
   * @param {Object} board - The board data for the ghost
   * @param {string} letter - The ship letter
   * @param {Function} contentBuilder - Function to build the ghost content
   */
  constructor (board, letter, contentBuilder) {
    const element = document.createElement('div')
    element.className = 'ship-ghost'
    this.element = element
    this.letter = letter
    this.contentBuilder = contentBuilder
    contentBuilder(element, board, letter)
    document.body.appendChild(element)
  }

  /**
   * Hides the ghost element.
   */
  hide () {
    this.element.style.opacity = 0
  }

  /**
   * Shows the ghost element.
   */
  show () {
    this.element.style.opacity = ''
  }

  /**
   * Updates the ghost variant with new board data.
   * @param {Object} board - The new board data
   */
  setVariant (board) {
    if (this.element) {
      this.element.innerHTML = ''
      this.contentBuilder(this.element, board, this.letter)
    }
  }

  /**
   * Removes the ghost element from the DOM.
   */
  remove () {
    if (this.element) this.element.remove()
    this.element = null
  }

  /**
   * Moves the ghost element to the specified position.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  moveTo (x, y) {
    if (this.element) {
      this.element.style.left = x + 'px'
      this.element.style.top = y + 'px'
    }
  }
}
