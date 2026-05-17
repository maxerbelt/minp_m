import { SelectedShip } from './SelectedShip.js'

/**
 * @typedef {Object} Board
 * @property {Function} occupiedLocations
 */

/**
 * @typedef {Object} VariantManager
 * @property {Function} boardFor
 * @property {number} index
 * @property {Function} onChange
 */

/**
 * @typedef {Function} ShipContentBuilder
 */

/**
 * Represents a clicked ship that updates its source element on variant changes.
 * Extends SelectedShip to automatically sync source element when ship variant changes.
 * @class ClickedShip
 * @extends SelectedShip
 */
export class ClickedShip extends SelectedShip {
  /**
   * Creates a ClickedShip instance.
   * @param {Object} ship - The ship object with id, letter, shape() method.
   * @param {HTMLElement|null} source - The source HTML element to keep in sync.
   * @param {number} variantIndex - Index of the current variant.
   * @param {ShipContentBuilder} contentBuilder - Function(element, board, letter) to render ship.
   */
  constructor (ship, source, variantIndex, contentBuilder) {
    super(ship, variantIndex, contentBuilder)
    this.source = source
    this._attachVariantChangeListener()
  }

  /**
   * Returns the active variant manager instance.
   * @returns {VariantManager}
   * @private
   */
  _variantManager () {
    return this.variants
  }

  /**
   * Attaches the variant change callback to refresh the source element.
   * @returns {void}
   * @private
   */
  _attachVariantChangeListener () {
    this._variantManager().onChange = () => {
      this._refreshSourceFromCurrentVariant()
    }
  }

  /**
   * Refreshes the source element from the current variant board.
   * @returns {void}
   * @private
   */
  _refreshSourceFromCurrentVariant () {
    if (!this.source) return
    this._renderVariantInSource(this._variantManager().boardFor())
  }

  /**
   * Renders a variant board into the source element and updates the variant index.
   * @param {Board} board
   * @returns {void}
   * @private
   */
  _renderVariantInSource (board) {
    this.source.innerHTML = ''
    this.contentBuilder(this.source, board, this.letter)
    this.source.dataset.variant = String(this._variantManager().index)
  }
}
