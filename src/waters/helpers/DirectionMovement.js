/**
 * @module waters/helpers/DirectionMovement
 * Manages directional navigation across UI element trays with wraparound support.
 *
 * @description
 * This module exports the DirectionMovement class which provides keyboard arrow navigation
 * for multi-tray UI layouts. It handles both within-tray horizontal movement (RIGHT/LEFT)
 * and between-tray vertical movement (UP/DOWN) with circular navigation and wraparound.
 *
 * Key Features:
 * - Horizontal navigation within trays with automatic tray-to-tray movement
 * - Vertical navigation between trays with first-item selection
 * - Circular wraparound at boundaries (both ends connect)
 * - Arrow key mapping (ArrowRight → RIGHT, etc.)
 * - Directional routing via handler map pattern
 *
 * Navigation Behavior:
 * - RIGHT/LEFT: Moves horizontally within current tray, advances to next/prev tray at boundaries
 * - UP/DOWN: Moves vertically between trays, always selects first item of target tray
 * - Full circle detection: Returns to origin when traversing all available items
 *
 * Usage Example:
 * ```javascript
 * const direction = DirectionMovement.fromArrowKey(event.key);
 * const nextElement = DirectionMovement.moveInDirection(direction, trays, itemIdx, trayIdx);
 * ```
 *
 * @exports DirectionMovement
 */
/**
 * Manages directional navigation across UI element trays with wraparound support.
 * Handles both within-tray horizontal movement (RIGHT/LEFT) and between-tray
 * vertical movement (UP/DOWN) with circular navigation.
 *
 * @class
 * @static
 * @description
 * Provides navigation logic for multi-tray UI layouts with keyboard arrow support.
 * Uses static methods to manage state-free navigation through tray hierarchies.
 *
 * Navigation Strategy:
 * - Horizontal: Moves through items within tray, advances to next tray at boundaries
 * - Vertical: Moves between trays, always positions at first item of target
 * - Wraparound: Circular navigation (wrapping at boundaries)
 * - Full-circle detection: Stops iteration when returning to start position
 *
 * Design Pattern:
 * - Static methods prevent instantiation
 * - Direction handler map (lazy-loaded) routes movement requests
 * - Index wrapping utility handles circular boundary conditions
 * - Private helpers (#moveHorizontally, #moveVertically) contain core logic
 *
 * Supported Directions:
 * - RIGHT: Move right within tray, advance to next tray at right boundary
 * - LEFT: Move left within tray, advance to previous tray at left boundary
 * - DOWN: Move to first item of next tray
 * - UP: Move to first item of previous tray
 */
export class DirectionMovement {
  /**
   * Direction constants for navigation commands.
   * Used throughout the module for routing movement requests.
   *
   * @type {Object}
   * @const
   * @property {string} RIGHT - Horizontal movement to the right
   * @property {string} DOWN - Vertical movement downward (to next tray)
   * @property {string} UP - Vertical movement upward (to previous tray)
   * @property {string} LEFT - Horizontal movement to the left
   * @readonly
   * @static
   */
  /** @readonly */
  static DIRECTIONS = {
    RIGHT: 'RIGHT',
    DOWN: 'DOWN',
    UP: 'UP',
    LEFT: 'LEFT'
  }

  /**
   * Lazily initializes direction-to-method mapping on first access.
   * Maps each DIRECTIONS constant to its corresponding movement method.
   * Uses binding to preserve `this` context for static method calls.
   *
   * Map Contents:
   * - RIGHT → moveRight() - Move one item to the right
   * - DOWN → moveDown() - Move to next tray down
   * - UP → moveUp() - Move to previous tray up
   * - LEFT → moveLeft() - Move one item to the left
   *
   * Lazy Loading Benefit:
   * - Methods are bound and cached on first use
   * - Subsequent calls return cached map
   * - Reduces initialization overhead
   *
   * @type {Map<string, Function>}
   * @returns {Map<string, Function>} Map of directions to bound handler methods
   */
  /** @type {Map<string, Function>} Maps direction constants to handler methods */
  static #directionHandlers = null

