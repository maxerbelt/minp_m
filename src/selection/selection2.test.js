
import { Ghost } from './Ghost.js'
import { Brush } from './Brush.js'
import {
  describe,
  beforeAll,
  jest,
  it,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals'

/**
 * @jest-environment jsdom
 */

describe('selection Ghost', () => {
  let originalBody

  beforeEach(() => {
    // ensure a clean document body
    originalBody = document.body.innerHTML
  })

  afterEach(() => {
    document.body.innerHTML = originalBody
  })

  it('constructor should append element to document.body and set properties', () => {
    const contentBuilder = jest.fn((el, variant, letter) => {
      el.innerHTML = `${variant}-${letter}`
    })

    const g = new Ghost('v1', 'A', contentBuilder)
    expect(document.body.contains(g.element)).toBe(true)
    expect(g.letter).toBe('A')
    expect(g.element.className).toBe('ship-ghost')
    expect(g.element.innerHTML).toBe('v1-A')

    // cleanup
    g.remove()
  })

  it('hide and show should change opacity', () => {
    const contentBuilder = jest.fn(() => {})
    const g = new Ghost('v', 'B', contentBuilder, null)

    g.hide()
    expect(g.element.style.opacity).toBe('0')

    g.show()
    expect(g.element.style.opacity).toBe('')

    g.remove()
  })

  it('moveTo should set left and top styles', () => {
    const contentBuilder = jest.fn(() => {})
    const g = new Ghost('v', 'C', contentBuilder, null)

    g.moveTo(10, 20)
    expect(g.element.style.left).toBe('10px')
    expect(g.element.style.top).toBe('20px')

    g.remove()
  })

  it('setVariant should replace innerHTML using contentBuilder', () => {
    const contentBuilder = jest.fn((el, variant, letter) => {
      el.innerHTML = `variant:${variant},letter:${letter}`
    })
    const g = new Ghost('v1', 'D', contentBuilder, null)
    // replace contents
    g.setVariant('v2')
    expect(g.element.innerHTML).toBe('variant:v2,letter:D')

    g.remove()
  })

  it('remove should remove element and null it out', () => {
    const contentBuilder = jest.fn(() => {})
    const g = new Ghost('v', 'E', contentBuilder, null)
    const el = g.element
    g.remove()
    expect(document.body.contains(el)).toBe(false)
    expect(g.element).toBeNull()
  })
})

describe('Brush', () => {
  it('toObject returns size and subterrain', () => {
    const b = new Brush(3, 'water')
    expect(b.toObject()).toEqual({ size: 3, subterrain: 'water' })
  })
})
