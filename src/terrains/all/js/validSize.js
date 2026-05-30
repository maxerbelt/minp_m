/**
 * @fileoverview Map Dimension Validation Module
 *
 * Provides utilities for validating and normalizing map dimensions (width and height)
 * against terrain configuration limits. Integrates with the UI input controls to ensure
 * only valid dimension values are used during map creation and manipulation.
 *
 * This module acts as a gateway between raw user input and the map system, ensuring
 * all dimensions conform to terrain-specific constraints. It handles:
 * - Input parsing and validation against min/max constraints
 * - Automatic correction to valid values (user-friendly error handling)
 * - Synchronization of UI state with validated dimensions
 * - Existence checking for pre-built and saved maps
 * - Blank map creation at validated dimensions
 *
 * **Architecture Role**:
 * - Sits between UI layer (HTML inputs) and map model layer (bh.maps)
 * - Centralizes dimension validation logic to prevent invalid map operations
 * - Provides consistent API for width/height operations throughout the app
 * - Ensures all map operations use terrain-constrained dimensions
 *
 * **Design Pattern**: Validation gateway with automatic correction
 * - Invalid inputs are silently corrected to minimum valid value
 * - No exceptions thrown; provides graceful degradation
 * - Immutable validation: returns new values rather than modifying inputs
 *
 * @module terrains/all/js/validSize
 * @requires ./bh - Global battle simulator state and map configuration
 * @exports {function} validateWidth - Width validation function
 * @exports {function} validateHeight - Height validation function
 * @exports {function} hasMapOfCurrentSize - Map existence checker
 * @exports {function} setNewMapToCorrectSize - Blank map creator
 *
 * @see {@link module:terrains/all/js/bh} - Global state container
 * @see {@link module:terrains/all/js/terrain} - Terrain configuration with limits
 * @see {@link module:terrains/all/js/SubTerrainBase} - Terrain base providing dimensions
 *
 * @example
 * // Typical usage in map creation flow
 * import { validateWidth, validateHeight, setNewMapToCorrectSize } from './validSize.js'
 * const width = validateWidth()    // Parse and validate user input
 * const height = validateHeight()  // Parse and validate user input
 * setNewMapToCorrectSize()          // Create blank map with validated dimensions
 *
 * @example
 * // Checking if a map exists before loading
 * import { hasMapOfCurrentSize } from './validSize.js'
 * if (hasMapOfCurrentSize()) {
 *   // Load existing map at current dimensions
 * } else {
 *   // Create new blank map
 * }
 *
 * @since 1.0.0
 * @version 2.0.0 - Comprehensive JSDoc with closure types and extended documentation
 * @author Battle Simulator Team
 */

import { bh } from './bh.js'

/**
 * UI wrapper for a dimension input control.
 *
 * Provides access to the HTML input element and its minimum constraint, serving as
 * an abstraction layer between the dimension validation logic and raw DOM elements.
 * This type bridges the gap between the input form (HTML) and the validation system.
 *
 * The wrapper allows validation functions to:
 * - Read the current user-entered value as a string
 * - Update the displayed value when correcting invalid input
 * - Access the minimum constraint from the HTML element's min attribute
 *
 * Typically represents DOM input elements like `<input type="number" min="10" />`
 * where the validation system needs to read, validate, and correct displayed values.
 *
 * **Usage in Validation**:
 * When validation fails (non-numeric, out of range), the validated value is written
 * back to `ui.choose.value`, causing immediate UI updates that inform the user.
 *
 * @typedef {Object} DimensionInputUI
 * @property {number} min
 *   Minimum allowed value for this dimension constraint.
 *   Maps to the HTML input element's `min` attribute.
 *   Updated by terrain configuration when limits change to reflect new minimums.
 *   Used as fallback value when user input is invalid.
 *   @type {number}
 *   @readonly
 * @property {{value: string}} choose
 *   DOM element or wrapper with a mutable `value` property containing the current input.
 *   Stores the user-entered dimension as a string (HTML input representation).
 *   Direct access to the input's value for both reading current input and updating
 *   displayed value when corrections occur.
 *   @type {Object}
 *   @property {string} value - The current input value as a string (e.g., "15", "20")
 *   @readonly - Object is readonly but value property is mutable
 * @description UI abstraction bridging HTML input elements and dimension validation
 *
 * @example
 * // Typical construction from HTML element
 * const widthUI = {
 *   min: 10,                           // HTML input min attribute
 *   choose: document.getElementById('width-input')  // HTML element
 * }
 *
 * @example
 * // During validation with correction
 * const ui = { min: 10, choose: { value: "abc" } }
 * validateDimension("abc", 10, 40, ui)
 * // Sets ui.choose.value = "10" (corrected to minimum)
 *
 * @see DimensionValidationParameters for how this type is used in validation
 * @see validateWidth - uses DimensionInputUI for width input
 * @see validateHeight - uses DimensionInputUI for height input
 */

