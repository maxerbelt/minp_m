/**
 * Factory methods for creating and assembling UI elements used in trays.
 * Eliminates duplication in drag container, drag element, and label creation
 * across tray item builders.
 *
 * @class UIElementBuilder
 */
export class UIElementBuilder {
  /**
   * Default CSS class names for UI elements.
   *
   * @readonly
   */
  static #DEFAULTS = {
    DRAG_CONTAINER_CLASS: 'drag-ship-container',
    DRAG_ELEMENT_CLASS: 'drag-ship'
  }

  /**
   * Creates a generic element with optional class and dataset attributes.
   *
   * @param {string} tagName - HTML tag name (div, span, etc.)
   * @param {string} [className] - CSS class to apply
   * @param {Object} [dataset] - Key-value pairs for data attributes
   * @returns {HTMLElement} The created element
   */
  static #createElement (tagName, className, dataset = {}) {
    const element = document.createElement(tagName)
    if (className) element.className = className
    if (Object.keys(dataset).length > 0) {
      Object.assign(element.dataset, dataset)
    }
    return element
  }

  /**
   * Creates a container element for draggable ship items.
   * Container holds the drag visual and optional label.
   *
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.className] - Custom CSS class (defaults to drag-ship-container)
   * @param {Object} [options.dataset] - Data attributes to apply
   * @returns {HTMLElement} A div element configured as a drag container
   *
   * @example
   * const container = UIElementBuilder.createDragContainer({
   *   className: 'custom-drag-container',
   *   dataset: { shipId: 42 }
   * });
   */
  static createDragContainer (options = {}) {
    const { className = this.#DEFAULTS.DRAG_CONTAINER_CLASS, dataset = {} } =
      options
    return this.#createElement('div', className, dataset)
  }

  /**
   * Creates the visual element representing a draggable ship.
   *
   * @param {string} [className] - CSS class to apply (defaults to drag-ship)
   * @returns {HTMLElement} A div element configured for drag visuals
   */
  static createDragElement (className = this.#DEFAULTS.DRAG_ELEMENT_CLASS) {
    return this.#createElement('div', className)
  }

  /**
   * Creates a label element with text content.
   * Used to display ship names, weapon names, or other identifiers.
   *
   * @param {string} text - Text content for the label
   * @returns {HTMLDivElement} A div element containing the text
   */
  static createLabel (text) {
    const label = this.#createElement('div')
    label.textContent = text
    return label
  }

  /**
   * Assembles a complete tray item by appending child elements
   * to a container and adding it to a tray.
   *
   * Automatically removes the 'empty' class from the tray, indicating
   * the tray now contains content.
   *
   * @param {HTMLElement} tray - Tray container to append item to
   * @param {HTMLElement} container - Drag container element
   * @param {HTMLElement|null} [dragElement] - Optional visual drag element
   * @param {string|null} [labelText] - Optional label text to display
   * @returns {void}
   *
   * @example
   * const tray = document.getElementById('shipTray');
   * const container = UIElementBuilder.createDragContainer({ dataset: { id: 42 } });
   * const dragEl = UIElementBuilder.createDragElement();
   *
   * UIElementBuilder.appendTrayItem(tray, container, dragEl, 'Battleship');
   */
  static appendTrayItem (tray, container, dragElement = null, labelText = null) {
    if (dragElement) {
      container.appendChild(dragElement)
    }

    if (labelText) {
      container.appendChild(this.createLabel(labelText))
    }

    tray.appendChild(container)
    tray.classList.remove('empty')
  }
}
