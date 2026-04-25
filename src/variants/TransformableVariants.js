import { Random } from '../core/Random.js'
import { CellsToBePlaced } from './CellsToBePlaced.js'
import { Variants } from './variants.js'

/**
 * Variant class that combines multiple forms of variants.
 */
export class TransformableVariants extends Variants {
  /**
   * Creates a transformable variants instance.
   * @param {any[]} forms - The forms to combine.
   */
  constructor (forms) {
    super(forms[0].validator, forms[0].zoneDetail, forms[0].symmetry)

    this.canRotate = forms[0].canRotate
    this.canFlip = forms[0].canFlip
    this.forms = forms
    this.formsIdx = 0
    this.index = 0
    this.canTransform = true
    this.totalVariants = forms.reduce((acc, f) => acc + f.numVariants(), 0)
    this.currentForm = forms[this.index]
  }

  /**
   * Gets the total number of variants across all forms.
   * @returns {number} The total variants.
   */
  numVariants () {
    return this.totalVariants
  }

  /**
   * Calculates the form and variant index for a given global index.
   * @param {number} index - The global index.
   * @returns {{formIndex: number, variantIndex: number}} The position.
   */
  positionInForms (index) {
    const idx = (index || this.index) % this.totalVariants
    let count = 0
    for (let i = 0; i < this.forms.length; i++) {
      const formVariants = this.forms[i].numVariants()
      if (idx < count + formVariants) {
        return { formIndex: i, variantIndex: idx - count }
      }
      count += formVariants
    }
    throw new Error('Index out of bounds')
  }

  /**
   * Calculates the global index from current form and variant.
   * @returns {number} The global index.
   */
  indexFromForms () {
    const form = this.currentForm
    const formIndex = this.forms.indexOf(form)
    let idx = 0
    for (let i = 0; i < formIndex; i++) {
      idx += this.forms[i].numVariants()
    }
    idx += form.index || 0
    return idx
  }

  /**
   * Gets the variant coordinates at the index.
   * @param {number} index - The global index.
   * @returns {any} The coordinates.
   */
  variant (index) {
    const { formIndex, variantIndex } = this.positionInForms(index)
    return this.forms[formIndex].variants().variant(variantIndex)
  }

  /**
   * Gets the board at the index.
   * @param {number} index - The global index.
   * @returns {any} The board.
   */
  boardFor (index) {
    const { formIndex, variantIndex } = this.positionInForms(index)
    return this.forms[formIndex].variants().boardFor(variantIndex)
  }

  /**
   * Generator for all boards.
   * @returns {Generator<any>} The boards.
   */
  *boards () {
    for (const form of this.forms) {
      for (let i = 0; i < form.numVariants(); i++) {
        yield form.variants().boardFor(i)
      }
    }
  }

  /**
   * Gets the minimum size across forms.
   * @returns {number} The min size.
   */
  get minSize () {
    return Math.min(...this.forms.map(f => f.variants().minSize))
  }

  /**
   * Gets the maximum size across forms.
   * @returns {number} The max size.
   */
  get maxSize () {
    return Math.max(...this.forms.map(f => f.variants().maxSize))
  }

  /**
   * Creates a placeable at the index.
   * @param {number} index - The global index.
   * @returns {any} The placeable.
   */
  placeable (index) {
    const { formIndex, variantIndex } = this.positionInForms(index)
    return this.forms[formIndex].variants().placeable(variantIndex)
  }

  /**
   * Gets all variations and forms.
   * @returns {any[]} The variations.
   */
  allVariationsAndForms () {
    return this.forms.flatMap(f => f.variants().list.map(v => [f, v]))
  }

  /**
   * Gets shuffled variations and forms.
   * @returns {any[]} The shuffled variations.
   */
  variationsAndForms () {
    let variants0 = this.allVariationsAndForms()
    return Random.shuffleArray(variants0)
  }

  /**
   * Gets all variations.
   * @returns {any[]} The variations.
   */
  variations () {
    return this.allVariationsAndForms().map(vf => vf[1])
  }

  /**
   * Gets all placeables.
   * @returns {any[]} The placeables.
   */
  allPlaceables () {
    return this.forms.flatMap(f => f.variants().placeables())
  }

  /**
   * Gets shuffled placeables.
   * @returns {any[]} The shuffled placeables.
   */
  placeables () {
    let p0 = this.allPlaceables()
    return Random.shuffleArray(p0)
  }

  /**
   * Normalizes all variations.
   * @returns {any[]} The normalized variations.
   */
  normalize () {
    return this.allVariationsAndForms().map(v => v[1].normalize())
  }

  /**
   * Gets the maximum height.
   * @returns {number} The height.
   */
  height () {
    return Math.max(...this.forms.map(f => f.variants().height()))
  }

  /**
   * Gets the maximum width.
   * @returns {number} The width.
   */
  width () {
    return Math.max(...this.forms.map(f => f.variants().width()))
  }

  /**
   * Sets the active index.
   * @param {number} index - The index to set.
   */
  setByIndex (index) {
    const idx = index == null ? this.index : index
    const { formIndex, variantIndex } = this.positionInForms(idx)
    this.currentForm = this.forms[formIndex]
    this.currentForm.setByIndex(variantIndex)
    this.index = idx
    this.onChange()
  }

  /**
   * Creates a placement helper.
   * @param {number} r - Row.
   * @param {number} c - Column.
   * @returns {CellsToBePlaced} The placement.
   */
  placingAt (r, c) {
    return new CellsToBePlaced(this.board(), r, c, this.currentForm.validator)
  }

  /**
   * Switches to the next form.
   */
  nextForm () {
    const old = this.index
    this.formsIdx = (this.formsIdx + 1) % this.forms.length
    this.currentForm = this.forms[this.formsIdx]

    if (this.currentForm.numVariants() > 1) {
      this.currentForm.setByIndex(0)
    }
    this.index = this.indexFromForms()
    if (old !== this.index) this.onChange()
  }

  /**
   * Performs a transformation if allowed.
   * @param {Function} action - The transformation action.
   * @param {boolean} canDo - Whether the transformation is allowed.
   * @private
   */
  _performTransformation (action, canDo) {
    if (!canDo) return
    const old = this.index
    action.call(this.currentForm)
    this.index = this.indexFromForms()
    if (old !== this.index) this.onChange()
  }

  /**
   * Rotates the current form.
   */
  rotate () {
    this._performTransformation(this.currentForm.rotate, this.canRotate)
  }

  /**
   * Flips the current form.
   */
  flip () {
    this._performTransformation(this.currentForm.flip, this.canFlip)
  }

  /**
   * Left rotates the current form.
   */
  leftRotate () {
    this._performTransformation(this.currentForm.leftRotate, this.canRotate)
  }
}
