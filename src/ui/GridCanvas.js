/**
 * Base class for grid canvas UI controllers
 * Provides common infrastructure for hex, rect, and triangular grid UIs
 */
export class GridCanvas {
  constructor (canvasId, gridInstance, config = {}) {
    this.canvasId = canvasId
    this.grid = gridInstance
    this.canvas = gridInstance?.canvas || document.getElementById(canvasId)
    this.ctx = this.canvas?.getContext('2d')

    // Button references - subclasses can override
    this.rotateBtn = null
    this.dilateBtn = null
    this.erodeBtn = null
    this.crossBtn = null
    this.flipButtons = []

    // Line tool state
    this.currentTool = null // null | 'single' | 'segment' | 'ray' | 'full'
    this.lineStart = null
    this.currentAction = 'set' // 'set' | 'clear' | 'toggle'
    this.coverType = 'normal' // 'normal' | 'half' | 'super'

    // Grid-specific configuration
    this.config = config
    this.indexer = config.indexer || null

    // Initialize preview cells array if not present
    if (this.grid && !this.grid.previewCells) {
      this.grid.previewCells = []
    }

    // Track whether listeners have been attached to this instance
    this._canvasListenersAttached = false
  }

  /**
   * Initialize DOM element references and event listeners
   * Subclasses should call super.initialize() then set custom buttons
   */
  initialize () {
    if (!this.canvas || typeof document === 'undefined') return

    this.attachCanvasListeners()
    this.updateButtonStates()
  }

  /**
   * Attach canvas event listeners for line tools and hover
   */
  attachCanvasListeners () {
    if (!this.canvas) return
    if (this._canvasListenersAttached) return

    this._canvasListenersAttached = true
    if (this.canvas) this.canvas.__lineToolsListenersAttached = true
    this.canvas.addEventListener('mousemove', e => this.onCanvasMouseMove(e))
    this.canvas.addEventListener('mouseleave', () => {
      if (this.grid) {
        this.grid.hoverLocation = null
        this.grid.redraw()
      }
    })
    this.canvas.addEventListener('click', e => this.onCanvasClick(e))
  }

  /**
   * Handle canvas mouse move - update line preview and hover info
   */
  onCanvasMouseMove (e) {
    if (!this.grid) return

    const hit = this.hitTest(e)

    // Update hover preview on grid
    if (this.currentTool && this.lineStart != null) {
      // When drawing a line, show preview
      if (hit) {
        this.updateLinePreview(this.lineStart, hit)
      }
    } else {
      // When not drawing, show normal hover
      this.grid.hoverLocation = hit
      this.grid.redraw()
    }

    this.updateHoverInfo(e)
  }

  /**
   * Handle canvas click - start or complete line drawing
   */
  onCanvasClick (e) {
    if (!this.grid || !this.currentTool) return

    const hit = this.hitTest(e)
    if (!hit) return

    if (this.lineStart == null) {
      this.setLineStartPoint(hit)
    } else {
      this.completeLine(this.lineStart, hit)
      this.lineStart = null
    }
  }

  /**
   * Set line tool start point and clear preview
   */
  setLineStartPoint (point) {
    this.lineStart = point
    if (this.grid) {
      this.grid.previewCells = []
      this.grid.hoverLocation = null
      this.grid.redraw()
    }
  }

  /**
   * Clear line tool state
   */
  setTool (tool) {
    this.currentTool = tool
    this.lineStart = null
    if (this.grid) {
      this.grid.previewCells = []
    }
  }

  /**
   * Get hit test result from canvas event
   * Subclasses must implement coordinate-specific logic
   */
  hitTest (e) {
    throw new Error('Must implement hitTest')
  }

  /**
   * Update line preview cells based on tool and endpoints
   * Subclasses must implement coordinate-specific line algorithms
   */
  updateLinePreview (start, end) {
    throw new Error('Must implement updateLinePreview')
  }

  /**
   * Complete line drawing operation
   * Subclasses must implement action-specific logic
   */
  completeLine (start, end) {
    throw new Error('Must implement completeLine')
  }

