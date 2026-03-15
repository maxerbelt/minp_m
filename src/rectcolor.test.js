/* eslint-env jest */
/* global describe,it,expect,beforeEach,jest */
import { jest } from '@jest/globals'
import { Mask } from './grid/mask.js'
import { Packed } from './grid/packed.js'
// very similar to rect.test.js but targets the rectcolor grid

// Variables to hold dynamically imported functions (so they can be updated per-test)
let setTool2

// stub DOM canvas before loading module
const cellSize = 50
const offsetX = 50
const offsetY = 50
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

// simple DOM stub collection for buttons
const buttonStore = {}
function makeButton (jestFn, id) {
  const btn = { disabled: false, listeners: {} }
  btn.addEventListener = function (event, cb) {
    btn.listeners[event] = cb
  }
  buttonStore[id] = btn
  document.getElementById = jestFn(i => buttonStore[i] || fakeCanvas)
  return btn
}

// Create fake radio buttons for line tools
let radioButtons2 = [
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

function setupDOMStubs () {
  document.querySelectorAll = jest.fn(selector => {
    if (selector === 'input[name="line-tool2"]') {
      return radioButtons2
    }
    return []
  })
}

// variables will be imported dynamically in beforeEach
let grid,
  updateButtonStates2,
  applyTransform2,
  computePreviewCells2,
  drawLineBetween2

describe('rectcolor.js transform and line helpers', () => {
  beforeEach(async () => {
    setupDOMStubs()
    // create stub buttons
    makeButton(jest.fn, 'rotate-cw2')
    makeButton(jest.fn, 'rotate-ccw2')
    makeButton(jest.fn, 'flip-h2')
    makeButton(jest.fn, 'flip-v2')
    makeButton(jest.fn, 'dilate2')
    makeButton(jest.fn, 'erode2')
    makeButton(jest.fn, 'cross-dilate2')
    makeButton(jest.fn, 'line-color')
    // Reset radio buttons for this test
    radioButtons2 = [
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

    jest.resetModules()

    // dynamically import rectcolor.js after DOM stubs are in place
    const rectcolorModule = await import('./rectcolor.js')
    grid = rectcolorModule.grid
    updateButtonStates2 = rectcolorModule.updateButtonStates2
    applyTransform2 = rectcolorModule.applyTransform2
    computePreviewCells2 = rectcolorModule.computePreviewCells2
    drawLineBetween2 = rectcolorModule.drawLineBetween2
    // Update setTool2 from fresh module to ensure it shares state with computePreviewCells2
    setTool2 = rectcolorModule.setTool2

    // Set up grid with required properties for line tools
    grid.width = 10
    grid.height = 10
    grid.canvas = fakeCanvas

    // Initialize line tools to set up indexer2
    grid.initializeLineTools = rectcolorModule.initializeLineTools
    grid.initializeLineTools()

    // Wire line tool buttons to attach change listeners
    const wireLineToolButtons2 = rectcolorModule.wireLineToolButtons2
    wireLineToolButtons2()

    // use a real Packed instance so store/indexer APIs exist
    const packed = new Packed(10, 10)
    // seed with a single cell so morph ops are meaningful
    packed.set(1, 1, 1)
    // spy on set so we can assert calls
    packed.set = jest.fn(packed.set.bind(packed))
    // provide actions used by update/apply functions
    Object.defineProperty(packed, 'actions', {
      value: {
        transformMaps: { r90: 'A', r270: 'B', fx: 'C', fy: 'D' },
        template: 'T',
        applyMap: map => (map === 'A' ? 'A' : map === 'B' ? 'B' : map)
      },
      configurable: true
    })
    grid.packed = packed
  })

  it('updateButtonStates2 disables or enables based on symmetry and morphology', () => {
    updateButtonStates2()
    expect(buttonStore['rotate-cw2'].disabled).toBe(false)
    expect(buttonStore['rotate-ccw2'].disabled).toBe(false)
    expect(buttonStore['flip-h2'].disabled).toBe(false)
    expect(buttonStore['flip-v2'].disabled).toBe(false)
    expect(buttonStore['dilate2'].disabled).toBe(false)
    expect(buttonStore['erode2'].disabled).toBe(false)
    expect(buttonStore['cross-dilate2'].disabled).toBe(false)

    // make transforms all produce the template
    grid.packed.actions.applyMap = () => 'T'
    updateButtonStates2()
    expect(buttonStore['rotate-cw2'].disabled).toBe(true)
    expect(buttonStore['rotate-ccw2'].disabled).toBe(true)
    expect(buttonStore['flip-h2'].disabled).toBe(true)
    expect(buttonStore['flip-v2'].disabled).toBe(true)
    // morph still enabled because bits unchanged
    expect(buttonStore['dilate2'].disabled).toBe(false)

    // bits already equal after dilate should disable that button
    grid.packed.bits = grid.packed.fullBits
    updateButtonStates2()
    expect(buttonStore['dilate2'].disabled).toBe(true)
  })

  it('applyTransform2 updates packed bits and redraws', () => {
    grid.redraw = jest.fn()
    applyTransform2('r90')
    expect(grid.redraw).toHaveBeenCalled()
  })

  it('morph buttons change mask and redraw', () => {
    grid.redraw = jest.fn()
    const dil = buttonStore['dilate2'].listeners.click
    const er = buttonStore['erode2'].listeners.click
    const cr = buttonStore['cross-dilate2'].listeners.click
    dil?.()
    expect(grid.redraw).toHaveBeenCalled()
    er?.()
    expect(grid.redraw).toHaveBeenCalled()
    cr?.()
    expect(grid.redraw).toHaveBeenCalled()
  })

  it('line tools compute preview cells and draw lines', () => {
    grid.redraw = jest.fn()
    // segment tool
    const segRadio = radioButtons2[1] // segment radio button
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    fakeCanvas.listeners.click({
      clientX: 1 * cellSize + offsetX + 1,
      clientY: 1 * cellSize + offsetY + 1
    })
    grid.previewCells = computePreviewCells2([1, 1], [3, 1])
    expect(grid.previewCells.length).toBeGreaterThan(0)
    drawLineBetween2([1, 1], [3, 1])
    expect(grid.packed.set).toHaveBeenCalled()

    // ray tool
    grid.packed.set.mockClear()
    const rayRadio = radioButtons2[2] // ray radio button
    rayRadio.checked = true
    rayRadio.listeners.change({ target: rayRadio })

    fakeCanvas.listeners.click({
      clientX: 2 * cellSize + offsetX + 1,
      clientY: 2 * cellSize + offsetY + 1
    })
    grid.previewCells = computePreviewCells2([2, 2], [2, 2])
    expect(grid.previewCells.length).toBe(0)
    grid.previewCells = computePreviewCells2([2, 2], [5, 2])
    expect(grid.previewCells.length).toBeGreaterThan(0)
    drawLineBetween2([2, 2], [5, 2])
    expect(grid.packed.set).toHaveBeenCalled()
  })

  it('updateButtonStates2 handles BigInt bitboards correctly', () => {
    const mask = new Mask(4, 4)
    mask.set(1, 1)
    grid.packed = mask
    updateButtonStates2()
    expect(buttonStore['dilate2'].disabled).toBe(false)
    // saturate grid so dilation no longer changes anything
    mask.bits = mask.fullBits
    updateButtonStates2()
    expect(buttonStore['dilate2'].disabled).toBe(true)
  })

  it('updates symmetry display on packed changes', () => {
    // ensure stub exists
    if (!buttonStore['rectcolor-symmetry']) {
      buttonStore['rectcolor-symmetry'] = { textContent: '' }
      document.getElementById = jest.fn(i => buttonStore[i] || fakeCanvas)
    }
    const symEl = document.getElementById('rectcolor-symmetry')
    const before = symEl.textContent
    grid.packed = grid.packed.clone
    grid.packed.set(0, 0, 1)
    updateButtonStates2()
    const after = document.getElementById('rectcolor-symmetry').textContent
    expect(after).toMatch(/^Symmetry:/)
    expect(after).not.toBe(before)
  })
})

describe('rectcolor dilation diagnostics', () => {
  beforeEach(async () => {
    // Re-import and setup for each test in this suite
    setupDOMStubs()
    makeButton(jest.fn, 'rotate-cw2')
    makeButton(jest.fn, 'rotate-ccw2')
    makeButton(jest.fn, 'flip-h2')
    makeButton(jest.fn, 'flip-v2')
    makeButton(jest.fn, 'dilate2')
    makeButton(jest.fn, 'erode2')
    makeButton(jest.fn, 'cross-dilate2')
    makeButton(jest.fn, 'line-color')

    radioButtons2 = [
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

    jest.resetModules()

    const rectcolorModule = await import('./rectcolor.js')
    grid = rectcolorModule.grid
    updateButtonStates2 = rectcolorModule.updateButtonStates2
    applyTransform2 = rectcolorModule.applyTransform2
    computePreviewCells2 = rectcolorModule.computePreviewCells2
    drawLineBetween2 = rectcolorModule.drawLineBetween2
    setTool2 = rectcolorModule.setTool2

    grid.width = 10
    grid.height = 10
    grid.canvas = fakeCanvas

    grid.initializeLineTools = rectcolorModule.initializeLineTools
    grid.initializeLineTools()

    const wireLineToolButtons2 = rectcolorModule.wireLineToolButtons2
    wireLineToolButtons2()

    const packed = new Packed(10, 10)
    packed.set(1, 1, 1)
    packed.set = jest.fn(packed.set.bind(packed))
    Object.defineProperty(packed, 'actions', {
      value: {
        transformMaps: { r90: 'A', r270: 'B', fx: 'C', fy: 'D' },
        template: 'T',
        applyMap: map => (map === 'A' ? 'A' : map === 'B' ? 'B' : map)
      },
      configurable: true
    })
    grid.packed = packed

    // Add canvas event listener support and _hitTest for two-point drawing
    grid._hitTest = jest.fn((x, y) => {
      const cellX = Math.floor((x - offsetX) / cellSize)
      const cellY = Math.floor((y - offsetY) / cellSize)
      if (cellX >= 0 && cellX < 10 && cellY >= 0 && cellY < 10) {
        return [cellX, cellY]
      }
      return null
    })

    // Attach canvas listeners for two-point drawing
    const attachCanvasListeners2 = rectcolorModule.attachCanvasListeners2
    if (attachCanvasListeners2) {
      attachCanvasListeners2()
    }
  })

  it('should detect occupancyMask bit layout mismatch', () => {
    // Root cause analysis: occupancyMask() from depth-4 grid vs depth-1 grid layout
    const packed4 = new Packed(5, 5, null, null, 4)
    packed4.set(2, 2, 5)

    const occMask = packed4.occupancyMask()
    console.log('[diag] occupancyMask from depth-4 grid:', occMask)

    // Create depth-1 occupancy grid and assign the mask
    const occ1 = new Packed(5, 5, null, null, 1)
    if (Array.isArray(occMask)) {
      occ1.bits = Array.from(occMask)
    } else if (typeof occMask === 'number') {
      occ1.bits = [occMask]
    }

    console.log(
      '[diag] Cells occupied in occ1 grid after copying occupancyMask:'
    )
    const occupied = []
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (occ1.at(x, y) === 1) {
          occupied.push([x, y])
        }
      }
    }
    console.log('[diag] Occupied cells:', occupied)

    // We expect ONLY (2,2), but we might get many others if bit layouts don't match
    if (occupied.length !== 1 || occupied[0][0] !== 2 || occupied[0][1] !== 2) {
      console.log('[diag] BIT LAYOUT MISMATCH DETECTED!')
      console.log('[diag] Expected [(2,2)], got:', occupied)
    }
  })

  it('should manually build occupancy for correct dilation', () => {
    // Build occupancy correctly without relying on occupancyMask
    const packed = new Packed(5, 5, null, null, 4)
    packed.set(2, 2, 5)

    const occ = new Packed(5, 5, null, null, 1)
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (packed.at(x, y) !== 0) {
          occ.set(x, y, 1)
        }
      }
    }

    console.log('[diag] Manual occupancy before dilate:')
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (occ.at(x, y) === 1) console.log(`  occ(${x},${y})=1`)
      }
    }

    const beforeBits = Array.from(occ.bits)
    // use cross-dilate (4-connectivity) for manual occupancy expectation
    occ.dilateCross()

    console.log('[diag] Manual occupancy after dilate:')
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (occ.at(x, y) === 1) console.log(`  occ(${x},${y})=1`)
      }
    }

    // Find added cells
    const added = occ.store.bitSub(occ.bits, beforeBits)
    const addedCoords = Array.from(occ.indexer.bitsToCoords(added))
    console.log('[diag] Added cells:', addedCoords)

    expect(addedCoords.length).toBe(4)
    expect(occ.at(1, 2)).toBe(1)
    expect(occ.at(3, 2)).toBe(1)
    expect(occ.at(2, 1)).toBe(1)
    expect(occ.at(2, 3)).toBe(1)
  })

  it('ROOT-CAUSE: dilation produces 3x3 instead of plus', () => {
    const packed = new Packed(5, 5, null, null, 1)
    packed.set(2, 2, 1)

    const beforeBits = Array.from(packed.bits)
    console.log('[ROOT-CAUSE] Before dilate, packed.bits:', packed.bits)

    packed.dilate()

    console.log('[ROOT-CAUSE] After dilate, packed.bits:', packed.bits)

    // Check what cells are now occupied
    console.log('[ROOT-CAUSE] Occupied cells after dilate:')
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (packed.at(x, y) === 1) {
          console.log(`  (${x},${y})`)
        }
      }
    }

    // Show what was added
    const addedBits = packed.store.bitSub(packed.bits, beforeBits)
    const added = Array.from(packed.indexer.bitsToCoords(addedBits))
    console.log('[ROOT-CAUSE] Added cells count:', added.length)
    console.log('[ROOT-CAUSE] Added cells:', added)

    // For a single cell at (2,2), dilate should add ONLY 4 neighbors
    // But we're getting 8 neighbors (3x3 minus center)
    console.log('[ROOT-CAUSE] EXPECTED: 4 added cells (2D plus sign)')
    console.log('[ROOT-CAUSE] ACTUAL:', added.length, 'added cells')

    if (added.length !== 4) {
      console.log(
        '[ROOT-CAUSE] *** DILATION BUG: Using 8-connectivity instead of 4-connectivity ***'
      )
    }
  })

  it('ROOT-CAUSE: check if corners are being dilated', () => {
    // Test directly on a 1-bit Packed grid
    const occ = new Packed(5, 5, null, null, 1)
    occ.set(2, 2, 1)

    console.log('[ROOT-CAUSE] Testing dilate() on 1-bit Packed(5,5)')
    console.log('[ROOT-CAUSE] Set only (2,2)=1')

    const before = Array.from(occ.bits)
    occ.dilate()

    const after = occ.bits
    console.log('[ROOT-CAUSE] store.words:', occ.store.words)
    console.log('[ROOT-CAUSE] bits before:', before)
    console.log('[ROOT-CAUSE] bits after:', after)

    // The bug: if dilateSeparable is broken,
    // we'll see all 8 neighbors set (except center)
    expect(occ.at(2, 2)).toBe(1) // center
    expect(occ.at(2, 1)).toBe(1) // above
    expect(occ.at(2, 3)).toBe(1) // below
    expect(occ.at(1, 2)).toBe(1) // left
    expect(occ.at(3, 2)).toBe(1) // right

    // These should NOT be set (diagonals - 8-connectivity)
    console.log('[ROOT-CAUSE] Checking corners...')
    console.log('[ROOT-CAUSE]   (1,1):', occ.at(1, 1), '(should be 0)')
    console.log('[ROOT-CAUSE]   (3,1):', occ.at(3, 1), '(should be 0)')
    console.log('[ROOT-CAUSE]   (1,3):', occ.at(1, 3), '(should be 0)')
    console.log('[ROOT-CAUSE]   (3,3):', occ.at(3, 3), '(should be 0)')

    // If corners are set to 1, the dilation algorithm is using 8-connectivity
    if (
      occ.at(1, 1) === 1 ||
      occ.at(3, 1) === 1 ||
      occ.at(1, 3) === 1 ||
      occ.at(3, 3) === 1
    ) {
      console.log(
        '[ROOT-CAUSE] *** BUG FOUND: dilateSeparable using 8-connectivity ***'
      )
    }
  })

  it('line color dropdown controls color selection', () => {
    console.log('running line color dropdown test')
    grid.redraw = jest.fn()
    grid.packed.set.mockClear()

    // Activate segment tool first
    const segRadio = radioButtons2[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    const lineColorDropdown = document.getElementById('line-color')

    // Test color 1 (default)
    drawLineBetween2([1, 1], [2, 1])
    expect(grid.packed.set).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      1
    )

    // Test color 2
    grid.packed.set.mockClear()
    lineColorDropdown.value = '2'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })
    drawLineBetween2([2, 2], [3, 2])
    expect(grid.packed.set).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      2
    )

    // Test color 3
    grid.packed.set.mockClear()
    lineColorDropdown.value = '3'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })
    drawLineBetween2([3, 3], [4, 3])
    expect(grid.packed.set).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      3
    )

    // Test color 4
    grid.packed.set.mockClear()
    lineColorDropdown.value = '4'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })
    drawLineBetween2([4, 4], [5, 4])
    expect(grid.packed.set).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      4
    )
  })

  it('line color cycle iterates through colors 1-4', () => {
    console.log('running color cycle test')
    grid.redraw = jest.fn()
    grid.packed.set.mockClear()

    // Activate segment tool first
    const segRadio = radioButtons2[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    const lineColorDropdown = document.getElementById('line-color')
    lineColorDropdown.value = 'cycle'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })

    // Draw a line and check that colors cycle
    drawLineBetween2([1, 1], [4, 1])

    // Should cycle through 1, 2, 3, 4, 1, 2, 3, 4, ...
    const calls = grid.packed.set.mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(4)

    // Extract the color values from the calls
    const colors = calls.map(call => call[2])
    expect(colors[0]).toBe(1)
    expect(colors[1]).toBe(2)
    expect(colors[2]).toBe(3)
    expect(colors[3]).toBe(4)
  })

  it('color cycle resets when dropdown changes', () => {
    console.log('running color cycle reset test')
    grid.redraw = jest.fn()
    grid.packed.set.mockClear()

    // Activate segment tool first
    const segRadio = radioButtons2[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    const lineColorDropdown = document.getElementById('line-color')

    // Set to cycle
    lineColorDropdown.value = 'cycle'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })

    drawLineBetween2([1, 1], [2, 1])

    // Count first call
    const firstCallColor = grid.packed.set.mock.calls[0][2]

    // Change to color 1
    grid.packed.set.mockClear()
    lineColorDropdown.value = '1'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })

    // Change back to cycle - should restart from 1
    lineColorDropdown.value = 'cycle'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })

    drawLineBetween2([3, 3], [4, 3])
    const resetCallColor = grid.packed.set.mock.calls[0][2]
    expect(resetCallColor).toBe(1) // Should always start with 1 after reset
  })

  it('radio button changes work with different colors', () => {
    console.log('running tool/color interaction test')
    grid.redraw = jest.fn()
    grid.packed.set.mockClear()

    const lineColorDropdown = document.getElementById('line-color')
    lineColorDropdown.value = '3'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })

    // Change tool to segment
    const segRadio = radioButtons2[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    // Draw and verify color 3 is used
    drawLineBetween2([1, 1], [3, 1])
    expect(grid.packed.set).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      3
    )

    // Change tool to ray
    grid.packed.set.mockClear()
    const rayRadio = radioButtons2[2]
    rayRadio.checked = true
    rayRadio.listeners.change({ target: rayRadio })

    // Draw and verify color 3 is still used
    drawLineBetween2([1, 1], [4, 1])
    expect(grid.packed.set).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      3
    )
  })

  it('all tools respect selected color', () => {
    console.log('running all tools color test')
    grid.redraw = jest.fn()

    const lineColorDropdown = document.getElementById('line-color')

    for (const color of ['1', '2', '3', '4']) {
      for (let toolIdx = 0; toolIdx < radioButtons2.length; toolIdx++) {
        grid.packed.set.mockClear()

        lineColorDropdown.value = color
        lineColorDropdown.listeners.change({ target: lineColorDropdown })

        const radio = radioButtons2[toolIdx]
        radio.checked = true
        radio.listeners.change({ target: radio })

        drawLineBetween2([1, 1], [2, 2])

        if (toolIdx === 0) {
          // Single tool doesn't draw anything
          expect(grid.packed.set).not.toHaveBeenCalled()
        } else {
          expect(grid.packed.set).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Number),
            parseInt(color)
          )
        }
      }
    }
  })

  it('Preview cells computed correctly for all tools', () => {
    console.log('running preview cells color test')

    const start = [2, 2]
    const end = [5, 5]

    // Test segment
    const segRadio = radioButtons2[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })
    const segmentCells = computePreviewCells2(start, end)
    expect(segmentCells.length).toBeGreaterThan(0)
    expect(segmentCells).toContainEqual(start)
    expect(segmentCells).toContainEqual(end)

    // Test ray
    const rayRadio = radioButtons2[2]
    rayRadio.checked = true
    rayRadio.listeners.change({ target: rayRadio })
    const rayCells = computePreviewCells2(start, end)
    expect(rayCells.length).toBeGreaterThan(0)
    expect(rayCells).toContainEqual(start)

    // Test full line
    const fullRadio = radioButtons2[3]
    fullRadio.checked = true
    fullRadio.listeners.change({ target: fullRadio })
    const fullCells = computePreviewCells2(start, end)
    expect(fullCells.length).toBeGreaterThan(0)
    expect(fullCells).toContainEqual(start)

    // Test single (null tool) should return empty
    const singleRadio = radioButtons2[0]
    singleRadio.checked = true
    singleRadio.listeners.change({ target: singleRadio })
    const singleCells = computePreviewCells2(start, end)
    expect(singleCells.length).toBe(0)
  })

  it('Two-point drawing completes correctly with colors', () => {
    console.log('running two-point drawing with colors test')
    grid.redraw = jest.fn()
    grid.packed.set.mockClear()

    const lineColorDropdown = document.getElementById('line-color')
    lineColorDropdown.value = '2'
    lineColorDropdown.listeners.change({ target: lineColorDropdown })

    // Activate segment tool
    const segRadio = radioButtons2[1]
    segRadio.checked = true
    segRadio.listeners.change({ target: segRadio })

    // Directly call drawLineBetween2 with segment coordinates
    drawLineBetween2([1, 1], [3, 1])

    // Verify that set was called with color 2
    expect(grid.packed.set).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      2
    )
    expect(grid.packed.set).toHaveBeenCalledTimes(
      3 // Should be called for 3 cells in the segment from [1,1] to [3,1]
    )
  })
})
