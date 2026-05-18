import { Waters } from './Waters.js'
import { moveCursorBase, PlacementUI } from './placementUI.js'

/**
 *
 * @class Placement
 * @extends Waters
 */
export class Placement extends Waters {
  /**
   * Creates a Placement AI player instance.
   * @param {PlacementUI} placementUI - The placement player UI instance
   * @param {string|null} [playerType] - Type of player (AI, Human, etc.)
   */
  constructor (placementUI, playerType = null) {
    super(placementUI, playerType)
  }

  /**
   * Moves the cursor.
   * @param {KeyboardEvent} event - The keyboard event.
   */
  moveCursor (event) {
    moveCursorBase(event, this.UI, this)
  }
}
