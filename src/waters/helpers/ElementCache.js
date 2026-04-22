/**
 *  DOM element caching to reduce repetitive
 * document.getElementById() calls and improve initialization clarity
 */
export class ElementCache {
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

  getButtonByName (name) {
    return this.buttons[name]
  }

  getAllTrays () {
    return [
      this.trays.ship,
      this.trays.plane,
      this.trays.special,
      this.trays.building,
      this.trays.weapon
    ]
  }

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
