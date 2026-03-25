import { shuffleArray } from '../utilities.js'
import { CellsToBePlaced } from './CellsToBePlaced.js'
import { normalize } from './normalize.js'
import { Variants } from './variants.js'

export class TransformableVariants extends Variants {
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
  numVariants () {
    return this.totalVariants
  }

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

  variant (index) {
    const { formIndex, variantIndex } = this.positionInForms(index)
    return this.forms[formIndex].variants().variant(variantIndex)
  }
  boardFor (index) {
    const { formIndex, variantIndex } = this.positionInForms(index)
    return this.forms[formIndex].variants().boardFor(variantIndex)
  }
  *boards () {
    for (const form of this.forms) {
      for (let i = 0; i < form.numVariants(); i++) {
        yield form.variants().boardFor(i)
      }
    }
  }
  get minSize () {
    return Math.min(...this.forms.map(f => f.variants().minSize))
  }
  get maxSize () {
    return Math.max(...this.forms.map(f => f.variants().maxSize))
  }

  placeable (index) {
    const { formIndex, variantIndex } = this.positionInForms(index)
    return this.forms[formIndex].variants().placeable(variantIndex)
  }

  allVariationsAndForms () {
    return this.forms.flatMap(f => f.variants().list.map(v => [f, v]))
  }
  variationsAndForms () {
    let variants0 = this.allVariationsAndForms()
    return shuffleArray(variants0)
  }
  variations () {
    return this.allVariationsAndForms().map(vf => vf[1])
  }
  allPlaceables () {
    return this.forms.flatMap(f => f.variants().placeables())
  }
  placeables () {
    let p0 = this.allPlaceables()
    return shuffleArray(p0)
  }
  normalize () {
    return this.allVariationsAndForms().map(v => v[1].normalize())
  }

  height () {
    return Math.max(...this.forms.map(f => f.variants().height()))
  }
  width () {
    return Math.max(...this.forms.map(f => f.variants().width()))
  }

  setByIndex (index = this.index) {
    const { formIndex, variantIndex } = this.positionInForms(index)
    this.currentForm = this.forms[formIndex]
    this.currentForm.setByIndex(variantIndex)
    this.index = index
    this.onChange()
  }

  placingAt (r, c) {
    return new CellsToBePlaced(this.board(), r, c, this.currentForm.validator)
  }

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

  rotate () {
    if (!this.canRotate) return
    const old = this.index
    this.currentForm.rotate()
    this.index = this.indexFromForms()
    if (old !== this.index) this.onChange()
  }
  flip () {
    if (!this.canFlip) return
    const old = this.index
    this.currentForm.flip()
    this.index = this.indexFromForms()
    if (old !== this.index) this.onChange()
  }
  leftRotate () {
    if (!this.canRotate) return
    const old = this.index
    this.currentForm.leftRotate()
    this.index = this.indexFromForms()
    if (old !== this.index) this.onChange()
  }
}
