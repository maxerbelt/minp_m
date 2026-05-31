import { RectDrawColor } from './grid/rectdrawcolor.js'
import { RectCanvasColor } from './ui/RectCanvasColor.js'

/**
 * @fileoverview Multi-Color Rectangular Grid Integration Module
 * @description Manages RectDrawColor and RectCanvasColor instances for multi-color grid interaction.
 * Provides color mode switching, palette management, and grid import/export functionality.
 * Supports 2, 4, 16, and 256 color modes (1, 2, 4, and 8 bits per cell).
 *
 * **Responsibilities**:
 * - Initialize and manage RectDrawColor rendering layer
 * - Initialize and manage RectCanvasColor UI interaction layer
 * - Handle color mode switching with grid reinitialization
 * - Provide export/import functionality (JSON, PNG)
 * - Wire UI controls for color selection and grid manipulation
 *
 * **Architecture**:
 * - Singleton instances of RectDrawColor and RectCanvasColor
 * - Lazy initialization on first use or DOM ready
 * - Automatic UI event wiring for buttons and radio controls
 *
 * @module rectmulticolor
 */

/**
 * @typedef {Object} GridExportData
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {number} bitsPerCell - Color depth (1, 2, 4, or 8 bits per cell)
 * @property {number} maxColors - Maximum number of colors available
 * @property {string[]} palette - Color palette hex values
 * @property {Array<{x: number, y: number, color: number}>} gridData - Cell color data
 */

/**
 * @typedef {Object} ColorModeInfo
 * @property {number} bitsPerCell - Bits per cell for current mode
 * @property {number} maxColors - Total number of colors in palette
 * @property {number} selectedColor - Currently selected color index
 * @property {string[]} palette - Hex color palette array
 * @property {string} description - Human-readable mode description
 */

/** Grid configuration constants */
const GRID_CONFIG = {
  cellSize: 50,
  offsetX: 50,
  offsetY: 50,
  width: 10,
  height: 10,
  defaultBitsPerCell: 2
}

/**
 * Singleton instance of RectDrawColor rendering layer.
 * Initialized on first use or when color mode changes.
 * @type {RectDrawColor|null}
 */
let rectDrawColor = null

/**
 * Singleton instance of RectCanvasColor UI interaction layer.
 * Initialized on first use or when color mode changes.
 * @type {RectCanvasColor|null}
 */
let rectCanvasColor = null

/**
 * Currently active color mode bit depth.
 * Tracks which bits-per-cell mode is active: 1, 2, 4, or 8.
 * @type {number}
 */
let currentBitsPerCell = GRID_CONFIG.defaultBitsPerCell

/**
 * Initialize multi-color grid with specific bit depth if not already initialized.
 * Creates both RectDrawColor rendering layer and RectCanvasColor UI layer.
 * Safe to call multiple times - returns true if already initialized or on success.
 *
 * **Initialization Flow**:
 * 1. Return true if already initialized
 * 2. Check for DOM availability (returns false in non-browser environments)
 * 3. Locate canvas element by ID
 * 4. Create RectDrawColor instance with bit depth
 * 5. Create RectCanvasColor UI wrapper
 * 6. Return success status
 *
 * @param {number} [bitsPerCell=2] - Color depth: 1, 2, 4, or 8 bits per cell
 * @returns {boolean} True if successfully initialized or already initialized, false otherwise
 * @throws {Error} Silently catches and logs errors during initialization
 */
function initializeColorGridIfNeeded (
  bitsPerCell = GRID_CONFIG.defaultBitsPerCell
) {
  if (rectDrawColor) return true
  if (typeof document === 'undefined') return false

  const canvas = document.getElementById('rect-multi-color')
  if (!canvas) return false

  currentBitsPerCell = bitsPerCell

  try {
    rectDrawColor = new RectDrawColor(
      'rect-multi-color',
      GRID_CONFIG.width,
      GRID_CONFIG.height,
      GRID_CONFIG.cellSize,
      GRID_CONFIG.offsetX,
      GRID_CONFIG.offsetY,
      bitsPerCell
    )

    rectCanvasColor = new RectCanvasColor('rect-multi-color', rectDrawColor, {
      width: GRID_CONFIG.width,
      height: GRID_CONFIG.height
    })

    return true
  } catch (err) {
    console.error('Failed to initialize color grid:', err)
    return false
  }
}

