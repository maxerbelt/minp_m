/**
 * REFACTORING: Consolidate repetitive tray operations into
 * a single manager to eliminate code duplication
 */
export class TrayManager {
  constructor (elementCache) {
    this.elementCache = elementCache
  }

  forEachTray (action) {
    for (const tray of this.elementCache.getAllTrays()) {
      action(tray)
    }
  }

  forEachTrayItem (action) {
    const trays = this.elementCache.getAllTrays()
    let itemIndex = 0
    let trayIndex = 0

    for (const tray of trays) {
      for (const element of tray.children) {
        action(element, trayIndex, itemIndex, trays)
        itemIndex++
      }
      trayIndex++
      itemIndex = 0
    }
  }

  /**
   * REFACTORING: Extract getTrayItemInfo for code reuse across
   * getTrayItem and moveAssignByCursor
   */
  getTrayItemInfo (shipId, adaptInfo) {
    const trays = this.elementCache.getAllTrays()
    let itemIndex = 0
    let trayIndex = 0

    for (const tray of trays) {
      for (const child of tray.children) {
        const id = Number.parseInt(child.dataset.id)
        if (id === shipId) {
          return adaptInfo(child, trayIndex, itemIndex, trays)
        }
        itemIndex++
      }
      trayIndex++
      itemIndex = 0
    }
    return null
  }

  getTrayItem (shipId) {
    return this.getTrayItemInfo(shipId, child => child)
  }

  /**
   * REFACTORING: Unified tray state changes to replace
   * resetTrays, clearTrays, setTrays with a single method
   */
  setTraysState (options = {}) {
    const {
      clearContent = true,
      addEmpty = false,
      removeEmpty = false,
      removeHidden = false
    } = options

    this.forEachTray(tray => {
      if (clearContent) tray.innerHTML = ''
      if (addEmpty) tray.classList.add('empty')
      if (removeEmpty) tray.classList.remove('empty')
      if (removeHidden) tray.classList.remove('hidden')
    })
  }

  // Convenience methods that call setTraysState
  resetTrays () {
    this.setTraysState({ clearContent: true, addEmpty: true })
  }

  clearTrays () {
    this.setTraysState({ clearContent: true })
  }

  setTrays () {
    this.setTraysState({ clearContent: true, removeEmpty: true })
  }

  showShipTrays () {
    this.setTraysState({
      clearContent: true,
      removeEmpty: true,
      removeHidden: true
    })
    if (this.elementCache.trays.brush) {
      this.elementCache.trays.brush.innerHTML = ''
      this.elementCache.trays.brush.classList.add('hidded')
    }
    this.elementCache.trays.container.classList.remove('hidden')
  }

  hideShipTrays () {
    this.forEachTray(tray => tray.classList.add('hidden'))
    this.elementCache.trays.container.classList.add('hidden')
  }

  showBrushTrays () {
    this.setTraysState({ clearContent: true, removeEmpty: true })
    this.forEachTray(tray => tray.classList.add('hidden'))

    this.elementCache.trays.brush.innerHTML = ''
    this.elementCache.trays.brush.classList.remove('hidded')
    this.elementCache.trays.container.classList.remove('hidden')
  }

  checkTrays () {
    this.forEachTray(tray => {
      if (tray.children.length === 0) {
        tray.classList.add('empty')
      } else {
        tray.classList.remove('empty')
      }
    })
  }
}
