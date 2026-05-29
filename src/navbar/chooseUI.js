/**
 * @typedef {import('./types/ui.types.js').SelectElement} ChooseUISelectElement
 * @typedef {import('./types/callbacks.types.js').ChooseUIChangeCallback} ChooseUIChangeCallback
 * @typedef {import('./types/ui.types.js').OptionElement} ChooseUIOptionElement
 */

/**
 * Base class for select-based UI components.
 * Provides option lifecycle management, DOM element manipulation, and change event handling.
 * This is an abstract base class and cannot be instantiated directly—it must be extended by subclasses.
 *
 * Key responsibilities:
 * - Option CRUD operations (create, add, remove, list)
 * - DOM element selection and manipulation (getElementById)
 * - Change event listener attachment and callback invocation
 * - Selection state tracking and application
 * - Template method pattern for subclass-specific option population
 *
 * @abstract
 * @class ChooseUI
 *
 * @example
 * // Create a concrete subclass
 * class MyChooseUI extends ChooseUI {
 *   setOptions(selectedValue, selectedText) {
 *     // Implement option population logic
 *   }
 * }
 * const ui = new MyChooseUI('selectElementId');
 * ui.setup((value, text) => console.log(value, text));
 */
class ChooseUI {
  /**
   * Creates a new ChooseUI instance with reference to a select DOM element.
   * Enforces abstract class pattern by preventing direct instantiation of ChooseUI.
   * Establishes bidirectional references to the target select element.
   *
   * @constructor
   * @param {string} targetId - HTML ID of the target select element.
   * @throws {Error} If instantiated directly (new.target === ChooseUI).
   * @throws {TypeError} If target element with given ID is not found or not a valid select element.
   *
   * @example
   * // Cannot be called directly
   * // new ChooseUI('selectId'); // Throws Error
   *
   * // Must be called from subclass
   * class MyUI extends ChooseUI {}
   * const ui = new MyUI('selectId'); // OK
   */
  constructor (targetId) {
    if (new.target === ChooseUI) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }

