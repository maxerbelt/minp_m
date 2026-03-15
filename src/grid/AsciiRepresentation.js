/**
 * AsciiRepresentation - Encapsulates ASCII/text conversion for grids and masks
 * Renders grid-like objects as human-readable ASCII art
 * Works with any object that has width, height, and at(x, y) methods
 */
export class AsciiRepresentation {
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
   * @param {Object} gridLike - Any object with width, height, and at(x, y) methods
   *                            Can be a Mask, AsciiGrid, or other grid implementation
   */
  constructor (gridLike) {
    this.grid = gridLike
  }

  /**
   * Convert grid to ASCII string with default symbols
   */
  toAscii () {
    return this.toAsciiWith()
  }

  /**
   * Convert grid to ASCII string with custom symbols
   * Symbols array maps values to characters
   */
  toAsciiWith (symbols = AsciiRepresentation.defaultSymbols) {
    // Use mask-specific rendering if indexer available
    if (this.grid.indexer) {
      return this.renderWithIndexer(symbols)
    }
    // Use generic rendering for standard grids
    return this.renderGenericGrid(symbols)
  }

  /**
   * Render using mask's indexer (for complex grid shapes like hex)
   */
  renderWithIndexer (symbols) {
    const lines = []
    this.renderRowByRow(symbols, lines)
    return lines.join('\n')
  }

  /**
   * Render each row of the mask using its indexer
   */
  renderRowByRow (symbols, lines) {
    const rows = this.grid.indexer.rows()
    for (const y of rows) {
      this.renderRow(y, symbols, lines)
    }
  }

  /**
   * Render a single row using mask indexer
   */
  renderRow (y, symbols, lines) {
    let rowStr = this.grid.indexer.rowPadding(y)
    const row = this.grid.indexer.row(y)
    rowStr = this.accumulateRow(rowStr, row, symbols)
    lines.push(rowStr)
  }

  /**
   * Accumulate ASCII characters for a row using indexer
   */
  accumulateRow (rowStr, row, symbols) {
    for (const location of row) {
      rowStr = this.appendCellChar(rowStr, location, symbols)
    }
    return rowStr
  }

  /**
   * Append single cell character to row using indexer
   */
  appendCellChar (row, location, symbols) {
    row += this.grid.indexer.cellPadding()
    const value = this.grid.at(...location)
    const char = symbols[value] || '?'
    return row + char
  }

  /**
   * Render generic rectangular grid (no indexer needed)
   */
  renderGenericGrid (symbols) {
    const lines = []
    for (let y = 0; y < this.grid.height; y++) {
      let row = ''
      for (let x = 0; x < this.grid.width; x++) {
        const value = this.grid.at(x, y)
        const char = symbols[value] || '?'
        row += char
      }
      lines.push(row)
    }
    return lines.join('\n')
  }

  /**
   * Get a visual representation as a 2D array of values
   */
  toGrid () {
    const grid = []
    const height = this.grid.height
    const width = this.grid.width
    for (let y = 0; y < height; y++) {
      const row = []
      for (let x = 0; x < width; x++) {
        row.push(this.grid.at(x, y))
      }
      grid.push(row)
    }
    return grid
  }

  /**
   * Create a visual summary with ASCII and occupancy info
   */
  toVisualString () {
    const ascii = this.toAscii()
    const occupancy = this.grid.occupancy
    const size = this.grid.size
    return `${ascii}\n[Occupancy: ${occupancy}, Size: ${size}]`
  }
}
