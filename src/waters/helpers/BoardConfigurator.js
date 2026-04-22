import { bh } from '../../terrains/all/js/bh.js'
import { gameHost } from '../WatersUI.js'

/**
 *  Consolidate board configuration logic
 * to eliminate duplication between resetBoardSize and resetBoardSizePrint
 */
export class BoardConfigurator {
  static configureBoardGrid (board, map, cellSize) {
    board.style.setProperty('--cols', map?.cols || 18)
    board.style.setProperty('--rows', map?.rows || 8)
    board.style.setProperty('--boxSize', cellSize)
    board.innerHTML = ''
  }

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

  static resetBoardSizePrint (board, map, cellSizePrint) {
    if (!map) map = bh.map
    if (!cellSizePrint) cellSizePrint = 600 / (map.cols + 1) + 'px'

    board.style.setProperty('--cols', map.cols + 1)
    board.style.setProperty('--rows', map.rows + 1)
    board.style.setProperty('--boxSize', cellSizePrint)
    board.innerHTML = ''
  }
}
