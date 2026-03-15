import { Mask } from './mask.js'

/**
 * Redelmeier polyomino generator with proper D4 canonical normalization
 * Generates unique polyominoes without duplicates
 *
 * Key features:
 * - Orthogonal connectivity (4-connected) or king-connected (8-connected)
 * - Correct D4 symmetry group handling (8 transforms for square polyominoes)
 * - Canonical form computed during generation to avoid duplicates
 * - Bitboard-only operations
 * - Incremental frontier tracking
 * - Window size: W = H = 2 * maxCells + 1 to prevent edge hits
 */
export class RedelmeierGenerator {
  constructor (connectivity = '4') {
    if (!['4', '8'].includes(connectivity)) {
      throw new Error("connectivity must be '4' or '8'")
    }
    this.connectivity = connectivity
  }

  /**
   * Calculate window size given max number of cells
   */
  calculateWindowSize (maxCells) {
    return 2 * maxCells + 1
  }

  /**
   * Create an oversized board to hold polyominoes safely
   */
  createBoard (maxCells) {
    const windowSize = this.calculateWindowSize(maxCells)
    return Mask.empty(windowSize, windowSize)
  }

  /**
   * Get normalized canonical form of a polyomino
   * Finds the lexicographically smallest equivalent under D4
   * @private
   */
  getCanonicalForm (bits, width, height, store) {
    // Step 1: Minimize bounding box
    const bb = this.getBoundingBox(bits, width, height, store)
    if (!bb) return [0n, 1, 1] // empty

    const { minX, minY, maxX, maxY } = bb
    let bbWidth = maxX - minX + 1
    let bbHeight = maxY - minY + 1

    // Place bounding box cells in minimal rectangle
    let minimal = 0n
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this.cellAt(bits, x, y, width, store)) {
          const newY = y - minY
          const newX = x - minX
          minimal = this.setCellAt(minimal, newX, newY, bbWidth, store)
        }
      }
    }

    // Step 2: Find minimal form under all 8 D4 symmetries
    let best = minimal
    let bestRep = this.polyToString(minimal, bbWidth, bbHeight)

    const forms = Array.from(
      this.generateD4Forms(minimal, bbWidth, bbHeight, store)
    )
    for (const form of forms) {
      let [formBits, formW, formH] = form

      // Re-minimize bounding box for this transformed form
      const formBB = this.getBoundingBox(formBits, formW, formH, store)
      if (formBB) {
        const { minX: fMinX, minY: fMinY, maxX: fMaxX, maxY: fMaxY } = formBB
        const fW = fMaxX - fMinX + 1
        const fH = fMaxY - fMinY + 1

        let minForm = 0n
        for (let y = fMinY; y <= fMaxY; y++) {
          for (let x = fMinX; x <= fMaxX; x++) {
            if (this.cellAt(formBits, x, y, formW, store)) {
              const newY = y - fMinY
              const newX = x - fMinX
              minForm = this.setCellAt(minForm, newX, newY, fW, store)
            }
          }
        }

        const rep = this.polyToString(minForm, fW, fH)
        if (rep < bestRep) {
          best = minForm
          bestRep = rep
          bbWidth = fW
          bbHeight = fH
        }
      }
    }

    return [best, bbWidth, bbHeight]
  }

  /**
   * Convert polyomino to string for lexicographic comparison
   * @private
   */
  polyToString (bits, width, height) {
    let str = ''
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        str += this.cellAt(bits, x, y, width) ? '1' : '0'
      }
    }
    return str
  }

  /**
   * Generate all 8 D4 symmetries
   * @private
   */
  *generateD4Forms (bits, width, height, store) {
    yield [bits, width, height]

    // Only generate distinct forms for non-square
    if (width === height) {
      // Square: generate all 8
      // 4 rotations
      let rot = bits
      for (let i = 0; i < 3; i++) {
        rot = this.rotate90CW(rot, width, height, store)
        yield [rot, width, height]
      }

      // Flip then 4 rotations
      let flipped = this.flipHorizontal(bits, width, height, store)
      yield [flipped, width, height]

      rot = flipped
      for (let i = 0; i < 3; i++) {
        rot = this.rotate90CW(rot, width, height, store)
        yield [rot, width, height]
      }
    } else {
      // Rectangular: rotation swaps dimensions
      let w = width
      let h = height
      let rot = bits

      // Rotate 90
      rot = this.rotate90CW(rot, w, h, store)
      yield [rot, h, w]

      // Rotate 180
      rot = this.rotate90CW(rot, h, w, store)
      yield [rot, w, h]

      // Rotate 270
      rot = this.rotate90CW(rot, w, h, store)
      yield [rot, h, w]

      // Flip H
      let flipped = this.flipHorizontal(bits, width, height, store)
      yield [flipped, width, height]

      // Flip H + rotations
      w = width
      h = height
      rot = flipped

      rot = this.rotate90CW(rot, w, h, store)
      yield [rot, h, w]

      rot = this.rotate90CW(rot, h, w, store)
      yield [rot, w, h]

      rot = this.rotate90CW(rot, w, h, store)
      yield [rot, h, w]
    }
  }

  /**
   * Rotate bits 90° clockwise
   * @private
   */
  rotate90CW (bits, width, height, store) {
    let rotated = 0n
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.cellAt(bits, x, y, width, store)) {
          // (x,y) -> (height-1-y, x) in rotated system
          const newX = height - 1 - y
          const newY = x
          rotated = this.setCellAt(rotated, newX, newY, height, store)
        }
      }
    }
    return rotated
  }

  /**
   * Flip horizontally
   * @private
   */
  flipHorizontal (bits, width, height, store) {
    let flipped = 0n
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.cellAt(bits, x, y, width, store)) {
          flipped = this.setCellAt(flipped, width - 1 - x, y, width, store)
        }
      }
    }
    return flipped
  }

  /**
   * Get bounding box of occupied cells
   * @private
   */
  getBoundingBox (bits, width, height, store) {
    let minX = width
    let maxX = -1
    let minY = height
    let maxY = -1

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.cellAt(bits, x, y, width, store)) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }

    return maxX >= 0 ? { minX, minY, maxX, maxY } : null
  }

  /**
   * Check if cell is occupied at (x, y)
   * @private
   */
  cellAt (bits, x, y, width, store) {
    const idx = y * width + x
    return ((bits >> BigInt(idx)) & 1n) === 1n
  }

  /**
   * Set cell at (x, y)
   * @private
   */
  setCellAt (bits, x, y, width, store) {
    const idx = y * width + x
    return bits | (1n << BigInt(idx))
  }

  /**
   * Get frontier cells (unoccupied neighbors of occupied cells)
   * @private
   */
  getFrontier (bits, width, height, store) {
    const frontier = new Set()

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.cellAt(bits, x, y, width, store)) {
          // Check neighbors
          const neighbors = this.getNeighbors(x, y, width, height)
          for (const [nx, ny] of neighbors) {
            if (!this.cellAt(bits, nx, ny, width, store)) {
              frontier.add(ny * width + nx)
            }
          }
        }
      }
    }

    return Array.from(frontier).sort((a, b) => a - b)
  }

  /**
   * Get neighbors of a cell
   * @private
   */
  getNeighbors (x, y, width, height) {
    const neighbors = []

    // 4-connectivity
    if (y > 0) neighbors.push([x, y - 1])
    if (y < height - 1) neighbors.push([x, y + 1])
    if (x > 0) neighbors.push([x - 1, y])
    if (x < width - 1) neighbors.push([x + 1, y])

    // 8-connectivity additions
    if (this.connectivity === '8') {
      if (y > 0 && x > 0) neighbors.push([x - 1, y - 1])
      if (y > 0 && x < width - 1) neighbors.push([x + 1, y - 1])
      if (y < height - 1 && x > 0) neighbors.push([x - 1, y + 1])
      if (y < height - 1 && x < width - 1) neighbors.push([x + 1, y + 1])
    }

    return neighbors
  }

  /**
   * Redelmeier recursion with frontier ordering constraint
   * Key: only add cells that come after the last added in frontier
   * This prevents exploring equivalent subtrees
   * @private
   */
  *redelmeierRecursive (
    bits,
    targetSize,
    currentSize,
    width,
    height,
    store,
    seen,
    minFrontierIdx = -1
  ) {
    if (currentSize === targetSize) {
      // Get canonical form
      const canonical = this.getCanonicalForm(bits, width, height, store)
      const hash = canonicalToString(canonical[0], canonical[1], canonical[2])

      if (!seen.has(hash)) {
        seen.add(hash)
        yield new Mask(canonical[1], canonical[2], canonical[0], store, 1)
      }
      return
    }

    const frontier = this.getFrontier(bits, width, height, store)

    // Only consider frontier cells that come after minFrontierIdx
    for (let i = 0; i < frontier.length; i++) {
      const cellIdx = frontier[i]
      if (cellIdx <= minFrontierIdx) continue // Skip cells we've already "considered" as minimum

      const newBits = bits | (1n << BigInt(cellIdx))

      // Recurse with new minimum frontier index (this cell)
      // This ensures we never explore the same growth path twice
      yield* this.redelmeierRecursive(
        newBits,
        targetSize,
        currentSize + 1,
        width,
        height,
        store,
        seen,
        cellIdx
      )
    }
  }

  /**
   * Generate polyominoes of a specific size
   */
  *generate (cellCount) {
    if (cellCount < 1) {
      throw new Error('cellCount must be >= 1')
    }

    const board = this.createBoard(cellCount)
    const width = board.width
    const height = board.height
    const store = board.store

    // Start with single cell at index 0
    // This is the Redelmeier convention for canonical generation
    const seed = 1n

    const seen = new Set()
    yield* this.redelmeierRecursive(
      seed,
      cellCount,
      1,
      width,
      height,
      store,
      seen,
      -1
    )
  }

  /**
   * Generate polyominoes in a size range
   */
  *generateRange (minSize, maxSize) {
    if (minSize < 1 || maxSize < minSize) {
      throw new Error('minSize >= 1 and maxSize >= minSize required')
    }

    for (let size = minSize; size <= maxSize; size++) {
      yield* this.generate(size)
    }
  }

  /**
   * Count unique polyominoes of a given size
   */
  count (cellCount) {
    let count = 0
    for (const _ of this.generate(cellCount)) {
      count++
    }
    return count
  }

  /**
   * Collect all polyominoes of a given size
   */
  collectAll (cellCount) {
    const result = []
    for (const mask of this.generate(cellCount)) {
      result.push(mask)
    }
    return result
  }

  /**
   * Collect polyominoes in a size range
   */
  collectAllInRange (minSize, maxSize) {
    const result = []
    for (const mask of this.generateRange(minSize, maxSize)) {
      result.push(mask)
    }
    return result
  }
}

/**
 * Convert canonical polyomino to string for hashing
 * @private
 */
function canonicalToString (bits, width, height) {
  return `${bits.toString(36)}:${width}x${height}`
}

/**
 * Factory functions
 */

/**
 * Create a 4-connected (orthogonal) polyomino generator
 */
export function createOrthoPolyominoGenerator () {
  return new RedelmeierGenerator('4')
}

/**
 * Create an 8-connected (king-connected) polyomino generator
 */
export function createKingPolyominoGenerator () {
  return new RedelmeierGenerator('8')
}
