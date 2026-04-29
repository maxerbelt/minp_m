import { bh } from '../terrains/all/js/bh.js'
import { Random } from './Random.js'

/**
 * Converts a string to title case.
 * @param {string} str - The input string to convert
 * @returns {string} The title-cased string, or empty string if input is falsy
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
 * Calculates valid placement locations for a ship within grid bounds.
 * Filters empty cells and ensures coordinates are within the shape's minimum size constraints.
 *
 * @param {Object} mask - The placement mask containing empty cells
 * @param {number} maxRow - Maximum valid row index (exclusive)
 * @param {number} maxCol - Maximum valid column index (exclusive)
 * @returns {Array<[number, number]>} Shuffled array of valid [col, row] coordinates
 */
function getValidPlacementLocations (mask, maxRow, maxCol) {
  const emptyCellIndices = mask.bitsEmpty()
  const candidateLocations = emptyCellIndices
    .map(cellIndex => mask.indexer.location(cellIndex))
    .filter(([col, row]) => row < maxRow && col < maxCol)

  return Random.shuffleArray(candidateLocations)
}

/**
 * Attempts to place a ship at a specific location using all available placeables.
 * Tries each placeable orientation and returns cells if placement succeeds.
 *
 * @param {Object} ship - The ship object with placement and grid methods
 * @param {Array<Object>} placeables - Array of placeable orientation objects
 * @param {number} col - Column coordinate for placement attempt
 * @param {number} row - Row coordinate for placement attempt
 * @param {Array<Array>} shipCellGrid - The grid tracking ship cell positions
 * @param {Object} mask - The placement mask to update on successful placement
 * @returns {Array|null} Array of placed ship cells, or null if no placeable succeeds
 */
function attemptPlacementAtLocation (
  ship,
  placeables,
  col,
  row,
  shipCellGrid,
  mask
) {
  const shuffledPlaceables = Random.shuffleArray([...placeables])

  for (const placeable of shuffledPlaceables) {
    const placement = placeable.placeAt(col, row)

    if (placement.canPlace(shipCellGrid)) {
      // Place the ship and update affected areas
      ship.placePlacement(placement)
      const displacedCells = placement.displacedArea(mask.width, mask.height)
      mask.joinWith(displacedCells)
      ship.addToGrid(shipCellGrid)

      // Synchronize mask with new ship cell positions
      updateMaskWithShipCells(mask, shipCellGrid)

      return ship.cells
    }
  }

  return null
}

/**
 * Randomly places a ship shape on the grid with all orientation variations.
 * Attempts placement at shuffled empty locations until a valid orientation is found.
 *
 * @param {Object} ship - The ship to place; must have letter, shape(), placePlacement(), addToGrid(), cells properties
 * @param {Array<Array>} shipCellGrid - 2D grid tracking occupancy of placed ship cells
 * @param {Object} mask - The placement mask; manages empty cells and boundary constraints
 * @returns {Array|null} Array of successfully placed ship cells, or null if placement impossible
 * @throws {Error} If ship has no valid shape
 */
export function randomPlaceShape (ship, shipCellGrid, mask) {
  const shipShape = ship.shape()

  if (!shipShape) {
    throw new Error(`No shape available for ship: ${ship.letter}`)
  }

  const shapeMinSize = shipShape.minSize
  const gridMap = bh.map
  const maxRow = gridMap.rows - shapeMinSize + 1
  const maxCol = gridMap.cols - shapeMinSize + 1

  const validLocations = getValidPlacementLocations(mask, maxRow, maxCol)
  const placeables = shipShape.placeables()

  for (const [col, row] of validLocations) {
    const placedCells = attemptPlacementAtLocation(
      ship,
      placeables,
      col,
      row,
      shipCellGrid,
      mask
    )

    if (placedCells) {
      return placedCells
    }
  }

  return null
}

/**
 * Synchronizes the placement mask with current ship cell positions in the grid.
 * Marks all occupied cells in the mask's empty cell tracker.
 *
 * @private
 * @param {Object} mask - The placement mask to update
 * @param {Array<Array>} shipCellGrid - 2D grid of ship cells (sparse matrix with cell objects)
 * @returns {void}
 */
function updateMaskWithShipCells (mask, shipCellGrid) {
  const emptyCellMask = mask.emptyMask

  shipCellGrid.forEach((rowCells, rowIndex) => {
    rowCells.forEach((cell, colIndex) => {
      if (cell) {
        emptyCellMask.set(colIndex, rowIndex)
      }
    })
  })
}
