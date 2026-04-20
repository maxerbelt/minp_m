/**
 * REFACTORING: Extract common UI element building patterns
 * to reduce duplication in addtrayitem, buildTrayItemWeapon, etc.
 */
export class UIElementBuilder {
  static createDragContainer (options = {}) {
    const { className = 'drag-ship-container', dataset = {} } = options
    const container = document.createElement('div')
    container.className = className
    Object.assign(container.dataset, dataset)
    return container
  }

  static createDragElement (className = 'drag-ship') {
    const element = document.createElement('div')
    element.className = className
    return element
  }

  static createLabel (text) {
    const label = document.createElement('div')
    label.textContent = text
    return label
  }

  static appendTrayItem (tray, container, dragElement, labelText) {
    if (dragElement) container.appendChild(dragElement)
    if (labelText) container.appendChild(this.createLabel(labelText))
    tray.appendChild(container)
    tray.classList.remove('empty')
  }
}
