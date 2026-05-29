import { Shape } from './Shape.js'
import { TransformableVariants } from '../variants/TransformableVariants.js'

/**
 * @typedef {import('./Shape.js').Shape} ShapeType
 * @typedef {import('../variants/TransformableVariants.js').TransformableVariants} TransformableVariantsType
 * @typedef {import('../grid/rectangle/mask.js').Mask} Mask
 */

/**
 * Transformer - A multi-form shape with dynamic transformation capabilities.
 *
 * Extends Shape to provide transformation capabilities between different ship configurations.
 * Manages multiple ship forms (e.g., different configurations of the same vessel) and coordinates
 * variant management across all forms. The transformer maintains state about which form is active
 * and delegates property access/mutation to the current form while syncing changes across all forms.
 *
 * Key features:
 * - Multiple ship forms with independent variant sets
 * - Automatic form switching via TransformableVariants
 * - Synchronized property mutation across all forms
 * - Total variant count aggregation from all forms
 * - Read-only displacement (computed from current form)
 *
 * @class Transformer
 * @extends Shape
 * @property {Array<ShapeType>} forms - Array of all available ship forms
 * @property {TransformableVariantsType} formVariants - Variant manager for form transitions
 * @property {number} totalVariants - Total variant count across all forms
 * @property {boolean} canTransform - Always true for transformers
 *
 * @example
 * const transformer = new Transformer([form1, form2, form3]);
 * const board = transformer.boardFor();  // Current form's variant
 * transformer.tip = 'New placement tip';  // Applied to all forms
 * transformer.formVariants.nextForm();     // Switch to next form
 */
export class Transformer extends Shape {
  /**
   * Creates a transformer with multiple ship forms.
   *
   * Validates the forms array and initializes the transformer with the first form's base properties.
   * Sets up the TransformableVariants manager to coordinate form transitions and variant selection.
   * All mutable properties are synchronized across forms via setters.
   *
   * @param {Array<ShapeType>} forms - Array of ship forms this transformer can take (must not be empty)
   * @throws {Error} If forms array is empty or invalid
   *
   * @example
   * const transformer = new Transformer([normalForm, disabledForm, damagedForm]);
   */
  constructor (forms) {
    const validatedForms = Transformer._ensureValidForms(forms)

    super(
      validatedForms[0].letter,
      validatedForms[0].symmetry,
      validatedForms[0].cells,
      'X',
      Transformer._buildDefaultTip(validatedForms[0]),
      validatedForms[0].racks
    )

    this.forms = validatedForms
    this.formVariants = new TransformableVariants(validatedForms)
    this.totalVariants = Transformer._countTotalVariants(validatedForms)
    this.canTransform = true
  }

  /**
   * Validates the forms array to ensure it contains valid ship form objects.
   *
   * Checks:
   * - Input is an array
   * - Array is not empty (at least one form required)
   *
   * @param {Array<ShapeType>} forms - Candidate form list
   * @returns {Array<ShapeType>} The validated forms list
   * @throws {Error} If forms is not an array or is empty
   * @private
   */
  static _ensureValidForms (forms) {
    if (!Array.isArray(forms) || forms.length === 0) {
      throw new Error('Transformer must have at least one form')
    }

    return forms
  }

  /**
   * Builds the default tip text using the first form's description.
   *
   * Generates a placement hint from the first form's descriptionText.
   * Used when no custom tip is provided during initialization.
   *
   * @param {ShapeType} form - The first form in the transformer
   * @returns {string} Tip text for placement guidance in format: "place {description} on the map"
   * @private
   */
  static _buildDefaultTip (form) {
    return `place ${form.descriptionText} on the map`
  }

  /**
   * Calculates the total number of variants across all forms.
   *
   * Sums the variant count from each form's variant() method.
   * Useful for determining overall transformation possibilities.
   *
   * @param {Array<ShapeType>} forms - Transformer forms
   * @returns {number} Total variant count (sum of variants.length for all forms)
   * @private
   */
  static _countTotalVariants (forms) {
    return forms.reduce((count, form) => count + form.variants().length, 0)
  }

  /**
   * Resolves a provided index to the current variant index if omitted.
   *
   * Helper for methods that accept optional index parameter:
   * - If index is provided: return it
   * - If index is null/undefined: return current index from formVariants
   *
   * @param {number} [index] - Optional requested index
   * @returns {number} Resolved variant index
   * @private
   */
  _resolveIndex (index) {
    return index == null ? this.index : index
  }

  /**
   * Gets the value of a property from the current form.
   *
   * Direct property access delegation to this.currentForm[property].
   * Used by getters for displacement, tip, description, etc.
   *
   * @param {string} property - Property name
   * @returns {*} Current form property value
   * @private
   */
  _getCurrentFormValue (property) {
    return this.currentForm[property]
  }

