/**
 * Caches DOM elements to reduce repetitive document.getElementById() calls and improve initialization clarity.
 */
export class ElementCache {
  /**
   * Initializes the cache with buttons and trays.
   */
  constructor () {
    this.buttons = {
      newPlacement:
        /** @type {HTMLButtonElement} */ document.getElementById(
          'newPlacement'
        ),
      rotate:
        /** @type {HTMLButtonElement} */ document.getElementById('rotateBtn'),
      rotateLeft:
        /** @type {HTMLButtonElement} */ document.getElementById(
          'rotateLeftBtn'
        ),
      flip: /** @type {HTMLButtonElement} */ document.getElementById('flipBtn'),
      transform:
        /** @type {HTMLButtonElement} */ document.getElementById(
          'transformBtn'
        ),
      test: /** @type {HTMLButtonElement} */ document.getElementById('testBtn'),
      seek: /** @type {HTMLButtonElement} */ document.getElementById('seekBtn'),
      stop: /** @type {HTMLButtonElement} */ document.getElementById('stopBtn'),
      undo: /** @type {HTMLButtonElement} */ document.getElementById('undoBtn'),
      auto: /** @type {HTMLButtonElement} */ document.getElementById('autoBtn')
    }

    this.trays = {
      container:
        /** @type {HTMLDivElement} */ document.getElementById('tray-container'),
      ship: /** @type {HTMLDivElement} */ document.getElementById('shipTray'),
      plane: /** @type {HTMLDivElement} */ document.getElementById('planeTray'),
      special:
        /** @type {HTMLDivElement} */ document.getElementById('specialTray'),
      brush: /** @type {HTMLDivElement} */ document.getElementById('brushTray'),
      weapon:
        /** @type {HTMLDivElement} */ document.getElementById('weaponTray'),
      building:
        /** @type {HTMLDivElement} */ document.getElementById('buildingTray')
    }
  }

  /**
   * Gets a button by name.
   * @param {string} name - Button name
   * @returns {HTMLButtonElement|null} The button element
   */
  getButtonByName (name) {
    return this.buttons[name]
  }

  /**
   * Gets all tray elements.
   * @returns {HTMLDivElement[]} Array of tray elements
   */
  getAllTrays () {
    return [
      this.trays.ship,
      this.trays.plane,
      this.trays.special,
      this.trays.building,
      this.trays.weapon
    ]
  }

  /**
   * Gets tray by type.
   * @param {string} type - Type code (A, S, M, T, X, G, W)
   * @returns {HTMLDivElement|null} The tray element
   */
  getTrayByType (type) {
    const typeMap = {
      A: this.trays.plane,
      S: this.trays.ship,
      M: this.trays.special,
      T: this.trays.special,
      X: this.trays.special,
      G: this.trays.building,
      W: this.trays.weapon
    }
    return typeMap[type]
  }
}