    this.selectElement = document.getElementById(targetId)
    this.choose = this.selectElement
  }

  /**
   * Creates a new option element with the specified value and display text.
   * Converts both value and text to strings to ensure HTML compatibility.
   * The created option is not yet attached to the select element.
   *
   * @private
   * @param {string|number} value - Value attribute for the option (will be stringified).
   * @param {string|number} text - Display text content for the option (will be stringified).
   * @returns {ChooseUIOptionElement} New option element with value and textContent set.
   *
   * @example
   * const option = this._createOption(1, 'Option One');
   * // option.value === '1'
   * // option.textContent === 'Option One'
   */
  _createOption (value, text) {
    const option = document.createElement('option')
    option.value = String(value)
    option.textContent = String(text)
    return option
  }

  /**
   * Marks an option element as selected if its value or text matches the criteria.
   * Uses OR logic: option is selected if value matches selectedValue OR text matches selectedText.
   * Both comparisons are done after stringification for consistent matching.
   *
   * @private
   * @param {ChooseUIOptionElement} option - Option element to potentially mark as selected.
   * @param {string|number} selectedValue - Value to match against option.value.
   * @param {string|number} selectedText - Text to match against option.textContent.
   * @returns {void}
   *
   * @example
   * const option = document.createElement('option');
   * option.value = '2';
   * option.textContent = 'Item Two';
   * this._applySelectionState(option, 2, ''); // Sets option.selected = true (value matches)
   */
  _applySelectionState (option, selectedValue, selectedText) {
    if (
      option.value === String(selectedValue) ||
      option.textContent === String(selectedText)
    ) {
      option.selected = true
    }
  }

  /**
   * Creates and appends a new option element to the select, optionally marking it selected.
   * Internally creates the option via _createOption() and applies selection state via _applySelectionState().
   *
   * @public
   * @param {string|number} id - Value for the new option (option.value).
   * @param {string|number} label - Display text for the new option (option.textContent).
   * @param {string|number} selectedValue - Value to match for selection via _applySelectionState.
   * @param {string|number} selectedText - Text to match for selection via _applySelectionState.
   * @returns {void}
   *
   * @example
   * ui.addOption('key1', 'Label One', 'key1', '');
   * // Creates <option value="key1">Label One</option> and marks it selected
   */
  addOption (id, label, selectedValue, selectedText) {
    const option = this._createOption(id, label)
    this._applySelectionState(option, selectedValue, selectedText)
    this.selectElement.appendChild(option)
  }

  /**
   * Removes all existing options from the select element.
   * Sets the HTMLSelectElement.length property to 0, which is the standard way to clear options.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ui.clearOptions();
   * console.log(ui.numOptions()); // 0
   */
  clearOptions () {
    this.selectElement.length = 0
  }

  /**
   * Determines whether the select element has any options.
   * Uses optional chaining (?.) to safely access the options collection.
   * Returns false if selectElement is null/undefined or has no options.
   *
   * @public
   * @returns {boolean} True if the select contains at least one option, false otherwise.
   *
   * @example
   * const hasAny = ui.hasOptions(); // true or false
   */
  hasOptions () {
    return this.selectElement?.options?.length > 0
  }

  /**
   * Returns the count of option elements currently in the select.
   * Uses optional chaining (?.) to safely access the options collection.
   * Returns 0 if selectElement is null/undefined or options is not accessible.
   *
   * @public
   * @returns {number} Number of option elements in the select (0 if empty or error).
   *
   * @example
   * const count = ui.numOptions(); // 0, 1, 2, ...
   */
  numOptions () {
    return this.selectElement?.options?.length || 0
  }

  /**
   * Initializes the select element with options and change event handling.
   * Implements lazy initialization: if options already exist, resets them; otherwise populates for the first time.
   * Always attaches the change callback before returning.
   *
   * This is typically the first method called after instantiation to prepare the UI.
   *
   * @public
   * @param {ChooseUIChangeCallback} callback - Function to invoke on change events with (value, text) parameters.
   * @param {string|number} [selectedValue] - Optional value to mark as initially selected.
   * @param {string|number} [selectedText] - Optional text to mark as initially selected.
   * @returns {void}
   *
   * @example
   * ui.setup(
   *   (value, text) => console.log(`Selected: ${value} (${text})`),
   *   'default-id',
   *   ''
   * );
   */
  setup (callback, selectedValue, selectedText) {
    if (this.hasOptions()) {
      this.resetOptions(selectedValue, selectedText)
    } else {
      this.setOptions(selectedValue, selectedText)
    }

    this.onChange(callback)
  }

  /**
   * Clears all options and repopulates the select from scratch.
   * Useful when the underlying data source changes and the UI needs a fresh state.
   * Calls clearOptions() followed by setOptions().
   *
   * @public
   * @param {string|number} selectedValue - Value to mark as selected in new options.
   * @param {string|number} selectedText - Text to mark as selected in new options.
   * @returns {void}
   *
   * @example
   * ui.resetOptions('new-default', 'New Default Label');
   */
  resetOptions (selectedValue, selectedText) {
    this.clearOptions()
    this.setOptions(selectedValue, selectedText)
  }

  /**
   * Template method for populating the select with options.
   * Abstract method that must be implemented by concrete subclasses.
   * Called by setup() and resetOptions() to generate and add option elements.
   *
   * @protected
   * @abstract
   * @param {string|number} _selectedValue - Value to mark as initially selected (subclass implements selection logic).
   * @param {string|number} _selectedText - Text to mark as initially selected (subclass implements selection logic).
   * @returns {void}
   * @throws {Error} If not overridden by subclass.
   *
   * @example
   * // Concrete implementation in subclass
   * class MyChooseUI extends ChooseUI {
   *   setOptions(selectedValue, selectedText) {
   *     // Generate and add options here
   *     this.addOption('id1', 'Label 1', selectedValue, selectedText);
   *   }
   * }
   */
  setOptions (_selectedValue, _selectedText) {
    throw new Error('setOptions must be implemented by subclasses.')
  }

  /**
   * Attaches a change event listener to the select element.
   * Extracts the selected value and text content and passes both to the callback.
   * The callback is invoked every time the user changes the select value.
   *
   * @public
   * @param {ChooseUIChangeCallback} callback - Function to call with (value, text) when selection changes.
   * @returns {void}
   *
   * @example
   * ui.onChange((value, text) => {
   *   console.log(`User selected: ${value} - ${text}`);
   * });
   */
  onChange (callback) {
    this.selectElement.addEventListener('change', () => {
      const value = this.selectElement.value
      const text =
        this.selectElement.options[this.selectElement.selectedIndex].textContent
      callback(value, text)
    })
  }
}

