/**
 * @fileoverview Custom Map and Ship Placement UI Manager
 *
 * Extends PlacementUI to provide comprehensive terrain editing (brush mode) and ship placement
 * workflows for custom map creation. Manages mode transitions between brush mode (terrain editing)
 * and ship mode (fleet placement), coordinates UI visibility, button states, and user tips.
 *
 * Key responsibilities:
 * - Brush mode: Terrain editing with terrain size controls and visual feedback
 * - Ship mode: Fleet placement with ship/weapon trays and placement validation
 * - UI coordination: Mode-specific visibility, button state management, and help text
 * - Event handling: Mode transitions, user action responses, and state persistence
 *
 * @module waters/customUI
 * @extends PlacementUI
 * @requires terrains/all/js/bh
 * @requires waters/StatusUI
 * @requires waters/PlacementUI
 * @requires terrains/all/js/validSize
 * @requires ui/ButtonManager
 * @requires selection/PlacedShips
 */

import { bh } from '../terrains/all/js/bh.js'
import { gameStatus } from './StatusUI.js'
import { PlacementUI } from './placementUI.js'
import {
  hasMapOfCurrentSize,
  setNewMapToCorrectSize
} from '../terrains/all/js/validSize.js'
import { ButtonManager } from '../ui/ButtonManager.js'
import { placedShipsInstance } from '../selection/PlacedShips.js'

/**
 * Cached references to frequently accessed UI elements.
 * Stores button and container DOM element references for performance optimization.
 * @typedef {Object} ElementCache
 * @property {HTMLButtonElement} reuseBtn - Reuse previous map button reference
 * @property {HTMLButtonElement} resetBtn - Reset/clear all placements button reference
 * @property {HTMLButtonElement} acceptBtn - Accept/finalize current action button reference
 * @property {HTMLButtonElement} stopBtn - Stop current operation button reference
 * @property {HTMLButtonElement} undoBtn - Undo last action button reference
 * @property {HTMLButtonElement} publishBtn - Publish/submit map button reference
 * @property {HTMLButtonElement} saveBtn - Save map for later editing button reference
 * @property {HTMLElement|null} heightContainer - Height adjustment control container element
 * @property {HTMLElement|null} widthContainer - Width adjustment control container element
 * @property {HTMLElement|null} tallyTitle - Tally display title element
 */

/**
 * Element visibility state mapping for batch visibility updates.
 * Array of [element, shouldShow] tuples for efficient bulk visibility control.
 * @typedef {Array<[(HTMLElement|HTMLButtonElement|null|undefined), boolean]>} VisibilityMap
 * @description Each tuple contains [element, show] where show is boolean visibility state
 */

// Constants for UI strings to reduce duplication
/**
 * Gets the terrain land subterrain title in lowercase.
 * Safely retrieves terrain-specific land name with fallback to 'land'.
 * Used for dynamic UI text that references terrain-specific terminology.
 * @returns {string} Land terrain name or 'land' as default
 * @private
 */
const LAND_STRING = () =>
  bh.terrain?.landSubterrain?.title?.toLowerCase() || 'land'

/**
 * Gets the terrain default subterrain title in lowercase.
 * Safely retrieves terrain-specific sea/default name with fallback to 'sea'.
 * Used for dynamic UI text that references terrain-specific water terminology.
 * @returns {string} Sea/default terrain name or 'sea' as default
 * @private
 */
const SEA_STRING = () =>
  bh.terrain?.defaultSubterrain?.title?.toLowerCase() || 'sea'

/**
 * Tip messages for brush mode terrain editing.
 * Provides sequential help text for terrain editing workflow.
 * Tips are shown progressively during brush mode operations.
 * @type {string[]}
 * @static
 * @readonly
 * @const
 */
const BRUSH_TIPS = [
  'Use shapes create land and sea',
  `drag blocks across map to create or destroy ${LAND_STRING()}`,
  `press accept button when the ${SEA_STRING()} and ${LAND_STRING()} is to your liking`
]

