/**
 * @import type { ContentBuilderFunction } from './types/ui.types.js';
 */

/**
 * Represents a ghost element for visual drag preview during ship placement.
 * Creates and manages a temporary DOM element that follows the cursor during ship dragging operations,
 * providing visual feedback of the ship's current rotation/orientation and placement status.
 * The ghost element is positioned in screen coordinates and follows the cursor with appropriate offset.
 *
 * @class Ghost
 * @description Manages visual preview of ship being dragged across the game board.
 * Handles visibility toggling, position updates, DOM lifecycle, and content re-rendering when variants change.
 * Prevents memory leaks by properly cleaning up DOM references on removal.
 *
 * @example
 * const contentBuilder = (el, board, letter) => {
 *   el.innerHTML = `<div class="ship-preview">${letter}</div>`;
 * };
 * const ghost = new Ghost(board, 'A', contentBuilder);
 * ghost.moveTo(100, 150);
 * ghost.show();
 * // Later, when drag completes:
 * ghost.remove();
 */
export class Ghost {
  /**
   * Creates a Ghost instance with initial element and content.
   * Initializes a hidden ghost element positioned at origin with ship representation.
   * The element is appended to document body for absolute positioning relative to viewport.
   *
   * @param {BoardData} board - Board configuration data for initial ghost content rendering
   * @param {string} letter - Ship letter identifier (A, B, C, etc.) used to identify the ghost
   * @param {ContentBuilderFunction} contentBuilder - Function to populate ghost element HTML content
   * Receives (element, board, letter) and should set innerHTML or appendChild to render ship preview
   *
   * @returns {void}
   *
   * @private
   * @description Constructor sets up ghost DOM element with initial styling and content.
   * Stores references to letter and contentBuilder for later updates during drag operations.
   */
  constructor (board, letter, contentBuilder) {
    /**
     * @type {HTMLElement|null}
     * @description DOM element representing the ghost ship preview. Set to null after removal to prevent memory leaks.
     * @private
     */
    const element = document.createElement('div')
    element.className = 'ship-ghost'
    this.element = element

    /**
     * @type {string}
     * @description Ship letter identifier used during initialization and variant updates.
     * @private
     */
    this.letter = letter

    /**
     * @type {ContentBuilderFunction}
     * @description Function reference stored for re-rendering ghost content when variant changes.
     * @private
     */
    this.contentBuilder = contentBuilder
    contentBuilder(element, board, letter)
    document.body.appendChild(element)
  }

  /**
   * Hides the ghost element by reducing opacity to 0.
   * Makes the ghost invisible while keeping DOM element attached and positioned.
   * Used when drag operation is cancelled, paused, or completed without placement.
   * Can be reversed by calling show() to restore visibility.
   *
   * @returns {void}
   *
   * @description Sets CSS opacity to 0 for fade-out effect without removing element from DOM.
   * Maintains document structure so positioning is preserved for subsequent show() call.
   */
  hide () {
    if (this.element) {
      this.element.style.opacity = 0
    }
  }

  /**
   * Shows the ghost element by resetting opacity to full visibility.
   * Makes the ghost fully visible after being hidden.
   * Called when drag operation starts or is resumed after being paused.
   * Restores the element to its previously positioned location with full opacity.
   *
   * @returns {void}
   *
   * @description Resets CSS opacity to default empty string, allowing CSS rules to apply.
   * Enables fade-in effect when ghost is shown again after hide() call.
   */
  show () {
    if (this.element) {
      this.element.style.opacity = ''
    }
  }

  /**
   * Updates the ghost variant with new board data and re-renders its content.
   * Called after ship variant changes to ensure ghost reflects active variant.
   * Clears existing content and rebuilds using contentBuilder with new board state.
   * Synchronizes ghost visual state with parent SelectedShip state during drag operations.
   *
   * @param {BoardData} board - New board configuration data for re-rendering ghost content
   * Contains updated terrain, variant, or config that affects how ghost ship preview looks
   *
   * @returns {void}
   *
   * @description Clears existing innerHTML and calls contentBuilder to regenerate ship preview HTML.
   * Preserves element position and visibility state while updating only the rendered content.
   * Allows visual feedback to reflect rotation/flip transformations during drag.
   */
  setVariant (board) {
    if (this.element) {
      this.element.innerHTML = ''
      this.contentBuilder(this.element, board, this.letter)
    }
  }

  /**
   * Removes the ghost element from the DOM and clears all references.
   * Called during cleanup after drag completion, cancellation, or placement validation failure.
   * Prevents memory leaks by ensuring ghost DOM elements and internal references are completely freed.
   * After removal, this ghost instance should not be used again.
   *
   * @returns {void}
   *
   * @description Removes element from document body and sets internal reference to null.
   * Nullifies this.element to prevent accidental reuse and enable garbage collection.
   * Use this to clean up after drag operation ends to avoid DOM bloat.
   */
  remove () {
    if (this.element) {
      this.element.remove()
    }
    this.element = null
  }

  /**
   * Positions the ghost element at specified screen coordinates.
   * Updates visual position of ghost preview to follow cursor during drag operation.
   * Coordinates are in viewport/screen pixels, not grid coordinates.
   * Ghost remains positioned relative to viewport (absolute positioning).
   *
   * @param {number} x - X coordinate in pixels relative to viewport left edge
   * Typically derived from mouse event clientX minus drag offset
   * @param {number} y - Y coordinate in pixels relative to viewport top edge
   * Typically derived from mouse event clientY minus drag offset
   *
   * @returns {void}
   *
   * @description Sets left and top CSS properties to position element in viewport.
   * Converts numeric pixel values to CSS pixel strings for positioning.
   * Called frequently during mousemove events to keep ghost aligned with cursor.
   */
  moveTo (x, y) {
    if (this.element) {
      this.element.style.left = x + 'px'
      this.element.style.top = y + 'px'
    }
  }
}
