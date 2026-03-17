// Common base class for Actions and ActionsHex
// Contains shared logic for applying transformations and computing orbits/symmetries

export class ActionsBase {
  constructor (width, height, mask = null, rotateTags = null, flipTags = null) {
    this.width = width
    this.height = height
    this.original = mask
    this.rotateTags = rotateTags
    this.flipTags = flipTags
  }

  // Accessors reused by both subclasses
  get store () {
    if (this._store) return this._store
    this._store = this.original?.store //.resized(this.width, this.height)
    return this._store
  }

  get indexer () {
    if (this._indexer) return this._indexer
    this._indexer = this.original?.indexer //.resized(this.width, this.height)
    return this._indexer
  }

  get transformMaps () {
    // square version may override via lazy property, hex version uses
    // indexer.transformMaps so this is a reasonable default
    return this.original?.indexer?.transformMaps
  }
  get rotTags () {
    if (!this.transformMaps) return []
    this.rotateTags =
      this.rotateTags ||
      Object.keys(this.transformMaps).filter(k => k.includes('r'))
    return this.rotateTags || []
  }
  get flpTags () {
    if (!this.transformMaps) return []
    this.flipTags =
      this.flipTags ||
      Object.keys(this.transformMaps).filter(k => k.includes('f'))
    return this.flipTags || []
  }
  get defaultVariant () {
    if (this._defaultVariant) return this._defaultVariant
    if (!this.transformMaps) return null
    const defaultMap = this._defaultMap()
    if (!defaultMap) return null
    this._defaultVariant = this.applyMap(defaultMap)
    return this._defaultVariant
  }
  get rotVariantsRaw () {
    return this.rotTags.map(tag => this.applyMapByName(tag))
  }