/**
 * Tip messages for ship placement mode.
 * Provides sequential help text for ship and weapon placement workflow.
 * Tips are shown progressively during ship placement operations.
 * @type {string[]}
 * @static
 * @readonly
 * @const
 */
const SHIP_TIPS = [
  'drag ships to the map grid to add them to your map',
  'drag weapons on to the map to increase the ammunition available',
  'drag weapons tally-boxes back to the tray to remove a weapon'
]

/**
 * UI class for custom map and ship placement mode.
 * Extends PlacementUI to manage terrain editing (brush mode) and ship placement workflows.
 *
 * Coordinates two primary workflows:
 * 1. Brush Mode: Terrain editing with map size controls and checkerboard terrain visualization
 * 2. Ship Mode: Fleet placement with ship/weapon trays and placement validation
 *
 * Manages UI visibility, button states, tips, and mode transitions. Caches DOM elements
 * for performance and provides helper methods for common UI operations.
 *
 * @class CustomUI
 * @extends {PlacementUI}
 * @property {HTMLButtonElement|undefined} reuseBtn - Cached reuse map button reference
 * @property {HTMLButtonElement|undefined} resetBtn - Cached reset/clear button reference
 * @property {HTMLButtonElement|undefined} acceptBtn - Cached accept button reference
 * @property {HTMLButtonElement|undefined} stopBtn - Cached stop button reference
 * @property {HTMLButtonElement|undefined} undoBtn - Cached undo button reference
 * @property {HTMLButtonElement|undefined} publishBtn - Cached publish button reference
 * @property {HTMLButtonElement|undefined} saveBtn - Cached save button reference
 * @property {HTMLElement|null|undefined} heightContainer - Cached height control container
 * @property {HTMLElement|null|undefined} widthContainer - Cached width control container
 * @property {HTMLElement|null|undefined} tallyTitle - Cached tally title element
 * @property {string[]} tips - Array of current tips to display to user
 * @property {Function[]} brushlistenCancellables - Array of cancellable brush mode listeners
 * @property {Function[]} placelistenCancellables - Array of cancellable placement mode listeners
 */
export class CustomUI extends PlacementUI {
  /**
   * Initializes the custom UI with cached elements and initial tips.
   * Sets up base placement UI state and caches frequently accessed DOM elements.
   * Initializes with brush mode tips for terrain editing workflow.
   * Initializes listener cancellable arrays for managing event listeners.
   *
   * Side effects:
   * - Calls super() to initialize PlacementUI base class
   * - Calls #cacheElements() to populate button and container references
   * - Sets initial tips array to first brush tip
   * - Initializes brushlistenCancellables and placelistenCancellables arrays
   *
   * @constructor
   */
  constructor () {
    super('custom', 'Customizing')
    this.#cacheElements() // Cache DOM elements for performance
    this.tips = BRUSH_TIPS.slice(0, 1) // Initial tips
    /** @type {Function[]} */
    this.brushlistenCancellables = []
    /** @type {Function[]} */
    this.placelistenCancellables = []
  }