/**
 * Parse and normalize a dimension value from a UI input.
 *
 * Validates that the provided value falls within the specified range [min, max].
 * If parsing fails (non-numeric value) or the parsed value is out of bounds,
 * resets the input to the minimum allowed dimension and updates the UI to reflect
 * the corrected value.
 *
 * This function ensures that all dimension values used by the map system are valid
 * integers within configured terrain limits. Invalid inputs are silently corrected
 * rather than throwing errors, providing a user-friendly validation experience.
 *
 * **Validation Pipeline**:
 * 1. Parse input string as base-10 integer using Number.parseInt()
 * 2. Check for NaN (non-numeric input)
 * 3. Check bounds: value < min or value > max
 * 4. If any check fails: reset to ui.min and update UI
 * 5. Return the validated (or corrected) dimension value
 *
 * **User Experience**:
 * When invalid input is detected (e.g., user types "abc" or enters "50" when max=40),
 * the function automatically corrects it to the minimum valid value and updates the
 * displayed input to match. This prevents confusion and ensures valid state.
 *
 * @function validateDimension
 * @private
 * @param {string} value
 *   The raw input value to validate, typically from an HTML input element.
 *   Can be any string including non-numeric, negative, decimal, or out-of-range values.
 *   Examples: "15", "abc", "-5", "3.14", "50"
 *   @type {string}
 * @param {number} min
 *   Minimum allowed dimension value, inclusive.
 *   Valid range lower bound. Must be positive integer.
 *   Examples: 5, 10, 15 (typical game grid minimums)
 *   @type {number}
 * @param {number} max
 *   Maximum allowed dimension value, inclusive.
 *   Valid range upper bound. Must be >= min and positive integer.
 *   Examples: 20, 40, 100 (typical game grid maximums)
 *   @type {number}
 * @param {DimensionInputUI} ui
 *   The UI element wrapper containing the HTML input and its constraint.
 *   Object with properties: { min: number, choose: {value: string} }
 *   Updated with corrected value if validation fails (ui.choose.value reassigned).
 *   @type {DimensionInputUI}
 * @returns {number}
 *   The validated dimension value as an integer.
 *   - If input is valid and in range: returns the parsed integer value
 *   - If input is invalid or out of range: returns ui.min (minimum valid value)
 *   - Always returns an integer; never NaN, float, or negative
 *   @type {number}
 *
 * @example
 * // Valid input within range
 * const widthUI = { min: 10, choose: { value: "15" } }
 * const result = validateDimension("15", 10, 20, widthUI)
 * // Returns: 15
 * // widthUI unchanged
 *
 * @example
 * // Out of range - too high
 * const widthUI = { min: 10, choose: { value: "25" } }
 * const result = validateDimension("25", 10, 20, widthUI)
 * // Returns: 10
 * // widthUI.choose.value set to "10" (UI displays corrected value)
 *
 * @example
 * // Non-numeric input
 * const widthUI = { min: 10, choose: { value: "abc" } }
 * const result = validateDimension("abc", 10, 20, widthUI)
 * // Returns: 10
 * // widthUI.choose.value set to "10" (UI displays corrected value)
 *
 * @example
 * // Decimal parsed as integer (truncated)
 * const widthUI = { min: 10, choose: { value: "15.7" } }
 * const result = validateDimension("15.7", 10, 20, widthUI)
 * // Returns: 15 (decimal truncated by parseInt)
 * // widthUI unchanged
 *
 * @remarks
 * - Uses Number.parseInt(value, 10) for base-10 integer parsing
 * - Non-numeric values result in NaN, triggering correction to minimum
 * - Decimal values are truncated (parseInt behavior): "15.7" becomes 15
 * - Negative values are accepted if within [min, max] range
 * - Updates ui.choose.value string representation when correcting
 * - Does not throw exceptions; silently corrects invalid input
 * - Parameter min/max take precedence over ui.min (though typically ui.min = min)
 * - Single side effect: modifies ui.choose.value if validation fails
 * - Deterministic: same input always produces same output
 *
 * @see validateWidth - width-specific public validation (delegates to this function)
 * @see validateHeight - height-specific public validation (delegates to this function)
 * @see DimensionInputUI - typedef for the ui parameter
 */
