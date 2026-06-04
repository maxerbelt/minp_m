import { Ghost } from './Ghost.js'
import { Brush } from './Brush.js'
import {
  describe,
  jest,
  it,
  expect,
  beforeEach,
  afterEach
} from '@jest/globals'

describe('selection Ghost', () => {
  /** @type {string} */
  let originalBody

  beforeEach(() => {
    // ensure a clean document body
    originalBody = document.body.innerHTML
  })

  afterEach(() => {
    document.body.innerHTML = originalBody
  })

  it('constructor should append element to document.body and set properties', () => {
    const contentBuilder = jest.fn((el, board, letter) => {
      const variant = typeof board === 'object' ? board.variant : board
      el.innerHTML = `${variant}-${letter}`
    })

    const board = { variant: 'v1' }
    const g = new Ghost(board, 'A', contentBuilder)
    expect(document.body.contains(g.element)).toBe(true)
    expect(g.element.className).toBe('ship-ghost')
    expect(g.element.innerHTML).toBe('v1-A')
    expect(contentBuilder).toHaveBeenCalledWith(g.element, board, 'A')

    // cleanup
    g.remove()
  })

  it('hide and show should change opacity', () => {
    const contentBuilder = jest.fn(() => {})
    const g = new Ghost({}, 'B', contentBuilder)

    g.hide()
    expect(g.element.style.opacity).toBe('0')

    g.show()
    expect(g.element.style.opacity).toBe('')

    g.remove()
  })

  it('moveTo should set left and top styles', () => {
    const contentBuilder = jest.fn(() => {})
    const g = new Ghost({}, 'C', contentBuilder)

    g.moveTo(10, 20)
    expect(g.element.style.left).toBe('10px')
    expect(g.element.style.top).toBe('20px')

    g.remove()
  })

  it('setVariant should replace innerHTML using contentBuilder', () => {
    const contentBuilder = jest.fn((el, board, letter) => {
      const variant = typeof board === 'object' ? board.variant : board
      el.innerHTML = `variant:${variant},letter:${letter}`
    })
    const initialBoard = { variant: 'v1' }
    const g = new Ghost(initialBoard, 'D', contentBuilder)
    // replace contents
    const newBoard = { variant: 'v2' }
    g.setVariant(newBoard)
    expect(g.element.innerHTML).toBe('variant:v2,letter:D')

    g.remove()
  })

  it('remove should remove element and null it out', () => {
    const contentBuilder = jest.fn(() => {})
    const g = new Ghost({}, 'E', contentBuilder)
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
