import { SelectedShip } from './SelectedShip.js'

/**
 * Represents a clicked ship that updates its source element on variant changes.
 */
export class ClickedShip extends SelectedShip {
  /**
   * Creates a ClickedShip instance.
   * @param {Object} ship - The ship object
   * @param {HTMLElement} source - The source element to update
   * @param {number} variantIndex - Index of the current variant
   * @param {Function} contentBuilder - Function to build content for the ship
   */
  constructor (ship, source, variantIndex, contentBuilder) {
    super(ship, variantIndex, contentBuilder)
    this.source = source
    this.variants.onChange = () => {
      const board = this.variants.boardFor()
      if (this.source) {
        this.source.innerHTML = ''
        this.contentBuilder(this.source, board, this.letter)
        this.source.dataset.variant = this.variants.index
      }
    }
  }
}
