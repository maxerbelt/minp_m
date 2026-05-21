import { bh } from '../../terrains/all/js/bh.js'
import { gameHost } from '../WatersUI.js'

/**
 * @module waters/helpers/BoardConfigurator
 * Centralizes board configuration logic for grid setup and sizing.
 *
 * @description
 * This module exports the BoardConfigurator class which manages board grid initialization
 * and sizing for both normal display and print layouts. It consolidates board configuration
 * logic to eliminate code duplication between display and print modes.
 *
 * Key responsibilities:
 * - Configure board grid with CSS properties (cols, rows, box-size)
 * - Calculate responsive cell sizes based on container dimensions
 * - Handle print-specific grid expansion for layout compatibility
 * - Clear and reset board content
 *
 * The BoardConfigurator works with:
 * - bh.map: Current game map configuration
 * - gameHost.containerWidth: Parent container width for responsive sizing
 *
 * @exports BoardConfigurator
 */

/**
 * Consolidates board configuration logic to eliminate duplication between display and print modes.
 *
 * @class
 * @static
 * @description
 * Static utility class providing board grid configuration methods. Uses the template method
 * pattern where configureBoardGrid handles common grid setup logic, and specialized methods
 * (resetBoardSize, resetBoardSizePrint) provide context-specific defaults.
 *
 * Responsibilities:
 * - Apply CSS custom properties for grid layout (--cols, --rows, --boxSize)
 * - Calculate cell sizes based on display context (responsive for normal, fixed for print)
 * - Clear board content when reconfiguring
 * - Handle map object defaults using bh.map
 *
 * Design Pattern:
 * - Static methods prevent instantiation
 * - Shared configureBoardGrid method reduces duplication
 * - Specialized resetBoardSize and resetBoardSizePrint override only what differs
 * - Graceful defaults for missing parameters (fallback to bh.map, container width)
 *
 * CSS Properties Applied:
 * - --cols: Number of grid columns
 * - --rows: Number of grid rows
 * - --boxSize: Cell size in pixels (used by CSS Grid for sizing)
 *
 * @example
 * // Configure board for normal display with responsive sizing
 * const board = document.getElementById('board');
 * BoardConfigurator.resetBoardSize(board);
 *
 * @example
 * // Configure board for printing with specific dimensions
 * BoardConfigurator.resetBoardSizePrint(board, map, '24px');
 */
export class BoardConfigurator {
  /**
   * Configures board grid with CSS properties and clears all content.
   * Core method that applies grid configuration via CSS custom properties.
   * Called by resetBoardSize and resetBoardSizePrint with context-specific parameters.
   *
   * CSS Properties Applied:
   * - --cols: Grid column count (defaults to 18)
   * - --rows: Grid row count (defaults to 8)
   * - --boxSize: Individual cell size (used by CSS Grid for layout)
   *
   * Side Effects:
   * - Clears all child elements from board (innerHTML = '')
   * - Modifies board.style CSS custom properties
   *
   * @param {HTMLElement} board - The board container element to configure
   * @param {Object} [map={}] - Map object with grid dimensions
   * @param {number} [map.cols=18] - Number of grid columns (defaults to 18 if not provided)
   * @param {number} [map.rows=8] - Number of grid rows (defaults to 8 if not provided)
   * @param {string} [cellSize='30px'] - CSS size value for individual cells (e.g., '30px', '2em')
   * @returns {void}
   * @throws {TypeError} If board is not a valid HTMLElement or cellSize is not a string
   * @see resetBoardSize
   * @see resetBoardSizePrint
   *
   * @example
   * // Configure board with custom map dimensions
   * const map = { cols: 20, rows: 10 };
   * BoardConfigurator.configureBoardGrid(board, map, '32px');
   *
   * @example
   * // Configure board with defaults
   * BoardConfigurator.configureBoardGrid(board, {}, '25px'); // Uses 18x8 grid
   */
  static configureBoardGrid (board, map = {}, cellSize = '30px') {
    const cols = String(map?.cols || 18)
    const rows = String(map?.rows || 8)
    board.style.setProperty('--cols', cols)
    board.style.setProperty('--rows', rows)
    board.style.setProperty('--boxSize', cellSize)
    board.innerHTML = ''
  }

