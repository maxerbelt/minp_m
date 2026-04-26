/**
 * Common utilities for canvas modules
 */

/**
 * Create a canvas initializer function
 * @param {string} canvasId - The canvas element ID
 * @param {Function} CanvasClass - The Canvas class constructor
 * @param {Object} drawInstance - The draw instance
 * @returns {Function} - The initializer function
 */
export function createCanvasInitializer (canvasId, CanvasClass, drawInstance) {
  let canvasInstance = null
  return function initializeCanvas () {
    if (canvasInstance) return
    if (typeof document === 'undefined') return

    canvasInstance = new CanvasClass(canvasId, drawInstance)
    canvasInstance.initializeAll()
    return canvasInstance
  }
}

/**
 * Update button states via canvas
 * @param {Object} canvasInstance - The canvas instance
 */
export function updateButtons (canvasInstance) {
  if (canvasInstance) canvasInstance.updateButtonStates()
}

/**
 * Set morphology buttons
 * @param {Object} canvasInstance - The canvas instance
 * @param {Object} buttons - { dilate, erode, cross }
 */
export function setMorphologyButtons (canvasInstance, { dilate, erode, cross }) {
  if (!canvasInstance) return
  if (dilate) canvasInstance.dilateBtn = dilate
  if (erode) canvasInstance.erodeBtn = erode
  if (cross) canvasInstance.crossBtn = cross
}

/**
 * Check morphology operation
 * @param {Object} canvasInstance - The canvas instance
 * @param {string} op - The operation
 * @returns {boolean}
 */
export function checkMorphology (canvasInstance, op) {
  if (!canvasInstance) return false
  return canvasInstance.checkMorphology(op)
}

/**
 * Get canvas state for testing
 * @param {Object} canvasInstance - The canvas instance
 * @param {Object} localState - Local state variables
 * @returns {Object|null}
 */
export function getCanvasState (canvasInstance, localState) {
  if (!canvasInstance) return null
  return {
    currentTool: canvasInstance.currentTool,
    currentAction: canvasInstance.currentAction,
    coverType: canvasInstance.coverType,
    lineStart: canvasInstance.lineStart,
    ...localState
  }
}

/**
 * Set canvas state for testing
 * @param {Object} canvasInstance - The canvas instance
 * @param {Object} localState - Local state variables
 * @param {Object} state - State to set
 */
export function setCanvasState (canvasInstance, localState, state) {
  if (!canvasInstance) return
  if (state.currentTool !== undefined) {
    canvasInstance.currentTool = state.currentTool
    localState.currentTool = state.currentTool
  }
  if (state.currentAction !== undefined) {
    canvasInstance.currentAction = state.currentAction
    localState.currentAction = state.currentAction
  }
  if (state.coverType !== undefined) {
    canvasInstance.coverType = state.coverType
    localState.coverType = state.coverType
  }
  if (state.lineStart !== undefined) {
    canvasInstance.lineStart = state.lineStart
    localState.lineStart = state.lineStart
  }
  if (state.currentColor !== undefined) {
    canvasInstance.currentColor = state.currentColor
    localState.currentColor = state.currentColor
  }
}
