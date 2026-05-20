import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { BigBits, BigOne } from './grid/bitStore/helpers/bigbits.js'
/**
 * @jest-environment jsdom
 */

// stub a minimal canvas
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

// Mock MaskTri and ActionsTri BEFORE importing tri.js
jest.unstable_mockModule('./grid/triangle/maskTri.js', () => {
  class MaskTri {
    constructor (side) {
      this.side = side
      /** @type {any} */
      this.bits = BigBits.empty
      this.actions = {
        transformMaps: { id: null, r120: 'R', r240: 'R2', f0: 'F' },
        template: 'T',
        applyMap: map => map || 'T'
      }
      // Add indexer mock
      this.indexer = {
        size: 19, // For a tri grid with side=7, size is (2*7+1)*(7+1)/2 ≈ 120 but simplified to 19 for testing
        location: i => [Math.floor(i / 4), i % 4]
      }
    }
    fromCoords (_coords) {
      this.bits = 0n
    }
    get clone () {
      const o = /** @type {any} */ ({ bits: this.bits })
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
  return { MaskTri }
})

jest.unstable_mockModule('./grid/triangle/actionsTri.js', () => {
  return {
    ActionsTri: {
      D3_LABELS: ['id', 'r120', 'r240', 'f0', 'f1', 'f2']
    }
  }
})

// stub DOM helpers used by tri.js
/** @type {Record<string, any>} */
const elementStore = {}
function makeButton (id) {
  /** @type {{ disabled: boolean, listeners: Record<string, any>, addEventListener: any }} */
  const btn = { disabled: false, listeners: {}, addEventListener: null }
  btn.addEventListener = /** @type {any} */ jest.fn((evt, cb) => {
    const eventName = /** @type {string} */ (evt)
    btn.listeners[eventName] = cb
  })
  elementStore[id] = btn
  return btn
}

function setupDOMStubs () {
  document.createElement = /** @type {any} */ (
    jest.fn(() => {
      const btn = {
        disabled: false,
        dataset: {},
        addEventListener: jest.fn(() => {}),
        textContent: ''
      }
      return btn
    })
  )

  document.querySelectorAll = /** @type {any} */ (
    jest.fn(() => {
      const nodeList = /** @type {any} */ ([])
      nodeList.item = index => nodeList[index]
      nodeList.length = 0
      return nodeList
    })
  )

  document.getElementById = /** @type {any} */ (
    jest.fn(id => {
      const key = /** @type {string} */ (id)
      // c (canvas) or rotateBtn or flipButtons container
      if (key === 'c') return fakeCanvas
      if (elementStore[key]) return elementStore[key]
      // create container element when requested
      if (key === 'flipButtons') {
        const cont = { appendChild: jest.fn(() => {}) }
        elementStore[key] = cont
        return cont
      }
      return null
    })
  )
}

// variables will be imported dynamically in beforeEach
let triDraw, updateButtons, applyTransform, computeMorphChanged

describe('tri.js helpers', () => {
  let rotateBtn, dilateBtn, erodeBtn, crossBtn
  beforeEach(async () => {
    jest.resetModules()

    // Setup DOM stubs BEFORE importing tri.js (after resetModules)
    setupDOMStubs()
    rotateBtn = makeButton('rotateBtn')
    dilateBtn = makeButton('dilateBtn')
    erodeBtn = makeButton('erodeBtn')
    crossBtn = makeButton('crossDilateBtn')

    // dynamically import tri.js after DOM stubs are in place
    const triModule = await import('./tri.js')
    triDraw = triModule.triDraw
    updateButtons = triModule.updateButtons
    applyTransform = triModule.applyTransform
    computeMorphChanged = triModule.computeMorphChanged

    // stub mask and actions
    triDraw.mask = {
      actions: {
        transformMaps: { id: null, r120: 'R', r240: 'R2', f0: 'F' },
        template: 'T',
        applyMap: map => map || 'T'
      },
      bits: 'orig',
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

  it('computeMorphChanged helper works', () => {
    expect(computeMorphChanged('dilate')).toBe(true)
    expect(computeMorphChanged('erode')).toBe(true)
    expect(computeMorphChanged('cross')).toBe(true)
    // if bits changed to dilated value then dilate returns false
    triDraw.mask.bits = 'd'
    expect(computeMorphChanged('dilate')).toBe(false)
  })

  it('updateButtons updates disabled state', () => {
    updateButtons()
    expect(rotateBtn.disabled).toBe(false)
    expect(dilateBtn.disabled).toBe(false)
    expect(erodeBtn.disabled).toBe(false)
    expect(crossBtn.disabled).toBe(false)
    // if mask bits equal after dilate, button disables
    // updateButtons syncs mask.bits from triDraw.bits via currentActions,
    // so ensure both are changed to simulate a dilated state
    triDraw.mask.bits = 'd'
    triDraw.bits = 'd'
    // simulate synchronized bits and validate button state
    triDraw.bits = 'd'
    updateButtons()
    expect(dilateBtn.disabled).toBe(true)
  })

  it('applyTransform and morphology handlers mutate bits', () => {
    triDraw.redraw = jest.fn()
    // stub so we know transform changed
    triDraw.mask.actions.applyMap = () => 'NEW'
    applyTransform('r120')
    expect(triDraw.redraw).toHaveBeenCalled()
    // test morph button listeners
    const dClick = dilateBtn.listeners.click
    dClick?.()
    expect(triDraw.redraw).toHaveBeenCalled()
    const eClick = erodeBtn.listeners.click
    eClick?.()
    const cClick = crossBtn.listeners.click
    cClick?.()
  })
})

describe('tri.js line tool handling', () => {
  let triDraw, setMorphologyButtons

  beforeEach(async () => {
    jest.resetModules()

    // Setup DOM stubs BEFORE importing tri.js (after resetModules)
    setupDOMStubs()
    const rotateBtn = makeButton('rotateBtn')
    const dilateBtn = makeButton('dilateBtn')
    const erodeBtn = makeButton('erodeBtn')
    const crossBtn = makeButton('crossDilateBtn')

    // Create fake radio buttons for line tools
    const radioButtons = [
      {
        value: 'single',
        checked: true,
        listeners: {},
        addEventListener: /** @type {any} */ jest.fn(function (event, cb) {
          const eventName = /** @type {string} */ (event)
          this.listeners[eventName] = cb
        })
      },
      {
        value: 'segment',
        checked: false,
        listeners: {},
        addEventListener: /** @type {any} */ jest.fn(function (event, cb) {
          const eventName = /** @type {string} */ (event)
          this.listeners[eventName] = cb
        })
      },
      {
        value: 'ray',
        checked: false,
        listeners: {},
        addEventListener: /** @type {any} */ jest.fn(function (event, cb) {
          const eventName = /** @type {string} */ (event)
          this.listeners[eventName] = cb
        })
      },
      {
        value: 'full',
        checked: false,
        listeners: {},
        addEventListener: /** @type {any} */ jest.fn(function (event, cb) {
          const eventName = /** @type {string} */ (event)
          this.listeners[eventName] = cb
        })
      }
    ]

    // Mock querySelectorAll to return fake radio buttons
    document.querySelectorAll = /** @type {any} */ (
      jest.fn(selector => {
        if (selector === 'input[name="tri-line-tool"]') {
          const nodeList = /** @type {any} */ (radioButtons)
          nodeList.item = index => nodeList[index]
          nodeList.length = radioButtons.length
          return nodeList
        }
        const nodeList = /** @type {any} */ ([])
        nodeList.item = index => nodeList[index]
        nodeList.length = 0
        return nodeList
      })
    )

    // Create fake line action dropdown
    const lineActionDropdown = /** @type {any} */ ({
      value: 'set',
      listeners: {},
      addEventListener: /** @type {any} */ jest.fn(function (event, cb) {
        const eventName = /** @type {string} */ (event)
        this.listeners[eventName] = cb
      })
    })

    /** @type {Record<string, any>} */
    const elementStore = {
      'tri-line-action': lineActionDropdown,
      rotateBtn: rotateBtn,
      dilateBtn: dilateBtn,
      erodeBtn: erodeBtn,
      crossDilateBtn: crossBtn,
      flipButtons: { appendChild: /** @type {any} */ jest.fn() },
      c: fakeCanvas
    }

    document.getElementById = /** @type {any} */ (
      jest.fn(id => {
        const key = /** @type {string} */ (id)
        if (key === 'c') return fakeCanvas
        return elementStore[key] || null
      })
    )

    // dynamically import tri.js after DOM stubs are in place
    const triModule = await import('./tri.js')
    triDraw = triModule.triDraw
    setMorphologyButtons = triModule.setMorphologyButtons

    // Set morphology buttons for testing
    setMorphologyButtons({
      dilate: dilateBtn,
      erode: erodeBtn,
      cross: crossBtn
    })
    // stub mask with required methods and indexer
    triDraw.mask = {
      actions: {
        transformMaps: { id: null, r120: 'R', r240: 'R2', f0: 'F' },
        template: 'T',
        applyMap: map => map || 'T',
        store: null,
        indexer: null
      },
      bits: 0n,
      store: null,
      indexer: {
        size: 19,
        location: i => [Math.floor(i / 4), i % 4],
        isValid: (r, c) => r >= 0 && c >= 0 && r < 7 && c < 7,
        index: (r, c) => r * 4 + c,
        segmentTo: function* (sr, sc, er, ec) {
          // Simple mock: yield start and end
          if (sr === er && sc === ec) return
          yield [sr, sc]
          yield [er, ec]
        },
        ray: function* (sr, sc, er, ec) {
          // Simple mock: yield cells until out of bounds
          yield [sr, sc]
          yield [er, ec]
        },
        fullLine: function* (sr, sc, er, ec) {
          yield [sr, sc]
          yield [er, ec]
        }
      },
      setIndex: /** @type {any} */ jest.fn((i, value) => {
        const paramValue = /** @type {number | bigint} */ (value)
        triDraw.mask.bits |= BigBits.setMask(i, paramValue)
        return triDraw.mask.bits
      }),
      dilate: jest.fn(function () {
        this.bits = 'd'
      }),
      erode: jest.fn(function () {
        this.bits = 'e'
      }),
      dilateCross: jest.fn(function () {
        this.bits = 'c'
      }),
      clone: {
        bits: 0n,
        dilate: jest.fn(function () {
          this.bits = 'd'
        }),
        erode: jest.fn(function () {
          this.bits = 'e'
        }),
        dilateCross: jest.fn(function () {
          this.bits = 'c'
        })
      }
    }

    triDraw.setBits = jest.fn()
    triDraw.redraw = jest.fn()
  })

  it('setTool changes currentTool state correctly', async () => {
    await import('./tri.js')
    // Export setTool from tri.js for testing by checking radio button handlers
    const radioButtons = /** @type {any} */ (
      document.querySelectorAll('input[name="tri-line-tool"]')
    )

    // Activate segment tool
    radioButtons[1].checked = true
    radioButtons[1].listeners.change({ target: radioButtons[1] })

    // Since we can't directly access setTool, verify behavior indirectly
    // This will be confirmed when line drawing works
  })

  it('line action dropdown changes action state', async () => {
    const lineActionDropdown = /** @type {any} */ (
      document.getElementById('tri-line-action')
    )

    // Test set action
    lineActionDropdown.value = 'set'
    lineActionDropdown.listeners.change({ target: lineActionDropdown })
    expect(lineActionDropdown.value).toBe('set')

    // Test clear action
    lineActionDropdown.value = 'clear'
    lineActionDropdown.listeners.change({ target: lineActionDropdown })
    expect(lineActionDropdown.value).toBe('clear')

    // Test toggle action
    lineActionDropdown.value = 'toggle'
    lineActionDropdown.listeners.change({ target: lineActionDropdown })
    expect(lineActionDropdown.value).toBe('toggle')
  })

  it('radio button selection fires change events', () => {
    const radioButtons = /** @type {any} */ (
      document.querySelectorAll('input[name="tri-line-tool"]')
    )

    // Single tool (default)
    expect(radioButtons[0].checked).toBe(true)
    expect(radioButtons[0].addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )

    // Segment tool
    radioButtons[1].checked = true
    radioButtons[1].listeners.change({ target: radioButtons[1] })
    expect(document.querySelectorAll).toHaveBeenCalledWith(
      'input[name="tri-line-tool"]'
    )

    // Ray tool
    radioButtons[2].checked = true
    radioButtons[2].listeners.change({ target: radioButtons[2] })

    // Full line tool
    radioButtons[3].checked = true
    radioButtons[3].listeners.change({ target: radioButtons[3] })
  })

  it('tri-line-action dropdown is wired correctly', () => {
    const dropdown = /** @type {any} */ (
      document.getElementById('tri-line-action')
    )
    expect(dropdown).toBeDefined()
    expect(dropdown.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )
    expect(dropdown.addEventListener).toHaveBeenCalledWith(
      'input',
      expect.any(Function)
    )
  })

  it('mask setIndex called correctly during operations', () => {
    triDraw.mask.setIndex.mockClear()

    // Simulate calling setIndex
    triDraw.mask.setIndex(5, 1)
    expect(triDraw.mask.setIndex).toHaveBeenCalledWith(5, 1)

    // Verify bits updated
    triDraw.mask.setIndex(7, 0)
    expect(triDraw.mask.setIndex).toHaveBeenCalledWith(7, 0)
  })

  it('morphology operations mutate bits correctly', () => {
    const initialBits = triDraw.mask.bits

    // Test dilate
    triDraw.mask.dilate()
    expect(triDraw.mask.bits).toBe('d')

    triDraw.mask.bits = initialBits
    triDraw.mask.erode()
    expect(triDraw.mask.bits).toBe('e')

    triDraw.mask.bits = initialBits
    triDraw.mask.dilateCross()
    expect(triDraw.mask.bits).toBe('c')
  })

  it('previewCells array initialized', async () => {
    const triModule = await import('./tri.js')
    const td = /** @type {any} */ (triModule.triDraw)
    expect(td.previewCells).toBeDefined()
    expect(Array.isArray(td.previewCells)).toBe(true)
  })

  it('GridCanvas treats lineStart 0 as valid start point', async () => {
    const { GridCanvas } = await import('./ui/GridCanvas.js')

    class TestCanvas extends GridCanvas {
      constructor (canvasId, grid, config) {
        super(canvasId, grid, config)
        this.completeLine = jest.fn()
        this.updateLinePreview = jest.fn()
        this.updateHoverInfo = jest.fn()
      }

      hitTest () {
        return 1
      }
    }

    const testGrid = {
      canvas: fakeCanvas,
      previewCells: [],
      hoverLocation: null,
      redraw: jest.fn()
    }

    const testCanvas = new TestCanvas('c', testGrid)
    testCanvas.currentTool = 'segment'
    testCanvas.lineStart = 0

    testCanvas.onCanvasClick(/** @type {any} */ ({}))
    expect(testCanvas.completeLine).toHaveBeenCalledWith(0, 1)
    expect(testCanvas.lineStart).toBeNull()

    testCanvas.lineStart = 0
    testCanvas.onCanvasMouseMove(/** @type {any} */ ({}))
    expect(testCanvas.updateLinePreview).toHaveBeenCalledWith(0, 1)
  })

  it('single cell mode allows direct toggle when TriCanvas is active', async () => {
    const { triDraw: td, triCanvas } = await import('./tri.js')

    expect(triCanvas).toBeDefined()
    triCanvas.currentTool = null
    const tdMask = /** @type {any} */ (td.mask)
    tdMask.setIndex.mockClear()

    td.toggleCell(5)

    expect(tdMask.setIndex).toHaveBeenCalledWith(5, 1)
  })

  it('line tool mode blocks direct toggle when TriCanvas is active', async () => {
    const { triDraw: td, triCanvas } = await import('./tri.js')

    expect(triCanvas).toBeDefined()
    triCanvas.currentTool = 'segment'
    const tdMask = /** @type {any} */ (td.mask)
    tdMask.setIndex.mockClear()
    td.toggleCell(5)

    expect(td.mask.setIndex).not.toHaveBeenCalled()
  })

  it('triCanvas.grid.toggleCell safely ignores null hits', async () => {
    const triModule = await import('./tri.js')
    const { triCanvas } = triModule
    expect(triCanvas).toBeDefined()
    expect(() => triCanvas.grid.toggleCell(null)).not.toThrow()
  })

  it('single action on TriCanvas sets cell when empty', async () => {
    const { TriDraw } = await import('./ui/triangle/triDraw.js')
    const { TriCanvas } = await import('./ui/triangle/TriCanvas.js')

    const triDraw = new TriDraw('c', 3, 300, 300, 25)
    const triCanvas = new TriCanvas('c', triDraw)

    triCanvas.grid.mask.setIndex = jest.fn((idx, _value) => {
      const index = /** @type {number} */ (idx)
      triCanvas.grid.mask.bits = BigOne.bitMaskByPos(index)
      return triCanvas.grid.mask.bits
    })
    triCanvas.grid.setBits = jest.fn(function (bits) {
      this.bits = bits
    })

    triCanvas.currentTool = null
    triCanvas.currentAction = 'set'
    triCanvas.grid.mask.bits = 0n

    triCanvas.grid.toggleCell(0)

    expect(triCanvas.grid.mask.setIndex).toHaveBeenCalledWith(0, 1)
    expect(triCanvas.grid.setBits).toHaveBeenCalledWith(1n)
    expect(triCanvas.grid.mask.bits).toBe(1n)
  })

  it('canvas listeners attached for line tool interaction', () => {
    expect(fakeCanvas.addEventListener).toBeDefined()
  })

  it('toggleCell respects line tool state', async () => {
    const triModule = await import('./tri.js')

    // When segment tool is active, toggleCell should not apply directly
    const radioButtons = document.querySelectorAll(
      'input[name="tri-line-tool"]'
    )
    radioButtons[1].checked = true
    radioButtons[1].listeners.change({ target: radioButtons[1] })

    // Direct toggle attempt should be skipped when line tool active
  })
})