/**
 * Initialize color grid UI when DOM is ready.
 * Should be called once on page load to set up all event listeners and UI.
 * Performs lazy initialization of grid and UI components.
 *
 * **Side Effects**:
 * - Calls initializeColorGridIfNeeded() for grid setup
 * - Wires radio button event listeners for color mode selection
 * - Wires button event listeners for export/import functionality
 * - Creates and displays current color mode information
 *
 * @returns {void}
 */
function initializeColorUI () {
  if (rectCanvasColor) return
  if (typeof document === 'undefined') return

  if (!initializeColorGridIfNeeded(currentBitsPerCell)) return

  if (rectCanvasColor) {
    rectCanvasColor.initializeAll()
    wireColorModeRadios()
    wireExportImportButtons()
    createColorModeDisplay()
  }
}

/**
 * Switch to different color mode and reinitialize the grid.
 * Clears current grid instances and creates new ones with specified bit depth.
 * Updates UI display to reflect new color mode.
 *
 * **Side Effects**:
 * - Resets rectDrawColor and rectCanvasColor to null (forces reinitialization)
 * - Reinitializes all grid components
 * - Updates color mode display
 * - Clears any previous grid state
 *
 * @param {number} bitsPerCell - Target color depth (1, 2, 4, or 8 bits per cell)
 * @returns {void}
 */
function switchColorMode (bitsPerCell) {
  // Reset to allow re-initialization
  rectDrawColor = null
  rectCanvasColor = null

  if (!initializeColorGridIfNeeded(bitsPerCell)) return
  if (rectCanvasColor) {
    rectCanvasColor.initializeAll()
    createColorModeDisplay()
  }
}

/**
 * Get current color mode information.
 * Retrieves palette, color count, and descriptive information.
 *
 * @returns {ColorModeInfo|null} Color mode details or null if not initialized
 */
function getColorModeInfo () {
  if (!rectCanvasColor) return null

  return {
    bitsPerCell: rectCanvasColor.bitsPerCell,
    maxColors: rectCanvasColor.maxColor + 1,
    selectedColor: rectCanvasColor.selectedColor,
    palette: rectCanvasColor.colorPalette,
    description: `${rectCanvasColor.maxColor + 1}-color mode (${
      rectCanvasColor.bitsPerCell
    } bits per cell)`
  }
}

/**
 * Display current color mode information in the DOM.
 * Updates the color-mode-info element with mode description and selected color.
 *
 * **Side Effects**:
 * - Modifies DOM element #color-mode-info innerHTML
 *
 * @returns {void}
 */
function createColorModeDisplay () {
  const display = document.getElementById('color-mode-info')
  if (!display || !rectCanvasColor) return

  const info = getColorModeInfo()
  display.innerHTML = `
    <strong>${info.description}</strong><br>
    Selected Color: ${info.selectedColor} / ${info.maxColors - 1}
  `
}

/**
 * Set the currently selected color for drawing operations.
 *
 * **Precondition**: Initializes grid if needed
 *
 * @param {number} colorValue - Color index to select (0 to maxColors-1)
 * @returns {void}
 */
function setSelectedColor (colorValue) {
  if (initializeColorGridIfNeeded() && rectCanvasColor) {
    rectCanvasColor.setSelectedColor(colorValue)
  }
}

/**
 * Get the currently selected color index.
 *
 * @returns {number} Currently selected color index, or 0 if not initialized
 */
function getSelectedColor () {
  return rectCanvasColor ? rectCanvasColor.getSelectedColor() : 0
}

