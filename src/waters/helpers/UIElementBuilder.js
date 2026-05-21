/**
 * Factory for creating and assembling reusable UI elements in tray displays.
 *
 * Provides static factory methods that eliminate duplication in drag container,
 * drag element, and label creation across tray item builders (ship trays, weapon trays).
 * Implements the Factory Pattern for consistent, composable UI element generation.
 *
 * @class UIElementBuilder
 * @static
 *
 * @example
 * // Create a complete tray item with drag container, visual, and label
 * const container = UIElementBuilder.createDragContainer({ dataset: { id: 42 } });
 * const dragEl = UIElementBuilder.createDragElement();
 * UIElementBuilder.appendTrayItem(tray, container, dragEl, 'Battleship');
 */
export class UIElementBuilder {
  /**
   * Default CSS class names for UI element creation.
   *
   * These defaults are used when no custom className is provided to factory methods.
   * Provides semantic class names for styling drag-and-drop interactions.
   *
   * @readonly
   * @type {Object<string, string>}
   * @property {string} DRAG_CONTAINER_CLASS - Container wrapper for draggable items ('drag-ship-container')
   * @property {string} DRAG_ELEMENT_CLASS - Visual element for dragging ('drag-ship')
   */
  static #DEFAULTS = {
    DRAG_CONTAINER_CLASS: 'drag-ship-container',
    DRAG_ELEMENT_CLASS: 'drag-ship'
  }

  /**
   * Factory for creating generic HTML elements with optional styling and attributes.
   *
   * Internal helper that centralizes element creation logic to ensure consistency
   * across all UI element builders. Handles class assignment and data attribute
   * population in a single operation.
   *
   * @static
   *
   * @param {string} tagName - HTML tag name to create ('div', 'span', 'button', etc.)
   *                           Must be a valid HTML element tag. No validation performed.
   * @param {string|null} [className] - CSS class name(s) to assign to element.
   *                                     If provided, replaces any default classes.
   *                                     Supports single or space-separated class names.
   * @param {Object<string, string|number|boolean>} [dataset={}] - Key-value pairs to populate element.dataset.
   *                                                                 All keys become data-* attributes on the element.
   *                                                                 Values are converted to strings by DOM.
   *
   * @returns {HTMLElement} Newly created element with tagName, className, and dataset applied.
   *                        Returns generic HTMLElement type for flexibility across element types.
   *
   * @throws {DOMException} If tagName is invalid or cannot be created (browser-dependent).
   *
   * @example
   * const div = UIElementBuilder.#createElement('div', 'ship-item', { id: '42', type: 'ship' });
   * // Creates: <div class="ship-item" data-id="42" data-type="ship"></div>
   *
   * @see {@link createDragContainer}
   * @see {@link createDragElement}
   * @see {@link createLabel}
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
   * Creates a container element for draggable ship or weapon items in trays.
   *
   * Factory method that produces a styled div wrapper configured to hold drag visuals
   * and optional labels. The container serves as the parent for child elements added
   * by {@link appendTrayItem}.
   *
   * @static
   * @public
   *
   * @param {Object} [options={}] - Configuration options object
   * @param {string} [options.className] - Custom CSS class name(s) to apply.
   *                                        Defaults to 'drag-ship-container' if omitted.
   *                                        Supports space-separated class names for multiple styles.
   * @param {Object<string, string|number|boolean>} [options.dataset={}] - Data attributes to attach to container.
   *                                                                         Useful for storing item IDs, types, etc.
   *                                                                         All keys become data-* attributes.
   *
   * @returns {HTMLElement} A div element with className and dataset applied.
   *                        Configured as a container ready to receive drag elements and labels.
   *                        Use {@link appendTrayItem} to add children and complete assembly.
   *
   * @example
   * // Create a basic container with defaults
   * const container = UIElementBuilder.createDragContainer();
   * // <div class="drag-ship-container"></div>
   *
   * @example
   * // Create a custom container with dataset
   * const container = UIElementBuilder.createDragContainer({
   *   className: 'custom-drag-class',
   *   dataset: { shipId: '42', shipType: 'Battleship' }
   * });
   * // <div class="custom-drag-class" data-ship-id="42" data-ship-type="Battleship"></div>
   *
   * @see {@link createDragElement}
   * @see {@link appendTrayItem}
   */
  static createDragContainer (options = {}) {
    const { className = this.#DEFAULTS.DRAG_CONTAINER_CLASS, dataset = {} } =
      options
    return this.#createElement('div', className, dataset)
  }

  /**
   * Creates the visual element representing a draggable item.
   *
   * Factory method that produces a styled div element representing the visual
   * component of a draggable item. Typically appended inside a drag container
   * (see {@link createDragContainer}) to provide visual feedback during drag operations.
   *
   * @static
   * @public
   *
   * @param {string} [className='drag-ship'] - CSS class name to apply to the element.
   *                                           Defaults to 'drag-ship' if not provided.
   *                                           Can include multiple space-separated classes.
   *                                           Used to style the visual appearance during drag.
   *
   * @returns {HTMLElement} A div element with the specified className applied.
   *                        Returns an empty div ready to be appended to a container.
   *                        Styling is controlled entirely by the CSS class.
   *
   * @example
   * // Create with default styling
   * const dragEl = UIElementBuilder.createDragElement();
   * // <div class="drag-ship"></div>
   *
   * @example
   * // Create with custom styling
   * const dragEl = UIElementBuilder.createDragElement('ship-icon ship-large');
   * // <div class="ship-icon ship-large"></div>
   *
   * @see {@link createDragContainer}
   * @see {@link appendTrayItem}
   */
  static createDragElement (className = this.#DEFAULTS.DRAG_ELEMENT_CLASS) {
    return this.#createElement('div', className)
  }

  /**
   * Creates a label element containing text content.
   *
   * Factory method that produces a styled div element for displaying text labels
   * (ship names, weapon names, item identifiers, etc.). Typically used within
   * {@link appendTrayItem} to provide text alongside drag visuals.
   *
   * @static
   * @public
   *
   * @param {string} text - Text content to display in the label.
   *                        Must be a non-empty string for visible label.
   *                        Supports any valid text (names, numbers, symbols).
   *                        HTML content will be displayed as text (not parsed).
   *
   * @returns {HTMLElement} A div element with textContent set to the provided text.
   *                        Element has no class applied by default (use CSS selectors or parent styling).
   *                        Use within {@link appendTrayItem} for consistent styling.
   *
   * @example
   * // Create a label for a ship
   * const label = UIElementBuilder.createLabel('Battleship A');
   * // <div>Battleship A</div>
   *
   * @example
   * // Create a label for a weapon system
   * const label = UIElementBuilder.createLabel('Missile (5)');
   * // <div>Missile (5)</div>
   *
   * @see {@link createDragContainer}
   * @see {@link createDragElement}
   * @see {@link appendTrayItem}
   */
  static createLabel (text) {
    const label = this.#createElement('div')
    label.textContent = text
    return label
  }

  /**
   * Assembles and appends a complete tray item to a tray container.
   *
   * Orchestrator method that composes a finished tray item by adding child elements
   * (drag visual, label) to a container and appending the result to a tray.
   * Automatically removes the 'empty' CSS class from the tray to indicate content.
   *
   * This method implements the final assembly step of the Factory Pattern, allowing
   * flexible composition: containers can include visuals, labels, both, or neither.
   *
   * @static
   * @public
   *
   * @param {HTMLElement} tray - Target tray container element to append the item to.
   *                             Must be a valid HTMLElement (typically a div).
   *                             Should have 'empty' class initially to trigger removal.
   *                             Common: ship tray, weapon tray, or item list container.
   *
   * @param {HTMLElement} container - Drag container element (usually from {@link createDragContainer}).
   *                                   Acts as the wrapper for all child content.
   *                                   Receives dragElement and labelText as children (if provided).
   *
   * @param {HTMLElement|null} [dragElement=null] - Optional visual element for drag feedback.
   *                                                 Usually created via {@link createDragElement}.
   *                                                 If provided, appended as first child of container.
   *                                                 If null, skipped (useful for label-only items).
   *
   * @param {string|null} [labelText=null] - Optional text label for the item.
   *                                         Usually a ship name, weapon name, or identifier.
   *                                         If provided, a label element is created and appended.
   *                                         If null, skipped (useful for visual-only items).
   *
   * @returns {void} This method performs side effects (DOM manipulation) only.
   *                 No return value. Use for assembly only; call separately to read item state.
   *
   * @throws {TypeError} If tray or container is not a valid HTMLElement.
   *                     Thrown by DOM API when appendChild receives invalid argument.
   *
   * @example
   * // Create a complete tray item with visual and label
   * const tray = document.getElementById('shipTray');
   * const container = UIElementBuilder.createDragContainer({ dataset: { id: 42 } });
   * const dragEl = UIElementBuilder.createDragElement();
   *
   * UIElementBuilder.appendTrayItem(tray, container, dragEl, 'Battleship');
   * // Result: tray no longer has 'empty' class, contains item with visual and label
   *
   * @example
   * // Create a label-only tray item (no visual element)
   * const tray = document.getElementById('weaponTray');
   * const container = UIElementBuilder.createDragContainer({ className: 'weapon-item' });
   * UIElementBuilder.appendTrayItem(tray, container, null, 'Missile (3)');
   *
   * @example
   * // Create a visual-only tray item (no text label)
   * const container = UIElementBuilder.createDragContainer();
   * const dragEl = UIElementBuilder.createDragElement();
   * UIElementBuilder.appendTrayItem(tray, container, dragEl, null);
   *
   * @see {@link createDragContainer}
   * @see {@link createDragElement}
   * @see {@link createLabel}
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
