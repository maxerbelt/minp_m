/* eslint-env jest */
/* global describe,it,expect,beforeEach,jest */
import { Mask } from './grid/rectangle/mask.js'
import { jest } from '@jest/globals'

// stub DOM canvas before loading module
const cellSize = 50
const offsetX = 50
const offsetY = 50

// Variables to hold dynamically imported functions (so they can be updated per-test)
let setTool
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
  listeners: {},
  addEventListener: function (event, cb) {
    this.listeners[event] = cb
  },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 })
}

// Stub functions to set up DOM - called after jest is available
function setupDOMStubs () {
  document.getElementById = jest.fn(id => {
    if (
      id === 'rect-c' ||
      id === 'rotate-cw' ||
      id === 'rotate-ccw' ||
      id === 'flip-h' ||
      id === 'flip-v' ||
      id === 'dilate' ||
      id === 'erode' ||
      id === 'cross-dilate'
    ) {
      return fakeCanvas
    }
    // symmetry display element stub
    if (id === 'rect-symmetry') {
      return { textContent: '' }
    }
    // hover info label stub
    if (id === 'rect-hover-info') {
      return { textContent: '' }
    }
    // line action dropdown stub
    if (id === 'line-action') {
      return {
        value: 'set',
        listeners: {},
        addEventListener: jest.fn(function (event, cb) {
          this.listeners[event] = cb
        })
      }
    }
    return null
  })

  // Mock querySelectorAll for radio buttons
  document.querySelectorAll = jest.fn(selector => {
    if (selector === 'input[name="line-tool"]') {
      return radioButtons
    }
    if (selector === 'input[name="cover-type"]') {
      return coverTypeRadios
    }
    return []
  })
}

// We'll import rect.js after setting up DOM stubs inside beforeEach
let rectDraw, updateButtonStates, applyTransform

// simple DOM stub collection
const buttonStore = {}

// Create fake radio buttons for line tools
let radioButtons = [
  {
    value: 'single',
    checked: true,
    listeners: {},
    addEventListener: jest.fn(function (event, cb) {
      this.listeners[event] = cb
    })
  },
  {
    value: 'segment',
    checked: false,
    listeners: {},
    addEventListener: jest.fn(function (event, cb) {
      this.listeners[event] = cb
    })
  },
  {
    value: 'ray',
    checked: false,
    listeners: {},
    addEventListener: jest.fn(function (event, cb) {
      this.listeners[event] = cb
    })
  },
  {
    value: 'full',
    checked: false,
    listeners: {},
    addEventListener: jest.fn(function (event, cb) {
      this.listeners[event] = cb
    })
  }
]

// Create fake radio buttons for cover type
let coverTypeRadios = [
  {
    value: 'normal',
    checked: true,
    listeners: {},
    addEventListener: jest.fn(function (event, cb) {
      this.listeners[event] = cb
    })
  },
  {
    value: 'half',
    checked: false,
    listeners: {},
    addEventListener: jest.fn(function (event, cb) {
      this.listeners[event] = cb
    })
  },
  {
    value: 'super',
    checked: false,
    listeners: {},
    addEventListener: jest.fn(function (event, cb) {
      this.listeners[event] = cb
    })
  }
]

function makeButton (jestFn, id) {
  const btn = { disabled: false, listeners: {} }
  btn.addEventListener = jestFn((event, cb) => {
    btn.listeners[event] = cb
  })
  buttonStore[id] = btn
  document.getElementById = jestFn(i => buttonStore[i] || fakeCanvas)
  return btn
}