/**
 * Cycle to the next color in the palette.
 * Wraps around to color 0 after the last color.
 *
 * **Side Effects**:
 * - Updates internal selected color state
 * - May trigger UI updates through RectCanvasColor
 *
 * @returns {void}
 */
function cycleSelectedColor () {
  if (rectCanvasColor) {
    rectCanvasColor.cycleSelectedColor()
  }
}

/**
 * Fill the entire grid with the currently selected color.
 *
 * **Precondition**: Initializes grid if needed
 * **Side Effects**: Modifies all grid cell values
 *
 * @returns {void}
 */
function fillWithSelectedColor () {
  if (initializeColorGridIfNeeded() && rectCanvasColor) {
    rectCanvasColor.fillGridWithColor()
  }
}

/**
 * Fill the entire grid with a specific color value.
 *
 * **Precondition**: Initializes grid if needed
 * **Side Effects**: Modifies all grid cell values
 *
 * @param {number} colorValue - Color index to fill with (0 to maxColors-1)
 * @returns {void}
 */
function fillGridWithColor (colorValue) {
  if (initializeColorGridIfNeeded() && rectCanvasColor) {
    rectCanvasColor.fillWith(colorValue)
  }
}

/**
 * Export grid data as JSON object.
 * Captures complete grid state including dimensions, color mode, and all cell values.
 * Suitable for serialization and storage.
 *
 * **Data Structure**:
 * ```json
 * {
 *   "width": 10,
 *   "height": 10,
 *   "bitsPerCell": 2,
 *   "maxColors": 4,
 *   "palette": ["#000000", "#ffffff", ...],
 *   "gridData": [{"x": 0, "y": 0, "color": 1}, ...]
 * }
 * ```
 *
 * @returns {GridExportData|null} Grid data object or null if not initialized
 */
function exportAsJSON () {
  if (!rectDrawColor) return null

  const data = {
    width: rectDrawColor.width,
    height: rectDrawColor.height,
    bitsPerCell: rectDrawColor.bitsPerCell,
    maxColors: rectDrawColor.maxColor + 1,
    palette: rectDrawColor.getPalette(),
    gridData: []
  }

  // Store grid as flat array
  for (let y = 0; y < rectDrawColor.height; y++) {
    for (let x = 0; x < rectDrawColor.width; x++) {
      data.gridData.push({
        x,
        y,
        color: rectDrawColor.mask.at(x, y)
      })
    }
  }

  return data
}

/**
 * Import grid data from JSON object or string.
 * Restores grid state from exported data. Validates bit depth compatibility.
 * Skips cells outside grid bounds, allowing partial imports from different grid sizes.
 *
 * **Side Effects**:
 * - Modifies all grid cells to match imported data
 * - Calls rectDrawColor.redraw() to update display
 * - Logs warning if importing into different bit depth mode
 *
 * **Error Handling**:
 * - Returns false if jsonData is null/undefined
 * - Returns false if JSON parsing fails
 * - Returns false if grid is not initialized
 * - Logs error details to console
 *
 * @param {GridExportData|string} jsonData - Grid data object or JSON string
 * @returns {boolean} True if import succeeded, false otherwise
 */
function importFromJSON (jsonData) {
  if (!rectDrawColor || !jsonData) return false

  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData

    // Validate compatible mode
    if (data.bitsPerCell !== rectDrawColor.bitsPerCell) {
      console.warn(
        `Color mode mismatch: importing ${data.bitsPerCell} bit data into ${rectDrawColor.bitsPerCell} bit grid`
      )
    }

    // Restore grid
    data.gridData.forEach(cell => {
      if (cell.x < rectDrawColor.width && cell.y < rectDrawColor.height) {
        rectDrawColor.setColorValue(cell.x, cell.y, cell.color)
      }
    })

    rectDrawColor.redraw()
    return true
  } catch (err) {
    console.error('Failed to import JSON:', err)
    return false
  }
}

