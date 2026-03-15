import { RectDrawColor } from './grid/rectdrawcolor.js'
import { RectCanvasColor } from './ui/RectCanvasColor.js'

/**
 * Multi-Color Rectangular Grid Integration Module
 * Demonstrates RectDrawColor and RectCanvasColor usage
 * Supports 2, 4, 16, and 256 color modes
 */

const cellSize = 50
const offsetX = 50
const offsetY = 50
const width = 10
const height = 10

let rectDrawColor = null
let rectCanvasColor = null
let currentBitsPerCell = 2 // Default to 4 colors

/**
 * Initialize multi-color grid with specific bit depth
 * @param {number} bitsPerCell - 1, 2, 4, or 8 bits per cell
 * @returns {boolean} - Success status
 */
function initializeColorGridIfNeeded (bitsPerCell = 2) {
  if (rectDrawColor) return true
  if (typeof document === 'undefined') return false

  const canvas = document.getElementById('rect-multi-color')
  if (!canvas) return false

  currentBitsPerCell = bitsPerCell

  try {
    rectDrawColor = new RectDrawColor(
      'rect-multi-color',
      width,
      height,
      cellSize,
      offsetX,
      offsetY,
      bitsPerCell
    )

    rectCanvasColor = new RectCanvasColor('rect-multi-color', rectDrawColor, {
      width,
      height
    })

    return true
  } catch (err) {
    console.error('Failed to initialize color grid:', err)
    return false
  }
}

/**
 * Initialize UI when canvas is ready
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
 * Switch to different color mode
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
 * Get color mode information
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
 * Display current color mode info
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
 * Set color selection
 */
function setSelectedColor (colorValue) {
  if (initializeColorGridIfNeeded() && rectCanvasColor) {
    rectCanvasColor.setSelectedColor(colorValue)
  }
}

/**
 * Get current selected color
 */
function getSelectedColor () {
  return rectCanvasColor ? rectCanvasColor.getSelectedColor() : 0
}

/**
 * Cycle to next color
 */
function cycleSelectedColor () {
  if (rectCanvasColor) {
    rectCanvasColor.cycleSelectedColor()
  }
}

/**
 * Fill grid with selected color
 */
function fillWithSelectedColor () {
  if (initializeColorGridIfNeeded() && rectCanvasColor) {
    rectCanvasColor.fillGridWithColor()
  }
}

/**
 * Fill grid with specific color
 */
function fillGridWithColor (colorValue) {
  if (initializeColorGridIfNeeded() && rectCanvasColor) {
    rectCanvasColor.fillWith(colorValue)
  }
}

/**
 * Export grid data as JSON
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
 * Import grid data from JSON
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
 * Download grid as PNG
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
 * Download grid as JSON
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
 * Wire color mode selection radio buttons
 */
function wireColorModeRadios () {
  if (typeof document === 'undefined') return

  const radios = document.querySelectorAll('input[name="color-bits-mode"]')
  radios.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.checked) {
        const bits = parseInt(e.target.value)
        switchColorMode(bits)
      }
    })
  })
}

/**
 * Wire export/import buttons
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
    importJsonBtn.addEventListener('change', e => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = event => {
          if (initializeColorGridIfNeeded()) {
            const success = importFromJSON(event.target.result)
            if (!success) {
              alert('Failed to import JSON. Check console for details.')
            }
          }
        }
        reader.onerror = () => {
          alert('Failed to read file.')
        }
        reader.readAsText(file)
      }
    })
  }
}

/**
 * Get palette information
 */
function getPaletteInfo () {
  return rectCanvasColor ? rectCanvasColor.getPaletteInfo() : null
}

/**
 * Get color info for specific cell
 */
function getCellColorInfo (x, y) {
  return rectCanvasColor ? rectCanvasColor.getColorInfo(x, y) : ''
}

/**
 * Initialize on page load
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Defer initialization to allow DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeColorUI)
  } else {
    initializeColorUI()
  }
}

// Exports for use in other modules
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
  getCellColorInfo,
  rectDrawColor,
  rectCanvasColor
}
