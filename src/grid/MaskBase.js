import { CanvasGrid } from './canvasGrid.js'
import { ForLocation } from './ForLocation.js'
import { StoreBig } from './bitStore/storeBig.js'
import { BitOperations } from './operations/BitOperations.js'
import { BorderRegions } from './operations/BorderRegions.js'
import { MorphologicalOps } from './operations/MorphologicalOps.js'
import { MaskValidation } from './operations/MaskValidation.js'
import { AsciiRepresentation } from './AsciiRepresentation.js'
import { CoordinateConversion } from './operations/CoordinateConversion.js'

export class MaskBase extends CanvasGrid {
  constructor (shape, depth = 1, bits, store) {
    super(shape)
    // Pass width and height to StoreBig so it can compute row/word layout
    this.store =
      store ||
      new StoreBig(depth, this.indexer.size, undefined, this.width, this.height)
    this.bits = bits || this.store.empty
    this.depth = depth
  }
  get minSize () {
    return Math.min(this.height, this.width)
  }
  get maxSize () {
    return Math.max(this.height, this.width)
  }
  get isTall () {
    return this.height > this.width
  }
  get isWide () {
    return this.width > this.height
  }
  get isSquare () {
    return this.width === this.height
  }

  /**
   * Get or create a lazy-loaded helper instance
   * @param {string} name - Name of the helper property (without underscore)
   * @param {Function} Constructor - Constructor function for the helper
   * @returns {*} The helper instance
   */
  #getHelper (name, Constructor) {
    const propName = `__${name}`
    if (!this[propName]) {
      this[propName] = new Constructor(this)
    }
    return this[propName]
  }

  // Lazy-loaded helper instances
  get _bitOps () {
    return this.#getHelper('bitOps', BitOperations)
  }

  get _borderRegions () {
    return this.#getHelper('borderRegions', BorderRegions)
  }

  get _morphOps () {
    return this.#getHelper('morphOps', MorphologicalOps)
  }

  get _validation () {
    return this.#getHelper('validation', MaskValidation)
  }

  get _ascii () {
    return this.#getHelper('ascii', AsciiRepresentation)
  }

  get _coords () {
    return this.#getHelper('coords', CoordinateConversion)
  }

  index (...args) {
    return this.indexer.index(...args)
  }
  bitPos (...args) {
    return this.store.bitPos(this.index(...args))
  }

  // ============================================================================
  // Cell Access - set, at, test, clear, add
  // ============================================================================

  /**
   * Set cell value at (x, y) with optional color
   */
  set (x, y, color = 1) {
    const loc = this.for(x, y)
    this.bits = loc.set(color)
    return this.bits
  }
  /**
   * Test if cell at (x, y) matches color value
   */
  test (x, y, color = 1) {
    return this.for(x, y).test(color)
  }

  /**
   * Add (set) a cell - alias for set
   */
  add (x, y, color = 1) {
    return this.set(x, y, color)
  }

  /**
   * Clear (zero out) a cell at (x, y)
   */
  clear (x, y) {
    return this.set(x, y, 0)
  }

  /**
   * Get cell value at (x, y)
   */
  at (x, y) {
    return this.for(x, y).at()
  }

  for (...args) {
    const pos = this.bitPos(...args)
    return new ForLocation(pos, this.bits, this.store)
  }
  get occupancy () {
    return this.store.occupancy(this.bits)
  }

  get size () {
    return this._size ? this._size : this.occupancy
  }
  set size (v) {
    const nv = Number(v)
    if (nv > 0) this._size = nv
  }

  // ============================================================================
  // Bit Manipulation - Common patterns for concrete classes
  // ============================================================================

  /**
   * Add a bit at the given store-level index
   * @template - Called by cell-coordinate specific methods
   * @protected
   */
  _addBitAtIndex (bits, index) {
    return this.store.addBit(bits, index)
  }

  /**
   * Get bit mask for a cell at given store index
   * Used to create cell-specific bit masks for multi-value operations
   * @protected
   */
  _getBitMaskForIndex (index) {
    if (this.store.bitMaskByPos) {
      return this.store.bitMaskByPos(this.store.bitPos(index))
    }
    return 1n << BigInt(index)
  }

  /**
   * Check if a specific bit position is set in the bits
   * @protected
   */
  _isBitSetAtIndex (bits, index) {
    const bitPosition = this.store.bitPos(index)
    return this.store.value(bits, bitPosition) !== 0
  }

  // ============================================================================
  // Mask Creation & Factory Methods
  // ============================================================================

  /**
   * Create a new instance of this mask class
   * @param {number} width - Mask width
   * @param {number} height - Mask height
   * @param {number} [depth] - Optional depth override
   * @returns {*} New mask instance
   */
  #createMaskInstance (
    width = this.width,
    height = this.height,
    depth = this.depth
  ) {
    const Ctor = this.constructor
    return new Ctor(width, height, null, null, depth)
  }

  /**
   * Create empty mask of same shape and depth
   * Must be implemented or overridden in subclasses that use non-standard constructors
   * @abstract
   */
  get emptyMask () {
    // Default implementation for rectangular masks
    return this.#createMaskInstance()
  }

  get square () {
    if (this.width === this.height) return this.clone
    const size = Math.max(this.width, this.height)
    const mask = this.#createMaskInstance(size, size)
    mask.bits = this.store.expandToSquare(this.bits, this.height, this.width)
    return mask
  }

  expandToSquare (bits, gridHeight, gridWidth) {
    if (gridHeight === gridWidth) return bits
    const N = Math.max(gridHeight, gridWidth)
    return this.expandToWidth(gridWidth, gridHeight, bits, N)
  }

  /**
   * Create empty mask of same shape and depth
   * Must be implemented or overridden in subclasses that use non-standard constructors
   * @abstract
   */
  emptyMaskOfSize (
    width = this.width,
    height = this.height,
    depth = this.depth
  ) {
    // Default implementation for rectangular masks
    return this.#createMaskInstance(width, height, depth)
  }

  /**
   * Create a mask with specific bits
   * @private
   * @param {bigint} bits - Bits to set on the mask
   * @returns {*} New mask instance with the specified bits
   */
  _createMaskWithBits (bits) {
    const mask = this.emptyMask
    mask.bits = bits
    return mask
  }

  /**
   * Create full (all bits set) mask of same shape
   * @template
   */
  get fullMask () {
    return this._createMaskWithBits(this.fullBits)
  }

  /**
   * Create inverted mask of same shape
   * @template
   */
  get invertedMask () {
    return this._createMaskWithBits(this.invertedBits)
  }

  /**
   * Clone this mask with identical bits and depth
   * Preserves depth which may differ from default value
   */
  get clone () {
    // create a new instance of the same class with identical dimensions
    // and depth.  Using emptyMask previously defaulted to depth=4 which
    // broke occupancy clones used by rectcolor compute (depth=1) – see
    // updateButtonStates2 BigInt test failures.
    const mask = this.#createMaskInstance()
    mask.bits = this.cloneBits
    return mask
  }
  get cloneBits () {
    return this.store.clone(this.bits)
  }
  // ============================================================================
  // Range Operations Helper
  // ============================================================================
  _applyRangeOperation (ranges, operation) {
    for (const [r, c0, c1] of ranges) {
      operation.call(this, r, c0, c1)
    }
  }
  setRange (r, c0, c1) {
    this.bits = this.store.setRange(this.bits, this.index(0, r), c0, c1)
  }
  setRanges (ranges) {
    this._applyRangeOperation(ranges, this.setRange)
  }
  clearRange (r, c0, c1) {
    this.bits = this.store.clearRange(this.bits, this.index(0, r), c0, c1)
  }
  clearRanges (ranges) {
    this._applyRangeOperation(ranges, this.clearRange)
  }
  get fullBits () {
    return this.store.fullBits
  }
  get invertedBits () {
    return this.store.invertedBits(this.bits)
  }

  applyTransform (bbc, map) {
    let out = bbc.store.empty
    for (const i of this.indexer.bitsIndices(bbc.bits)) {
      out = bbc.store.setIdx(out, map[i], 1n)
    }
    return out
  }
  get toAscii () {
    return this._ascii.toAscii()
  }
  toAsciiWith (
    symbols = [
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
  ) {
    return this._ascii.toAsciiWith(symbols)
  }
  // ============================================================================
  // Bitwise Operations (delegated to BitOperations helper)
  // ============================================================================
  bitOr (bits) {
    return this._bitOps.or(bits)
  }
  joinFromBits (bits) {
    return this._bitOps.createUnionMask(bits)
  }
  joinWith (bb) {
    if (typeof bb.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    if (bb instanceof MaskBase) {
      this._validation.assertCompatibleWith(bb)
      this.joinWithBits(bb.bits)
    }
  }
  joinWithBits (bits) {
    this.bits = this._bitOps.or(bits)
  }

  bitSub (bits) {
    return this._bitOps.subtract(bits)
  }
  bitAnd (bits) {
    return this._bitOps.and(bits)
  }
  overlapFromBits (bits) {
    return this._bitOps.createIntersectionMask(bits)
  }
  overlap (bb) {
    if (typeof bb.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    this._validation.assertCompatibleWith(bb)
    return this.overlapFromBits(bb.bits)
  }
  takeFromBits (bits) {
    return this._bitOps.createDifferenceMask(bits)
  }
  take (bb) {
    if (typeof bb.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    this._validation.assertCompatibleWith(bb)
    return this.takeFromBits(bb.bits)
  }
  takeManyFromBits (bits, bbs) {
    for (const bb of bbs) {
      this._validation.assertCompatibleWith(bb)
    }
    return this.store.bitSubMany(
      bits,
      bbs.map(bb => bb.bits)
    )
  }

  takeMany (bbs) {
    const result = this.emptyMask
    result.bits = this.takeManyFromBits(this.bits, bbs)
    return result
  }
  join (bb) {
    if (typeof bb.toMaskMatching === 'function') {
      bb = bb.toMaskMatching(this)
    }
    this._validation.assertCompatibleWith(bb)
    return this.joinFromBits(bb.bits)
  }
  *bitsOccupied () {
    return yield* this.store.bitsOccupied(this.bits)
  }
  *bitsEmpty () {
    return yield* this.store.bitsOccupied(this.invertedBits)
  }
  get outerBorderBits () {
    return this._borderRegions.getOuterBorderBits()
  }
  get outerBorderMask () {
    return this._borderRegions.createOuterBorderMask()
  }
  get outerAreaBits () {
    return this._borderRegions.getOuterAreaBits()
  }
  get outerAreaMask () {
    return this._borderRegions.createOuterAreaMask()
  }
  get innerBorderBits () {
    return this._borderRegions.getInnerBorderBits()
  }
  get innerBorderMask () {
    return this._borderRegions.createInnerBorderMask()
  }
  get innerAreaMask () {
    return this._borderRegions.createInnerAreaMask()
  }

  normalize () {
    this.bits = this.store.normalizeUpLeft(this.bits, this.width, this.height)
  }
  shrinkToOccupied () {
    const { bitboard, newWidth, newHeight } = this.store.shrinkToOccupied(
      this.bits,
      this.width,
      this.height
    )
    const result = this.emptyMaskOfSize(newWidth, newHeight, this.depth)
    result.bits = bitboard
    result.width = newWidth
    result.height = newHeight
    return result
  }
  *occupiedLocationsAndValues () {
    const all = this.store.all
    return yield* all.occupiedLocationsAndValues(this.bits)
  }
  *occupiedLocations () {
    const all = this.store.all
    return yield* all.occupiedLocations(this.bits)
  }
  *allXYlocations () {
    const all = this.store.all
    return yield* all.locations()
  }
  // ============================================================================
  // Color Layer Operations
  // ============================================================================
  _createSingleBitMaskFromBits (bits) {
    const mask = this.emptyMaskOfSize(this.width, this.height, 1)
    mask.bits = bits
    return mask
  }
  _createMaskFromBits (bits) {
    const mask = this.emptyMaskOfSize(this.width, this.height, this.depth)
    mask.bits = bits
    return mask
  }
  extractColorLayerBits (color) {
    return this.store.extractColorLayer(
      this.bits,
      color,
      this.width,
      this.height
    )
  }
  extractColorLayer (color) {
    return this._createSingleBitMaskFromBits(this.extractColorLayerBits(color))
  }
  extractColorLayersBits () {
    return this.store.extractColorLayers(this.bits, this.width, this.height)
  }
  extractColorLayers () {
    return this.extractColorLayersBits().map(bits =>
      this._createSingleBitMaskFromBits(bits)
    )
  }
  occupancyLayerBits () {
    return this.store.occupancyLayer(this.bits)
  }
  occupancyLayer () {
    return this._createSingleBitMaskFromBits(this.occupancyLayerBits())
  }
  // ============================================================================
  // Width/Dimension Expansion
  // ============================================================================
  expandBits (newWidth) {
    return this.store.expandToWidth(
      this.width,
      this.height,
      this.bits,
      newWidth
    )
  }
  expand (newWidth, newHeight) {
    const bits = this.expandBits(newWidth)
    const m = this.emptyMaskOfSize(newWidth, newHeight, this.depth)
    m.bits = bits
    return m
  }

  // ============================================================================
  // Layer Composition Operations
  // ============================================================================
  _expandLayersToWidth (layers) {
    return layers.map(layer => {
      if (typeof layer?.expandBits === 'function') {
        return layer.expandBits(this.width)
      }
      // If it's just bits (bigint), expand them
      return this.store.expandToWidth(
        this.width,
        this.height,
        layer,
        this.width
      )
    })
  }
  _computeBackgroundLayerFromMasks (expandedLayers) {
    let backgroundBits = this.cloneBits
    return this.store.bitSubMany(backgroundBits, expandedLayers)
  }
  addToLayersBits (layers) {
    const expandedLayers = this._expandLayersToWidth(layers)
    const backgroundLayer =
      this._computeBackgroundLayerFromMasks(expandedLayers)
    return [backgroundLayer, ...expandedLayers]
  }
  addToLayers (layers) {
    return this.addToLayersBits(layers).map(bits =>
      this._createSingleBitMaskFromBits(bits)
    )
  }
  addLayersBits (layers) {
    const expandedLayers = this._expandLayersToWidth(layers)
    return this.store.assembleColorLayers(
      expandedLayers,
      this.width,
      this.height
    )
  }
  addLayers (layers) {
    const oldBits = this.cloneBits
    this.bits = this.emptyBitboard()
    const newDepth = layers.length + 2
    this.depth = newDepth
    this.store = this.defaultStore(newDepth, this.width, this.height)
    const bitss = [...layers].map(layer => layer.bits)
    this.bits = this.addLayersBits([oldBits, ...bitss])
  }

  // ============================================================================
  // Morphological Operations (delegated to MorphologicalOps helper)
  // ============================================================================
  /**
   * Expand the set bits by the given radius.  Mutates `this.bits` and returns
   * the mask for chaining.
   */
  dilate (radius = 1) {
    return this._morphOps.dilate(radius)
  }
  dilateBits (radius = 1) {
    return this._morphOps.dilateBits(radius)
  }
  dilateExpand (borderSize = 1, fillValue = 0) {
    const newMask = this.expandBorderMask(borderSize, fillValue) || this
    const dilated = newMask.dilate()
    return dilated
  }
  flatDilateExpand (borderSize = 1) {
    const newMask = this.flattenExpandMask(borderSize) || this
    const dilated = newMask.dilate()
    return dilated
  }
  /**
   * Perform a cross (cardinal directions) dilation.  Mutates bits and returns
   * `this` so callers can chain operations.
   */
  dilateCross () {
    return this._morphOps.dilateCross()
  }
  dilateCrossBits () {
    return this._morphOps.dilateCrossBits()
  }
  /**
   * Shrink the set bits by the given radius (clamped at the edges). Like a
   * morphological erosion.  Mutates `this.bits` and returns the mask for
   * chaining.
   */
  erode (radius = 1) {
    return this._morphOps.erode(radius)
  }
  erodeBits (radius = 1) {
    return this._morphOps.erodeBits(radius)
  }
}
