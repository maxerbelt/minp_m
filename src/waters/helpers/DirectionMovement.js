/**
 * Manages directional navigation across UI element trays with wraparound support.
 * Handles both within-tray horizontal movement (RIGHT/LEFT) and between-tray
 * vertical movement (UP/DOWN) with circular navigation.
 *
 * @class DirectionMovement
 */
export class DirectionMovement {
  /** @readonly */
  static DIRECTIONS = {
    RIGHT: 'RIGHT',
    DOWN: 'DOWN',
    UP: 'UP',
    LEFT: 'LEFT'
  }

  /** @type {Map<string, Function>} Maps direction constants to handler methods */
  static #directionHandlers = null

  /**
   * Lazily initializes direction-to-method mapping.
   * @returns {Map<string, Function>} Map of directions to handler methods
   */
  static #getDirectionHandlers () {
    if (!this.#directionHandlers) {
      this.#directionHandlers = new Map([
        [this.DIRECTIONS.RIGHT, this.moveRight.bind(this)],
        [this.DIRECTIONS.DOWN, this.moveDown.bind(this)],
        [this.DIRECTIONS.UP, this.moveUp.bind(this)],
        [this.DIRECTIONS.LEFT, this.moveLeft.bind(this)]
      ])
    }
    return this.#directionHandlers
  }

  /**
   * Wraps an index into the valid range [0, max) with circular behavior.
   * Handles both positive and negative overflows.
   *
   * @param {number} index - The index to wrap
   * @param {number} max - The maximum valid index (exclusive)
   * @returns {number} The wrapped index in range [0, max)
   */
  static #wrapIndex (index, max) {
    return ((index % max) + max) % max
  }

  /**
   * Checks if we've completed a full circular traversal (returned to start).
   *
   * @param {number} currentIndex - Current navigation index
   * @param {number} startIndex - Starting navigation index
   * @param {boolean} isFirstAttempt - Whether this is the first pass (before wraparound)
   * @returns {boolean} True if a full cycle is complete
   */
  static #isCompleteCircle (currentIndex, startIndex, isFirstAttempt) {
    return currentIndex === startIndex && !isFirstAttempt
  }

  /**
   * Navigates horizontally within a tray's children, moving to adjacent tray
   * children when reaching tray boundaries. Wraps around at edges.
   *
   * @param {HTMLDivElement[]} trays - Array of tray containers
   * @param {number} startItemIndex - Initial item index within start tray
   * @param {number} startTrayIndex - Initial tray index
   * @param {number} itemStep - Direction to step (1 for RIGHT, -1 for LEFT)
   * @returns {HTMLDivElement} The next navigable child element
   */
  static #moveHorizontally (trays, startItemIndex, startTrayIndex, itemStep) {
    const totalTrays = trays.length
    let currentTrayIndex = startTrayIndex
    let currentItemIndex = startItemIndex
    let isFirstPass = true

    while (true) {
      const currentTray = trays[currentTrayIndex]
      const trayItemCount = currentTray.children.length
      currentItemIndex += itemStep

      // Check if moved beyond tray boundaries
      if (currentItemIndex < 0 || currentItemIndex >= trayItemCount) {
        // Move to next/prev tray
        currentTrayIndex += itemStep > 0 ? 1 : -1
        currentTrayIndex = this.#wrapIndex(currentTrayIndex, totalTrays)

        // Reset item index for new tray
        currentItemIndex = itemStep > 0 ? 0 : trayItemCount - 1

        // Check for full circular traversal
        if (
          this.#isCompleteCircle(currentTrayIndex, startTrayIndex, isFirstPass)
        ) {
          return /** @type {HTMLDivElement} */ trays[startTrayIndex].children[
            startItemIndex
          ]
        }
        isFirstPass = false
      } else {
        return /** @type {HTMLDivElement} */ currentTray.children[
          currentItemIndex
        ]
      }
    }
  }

  /**
   * Navigates vertically between trays, moving to the first child of adjacent trays.
   * Wraps around at top/bottom edges.
   *
   * @param {HTMLDivElement[]} trays - Array of tray containers
   * @param {number} startItemIndex - Initial item index (used for return-to-origin detection)
   * @param {number} startTrayIndex - Initial tray index
   * @param {number} trayStep - Direction to step (1 for DOWN, -1 for UP)
   * @returns {HTMLDivElement} The first child of the next non-empty tray
   */
  static #moveVertically (trays, startItemIndex, startTrayIndex, trayStep) {
    const totalTrays = trays.length
    let currentTrayIndex = startTrayIndex
    let isFirstPass = true

    while (true) {
      currentTrayIndex += trayStep
      currentTrayIndex = this.#wrapIndex(currentTrayIndex, totalTrays)

      // Check if we've returned to start position
      if (
        this.#isCompleteCircle(currentTrayIndex, startTrayIndex, isFirstPass)
      ) {
        return /** @type {HTMLDivElement} */ trays[startTrayIndex].children[
          startItemIndex
        ]
      }
      isFirstPass = false

      const currentTray = trays[currentTrayIndex]
      if (currentTray.children.length > 0) {
        return /** @type {HTMLDivElement} */ currentTray.children[0]
      }
    }
  }

  /**
   * Routes a movement request to the appropriate directional handler.
   *
   * @param {string} direction - One of DIRECTIONS constants (RIGHT, DOWN, UP, LEFT)
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers to navigate
   * @param {number} itemIndex - Current item index within the current tray
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement|null} The next navigable element, or null if direction is invalid
   */
  static moveInDirection (direction, trays, itemIndex, trayIndex) {
    const handler = this.#getDirectionHandlers().get(direction)
    return handler?.(trays, itemIndex, trayIndex) ?? null
  }

  /**
   * Moves to the next item to the right, wrapping to the next tray and
   * eventually circling back to the starting position.
   *
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @param {number} itemIndex - Current item index within current tray
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement} The next item element to the right
   */
  static moveRight (trays, itemIndex, trayIndex) {
    return this.#moveHorizontally(trays, itemIndex, trayIndex, 1)
  }

  /**
   * Moves to the next item to the left, wrapping to the previous tray and
   * eventually circling back to the starting position.
   *
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @param {number} itemIndex - Current item index within current tray
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement} The next item element to the left
   */
  static moveLeft (trays, itemIndex, trayIndex) {
    return this.#moveHorizontally(trays, itemIndex, trayIndex, -1)
  }

  /**
   * Moves to the first item of the next tray down, with wraparound to the top.
   *
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @param {number} itemIndex - Current item index (used for full-circle detection)
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement} The first item element of the next tray
   */
  static moveDown (trays, itemIndex, trayIndex) {
    return this.#moveVertically(trays, itemIndex, trayIndex, 1)
  }

  /**
   * Moves to the first item of the previous tray up, with wraparound to the bottom.
   *
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @param {number} itemIndex - Current item index (used for full-circle detection)
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement} The first item element of the previous tray
   */
  static moveUp (trays, itemIndex, trayIndex) {
    return this.#moveVertically(trays, itemIndex, trayIndex, -1)
  }

  /**
   * Maps keyboard arrow key codes to direction constants.
   *
   * @param {string} arrowKey - Keyboard event key (e.g., 'ArrowRight', 'ArrowDown')
   * @returns {string|undefined} Corresponding DIRECTIONS constant, or undefined if not an arrow key
   *
   * @example
   * const direction = DirectionMovement.fromArrowKey(event.key);
   * if (direction) {
   *   const nextElement = DirectionMovement.moveInDirection(direction, trays, itemIdx, trayIdx);
   * }
   */
  static fromArrowKey (arrowKey) {
    const keyMap = {
      ArrowRight: this.DIRECTIONS.RIGHT,
      ArrowDown: this.DIRECTIONS.DOWN,
      ArrowUp: this.DIRECTIONS.UP,
      ArrowLeft: this.DIRECTIONS.LEFT
    }
    return keyMap[arrowKey]
  }

  /**
   * Retrieves the first navigable item in a given direction, useful for
   * initializing movement when no item is currently selected.
   *
   * @param {string} direction - One of DIRECTIONS constants
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @returns {HTMLDivElement|null} The first/last element based on direction,
   *   or null if trays are empty
   *
   * @description
   * - RIGHT/DOWN: returns the first item overall
   * - LEFT/UP: returns the last item overall
   */
  static getFirstItem (direction, trays) {
    const allItems = /** @type {HTMLDivElement[]} */ trays.flatMap(tray => [
      ...tray.children
    ])
    if (allItems.length === 0) return null

    const isReverseDirection =
      direction === this.DIRECTIONS.UP || direction === this.DIRECTIONS.LEFT

    return isReverseDirection ? allItems[allItems.length - 1] : allItems[0]
  }
}
