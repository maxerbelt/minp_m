import { RectIndex } from '../../grid/rectangle/RectIndex.js'
import { Packed } from '../../grid/rectangle/packed.js'
import {
  wireAllLineToolButtons,
  updateSymmetryDisplay,
  computeMorphologyState,
  bitsChanged
} from '../gridButtonUtils.js'

/**
 * ColorPackedRectCanvas manages colored (packed) rectangular grids.
 * Adds color management, color cycling, and color-aware morphology operations.
 *
 * Note: Does NOT extend RectCanvas because ColorPackedDraw has a different
 * structure (grid.packed instead of grid.mask) that breaks parent assumptions.
 *
 * Key features:
 * - Works with ColorPackedDraw (4 colors per cell)
 * - Color values (1-4) instead of binary toggle
 * - Color cycling mode ('cycle') for automatic color rotation
 * - Morphology operations that preserve/add colors while modifying occupancy
 */
export class ColorPackedRectCanvas {
  constructor (canvasId, grid) {
    this.canvasId = canvasId
    this.grid = grid

    // Line tool state
    this.currentTool = null // null|'single'|'segment'|'ray'|'full'
    this.lineStart = null
    this.indexer = null
    this._lineToolsInitialized = false

    // Color management
    this.currentColor = '1' // '1'|'2'|'3'|'4'|'cycle'
    this.colorCycleIndex = 1
    this.coverType = 'normal' // 'normal'|'half'|'super'

    // Button references
    this.dilateBtn = null
    this.erodeBtn = null
    this.crossBtn = null
  }

  /**
   * Get the next color value based on current color setting.
   * If cycling, advances the cycle index.
   */
  getNextColor () {
    let color =
      this.currentColor === 'cycle'
        ? this.colorCycleIndex
        : parseInt(this.currentColor)

    if (this.currentColor === 'cycle') {
      this.colorCycleIndex =
        this.colorCycleIndex === 4 ? 1 : this.colorCycleIndex + 1
    }

    return color
  }

  /**
   * Compute line preview cells based on tool type and coverage mode.
   */
  computePreviewCells (start, end) {
    if (!start || !end || !this.indexer) return []

    const coordIndexer = (x, y) => [x, y]
    let coords = []

    switch (this.currentTool) {
      case 'segment':
        if (this.coverType === 'super') {
          coords = Array.from(
            this.indexer.superCoverSegmentTo(
              start[0],
              start[1],
              end[0],
              end[1],
              coordIndexer
            )
          )
        } else if (this.coverType === 'half') {
          coords = Array.from(
            this.indexer.halfCoverSegmentTo(
              start[0],
              start[1],
              end[0],
              end[1],
              coordIndexer
            )
          )
        } else {
          coords = Array.from(
            this.indexer.segmentTo(
              start[0],
              start[1],
              end[0],
              end[1],
              coordIndexer
            )
          )
        }
        break
      case 'ray':
        if (this.coverType === 'super') {
          coords = Array.from(
            this.indexer.superCoverRay(
              start[0],
              start[1],
              end[0],
              end[1],
              coordIndexer
            )
          )
        } else if (this.coverType === 'half') {
          coords = Array.from(
            this.indexer.halfCoverRay(
              start[0],
              start[1],
              end[0],
              end[1],
              coordIndexer
            )
          )
        } else {
          coords = Array.from(
            this.indexer.ray(start[0], start[1], end[0], end[1], coordIndexer)
          )
        }
        break
      case 'full':
        if (this.coverType === 'super') {
          coords = Array.from(
            this.indexer.superCoverFullLine(
              start[0],
              start[1],
              end[0],
              end[1],
              coordIndexer
            )
          )
        } else if (this.coverType === 'half') {
          coords = Array.from(
            this.indexer.halfCoverFullLine(
              start[0],
              start[1],
              end[0],
              end[1],
              coordIndexer
            )
          )
        } else {
          coords = Array.from(
            this.indexer.fullLine(
              start[0],
              start[1],
              end[0],
              end[1],
              coordIndexer
            )
          )
        }
        break
    }
    return coords
  }

  /**
   * Draw line by applying color values to all cells in the path.
   */
  drawLineBetween (start, end) {
    if (!this.grid) return
    const coords = this.computePreviewCells(start, end)
    const packed = this.grid.packed
    coords.forEach(([x, y]) => {
      packed.set(x, y, this.getNextColor())
    })
  }

