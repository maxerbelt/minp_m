/**
 * @fileoverview Map Dimension Validation Module
 *
 * Provides utilities for validating and normalizing map dimensions (width and height)
 * against terrain configuration limits. Integrates with the UI input controls to ensure
 * only valid dimension values are used during map creation and manipulation.
 *
 * Features:
 * - Validates dimension input against terrain min/max constraints
 * - Auto-corrects invalid values to minimum valid dimension
 * - Synchronizes UI state with validated dimensions
 * - Checks for existing maps at specified dimensions
 * - Creates blank maps with validated dimensions
 *
 * @module terrains/all/js/validSize
 */

import { bh } from './bh.js'

/**
 * UI wrapper for a dimension input control.
 * Provides access to the HTML input element and its minimum constraint.
 *
 * @typedef {Object} DimensionInputUI
 * @property {number} min
 *   Minimum allowed value for this dimension (constraint property).
 *   Updated when terrain limits change to reflect new minimums.
 * @property {{value: string}} choose
 *   The HTML input element wrapper with a value property containing the current input string.
 *   Direct access to the DOM input's value for reading and updating displayed dimension.
 * @description UI abstraction for dimension input controls in terrain configuration
 */

/**
 * Parse and normalize a dimension value from a UI input.
 *
 * Validates that the provided value falls within the specified range. If parsing fails
 * (non-numeric value) or the parsed value is out of bounds, resets the input to the
 * minimum allowed dimension and updates the UI to reflect the corrected value.
 *
 * This function ensures that all dimension values used by the system are valid integers
 * within the configured terrain limits. Invalid inputs are silently corrected rather than
 * throwing errors, providing a user-friendly validation experience.
 *
 * @param {string} value
 *   The raw input value to validate, typically from an HTML input element.
 *   Can be any string including non-numeric or out-of-range values.
 * @param {number} min
 *   Minimum allowed dimension value, inclusive.
 * @param {number} max
 *   Maximum allowed dimension value, inclusive.
 * @param {DimensionInputUI} ui
 *   The UI element wrapper for the dimension input containing min constraint and input element.
 *   Updated with corrected value if validation fails.
 * @returns {number}
 *   The validated dimension value. Returns the parsed value if in range,
 *   or the minimum allowed value if validation fails.
 * @private
 *
 * @example
 * // Valid input
 * const width = validateDimension("15", 10, 20, widthUI)
 * // Returns: 15
 *
 * @example
 * // Out of range - too high
 * const width = validateDimension("25", 10, 20, widthUI)
 * // Returns: 10, sets widthUI.choose.value to "10"
 *
 * @example
 * // Non-numeric input
 * const width = validateDimension("abc", 10, 20, widthUI)
 * // Returns: 10, sets widthUI.choose.value to "10"
 *
 * @remarks
 * - Uses Number.parseInt() with radix 10 for base-10 integer parsing
 * - Non-numeric values result in NaN, triggering correction to minimum
 * - Updates ui.choose.value string representation when correcting
 * - Does not throw exceptions; silently corrects invalid input
 * - Min value comes from ui.min constraint, not the min parameter (parameter takes precedence)
 * - Pure function with single side effect: UI element value update
 *
 * @see validateWidth for width-specific validation
 * @see validateHeight for height-specific validation
 */
function validateDimension (value, min, max, ui) {
  let dimension = Number.parseInt(value, 10)
  if (Number.isNaN(dimension) || dimension < min || dimension > max) {
    dimension = ui.min
    ui.choose.value = String(dimension)
  }
  return dimension
}

/**
 * Validate the current width input against terrain-specific width limits.
 *
 * Extracts the width input value from the global UI state (bh.widthUI),
 * validates it against the current terrain's configured min/max width constraints,
 * and returns the validated width. If the input is invalid, it's corrected
 * to the minimum allowed width and the UI is updated.
 *
 * This is the primary interface for width validation throughout the application.
 * All width inputs from the user should be validated through this function before use.
 *
 * @returns {number}
 *   The validated width in cells. Falls back to minimum terrain width if input is invalid.
 * @public
 *
 * @example
 * // With valid input (terrain min=10, max=40)
 * bh.widthUI.choose.value = "25"
 * const width = validateWidth()
 * // Returns: 25
 *
 * @example
 * // With invalid input (too high)
 * bh.widthUI.choose.value = "50"
 * const width = validateWidth()
 * // Returns: 10 (minimum), updates UI
 *
 * @remarks
 * - Requires global bh.widthUI and bh.maps.terrain to be initialized
 * - Delegates to validateDimension() with terrain's width constraints
 * - Synchronizes UI state with returned value
 * - Safe to call before every map operation requiring width
 * - No exceptions thrown; invalid input corrected silently
 *
 * @see validateHeight for height validation
 * @see hasMapOfCurrentSize for checking map existence at validated size
 * @see setNewMapToCorrectSize for creating map with validated dimensions
 */
