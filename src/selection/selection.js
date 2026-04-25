import { SelectedShip } from './SelectedShip.js'

/**
 * Represents a clicked ship that updates its source element on variant changes.
 * Extends SelectedShip to automatically sync source element when ship variant changes.
 * @class ClickedShip
 * @extends SelectedShip
 */
export class ClickedShip extends SelectedShip {
  /**
   * Creates a ClickedShip instance.
   * @param {Object} ship - The ship object with id, letter, shape() method
   * @param {HTMLElement} source - The source HTML element to keep in sync
   * @param {number} variantIndex - Index of the current variant
   * @param {Function} contentBuilder - Function(element, board, letter) to render ship
   */
  constructor (ship, source, variantIndex, contentBuilder) {
    super(ship, variantIndex, contentBuilder)
    this.source = source
    this._setupVariantChangeHandler()
  }

  /**
   * Sets up the onChange handler to sync source element when variant changes.
   * @returns {void}
   * @private
   */
  _setupVariantChangeHandler () {
    this.variants.onChange = () => {
      this._updateSourceElement()
    }
  }

  /**
   * Updates the source element with current variant board and dataset.
   * @returns {void}
   * @private
   */
  _updateSourceElement () {
    if (!this.source) return

    const board = this.variants.boardFor()
    this.source.innerHTML = ''
    this.contentBuilder(this.source, board, this.letter)
    this.source.dataset.variant = this.variants.index
  }
}
