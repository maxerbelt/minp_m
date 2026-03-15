import { jest } from '@jest/globals'

// Mock MaskHex and ActionsHex BEFORE importing hex.js
jest.unstable_mockModule('./grid/maskHex.js', () => {
  class MaskHex {
    constructor (radius) {
      this.radius = radius
      this.bits = 0n
      this.actions = {
        transformMaps: { id: null, r120: 'R', r240: 'R2', f0: 'F' },
        template: 'T',
        applyMap: map => map || 'T'
      }
      this.indexer = {
        size: 19,
        location: i => [Math.floor(i / 3), (i % 3) - 1, -Math.floor(i / 3)],
        coords: [
          [0, 0, 0],
          [1, -1, 0],
          [0, 1, -1],
          [-1, 0, 1],
          [1, 0, -1],
          [0, -1, 1],
          [-1, 1, 0],
          [2, -1, -1],
          [1, 1, -2],
          [-1, 2, -1],
          [2, -2, 0],
          [-1, -1, 2],
          [0, 2, -2],
          [-2, 0, 2],
          [-2, 1, 1],
          [2, 0, -2],
          [0, -2, 2],
          [-2, 2, 0],
          [1, -2, 1]
        ]
      }
    }
    setBitsFromCoords (coords) {
      this.bits = 0n
    }
    fromCoords (coords) {
      this.bits = 0n
    }
    get clone () {
      const o = { bits: this.bits }
      o.dilate = function () {
        this.bits = 'd'
      }
      o.erode = function () {
        this.bits = 'e'
      }
      o.dilateCross = function () {
        this.bits = 'c'
      }
      return o
    }
    dilate () {
      this.bits = 'd'
    }
    erode () {
      this.bits = 'e'
    }
    dilateCross () {
      this.bits = 'c'
    }
  }
  return { MaskHex }
})

jest.unstable_mockModule('./grid/actionHex.js', () => {
  return {
    ActionHex: {
      D3_LABELS: ['id', 'r120', 'r240', 'f0', 'f1', 'f2']
    }
  }
})

// minimal canvas stub
const fakeCanvas = {
  getContext: () => ({
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {}
  }),
  addEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 })
}

const elementStore = {}
function makeButton (id) {
  const btn = { disabled: false, listeners: {} }
  btn.addEventListener = jest.fn((evt, cb) => {
    btn.listeners[evt] = cb
  })
  elementStore[id] = btn
  return btn
}

function setupDOMStubs () {
  // stub querySelectorAll return dummy flip buttons
  document.querySelectorAll = jest.fn(() => [])

  document.createElement = jest.fn(() => {
    const btn = {
      disabled: false,
      dataset: {},
      addEventListener: jest.fn(() => {}),
      textContent: ''
    }
    return btn
  })

  document.getElementById = jest.fn(id => {
    if (id === 'c') return fakeCanvas
    return elementStore[id] || null
  })
}

let computeHexMorph, hexDraw, updateButtons, setMorphologyButtons

describe('hex.js morphology buttons', () => {
  let rotateBtn, dilateBtn, erodeBtn
  beforeEach(async () => {
    jest.resetModules()

    // Setup DOM stubs BEFORE importing hex.js (after resetModules)
    setupDOMStubs()
    rotateBtn = makeButton('rotateBtn')
    dilateBtn = makeButton('dilateBtn')
    erodeBtn = makeButton('erodeBtn')

    // dynamically import hex.js after DOM stubs are in place
    const hexModule = await import('./hex.js')
    hexDraw = hexModule.hexDraw
    updateButtons = hexModule.updateButtons
    computeHexMorph = hexModule.computeHexMorph
    setMorphologyButtons = hexModule.setMorphologyButtons

    // stub mask and actions
    hexDraw.mask = {
      actions: {
        transformMaps: { id: null, r120: 'R', r240: 'R2', f0: 'F' },
        template: 'T',
        applyMap: map => map || 'T'
      },
      bits: 'orig',
      fromCoords: function (coords) {
        this.bits = 0n
      },
      dilate: function () {
        this.bits = 'd'
      },
      erode: function () {
        this.bits = 'e'
      },
      dilateCross: function () {
        this.bits = 'c'
      },
      get clone () {
        const o = { bits: this.bits }
        o.dilate = function () {
          this.bits = 'd'
        }
        o.erode = function () {
          this.bits = 'e'
        }
        o.dilateCross = function () {
          this.bits = 'c'
        }
        return o
      }
    }
  })

  it('computeHexMorph uses the hex morphology operations', () => {
    expect(hexDraw.mask).toBeDefined()
    expect(computeHexMorph('dilate')).toBe(true)
    expect(computeHexMorph('erode')).toBe(true)
    expect(computeHexMorph('cross')).toBe(true)
    // if bits changed to dilated value then dilate returns false
    hexDraw.mask.bits = 'd'
    expect(computeHexMorph('dilate')).toBe(false)
  })

  it('hex mask operation returns inverted value', () => {
    expect(hexDraw.mask.bits).toBe('orig')
    hexDraw.mask.dilate()
    expect(hexDraw.mask.bits).toBe('d')
    hexDraw.mask.bits = 'orig'
    hexDraw.mask.erode()
    expect(hexDraw.mask.bits).toBe('e')
    hexDraw.mask.bits = 'orig'
    hexDraw.mask.dilateCross()
    expect(hexDraw.mask.bits).toBe('c')
  })

  it('morphology test calls updateButtons and redraw', async () => {
    hexDraw.redraw = jest.fn()
    // Inject test stubs for morphology buttons
    setMorphologyButtons({ dilate: dilateBtn, erode: erodeBtn })
    updateButtons()
    expect(rotateBtn.disabled).toBe(false)
    expect(dilateBtn.disabled).toBe(false)
    expect(erodeBtn.disabled).toBe(false)
    // if mask bits equal after dilate, button disables
    hexDraw.mask.bits = 'd'
    updateButtons()
    expect(dilateBtn.disabled).toBe(true)
  })
})