/**
 * Download grid as PNG image file.
 * Triggers browser download dialog for PNG export of current grid visualization.
 * Filename includes bit depth and timestamp.
 *
 * **Precondition**: Requires canvas with toDataURL() support (all modern browsers)
 * **Side Effects**: Triggers file download in browser
 *
 * @returns {void}
 */
function downloadAsImage () {
  if (!rectDrawColor) return

  const canvas = rectDrawColor.canvas
  if (!canvas.toDataURL) return

  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `color-grid-${rectDrawColor.bitsPerCell}bit-${Date.now()}.png`
  link.click()
}

/**
 * Download grid as JSON file.
 * Triggers browser download dialog for JSON export of grid data.
 * Creates formatted JSON with proper indentation.
 * Filename includes bit depth and timestamp.
 *
 * **Side Effects**:
 * - Calls exportAsJSON() to get grid data
 * - Creates Blob URL (must be revoked after download)
 * - Triggers file download in browser
 * - Cleans up Blob URL
 *
 * @returns {void}
 */
function downloadAsJSON () {
  const data = exportAsJSON()
  if (!data) return

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `color-grid-${
    rectDrawColor.bitsPerCell
  }bit-${Date.now()}.json`
  link.click()

  URL.revokeObjectURL(url)
}

/**
 * Wire color mode selection radio buttons to color mode switching.
 * Attaches change event listeners to all radio buttons with name "color-bits-mode".
 * Extracts bits-per-cell value from radio button value attribute and switches mode.
 *
 * **Event Flow**:
 * 1. User clicks radio button
 * 2. 'change' event fires
 * 3. Extract bits value from radio.value
 * 4. Call switchColorMode(bits) to reinitialize
 *
 * **DOM Expectation**:
 * ```html
 * <input type="radio" name="color-bits-mode" value="1">
 * <input type="radio" name="color-bits-mode" value="2">
 * <input type="radio" name="color-bits-mode" value="4">
 * <input type="radio" name="color-bits-mode" value="8">
 * ```
 *
 * @returns {void}
 */
function wireColorModeRadios () {
  if (typeof document === 'undefined') return

  const radios = document.querySelectorAll('input[name="color-bits-mode"]')
  radios.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.checked) {
        const bits = Number.parseInt(e.target.value, 10)
        switchColorMode(bits)
      }
    })
  })
}

/**
 * Wire export/import buttons to download and file upload handlers.
 * Attaches event listeners to download buttons and file input.
 * Handles grid export as PNG and JSON, and JSON file import.
 *
 * **DOM Expectations**:
 * - #download-color-grid-image: Button to download PNG
 * - #download-color-grid-json: Button to download JSON
 * - #import-color-grid-json: File input for JSON import
 *
 * **Event Flows**:
 * - Download buttons: Click → download handler → triggers file download
 * - File input: Change → file reader → JSON parse → importFromJSON()
 *
 * **File Upload Details**:
 * - Uses Blob.text() for modern async file reading
 * - Validates file selection before processing
 * - Shows error alerts if file reading or import fails
 *
 * @returns {void}
 */
function wireExportImportButtons () {
  if (typeof document === 'undefined') return

  // Download image button
  const downloadImageBtn = document.getElementById('download-color-grid-image')
  if (downloadImageBtn) {
    downloadImageBtn.addEventListener('click', () => {
      downloadAsImage()
    })
  }

  // Download JSON button
  const downloadJsonBtn = document.getElementById('download-color-grid-json')
  if (downloadJsonBtn) {
    downloadJsonBtn.addEventListener('click', () => {
      downloadAsJSON()
    })
  }

  // Import JSON button
  const importJsonBtn = document.getElementById('import-color-grid-json')
  if (importJsonBtn) {
    importJsonBtn.addEventListener('change', async e => {
      const file = e.target.files?.[0]
      if (file) {
        try {
          if (initializeColorGridIfNeeded()) {
            const text = await file.text()
            const success = importFromJSON(text)
            if (!success) {
              alert('Failed to import JSON. Check console for details.')
            }
          }
        } catch (err) {
          console.error('Failed to read file:', err)
          alert('Failed to read file.')
        }
      }
    })
  }
}

