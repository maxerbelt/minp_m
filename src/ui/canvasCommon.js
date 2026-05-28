/**
 * Common utilities for canvas modules
 * Provides factory functions and helpers for canvas initialization and state management.
 *
 * @module ui/canvasCommon
 */

/**
 * @typedef {Object} CanvasInstance
 * @property {string} currentTool - The current drawing tool
 * @property {string} currentAction - The current action being performed
 * @property {string} coverType - The type of cover (dilate, erode, cross)
 * @property {Object|null} lineStart - Starting point for line operations
 * @property {string} currentColor - The current drawing color
 * @property {Function} initializeAll - Initialize all canvas components
 * @property {Function} updateButtonStates - Update UI button states
 * @property {Function} checkMorphology - Check morphology operation
 */

/**
 * @typedef {Function} CanvasConstructor
 * A constructor function that creates a canvas instance.
 * @param {string} canvasId - The HTML canvas element ID
 * @param {Object} drawInstance - The draw utility instance
 * @returns {CanvasInstance}
 */

/**
 * Create a canvas initializer function that lazily initializes a canvas instance.
 * The returned function will only create the canvas instance on first call if the document is available.
 *
 * @param {string} canvasId - The HTML canvas element ID to target
 * @param {CanvasConstructor} CanvasClass - The Canvas class constructor function
 * @param {Object} drawInstance - The draw utility instance to pass to the Canvas constructor
 * @returns {Function} A function that initializes and returns the canvas instance on first call
 * @example
 * const MyCanvas = class { initializeAll() {} };
 * const init = createCanvasInitializer('my-canvas', MyCanvas, drawUtil);
 * const canvas = init(); // First call creates instance
 * const same = init(); // Second call returns same instance
 */
export function createCanvasInitializer (canvasId, CanvasClass, drawInstance) {
  let canvasInstance = null
  return function initializeCanvas () {
    if (canvasInstance) return canvasInstance
    if (typeof document === 'undefined') return null

    canvasInstance = new CanvasClass(canvasId, drawInstance)
    canvasInstance.initializeAll()
    return canvasInstance
  }
}

/**
 * Update button states by delegating to the canvas instance.
 * No-op if canvas instance is not available or falsy.
 *
 * @param {CanvasInstance|null} canvasInstance - The canvas instance to update
 * @returns {void}
 * @see CanvasInstance#updateButtonStates
 */
export function updateButtons (canvasInstance) {
  if (canvasInstance) canvasInstance.updateButtonStates()
}

/**
 * @typedef {Object} MorphologyButtons
 * @property {HTMLElement|undefined} dilate - The dilate button element
 * @property {HTMLElement|undefined} erode - The erode button element
 * @property {HTMLElement|undefined} cross - The cross morphology button element
 */

/**
 * Set morphology operation buttons on the canvas instance.
 * Only sets buttons that are provided in the configuration object.
 * No-op if canvas instance is not available.
 *
 * @param {CanvasInstance|null} canvasInstance - The canvas instance to configure
 * @param {MorphologyButtons} options - Button elements to assign
 * @param {HTMLElement} [options.dilate] - The dilate button element
 * @param {HTMLElement} [options.erode] - The erode button element
 * @param {HTMLElement} [options.cross] - The cross morphology button element
 * @returns {void}
 * @example
 * setMorphologyButtons(canvas, {
 *   dilate: document.getElementById('dilate-btn'),
 *   erode: document.getElementById('erode-btn'),
 *   cross: document.getElementById('cross-btn')
 * });
 */
export function setMorphologyButtons (canvasInstance, { dilate, erode, cross }) {
  if (!canvasInstance) return
  if (dilate) canvasInstance.dilateBtn = dilate
  if (erode) canvasInstance.erodeBtn = erode
  if (cross) canvasInstance.crossBtn = cross
}

/**
 * Check if a morphology operation is valid or enabled on the canvas.
 *
 * @param {CanvasInstance|null} canvasInstance - The canvas instance
 * @param {string} op - The morphology operation name (e.g., 'dilate', 'erode', 'cross')
 * @returns {boolean} True if the operation is valid/enabled, false otherwise
 * @see CanvasInstance#checkMorphology
 * @example
 * if (checkMorphology(canvas, 'dilate')) {
 *   // Operation is available
 * }
 */
export function checkMorphology (canvasInstance, op) {
  if (!canvasInstance) return false
  return canvasInstance.checkMorphology(op)
}

/**
 * @typedef {Object} CanvasStateObject
 * @property {string} currentTool - The current drawing tool
 * @property {string} currentAction - The current action
 * @property {string} coverType - The type of cover
 * @property {Object|null} lineStart - The line start point
 * @property {string} [currentColor] - The current drawing color (optional)
 */

/**
 * Get the current canvas state for testing or inspection.
 * Merges canvas state properties with local state variables.
 * Returns null if canvas instance is not available.
 *
 * @param {CanvasInstance|null} canvasInstance - The canvas instance
 * @param {Object} localState - Local state variables to merge with canvas state
 * @param {string} [localState.currentTool] - Optional local tool state
 * @param {string} [localState.currentAction] - Optional local action state
 * @param {string} [localState.coverType] - Optional local cover type state
 * @param {Object} [localState.lineStart] - Optional local line start state
 * @param {string} [localState.currentColor] - Optional local color state
 * @returns {CanvasStateObject|null} The merged state object, or null if canvas unavailable
 * @example
 * const state = getCanvasState(canvas, { currentTool: 'pen' });
 * console.log(state?.currentTool); // 'pen'
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
 * Set canvas state for testing and debugging.
 * Updates both the canvas instance and local state with provided values.
 * Only updates properties that are explicitly defined in the state parameter.
 * No-op if canvas instance is not available.
 *
 * @param {CanvasInstance|null} canvasInstance - The canvas instance to update
 * @param {Object} localState - Local state object to update in parallel with canvas
 * @param {string} [localState.currentTool] - Optional local tool state
 * @param {string} [localState.currentAction] - Optional local action state
 * @param {string} [localState.coverType] - Optional local cover type state
 * @param {Object} [localState.lineStart] - Optional local line start state
 * @param {string} [localState.currentColor] - Optional local color state
 * @param {CanvasStateObject} state - State properties to update (partial update)
 * @param {string} [state.currentTool] - The new tool
 * @param {string} [state.currentAction] - The new action
 * @param {string} [state.coverType] - The new cover type
 * @param {Object} [state.lineStart] - The new line start point
 * @param {string} [state.currentColor] - The new color
 * @returns {void}
 * @example
 * setCanvasState(canvas, localState, {
 *   currentTool: 'eraser',
 *   currentColor: '#ff0000'
 * });
 */
export function setCanvasState (canvasInstance, localState, state) {
  if (!canvasInstance) return
  if ('currentTool' in state && state.currentTool !== undefined) {
    canvasInstance.currentTool = state.currentTool
    localState.currentTool = state.currentTool
  }
  if ('currentAction' in state && state.currentAction !== undefined) {
    canvasInstance.currentAction = state.currentAction
    localState.currentAction = state.currentAction
  }
  if ('coverType' in state && state.coverType !== undefined) {
    canvasInstance.coverType = state.coverType
    localState.coverType = state.coverType
  }
  if ('lineStart' in state && state.lineStart !== undefined) {
    canvasInstance.lineStart = state.lineStart
    localState.lineStart = state.lineStart
  }
  if ('currentColor' in state && state.currentColor !== undefined) {
    canvasInstance.currentColor = state.currentColor
    localState.currentColor = state.currentColor
  }
}