function validateDimension (value, min, max, ui) {
  // Parse input as base-10 integer; non-numeric strings result in NaN
  /** @type {number} */
  let dimension = Number.parseInt(value, 10)

  // Check bounds: invalid parse (NaN) or outside [min, max] range
  if (Number.isNaN(dimension) || dimension < min || dimension > max) {
    // Correction: reset to minimum valid value
    dimension = ui.min
    // Synchronize UI display with corrected value
    ui.choose.value = String(dimension)
  }

  return dimension
}

/**
 * Validate the current width input against terrain-specific width limits.
 *
 * Extracts the width input value from the global UI state (bh.widthUI),
 * validates it against the current terrain's configured min/max width constraints
 * (bh.maps.terrain.minWidth and maxWidth), and returns the validated width.
 *
 * If the input is invalid (non-numeric or out-of-range), it's corrected to the
 * minimum allowed width and the UI is updated to reflect the correction.
 *
 * This is the primary public interface for width validation throughout the application.
 * All width inputs from user interactions should be validated through this function
 * before being used in map operations.
 *
 * **Typical Usage Pattern**:
 * 1. User enters width in HTML input
 * 2. Call validateWidth() to parse and validate
 * 3. Use returned value for map operations (guaranteed to be valid)
 *
 * @function validateWidth
 * @public
 * @returns {number}
 *   The validated width in cells as an integer.
 *   - Valid user input: returns the parsed integer value
 *   - Invalid/out-of-range: returns bh.maps.terrain.minWidth (minimum valid width)
 *   - Always positive integer, never NaN or negative
 *   - Guaranteed to fall within [minWidth, maxWidth] terrain limits
 *   @type {number}
 *
 * @example
 * // With valid input (terrain min=10, max=40)
 * bh.widthUI.choose.value = "25"
 * const width = validateWidth()
 * // Returns: 25
 * // UI unchanged
 *
 * @example
 * // With invalid input (too high)
 * bh.widthUI.choose.value = "50"
 * const width = validateWidth()
 * // Returns: 10 (minimum), updates bh.widthUI.choose.value to "10"

 *
 * @example
 * // With non-numeric input
 * bh.widthUI.choose.value = "invalid"
 * const width = validateWidth()
 * // Returns: 10 (minimum), updates bh.widthUI.choose.value to "10"
 *
 * @example
 * // In a map creation workflow
 * const width = validateWidth()   // Get validated width
 * const height = validateHeight() // Get validated height
 * setNewMapToCorrectSize()        // Create map with validated dimensions
 *
 * @remarks
 * - Requires global bh.widthUI and bh.maps.terrain to be initialized
 * - Accesses: bh.widthUI.choose.value (user input), bh.maps.terrain.minWidth/maxWidth (constraints)
 * - Delegates to validateDimension() with terrain's width-specific constraints
 * - Synchronizes UI state: updates bh.widthUI.choose.value if correction occurs
 * - Safe to call before every map operation requiring width verification
 * - No exceptions thrown; invalid input corrected silently
 * - Side effect: may modify bh.widthUI.choose.value if input is invalid
 * - Pure computation otherwise: returns consistent result for same input
 *
 * @see validateHeight - Parallel function for height validation
 * @see hasMapOfCurrentSize - Uses validated width (via this function) for map checking
 * @see setNewMapToCorrectSize - Uses validated width (via this function) for map creation
 * @see module:terrains/all/js/bh - Global state containing widthUI and terrain constraints
 */
export function validateWidth () {
  // Validate width against current terrain's configured width limits
  return validateDimension(
    bh.widthUI.choose.value, // User-entered width as string
    bh.maps.terrain.minWidth, // Terrain's minimum width constraint
    bh.maps.terrain.maxWidth, // Terrain's maximum width constraint
    bh.widthUI // UI wrapper (may be updated if invalid)
  )
}