/**
 * Get palette information for current color mode.
 * Returns color palette and associated metadata from RectCanvasColor.
 *
 * @returns {Object|null} Palette info from RectCanvasColor or null if not initialized
 */
function getPaletteInfo () {
  return rectCanvasColor ? rectCanvasColor.getPaletteInfo() : null
}

/**
 * Get color information for a specific grid cell.
 * Retrieves detailed color data for the cell at given coordinates.
 *
 * @param {number} x - Cell x coordinate
 * @param {number} y - Cell y coordinate
 * @returns {string} Color info from RectCanvasColor or empty string if not initialized
 */
function getCellColorInfo (x, y) {
  return rectCanvasColor ? rectCanvasColor.getColorInfo(x, y) : ''
}

/**
 * Auto-initialize on page load in browser environment.
 * Sets up event listener if DOM is not yet ready, or calls initialization directly.
 * Safe to call in non-browser environments (no-op if window/document undefined).
 *
 * **Side Effects**:
 * - Adds DOMContentLoaded listener if document.readyState === 'loading'
 * - Calls initializeColorUI() when ready
 *
 * **Execution Context**:
 * - Only executes in browser environment (checks globalThis.window and document)
 * - No-op in Node.js or other non-browser environments
 */
if (globalThis.window != null && document != null) {
  // Defer initialization to allow DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeColorUI)
  } else {
    initializeColorUI()
  }
}

/**
 * Module interface providing access to grid instances and API functions.
 * Includes getter accessors for internal state and all public API functions.
 * Functions are const to comply with ESLint export restrictions.
 *
 * **Exported API**:
 * - Initialization: initializeColorGridIfNeeded, initializeColorUI, switchColorMode
 * - Queries: getColorModeInfo, getSelectedColor, getPaletteInfo, getCellColorInfo
 * - Color Management: setSelectedColor, cycleSelectedColor, fillWithSelectedColor, fillGridWithColor
 * - Import/Export: exportAsJSON, importFromJSON, downloadAsImage, downloadAsJSON
 * - UI Wiring: wireColorModeRadios, wireExportImportButtons
 *
 * **Instance Accessors**:
 * - getRectDrawColor(): Access to underlying RectDrawColor instance
 * - getRectCanvasColor(): Access to underlying RectCanvasColor instance
 *
 * @type {Object}
 * @const
 */
const moduleInterface = {
  // Initialization
  initializeColorGridIfNeeded,
  initializeColorUI,
  switchColorMode,
  // Queries
  getColorModeInfo,
  getSelectedColor,
  getPaletteInfo,
  getCellColorInfo,
  // Color Management
  setSelectedColor,
  cycleSelectedColor,
  fillWithSelectedColor,
  fillGridWithColor,
  // Import/Export
  exportAsJSON,
  importFromJSON,
  downloadAsImage,
  downloadAsJSON,
  // UI Wiring
  wireColorModeRadios,
  wireExportImportButtons,
  // Instance accessors
  getRectDrawColor: () => rectDrawColor,
  getRectCanvasColor: () => rectCanvasColor
}

// Exports for use in other modules
export default moduleInterface

export {
  initializeColorGridIfNeeded,
  initializeColorUI,
  switchColorMode,
  getColorModeInfo,
  setSelectedColor,
  getSelectedColor,
  cycleSelectedColor,
  fillWithSelectedColor,
  fillGridWithColor,
  exportAsJSON,
  importFromJSON,
  downloadAsImage,
  downloadAsJSON,
  wireColorModeRadios,
  wireExportImportButtons,
  getPaletteInfo,
  getCellColorInfo
}