  /**
   * Calls a method on the current form with provided arguments.
   *
   * Method invocation delegation to this.currentForm[method]().
   * Used by wrapper methods like description(), protectionAgainst(), sunkDescription().
   *
   * @param {string} method - Method name on current form
   * @param {...*} args - Arguments to pass to the method
   * @returns {*} Result of the method call
   * @private
   */
  _invokeCurrentFormMethod (method, ...args) {
    return this.currentForm[method](...args)
  }

  /**
   * Checks whether a value should be treated as empty for mutation operations.
   *
   * Validates before applying changes to all forms:
   * - null or undefined → empty
   * - has .length property === 0 → empty
   *
   * @param {*} value - Value to check
   * @returns {boolean} True when value is null, undefined, or empty array/string
   * @private
   */
  _isEmptyValue (value) {
    return value == null || value.length === 0
  }

  /**
   * Sets the same property value on every form.
   *
   * Synchronizes mutable properties across all forms when they change.
   * Skips if value is empty (via _isEmptyValue) or forms array is missing.
   *
   * Used by setters: attachedWeapons, tip, vulnerable, hardened, immune
   * Ensures all forms maintain consistent state for properties that don't vary by form.
   *
   * @param {string} property - Property name to set
   * @param {*} value - Value to set on all forms
   * @returns {void}
   * @private
   */
  _setValueOnAllForms (property, value) {
    if (this._isEmptyValue(value) || !this.forms?.length) {
      return
    }

    for (const form of this.forms) {
      form[property] = value
    }
  }

  /**
   * Gets the board for a specific variant index.
   *
   * Delegates to TransformableVariants.boardFor() with optional index override.
   * If index is omitted, uses current variant index.
   *
   * @param {number} [index] - Variant index (defaults to current index)
   * @returns {Mask} Board mask for the specified variant
   */
  boardFor (index) {
    return this.formVariants.boardFor(this._resolveIndex(index))
  }

  /**
   * Gets the variant for a specific index.
   *
   * Delegates to TransformableVariants.variant() with optional index override.
   * If index is omitted, uses current variant index.
   *
   * @param {number} [index] - Variant index (defaults to current index)
   * @returns {Object} Variant object for the specified index
   */
  variant (index) {
    return this.formVariants.variant(this._resolveIndex(index))
  }

  /**
   * Gets the current variant index across all forms.
   *
   * @type {number}
   * @readonly
   */
  get index () {
    return this.formVariants.index
  }

  /**
   * Gets the current form index.
   *
   * Index into the forms array indicating which form is currently active.
   * Updated when nextForm() is called on TransformableVariants.
   *
   * @type {number}
   * @readonly
   */
  get formsIdx () {
    return this.formVariants.formsIdx
  }

  /**
   * Gets the currently active form.
   *
   * Returns this.forms[this.formsIdx], the shape object for the active transformation state.
   * All property getters delegate to this form, and setters update all forms.
   *
   * @type {ShapeType}
   * @readonly
   */
  get currentForm () {
    return this.forms[this.formsIdx]
  }

  /**
   * Gets attached weapons from current form.
   *
   * @type {Object}
   * @readonly
   * @returns {Object} Attached weapons indexed by coordinate
   */
  get attachedWeapons () {
    return this._getCurrentFormValue('attachedWeapons')
  }

  /**
   * Sets attached weapons on all forms.
   *
   * Synchronizes weapon attachments across all transformation forms.
   * Skips if newAttachedWeapons is empty or forms array is missing.
   *
   * @param {Object} newAttachedWeapons - Weapons to attach
   * @returns {void}
   */
  set attachedWeapons (newAttachedWeapons) {
    this._setValueOnAllForms('attachedWeapons', newAttachedWeapons)
  }

  /**
   * Gets weapon system from current form.
   *
   * @type {Object|null}
   * @readonly
   * @returns {Object|null} Weapon system or null if not attached
   */
  get weaponSystem () {
    return this._getCurrentFormValue('weaponSystem')
  }

  /**
   * Gets description text from current form.
   *
   * @type {string}
   * @readonly
   * @returns {string} Description text
   */
  get descriptionText () {
    return this._getCurrentFormValue('descriptionText')
  }

  /**
   * Gets tip from current form.
   *
   * Placement guidance text or configuration for the current transformation form.
   *
   * @type {*}
   * @readonly
   * @returns {*} Tip configuration
   */
  get tip () {
    return this._getCurrentFormValue('tip')
  }

  /**
   * Sets tip on all forms.
   *
   * Synchronizes placement guidance text across all transformation forms.
   * Skips if newTip is empty or forms array is missing.
   *
   * @param {*} newTip - New tip value
   * @returns {void}
   */
  set tip (newTip) {
    this._setValueOnAllForms('tip', newTip)
  }

