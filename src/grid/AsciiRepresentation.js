/**
 * Renders grid-like objects as human-readable ASCII art.
 * Converts grids and masks to text representation with flexible symbol mapping.
 * Automatically detects grid shape (rectangular vs. non-rectangular) and applies appropriate rendering.
 * Works with any object that has width, height, and at(x, y) methods.
 *
 * @typedef {Object} GridIndexer
 * @property {() => Generator<number>} rows - Generator yielding row indices
 * @property {(rowIndex: number) => string} rowPadding - Returns padding string for row
 * @property {(rowIndex: number) => Array<Array<number>>} row - Returns [x, y] coordinates for cells in row
 * @property {() => string} cellPadding - Returns padding string between cells
 *
 * @typedef {Object} GridLike
 * @property {number} width - Grid width in cells
 * @property {number} height - Grid height in cells
 * @property {(x: number, y: number) => number|bigint} at - Get value at coordinates
 * @property {GridIndexer} [indexer] - Optional indexer for non-rectangular grids (hex, triangle)
 * @property {number} [occupancy] - Optional occupancy count for statistics
 * @property {number} [size] - Optional size value for statistics
 *
 * @class AsciiRepresentation
 */
export class AsciiRepresentation {
  /**
   * Default symbol mapping for values 0-62.
   * Maps numeric cell values to single-character symbols for display.
   * Supports 63 unique symbols: 0='.' (empty), 1-9 (digits), 10-35 (lowercase a-z), 36-61 (uppercase A-Z)
   * Index 0 = '.', 1 = '1', ..., 9 = '9', 10 = 'a', ..., 35 = 'z', 36 = 'A', ..., 61 = 'Z'
   *
   * @static
   * @readonly
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
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z'
  ]

  /**
   * Initializes ASCII renderer for a grid-like object.
   * Stores reference to grid for subsequent rendering operations.
   *
   * @param {GridLike} gridLike - Grid object with width, height, and at(x, y) methods
   * @throws {Error} If gridLike lacks required width, height, or at() method
   */
  constructor (gridLike) {
    /** @type {GridLike} */
    this.grid = gridLike
  }

  /**
   * Converts grid to ASCII string using default symbols.
   * Equivalent to calling toAsciiWith() with no arguments.
   *
   * @public
   * @returns {string} ASCII art representation of the grid (newline-separated rows)
   * @example
   * const ascii = new AsciiRepresentation(grid).toAscii();
   * console.log(ascii);
   * // Output:
   * // ..###
   * // #..#.
   * // ###..
   */
  toAscii () {
    return this.toAsciiWith()
  }

  /**
   * Converts grid to ASCII string with custom symbol mapping.
   * Automatically selects rendering strategy based on grid type:
   * - If grid has indexer (for non-rectangular grids), uses indexer-based rendering
   * - Otherwise uses generic rectangular rendering with all rows same width
   *
   * @public
   * @param {Array<string>} [symbols=AsciiRepresentation.defaultSymbols] - Symbol array mapping values to characters
   * @returns {string} ASCII art representation using provided symbols (newline-separated rows)
   * @throws {Error} If symbols array is empty
   * @example
   * const customSymbols = ['·', '#', '@', '*'];
   * const ascii = renderer.toAsciiWith(customSymbols);
   * // Output: ASCII art using custom symbol set
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
   * Delegates to renderRowByRow() to accumulate lines with indexer-provided padding.
   *
   * @private
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @returns {string} ASCII representation with row and cell padding from indexer
   */
  #renderWithIndexer (symbols) {
    const lines = []
    this.#renderRowByRow(symbols, lines)
    return lines.join('\n')
  }

  /**
   * Renders each row of the grid using its indexer.
   * Iterates through rows provided by indexer.rows() generator and renders each row.
   * Accumulates line strings in the lines array parameter.
   *
   * @private
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @param {Array<string>} lines - Accumulator array for output lines (modified in place)
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
   * Gets row padding, cell locations, accumulates cell symbols, and appends completed row to lines.
   *
   * @private
   * @param {number} rowIndex - Row index from indexer
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @param {Array<string>} lines - Accumulator array for output lines (modified in place)
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
   * Iterates cell locations and appends each cell character to row string.
   *
   * @private
   * @param {string} row - Row string to append to
   * @param {Array<Array<number>>} cellLocations - [x, y] coordinate pairs for cells in row
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
   * Gets cell value at location, maps to symbol, adds indexer cell padding, and appends.
   *
   * @private
   * @param {string} row - Row string to append to
   * @param {Array<number>} location - [x, y] coordinate pair for cell
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @returns {string} Updated row with cell padding and symbol appended
   */
  #appendCellChar (row, location, symbols) {
    row += this.grid.indexer.cellPadding()
    const value = this.grid.at(...location)
    return row + this.#cellChar(value, symbols)
  }

  /**
   * Maps cell value to display character.
   * Handles negative values (returns '!') and out-of-range values (returns '?').
   * Converts bigint values to numbers for array indexing (required for TypeScript).
   *
   * @private
   * @param {number|bigint} value - Cell value from grid.at()
   * @param {Array<string>} symbols - Symbol array for value mapping
   * @returns {string} Single character: '!' for negative, '?' for unmapped, or symbol for value
   */
  #cellChar (value, symbols) {
    if (value < 0) {
      return '!'
    }

    // Convert bigint to number for array indexing (TypeScript requirement)
    const index = typeof value === 'bigint' ? Number(value) : value
    return symbols[index] ?? '?'
  }

  /**
   * Renders generic rectangular grid without indexer.
   * Iterates row-by-row, column-by-column to build output.
   * Simple and efficient for standard rectangular grids (no custom padding).
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
        row += this.#cellChar(value, symbols)
      }
      lines.push(row)
    }
    return lines.join('\n')
  }

  /**
   * Extracts grid values as a 2D array.
   * Returns nested array: result[rowIndex][columnIndex] = value at (columnIndex, rowIndex).
   * Rows are indexed top-to-bottom, columns left-to-right.
   *
   * @public
   * @returns {Array<Array<number|bigint>>} 2D array of cell values from grid.at()
   * @example
   * const values = renderer.toGrid();
   * console.log(values[0][0]); // Value at (0, 0)
   * console.log(values.length); // height
   * console.log(values[0].length); // width
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
   * Requires grid to have occupancy and size properties (optional).
   * Useful for debugging and visual inspection of grid state.
   *
   * @public
   * @returns {string} Multi-line string: ASCII art on line 1, statistics on line 2
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