  /**
   * Set the current line tool.
   */
  setTool (tool) {
    this.currentTool = tool
    this.lineStart = null
    if (this.grid) {
      this.grid.previewCells = []
    }
  }

  /**
   * Create an occupancy grid from the packed grid for morphology operations.
   */
  createOccupancyGrid (packed) {
    const occ = new Packed(packed.width, packed.height)
    for (let y = 0; y < packed.height; y++) {
      for (let x = 0; x < packed.width; x++) {
        const color = packed.at(x, y)
        if (color !== 0) {
          occ.set(x, y, 1)
        }
      }
    }
    return occ
  }

  /**
   * Check what changes a morphology operation would make without applying it.
   */
  checkOccupancyMorphologyState (packed, operation) {
    const occ = this.createOccupancyGrid(packed)
    const before = occ.bits
    this.applyMorphologyToOccupancy(occ, operation)
    const after = occ.bits
    const added = after & ~before
    const removed = before & ~after
    return { added, removed }
  }

  /**
   * Apply a morphology operation to an occupancy grid.
   */
  applyMorphologyToOccupancy (occupancy, operation) {
    if (operation === 'dilate') {
      occupancy.dilate()
    } else if (operation === 'erode') {
      occupancy.erode()
    } else if (operation === 'cross') {
      occupancy.dilateCross()
    }
  }

