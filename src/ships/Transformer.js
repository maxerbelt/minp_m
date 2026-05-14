import { Shape } from './Shape.js'
import { TransformableVariants } from '../variants/TransformableVariants.js'

/**
 * @typedef {import('./Shape.js').Shape} ShapeType
 * @typedef {import('../variants/TransformableVariants.js').TransformableVariants} TransformableVariantsType
 * @typedef {import('../grid/rectangle/mask.js').Mask} Mask
 */

/**
 * Transformer - A shape that can change between multiple forms.
 * Extends Shape to provide transformation capabilities between different ship configurations.
 * @extends Shape
 */
export class Transformer extends Shape {
  /**
   * Creates a transformer with multiple ship forms.
   * @param {Array<ShapeType>} forms - Array of ship forms this transformer can take.
   * @throws {Error} If forms array is empty or invalid.
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
   * Validates the forms array.
   * @param {Array<ShapeType>} forms - Candidate form list.
   * @returns {Array<ShapeType>} The validated forms list.
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
   * @param {ShapeType} form - The first form in the transformer.
   * @returns {string} Tip text for placement guidance.
   * @private
   */
  static _buildDefaultTip (form) {
    return `place ${form.descriptionText} on the map`
  }

  /**
   * Calculates the total number of variants across all forms.
   * @param {Array<ShapeType>} forms - Transformer forms.
   * @returns {number} Total variant count.
   * @private
   */
  static _countTotalVariants (forms) {
    return forms.reduce((count, form) => count + form.variants().length, 0)
  }

  /**
   * Resolves a provided index to the current variant index if omitted.
   * @param {number} [index] - Optional requested index.
   * @returns {number} Resolved variant index.
   * @private
   */
  _resolveIndex (index) {
    return index == null ? this.index : index
  }

  /**
   * Gets the value of a property from the current form.
   * @param {string} property - Property name.
   * @returns {any} Current form property value.
   * @private
   */
  _getCurrentFormValue (property) {
    return this.currentForm[property]
  }

  /**
   * Calls a method on the current form.
   * @param {string} method - Method name.
   * @param {...any} args - Arguments for the method.
   * @returns {any} Result of the method call.
   * @private
   */
  _invokeCurrentFormMethod (method, ...args) {
    return this.currentForm[method](...args)
  }

  /**
   * Checks whether a value should be treated as empty for mutation operations.
   * @param {any} value - Value to check.
   * @returns {boolean} True when value is null, undefined, or empty.
   * @private
   */
  _isEmptyValue (value) {
    return value == null || value.length === 0
  }

  /**
   * Sets the same property value on every form.
   * @param {string} property - Property name.
   * @param {any} value - Value to set.
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
   * @param {number} [index] - Variant index (defaults to current index).
   * @returns {Mask} Board mask for the specified variant.
   */
  boardFor (index) {
    return this.formVariants.boardFor(this._resolveIndex(index))
  }

  /**
   * Gets the variant for a specific index.
   * @param {number} [index] - Variant index (defaults to current index).
   * @returns {Object} Variant object for the specified index.
   */
  variant (index) {
    return this.formVariants.variant(this._resolveIndex(index))
  }

  /**
   * Gets the current variant index.
   * @returns {number} Current variant index.
   */
  get index () {
    return this.formVariants.index
  }

  /**
   * Gets the current form index.
   * @returns {number} Current form index.
   */
  get formsIdx () {
    return this.formVariants.formsIdx
  }

  /**
   * Gets the currently active form.
   * @returns {ShapeType} Currently active ship form.
   */
  get currentForm () {
    return this.forms[this.formsIdx]
  }

  /**
   * Gets attached weapons from current form.
   * @returns {Object} Attached weapons indexed by coordinate.
   */
  get attachedWeapons () {
    return this._getCurrentFormValue('attachedWeapons')
  }

  /**
   * Sets attached weapons on all forms.
   * @param {Object} newAttachedWeapons - Weapons to attach.
   */
  set attachedWeapons (newAttachedWeapons) {
    this._setValueOnAllForms('attachedWeapons', newAttachedWeapons)
  }

