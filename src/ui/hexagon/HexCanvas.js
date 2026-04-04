import { GridCanvas } from '../GridCanvas.js'
import {
  findRotationStepIndex,
  computeTransformedBits,
  checkMorphologyState,
  updateSymmetryAndDetails,
  wireAllLineToolButtons
} from '../gridButtonUtils.js'
import { drawHex, hexToPixel } from './hexdrawhelper.js'

/**
 * Hexagonal grid canvas UI controller
 * Manages UI and interactions for hexagonal grids
 */
export class HexCanvas extends GridCanvas {
  constructor (canvasId, hexDraw, config = {}) {
    super(canvasId, hexDraw, config)

    // Override cover type values for hex (uses superCover, halfCover instead of super, half)
    this.coverType = 'normal' // 'normal' | 'superCover' | 'halfCover'

    // Setup cell overrides
    this.setupToggleCellOverride()
    this.setupHoverPreviewOverride()
  }

  /**
   * Setup toggle cell to respect action value
   */
  setupToggleCellOverride () {
    if (!this.grid || !this.grid.toggleCell) return

    const origToggle = this.grid.toggleCell.bind(this.grid)
    this.grid.toggleCell = idx => {
      // Don't toggle when line tool active
      if (this.currentTool) return

      // Apply currentAction to single cell
      if (this.currentAction === 'set') {
        this.grid.mask.bits = this.grid.mask.setIndex(idx, 1)
      } else if (this.currentAction === 'clear') {
        this.grid.mask.bits = this.grid.mask.setIndex(idx, 0)
      } else if (this.currentAction === 'toggle') {
        let val
        if (typeof this.grid.mask.bits === 'bigint') {
          val = Number((this.grid.mask.bits >> BigInt(idx)) & 1n)
        } else {
          val = this.grid.mask.atIndex
            ? this.grid.mask.atIndex(idx)
            : (this.grid.mask.bits >> idx) & 1
        }
        this.grid.mask.bits = this.grid.mask.setIndex(idx, val ? 0 : 1)
      }

      this.grid.setBits(this.grid.mask.bits)
      if (typeof this.grid.redraw === 'function') this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Override hover drawing to show line preview in orange
   */
  setupHoverPreviewOverride () {
    if (!this.grid || !this.grid._drawHover) return
    if (this.grid._drawHover.__isOverridden) return

    const origDrawHover = this.grid._drawHover.bind(this.grid)
    this.grid._drawHover = function () {
      if (this.previewCells?.length) {
        for (const i of this.previewCells) {
          const [q, r] = this.indexer.coords[i]
          const { x, y } = hexToPixel(q, r, this.hexSize)
          drawHex(
            this.ctx,
            x + this.offsetX,
            y + this.offsetY,
            this.hexSize,
            '#FF9800'
          )
        }
      }
      origDrawHover()
    }
    this.grid._drawHover.__isOverridden = true
  }

  /**
   * Sync mask with draw and get current actions
   */
  syncMaskWithDraw () {
    this.grid.mask.bits = this.grid.bits
    return this.grid.mask.actions
  }

  /**
   * Get current actions
   */
  getCurrentActions () {
    return this.grid?.mask?.actions
  }

  /**
   * Get rotation step index from transform maps
   */
  getRotationStep (maps) {
    return findRotationStepIndex(maps)
  }

  /**
   * Get hit test result from canvas event
   */
  hitTest (e) {
    if (!this.grid) return null
    const rect = this.grid.canvas.getBoundingClientRect()
    return this.grid._hitTest(e.clientX - rect.left, e.clientY - rect.top)
  }

  /**
   * Compute preview indices for line drawing
   */
  computePreviewIndices (startIdx, endIdx) {
    if (startIdx == null || endIdx == null) return []
    if (!this.currentTool || this.currentTool === 'single') return []

    const indexer = this.grid.indexer
    const [sq, sr, ss] = indexer.coords[startIdx]
    const [eq, er, es] = indexer.coords[endIdx]
    let coords = []

    // Build method name based on tool and cover type
    let methodName = this.currentTool
    if (this.coverType === 'superCover') {
      methodName =
        'superCover' +
        this.currentTool.charAt(0).toUpperCase() +
        this.currentTool.slice(1)
    } else if (this.coverType === 'halfCover') {
      methodName =
        'halfCover' +
        this.currentTool.charAt(0).toUpperCase() +
        this.currentTool.slice(1)
    }

    if (typeof indexer[methodName] === 'function') {
      coords = Array.from(indexer[methodName](sq, sr, eq, er))
    } else {
      // Fallback to normal methods
      switch (this.currentTool) {
        case 'segment':
          coords = Array.from(indexer.segmentTo(sq, sr, eq, er))
          break
        case 'ray':
          coords = Array.from(indexer.ray(sq, sr, eq, er))
          break
        case 'full':
          coords = Array.from(indexer.fullLine(sq, sr, eq, er))
          break
        default:
          return []
      }
    }

    const inds = []
    for (const item of coords) {
      const q = item[0]
      const r = item[1]
      const s = -q - r
      const i = indexer.index(q, r, s)
      if (i !== undefined) inds.push(i)
    }
    return inds
  }

  /**
   * Update line preview on canvas
   */
  updateLinePreview (start, end) {
    if (!this.grid || this.currentTool === 'single' || !this.currentTool) return

    this.grid.previewCells = this.computePreviewIndices(start, end)
    this.grid.redraw()
  }

  /**
   * Complete line drawing - apply action to all cells in line
   */
  completeLine (start, end) {
    if (!this.grid) return
    const mask = this.grid.mask
    const inds = this.computePreviewIndices(start, end)

    for (const i of inds) {
      if (this.currentAction === 'set') {
        mask.bits = mask.setIndex(i, 1)
      } else if (this.currentAction === 'clear') {
        mask.bits = mask.setIndex(i, 0)
      } else if (this.currentAction === 'toggle') {
        let val
        if (typeof mask.bits === 'bigint') {
          val = Number((mask.bits >> BigInt(i)) & 1n)
        } else {
          val = mask.atIndex ? mask.atIndex(i) : (mask.bits >> i) & 1
        }
        mask.bits = mask.setIndex(i, val ? 0 : 1)
      }
    }

    // Ensure draw layer matches mask and refresh UI
    this.grid.setBits(mask.bits)
    if (typeof this.grid.redraw === 'function') this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Handle canvas click
   */
  onCanvasClick (e) {
    if (!this.grid || !this.currentTool) return

    const hit = this.hitTest(e)
    if (hit == null) return

    // Single mode: delegate to toggleCell
    if (this.currentTool === 'single') {
      this.grid.toggleCell(hit)
      return
    }

    // Line tool modes: use two-point drawing
    if (!this.lineStart) {
      this.setLineStartPoint(hit)
    } else {
      this.completeLine(this.lineStart, hit)
      this.lineStart = null
      this.grid.previewCells = []
      this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Update hover info with hex coordinates and neighbor count
   */
  updateHoverInfo (e) {
    if (!this.grid) return

    const hoverLabel = document.getElementById('hex-hover-info')
    if (!hoverLabel) return

    const hit = this.hitTest(e)
    if (hit === null || hit === undefined) {
      hoverLabel.textContent = 'Hover info: '
      return
    }

    const [q, r] = this.grid.indexer.coords[hit]
    const s = -q - r
    const neighbors = Array.from(this.grid.indexer.neighbors(q, r, s))
    const validNeighbors = neighbors.filter(([nq, nr, ns]) =>
      this.grid.indexer.isValid(nq, nr, ns)
    ).length

    hoverLabel.textContent = `Hover info: (${q}, ${r}, ${s}) index: ${hit} neighbors: ${validNeighbors}`
  }

  /**
   * Check if morphology operation would change mask
   */
  checkMorphology (op) {
    return checkMorphologyState(this.grid.mask, op)
  }

  /**
   * Get morphology operation capabilities
   */
  getMorphologyCapabilities () {
    return {
      canDilate: this.checkMorphology('dilate'),
      canErode: this.checkMorphology('erode'),
      canCross: this.checkMorphology('cross')
    }
  }

  /**
   * Update all button states
   */
  updateButtonStates () {
    if (!this.grid) return

    const mask = this.grid.mask
    const actions = this.getCurrentActions()
    const maps = actions?.transformMaps
    const b = this.grid.bits

    // Update rotate button
    if (this.rotateBtn) {
      const rStep = this.getRotationStep(maps)
      this.rotateBtn.disabled =
        rStep === null ||
        computeTransformedBits(mask, maps?.[rStep], actions) === b
    }

    // Update flip buttons
    if (this.flipButtons) {
      this.flipButtons.forEach(btn => {
        const mapIdx = Number(btn.dataset.map)
        const map = maps?.[mapIdx]
        btn.disabled = !map || computeTransformedBits(mask, map, actions) === b
      })
    }

    // Update morphology buttons
    const morph = this.getMorphologyCapabilities()
    if (this.dilateBtn) this.dilateBtn.disabled = !morph.canDilate
    if (this.erodeBtn) this.erodeBtn.disabled = !morph.canErode

    // Update symmetry display
    updateSymmetryAndDetails(
      document.getElementById('hex-symmetry'),
      document.getElementById('hex-symmetry-details'),
      actions,
      null
    )
  }

  /**
   * Apply transform operation
   */
  applyTransform (mapIndex) {
    if (!this.grid) return

    const mask = this.grid.mask
    const actions = this.syncMaskWithDraw()
    const maps = actions?.transformMaps
    const map = maps?.[mapIndex]
    if (!map) return

    const store = actions?.store || mask.store
    const indexer = actions?.indexer || mask.indexer

    if (store && indexer) {
      let transformedBits = store.empty
      for (const i of indexer.bitsIndices(mask.bits)) {
        transformedBits = store.addBit(transformedBits, map[i])
      }
      if (transformedBits !== this.grid.bits) {
        mask.bits = transformedBits
        this.grid.setBits(transformedBits)
        this.updateButtonStates()
      }
    } else {
      const newBits = actions?.applyMap?.(map)
      if (newBits && newBits !== this.grid.bits) {
        this.grid.setBits(newBits)
        this.updateButtonStates()
      }
    }
  }

  /**
   * Apply morphology operation
   */
  applyMorphology (operation) {
    if (!this.grid) return

    const mask = this.grid.mask
    this.syncMaskWithDraw()

    if (operation === 'dilate') mask.dilate()
    else if (operation === 'erode') mask.erode()
    else if (operation === 'cross') mask.dilateCross()

    this.grid.setBits(mask.bits)
    if (typeof this.grid.redraw === 'function') this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Get selectors for UI elements
   */
  getLineActionDropdown () {
    return document.getElementById('hex-line-action')
  }

  getCoverTypeRadioSelector () {
    return 'input[name="hex-line-cover"]'
  }

  /**
   * Wire line tool buttons
   */
  wireLineToolButtons () {
    if (typeof document === 'undefined') return

    const toolMap = {
      single: null,
      segment: 'segment',
      ray: 'ray',
      full: 'full'
    }
    wireAllLineToolButtons('input[name="hex-line-tool"]', toolMap, tool =>
      this.setTool(tool)
    )
  }

  /**
   * Wire rotate button
   */
  wireTransformButtons () {
    if (!this.rotateBtn) return
    this.rotateBtn.addEventListener('click', () => {
      const maps = this.getCurrentActions()?.transformMaps
      const rStep = this.getRotationStep(maps)
      if (rStep !== null) this.applyTransform(rStep)
    })

    if (this.flipButtons) {
      this.flipButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.map)
          this.applyTransform(idx)
        })
      })
    }
  }

  /**
   * Wire morphology buttons
   */
  wireMorphologyButtons () {
    if (this.dilateBtn) {
      this.dilateBtn.addEventListener('click', () => {
        this.applyMorphology('dilate')
      })
    }
    if (this.erodeBtn) {
      this.erodeBtn.addEventListener('click', () => {
        this.applyMorphology('erode')
      })
    }
  }

  /**
   * Wire mask mutation buttons
   */
  wireActionButtons () {
    if (!this.grid || typeof document === 'undefined') return

    const maskMutations = {
      empty: mask => mask.emptyMask.bits,
      full: mask => mask.fullMask.bits,
      inverse: mask => mask.invertedMask.bits
    }

    Object.entries(maskMutations).forEach(([id, getMaskBits]) => {
      const el = document.getElementById(id)
      if (el && el !== this.grid.canvas) {
        el.addEventListener('click', () => {
          this.grid.mask.bits = getMaskBits(this.grid.mask)
          this.grid.setBits(this.grid.mask.bits)
          this.grid.redraw()
          this.updateButtonStates()
        })
      }
    })
  }

  /**
   * Set example cells
   */
  setExampleCells () {
    if (!this.grid) return
    this.grid.setBitsFromCoords([
      [0, 0, 0],
      [1, -1, 0],
      [0, 1, -1]
    ])
  }

  /**
   * Full initialization
   */
  initializeAll () {
    if (!this.grid) return

    // Get and store button references
    this.rotateBtn = document.getElementById('rotateBtn')
    this.flipButtons = Array.from(document.querySelectorAll('.flipBtn'))
    this.dilateBtn = document.getElementById('dilateBtn')
    this.erodeBtn = document.getElementById('erodeBtn')

    this.setExampleCells()
    this.wireButtons()
    this.syncLineActionDropdown()
    this.syncCoverTypeRadios()
    this.attachCanvasListeners()
    this.grid.redraw()
    this.updateButtonStates()
  }
}
