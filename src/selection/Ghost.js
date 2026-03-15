export class Ghost {
  constructor (board, letter, contentBuilder) {
    const el = document.createElement('div')
    el.className = 'ship-ghost'
    this.element = el
    this.letter = letter
    this.contentBuilder = contentBuilder
    contentBuilder(el, board, letter)
    document.body.appendChild(el)
  }
  hide () {
    this.element.style.opacity = 0
  }
  show () {
    this.element.style.opacity = ''
  }
  setVariant (board) {
    if (this.element) {
      this.element.innerHTML = ''
      this.contentBuilder(this.element, board, this.letter)
      //  friendUI.setDragShipContents(this.element, variant, this.letter)
    }
  }
  remove () {
    if (this.element) this.element.remove()
    this.element = null
  }
  moveTo (x, y) {
    if (this.element) {
      this.element.style.left = x + 'px'
      this.element.style.top = y + 'px'
    }
  }
}
