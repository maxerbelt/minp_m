/**
 * ParameterManager - Centralized URL parameter management
 * Handles getting and setting URL search parameters with validation
 */
export class ParameterManager {
  constructor (urlParams) {
    this.url = new URL(globalThis.location)
    this.params = urlParams || new URLSearchParams(globalThis.location.search)
  }

  // ============================================================================
  // Getters - Extract URL parameters
  // ============================================================================

  /**
   * Get size parameters (height, width)
   */
  getSize () {
    const height = Number.parseInt(this.params.getAll('height')[0], 10)
    const width = Number.parseInt(this.params.getAll('width')[0], 10)
    return { height, width }
  }

  /**
   * Get map name from parameters
   */
  getMapName () {
    return this.params.getAll('mapName')[0]
  }

  /**
   * Get edit mode map name
   */
  getEditMap () {
    return this.params.getAll('edit')[0]
  }

  /**
   * Get map type filter
   */
  getMapType () {
    return this.params.getAll('mapType')[0]
  }

  /**
   * Get terrain tag
   */
  getTerrain () {
    return this.params.getAll('terrain')[0]
  }

  /**
   * Check if in edit mode
   */
  isEditMode () {
    return !!this.getEditMap()
  }

  /**
   * Check if placed ships parameter exists
   */
  hasPlacedShips () {
    return this.params.has('placedShips')
  }

  // ============================================================================
  // Setters - Update URL parameters
  // ============================================================================

  /**
   * Set size parameters (height, width)
   */
  setSize (height, width) {
    this._validateNumbers(height, width)
    this.params.delete('mapName')
    this.params.set('height', height)
    this.params.set('width', width)
  }

  /**
   * Set map name parameter
   */
  setMapName (mapName) {
    if (mapName) {
      this.params.delete('width')
      this.params.delete('height')
      this.params.set('mapName', mapName)
    }
  }

  /**
   * Set terrain parameter
   */
  setTerrain (terrainTag) {
    if (terrainTag) {
      this.params.set('terrain', terrainTag)
    }
  }

  /**
   * Set map type filter
   */
  setMapType (mapType) {
    mapType = this._extractFirstWord(mapType)
    if (mapType) {
      this.params.delete('mapName')
      this.params.delete('height')
      this.params.delete('width')
      this.params.set('mapType', mapType)
    }
  }

  /**
   * Clear map-related parameters (mapName, height, width)
   */
  clearMapParams () {
    this.params.delete('mapName')
    this.params.delete('width')
    this.params.delete('height')
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Set all parameters at once
   */
  setAll (paramMap) {
    for (const [key, value] of Object.entries(paramMap)) {
      if (value !== null && value !== undefined) {
        this.params.set(key, value)
      }
    }
  }

  /**
   * Delete multiple parameters
   */
  deleteAll (keys) {
    for (const key of keys) {
      this.params.delete(key)
    }
  }

  /**
   * Update browser history with current parameters
   */
  updateHistoryState (pageTitle = '') {
    this.url.search = this.params.toString()
    history.pushState({}, pageTitle, this.url.toString())
  }

  /**
   * Update history and refresh page
   */
  updateAndRefresh (pageTitle = '') {
    this.updateHistoryState(pageTitle)
    globalThis.location.reload()
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Extract first word from string (for map type)
   * @private
   */
  _extractFirstWord (text) {
    return text?.split(' ', 1)[0]
  }

  /**
   * Validate that numbers are not NaN
   * @private
   */
  _validateNumbers (...numbers) {
    for (const num of numbers) {
      if (!Number.isNaN(num) && typeof num !== 'number') {
        throw new Error(`Invalid number: ${num}`)
      }
    }
  }

  /**
   * Get current parameters as object
   */
  toObject () {
    const obj = {}
    for (const [key, value] of this.params) {
      obj[key] = value
    }
    return obj
  }
}
