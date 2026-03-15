import { RectCanvas } from './RectCanvas.js'

/**
 * Enhanced rectangular grid canvas supporting multi-color rendering
 * Supports 2, 4, 16, and 256 colors
 * Adds color selection, cycling, and palette UI
 */
export class RectCanvasColor extends RectCanvas {
  constructor (canvasId, rectDrawColor, config = {}) {
    super(canvasId, rectDrawColor, config)
    this.rectDraw = rectDrawColor
    this.selectedColor = 1 // Currently selected color value
    this.bitsPerCell = rectDrawColor.bitsPerCell
    this.maxColor = rectDrawColor.maxColor
    this.colorPalette = rectDrawColor.getPalette()
  }

  /**
   * Override toggle cell to set selected color instead
   */
  setupToggleCellOverride () {
    if (!this.grid || !this.grid.toggleCell) return

    const origToggle = this.grid.toggleCell.bind(this.grid)
    this.grid.toggleCell = location => {
      // Don't toggle when line tool active
      if (this.currentTool) return

      if (location !== null) {
        const [x, y] = location
        if (this.currentAction === 'set') {
          // Set to selected color
          this.grid.setColorValue(x, y, this.selectedColor)
        } else if (this.currentAction === 'clear') {
          // Clear to color 0
          this.grid.setColorValue(x, y, 0)
        } else if (this.currentAction === 'toggle') {
          // Cycle through colors
          this.grid.cycleColor(x, y)
        }
        this.grid.redraw()
      }
    }
  }

  /**
   * Set the currently selected color
   */
  setSelectedColor (colorValue) {
    this.selectedColor = Math.max(0, Math.min(colorValue, this.maxColor))
    this._updateColorDisplay()
  }

  /**
   * Get currently selected color
   */
  getSelectedColor () {
    return this.selectedColor
  }

  /**
   * Cycle selected color to next value
   */
  cycleSelectedColor () {
    this.selectedColor = (this.selectedColor + 1) % (this.maxColor + 1)
    this._updateColorDisplay()
  }

  /**
   * Fill entire grid with selected color
   */
  fillGridWithColor () {
    if (!this.grid) return
    this.grid.fillWithColor(this.selectedColor)
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Fill with specific color
   */
  fillWith (colorValue) {
    if (!this.grid) return
    this.grid.fillWithColor(colorValue)
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Update color display in UI
   * @private
   */
  _updateColorDisplay () {
    const colorDisplay = document.getElementById('color-display')
    if (!colorDisplay) return

    const hexColor = this.colorPalette[this.selectedColor] || '#000000'
    const percentage = Math.round((this.selectedColor / this.maxColor) * 100)

    colorDisplay.textContent = `Color: ${this.selectedColor}/${this.maxColor} (${percentage}%) ${hexColor}`
    colorDisplay.style.borderLeft = `8px solid ${hexColor}`
  }

  /**
   * Get color info for hover display
   */
  getColorInfo (x, y) {
    if (!this.grid) return ''
    return this.grid.getColorInfo(x, y)
  }

  /**
   * Update hover info to include color info
   */
  updateHoverInfo (e) {
    if (!this.grid || !this.indexer) return

    const hoverLabel = document.getElementById('rect-hover-info')
    if (!hoverLabel) return

    const hit = this.hitTest(e)
    if (!hit) {
      hoverLabel.textContent = 'Hover info: '
      return
    }

    const [x, y] = hit
    const idx = this.indexer.index(x, y)
    const neighbors = this.indexer.neighbors(x, y)
    const neighborCount = neighbors.filter(([nx, ny]) =>
      this.indexer.isValid(nx, ny)
    ).length

    const colorInfo = this.getColorInfo(x, y)
    hoverLabel.textContent = `(${x}, ${y}) idx: ${idx} neighbors: ${neighborCount} | ${colorInfo}`
  }

  /**
   * Download palette as JSON
   */
  downloadPalette () {
    const paletteData = {
      bitsPerCell: this.bitsPerCell,
      maxColors: this.maxColor + 1,
      colors: this.colorPalette
    }

    const json = JSON.stringify(paletteData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `palette-${this.bitsPerCell}bit.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Initialize full UI with color controls
   */
  initializeAll () {
    if (!this.grid) return

    this.setExampleCells()
    this.patchMaskSetClear()
    this.wireButtons()
    this.wireColorControls()
    this.syncLineActionDropdown()
    this.syncCoverTypeRadios()
    this.attachCanvasListeners()
    this.grid.redraw()
    this.updateButtonStates()
    this._updateColorDisplay()
  }

  /**
   * Wire color-specific control buttons
   */
  wireColorControls () {
    if (typeof document === 'undefined') return

    // Color slider/input
    const colorInput = document.getElementById('color-value-input')
    if (colorInput) {
      colorInput.min = 0
      colorInput.max = this.maxColor
      colorInput.value = this.selectedColor
      colorInput.addEventListener('change', e => {
        this.setSelectedColor(parseInt(e.target.value))
      })
      colorInput.addEventListener('input', e => {
        this.setSelectedColor(parseInt(e.target.value))
      })
    }

    // Cycle color button
    const cycleBtn = document.getElementById('cycle-color-btn')
    if (cycleBtn) {
      cycleBtn.addEventListener('click', () => {
        this.cycleSelectedColor()
      })
    }

    // Fill with color button
    const fillBtn = document.getElementById('fill-with-color-btn')
    if (fillBtn) {
      fillBtn.addEventListener('click', () => {
        this.fillGridWithColor()
      })
    }

    // Color palette buttons (if defined)
    const paletteContainer = document.getElementById('color-palette-swatches')
    if (paletteContainer && this.colorPalette.length <= 16) {
      // Only create swatches for small palettes
      this.colorPalette.forEach((color, idx) => {
        const swatch = document.createElement('button')
        swatch.style.backgroundColor = color
        swatch.style.width = '30px'
        swatch.style.height = '30px'
        swatch.style.border =
          this.selectedColor === idx ? '3px solid gold' : '1px solid #333'
        swatch.style.cursor = 'pointer'
        swatch.style.margin = '2px'
        swatch.title = `Color ${idx}`

        swatch.addEventListener('click', () => {
          this.setSelectedColor(idx)
          // Update all swatches
          document
            .querySelectorAll('#color-palette-swatches button')
            .forEach((btn, i) => {
              btn.style.border = i === idx ? '3px solid gold' : '1px solid #333'
            })
        })

        paletteContainer.appendChild(swatch)
      })
    }

    // Download palette button
    const downloadBtn = document.getElementById('download-palette-btn')
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.downloadPalette()
      })
    }
  }

  /**
   * Get palette info as displayable text
   */
  getPaletteInfo () {
    return {
      bitsPerCell: this.bitsPerCell,
      maxColors: this.maxColor + 1,
      colorsPerChannel: Math.ceil(Math.log2(this.maxColor + 1)),
      colors: this.colorPalette
    }
  }
}
