import { mixed } from '../terrain/terrain.js'
import { Shape } from './Shape.js'
import { TransformableVariants } from '../variants/TransformableVariants.js'
import { Variant3 } from '../variants/Variant3.js'

export class Transformer extends Shape {
  constructor (forms) {
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
  boardFor (index = this.index) {
    return this.formVariants.boardFor(index)
  }
  variant (index = this.index) {
    return this.formVariants.variant(index)
  }
  get index () {
    return this.formVariants.index
  }
  get formsIdx () {
    return this.formVariants.formsIdx
  }
  get currentForm () {
    return this.forms[this.formsIdx]
  }
  get attachedWeapons () {
    return this.currentForm.attachedWeapons
  }
  set attachedWeapons (newAttachedWeapons) {
    if (
      !newAttachedWeapons ||
      newAttachedWeapons.length === 0 ||
      !this.forms ||
      this.forms.length === 0
    )
      return
    let found = false
    for (const form of this.forms) {
      if (!form.attachedWeapons === newAttachedWeapons) {
        found = true
        break
      }
    }
    if (!found) {
      console.warn('Attached weapons do not match any form attached weapons')
    }
  }

  get descriptionText () {
    return this.currentForm.descriptionText
  }
  get tip () {
    return this.currentForm.tip
  }
  set tip (newTip) {
    if (
      !newTip ||
      newTip.length === 0 ||
      !this.forms ||
      this.forms.length === 0
    )
      return
    for (const form of this.forms) {
      form.tip = newTip
    }
  }

  get displacement () {
    return this.currentForm.displacement
  }
  set displacement (_newDisplacement) {}
  get vulnerable () {
    return this.currentForm.vulnerable
  }
  set vulnerable (newVulnerable) {
    if (
      !newVulnerable ||
      newVulnerable.length === 0 ||
      !this.forms ||
      this.forms.length === 0
    )
      return
    for (const form of this.forms) {
      form.vulnerable = newVulnerable
    }
  }
  get hardened () {
    return this.currentForm.hardened
  }
  set hardened (newHardened) {
    if (
      !newHardened ||
      newHardened.length === 0 ||
      !this.forms ||
      this.forms.length === 0
    )
      return
    for (const form of this.forms) {
      form.hardened = newHardened
    }
  }
  get immune () {
    return this.currentForm.immune
  }
  set immune (newImmune) {
    if (
      !newImmune ||
      newImmune.length === 0 ||
      !this.forms ||
      this.forms.length === 0
    )
      return
    for (const form of this.forms) {
      form.immune = newImmune
    }
  }
  description () {
    return this.currentForm.description()
  }

  protectionAgainst (weapon) {
    const form = this.currentForm
    return form.protectionAgainst(weapon)
  }
  attachWeapon (ammoBuilder) {
    return this.currentForm.attachWeapon(ammoBuilder)
  }
  variants () {
    return this.formVariants
  }

  placeables () {
    return this.formVariants.placeables()
  }
  sunkDescription (middle = ' ') {
    return this.currentForm.sunkDescription(middle)
  }
  shipSunkDescriptions () {
    return this.currentForm.shipSunkDescriptions()
  }
  type () {
    return 'T'
  }
}

export class Hybrid extends Shape {
  constructor (description, letter, symmetry, cells, subGroups, tip, racks) {
    super(
      letter,
      symmetry,
      cells,
      'X',
      tip || `place ${description} so that the parts are in the correct area`,
      racks
    )
    this.primary = subGroups[0]
    this.secondary = subGroups[1]

    if (this.secondary) {
      this.primary.setBoardFromSecondary(this.board, this.secondary.board)
      this.board.addLayers([this.secondary.board])
    }
    this.subGroups = subGroups

    for (const group of subGroups) {
      group.faction = group.board.occupancy / this.size
    }
    this.descriptionText = description
    // this.terrain = seaAndLand
    this.subterrain = mixed
    this.canBeOn = Function.prototype
  }
  displacementFor (subterrain) {
    const groups = this.subGroups.filter(g => g.subterrain === subterrain)
    const result = groups.reduce(
      (accumulator, group) => accumulator + group.faction * this.displacement,
      0
    )
    return result
  }
  variants () {
    return new Variant3(
      this.board,
      [this.primary, this.secondary],
      this.symmetry
    )
  }
  type () {
    return 'M'
  }
  sunkDescription () {
    return 'Destroyed'
  }
  description () {
    return this.descriptionText
  }
}