  /**
   * Gets weapon system from current form.
   * @returns {Object|null} Weapon system or null if not attached.
   */
  get weaponSystem () {
    return this._getCurrentFormValue('weaponSystem')
  }

  /**
   * Gets description text from current form.
   * @returns {string} Description text.
   */
  get descriptionText () {
    return this._getCurrentFormValue('descriptionText')
  }

  /**
   * Gets tip from current form.
   * @returns {any} Tip configuration.
   */
  get tip () {
    return this._getCurrentFormValue('tip')
  }

  /**
   * Sets tip on all forms.
   * @param {any} newTip - New tip value.
   */
  set tip (newTip) {
    this._setValueOnAllForms('tip', newTip)
  }

  /**
   * Gets displacement from current form.
   * @returns {number} Displacement value.
   */
  get displacement () {
    return this._getCurrentFormValue('displacement')
  }

  /**
   * Setting displacement is not allowed.
   * @param {number} _newDisplacement - Ignored.
   */
  set displacement (_newDisplacement) {}

  /**
   * Gets vulnerable cells from current form.
   * @returns {Array} Vulnerable cells array.
   */
  get vulnerable () {
    return this._getCurrentFormValue('vulnerable')
  }

  /**
   * Sets vulnerable cells on all forms.
   * @param {Array} newVulnerable - New vulnerable cells.
   */
  set vulnerable (newVulnerable) {
    this._setValueOnAllForms('vulnerable', newVulnerable)
  }

  /**
   * Gets hardened cells from current form.
   * @returns {Array} Hardened cells array.
   */
  get hardened () {
    return this._getCurrentFormValue('hardened')
  }

  /**
   * Sets hardened cells on all forms.
   * @param {Array} newHardened - New hardened cells.
   */
  set hardened (newHardened) {
    this._setValueOnAllForms('hardened', newHardened)
  }

  /**
   * Gets immune cells from current form.
   * @returns {Array} Immune cells array.
   */
  get immune () {
    return this._getCurrentFormValue('immune')
  }

  /**
   * Sets immune cells on all forms.
   * @param {Array} newImmune - New immune cells.
   */
  set immune (newImmune) {
    this._setValueOnAllForms('immune', newImmune)
  }

  /**
   * Gets description from current form.
   * @returns {string} Ship description.
   */
  description () {
    return this._invokeCurrentFormMethod('description')
  }

  /**
   * Gets protection level against weapon from current form.
   * @param {string} weapon - Weapon type code.
   * @returns {number} Protection level.
   */
  protectionAgainst (weapon) {
    return this._invokeCurrentFormMethod('protectionAgainst', weapon)
  }

  /**
   * Attaches weapon to current form.
   * @param {Function} ammoBuilder - Ammo builder function.
   * @returns {Object} Attached weapons.
   */
  attachWeapon (ammoBuilder) {
    return this._invokeCurrentFormMethod('attachWeapon', ammoBuilder)
  }

  /**
   * Gets transformable variants.
   * @returns {TransformableVariantsType} Variant factory.
   */
  variants () {
    return this.formVariants
  }

  /**
   * Gets all placeable variants.
   * @returns {Array} Placeable variant objects.
   */
  placeables () {
    return this.formVariants.placeables()
  }

  /**
   * Gets sunk description from current form.
   * @param {string} [middle=' '] - Separator string.
   * @returns {string} Sunk description.
   */
  sunkDescription (middle = ' ') {
    return this._invokeCurrentFormMethod('sunkDescription', middle)
  }

  /**
   * Gets ship sunk descriptions from current form.
   * @returns {string} Sunk status descriptions.
   */
  shipSunkDescriptions () {
    return this._invokeCurrentFormMethod('shipSunkDescriptions')
  }

  /**
   * Gets transformer type identifier.
   * @returns {string} Type code 'T'.
   */
  type () {
    return 'T'
  }
}