describe('rect.js transform helpers', () => {
  let rotateCW, rotateCCW, flipH, flipV
  let rectDraw,
    updateButtonStates,
    applyTransform,
    computePreviewCells,
    drawLineBetween,
    initializeGridIfNeeded,
    initializePolyominoGridIfNeeded,
    polyGrid
  beforeEach(async () => {
    console.log('rect.test beforeEach')
    setupDOMStubs()
    // create stub buttons and override document.getElementById to return them
    rotateCW = makeButton(jest.fn, 'rotate-cw')
    rotateCCW = makeButton(jest.fn, 'rotate-ccw')
    flipH = makeButton(jest.fn, 'flip-h')
    flipV = makeButton(jest.fn, 'flip-v')
    makeButton(jest.fn, 'dilate')
    makeButton(jest.fn, 'erode')
    makeButton(jest.fn, 'cross-dilate')

    // Add line-action dropdown and other elements to buttonStore
    buttonStore['line-action'] = {
      value: 'set',
      listeners: {},
      addEventListener: jest.fn(function (event, cb) {
        this.listeners[event] = cb
      })
    }
    buttonStore['rect-hover-info'] = { textContent: '' }
    buttonStore['rectcolor-hover-info'] = { textContent: '' }

    // Ensure document.getElementById returns from buttonStore first
    document.getElementById = jest.fn(i => buttonStore[i] || fakeCanvas)

    // Reset radio buttons for this test
    radioButtons = [
      {
        value: 'single',
        checked: true,
        listeners: {},
        addEventListener: jest.fn(function (event, cb) {
          this.listeners[event] = cb
        })
      },
      {
        value: 'segment',
        checked: false,
        listeners: {},
        addEventListener: jest.fn(function (event, cb) {
          this.listeners[event] = cb
        })
      },
      {
        value: 'ray',
        checked: false,
        listeners: {},
        addEventListener: jest.fn(function (event, cb) {
          this.listeners[event] = cb
        })
      },
      {
        value: 'full',
        checked: false,
        listeners: {},
        addEventListener: jest.fn(function (event, cb) {
          this.listeners[event] = cb
        })
      }
    ]
    // Reset cover type radio buttons for this test
    coverTypeRadios = [
      {
        value: 'normal',
        checked: true,
        listeners: {},
        addEventListener: jest.fn(function (event, cb) {
          this.listeners[event] = cb
        })
      },
      {
        value: 'half',
        checked: false,
        listeners: {},
        addEventListener: jest.fn(function (event, cb) {
          this.listeners[event] = cb
        })
      },
      {
        value: 'super',
        checked: false,
        listeners: {},
        addEventListener: jest.fn(function (event, cb) {
          this.listeners[event] = cb
        })
      }
    ]
    // stub symmetry display element
    buttonStore['rect-symmetry'] = { textContent: '' }

    // reset modules and import with stubbed DOM
    jest.resetModules()

    // dynamically import rect.js after DOM stubs are in place
    const rectModule = await import('./rect.js')
    rectDraw = rectModule.rectDraw
    updateButtonStates = rectModule.updateButtonStates
    applyTransform = rectModule.applyTransform
    computePreviewCells = rectModule.computePreviewCells
    drawLineBetween = rectModule.drawLineBetween
    // Update setTool from fresh module to ensure it shares state with computePreviewCells
    setTool = rectModule.setTool

    // Also export initialization functions for tests
    initializeGridIfNeeded = rectModule.initializeGridIfNeeded
    initializePolyominoGridIfNeeded = rectModule.initializePolyominoGridIfNeeded
    polyGrid = rectModule.polyGrid

    // stub mask actions on rectDraw; also supply clone behavior for morphology
    rectDraw.mask = {
      actions: {
        transformMaps: { r90: 'A', r270: 'B', fx: 'C', fy: 'D' },
        template: 'T',
        applyMap: map => (map === 'A' ? 'A' : map === 'B' ? 'B' : map)
      },
      bits: 'orig',
      set: jest.fn(),
      clear: jest.fn(),
      dilate: jest.fn(function () {
        this.bits = 'd'
      }),
      erode: jest.fn(function () {
        this.bits = 'e'
      }),
      dilateCross: jest.fn(function () {
        this.bits = 'c'
      }),
      get clone () {
        const obj = { bits: this.bits }
        obj.dilate = function () {
          this.bits = 'd'
        }
        obj.erode = function () {
          this.bits = 'e'
        }
        obj.dilateCross = function () {
          this.bits = 'c'
        }
        return obj
      }
    }
  })

  it('updateButtonStates disables or enables based on symmetry and morphology', () => {
    console.log('running updateButtonStates test')
    // template != A so cw enabled
    updateButtonStates()
    expect(rotateCW.disabled).toBe(false)
    expect(rotateCCW.disabled).toBe(false)
    expect(flipH.disabled).toBe(false)
    expect(flipV.disabled).toBe(false)

    // morphological buttons should be enabled since clone returns different bits
    expect(buttonStore['dilate'].disabled).toBe(false)
    expect(buttonStore['erode'].disabled).toBe(false)
    expect(buttonStore['cross-dilate'].disabled).toBe(false)

    // make maps produce same as template and buttons should all disable
    rectDraw.mask.actions.applyMap = () => 'T'
    updateButtonStates()
    expect(rotateCW.disabled).toBe(true)
    expect(rotateCCW.disabled).toBe(true)
    expect(flipH.disabled).toBe(true)
    expect(flipV.disabled).toBe(true)
    expect(buttonStore['dilate'].disabled).toBe(false)

    // if bits already equal after dilate then disable that button
    rectDraw.mask.bits = 'd'
    updateButtonStates()
    expect(buttonStore['dilate'].disabled).toBe(true)
  })

  it('applyTransform updates mask bits and redraws', () => {
    console.log('running applyTransform test')
    rectDraw.redraw = jest.fn()
    // mapName 'r90' returns 'A'
    applyTransform('r90')
    expect(rectDraw.mask.bits).toBe('A')
    expect(rectDraw.redraw).toHaveBeenCalled()
  })

  it('dilate/erode/cross button handlers change mask and redraw', () => {
    console.log('running morph buttons test')
    rectDraw.redraw = jest.fn()
    rectDraw.mask.bits = 'orig'
    // invoke registered listeners if any
    const dil = buttonStore['dilate'].listeners.click
    const er = buttonStore['erode'].listeners.click
    const cr = buttonStore['cross-dilate'].listeners.click
    dil?.()
    expect(rectDraw.redraw).toHaveBeenCalled()
    er?.()
    expect(rectDraw.redraw).toHaveBeenCalled()
    cr?.()
    expect(rectDraw.redraw).toHaveBeenCalled()
  })

  it('updates symmetry display on mask change', () => {
    const symEl = document.getElementById('rect-symmetry')
    const before = symEl.textContent
    // perform a mask modification and call updateButtonStates
    rectDraw.mask = new Mask(3, 3)
    rectDraw.mask.set(0, 0)
    updateButtonStates()
    expect(symEl.textContent).toMatch(/^Symmetry:/)
    expect(symEl.textContent).not.toBe(before)
  })

  it('line tools set bits between two clicks', () => {
    console.log('running line tools test')
    rectDraw.redraw = jest.fn()

    // test segment tool
    const segRadio = radioButtons[1] // segment radio button
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    // First click: set start point
    fakeCanvas.listeners.click({
      clientX: 1 * cellSize + offsetX + 1,
      clientY: 1 * cellSize + offsetY + 1
    })
    // Second click: set end point (simulate mousemove to preview, then click to draw)
    rectDraw.previewCells = computePreviewCells([1, 1], [3, 1])
    expect(rectDraw.previewCells.length).toBeGreaterThan(0)
    // Now click to finish the line (simulate the effect by calling drawLineBetween directly)
    drawLineBetween([1, 1], [3, 1])
    expect(rectDraw.mask.set).toHaveBeenCalled()

    // test ray tool
    rectDraw.mask.set.mockClear()
    const rayRadio = radioButtons[2] // ray radio button
    rayRadio.checked = true
    rayRadio.listeners.change({ target: rayRadio })

    fakeCanvas.listeners.click({
      clientX: 2 * cellSize + offsetX + 1,
      clientY: 2 * cellSize + offsetY + 1
    })
    // Simulate preview for same cell (should be empty)
    rectDraw.previewCells = computePreviewCells([2, 2], [2, 2])
    expect(rectDraw.previewCells.length).toBe(0)
    // Simulate preview for another cell (should be >0)
    rectDraw.previewCells = computePreviewCells([2, 2], [5, 2])
    expect(rectDraw.previewCells.length).toBeGreaterThan(0)
    // Simulate click to finish the ray
    drawLineBetween([2, 2], [5, 2])
    expect(rectDraw.mask.set).toHaveBeenCalled()
  })

  it('updateButtonStates correctly handles BigInt bitboards', () => {
    // use a real Mask instance so bits are BigInt
    const mask = new Mask(5, 5)
    mask.set(2, 2)
    rectDraw.mask = mask
    updateButtonStates()
    expect(buttonStore['dilate'].disabled).toBe(false)
    // make mask full so further dilation has no effect
    mask.bits = mask.fullBits
    updateButtonStates()
    expect(buttonStore['dilate'].disabled).toBe(true)
  })

  it('line action dropdown controls set/clear/toggle behavior', () => {
    console.log('running line action dropdown test')
    rectDraw.redraw = jest.fn()
    rectDraw.mask.clear = jest.fn()
    rectDraw.mask.at = jest.fn(() => 1) // Mock at() to return 1 (cell is set)

    // Activate segment tool first
    const segRadio = radioButtons[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    // Test set action (default)
    drawLineBetween([1, 1], [2, 1])
    expect(rectDraw.mask.set).toHaveBeenCalledWith(1, 1, 1)
    expect(rectDraw.mask.set).toHaveBeenCalledWith(2, 1, 1)

    // Test clear action
    rectDraw.mask.set.mockClear()
    rectDraw.mask.clear.mockClear()
    const lineActionDropdown = document.getElementById('line-action')
    lineActionDropdown.value = 'clear'
    lineActionDropdown.listeners.change({ target: lineActionDropdown })

    drawLineBetween([1, 1], [2, 1])
    expect(rectDraw.mask.clear).toHaveBeenCalledWith(1, 1)
    expect(rectDraw.mask.clear).toHaveBeenCalledWith(2, 1)

    // Test toggle action
    rectDraw.mask.set.mockClear()
    lineActionDropdown.value = 'toggle'
    lineActionDropdown.listeners.change({ target: lineActionDropdown })

    drawLineBetween([1, 1], [2, 1])
    // Should toggle, so set to 0 since at() returns 1
    expect(rectDraw.mask.set).toHaveBeenCalledWith(1, 1, 0)
    expect(rectDraw.mask.set).toHaveBeenCalledWith(2, 1, 0)
  })

  it('line preview cells computed for all tool types', () => {
    console.log('running preview cells test')
    const start = [2, 2]
    const end = [5, 5]

    // Test segment
    const segRadio = radioButtons[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })
    const segmentCells = computePreviewCells(start, end)
    expect(segmentCells.length).toBeGreaterThan(0)
    expect(segmentCells).toContainEqual(start)
    expect(segmentCells).toContainEqual(end)

    // Test ray
    const rayRadio = radioButtons[2]
    rayRadio.checked = true
    rayRadio.listeners.change({ target: rayRadio })
    const rayCells = computePreviewCells(start, end)
    expect(rayCells.length).toBeGreaterThan(0)
    expect(rayCells).toContainEqual(start)

    // Test full line
    const fullRadio = radioButtons[3]
    fullRadio.checked = true
    fullRadio.listeners.change({ target: fullRadio })
    const fullCells = computePreviewCells(start, end)
    expect(fullCells.length).toBeGreaterThan(0)
    expect(fullCells).toContainEqual(start)

    // Test single (null tool) should return empty
    const singleRadio = radioButtons[0]
    singleRadio.checked = true
    singleRadio.listeners.change({ target: singleRadio })
    const singleCells = computePreviewCells(start, end)
    expect(singleCells.length).toBe(0)
  })

  it('radio button changes properly update tool state', () => {
    console.log('running radio button state test')
    // Start with single (null)
    setTool(null)
    const singleRadio = radioButtons[0]
    expect(singleRadio.value).toBe('single')

    // Change to segment
    const segRadio = radioButtons[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })
    let preview = computePreviewCells([1, 1], [3, 1])
    expect(preview.length).toBeGreaterThan(0)

    // Change to ray
    const rayRadio = radioButtons[2]
    rayRadio.checked = true
    rayRadio.listeners.change({ target: rayRadio })
    preview = computePreviewCells([1, 1], [3, 1])
    expect(preview.length).toBeGreaterThan(0)

    // Change to line
    const lineRadio = radioButtons[3]
    lineRadio.checked = true
    lineRadio.listeners.change({ target: lineRadio })
    preview = computePreviewCells([1, 1], [3, 1])
    expect(preview.length).toBeGreaterThan(0)
  })

  it('line drawing completes two-point sequence correctly', () => {
    console.log('running two-point drawing test')
    rectDraw.redraw = jest.fn()
    rectDraw.mask.set.mockClear()

    // Activate segment tool
    const segRadio = radioButtons[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    // Verify that line preview computation works for segment tool
    const startCoords = [1, 1]
    const endCoords = [3, 1]
    const preview = computePreviewCells(startCoords, endCoords)
    expect(preview.length).toBeGreaterThan(0)

    // Verify that the preview is  correct for a horizontal line
    // Should include cells [1,1], [2,1], [3,1]
    expect(preview.some(coord => coord[0] === 1 && coord[1] === 1)).toBe(true)
    expect(preview.some(coord => coord[0] === 2 && coord[1] === 1)).toBe(true)
    expect(preview.some(coord => coord[0] === 3 && coord[1] === 1)).toBe(true)
  })

  it('tool state persists across multiple operations', () => {
    console.log('running tool persistence test')
    rectDraw.redraw = jest.fn()

    // Set segment tool
    const segRadio = radioButtons[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    // Do first draw
    const preview1 = computePreviewCells([1, 1], [2, 2])
    expect(preview1.length).toBeGreaterThan(0)

    // Do second draw without changing tool
    const preview2 = computePreviewCells([3, 3], [4, 4])
    expect(preview2.length).toBeGreaterThan(0)

    // Tool should still be segment
    const currentPreview = computePreviewCells([1, 1], [3, 1])
    expect(currentPreview.length).toBeGreaterThan(0)
  })

  it('action state independent of tool state', () => {
    console.log('running action independence test')
    rectDraw.redraw = jest.fn()
    rectDraw.mask.set.mockClear()
    rectDraw.mask.clear = jest.fn()

    const lineActionDropdown = document.getElementById('line-action')

    // Set to clear action
    lineActionDropdown.value = 'clear'
    lineActionDropdown.listeners.change({ target: lineActionDropdown })

    // Change tool
    const rayRadio = radioButtons[2]
    rayRadio.checked = true
    rayRadio.listeners.change({ target: rayRadio })

    // Action should still be clear after tool change
    drawLineBetween([1, 1], [4, 1])
    expect(rectDraw.mask.clear).toHaveBeenCalled()
    expect(rectDraw.mask.set).not.toHaveBeenCalled()
  })

  it('drag and drop polyominoes from polyomino grid to rect grid', () => {
    console.log('running drag and drop test')
    // This is a basic smoke test to ensure drag and drop event listeners are registered
    // Full integration testing would require simulating actual drag events

    // Initialize both grids
    initializePolyominoGridIfNeeded()
    initializeGridIfNeeded()

    // Fill polyomino grid
    if (polyGrid) {
      polyGrid.fillGrid()
      expect(polyGrid.polyominoes.length).toBeGreaterThan(0)
    }

    // Verify rectCanvas exists for drop target
    expect(rectDraw).toBeDefined()
    expect(polyGrid).toBeDefined()

    // Verify grid dimensions match
    expect(rectDraw.width).toBe(polyGrid.width)
    expect(rectDraw.height).toBe(polyGrid.height)
  })
})
