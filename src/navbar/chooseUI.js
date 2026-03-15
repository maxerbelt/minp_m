export class ChooseUI {
  constructor (targetId) {
    if (new.target === ChooseUI) {
      throw new Error(
        'base class cannot be instantiated directly. Please extend it.'
      )
    }
    this.choose = document.getElementById(targetId)
  }

  addOption (id, choice, defaultIndex, defaultText) {
    let option = document.createElement('option')
    option.value = id
    option.textContent = choice
    this.choose.appendChild(option)
    if (id === defaultIndex || choice === defaultText) {
      option.selected = 'selected'
    }
  }
  empty () {
    this.choose.length = 0
  }
  numOptions () {
    return this.choose?.options?.length || 0
  }
  setup (callback, selectedId, selectedText) {
    const numOptions = this.numOptions()
    if (numOptions > 0) {
      this.resetOptions(selectedId, selectedText)
      return
    }
    this.setOptions(selectedId, selectedText)
    this.onChange(callback)
  }

  resetOptions (selectedId, selectedText) {
    this.empty()
    this.setOptions(selectedId, selectedText)
  }
  setOptions (_selectedId, _selectedText) {}
  onChange (callback) {
    this.choose.addEventListener('change', function () {
      const index = this.value
      const text = this.options[this.selectedIndex].textContent
      callback(index, text)
    })
  }
}

export class ChooseFromListUI extends ChooseUI {
  constructor (list, targetId) {
    super(targetId)
    this.list = list
  }

  setOptions (selectedId, selectedText) {
    let id = 0
    this.list.forEach(choice => {
      this.addOption(id, choice, selectedId, selectedText)
      id++
    })
  }
}

export class ChooseNumberUI extends ChooseUI {
  constructor (min, max, step, targetId) {
    super(targetId)
    this.min = min
    this.max = max
    this.step = step
  }

  setOptions (defaultIndex, _text) {
    if (defaultIndex === undefined) defaultIndex = this.min
    for (let i = this.min; i <= this.max; i += this.step) {
      this.addOption(i, i, defaultIndex, defaultIndex)
    }
  }
}
