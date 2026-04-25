/**
 * Represents a ghost element for drag preview during ship placement.
 * Displays a preview of the ship being dragged.
 * @class Ghost
 */
export class Ghost {
  /**
   * Creates a Ghost instance.
   * @param {Object} board - The board data for rendering the ghost ship
   * @param {string} letter - The ship letter identifier
   * @param {Function} contentBuilder - Function(element, board, letter) to populate ghost content
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
   * Hides the ghost element by setting opacity to 0.
   * @returns {void}
   */
  hide () {
    this.element.style.opacity = 0
  }

  /**
   * Shows the ghost element by resetting opacity.
   * @returns {void}
   */
  show () {
    this.element.style.opacity = ''
  }

  /**
   * Updates the ghost variant with new board data.
   * Re-renders ghost content using contentBuilder.
   * @param {Object} board - The new board data for rendering
   * @returns {void}
   */
  setVariant (board) {
    if (this.element) {
      this.element.innerHTML = ''
      this.contentBuilder(this.element, board, this.letter)
    }
  }

  /**
   * Removes the ghost element from the DOM and clears reference.
   * @returns {void}
   */
  remove () {
    if (this.element) this.element.remove()
    this.element = null
  }

  /**
   * Positions the ghost element at specified coordinates.
   * @param {number} x - X coordinate in pixels
   * @param {number} y - Y coordinate in pixels
   * @returns {void}
   */
  moveTo (x, y) {
    if (this.element) {
      this.element.style.left = x + 'px'
      this.element.style.top = y + 'px'
    }
  }
}