/**
 * Validate the current height input against terrain-specific height limits.
 *
 * Extracts the height input value from the global UI state (bh.heightUI),
 * validates it against the current terrain's configured min/max height constraints
 * (bh.maps.terrain.minHeight and maxHeight), and returns the validated height.
 *
 * If the input is invalid (non-numeric or out-of-range), it's corrected to the
 * minimum allowed height and the UI is updated to reflect the correction.
 *
 * This is the primary public interface for height validation throughout the application.
 * All height inputs from user interactions should be validated through this function
 * before being used in map operations.
 *
 * **Typical Usage Pattern**:
 * 1. User enters height in HTML input
 * 2. Call validateHeight() to parse and validate
 * 3. Use returned value for map operations (guaranteed to be valid)
 *
 * @function validateHeight
 * @public
 * @returns {number}
 *   The validated height in cells as an integer.
 *   - Valid user input: returns the parsed integer value
 *   - Invalid/out-of-range: returns bh.maps.terrain.minHeight (minimum valid height)
 *   - Always positive integer, never NaN or negative
 *   - Guaranteed to fall within [minHeight, maxHeight] terrain limits
 *   @type {number}
 *
 * @example
 * // With valid input (terrain min=10, max=40)
 * bh.heightUI.choose.value = "20"
 * const height = validateHeight()
 * // Returns: 20
 * // UI unchanged
 *
 * @example
 * // With invalid input (too low)
 * bh.heightUI.choose.value = "5"
 * const height = validateHeight()
 * // Returns: 10 (minimum), updates bh.heightUI.choose.value to "10"
 *
 * @example
 * // With non-numeric input
 * bh.heightUI.choose.value = "invalid"
 * const height = validateHeight()
 * // Returns: 10 (minimum), updates bh.heightUI.choose.value to "10"
 *
 * @example
 * // In a map creation workflow
 * const width = validateWidth()    // Get validated width
 * const height = validateHeight()  // Get validated height
 * setNewMapToCorrectSize()         // Create map with validated dimensions
 *
 * @remarks
 * - Requires global bh.heightUI and bh.maps.terrain to be initialized
 * - Accesses: bh.heightUI.choose.value (user input), bh.maps.terrain.minHeight/maxHeight (constraints)
 * - Delegates to validateDimension() with terrain's height-specific constraints
 * - Synchronizes UI state: updates bh.heightUI.choose.value if correction occurs
 * - Safe to call before every map operation requiring height verification
 * - No exceptions thrown; invalid input corrected silently
 * - Side effect: may modify bh.heightUI.choose.value if input is invalid
 * - Pure computation otherwise: returns consistent result for same input
 *
 * @see validateWidth - Parallel function for width validation
 * @see hasMapOfCurrentSize - Uses validated height (via this function) for map checking
 * @see setNewMapToCorrectSize - Uses validated height (via this function) for map creation
 * @see module:terrains/all/js/bh - Global state containing heightUI and terrain constraints
 */
export function validateHeight () {
  // Validate height against current terrain's configured height limits
  return validateDimension(
    bh.heightUI.choose.value, // User-entered height as string
    bh.maps.terrain.minHeight, // Terrain's minimum height constraint
    bh.maps.terrain.maxHeight, // Terrain's maximum height constraint
    bh.heightUI // UI wrapper (may be updated if invalid)
  )
}

/**
 * Determine if a map exists for the currently selected dimensions.
 *
 * Validates both the width and height inputs against terrain constraints,
 * then checks whether a pre-built or previously saved map already exists at that
 * specific dimension combination. Returns true if found, false otherwise.
 *
 * This function is used throughout the app to:
 * - Enable/disable "Load Map" buttons (only clickable if map exists)
 * - Prevent accidental overwriting of existing maps
 * - Support loading previously saved custom maps by dimension
 * - Gate map operations that require existing maps
 *
 * **Validation & Lookup Flow**:
 * 1. Validate current width input → corrects if needed
 * 2. Validate current height input → corrects if needed
 * 3. Query bh.maps.hasMapSize(height, width) for existence
 * 4. Return boolean result
 *
 * @function hasMapOfCurrentSize
 * @public
 * @returns {boolean}
 *   Map existence status for the validated dimensions.
 *   - true: A map exists at the validated (height, width) combination
 *   - false: No map exists at those dimensions (invalid input corrected first)
 *   @type {boolean}
 *
 * @example
 * // Check if map exists at current dimensions
 * if (hasMapOfCurrentSize()) {
 *   console.log('Can load existing map')
 *   // Enable load button, show existing map in preview, etc.
 * } else {
 *   console.log('Need to create new map')
 *   // Enable new map button, show blank slate, etc.
 * }
 *
 * @example
 * // Used in UI event handlers
 * document.getElementById('load-map-button').disabled = !hasMapOfCurrentSize()
 *
 * @example
 * // Used in game flow logic
 * if (hasMapOfCurrentSize()) {
 *   loadExistingMap(validateHeight(), validateWidth())
 * } else {
 *   showNewMapDialog()
 * }
 *
 * @remarks
 * - Validates both dimensions before checking map existence
 * - Calls bh.maps.hasMapSize() with (height, width) parameter order
 * - **Important**: Parameter order is (height, width), NOT (width, height)
 * - Safe to call after any user input; invalid inputs are corrected transparently
 * - Updates UI state if dimension inputs were invalid (via validateWidth/validateHeight)
 * - Used throughout: map selection, load dialogs, new map flows
 * - Idempotent: multiple calls return consistent result for same dimensions
 * - No side effects except dimension validation (which may update UI)
 * - Returns false (not error) if map system not initialized; safe guard
 *
 * @see validateWidth - Validates width before checking map
 * @see validateHeight - Validates height before checking map
 * @see setNewMapToCorrectSize - Creates new map at validated dimensions
 * @see module:terrains/all/js/bh - Global state and map existence checker
 */
