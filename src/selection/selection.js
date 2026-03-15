import { SelectedShip } from './SelectedShip.js'

export class ClickedShip extends SelectedShip {
  constructor (ship, source, variantIndex, contentBuilder) {
    super(ship, variantIndex, contentBuilder)
    this.source = source
    this.variants.onChange = () => {
      const board = this.variants.boardFor()
      if (this.source) {
        this.source.innerHTML = ''
        this.contentBuilder(this.source, board, this.letter)
        this.source.dataset.variant = this.variants.index
      }
    }
  }
}