  /**
   * Returns a typed button element by DOM ID.
   * Retrieves button element from DOM and safely casts to HTMLButtonElement type.
   * Used to retrieve form buttons with type safety.
   *
   * @param {string} id - The DOM element id to retrieve
   * @returns {HTMLButtonElement} The button element (type-safe cast)
   */
  #queryButton (id) {
    return /** @type {HTMLButtonElement} */ (document.getElementById(id))
  }

  /**
   * Returns a generic element by DOM ID.
   * Retrieves element from DOM without type casting, allowing flexibility.
   * Returns null if element not found in DOM.
   *
   * @param {string} id - The DOM element id to retrieve
   * @returns {HTMLElement|null} The element or null if not found
   */
  #queryElement (id) {
    return document.getElementById(id)
  }

  /**
   * Caches frequently accessed DOM elements.
   * Stores button and container references for performance optimization.
   * Reduces repeated DOM lookups during mode transitions and updates.
   * Safely handles missing elements (may be null).
   *
   * Side effects:
   * - Populates this.reuseBtn, resetBtn, acceptBtn, stopBtn, undoBtn, publishBtn, saveBtn
   * - Populates this.heightContainer, widthContainer, tallyTitle
   *
   * @returns {void}
   */
  #cacheElements () {
    this.reuseBtn = this.#queryButton('reuseBtn')
    this.resetBtn = this.#queryButton('resetBtn')
    this.acceptBtn = this.#queryButton('acceptBtn')
    this.stopBtn = this.#queryButton('stopBtn')
    this.undoBtn = this.#queryButton('undoBtn')
    this.publishBtn = this.#queryButton('publishBtn')
    this.saveBtn = this.#queryButton('saveBtn')
    this.heightContainer = this.#queryElement('height-container')
    this.widthContainer = this.#queryElement('width-container')
    this.tallyTitle = this.#queryElement('tally-title')
  }

  /**
   * Updates the reset/clear button based on current placement state.
   * Sets label to "Change" when placing ships, "Clear" otherwise.
   * Disables button when not placing ships and no zone information exists.
   * Updates with terrain-specific map heading text.
   *
   * Side effects:
   * - Sets newPlacementBtn innerHTML with dynamic label and keyboard shortcut
   * - Sets newPlacementBtn disabled state based on placement state and zone info
   *
   * @returns {void}
   */
  updateChangeClearButton () {
    const newPlacementBtn = /** @type {HTMLButtonElement} */ (
      this.newPlacementBtn
    )
    newPlacementBtn.innerHTML = this.#changeClearLabel()
    newPlacementBtn.disabled = !this.placingShips && !this.score.hasZoneInfo()
  }

  /**
   * Builds the current label for the change/clear button.
   * Returns "Change" when placing ships, "Clear" otherwise.
   * Includes keyboard shortcut and terrain-specific map heading.
   *
   * @returns {string} HTML label for the button with shortcut span
   */
  #changeClearLabel () {
    const action = this.placingShips ? 'hange' : 'lear'
    return `<span class="shortcut">C</span>${action} ${bh.terrain.mapHeading}`
  }

  /**
   * Toggles visibility of multiple elements in batch.
   * Applies the 'hidden' class based on visibility flags provided.
   * Safely handles null elements by skipping them.
   * Used for mode-specific UI updates.
   *
   * Side effects:
   * - Adds or removes 'hidden' class from each non-null element in visibilityMap
   *
   * @param {VisibilityMap} visibilityMap - Array of [element, shouldShow] pairs
   * @returns {void}
   */
  #toggleElementVisibility (visibilityMap) {
    for (const [element, show] of visibilityMap) {
      if (element) {
        element.classList.toggle('hidden', !show)
      }
    }
  }

  /**
   * Configures brush mode element visibility.
   * Shows terrain controls (height, width containers) and hides ship-related UI.
   * Updates all button visibility for terrain editing workflow.
   *
   * Side effects:
   * - Shows: heightContainer, widthContainer, reuseBtn
   * - Hides: tallyTitle, resetBtn, acceptBtn, publishBtn, saveBtn, testBtn, seekBtn, stopBtn, undoBtn
   *
   * @returns {void}
   */
  #setBrushModeVisibility () {
    this.#toggleElementVisibility([
      [this.heightContainer, true],
      [this.widthContainer, true],
      [this.tallyTitle, false],
      [this.reuseBtn, true],
      [this.resetBtn, false],
      [this.acceptBtn, true],
      [this.publishBtn, false],
      [this.saveBtn, false],
      [this.testBtn, false],
      [this.seekBtn, false],
      [this.stopBtn, false],
      [this.undoBtn, false]
    ])
  }

  /**
   * Configures ship placement mode element visibility.
   * Hides terrain controls (height, width) and shows ship-related UI elements.
   * Updates all button visibility for fleet placement workflow.
   *
   * Side effects:
   * - Shows: resetBtn, publishBtn, saveBtn
   * - Hides: heightContainer, widthContainer, tallyTitle, reuseBtn, acceptBtn, testBtn, seekBtn, stopBtn, undoBtn
   *
   * @returns {void}
   */
  #setShipModeVisibility () {
    this.#toggleElementVisibility([
      [this.heightContainer, false],
      [this.widthContainer, false],
      [this.tallyTitle, false],
      [this.reuseBtn, false],
      [this.resetBtn, true],
      [this.acceptBtn, false],
      [this.publishBtn, true],
      [this.saveBtn, true],
      [this.testBtn, false],
      [this.seekBtn, false],
      [this.stopBtn, false],
      [this.undoBtn, false]
    ])
  }

  /**
   * Configures UI for brush mode terrain editing.
   * Sets up terrain editing interface with appropriate button visibility and state.
   * Clears board styling and resets score display.
   *
   * Side effects:
   * - Shows map title via showMapTitle()
   * - Sets placingShips = false
   * - Updates button state via updateChangeClearButton()
   * - Applies brush mode visibility via _setBrushModeVisibility()
   * - Hides transform buttons via hideTransformBtns()
   * - Resets score display to 'None Yet'
   * - Clears cell classes via _clearCellClasses()
   * - Standardizes panel appearance via #standardPanels()
   *
   * @returns {void}
   */
  #configureBrushUI () {
    this.showMapTitle()
    this.placingShips = false
    this.updateChangeClearButton()
    this.#setBrushModeVisibility()

    this.hideTransformBtns()
    if (this.score.placed !== null) this.score.placed.textContent = 'None Yet'
    if (this.score.weaponsPlaced !== null)
      this.score.weaponsPlaced.textContent = 'None Yet'
    this.grid.removeBrushClasses()
    this.#standardPanels()
  }

  /**
   * Refreshes build mode button and score controls.
   * Updates score display with zone information and button state.
   * Called after state changes to reflect current game status.
   *
   * Side effects:
   * - Invokes score.displayZoneInfo() to update zone display
   * - Calls updateChangeClearButton() to refresh button state
   *
   * @returns {void}
   */
  #refreshBuildControls () {
    this.score.displayZoneInfo()
    this.updateChangeClearButton()
  }

  /**
   * Refreshes build mode display and controls completely.
   * Updates all colors and refreshes button states after state changes.
   * Provides visual feedback for terrain editing changes.
   *
   * Side effects:
   * - Calls refreshAllColor() to update cell colors
   * - Calls #refreshBuildControls() to update buttons and score
   *
   * @returns {void}
   */
  #refreshBuildUI () {
    this.grid.refreshAllColor()
    this.#refreshBuildControls()
  }

  /**
   * Updates reuse button state based on available maps.
   * Disables button if no map of current size exists in storage.
   * Used to control availability of 'reuse previous map' option.
   * Safely handles undefined button reference.
   *
   * Side effects:
   * - Sets reuseBtn.disabled based on hasMapOfCurrentSize() result (if button exists)
   *
   * @returns {void}
   */
  #setReuseButtonState () {
    if (this.reuseBtn !== undefined) {
      this.reuseBtn.disabled = !hasMapOfCurrentSize()
    }
  }

  /**
   * Initializes placement interface for custom map creation.
   * Sets up initial board, configures brush mode, and prepares for terrain editing.
   * Main entry point for custom map creation workflow.
   *
   * Side effects:
   * - Builds empty board via buildBoard()
   * - Shows brush trays via trayManager.showBrushTrays()
   * - Makes board brush-editable via grid.makeBrushable()
   * - Builds brush tray with terrain via buildBrushTray()
   * - Enters brush mode via brushMode()
   * - Enables acceptBtn (if exists)
   * - Sets reuse button state via #setReuseButtonState()
   * - Sets up zone info display via score.setupZoneInfo()
   * - Disables transform buttons via #disableBuildTransformButtons()
   *
   * @returns {void}
   */
  initializePlacement () {
    this.buildBoard((_r, _c) => {})
    this.trayManager.showBrushTrays()
    this.grid.makeBrushable(this)
    this.buildBrushTray(bh.terrain)
    this.brushMode()
    if (this.acceptBtn !== undefined) this.acceptBtn.disabled = false
    this.#setReuseButtonState()
    this.score.setupZoneInfo()
    this.#disableBuildTransformButtons()
  }

  /**
   * Disables transform buttons during build mode.
   * Prevents transformation operations (rotate, flip, undo, reset) while editing terrain.
   * Used during terrain editing to prevent accidental ship transformations.
   * Filters out undefined buttons before passing to ButtonManager.
   *
   * Side effects:
   * - Sets disabled state on non-undefined rotate, flip, rotateLeft, undo, reset buttons
   *
   * @returns {void}
   */
  #disableBuildTransformButtons () {
    const buttons = [
      this.rotateBtn,
      this.flipBtn,
      this.rotateLeftBtn,
      this.undoBtn,
      this.resetBtn
    ].filter(btn => btn !== undefined)

    ButtonManager.setButtonsDisabled(
      /** @type {HTMLButtonElement[]} */ (buttons),
      true
    )
  }

  /**
   * Removes all placed ships from the board.
   * Iterates through all placed ships and removes them via subtraction callback.
   * Resets ship placement state and updates UI accordingly.
   *
   * Side effects:
   * - Calls placedShipsInstance.popAll with custom subtraction callback
   * - Invokes customUI.subtraction(model, ship) for each placed ship
   * - Updates UI state to reflect removed ships
   *
   * @param {*} model - The game model context for subtraction operation (GameModel)
   * @returns {void}
   */
  removeAllPlacedShips (model) {
    placedShipsInstance.popAll((/** @type {*} */ ship) => {
      customUI.subtraction(model, ship)
    })
  }

  /**
   * Clears the current map and refreshes the display.
   * Removes blank/empty maps from storage and updates all visual elements.
   * Applies changes made during terrain editing to the board.
   *
   * Side effects:
   * - Calls bh.maps.clearBlank() to remove empty maps from storage
   * - Calls #refreshBuildUI() to update all colors and controls
   *
   * @returns {void}
   */
  clearMapAndRefresh () {
    /** @type {any} */ bh.maps.clearBlank()
    this.#refreshBuildUI()
  }

  /**
   * Reuses the previous map and refreshes the display.
   * Loads a map of the current size and updates all visual elements.
   * Used when user selects "reuse" option for previously created map.
   *
   * Side effects:
   * - Calls setNewMapToCorrectSize() to load map matching current dimensions
   * - Calls #refreshBuildUI() to update all colors and controls
   *
   * @returns {void}
   */
  handleReuse () {
    setNewMapToCorrectSize()
    this.#refreshBuildUI()
  }

  /**
   * Resets panels to standard (non-alternate) state.
   * Removes 'alt' CSS class from all panel elements on the page.
   * Used to normalize panel appearance during mode transitions.
   *
   * Side effects:
   * - Queries all elements with class 'panel'
   * - Removes 'alt' class from each panel element
   *
   * @returns {void}
   */
  #standardPanels () {
    const panels = document.getElementsByClassName('panel')
    for (const panel of panels) {
      panel.classList.remove('alt')
    }
  }

  /**
   * Enters brush mode terrain editing state.
   * Cancels existing placement listeners and configures terrain editing interface.
   * Sets tips for terrain editing guidance and shows help text.
   *
   * Side effects:
   * - Cancels all placement listeners via #cancelListeners(placelistenCancellables)
   * - Resets placelistenCancellables array to empty
   * - Configures brush UI via _configureBrushUI()
   * - Sets game tips via gameStatus.setTips()
   * - Rotates tips array by removing first two items
   * - Shows tips via showTips()
   *
   * @returns {void}
   */
  brushMode () {
    this.#cancelListeners(this.placelistenCancellables ?? [])
    this.placelistenCancellables = []
    this.#configureBrushUI()
    gameStatus.setTips(this.tips, BRUSH_TIPS[1])
    this.tips = BRUSH_TIPS.slice(1)
    this.showTips()
  }

  /**
   * Cancels all listener functions in the provided array.
   * Executes each cancellable listener to clean up event handlers.
   * Used for removing event listeners before mode transitions.
   *
   * Side effects:
   * - Iterates through listeners array and calls each function
   * - Removes all active event listeners from the listeners array
   *
   * @param {Array<Function>} listeners - Array of cancellable listener functions
   * @returns {void}
   */
  #cancelListeners (listeners) {
    for (const cancellable of listeners) {
      cancellable()
    }
  }

  /**
   * Configures UI for ship placement mode.
   * Sets up fleet placement interface with ship and weapon trays.
   * Prepares board for ship placement and updates button states.
   *
   * Side effects:
   * - Shows fleet title via showFleetTitle()
   * - Sets placingShips = true
   * - Updates button state via updateChangeClearButton()
   * - Shows ship trays via trayManager.showShipTrays()
   * - Applies ship mode visibility via #setShipModeVisibility()
   * - Shows score labels (placed, weapons)
   * - Shows transform buttons via showTransformBtns()
   * - Hides auto button
   * - Enables newPlacementBtn
   * - Builds ship and weapon trays via buildTrays(ships) and buildWeaponTray()
   * - Shows status display via showStatus()
   * - Standardizes panels via #standardPanels()
   *
   * @param {*[]} ships - Ships to display in placement trays
   * @returns {void}
   */
  #configureShipUI (ships) {
    this.showFleetTitle()
    this.placingShips = true
    this.updateChangeClearButton()
    this.trayManager.showShipTrays()
    this.#setShipModeVisibility()
    if (this.score.placedLabel !== null)
      this.score.placedLabel.classList.remove('hidden')
    if (this.score.weaponsLabel !== null)
      this.score.weaponsLabel.classList.remove('hidden')
    this.showTransformBtns()
    if (this.autoBtn !== undefined) this.autoBtn.classList.add('hidden')
    const newPlacementBtn = /** @type {HTMLButtonElement|undefined} */ (
      this.newPlacementBtn
    )
    if (newPlacementBtn !== undefined) newPlacementBtn.disabled = false
    this.buildTrays(ships)
    this.buildWeaponTray()
    this.showStatus()
    this.#standardPanels()
  }

  /**
   * Enters ship placement mode with the provided ships.
   * Cancels existing brush listeners and configures fleet placement interface.
   * Sets tips for ship placement guidance and shows help text.
   *
   * Side effects:
   * - Cancels all brush listeners via #cancelListeners(brushlistenCancellables)
   * - Resets brushlistenCancellables array to empty
   * - Configures ship UI via #configureShipUI(ships)
   * - Sets game tips via gameStatus.setTips()
   * - Sets tips array to all SHIP_TIPS
   *
   * @param {*[]} ships - Ships available for placement on the board
   * @returns {void}
   */
  addShipMode (ships) {
    this.#cancelListeners(this.brushlistenCancellables ?? [])
    this.brushlistenCancellables = []
    this.#configureShipUI(ships)
    gameStatus.setTips(this.tips, SHIP_TIPS[0])
    this.tips = SHIP_TIPS
  }
}

export const customUI = new CustomUI()