  /**
   * Resets board size for normal display with responsive cell sizing.
   * Calculates cell size based on container width divided by map columns.
   * Uses current map from bh.map if not provided.
   *
   * Cell Size Calculation:
   * - cellSize = containerWidth / numberOfColumns
   * - This ensures the board fills the container width responsively
   * - Container width comes from gameHost.containerWidth
   *
   * Workflow:
   * 1. Uses provided map or falls back to bh.map
   * 2. Calculates cell size if not provided (responsive)
   * 3. Calls configureBoardGrid with calculated values
   *
   * @param {HTMLElement} board - The board container element to reset
   * @param {Object} [map=bh.map] - Map object with grid dimensions
   * @param {number} [map.cols=18] - Number of grid columns (defaults to 18)
   * @param {number} [map.rows=8] - Number of grid rows (defaults to 8)
   * @param {string} [cellSize] - Optional cell size in CSS units (e.g., '30px')
   *                               If omitted, calculated as: containerWidth / cols + 'px'
   * @returns {void}
   * @throws {TypeError} If board is not a valid HTMLElement
   * @see configureBoardGrid
   * @see resetBoardSizePrint
   *
   * @example
   * // Reset board with responsive sizing (default behavior)
   * const board = document.getElementById('game-board');
   * BoardConfigurator.resetBoardSize(board);
   *
   * @example
   * // Reset board with custom map
   * const customMap = { cols: 12, rows: 10 };
   * BoardConfigurator.resetBoardSize(board, customMap);
   *
   * @example
   * // Reset board with explicit cell size
   * BoardConfigurator.resetBoardSize(board, null, '32px');
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
   * Resets board size for printing with expanded grid for layout compatibility.
   * Uses fixed calculation for print cell size based on standard print width (600px).
   * Expands grid dimensions by 1 row and 1 column for print layout requirements.
   * Uses current map from bh.map if not provided.
   *
   * Print Grid Expansion:
   * - Adds 1 to column count for print layout spacing
   * - Adds 1 to row count for print layout spacing
   * - This accommodation allows printing without layout shifts
   *
   * Print Cell Size Calculation:
   * - cellSizePrint = 600 / (cols + 1) + 'px'
   * - 600px represents standard print container width
   * - Division by (cols + 1) accounts for the expanded grid dimension
   * - Ensures print output scales consistently
   *
   * Workflow:
   * 1. Uses provided map or falls back to bh.map
   * 2. Calculates print cell size if not provided
   * 3. Creates transient printMap with expanded dimensions
   * 4. Calls configureBoardGrid with print-specific values
   *
   * @param {HTMLElement} board - The board container element to configure for printing
   * @param {Object} [map=bh.map] - Map object with grid dimensions
   * @param {number} [map.cols=18] - Number of grid columns (defaults to 18)
   * @param {number} [map.rows=8] - Number of grid rows (defaults to 8)
   * @param {string} [cellSizePrint] - Optional print cell size in CSS units (e.g., '24px')
   *                                   If omitted, calculated as: 600 / (cols + 1) + 'px'
   * @returns {void}
   * @throws {TypeError} If board is not a valid HTMLElement
   * @see configureBoardGrid
   * @see resetBoardSize
   *
   * @example
   * // Reset board for printing with default calculation
   * const board = document.getElementById('print-board');
   * BoardConfigurator.resetBoardSizePrint(board);
   *
   * @example
   * // Reset board for printing with custom map
   * const customMap = { cols: 20, rows: 10 };
   * BoardConfigurator.resetBoardSizePrint(board, customMap);
   *
   * @example
   * // Reset board for printing with explicit cell size
   * BoardConfigurator.resetBoardSizePrint(board, null, '20px');
   */
  static resetBoardSizePrint (board, map, cellSizePrint) {
    if (!map) map = bh.map
    if (!cellSizePrint) cellSizePrint = 600 / ((map.cols || 18) + 1) + 'px'

    // create a transient map object with expanded grid for print layout
    const printMap = {
      cols: (map.cols || 18) + 1,
      rows: (map.rows || 8) + 1
    }

    this.configureBoardGrid(board, printMap, cellSizePrint)
  }
}
