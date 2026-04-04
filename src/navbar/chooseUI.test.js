/* eslint-env jest */
/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals'
/* global describe, it, expect, beforeEach, afterEach */

import { ChooseFromListUI, ChooseNumberUI } from './chooseUI.js'

function createMockDocument () {
  const elements = new Map()
  const makeSelect = id => {
    const el = {
      id,
      tagName: 'SELECT',
      options: [],
      selectedIndex: 0,
      value: '',
      addEventListener (name, fn) {
        this._handler = fn
      },
      dispatchEvent (ev) {
        if (this._handler) this._handler.call(this, ev)
      },
      appendChild (child) {
        this.options.push(child)
      }
    }
    elements.set(id, el)
    return el
  }

  return {
    body: {
      innerHTML: '',
      appendChild: el => elements.set(el.id || 'el' + elements.size, el)
    },
    getElementById: id => elements.get(id) || null,
    createElement: tag => {
      if (tag.toLowerCase() === 'option') {
        return { tagName: 'OPTION', value: '', textContent: '' }
      }
      if (tag.toLowerCase() === 'select') {
        return makeSelect('select' + elements.size)
      }
      return { tagName: tag.toUpperCase() }
    }
  }
}

describe('ChooseUI subclasses', () => {
  let createdMock = false
  beforeEach(() => {
    if (typeof document === 'undefined') {
      globalThis.document = createMockDocument()
      createdMock = true
    }
    const sel = document.createElement('select')
    sel.id = 'it-select'
    document.body.appendChild(sel)
  })
  afterEach(() => {
    if (createdMock) {
      delete globalThis.document
      createdMock = false
    }
  })

  it('ChooseFromListUI populates options and triggers change callback', () => {
    const selectId = 'it-select'
    const list = ['alpha', 'beta', 'gamma']
    const ui = new ChooseFromListUI(list, selectId)

    const cb = jest.fn()
    ui.setup(cb)

    expect(ui.numOptions()).toBe(3)
    // simulate selecting second option
    const sel = document.getElementById(selectId)
    sel.selectedIndex = 1
    sel.value = '1'
    sel.dispatchEvent(new Event('change'))

    expect(cb).toHaveBeenCalledWith('1', 'beta')
  })

  it('ChooseNumberUI creates numeric range and respects default', () => {
    const ui = new ChooseNumberUI(1, 3, 1, 'it-select')
    ui.setup(() => {})
    const sel = document.getElementById('it-select')
    expect(sel.options.length).toBe(3)
    // default selection should be first (value '1') when no default provided
    expect(String(sel.options[0].value)).toBe('1')
  })
})
