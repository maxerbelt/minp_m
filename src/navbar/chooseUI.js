/**
 * @typedef {HTMLSelectElement} ChooseUISelectElement
 */

/**
 * @callback ChooseUIChangeCallback
 * @param {string} value
 * @param {string} text
 */

/**
 * @typedef {HTMLOptionElement} ChooseUIOptionElement
 */

/**
 * Base class for select-based UI components.
 * Responsible for option lifecycle and change event wiring.
 */
class ChooseUI {
  /**
   * @param {string} targetId
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
   * Creates an option element.
   * @param {string|number} value
   * @param {string|number} text
   * @returns {ChooseUIOptionElement}
   */
  _createOption (value, text) {
    const option = document.createElement('option')
    option.value = String(value)
    option.textContent = String(text)
    return option
  }

  /**
   * Marks the option as selected if it matches the provided values.
   * @param {ChooseUIOptionElement} option
   * @param {string|number} selectedValue
   * @param {string|number} selectedText
   * @returns {void}
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
   * Adds a new option element to the select.
   * @param {string|number} id
   * @param {string|number} label
   * @param {string|number} selectedValue
   * @param {string|number} selectedText
   * @returns {void}
   */
  addOption (id, label, selectedValue, selectedText) {
    const option = this._createOption(id, label)
    this._applySelectionState(option, selectedValue, selectedText)
    this.selectElement.appendChild(option)
  }

  /**
   * Removes all existing options.
   * @returns {void}
   */
  clearOptions () {
    this.selectElement.length = 0
  }

  /**
   * Checks whether the select already contains options.
   * @returns {boolean}
   */
  hasOptions () {
    return this.selectElement?.options?.length > 0
  }

  /**
   * Returns the number of options currently rendered.
   * @returns {number}
   */
  numOptions () {
    return this.selectElement?.options?.length || 0
  }

  /**
   * Initializes option state and change handling.
   * @param {ChooseUIChangeCallback} callback
   * @param {string|number} [selectedValue]
   * @param {string|number} [selectedText]
   * @returns {void}
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
   * Resets existing options and re-populates.
   * @param {string|number} selectedValue
   * @param {string|number} selectedText
   * @returns {void}
   */
  resetOptions (selectedValue, selectedText) {
    this.clearOptions()
    this.setOptions(selectedValue, selectedText)
  }

  /**
   * Concrete subclasses must implement option creation logic.
   * @param {string|number} _selectedValue
   * @param {string|number} _selectedText
   */
  setOptions (_selectedValue, _selectedText) {
    throw new Error('setOptions must be implemented by subclasses.')
  }

  /**
   * Attaches a change listener to the select element.
   * @param {ChooseUIChangeCallback} callback
   * @returns {void}
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

export class ChooseFromListUI extends ChooseUI {
  /**
   * @param {Array<string>} list
   * @param {string} targetId
   */
  constructor (list, targetId) {
    super(targetId)
    this.list = list
  }

  /**
   * Populates the select from a list of choices.
   * @param {string|number} selectedValue
   * @param {string|number} selectedText
   */
  setOptions (selectedValue, selectedText) {
    this.list.forEach((choice, index) => {
      this.addOption(index, choice, selectedValue, selectedText)
    })
  }
}

export class ChooseNumberUI extends ChooseUI {
  /**
   * @param {number} min
   * @param {number} max
   * @param {number} step
   * @param {string} targetId
   */
  constructor (min, max, step, targetId) {
    super(targetId)
    this.min = min
    this.max = max
    this.step = step
  }

  /**
   * Populates the select with a numeric range.
   * @param {number} defaultIndex
   * @param {string|number} _text
   */
  setOptions (defaultIndex, _text) {
    const selectedValue = defaultIndex === undefined ? this.min : defaultIndex
    for (let i = this.min; i <= this.max; i += this.step) {
      this.addOption(i, i, selectedValue, selectedValue)
    }
  }
}