export function hasMapOfCurrentSize () {
  // Validate dimensions and check if map exists at that size
  // Note: parameter order is (height, width), not (width, height)
  return bh.maps.hasMapSize(validateHeight(), validateWidth())
}

/**
 * Reset the current map to a blank map using the validated dimensions.
 *
 * Validates both width and height inputs against terrain constraints, then creates
 * and loads a new blank map with those dimensions. This effectively clears the current
 * map and initializes a fresh canvas for map editing.
 *
 * The dimensions are validated before use to ensure the new map uses valid
 * terrain-constrained dimensions. Invalid inputs are automatically corrected,
 * so this is safe to call even with potentially invalid user input.
 *
 * **Typical Usage**:
 * - User selects map dimensions and clicks "Create New Map"
 * - User wants to clear current map and start fresh
 * - User needs to reset to default blank map
 *
 * **State Modification Flow**:
 * 1. Validate current width input → corrects if needed
 * 2. Validate current height input → corrects if needed
 * 3. Call bh.maps.setToDefaultBlank(height, width)
 * 4. Map system creates and loads blank map at validated dimensions
 *
 * @function setNewMapToCorrectSize
 * @public
 * @returns {void}
 *   Returns nothing (undefined). Modifies global state (bh.maps.current) as side effect.
 *   @type {undefined}
 *
 * @example
 * // User selects dimensions 20x25 and clicks "New Map"
 * setNewMapToCorrectSize()
 * // Validates dimensions (corrects if needed)
 * // Creates blank map at validated dimensions
 * // Clears any existing map data and canvas
 * // Map is ready for editing
 *
 * @example
 * // In UI event handler
 * document.getElementById('new-map-button').addEventListener('click', () => {
 *   setNewMapToCorrectSize()  // Safe even if user input is invalid
 *   showEditor()              // Dimensions are guaranteed valid
 * })
 *
 * @example
 * // Map creation workflow
 * const width = validateWidth()    // Get validated width
 * const height = validateHeight()  // Get validated height (also calls this function)
 * setNewMapToCorrectSize()         // OR: just call this directly
 *
 * @remarks
 * - Validates both dimensions before creating map (corrects invalid input)
 * - Calls bh.maps.setToDefaultBlank() with (height, width) parameter order
 * - **Important**: Parameter order is (height, width), NOT (width, height)
 * - Modifies global bh.maps state (replaces current map)
 * - Safe to call even with invalid UI input; dimensions are corrected first
 * - Typically called during "New Map" / "Reset" flow in map selection UI
 * - Side effects: Updates UI dimension inputs (if invalid), creates new map object
 * - Deterministic: same dimension input always creates same map structure
 * - Idempotent: multiple calls create equivalent results
 * - Requires bh.maps to be initialized; no error if not (implementation dependent)
 *
 * @see validateWidth - Validates width before creating map
 * @see validateHeight - Validates height before creating map
 * @see hasMapOfCurrentSize - Check if map already exists (prevents overwrite)
 * @see module:terrains/all/js/bh - Global state and map creator
 */
export function setNewMapToCorrectSize () {
  // Validate dimensions and create new blank map at validated size
  // Note: parameter order is (height, width), not (width, height)
  bh.maps.setToDefaultBlank(validateHeight(), validateWidth())
}