  /**
   * Update packed grid colors based on morphology changes.
   */
  updatePackedGridFromMorphology (packed, added, removed) {
    this.colorAddedCells(packed, added)
    const indexer = packed.indexer || new RectIndex(packed.width, packed.height)
    const addedCoords = Array.from(indexer.bitsToCoords(added))

    for (const [x, y] of addedCoords) {
      if (packed.at(x, y) === 0) {
        let color = 0
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1]
        ]) {
          if (nx >= 0 && nx < packed.width && ny >= 0 && ny < packed.height) {
            const neighborColor = packed.at(nx, ny)
            if (neighborColor !== 0) {
              color = neighborColor
              break
            }
          }
        }
        if (color !== 0) {
          packed.set(x, y, color)
        }
      }
    }

    this.clearRemovedCells(packed, removed)
  }

  /**
   * Color newly added cells by finding colors from neighbors.
   */
  colorAddedCells (packed, added) {
    const indexer = packed.indexer || new RectIndex(packed.width, packed.height)
    const addedCoords = Array.from(indexer.bitsToCoords(added))

    for (const [x, y] of addedCoords) {
      let color = 0
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y - 1],
        [x + 1, y + 1]
      ]

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < packed.width && ny >= 0 && ny < packed.height) {
          const neighborColor = packed.at(nx, ny)
          if (neighborColor !== 0) {
            color = neighborColor
            break
          }
        }
      }

      if (color !== 0) {
        packed.set(x, y, color)
      }
    }
  }

  /**
   * Clear removed cells in packed grid.
   */
  clearRemovedCells (packed, removed) {
    const indexer = packed.indexer || new RectIndex(packed.width, packed.height)
    const removedCoords = Array.from(indexer.bitsToCoords(removed))
    removedCoords.forEach(([x, y]) => {
      packed.clear(x, y)
    })
  }

  /**
   * Apply a morphology operation to the packed grid.
   */
  applyMorphologyOperation (operation) {
    if (!this.grid) return

    const packed = this.grid.packed
    const { added, removed } = this.checkOccupancyMorphologyState(
      packed,
      operation
    )
    this.updatePackedGridFromMorphology(packed, added, removed)

    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Apply a transform operation.
   */
  applyTransform (mapName) {
    if (!this.grid) return
    const packed = this.grid.packed
    const actions = packed.actions
    if (!actions) return

    const maps = actions.transformMaps
    const store = actions.store || packed.store
    const indexer = actions.indexer || packed.indexer

    if (store && indexer) {
      let transformedBits = store.newWords()
      for (let i = 0; i < indexer.size; i++) {
        const value = store.getIdx(packed.bits, i)
        if (value !== 0) {
          const mappedIdx = maps[mapName][i]
          store.setAtIdx(transformedBits, mappedIdx, value)
        }
      }
      packed.bits = transformedBits
    } else {
      packed.bits = actions.applyMap(maps[mapName])
    }

    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Get capabilities for transforms on packed grid.
   */
  getTransformCapabilities () {
    if (!this.grid) return {}
    const packed = this.grid.packed
    const actions = packed.actions
    if (!actions) return {}

    const maps = actions.transformMaps
    const template = actions.template

    return {
      canRotateCW: actions.applyMap(maps.r90) !== template,
      canRotateCCW: actions.applyMap(maps.r270) !== template,
      canFlipH: actions.applyMap(maps.fx) !== template,
      canFlipV: actions.applyMap(maps.fy) !== template
    }
  }

  /**
   * Get capabilities for morphology operations on packed grid.
   */
  getMorphologyCapabilities () {
    if (!this.grid) return {}
    const packed = this.grid.packed
    const canDilate = computeMorphologyState(packed, 'dilate', bitsChanged)
    const canErode = computeMorphologyState(packed, 'erode', bitsChanged)
    const canCross = computeMorphologyState(packed, 'cross', bitsChanged)

    return { canDilate, canErode, canCross }
  }

  /**
   * Update button states based on grid capabilities.
   * Updates symmetry display and transform/morphology button disabled states.
   */
  updateButtonStates () {
    if (!this.grid) return
    const actions = this.grid.packed.actions
    if (!actions) return

    // Update transform button states
    const transforms = this.getTransformCapabilities()
    const rotateCwBtn = document.getElementById('rotate-cw2')
    const rotateCcwBtn = document.getElementById('rotate-ccw2')
    const flipHBtn = document.getElementById('flip-h2')
    const flipVBtn = document.getElementById('flip-v2')

    if (rotateCwBtn) rotateCwBtn.disabled = !transforms.canRotateCW
    if (rotateCcwBtn) rotateCcwBtn.disabled = !transforms.canRotateCCW
    if (flipHBtn) flipHBtn.disabled = !transforms.canFlipH
    if (flipVBtn) flipVBtn.disabled = !transforms.canFlipV

    // Update morphology button states
    const morph = this.getMorphologyCapabilities()
    const dilateBtn = document.getElementById('dilate2')
    const erodeBtn = document.getElementById('erode2')
    const crossBtn = document.getElementById('cross-dilate2')

    if (dilateBtn) dilateBtn.disabled = !morph.canDilate
    if (erodeBtn) erodeBtn.disabled = !morph.canErode
    if (crossBtn) crossBtn.disabled = !morph.canCross

    // Update symmetry display
    const symEl = document.getElementById('rectcolor-symmetry')
    if (symEl) {
      updateSymmetryDisplay(symEl, actions)
    }
  }

  /**
   * Initialize line tools.
   */
  initializeLineTools () {
    if (!this.grid) return
    if (this._lineToolsInitialized) return

    this.indexer = new RectIndex(this.grid.width, this.grid.height)
    this.grid.previewCells = []
    this._lineToolsInitialized = true

    const origToggle = this.grid?.toggleCell?.bind(this.grid)
    if (origToggle) {
      this.grid.toggleCell = location => {
        if (this.currentTool || location == null) return
        return origToggle(location)
      }
    }
  }

  /**
   * Wire line tool buttons using utility function.
   */
  wireLineToolButtons () {
    if (!this.grid || typeof document === 'undefined') return

    const toolMap = {
      single: null,
      segment: 'segment',
      ray: 'ray',
      full: 'full'
    }
    wireAllLineToolButtons('input[name="line-tool2"]', toolMap, tool =>
      this.setTool(tool)
    )
  }

  /**
   * Wire line color dropdown.
   */
  wireLineColorDropdown () {
    if (typeof document === 'undefined') return
    const dropdown = document.getElementById('line-color')
    if (dropdown) {
      dropdown.addEventListener('change', e => {
        this.currentColor = e.target.value
        this.colorCycleIndex = 1
      })
    }
  }

  /**
   * Wire cover type radios.
   */
  wireCoverTypeRadios () {
    if (typeof document === 'undefined') return
    const radios = document.querySelectorAll('input[name="cover-type2"]')
    if (!radios || radios.length === 0) return
    radios.forEach(radio => {
      radio.addEventListener('change', e => {
        if (e.target.checked) {
          this.coverType = e.target.value
        }
      })
    })
  }

  /**
   * Wire action buttons.
   */
  wireActionButtons () {
    if (!this.grid || typeof document === 'undefined') return

    const maskMutations = {
      empty2: () => this.grid.packed.emptyMask.bits,
      full2: () => this.grid.packed.fullMask.bits,
      inverse2: () => this.grid.packed.invertedMask.bits,
      'outer-border2': () => this.grid.packed.outerBorderMask.bits,
      'outer-area2': () => this.grid.packed.outerAreaMask.bits,
      'inner-border2': () => this.grid.packed.innerBorderMask.bits,
      'inner-area2': () => this.grid.packed.innerAreaMask.bits
    }

    Object.entries(maskMutations).forEach(([id, getMaskBits]) => {
      const el = document.getElementById(id)
      if (el) {
        el.addEventListener('click', () => {
          if (this.grid && getMaskBits) {
            this.grid.packed.bits = getMaskBits()
            this.grid.redraw()
            this.updateButtonStates()
          }
        })
      }
    })
  }

  /**
   * Wire transform buttons.
   */
  wireTransformButtons () {
    if (!this.grid || typeof document === 'undefined') return

    const buttonMap = {
      'rotate-cw2': 'r90',
      'rotate-ccw2': 'r270',
      'flip-h2': 'fx',
      'flip-v2': 'fy'
    }

    Object.entries(buttonMap).forEach(([btnId, mapName]) => {
      const btn = document.getElementById(btnId)
      if (btn) {
        btn.addEventListener('click', () => {
          this.applyTransform(mapName)
        })
      }
    })
  }

  /**
   * Wire morphology buttons.
   */
  wireMorphologyButtons () {
    if (!this.grid || typeof document === 'undefined') return
    ;['dilate2', 'erode2', 'cross-dilate2'].forEach(id => {
      const btn = document.getElementById(id)
      if (btn) {
        btn.addEventListener('click', () => {
          const operation =
            id === 'dilate2' ? 'dilate' : id === 'erode2' ? 'erode' : 'cross'
          this.applyMorphologyOperation(operation)
        })
      }
    })
  }

  /**
   * Get canvas hit test coordinates.
   */
  getCanvasHitTest (e) {
    if (!this.grid || !this.grid.canvas) return null
    const rect = this.grid.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left - this.grid.offsetX
    const y = e.clientY - rect.top - this.grid.offsetY
    const gridX = Math.round(x / this.grid.cellSize)
    const gridY = Math.round(y / this.grid.cellSize)

    if (this.indexer && this.indexer.isValid(gridX, gridY)) {
      return [gridX, gridY]
    }
    return null
  }

  /**
   * Handle canvas move events.
   */
  onCanvasMove (e) {
    if (!this.grid || !this.currentTool || !this.lineStart) return
    const hit = this.getCanvasHitTest(e)
    if (hit) {
      this.grid.previewCells = this.computePreviewCells(this.lineStart, hit)
      this.grid.redraw()
    }
  }

  /**
   * Handle canvas click events.
   */
  onCanvasClick (e) {
    if (!this.grid || !this.currentTool) return
    const hit = this.getCanvasHitTest(e)
    if (!hit) return

    if (!this.lineStart) {
      this.lineStart = hit
      this.grid.previewCells = []
      this.grid.redraw()
    } else {
      this.drawLineBetween(this.lineStart, hit)
      this.lineStart = null
      this.grid.previewCells = []
      this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Attach canvas listeners.
   */
  attachCanvasListeners () {
    if (!this.grid) return
    if (this.grid.canvas.__colorPackedListenerAttached) return
    this.grid.canvas.__colorPackedListenerAttached = true

    this.grid.canvas.addEventListener('mousemove', e => this.onCanvasMove(e))
    this.grid.canvas.addEventListener('click', e => this.onCanvasClick(e))
  }

  /**
   * Initialize all UI components.
   */
  initializeAll () {
    this.initializeLineTools()
    this.wireLineToolButtons()
    this.wireLineColorDropdown()
    this.wireCoverTypeRadios()
    this.wireActionButtons()
    this.wireTransformButtons()
    this.wireMorphologyButtons()
    this.attachCanvasListeners()
  }
}
