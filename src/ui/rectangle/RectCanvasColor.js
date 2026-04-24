import { RectCanvas } from './RectCanvas.js'

/**
 * Enhanced rectangular grid canvas supporting multi-color rendering
 * Supports 2, 4, 16, and 256 colors
 * Adds color selection, cycling, and palette UI
 */
export class RectCanvasColor extends RectCanvas {
  // ============================================================================
  // Constants
  // ============================================================================

  /** Default selected color value */
  static get DEFAULT_SELECTED_COLOR () {
    return 1
  }

  /** Minimum color value */
  static get MIN_COLOR_VALUE () {
    return 0
  }

  /** Border width for selected color swatch */
  static get SELECTED_SWATCH_BORDER_WIDTH () {
    return '3px'
  }

  /** Border color for selected color swatch */
  static get SELECTED_SWATCH_BORDER_COLOR () {
    return 'gold'
  }

  /** Border width for unselected color swatch */
  static get UNSELECTED_SWATCH_BORDER_WIDTH () {
    return '1px'
  }

  /** Border color for unselected color swatch */
  static get UNSELECTED_SWATCH_BORDER_COLOR () {
    return '#333'
  }

  /** Color swatch size in pixels */
  static get SWATCH_SIZE () {
    return '30px'
  }

  /** Color swatch margin */
  static get SWATCH_MARGIN () {
    return '2px'
  }

  /** Color display border width */
  static get COLOR_DISPLAY_BORDER_WIDTH () {
    return '8px'
  }

  /** Maximum colors for palette swatches (performance limit) */
  static get MAX_SWATCH_PALETTE_SIZE () {
    return 16
  }

  /** Fallback color for invalid palette entries */
  static get FALLBACK_COLOR () {
    return '#000000'
  }

  /**
   * Create a new RectCanvasColor instance
   * @param {string} canvasId - ID of the canvas element
   * @param {Object} rectDrawColor - The underlying color drawing implementation
   * @param {Object} [config={}] - Configuration options
   */
  constructor (canvasId, rectDrawColor, config = {}) {
    super(canvasId, rectDrawColor, config)
    this.rectDraw = rectDrawColor
    this.selectedColor = RectCanvasColor.DEFAULT_SELECTED_COLOR
    this.bitsPerCell = rectDrawColor.bitsPerCell
    this.maxColor = rectDrawColor.maxColor
    this.colorPalette = rectDrawColor.getPalette()
  }

  /**
   * Override toggle cell behavior to support color operations
   * Replaces the default toggle with color-aware actions (set, clear, cycle)
   */
  setupToggleCellOverride () {
    if (!this.grid || !this.grid.toggleCell) return

    const originalToggle = this.grid.toggleCell.bind(this.grid)
    this.grid.toggleCell = location => {
      this._handleCellToggle(location)
    }
  }

  /**
   * Handle cell toggle based on current action mode
   * @param {Array<number>|null} location - [x, y] coordinates or null
   * @private
   */
  _handleCellToggle (location) {
    // Don't toggle when line tool is active
    if (this.currentTool) return

    if (location !== null) {
      const [x, y] = location
      this._performColorAction(x, y)
      this.grid.redraw()
    }
  }

  /**
   * Perform the appropriate color action based on current action mode
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @private
   */
  _performColorAction (x, y) {
    switch (this.currentAction) {
      case 'set':
        this.grid.setColorValue(x, y, this.selectedColor)
        break
      case 'clear':
        this.grid.setColorValue(x, y, RectCanvasColor.MIN_COLOR_VALUE)
        break
      case 'toggle':
        this.grid.cycleColor(x, y)
        break
    }
  }

  /**
   * Set the currently selected color
   * @param {number} colorValue - Color value to select (clamped to valid range)
   */
  setSelectedColor (colorValue) {
    this.selectedColor = Math.max(
      RectCanvasColor.MIN_COLOR_VALUE,
      Math.min(colorValue, this.maxColor)
    )
    this._updateColorDisplay()
  }

