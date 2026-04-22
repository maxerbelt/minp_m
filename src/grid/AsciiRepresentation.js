/**
 * Renders grid-like objects as human-readable ASCII art.
 * Converts grids and masks to text representation with flexible symbol mapping.
 * Works with any object that has width, height, and at(x, y) methods.
 *
 * @class AsciiRepresentation
 */
export class AsciiRepresentation {
  /**
   * Default symbol mapping for values 0-15.
   * Maps numeric cell values to single-character symbols for display.
   * Index 0 = '.', 1 = '1', ..., 9 = '9', 10 = 'a', ..., 15 = 'f'
   *
   * @static
   * @type {Array<string>}
   */
  static defaultSymbols = [
    '.',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f'
  ]

  /**
   * Initializes renderer for a grid-like object.
   *
   * @param {Object} gridLike - Grid object with width, height, and at(x, y) methods
   *                            Can be a Mask, AsciiGrid, or other grid implementation
   */
  constructor (gridLike) {
    this.grid = gridLike
  }

  /**
   * Converts grid to ASCII string using default symbols.
   *
   * @returns {string} ASCII art representation of the grid
   * @example
   * const ascii = new AsciiRepresentation(grid).toAscii();
   * console.log(ascii);
   */
  toAscii () {
    return this.toAsciiWith()
  }

  /**
   * Converts grid to ASCII string with custom symbol mapping.
   * Automatically selects rendering strategy based on grid type:
   * - If grid has indexer (for non-rectangular grids), uses indexer-based rendering
   * - Otherwise uses generic rectangular rendering
   *
   * @param {Array<string>} [symbols=defaultSymbols] - Symbol array mapping values to characters
   * @returns {string} ASCII art representation using provided symbols
   * @example
   * const customSymbols = ['·', '#', '@', '*'];
   * const ascii = renderer.toAsciiWith(customSymbols);
   */
  toAsciiWith (symbols = AsciiRepresentation.defaultSymbols) {
    // Use mask-specific rendering if indexer available
    if (this.grid.indexer) {
      return this.#renderWithIndexer(symbols)
    }
    // Use generic rendering for standard rectangular grids
    return this.#renderGenericGrid(symbols)
  }

  /**
   * Renders grid using indexer (for complex non-rectangular shapes).
   * Used for hex, triangle, or other non-rectangular grid types.
   *
   * @private
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @returns {string} ASCII representation with custom padding for shape
   */
  #renderWithIndexer (symbols) {
    const lines = []
    this.#renderRowByRow(symbols, lines)
    return lines.join('\n')
  }

  /**
   * Renders each row of the grid using its indexer.
   * Iterates through rows provided by indexer.rows() and renders each.
   *
   * @private
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @param {Array<string>} lines - Accumulator array for output lines
   * @returns {void}
   */
  #renderRowByRow (symbols, lines) {
    const rows = this.grid.indexer.rows()
    for (const rowIndex of rows) {
      this.#renderRow(rowIndex, symbols, lines)
    }
  }

  /**
   * Renders a single row using indexer padding and cell positioning.
   * Adds row padding, accumulates cell symbols, and appends to output.
   *
   * @private
   * @param {number} rowIndex - Row index from indexer
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @param {Array<string>} lines - Accumulator array for output lines
   * @returns {void}
   */
  #renderRow (rowIndex, symbols, lines) {
    let row = this.grid.indexer.rowPadding(rowIndex)
    const cellLocations = this.grid.indexer.row(rowIndex)
    row = this.#accumulateRow(row, cellLocations, symbols)
    lines.push(row)
  }

  /**
   * Accumulates ASCII characters for all cells in a row.
   * Appends cell character for each location in the row.
   *
   * @private
   * @param {string} row - Row string to append to
   * @param {Array<Array<number>>} cellLocations - [x, y] coordinates for cells
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @returns {string} Updated row string with all cell symbols appended
   */
  #accumulateRow (row, cellLocations, symbols) {
    for (const location of cellLocations) {
      row = this.#appendCellChar(row, location, symbols)
    }
    return row
  }

  /**
   * Appends a single cell character to row string.
   * Includes indexer cell padding and value-to-symbol mapping.
   *
   * @private
   * @param {string} row - Row string to append to
   * @param {Array<number>} location - [x, y] coordinate for cell
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @returns {string} Updated row with cell padding and symbol appended
   */
  #appendCellChar (row, location, symbols) {
    row += this.grid.indexer.cellPadding()
    const value = this.grid.at(...location)
    const char = symbols[value] || '?'
    return row + char
  }

  /**
   * Renders generic rectangular grid without indexer.
   * Iterates row-by-row, column-by-column to build output.
   * Simple and efficient for standard rectangular grids.
   *
   * @private
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @returns {string} ASCII art with one character per cell, rows separated by newlines
   */
  #renderGenericGrid (symbols) {
    const lines = []
    for (let rowIndex = 0; rowIndex < this.grid.height; rowIndex++) {
      let row = ''
      for (let columnIndex = 0; columnIndex < this.grid.width; columnIndex++) {
        const value = this.grid.at(columnIndex, rowIndex)
        const char = symbols[value] || '?'
        row += char
      }
      lines.push(row)
    }
    return lines.join('\n')
  }

  /**
   * Extracts grid values as a 2D array.
   * Returns nested array: grid[rowIndex][columnIndex] = value.
   *
   * @returns {Array<Array<number|bigint>>} 2D array of cell values
   * @example
   * const values = renderer.toGrid();
   * console.log(values[0][0]); // Value at (0, 0)
   */
  toGrid () {
    const grid = []
    const height = this.grid.height
    const width = this.grid.width
    for (let rowIndex = 0; rowIndex < height; rowIndex++) {
      const row = []
      for (let columnIndex = 0; columnIndex < width; columnIndex++) {
        row.push(this.grid.at(columnIndex, rowIndex))
      }
      grid.push(row)
    }
    return grid
  }

  /**
   * Creates a visual summary string with ASCII art and metadata.
   * Combines ASCII representation with occupancy and size statistics.
   * Requires grid to have occupancy and size properties.
   *
   * @returns {string} Multi-line string with ASCII art and statistics
   * @example
   * const summary = renderer.toVisualString();
   * // Output:
   * // ..###..
   * // .#.....
   * // [Occupancy: 5, Size: 25]
   */
  toVisualString () {
    const ascii = this.toAscii()
    const occupancy = this.grid.occupancy
    const size = this.grid.size
    return `${ascii}\n[Occupancy: ${occupancy}, Size: ${size}]`
  }
}