  /**
   * Update hover info display
   * Subclasses must implement coordinate-specific formatting
   */
  updateHoverInfo (e) {
    throw new Error('Must implement updateHoverInfo')
  }

  /**
   * Update all button states based on current grid state
   * Subclasses can override for specific button configurations
   */
  updateButtonStates () {
    if (!this.grid) return
    // Subclasses implement specific button state logic
  }

  /**
   * Apply a transform operation
   * Subclasses must implement transform-specific logic
   */
  applyTransform (mapName) {
    throw new Error('Must implement applyTransform')
  }

  /**
   * Apply morphology operation
   * Subclasses must implement morphology-specific logic
   */
  applyMorphology (operation) {
    throw new Error('Must implement applyMorphology')
  }

  /**
   * Wire button event listeners
   * Subclasses should implement or call base implementation
   */
  wireButtons () {
    this.wireLineToolButtons()
    this.wireLineActionDropdown()
    this.wireCoverTypeRadios()
    this.wireTransformButtons()
    this.wireMorphologyButtons()
    this.wireActionButtons()
  }

  /**
   * Wire line tool radio buttons
   */
  wireLineToolButtons () {
    throw new Error('Must implement wireLineToolButtons')
  }

  /**
   * Wire line action dropdown (set, clear, toggle)
   */
  wireLineActionDropdown () {
    if (typeof document === 'undefined') return

    const dropdown = this.getLineActionDropdown()
    if (!dropdown) return

    const updateAction = e => {
      const value = e.target?.value || this.currentAction
      if (value === 'set' || value === 'clear' || value === 'toggle') {
        this.currentAction = value
      }
    }

    dropdown.addEventListener('change', updateAction)
    dropdown.addEventListener('input', updateAction)
  }

  /**
   * Wire cover type radio buttons
   */
  wireCoverTypeRadios () {
    if (typeof document === 'undefined') return

    const radios = document.querySelectorAll(this.getCoverTypeRadioSelector())
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
   * Wire transform buttons (rotate, flip)
   */
  wireTransformButtons () {
    throw new Error('Must implement wireTransformButtons')
  }

  /**
   * Wire morphology buttons (dilate, erode, cross)
   */
  wireMorphologyButtons () {
    throw new Error('Must implement wireMorphologyButtons')
  }

  /**
   * Wire mask mutation buttons (empty, full, inverse, etc.)
   */
  wireActionButtons () {
    throw new Error('Must implement wireActionButtons')
  }

  /**
   * Get selectors/elements for wiring (subclasses provide specific IDs)
   */
  getLineActionDropdown () {
    throw new Error('Must implement getLineActionDropdown')
  }

  getCoverTypeRadioSelector () {
    throw new Error('Must implement getCoverTypeRadioSelector')
  }

  /**
   * Sync line action dropdown to current state
   */
  syncLineActionDropdown () {
    const dropdown = this.getLineActionDropdown()
    if (dropdown && dropdown.value) {
      const value = dropdown.value
      if (value === 'set' || value === 'clear' || value === 'toggle') {
        this.currentAction = value
      }
    }
  }

  /**
   * Sync cover type radio buttons to current state
   */
  syncCoverTypeRadios () {
    const checked = document.querySelector(
      this.getCoverTypeRadioSelector() + ':checked'
    )
    if (checked && checked.value) {
      const value = checked.value
      if (
        value === 'normal' ||
        value === 'half' ||
        value === 'super' ||
        value === 'superCover' ||
        value === 'halfCover'
      ) {
        this.coverType = value
      }
    }
  }

  /**
   * Enable/disable a button
   */
  setButtonDisabled (btn, disabled) {
    if (btn) btn.disabled = disabled
  }

  /**
   * Redraw and update UI
   */
  refresh () {
    if (this.grid && typeof this.grid.redraw === 'function') {
      this.grid.redraw()
    }
    this.updateButtonStates()
  }
}