  /**
   * Get currently selected color
   * @returns {number} The currently selected color value
   */
  getSelectedColor () {
    return this.selectedColor
  }

  /**
   * Cycle selected color to next value (wraps around to 0)
   */
  cycleSelectedColor () {
    this.selectedColor = (this.selectedColor + 1) % (this.maxColor + 1)
    this._updateColorDisplay()
  }

  /**
   * Fill entire grid with currently selected color
   */
  fillGridWithColor () {
    if (!this.grid) return
    this.grid.fillWithColor(this.selectedColor)
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Fill entire grid with specific color
   * @param {number} colorValue - Color value to fill with
   */
  fillWith (colorValue) {
    if (!this.grid) return
    this.grid.fillWithColor(colorValue)
    this.grid.redraw()
    this.updateButtonStates()
  }

  /**
   * Update color display in UI with current selection
   * @private
   */
  _updateColorDisplay () {
    const colorDisplay = document.getElementById('color-display')
    if (!colorDisplay) return

    const hexColor =
      this.colorPalette[this.selectedColor] || RectCanvasColor.FALLBACK_COLOR
    const percentage = Math.round((this.selectedColor / this.maxColor) * 100)

    colorDisplay.textContent = `Color: ${this.selectedColor}/${this.maxColor} (${percentage}%) ${hexColor}`
    colorDisplay.style.borderLeft = `${RectCanvasColor.COLOR_DISPLAY_BORDER_WIDTH} solid ${hexColor}`
  }

  /**
   * Get color information for a specific cell
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string} Color information string
   */
  getColorInfo (x, y) {
    if (!this.grid) return ''
    return this.grid.getColorInfo(x, y)
  }

  /**
   * Update hover info display with position, index, and color information
   * @param {MouseEvent} e - Mouse event
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

    const hoverInfo = this._buildHoverInfo(hit)
    hoverLabel.textContent = hoverInfo
  }

  /**
   * Build hover information string for a cell
   * @param {Array<number>} hit - [x, y] coordinates
   * @returns {string} Formatted hover information
   * @private
   */
  _buildHoverInfo (hit) {
    const [x, y] = hit
    const idx = this.indexer.index(x, y)
    const neighborCount = this._countValidNeighbors(x, y)
    const colorInfo = this.getColorInfo(x, y)

    return `(${x}, ${y}) idx: ${idx} neighbors: ${neighborCount} | ${colorInfo}`
  }

  /**
   * Count valid neighboring cells
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Number of valid neighbors
   * @private
   */
  _countValidNeighbors (x, y) {
    const neighbors = this.indexer.neighbors(x, y)
    return neighbors.filter(([nx, ny]) => this.indexer.isValid(nx, ny)).length
  }

  /**
   * Download current color palette as JSON file
   */
  downloadPalette () {
    const paletteData = this._buildPaletteData()
    const json = JSON.stringify(paletteData, null, 2)
    this._downloadJsonFile(json, `palette-${this.bitsPerCell}bit.json`)
  }

  /**
   * Build palette data object for export
   * @returns {Object} Palette data structure
   * @private
   */
  _buildPaletteData () {
    return {
      bitsPerCell: this.bitsPerCell,
      maxColors: this.maxColor + 1,
      colors: this.colorPalette
    }
  }

  /**
   * Download JSON content as a file
   * @param {string} jsonContent - JSON string to download
   * @param {string} filename - Name of the downloaded file
   * @private
   */
  _downloadJsonFile (jsonContent, filename) {
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()

    URL.revokeObjectURL(url)
  }

  /**
   * Initialize complete UI with all controls including color-specific features
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
   * Wire up all color-specific control buttons and inputs
   */
  wireColorControls () {
    if (typeof document === 'undefined') return

    this._wireColorInput()
    this._wireCycleButton()
    this._wireFillButton()
    this._wirePaletteSwatches()
    this._wireDownloadButton()
  }

  /**
   * Wire up the color value input/slider
   * @private
   */
  _wireColorInput () {
    const colorInput = document.getElementById('color-value-input')
    if (!colorInput) return

    colorInput.min = RectCanvasColor.MIN_COLOR_VALUE
    colorInput.max = this.maxColor
    colorInput.value = this.selectedColor

    const handleColorChange = e => {
      this.setSelectedColor(parseInt(e.target.value))
    }

    colorInput.addEventListener('change', handleColorChange)
    colorInput.addEventListener('input', handleColorChange)
  }

  /**
   * Wire up the cycle color button
   * @private
   */
  _wireCycleButton () {
    const cycleBtn = document.getElementById('cycle-color-btn')
    if (!cycleBtn) return

    cycleBtn.addEventListener('click', () => {
      this.cycleSelectedColor()
    })
  }

  /**
   * Wire up the fill with color button
   * @private
   */
  _wireFillButton () {
    const fillBtn = document.getElementById('fill-with-color-btn')
    if (!fillBtn) return

    fillBtn.addEventListener('click', () => {
      this.fillGridWithColor()
    })
  }

  /**
   * Wire up color palette swatches (only for small palettes)
   * @private
   */
  _wirePaletteSwatches () {
    const paletteContainer = document.getElementById('color-palette-swatches')
    if (
      !paletteContainer ||
      this.colorPalette.length > RectCanvasColor.MAX_SWATCH_PALETTE_SIZE
    ) {
      return
    }

    this.colorPalette.forEach((color, idx) => {
      const swatch = this._createColorSwatch(color, idx)
      paletteContainer.appendChild(swatch)
    })
  }

  /**
   * Create a color swatch button
   * @param {string} color - Hex color value
   * @param {number} index - Color index
   * @returns {HTMLButtonElement} The created swatch button
   * @private
   */
  _createColorSwatch (color, index) {
    const swatch = document.createElement('button')
    swatch.style.backgroundColor = color
    swatch.style.width = RectCanvasColor.SWATCH_SIZE
    swatch.style.height = RectCanvasColor.SWATCH_SIZE
    swatch.style.border = this._getSwatchBorderStyle(index)
    swatch.style.cursor = 'pointer'
    swatch.style.margin = RectCanvasColor.SWATCH_MARGIN
    swatch.title = `Color ${index}`

    swatch.addEventListener('click', () => {
      this._handleSwatchClick(index)
    })

    return swatch
  }

  /**
   * Get border style for a color swatch
   * @param {number} index - Color index
   * @returns {string} CSS border style
   * @private
   */
  _getSwatchBorderStyle (index) {
    const isSelected = this.selectedColor === index
    const width = isSelected
      ? RectCanvasColor.SELECTED_SWATCH_BORDER_WIDTH
      : RectCanvasColor.UNSELECTED_SWATCH_BORDER_WIDTH
    const color = isSelected
      ? RectCanvasColor.SELECTED_SWATCH_BORDER_COLOR
      : RectCanvasColor.UNSELECTED_SWATCH_BORDER_COLOR

    return `${width} solid ${color}`
  }

  /**
   * Handle color swatch click
   * @param {number} colorIndex - Index of clicked color
   * @private
   */
  _handleSwatchClick (colorIndex) {
    this.setSelectedColor(colorIndex)
    this._updateSwatchSelection()
  }

  /**
   * Update visual selection state of all swatches
   * @private
   */
  _updateSwatchSelection () {
    document
      .querySelectorAll('#color-palette-swatches button')
      .forEach((btn, i) => {
        btn.style.border = this._getSwatchBorderStyle(i)
      })
  }

  /**
   * Wire up the download palette button
   * @private
   */
  _wireDownloadButton () {
    const downloadBtn = document.getElementById('download-palette-btn')
    if (!downloadBtn) return

    downloadBtn.addEventListener('click', () => {
      this.downloadPalette()
    })
  }

  /**
   * Get comprehensive palette information
   * @returns {Object} Palette information including bits per cell, max colors, and color array
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