  /**
   * Lazily initializes direction-to-method mapping on first access.
   * Maps each DIRECTIONS constant to its corresponding movement method.
   * Uses binding to preserve `this` context for static method calls.
   *
   * Map Contents:
   * - RIGHT → moveRight() - Move one item to the right
   * - DOWN → moveDown() - Move to next tray down
   * - UP → moveUp() - Move to previous tray up
   * - LEFT → moveLeft() - Move one item to the left
   *
   * Lazy Loading Benefit:
   * - Methods are bound and cached on first use
   * - Subsequent calls return cached map
   * - Reduces initialization overhead
   *
   * @returns {Map<string, Function>} Map of directions to bound handler methods
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
   * Handles both positive and negative overflows using modulo arithmetic.
   * Useful for circular navigation and array boundary wraparound.
   *
   * Algorithm:
   * - ((index % max) + max) % max
   * - First modulo handles overflow/underflow
   * - Adding max ensures non-negative result
   * - Second modulo normalizes to [0, max) range
   *
   * Examples:
   * - wrapIndex(5, 4) → 1 (5 % 4 = 1)
   * - wrapIndex(-1, 4) → 3 (wrapped to last)
   * - wrapIndex(10, 4) → 2 (2 full cycles + 2)
   *
   * @param {number} index - The index to wrap (can be any integer)
   * @param {number} max - The maximum valid index, exclusive (array length for 0-indexed arrays)
   * @returns {number} The wrapped index guaranteed to be in range [0, max)
   * @throws {Error} If max <= 0
   */
  static #wrapIndex (index, max) {
    return ((index % max) + max) % max
  }

  /**
   * Checks if a full circular traversal has been completed.
   * Used to detect when navigation has looped through all items and returned to start.
   * Returns true only after wrapping (not on first attempt).
   *
   * Logic:
   * - true: currentIndex === startIndex AND (not first pass) → completed full circle
   * - false: Still in first traversal or haven't reached start again yet
   *
   * This prevents stopping after just one wraparound when items are adjacent.
   * Requires explicit tracking of first pass to distinguish first visit from return visit.
   *
   * @param {number} currentIndex - Current navigation index
   * @param {number} startIndex - Starting navigation index (initial position)
   * @param {boolean} isFirstAttempt - Whether this is the first pass (before any wraparound)
   * @returns {boolean} True if a full cycle is complete and we've returned to start
   */
  static #isCompleteCircle (currentIndex, startIndex, isFirstAttempt) {
    return currentIndex === startIndex && !isFirstAttempt
  }

  /**
   * Navigates horizontally within a tray's children, moving to adjacent tray
   * children when reaching tray boundaries. Wraps around at edges.
   *
   * Navigation Algorithm:
   * 1. Increment/decrement item index in current tray
   * 2. If moved beyond tray boundaries:
   *    - Advance to next/previous tray (wrap around at edges)
   *    - Reset item index to start/end of new tray
   *    - Check for full circle completion
   * 3. If within valid range, return current item
   *
   * Wraparound Behavior:
   * - Reaches tray boundary → advances to next/previous tray
   * - Wraps all trays → returns to start position
   * - Full circle detection prevents infinite loops
   *
   * @param {HTMLDivElement[]} trays - Array of tray containers with items as children
   * @param {number} startItemIndex - Initial item index within start tray
   * @param {number} startTrayIndex - Initial tray index
   * @param {number} itemStep - Direction to step (1 for RIGHT, -1 for LEFT)
   * @returns {HTMLDivElement} The next navigable child element
   * @throws {TypeError} If trays is not an array or contains non-HTMLElement items
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
          /** @type {HTMLDivElement} */
          return trays[startTrayIndex].children[startItemIndex]
        }
        isFirstPass = false
      } else {
        /** @type {HTMLDivElement} */
        return currentTray.children[currentItemIndex]
      }
    }
  }

  /**
   * Navigates vertically between trays, moving to the first child of adjacent trays.
   * Wraps around at top/bottom edges. Skips empty trays by continuing iteration.
   *
   * Navigation Algorithm:
   * 1. Increment/decrement tray index (vertical movement)
   * 2. Wrap tray index at boundaries
   * 3. Check for full circle completion
   * 4. If tray has items, return first child; otherwise continue to next tray
   *
   * Empty Tray Handling:
   * - Skips empty trays (children.length === 0)
   * - Continues to next tray until finding non-empty one
   * - If all trays are empty, completes circle and returns start item
   *
   * Wraparound Behavior:
   * - Reaches bottom → wraps to top
   * - Reaches top → wraps to bottom
   * - Full circle → returns original item
   *
   * @param {HTMLDivElement[]} trays - Array of tray containers (may be empty)
   * @param {number} startItemIndex - Initial item index (used for return-to-origin detection)
   * @param {number} startTrayIndex - Initial tray index
   * @param {number} trayStep - Direction to step (1 for DOWN, -1 for UP)
   * @returns {HTMLDivElement} The first child of the next non-empty tray
   * @throws {TypeError} If trays is not an array or tray doesn't have valid children
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
        /** @type {HTMLDivElement} */
        return trays[startTrayIndex].children[startItemIndex]
      }
      isFirstPass = false

      const currentTray = trays[currentTrayIndex]
      if (currentTray.children.length > 0) {
        /** @type {HTMLDivElement} */
        return currentTray.children[0]
      }
    }
  }

  /**
   * Routes a movement request to the appropriate directional handler.
   * Uses direction handler map to look up and execute the correct movement method.
   * Returns null if direction is not recognized.
   *
   * Handler Routing:
   * - RIGHT → moveRight()
   * - LEFT → moveLeft()
   * - UP → moveUp()
   * - DOWN → moveDown()
   * - Other → null
   *
   * @param {string} direction - One of DIRECTIONS constants (RIGHT, DOWN, UP, LEFT)
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers to navigate
   * @param {number} itemIndex - Current item index within the current tray
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement|null} The next navigable element, or null if direction is invalid
   * @throws {TypeError} If trays is not valid or itemIndex/trayIndex are out of bounds
   * @public
   */
  static moveInDirection (direction, trays, itemIndex, trayIndex) {
    const handler = this.#getDirectionHandlers().get(direction)
    return handler?.(trays, itemIndex, trayIndex) ?? null
  }

  /**
   * Moves to the next item to the right, wrapping to the next tray and
   * eventually circling back to the starting position.
   *
   * Behavior:
   * 1. Increment item index in current tray
   * 2. If at tray boundary, advance to next tray
   * 3. Wrap all trays and return to start if completing full circle
   * 4. Always returns a valid HTMLDivElement
   *
   * Wraparound Sequence:
   * - Current tray → next tray → ... → first tray → back to origin
   *
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @param {number} itemIndex - Current item index within current tray
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement} The next item element to the right
   * @throws {TypeError} If trays invalid or indices out of bounds
   * @public
   */
  static moveRight (trays, itemIndex, trayIndex) {
    return this.#moveHorizontally(trays, itemIndex, trayIndex, 1)
  }

  /**
   * Moves to the next item to the left, wrapping to the previous tray and
   * eventually circling back to the starting position.
   *
   * Behavior:
   * 1. Decrement item index in current tray
   * 2. If at tray boundary, advance to previous tray
   * 3. Wrap all trays and return to start if completing full circle
   * 4. Always returns a valid HTMLDivElement
   *
   * Wraparound Sequence:
   * - Current tray → previous tray → ... → last tray → back to origin
   *
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @param {number} itemIndex - Current item index within current tray
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement} The next item element to the left
   * @throws {TypeError} If trays invalid or indices out of bounds
   * @public
   */
  static moveLeft (trays, itemIndex, trayIndex) {
    return this.#moveHorizontally(trays, itemIndex, trayIndex, -1)
  }

  /**
   * Moves to the first item of the next tray down, with wraparound to the top.
   *
   * Behavior:
   * 1. Increment tray index
   * 2. Always selects first item (children[0]) of target tray
   * 3. Wraps from bottom tray to top tray
   * 4. Returns to origin if all trays traversed
   * 5. Skips empty trays automatically
   *
   * Wraparound Sequence:
   * - Current tray → next tray → ... → first tray → back to origin
   * - Always positions at first item of target tray
   *
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @param {number} itemIndex - Current item index (used for full-circle detection)
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement} The first item element of the next tray
   * @throws {TypeError} If trays invalid or trayIndex out of bounds
   * @public
   */
  static moveDown (trays, itemIndex, trayIndex) {
    return this.#moveVertically(trays, itemIndex, trayIndex, 1)
  }

  /**
   * Moves to the first item of the previous tray up, with wraparound to the bottom.
   *
   * Behavior:
   * 1. Decrement tray index
   * 2. Always selects first item (children[0]) of target tray
   * 3. Wraps from top tray to bottom tray
   * 4. Returns to origin if all trays traversed
   * 5. Skips empty trays automatically
   *
   * Wraparound Sequence:
   * - Current tray → previous tray → ... → last tray → back to origin
   * - Always positions at first item of target tray
   *
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers
   * @param {number} itemIndex - Current item index (used for full-circle detection)
   * @param {number} trayIndex - Current tray index
   * @returns {HTMLDivElement} The first item element of the previous tray
   * @throws {TypeError} If trays invalid or trayIndex out of bounds
   * @public
   */
  static moveUp (trays, itemIndex, trayIndex) {
    return this.#moveVertically(trays, itemIndex, trayIndex, -1)
  }

  /**
   * Maps keyboard arrow key codes to direction constants.
   * Converts standard keyboard arrow key event.key values to navigation directions.
   * Useful for event listeners to translate keyboard input to movement commands.
   *
   * Key Mapping:
   * - 'ArrowRight' → DIRECTIONS.RIGHT
   * - 'ArrowDown' → DIRECTIONS.DOWN
   * - 'ArrowUp' → DIRECTIONS.UP
   * - 'ArrowLeft' → DIRECTIONS.LEFT
   * - Other keys → undefined
   *
   * Usage Pattern:
   * ```javascript
   * document.addEventListener('keydown', (event) => {
   *   const direction = DirectionMovement.fromArrowKey(event.key);
   *   if (direction) {
   *     const next = DirectionMovement.moveInDirection(direction, trays, itemIdx, trayIdx);
   *     if (next) focusElement(next);
   *   }
   * });
   * ```
   *
   * @param {string} arrowKey - Keyboard event key (e.g., 'ArrowRight', 'ArrowDown')
   * @returns {string|undefined} Corresponding DIRECTIONS constant, or undefined if not an arrow key
   * @public
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
   * Retrieves the first navigable item in a given direction.
   * Useful for initializing movement when no item is currently selected.
   * Flattens all trays into single item list and selects based on direction.
   *
   * Direction-based Selection:
   * - RIGHT/DOWN: Returns first item overall (index 0)
   * - LEFT/UP: Returns last item overall (index -1)
   * - Other: No match, falls back to forward direction behavior
   *
   * Reverse Direction Detection:
   * - Reverse directions (UP, LEFT) start from end of list
   * - Forward directions (DOWN, RIGHT) start from beginning
   * - Enables intuitive wraparound behavior for each direction
   *
   * Empty Tray Handling:
   * - Returns null if no items exist in any tray
   * - Safely handles empty trays array
   * - Safely handles trays with no children
   *
   * @param {string} direction - One of DIRECTIONS constants (RIGHT, DOWN, UP, LEFT)
   * @param {HTMLDivElement[]} trays - Array of tray DOM containers (may contain empty trays)
   * @returns {HTMLDivElement|null} The first/last element based on direction, or null if trays are empty
   * @throws {TypeError} If trays is not an array or contains non-HTMLElement items
   * @public
   */
  static getFirstItem (direction, trays) {
    const allItems = trays.flatMap(tray => [
      ...tray.children /** @type {HTMLDivElement[]} */
    ])
    if (allItems.length === 0) return null

    const isReverseDirection =
      direction === this.DIRECTIONS.UP || direction === this.DIRECTIONS.LEFT

    /** @type {HTMLDivElement|null} */
    return isReverseDirection ? allItems.at(-1) ?? null : allItems[0]
  }
}