  /**
   * Gets displacement from current form.
   *
   * Displacement is form-specific and read-only at the transformer level.
   * Each form has its own fixed displacement value.
   *
   * @type {number}
   * @readonly
   * @returns {number} Displacement value of current form
   */
  get displacement () {
    return this._getCurrentFormValue('displacement')
  }

  /**
   * Displacement setter is intentionally non-functional.
   *
   * Displacement is read-only at the transformer level because each form has
   * its own fixed displacement value. Use the form's displacement directly
   * if modification is needed.
   *
   * @param {number} _newDisplacement - Ignored (read-only property)
   * @returns {void}
   * @deprecated Displacement is read-only; change individual form values instead
   */
  set displacement (_newDisplacement) {
    // Intentionally empty - displacement is form-specific and read-only
  }

  /**
   * Gets vulnerable cells from current form.
   *
   * @type {Array}
   * @readonly
   * @returns {Array} Vulnerable cells array
   */
  get vulnerable () {
    return this._getCurrentFormValue('vulnerable')
  }

  /**
   * Sets vulnerable cells on all forms.
   *
   * Synchronizes vulnerable cell definitions across all transformation forms.
   * Skips if newVulnerable is empty or forms array is missing.
   *
   * @param {Array} newVulnerable - New vulnerable cells
   * @returns {void}
   */
  set vulnerable (newVulnerable) {
    this._setValueOnAllForms('vulnerable', newVulnerable)
  }

  /**
   * Gets hardened cells from current form.
   *
   * @type {Array}
   * @readonly
   * @returns {Array} Hardened cells array
   */
  get hardened () {
    return this._getCurrentFormValue('hardened')
  }

  /**
   * Sets hardened cells on all forms.
   *
   * Synchronizes hardened cell definitions across all transformation forms.
   * Skips if newHardened is empty or forms array is missing.
   *
   * @param {Array} newHardened - New hardened cells
   * @returns {void}
   */
  set hardened (newHardened) {
    this._setValueOnAllForms('hardened', newHardened)
  }

  /**
   * Gets immune cells from current form.
   *
   * @type {Array}
   * @readonly
   * @returns {Array} Immune cells array
   */
  get immune () {
    return this._getCurrentFormValue('immune')
  }

  /**
   * Sets immune cells on all forms.
   *
   * Synchronizes immune cell definitions across all transformation forms.
   * Skips if newImmune is empty or forms array is missing.
   *
   * @param {Array} newImmune - New immune cells
   * @returns {void}
   */
  set immune (newImmune) {
    this._setValueOnAllForms('immune', newImmune)
  }

  /**
   * Gets description from current form.
   *
   * Delegates to current form's description() method.
   *
   * @returns {string} Ship description from current transformation form
   */
  description () {
    return this._invokeCurrentFormMethod('description')
  }

  /**
   * Gets protection level against weapon from current form.
   *
   * Delegates to current form's protectionAgainst() method.
   *
   * @param {string} weapon - Weapon type code
   * @returns {number} Protection level of current form against the weapon
   */
  protectionAgainst (weapon) {
    return this._invokeCurrentFormMethod('protectionAgainst', weapon)
  }

  /**
   * Attaches weapon to current form.
   *
   * Delegates to current form's attachWeapon() method.
   * Typically called during ship initialization.
   *
   * @param {Function} ammoBuilder - Ammo builder function
   * @returns {Object} Attached weapons result from current form
   */
  attachWeapon (ammoBuilder) {
    return this._invokeCurrentFormMethod('attachWeapon', ammoBuilder)
  }

  /**
   * Gets the transformable variants manager.
   *
   * Provides access to form switching and variant management.
   *
   * @returns {TransformableVariantsType} Variant factory with form/variant operations
   */
  variants () {
    return this.formVariants
  }

  /**
   * Gets all placeable variants.
   *
   * Delegates to formVariants.placeables().
   *
   * @returns {Array} Placeable variant objects for all forms and variants
   */
  placeables () {
    return this.formVariants.placeables()
  }

  /**
   * Gets sunk description from current form.
   *
   * Delegates to current form's sunkDescription() method.
   *
   * @param {string} [middle=' '] - Separator string between status elements
   * @returns {string} Sunk description of current form
   */
  sunkDescription (middle = ' ') {
    return this._invokeCurrentFormMethod('sunkDescription', middle)
  }

  /**
   * Gets ship sunk descriptions from current form.
   *
   * Delegates to current form's shipSunkDescriptions() method.
   *
   * @returns {string} Sunk status descriptions of current form
   */
  shipSunkDescriptions () {
    return this._invokeCurrentFormMethod('shipSunkDescriptions')
  }

  /**
   * Gets transformer type identifier.
   *
   * @returns {string} Type code 'T' indicating this is a Transformer shape
   */
  type () {
    return 'T'
  }
}
