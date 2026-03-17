export class SelectedShip {
  constructor (ship, variantIndex, contentBuilder) {
    this.ship = ship
    this.contentBuilder = contentBuilder
    const shape = ship.shape()
    this.shape = shape
    this.type = shape.type()
    this.id = ship.id
    this.letter = ship.letter
    this.variants = shape.variants()
    this.variants.index = variantIndex
  }
  canFlip () {
    return this.variants.canFlip
  }
  canRotate () {
    return this.variants.canRotate
  }
  canTransform () {
    return this.variants.canTransform
  }
  placeable () {
    return this.variants.placeable()
  }
  variant () {
    return this.variants.variant()
  }
  board () {
    return this.variants.boardFor()
  }
  special () {
    return this.variants.special()
  }
  rotate () {
    return this.variants.rotate()
  }

  leftRotate () {
    return this.variants.leftRotate()
  }
  flip () {
    return this.variants.flip()
  }
  nextForm () {
    return this.variants.nextForm()
  }
}
