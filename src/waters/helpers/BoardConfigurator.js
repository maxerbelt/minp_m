import { bh } from '../../terrains/all/js/bh.js'
import { gameHost } from '../WatersUI.js'

/**
 * Consolidates board configuration logic to eliminate duplication between resetBoardSize and resetBoardSizePrint.
 */
export class BoardConfigurator {
  /**
   * Configures board grid with CSS properties and clears content.
   * @param {HTMLElement} board - Board element
   * @param {Object} map - Map object with cols and rows
   * @param {string} cellSize - Cell size
   */
  static configureBoardGrid (board, map, cellSize) {
    board.style.setProperty('--cols', map?.cols || 18)
    board.style.setProperty('--rows', map?.rows || 8)
    board.style.setProperty('--boxSize', cellSize)
    board.innerHTML = ''
  }

  /**
   * Resets board size for normal display.
   * @param {HTMLElement} board - Board element
   * @param {Object} [map] - Map object
   * @param {string} [cellSize] - Cell size
   */
  static resetBoardSize (board, map, cellSize) {
    if (!map) map = bh.map
    if (!cellSize) {
      // Calculate cell size based on container width and map columns
      const containerWidth = gameHost.containerWidth
      const cols = map?.cols || 18
      cellSize = containerWidth / cols + 'px'
    }
    this.configureBoardGrid(board, map, cellSize)
  }

  /**
   * Resets board size for printing.
   * @param {HTMLElement} board - Board element
   * @param {Object} [map] - Map object
   * @param {string} [cellSizePrint] - Print cell size
   */
  static resetBoardSizePrint (board, map, cellSizePrint) {
    if (!map) map = bh.map
    if (!cellSizePrint) cellSizePrint = 600 / (map.cols + 1) + 'px'

    board.style.setProperty('--cols', map.cols + 1)
    board.style.setProperty('--rows', map.rows + 1)
    board.style.setProperty('--boxSize', cellSizePrint)
    board.innerHTML = ''
  }
}