  get flpVariantsRaw () {
    return this.flpTags.map(tag => this.applyMapByName(tag))
  }
  get rotationVariants () {
    if (this._rotationVariants) return [...this._rotationVariants]
    const rv = new Set([this.defaultVariant, ...this.rotVariantsRaw])
    rv.delete(this.defaultVariant)
    this._rotationVariants = [...rv]
    return [...this._rotationVariants]
  }
  get flipVariants () {
    if (this._flipVariants) return [...this._flipVariants]
    const fv = new Set([this.defaultVariant, ...this.flpVariantsRaw])
    fv.delete(this.defaultVariant)
    this._flipVariants = [...fv]
    return [...this._flipVariants]
  }
  canRotate () {
    return this.rotationVariants.length !== 0
  }
  canFlip () {
    return this.flipVariants.length !== 0
  }
  rotate (bits = null) {
    if (!this.canRotate()) {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    return this.applyMapByName(
      this.rotateTags.find(tag => this.nonSymetric(tag)),
      bits
    )
  }
  rotateCCW (bits = null) {
    if (!this.canRotate()) {
      throw new Error('No non-symmetric rotation found for this shape')
    }
    const tags = this.rotateTags.slice().reverse()
    // find the first non-symmetric rotation and apply its inverse
    const tag = tags.find(tag => this.nonSymetric(tag))
    return this.applyMapByName(tag, bits)
  }
  flip (bits = null) {
    if (!this.canFlip()) {
      throw new Error('No non-symmetric flip found for this shape')
    }
    return this.applyMapByName(
      this.flipTags.find(tag => this.nonSymetric(tag)),
      bits
    )
  }
  rotateFlip (bits = null) {
    const flipped = this.flip(bits)
    return this.rotate(flipped)
  }

  nonSymetric (tag) {
    const map = this.transformMaps?.[tag]
    return map != null && this.applyMap(map) != this.original.bits
  }

  applyMapByName (tag, bits = null) {
    const map = this.transformMaps?.[tag]
    return this.applyMap(map, bits)
  }

  // default normalization delegates to store when available; subclasses
  // may override if custom behaviour is required
  normalized (bits) {
    const b = bits == null ? this.template : bits
    if (this.store && typeof this.store.normalizeUpLeft === 'function') {
      return this.store.normalizeUpLeft(b, this.width, this.height)
    }
    // fallback: subclasses should override
    throw new Error('normalized() not implemented in subclass')
  }

  // helper that chooses the appropriate bitsIndices implementation
  _bitsIndices (b) {
    // Prefer cube over indexer if available
    if (this.cube && typeof this.cube.bitsIndices === 'function') {
      return this.cube.bitsIndices(b)
    }
    if (this.indexer && typeof this.indexer.bitsIndices === 'function') {
      // guard against bitboard types that the default implementation can't
      // iterate (Store32 returns Uint32Array which breaks bitsSafe)
      if (Array.isArray(b) || b instanceof Uint32Array) {
        // fall through to generic path below
      } else {
        return this.indexer.bitsIndices(b)
      }
    }
    // generic fallback: iterate all possible indices using store.isNonZero
    if (
      this.store &&
      typeof this.store.isNonZero === 'function' &&
      (this.indexer?.size || this.cube?.size)
    ) {
      const size = this.indexer?.size || this.cube?.size
      const store = this.store
      const bb = b
      return (function* () {
        for (let i = 0; i < size; i++) {
          if (store.isNonZero(bb, i)) yield i
        }
      })()
    }
    throw new Error('no bitsIndices implementation available')
  }
  // helper that chooses the appropriate bitsIndices implementation
  _indices (b) {
    // Prefer cube over indexer if available
    if (this.cube && typeof this.cube.bitsIndices === 'function') {
      return this.cube.indices(b)
    }
    if (typeof this.indexer?.indices === 'function') {
      // guard against bitboard types that the default implementation can't
      // iterate (Store32 returns Uint32Array which breaks bitsSafe)
      if (Array.isArray(b) || b instanceof Uint32Array) {
        // fall through to generic path below
      } else {
        return this.indexer.indices(b)
      }
    }
    // generic fallback: iterate all possible indices using store.isNonZero
    if (this.indexer?.size || this.cube?.size) {
      const size = this.indexer?.size || this.cube?.size
      return (function* () {
        for (let i = 0; i < size; i++) {
          yield i
        }
      })()
    }
    throw new Error('no indices implementation available')
  }
  // convert arbitrary bitboard to bigint based on indices iterator
  _convertToBigint (b) {
    let out = 0n
    for (const i of this._bitsIndices(b)) {
      out |= 1n << BigInt(i)
    }
    return out
  }

  // pick a reasonable default map; subclasses can override if they need a
  // different default
  _defaultMap () {
    const maps = this.transformMaps
    if (Array.isArray(maps)) {
      return maps[0]
    }
    if (maps?.id !== undefined) {
      return maps.id
    }
    return undefined
  }

  applyMap (map = this._defaultMap(), bits = null) {
    let out = this.store?.empty || 0n
    const b = bits == null ? this.template : bits
    for (const i of this._indices(b)) {
      // Guard against undefined map entries (can occur with incomplete maps)
      const mappedIndex = map[i]
      if (mappedIndex !== undefined) {
        const color = this.store.getIdx(b, i)
        out = this.store.setIdx(out, mappedIndex, color)
      }
    }
    return this.normalized(out)
  }
  orbitRaw (maps = this.transformMaps) {
    if (!maps) return []
    if (Array.isArray(maps)) {
      return maps.map(m => this.applyMap(m))
    }
    // object-style maps (square transforms)
    return Object.values(maps).map(m => this.applyMap(m))
  }
  orbit (maps = this.transformMaps) {
    if (maps === this.transformMaps) {
      if (this._orbit) return [...this._orbit]
      this._orbit = this.orbitRaw(maps)
      return [...this._orbit]
    }

    return this.orbitRaw(maps)
  }

  classifyOrbitType () {
    // subclasses are expected to implement their own logic depending on
    // group size and naming conventions
    throw new Error('classifyOrbitType() not implemented in subclass')
  }

  get order () {
    return this.symmetries.length
  }

  get symmetries () {
    if (this._symmetries) return [...this._symmetries]
    const imgs = this.orbit(this.transformMaps)
    this._symmetries = [...new Set(imgs)]
    return [...this._symmetries]
  }
}
