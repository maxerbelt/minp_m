import { Shape } from './Shape.js'
import { TransformableVariants } from '../variants/TransformableVariants.js'

/**
 * Transformer - A shape that can change between multiple forms
 * Extends Shape to provide transformation capabilities between different ship configurations
 * @extends Shape
 */
export class Transformer extends Shape {
  /**
   * Creates a transformer with multiple ship forms
   * @param {Array<Shape>} forms - Array of ship forms this transformer can take
   * @throws {Error} If forms array is empty or invalid
   */
  constructor (forms) {
    if (!forms || forms.length === 0) {
      throw new Error('Transformer must have at least one form')
    }

    super(
      forms[0].letter,
      forms[0].symmetry,
      forms[0].cells,
      'X',
      `place ${forms[0].descriptionText} on the map`,
      forms[0].racks
    )

    this.forms = forms
    this.formVariants = new TransformableVariants(forms)
    this.totalVariants = forms.reduce((acc, f) => acc + f.variants().length, 0)
    this.canTransform = true
  }

  /**
   * Gets the board for a specific variant index
   * @param {number} [index] - Variant index (defaults to current index)
   * @returns {Mask} Board mask for the specified variant
   */
  boardFor (index) {
    const idx = index == null ? this.index : index
    return this.formVariants.boardFor(idx)
  }

  /**
   * Gets the variant for a specific index
   * @param {number} [index] - Variant index (defaults to current index)
   * @returns {Object} Variant object for the specified index
   */
  variant (index) {
    const idx = index == null ? this.index : index
    return this.formVariants.variant(idx)
  }

  /**
   * Gets the current variant index
   * @returns {number} Current variant index
   */
  get index () {
    return this.formVariants.index
  }

  /**
   * Gets the current form index
   * @returns {number} Current form index
   */
  get formsIdx () {
    return this.formVariants.formsIdx
  }

  /**
   * Gets the currently active form
   * @returns {Shape} Currently active ship form
   */
  get currentForm () {
    return this.forms[this.formsIdx]
  }

  /**
   * Gets attached weapons from current form
   * @returns {Object} Attached weapons indexed by coordinate
   */
  get attachedWeapons () {
    return this.currentForm.attachedWeapons
  }

  /**
   * Sets attached weapons on all forms
   * @param {Object} newAttachedWeapons - Weapons to attach
   */
  set attachedWeapons (newAttachedWeapons) {
    this._validateAndSetFormProperty(
      'attachedWeapons',
      newAttachedWeapons,
      (form, value) => {
        form.attachedWeapons = value
      }
    )
  }

  /**
   * Gets weapon system from current form
   * @returns {Object|null} Weapon system or null if not attached
   */
  get weaponSystem () {
    return this.currentForm.weaponSystem
  }

  /**
   * Gets description text from current form
   * @returns {string} Description text
   */
  get descriptionText () {
    return this.currentForm.descriptionText
  }

  /**
   * Gets tip from current form
   * @returns {any} Tip configuration
   */
  get tip () {
    return this.currentForm.tip
  }

  /**
   * Sets tip on all forms
   * @param {any} newTip - New tip value
   */
  set tip (newTip) {
    this._validateAndSetFormProperty('tip', newTip, (form, value) => {
      form.tip = value
    })
  }

  /**
   * Gets displacement from current form
   * @returns {number} Displacement value
   */
  get displacement () {
    return this.currentForm.displacement
  }

  /**
   * Setting displacement is not allowed
   * @param {number} _newDisplacement - Ignored
   */
  set displacement (_newDisplacement) {}

  /**
   * Gets vulnerable cells from current form
   * @returns {Array} Vulnerable cells array
   */
  get vulnerable () {
    return this.currentForm.vulnerable
  }

  /**
   * Sets vulnerable cells on all forms
   * @param {Array} newVulnerable - New vulnerable cells
   */
  set vulnerable (newVulnerable) {
    this._validateAndSetFormProperty(
      'vulnerable',
      newVulnerable,
      (form, value) => {
        form.vulnerable = value
      }
    )
  }

  /**
   * Gets hardened cells from current form
   * @returns {Array} Hardened cells array
   */
  get hardened () {
    return this.currentForm.hardened
  }

  /**
   * Sets hardened cells on all forms
   * @param {Array} newHardened - New hardened cells
   */
  set hardened (newHardened) {
    this._validateAndSetFormProperty('hardened', newHardened, (form, value) => {
      form.hardened = value
    })
  }

  /**
   * Gets immune cells from current form
   * @returns {Array} Immune cells array
   */
  get immune () {
    return this.currentForm.immune
  }

  /**
   * Sets immune cells on all forms
   * @param {Array} newImmune - New immune cells
   */
  set immune (newImmune) {
    this._validateAndSetFormProperty('immune', newImmune, (form, value) => {
      form.immune = value
    })
  }

  /**
   * Gets description from current form
   * @returns {string} Ship description
   */
  description () {
    return this.currentForm.description()
  }

  /**
   * Gets protection level against weapon from current form
   * @param {string} weapon - Weapon type code
   * @returns {number} Protection level
   */
  protectionAgainst (weapon) {
    return this.currentForm.protectionAgainst(weapon)
  }

  /**
   * Attaches weapon to current form
   * @param {Function} ammoBuilder - Ammo builder function
   * @returns {Object} Attached weapons
   */
  attachWeapon (ammoBuilder) {
    return this.currentForm.attachWeapon(ammoBuilder)
  }

  /**
   * Gets transformable variants
   * @returns {TransformableVariants} Variant factory
   */
  variants () {
    return this.formVariants
  }

  /**
   * Gets all placeable variants
   * @returns {Array} Placeable variant objects
   */
  placeables () {
    return this.formVariants.placeables()
  }

  /**
   * Gets sunk description from current form
   * @param {string} [middle=' '] - Separator string
   * @returns {string} Sunk description
   */
  sunkDescription (middle = ' ') {
    return this.currentForm.sunkDescription(middle)
  }

  /**
   * Gets ship sunk descriptions from current form
   * @returns {string} Sunk status descriptions
   */
  shipSunkDescriptions () {
    return this.currentForm.shipSunkDescriptions()
  }

  /**
   * Gets transformer type identifier
   * @returns {string} Type code 'T'
   */
  type () {
    return 'T'
  }

  /**
   * Validates input and sets property on all forms
   * @param {string} propertyName - Name of property being set
   * @param {any} value - Value to set
   * @param {Function} setter - Function to apply value to each form
   * @private
   */
  _validateAndSetFormProperty (propertyName, value, setter) {
    if (
      !value ||
      value.length === 0 ||
      !this.forms ||
      this.forms.length === 0
    ) {
      return
    }

    for (const form of this.forms) {
      setter(form, value)
    }
  }
}