export function validateWidth () {
  return validateDimension(
    bh.widthUI.choose.value,
    bh.maps.terrain.minWidth,
    bh.maps.terrain.maxWidth,
    bh.widthUI
  )
}

/**
 * Validate the current height input against terrain-specific height limits.
 *
 * Extracts the height input value from the global UI state (bh.heightUI),
 * validates it against the current terrain's configured min/max height constraints,
 * and returns the validated height. If the input is invalid, it's corrected
 * to the minimum allowed height and the UI is updated.
 *
 * This is the primary interface for height validation throughout the application.
 * All height inputs from the user should be validated through this function before use.
 *
 * @returns {number}
 *   The validated height in cells. Falls back to minimum terrain height if input is invalid.
 * @public
 *
 * @example
 * // With valid input (terrain min=10, max=40)
 * bh.heightUI.choose.value = "20"
 * const height = validateHeight()
 * // Returns: 20
 *
 * @example
 * // With invalid input (too low)
 * bh.heightUI.choose.value = "5"
 * const height = validateHeight()
 * // Returns: 10 (minimum), updates UI
 *
 * @remarks
 * - Requires global bh.heightUI and bh.maps.terrain to be initialized
 * - Delegates to validateDimension() with terrain's height constraints
 * - Synchronizes UI state with returned value
 * - Safe to call before every map operation requiring height
 * - No exceptions thrown; invalid input corrected silently
 *
 * @see validateWidth for width validation
 * @see hasMapOfCurrentSize for checking map existence at validated size
 * @see setNewMapToCorrectSize for creating map with validated dimensions
 */
export function validateHeight () {
  return validateDimension(
    bh.heightUI.choose.value,
    bh.maps.terrain.minHeight,
    bh.maps.terrain.maxHeight,
    bh.heightUI
  )
}

/**
 * Determine if a map exists for the currently selected dimensions.
 *
 * Validates both the width and height inputs, then checks whether a pre-built
 * or previously saved map already exists at that specific dimension combination.
 * This is used to prevent overwriting existing maps and to enable loading
 * previously saved maps by their dimensions.
 *
 * @returns {boolean}
 *   True if a map exists for the validated (height, width) combination,
 *   false if no map exists at those dimensions or if the dimensions are invalid.
 * @public
 *
 * @example
 * // Map exists at 15x20
 * if (hasMapOfCurrentSize()) {
 *   console.log('Can load existing map')
 * } else {
 *   console.log('Need to create new map')
 * }
 *
 * @remarks
 * - Validates both dimensions before checking map existence
 * - Calls bh.maps.hasMapSize() with (height, width) parameter order
 * - Note: parameter order is (height, width), not (width, height)
 * - Safe to call after user input; invalid inputs are corrected first
 * - Used to enable/disable "Load" buttons in UI
 *
 * @see validateWidth for width validation
 * @see validateHeight for height validation
 * @see setNewMapToCorrectSize for creating blank map at validated size
 */
export function hasMapOfCurrentSize () {
  return bh.maps.hasMapSize(validateHeight(), validateWidth())
}

/**
 * Reset the current map to a blank map using the validated dimensions.
 *
 * Validates both width and height inputs, then creates and loads a new blank map
 * with those dimensions. This effectively clears the current map and initializes
 * a fresh canvas for map editing. The dimensions are validated before use to ensure
 * the new map uses valid terrain-constrained dimensions.
 *
 * Useful for:
 * - Starting a new custom map after dimension selection
 * - Resetting the current map to blank state
 * - Ensuring dimensions match terrain configuration
 *
 * @returns {void}
 *   Modifies global state (bh.maps) but returns nothing.
 * @public
 *
 * @example
 * // User selects dimensions 20x25 and clicks "New Map"
 * setNewMapToCorrectSize()
 * // Creates blank map with validated dimensions
 * // Clears any existing map data
 *
 * @remarks
 * - Validates both dimensions before creating map
 * - Calls bh.maps.setToDefaultBlank() with (height, width) parameter order
 * - Note: parameter order is (height, width), not (width, height)
 * - Modifies global bh.maps state
 * - Safe to call even with invalid UI input; dimensions will be corrected
 * - Typically called during "New Map" flow in UI
 *
 * @see validateWidth for width validation
 * @see validateHeight for height validation
 * @see hasMapOfCurrentSize for checking existing maps
 */
export function setNewMapToCorrectSize () {
  bh.maps.setToDefaultBlank(validateHeight(), validateWidth())
}