/**
 * Concrete ChooseUI subclass that populates options from an array of strings.
 * Each array element becomes both the option value and display text.
 * Options are indexed 0-based, so the value corresponds to the array index.
 *
 * @class ChooseFromListUI
 * @extends ChooseUI
 *
 * @example
 * const items = ['Apple', 'Banana', 'Cherry'];
 * const ui = new ChooseFromListUI(items, 'fruitSelect');
 * ui.setup((value, text) => console.log(`Selected item #${value}: ${text}`));
 */
export class ChooseFromListUI extends ChooseUI {
  /**
   * Creates a ChooseFromListUI instance with an array-based option source.
   * Stores the list for later use in setOptions().
   *
   * @constructor
   * @param {Array<string>} list - Array of strings to populate as options.
   * @param {string} targetId - HTML ID of the target select element.
   */
  constructor (list, targetId) {
    super(targetId)
    /**
     * Array of string choices to populate as options.
     * @type {Array<string>}
     * @private
     */
    this.list = list
  }

  /**
   * Populates the select with options from the stored list array.
   * Uses array index as the option value and array element as display text.
   * Selection is applied based on the provided selectedValue and selectedText parameters.
   *
   * @override
   * @param {string|number} selectedValue - Index (as string or number) to select by value.
   * @param {string|number} selectedText - Text to select by matching against option display text.
   * @returns {void}
   *
   * @example
   * ui.setOptions('0', ''); // Selects the first item by index
   */
  setOptions (selectedValue, selectedText) {
    this.list.forEach((choice, index) => {
      this.addOption(index, choice, selectedValue, selectedText)
    })
  }
}

/**
 * Concrete ChooseUI subclass that populates options with a numeric range.
 * Generates options from min to max in increments of step.
 * Both the value and display text are the numeric values themselves.
 *
 * @class ChooseNumberUI
 * @extends ChooseUI
 *
 * @example
 * const ui = new ChooseNumberUI(1, 10, 1, 'numberSelect');
 * // Creates options: 1, 2, 3, ..., 10
 * ui.setup((value, text) => console.log(`Selected: ${value}`));
 *
 * @example
 * const ui = new ChooseNumberUI(0, 100, 10, 'decadesSelect');
 * // Creates options: 0, 10, 20, ..., 100
 */
export class ChooseNumberUI extends ChooseUI {
  /**
   * Creates a ChooseNumberUI instance with numeric range parameters.
   * All range parameters are stored and used in setOptions() to generate numeric options.
   *
   * @constructor
   * @param {number} min - Minimum value (inclusive) for the numeric range.
   * @param {number} max - Maximum value (inclusive) for the numeric range.
   * @param {number} step - Increment between consecutive options.
   * @param {string} targetId - HTML ID of the target select element.
   */
  constructor (min, max, step, targetId) {
    super(targetId)
    /**
     * Minimum value (inclusive) for the numeric range.
     * @type {number}
     * @private
     */
    this.min = min
    /**
     * Maximum value (inclusive) for the numeric range.
     * @type {number}
     * @private
     */
    this.max = max
    /**
     * Increment step between consecutive numeric options.
     * @type {number}
     * @private
     */
    this.step = step
  }

  /**
   * Populates the select with numeric options from min to max by step increments.
   * If defaultIndex is undefined, uses this.min as the default selected value.
   * The text parameter is ignored (numeric value is used as display text).
   *
   * @override
   * @param {number} [defaultIndex] - Default value to select (uses this.min if undefined).
   * @param {string|number} _selectedText - Unused parameter (kept for signature compatibility).
   * @returns {void}
   *
   * @example
   * ui.setOptions(5); // Selects the value 5
   * ui.setOptions(); // Selects this.min
   */
  setOptions (defaultIndex, _selectedText) {
    const selectedValue = defaultIndex === undefined ? this.min : defaultIndex
    for (let i = this.min; i <= this.max; i += this.step) {
      this.addOption(i, i, selectedValue, selectedValue)
    }
  }
}
