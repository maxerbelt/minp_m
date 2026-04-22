import { errorMsg } from '../core/errorMsg.js'
import { mixed } from '../terrains/all/js/terrain.js'
import { Variant3 } from '../variants/Variant3.js'
import { Shape } from './Shape.js'

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

    const width = this.board.width
    const height = this.board.height
    let layers = []
    const [head, ...tail] = subGroups
    for (const subGroup of tail) {
      this.fixSpecialGroup(subGroup, width, height, head, layers)
    }
    if (layers.length > 0) {
      this.board.addLayers(layers)
    }
    this.fixSubGroup(head, width, height)
    this.primary = head
    this.secondary = tail[0]
    this.subGroups = subGroups
    this.descriptionText = description
    // this.terrain = seaAndLand
    this.subterrain = mixed
    this.canBeOn = subterrain => true
  }
  fixSpecialGroup (subGroup, width, height, head, layers) {
    this.fixSubGroup(subGroup, width, height)
    head.setBoardFromSecondary(this.board, subGroup.board)
    layers.push(subGroup.board)
  }
  fixSubGroup (subGroup, width, height) {
    if (subGroup.board.width !== width || subGroup.board.height !== height) {
      if (typeof subGroup?.board?.expand !== 'function') {
        console.warn(
          'Subgroup board does not have an expand method:',
          subGroup.board
        )
        throw new Error(
          errorMsg('Subgroup board must have an expand method', subGroup.board)
        )
      }
      subGroup.board = subGroup.board.expand(width, height)
    }
    subGroup.faction = subGroup.board.occupancy / this.area
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
    if (this._variants) return this._variants
    this._variants = new Variant3(
      this.board,
      [this.primary, this.secondary],
      this.symmetry
    )
    return this._variants
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
