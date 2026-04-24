import { bh } from '../terrains/all/js/bh.js'
import { Random } from './Random.js'

/**
 * Converts a string to title case.
 * @param {string} str - The string to convert
 * @returns {string} The title-cased string
 */
export function toTitleCase (str) {
  if (!str) {
    return ''
  }
  if (typeof str === 'string') {
    return str.toLowerCase().replaceAll(/\b\w/g, s => s.toUpperCase())
  }
  return str
}

/**
 * Attempts to randomly place a ship shape on the grid.
 * @param {Object} ship - The ship to place
 * @param {Array<Array>} shipCellGrid - The grid of ship cells
 * @param {Object} mask - The placement mask
 * @returns {Array|null} The placed ship cells or null if placement failed
 */
export function randomPlaceShape (ship, shipCellGrid, mask) {
  const letter = ship.letter
  const shape = ship.shape()
  const minSize = shape.minSize
  const map = bh.map

  if (!shape) throw new Error('No shape for letter ' + letter)

  const placeables = shape.placeables()
  const maxRow = map.rows - minSize + 1
  const maxCol = map.cols - minSize + 1

  const locations = Random.shuffleArray(
    mask
      .bitsEmpty()
      .map(i => mask.indexer.location(i))
      .filter(loc => loc[1] < maxRow && loc[0] < maxCol)
  )

  for (const [col, row] of locations) {
    const shuffledPlaceables = Random.shuffleArray([...placeables])
    for (const placeable of shuffledPlaceables) {
      const placement = placeable.placeAt(col, row)
      if (placement.canPlace(shipCellGrid)) {
        ship.placePlacement(placement)
        const displaced = placement.displacedArea(mask.width, mask.height)
        mask.joinWith(displaced)
        ship.addToGrid(shipCellGrid)

        // Update mask with ship cells
        updateMaskWithShipCells(mask, shipCellGrid)

        return ship.cells
      }
    }
  }
  return null
}

/**
 * Updates the mask with current ship cell positions.
 * @private
 * @param {Object} mask - The placement mask
 * @param {Array<Array>} shipCellGrid - The grid of ship cells
 */
function updateMaskWithShipCells (mask, shipCellGrid) {
  const shipCell = mask.emptyMask
  for (const [row, rowData] of shipCellGrid.entries()) {
    for (const [col, cell] of rowData.entries()) {
      if (cell) {
        shipCell.set(col, row)
      }
    }
  }
}

/**
 * Throttles a function to limit execution frequency.
 * @param {Function} func - The function to throttle
 * @param {number} delay - The minimum delay between executions
 * @returns {Function} The throttled function
 */
export function throttle (func, delay) {
  let inThrottle = false
  let lastFunc
  let lastTime

  return function (...args) {
    if (inThrottle) {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(() => {
        if (Date.now() - lastTime >= delay) {
          func.apply(this, args)
          lastTime = Date.now()
        }
      }, Math.max(delay - (Date.now() - lastTime), 0))
    } else {
      func.apply(this, args)
      lastTime = Date.now()
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, delay)
    }
  }
}
