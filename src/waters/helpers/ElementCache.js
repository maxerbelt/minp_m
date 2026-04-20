/**
 * REFACTORING: Extract DOM element caching to reduce repetitive
 * document.getElementById() calls and improve initialization clarity
 */
export class ElementCache {
  constructor () {
    this.buttons = {
      newPlacement: document.getElementById('newPlacement'),
      rotate: document.getElementById('rotateBtn'),
      rotateLeft: document.getElementById('rotateLeftBtn'),
      flip: document.getElementById('flipBtn'),
      transform: document.getElementById('transformBtn'),
      test: document.getElementById('testBtn'),
      seek: document.getElementById('seekBtn'),
      stop: document.getElementById('stopBtn'),
      undo: document.getElementById('undoBtn'),
      auto: document.getElementById('autoBtn')
    }

    this.trays = {
      container: document.getElementById('tray-container'),
      ship: document.getElementById('shipTray'),
      plane: document.getElementById('planeTray'),
      special: document.getElementById('specialTray'),
      brush: document.getElementById('brushTray'),
      weapon: document.getElementById('weaponTray'),
      building: document.getElementById('buildingTray')
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
