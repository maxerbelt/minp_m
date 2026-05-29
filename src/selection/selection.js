import { SelectedShip } from './SelectedShip.js'

/**
 * @typedef {Object} Board
 * @property {Function} occupiedLocations - Generator function yielding occupied cell coordinates
 * @property {number} occupancy - Number of occupied cells in the board
 * @property {bigint} bits - Bitboard representation of occupied cells
 */

/**
 * @typedef {Object} VariantManager
 * @property {Function} boardFor - Get board for current variant: () => Board
 * @property {number} index - Current variant index (0-based)
 * @property {Function|undefined} onChange - Optional callback fired when variant changes: () => void
 * @property {Function} rotate - Rotate variant clockwise: () => void
 * @property {Function} leftRotate - Rotate variant counter-clockwise: () => void
 * @property {Function} flip - Flip variant horizontally: () => void
 * @property {Function} nextForm - Advance to next transformation form: () => void
 * @property {boolean} canRotate - Whether variant supports rotation
 * @property {boolean} canFlip - Whether variant supports flipping
 * @property {boolean} canTransform - Whether variant supports form transformation
 */

/**
 * @typedef {Function} ShipContentBuilder
 * @param {HTMLElement} element - Target DOM element to render into
 * @param {Board} board - Variant board configuration
 * @param {string} letter - Ship identifier letter
 * @returns {void}
 */

/**
 * Represents a clicked/selected ship with automatic DOM synchronization.
 * Extends SelectedShip to keep a source HTML element in sync whenever the ship's variant changes.
 *
 * Key features:
 * - Automatic variant change detection via onChange listener
 * - DOM element content regeneration on variant changes
 * - Variant index tracking in element.dataset.variant attribute
 * - Safe HTML clearing and regeneration via contentBuilder callback
 *
 * @class ClickedShip
 * @extends SelectedShip
 * @property {HTMLElement|null} source - Source DOM element kept in sync with variant changes
 *
 * @example
 * const ship = new ClickedShip(shipObj, element, 0, renderShipBoard);
 * // Variant changes automatically update the element's content and dataset.variant
 */
export class ClickedShip extends SelectedShip {
  /**
   * Creates a ClickedShip instance with optional source element synchronization.
   *
   * Initializes the ship's variant management and sets up automatic DOM updates.
   * The onChange listener is immediately attached to refresh the source element
   * whenever the variant manager detects changes.
   *
   * @param {Object} ship - The ship object for this clicked/selected instance
   * @param {string} ship.id - Unique ship identifier
   * @param {string} ship.letter - Display letter for the ship
   * @param {Function} ship.shape - Returns shape object with variants() method
   * @param {HTMLElement|null} source - Source HTML element to keep in sync; if null, no DOM updates occur
   * @param {number} variantIndex - Initial variant index (0-based); must be valid for the ship's variant list
   * @param {ShipContentBuilder} contentBuilder - Callback to render ship content into DOM element
   */
  constructor (ship, source, variantIndex, contentBuilder) {
    super(ship, variantIndex, contentBuilder)
    this.source = source
    this._attachVariantChangeListener()
  }

  /**
   * Returns the active variant manager instance.
   *
   * Provides convenient access to the variant manager created during parent class initialization.
   * This method ensures consistent access to the variant state and operations.
   *
   * @returns {VariantManager} Active variant manager with board/transform operations
   * @private
   */
  _variantManager () {
    return this.variants
  }

  /**
   * Attaches a callback to the variant manager's onChange event.
   *
   * Sets up automatic source element refresh whenever the variant changes.
   * The callback is invoked immediately after any variant operation (rotate, flip, transform).
   * If source is null, no updates will occur (checked in _refreshSourceFromCurrentVariant).
   *
   * @returns {void}
   * @private
   */
  _attachVariantChangeListener () {
    this._variantManager().onChange = () => {
      this._refreshSourceFromCurrentVariant()
    }
  }

  /**
   * Refreshes the source element to match the current variant's board state.
   *
   * Retrieves the current variant's board via boardFor() and delegates rendering
   * to _renderVariantInSource(). Safely handles null source elements by early return.
   *
   * Called automatically when variant changes via onChange listener.
   *
   * @returns {void}
   * @private
   */
  _refreshSourceFromCurrentVariant () {
    if (!this.source) return
    this._renderVariantInSource(this._variantManager().boardFor())
  }

  /**
   * Renders a variant board into the source element and updates variant metadata.
   *
   * Process:
   * 1. Clears existing source element content via innerHTML = ''
   * 2. Invokes contentBuilder to render new board representation
   * 3. Updates element.dataset.variant with current variant index for tracking
   *
   * The contentBuilder is responsible for safe HTML generation; clearing via innerHTML
   * is acceptable here as contentBuilder controls all content generation.
   *
   * @param {Board} board - Current variant board configuration with cells and occupancy
   * @returns {void}
   * @private
   */
  _renderVariantInSource (board) {
    // Clear existing content before rendering new variant
    this.source.innerHTML = ''
    this.contentBuilder(this.source, board, this.letter)
    // Update dataset to reflect current variant index for external tracking
    this.source.dataset.variant = String(this._variantManager().index)
  }
}
