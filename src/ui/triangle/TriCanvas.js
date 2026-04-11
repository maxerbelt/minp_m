import { GridCanvas } from '../GridCanvas.js'
import { ActionsTri } from '../../grid/triangle/actionsTri.js'
import { drawTri, triToPixel, pixelToTri } from './triDrawHelper.js'
import { wireAllLineToolButtons } from '../gridButtonUtils.js'

/**
 * Triangular grid canvas UI controller
 * Manages UI and interactions for triangular grids
 */
export class TriCanvas extends GridCanvas {
  constructor (canvasId, triDraw, config = {}) {
    super(canvasId, triDraw, config)

    this.rotateBtn = null
    this.flipButtons = []
    this.flipButtonsContainer = null

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
      const mask = this.grid.mask
      if (this.currentAction === 'set') {
        mask.bits = mask.setIndex(idx, 1)
      } else if (this.currentAction === 'clear') {
        mask.bits = mask.setIndex(idx, 0)
      } else if (this.currentAction === 'toggle') {
        let val
        if (typeof mask.bits === 'bigint') {
          val = Number((mask.bits >> BigInt(idx)) & 1n)
        } else {
          val = mask.atIndex ? mask.atIndex(idx) : (mask.bits >> idx) & 1
        }
        mask.bits = mask.setIndex(idx, val ? 0 : 1)
      }

      this.grid.setBits(mask.bits)
      if (typeof this.grid.redraw === 'function') this.grid.redraw()
      this.updateButtonStates()
    }
  }

  /**
   * Override hover drawing to show line preview in orange
   */
  setupHoverPreviewOverride () {
    if (!this.grid || !this.grid._drawHover) return

    const origDrawHover = this.grid._drawHover.bind(this.grid)
    this.grid._drawHover = function () {
      if (this.previewCells?.length) {
        for (const i of this.previewCells) {
          const [r, c] = this.indexer.location(i)
          const { x, y } = triToPixel(r, c, this.triSize)
          const orient = c % 2 === 0 ? 'up' : 'down'
          let yoff = y
          if (orient === 'down') yoff -= this.triHeight * 0.3
          drawTri(
            this.ctx,
            x + this.offsetX,
            yoff + this.offsetY,
            this.triSize,
            '#FF9800',
            '#333',
            orient
          )
        }
      }
      origDrawHover()
    }
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
   * Get hit test result from canvas event (convert pixel to tri coords then to index)
   */
  hitTest (e) {
    if (!this.grid) return null

    const rect = this.grid.canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const [r, c] = pixelToTri(
      px - this.grid.offsetX,
      py - this.grid.offsetY,
      this.grid.triSize
    )

    if (!this.grid.indexer.isValid(r, c)) return null
    return this.grid.indexer.index(r, c)
  }

  /**
   * Compute preview indices for line drawing
   */
  computePreviewIndices (startIdx, endIdx) {
    if (startIdx == null || endIdx == null) return []
    if (!this.currentTool) return []

    const indexer = this.grid.indexer
    const [sr, sc] = indexer.location(startIdx)
    const [er, ec] = indexer.location(endIdx)
    const coverType = this.coverType || 'normal'
    let coords = []

    switch (this.currentTool) {
      case 'segment':
        if (coverType === 'half') {
          coords = Array.from(indexer.halfCoverSegmentTo(sr, sc, er, ec))
        } else if (coverType === 'super') {
          coords = Array.from(indexer.superCoverSegmentTo(sr, sc, er, ec))
        } else {
          coords = Array.from(indexer.segmentTo(sr, sc, er, ec))
        }
        break
      case 'ray':
        if (coverType === 'half') {
          coords = Array.from(indexer.halfCoverRay(sr, sc, er, ec))
        } else if (coverType === 'super') {
          coords = Array.from(indexer.superCoverRay(sr, sc, er, ec))
        } else {
          coords = Array.from(indexer.ray(sr, sc, er, ec))
        }
        break
      case 'full':
        if (coverType === 'half') {
          coords = Array.from(indexer.halfCoverFullLine(sr, sc, er, ec))
        } else if (coverType === 'super') {
          coords = Array.from(indexer.superCoverFullLine(sr, sc, er, ec))
        } else {
          coords = Array.from(indexer.fullLine(sr, sc, er, ec))
        }
        break
      default:
        return []
    }

    const inds = []
    for (const item of coords) {
      const r = item[0]
      const c = item[1]
      const i = indexer.index(r, c)
      if (i !== undefined) inds.push(i)
    }
    return inds
  }

  /**
   * Update line preview on canvas
   */
  updateLinePreview (start, end) {
    if (!this.grid || !this.currentTool) return

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
   * Update hover info with triangle coordinates and neighbor count
   */
  updateHoverInfo (e) {
    if (!this.grid) return

    const hoverLabel = document.getElementById('tri-hover-info')
    if (!hoverLabel) return

    const rect = this.grid.canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const [r, c] = pixelToTri(
      px - this.grid.offsetX,
      py - this.grid.offsetY,
      this.grid.triSize
    )

    if (!this.grid.indexer.isValid(r, c)) {
      hoverLabel.textContent = 'Hover info: '
      return
    }

    const idx = this.grid.indexer.index(r, c)
    const neighbors = Array.from(this.grid.indexer.neighbors(r, c))
    const validNeighbors = neighbors.filter(([nr, nc]) =>
      this.grid.indexer.isValid(nr, nc)
    ).length

    hoverLabel.textContent = `Hover info: (${r}, ${c}) index: ${idx} neighbors: ${validNeighbors}`
  }

  /**
   * Compute transformed bits using store/indexer pattern
   */
  computeTransformedBits (map, actions) {
    if (!map) return this.grid.bits

    actions = actions || this.getCurrentActions()
    const mask = this.grid.mask
    const store = actions.store || mask.store
    const indexer = actions.indexer || mask.indexer

    if (store && indexer) {
      let transformedBits = store.empty
      for (const i of indexer.bitsIndices(mask.bits)) {
        transformedBits = store.addBit(transformedBits, map[i])
      }
      return transformedBits
    }

    try {
      return actions.applyMap(map)
    } catch (e) {
      console.warn('Error applying map:', e)
      return mask.bits
    }
  }

  /**
   * Check if morphology operation would change mask
   */
  computeMorphChanged (op) {
    const mask = this.grid.mask
    const b = mask.bits
    const m = mask.clone
    m.bits = b
    if (op === 'dilate') m.dilate()
    else if (op === 'erode') m.erode()
    else if (op === 'cross') m.dilateCross()
    return m.bits !== b
  }

  /**
   * Get morphology operation capabilities
   */
  getMorphologyCapabilities () {
    return {
      canDilate: this.computeMorphChanged('dilate'),
      canErode: this.computeMorphChanged('erode'),
      canCross: this.computeMorphChanged('cross')
    }
  }

  /**
   * Update all button states
   */
  updateButtonStates () {
    if (!this.grid) return

    const mask = this.grid.mask
    const actions = this.syncMaskWithDraw()
    const maps = actions.transformMaps
    if (!maps) return

    // Determine which transforms would change the shape
    const b = this.grid.bits
    const rmap = maps.r120 || maps[1]

    // Update rotate button
    if (this.rotateBtn) {
      this.rotateBtn.disabled = rmap
        ? this.computeTransformedBits(rmap, actions) === b
        : true
    }

    // Update flip buttons
    this.flipButtons.forEach(btn => {
      const mapName = btn.dataset.map
      const map = maps[mapName]
      btn.disabled = map
        ? this.computeTransformedBits(map, actions) === b
        : true
    })

    // Update morphology buttons
    if (this.dilateBtn)
      this.dilateBtn.disabled = !this.computeMorphChanged('dilate')
    if (this.erodeBtn)
      this.erodeBtn.disabled = !this.computeMorphChanged('erode')
    if (this.crossBtn)
      this.crossBtn.disabled = !this.computeMorphChanged('cross')

    // Update symmetry display if element exists
    const symEl = document.getElementById('tri-symmetry')
    if (symEl) {
      try {
        const sym =
          (actions &&
            typeof actions.classifyOrbitType === 'function' &&
            actions.classifyOrbitType()) ||
          (mask.actions &&
            typeof mask.actions.classifyOrbitType === 'function' &&
            mask.actions.classifyOrbitType()) ||
          'n/a'
        symEl.textContent = `Symmetry: ${sym}`
      } catch (e) {
        symEl.textContent = 'Symmetry: n/a'
      }
    }

    // Update symmetry details if element exists
    const detailsEl = document.getElementById('tri-symmetry-details')
    if (detailsEl) {
      try {
        const mapsObj = actions
          ? actions.transformMaps
          : mask.actions.transformMaps
        const template = actions ? actions.template : mask.actions.template
        const mapKeys = mapsObj ? Object.keys(mapsObj).join(', ') : 'n/a'
        detailsEl.textContent = `Template: ${
          template || 'n/a'
        } — Maps: ${mapKeys}`
      } catch (e) {
        detailsEl.textContent = ''
      }
    }
  }

  /**
   * Apply transform operation
   */
  applyTransform (mapIndex) {
    const mask = this.grid.mask
    const actions = this.syncMaskWithDraw()
    const maps = actions.transformMaps
    const map = maps[mapIndex]
    if (!map) return

    const transformedBits = this.computeTransformedBits(map, actions)
    if (transformedBits !== this.grid.bits) {
      mask.bits = transformedBits
      this.grid.setBits(transformedBits)
      this.updateButtonStates()
    }
  }

  /**
   * Apply morphology operation
   */
  applyMorphology (operation) {
    if (!this.grid) return
    const mask = this.grid.mask

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
    return document.getElementById('tri-line-action')
  }

  getCoverTypeRadioSelector () {
    return 'input[name="tri-cover-type"]'
  }

  /**
   * Create flip buttons dynamically from transform map keys
   */
  createFlipButtons () {
    if (!this.flipButtonsContainer || !this.grid) return

    const actions = this.getCurrentActions()
    if (!actions) return

    const mapKeys = ['id', 'r120', 'r240', 'f0', 'f1', 'f2']
    const labels = ActionsTri.D3_LABELS || mapKeys

    mapKeys.forEach((key, i) => {
      if (key === 'id') return // Skip identity transform

      const btn = document.createElement('button')
      btn.className = 'flipBtn'
      btn.textContent = labels[i] || key
      btn.dataset.map = key
      btn.addEventListener('click', () => this.applyTransform(key))

      this.flipButtonsContainer.appendChild(btn)
      this.flipButtons.push(btn)
    })
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
    wireAllLineToolButtons('input[name="tri-line-tool"]', toolMap, tool =>
      this.setTool(tool)
    )
  }

  /**
   * Wire rotate button
   */
  wireTransformButtons () {
    if (!this.rotateBtn) return
    this.rotateBtn.addEventListener('click', () => this.applyTransform('r120'))
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
    if (this.crossBtn) {
      this.crossBtn.addEventListener('click', () => {
        this.applyMorphology('cross')
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
      [0, 0],
      [1, 0],
      [1, 1]
    ])
  }

  /**
   * Full initialization
   */
  initializeAll () {
    if (!this.grid) return

    // Get and store button references
    this.rotateBtn = document.getElementById('rotateBtn')
    this.flipButtonsContainer = document.getElementById('flipButtons')
    this.dilateBtn = document.getElementById('dilateBtn')
    this.erodeBtn = document.getElementById('erodeBtn')
    this.crossBtn = document.getElementById('crossDilateBtn')

    this.setExampleCells()
    this.createFlipButtons()
    this.wireButtons()
    this.syncLineActionDropdown()
    this.attachCanvasListeners()
    this.grid.redraw()
    this.updateButtonStates()
  }
}
