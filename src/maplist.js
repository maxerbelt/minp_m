/**
 * @fileoverview Map list management for displaying and interacting with battle maps.
 * Provides UI for listing, renaming, deleting, duplicating, and exporting maps.
 */

import { bh } from './terrains/all/js/bh.js'
import { WatersUI } from './waters/WatersUI.js'
import { Waters } from './waters/Waters.js'
import { ScoreUI } from './waters/ScoreUI.js'
import { setupMapListOptions } from './navbar/setupOptions.js'
import { switchTo } from './navbar/setupTabs.js'
import { switchToEdit, fetchNavBar } from './navbar/navbar.js'
import { trackClick } from './navbar/gtag.js'

/**
 * Maximum width for board display in pixels.
 * @constant {number}
 */
const MAX_BOARD_WIDTH = 400

/**
 * Minimum width for tally box display in pixels.
 * @constant {number}
 */
const MIN_TALLY_WIDTH = 200

/**
 * Default list includes option (custom maps).
 * @constant {string}
 */
const DEFAULT_LIST_INCLUDES = '0'

/**
 * @typedef {Object} MapModel
 * @property {boolean} isPreGenerated
 * @property {string} title
 * @property {string} name
 * @property {{tag:string}} terrain
 * @property {(newName: string) => void} rename
 * @property {() => void} remove
 * @property {() => void} clone
 * @property {() => string} exportName
 * @property {() => string} jsonString
 */

/**
 * @typedef {Object} ButtonConfig
 * @property {string} label
 * @property {() => void} handler
 */

/**
 * @typedef {Object} ElementOptions
 * @property {string} [id]
 * @property {string} [className]
 * @property {string} [textContent]
 * @property {Record<string, string>} [styles]
 */

/**
 * @typedef {Object} RenameEntry
 * @property {MapModel} map
 * @property {HTMLButtonElement[]} buttonList
 */

/**
 * Manages the display and interaction of a list of maps.
 * Handles map listing, renaming, deletion, duplication, and export operations.
 */
class MapList {
  /**
   * @param {string} [listId='list-container'] - ID of the container element.
   */
  constructor (listId = 'list-container') {
    /** @type {string} */
    this.listId = listId
    /** @type {HTMLElement} */
    this.container = this._findElement(listId)
    /** @type {any} */
    this.input = this._findElement('inputField')
    /** @type {any} */
    this.inputDiv = this._findElement('inputDiv')
    /** @type {any} */
    this.okBtn = this._findElement('okBtn')
    /** @type {any} */
    this.cancelBtn = this._findElement('cancelBtn')
    /** @type {RenameEntry|null} */
    this.currentRenameEntry = null
    /** @type {string} */
    this.listIncludes = DEFAULT_LIST_INCLUDES

    this._bindRenameEvents()
  }

  /**
   * Find a DOM element by ID with type casting
   * @private
   * @param {string} id - The element ID to retrieve
   * @returns {HTMLElement} The DOM element
   */
  _findElement (id) {
    return /** @type {HTMLElement} */ (document.getElementById(id))
  }

  /**
   * Attach a click event listener to an element if it exists
   * Safely binds click handlers to optional elements
   * @private
   * @param {HTMLElement|null|undefined} element - The element to attach listener to
   * @param {() => void} handler - The click event handler function
   * @returns {void}
   */
  _bindClickEvent (element, handler) {
    if (element?.addEventListener) {
      element.addEventListener('click', handler)
    }
  }

  /**
   * Bind rename dialog OK and Cancel button click events
   * @private
   * @returns {void}
   */
  _bindRenameEvents () {
    this._bindClickEvent(this.okBtn, this.renameOk.bind(this))
    this._bindClickEvent(this.cancelBtn, this.renameCancel.bind(this))
  }

  /**
   * Rename the currently selected map if the input value is valid
   * Validates input (non-empty), renames the map, tracks the action, and refreshes the list
   * Does nothing if input is empty or no map is currently being renamed
   * @returns {void}
   */
  renameOk () {
    const newName = this.input?.value.trim() ?? ''
    const map = this.currentRenameEntry?.map

    if (!newName || !map) {
      return
    }

    map.rename(newName)
    trackClick(map, 'rename map')
    this._resetRenameDialog()
    this.refresh()
  }

  /**
   * Cancel an active rename operation and restore hidden control buttons
   * Restores visibility of action buttons and clears the rename dialog
   * @returns {void}
   */
  renameCancel () {
    this._restoreHiddenControls()
    this._resetRenameDialog()
  }

  /**
   * Restore visibility of hidden action control buttons
   * @private
   * @returns {void}
   */
  _restoreHiddenControls () {
    this.currentRenameEntry?.buttonList.forEach(button => {
      button.classList.remove('hidden')
    })
  }

  /**
   * Reset the rename dialog to initial state
   * Hides the dialog, clears input, and resets current rename entry
   * @private
   * @returns {void}
   */
  _resetRenameDialog () {
    this.inputDiv?.classList.add('hidden')
    if (this.input) {
      this.input.value = ''
    }
    this.currentRenameEntry = null
  }

  /**
   * Clear the map list container and regenerate the list display
   * Removes all child elements and calls makeList to rebuild the list
   * @returns {void}
   */
  refresh () {
    if (this.container) {
      this.container.innerHTML = ''
    }
    this.makeList()
  }

  /**
   * Create a new HTML element with optional configuration
   * @private
   * @param {string} tag - The HTML tag name to create
   * @param {ElementOptions} [options={}] - Configuration options for the element
   * @param {string} [options.id] - Element ID attribute
   * @param {string} [options.className] - CSS class name(s)
   * @param {string} [options.textContent] - Inner text content
   * @param {Record<string, string>} [options.styles] - Inline style properties
   * @returns {HTMLElement} The created element
   */
  _createElement (tag, options = {}) {
    const element = document.createElement(tag)

    if (options.id) {
      element.id = options.id
    }
    if (options.className) {
      element.className = options.className
    }
    if (options.textContent !== undefined) {
      element.textContent = options.textContent
    }
    if (options.styles) {
      Object.assign(element.style, options.styles)
    }

    return element
  }

  /**
   * Create a button element with event handler and add to container
   * Creates a button with unique ID, adds click handler, and appends to container
   * @private
   * @param {string} label - The button text label
   * @param {number} idx - Index for generating unique button ID
   * @param {HTMLElement} container - Parent element to append button to
   * @param {() => void} handler - Click event handler function
   * @returns {HTMLButtonElement} The created button element
   */
  _createButton (label, idx, container, handler) {
    const button = /** @type {HTMLButtonElement} */ (
      this._createElement('button', {
        id: `${label}-${idx}`,
        textContent: label
      })
    )

    button.addEventListener('click', handler)
    container.appendChild(button)
    return button
  }

  /**
   * Get button configuration array for a map based on its type
   * Generates appropriate button configs for pre-generated or custom maps
   * @private
   * @param {MapModel} map - The map to get button configs for
   * @param {HTMLButtonElement[]} controls - Array to accumulate control buttons
   * @param {HTMLDivElement} buttonsContainer - Container for buttons
   * @returns {ButtonConfig[]} Array of button configuration objects
   */
  _getMapButtonConfigs (map, controls, buttonsContainer) {
    if (map.isPreGenerated) {
      return this._getPreGeneratedMapButtonConfigs(map)
    }

    return this._getCustomMapButtonConfigs(map, controls, buttonsContainer)
  }

  /**
   * Get button configs specific to pre-generated maps
   * Pre-generated maps support: duplicate, export, play, seek, and print
   * @private
   * @param {MapModel} map - The pre-generated map
   * @returns {ButtonConfig[]} Button configuration array
   */
  _getPreGeneratedMapButtonConfigs (map) {
    return [
      this._buildDuplicateConfig(map),
      this._buildExportConfig(map),
      this._buildPlayConfig(map),
      this._buildSeekConfig(map),
      this._buildPrintConfig(map)
    ]
  }

  /**
   * Get button configs specific to custom maps
   * Custom maps support all operations: delete, rename, duplicate, export, edit, play, seek, print
   * @private
   * @param {MapModel} map - The custom map
   * @param {HTMLButtonElement[]} controls - Array to accumulate control buttons
   * @param {HTMLDivElement} buttonsContainer - Container for buttons
   * @returns {ButtonConfig[]} Button configuration array
   */
  _getCustomMapButtonConfigs (map, controls, buttonsContainer) {
    return [
      this._buildDeleteConfig(map),
      this._buildRenameConfig(map, controls, buttonsContainer),
      this._buildDuplicateConfig(map),
      this._buildExportConfig(map),
      this._buildEditConfig(map),
      this._buildPlayConfig(map),
      this._buildSeekConfig(map),
      this._buildPrintConfig(map)
    ]
  }

  /**
   * Build delete button configuration for custom maps
   * @private
   * @param {MapModel} map - The map to delete
   * @returns {ButtonConfig} Delete button configuration
   */
  _buildDeleteConfig (map) {
    return {
      label: 'delete',
      handler: () => {
        trackClick(map, 'delete map')
        map.remove()
        this.refresh()
      }
    }
  }

  /**
   * Build duplicate button configuration
   * @private
   * @param {MapModel} map - The map to duplicate
   * @returns {ButtonConfig} Duplicate button configuration
   */
  _buildDuplicateConfig (map) {
    return {
      label: 'duplicate',
      handler: () => {
        trackClick(map, 'duplicate map')
        map.clone()
        this.refresh()
      }
    }
  }

  /**
   * Build rename button configuration for custom maps
   * Hides other controls and shows the rename dialog
   * @private
   * @param {MapModel} map - The map to rename
   * @param {HTMLButtonElement[]} controls - Control buttons to hide during rename
   * @param {HTMLDivElement} buttonsContainer - Container for the rename dialog
   * @returns {ButtonConfig} Rename button configuration
   */
  _buildRenameConfig (map, controls, buttonsContainer) {
    return {
      label: 'rename',
      handler: () => {
        controls.forEach(control => control.classList.add('hidden'))
        this._showRenameDialog(map, controls, buttonsContainer)
      }
    }
  }

  /**
   * Build edit button configuration for custom maps
   * @private
   * @param {MapModel} map - The map to edit
   * @returns {ButtonConfig} Edit button configuration
   */
  _buildEditConfig (map) {
    return {
      label: 'edit',
      handler: () => {
        trackClick(map, 'edit custom map')
        switchToEdit(map)
      }
    }
  }

  /**
   * Build export button configuration
   * @private
   * @param {MapModel} map - The map to export
   * @returns {ButtonConfig} Export button configuration
   */
  _buildExportConfig (map) {
    return {
      label: 'export',
      handler: () => {
        trackClick(map, 'export map')
        saveToFile(map)
      }
    }
  }

  /**
   * Build play button configuration
   * Switches to the play (battle) tab with the selected map
   * @private
   * @param {MapModel} map - The map to play
   * @returns {ButtonConfig} Play button configuration
   */
  _buildPlayConfig (map) {
    return {
      label: 'play',
      handler: () => {
        trackClick(map, 'play from list')
        switchTo('index', 'list', map.title)
      }
    }
  }

  /**
   * Build seek button configuration
   * Switches to the seek/hide battle tab with the selected map
   * @private
   * @param {MapModel} map - The map to play in seek mode
   * @returns {ButtonConfig} Seek button configuration
   */
  _buildSeekConfig (map) {
    return {
      label: 'seek',
      handler: () => {
        switchTo('battleseek', 'list', map.title)
      }
    }
  }

  /**
   * Build print button configuration
   * For pre-generated maps: downloads PDF game sheet
   * For custom maps: switches to print view
   * @private
   * @param {MapModel} map - The map to print
   * @returns {ButtonConfig} Print button configuration
   */
  _buildPrintConfig (map) {
    return {
      label: 'print',
      handler: map.isPreGenerated
        ? () => printGameSheet(map)
        : () => switchTo('print', 'print', map.title)
    }
  }

  /**
   * Display the rename input dialog for a map
   * Shows input field, hides other controls, and focuses on the input
   * @private
   * @param {MapModel} map - The map being renamed
   * @param {HTMLButtonElement[]} controls - Control buttons to hide
   * @param {HTMLDivElement} buttonsContainer - Container to append dialog to
   * @returns {void}
   */
  _showRenameDialog (map, controls, buttonsContainer) {
    this.currentRenameEntry = { map, buttonList: controls }
    buttonsContainer.appendChild(this.inputDiv)
    this.inputDiv.classList.remove('hidden')
    this.input.value = map.title
    this.input.focus()
  }

  /**
   * Add a miniature map board representation to the entry
   * Creates and renders a small visual representation of the map
   * Initializes the board view model with proper sizing and content
   * @param {MapModel} map - The map to render
   * @param {Object} boardViewModel - The board view model for rendering
   * @param {HTMLElement} entryContent - Container for the board
   * @param {number} idx - Index for generating unique element IDs
   * @returns {HTMLDivElement} The board wrapper element
   */
  addMiniMap (map, boardViewModel, entryContent, idx) {
    const boardWrapper = this._createBoardWrapper()
    const board = this._createBoardElement(idx)

    boardViewModel.containerWidth = MAX_BOARD_WIDTH
    boardViewModel.board = board
    boardViewModel.resetBoardSize(map, boardViewModel.cellSizeStringList())
    boardViewModel.buildBoard(null, board, map)

    boardWrapper.appendChild(board)
    entryContent.appendChild(boardWrapper)

    return boardWrapper
  }

  /**
   * Create the board wrapper container element
   * @private
   * @returns {HTMLDivElement} The board wrapper element
   */
  _createBoardWrapper () {
    return /** @type {HTMLDivElement} */ (
      this._createElement('div', {
        className: 'board-wrap map-list',
        styles: { maxWidth: `${MAX_BOARD_WIDTH}px` }
      })
    )
  }

  /**
   * Create the board canvas/div element for rendering the map
   * @private
   * @param {number} idx - Index for generating unique element ID
   * @returns {HTMLDivElement} The board element
   */
  _createBoardElement (idx) {
    return /** @type {HTMLDivElement} */ (
      this._createElement('div', {
        id: `custom-map-board-${idx}`,
        className: 'board',
        styles: {
          maxWidth: `${MAX_BOARD_WIDTH}px`,
          margin: '0 0',
          padding: '0 0'
        }
      })
    )
  }

  /**
   * Create and append action buttons for a map entry
   * Generates buttons based on map type and adds them to the entry
   * @param {number} idx - Index for generating unique button IDs
   * @param {MapModel} map - The map for which buttons are created
   * @param {HTMLElement} entryContent - Container to append buttons to
   * @returns {HTMLDivElement} The buttons container element
   */
  addEntryButtons (idx, map, entryContent) {
    const buttonsContainer = /** @type {HTMLDivElement} */ (
      this._createElement('div', {
        className: 'panel-controls map-list'
      })
    )
    const controls = []

    this._getMapButtonConfigs(map, controls, buttonsContainer).forEach(
      config => {
        controls.push(
          this._createButton(
            config.label,
            idx,
            buttonsContainer,
            config.handler
          )
        )
      }
    )

    entryContent.appendChild(buttonsContainer)
    return buttonsContainer
  }

  /**
   * Create and set up the tally box for displaying map statistics
   * Returns tally box and wrapper for height adjustment
   * @private
   * @param {number} idx - Index for generating unique element IDs
   * @param {HTMLElement} entryContent - Container to append tally box to
   * @returns {[HTMLDivElement, HTMLDivElement]} Tuple of [tallyBox, boardWrapper]
   */
  setupTallyBox (idx, entryContent) {
    const boardWrapper = this._createTallyBoardWrapper()
    const tallyContainer = this._createTallyContainer(idx)
    const tallyBox = this._createTallyBox(idx)

    tallyContainer.appendChild(tallyBox)
    boardWrapper.appendChild(tallyContainer)
    entryContent.appendChild(boardWrapper)

    return [tallyBox, boardWrapper]
  }

  /**
   * Create the tally board wrapper container element
   * @private
   * @returns {HTMLDivElement} The tally board wrapper
   */
  _createTallyBoardWrapper () {
    return /** @type {HTMLDivElement} */ (
      this._createElement('div', {
        className: 'board-wrap map-list',
        styles: { minWidth: `${MIN_TALLY_WIDTH}px` }
      })
    )
  }

  /**
   * Create the tally container element
   * @private
   * @param {number} idx - Index for generating unique element ID
   * @returns {HTMLDivElement} The tally container
   */
  _createTallyContainer (idx) {
    return /** @type {HTMLDivElement} */ (
      this._createElement('div', {
        id: `tally-container-${idx}`,
        className: 'tally-box-container map-list',
        styles: { minWidth: `${MIN_TALLY_WIDTH}px` }
      })
    )
  }

  /**
   * Create the tally box element for displaying ship counts
   * @private
   * @param {number} idx - Index for generating unique element ID
   * @returns {HTMLDivElement} The tally box element
   */
  _createTallyBox (idx) {
    return /** @type {HTMLDivElement} */ (
      this._createElement('div', {
        id: `${idx}-tallybox`,
        className: 'tally-boxes'
      })
    )
  }

  /**
   * Populate the tally box with ship and weapon statistics for the map
   * Creates a Waters model, initializes ScoreUI, and builds the tally display
   * Computes and renders ship/weapon counts for the current map
   * @param {number} idx - Index for the tally box element
   * @param {MapModel} map - The map to generate tally for
   * @param {HTMLDivElement} tallyBox - The tally box element to populate
   * @param {Object} boardViewModel - The board view model
   * @returns {void}
   */
  fillTallyBox (idx, map, tallyBox, boardViewModel) {
    const model = new Waters()
    model.setMap(map)
    boardViewModel.score = new ScoreUI(idx.toString())
    boardViewModel.score.tallyBox = tallyBox
    boardViewModel.score.buildTally(
      model.ships,
      model.loadOut.weaponSystems,
      boardViewModel
    )
  }

  /**
   * Add a complete map entry with board, tally, and action buttons
   * Combines mini map board, ship tally statistics, and action buttons into one entry
   * Orchestrates the complete map display with all sub-components
   * @param {MapModel} map - The map to display
   * @param {number} idx - Index for generating unique element IDs
   * @returns {void}
   */
  addEntry (map, idx) {
    const entry = this._createMapEntry(map, idx)
    const entryContent = this._createEntryContent()

    const boardViewModel = new WatersUI()
    const boardNode = this.addMiniMap(map, boardViewModel, entryContent, idx)
    const [tallyBox, tallyWrapper] = this.setupTallyBox(idx, entryContent)
    const buttonsNode = this.addEntryButtons(idx, map, entryContent)

    entry.appendChild(entryContent)
    this.container.appendChild(entry)
    this.fillTallyBox(idx, map, tallyBox, boardViewModel)

    this._adjustButtonHeight(buttonsNode, boardNode, tallyWrapper)
  }

  /**
   * Create the map entry div with title heading
   * @private
   * @param {MapModel} map - The map being displayed
   * @param {number} idx - Index for alternating row styling
   * @returns {HTMLDivElement} The map entry container
   */
  _createMapEntry (map, idx) {
    const entry = /** @type {HTMLDivElement} */ (
      this._createElement('div', {
        id: `custom-map-${map.title}`,
        className: 'map-entry'
      })
    )

    entry.classList.add('info-wrap', idx % 2 ? 'alt' : 'standard')
    entry.appendChild(this._createElement('h2', { textContent: map.title }))

    return entry
  }

  /**
   * Create the entry content container element
   * @private
   * @returns {HTMLDivElement} The entry content container
   */
  _createEntryContent () {
    return /** @type {HTMLDivElement} */ (
      this._createElement('div', {
        className: 'entry-container'
      })
    )
  }

  /**
   * Adjust button container height to match board and tally box heights
   * Ensures buttons span the full height of the tallest adjacent element
   * @private
   * @param {HTMLElement} buttonsNode - The buttons container
   * @param {HTMLElement} boardNode - The board container
   * @param {HTMLElement} tallyWrapper - The tally box wrapper
   * @returns {void}
   */
  _adjustButtonHeight (buttonsNode, boardNode, tallyWrapper) {
    buttonsNode.style.maxHeight = `${
      Math.max(boardNode.offsetHeight, tallyWrapper.offsetHeight, 60) + 20
    }px`
  }

  /**
   * Generate and display the map list
   * Resolves map list based on selection filter and renders all entries
   * Clears current list and rebuilds with new selection
   * @param {string|undefined} [listIncludes] - Filter option: '0' custom, '1' all, '2' pre-generated
   * @returns {void}
   */
  makeList (listIncludes = undefined) {
    const titleEl = this._findElement('list-title')
    const listLabel = `${bh.mapHeading} List`
    this.listIncludes = listIncludes ?? this.listIncludes

    const { title, maps } = this._resolveMapList(this.listIncludes, listLabel)
    if (titleEl) {
      titleEl.textContent = title
    }

    if (this.container) {
      this.container.innerHTML = ''
    }
    maps.forEach((map, idx) => {
      if (map) {
        this.addEntry(map, idx)
      }
    })
  }

  /**
   * Resolve which maps to display based on selection filter
   * Returns title and maps array for the selected display option
   * @private
   * @param {string} selection - Filter option: '0' custom, '1' all, '2' pre-generated
   * @param {string} listLabel - The base label for the list title
   * @returns {{title: string, maps: Array<MapModel>}} Object with display title and maps array
   */
  _resolveMapList (selection, listLabel) {
    switch (selection) {
      case '0':
        return { title: `Custom ${listLabel}`, maps: bh.maps.customMapList() }
      case '1':
        return { title: listLabel, maps: bh.maps.maps() }
      case '2':
        return { title: `Standard ${listLabel}`, maps: bh.maps.preGenMapList() }
      default:
        throw new Error('unknown list display option')
    }
  }
}

/**
 * Saves JSON data as a downloadable file using the browser's download API
 * Creates a blob URL and triggers a download via an anchor element
 * Revokes the URL after a delay for memory cleanup
 * @param {string} json - The JSON string to save
 * @param {string} [filename='data.json'] - The name of the file to download
 * @returns {void}
 */
function saveAsJson (json, filename = 'data.json') {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Downloads a PDF game sheet for a pre-generated map
 * Navigates to the PDF file location based on map terrain tag and name
 * Only triggers download in browser environments (not Node.js)
 * @param {MapModel} map - The map to print
 * @returns {string} The PDF file path/URL
 */
function printGameSheet (map) {
  trackClick(map, 'download pdf')
  const location = `../docs/gamesheets/${map.terrain.tag}/${map.name}.pdf`

  if (typeof process === 'undefined') {
    // Browser environment: trigger PDF download
    if (globalThis.location) {
      globalThis.location.href = location
    }
  }

  return location
}

/**
 * Saves a map to a file using the modern File System API or falls back to download
 * Uses showSaveFilePicker for modern browsers, or saveAsJson fallback
 * @param {MapModel} map - The map to save
 * @param {string|undefined} [suggestedName] - Optional suggested filename
 * @returns {Promise<{success: boolean, handle?: unknown, fallback?: boolean, error?: unknown}>} Result with success status and optional handle/error
 */
async function saveToFile (map, suggestedName = undefined) {
  const json = map.jsonString()
  const name = map.exportName()
  const filename = suggestedName || (name ? `${name}.json` : 'map.json')

  if ('showSaveFilePicker' in globalThis) {
    try {
      const opts = {
        suggestedName: filename,
        types: [
          {
            description: 'JSON file',
            accept: { 'application/json': ['.json'] }
          }
        ]
      }
      const handle = await globalThis.showSaveFilePicker(opts)
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return { success: true, handle }
    } catch (error) {
      return { success: false, error }
    }
  }

  saveAsJson(json, filename)
  return { success: true, fallback: true }
}

export { MapList, saveAsJson, printGameSheet, saveToFile }

/**
 * Initialize map list UI after navbar is loaded
 * Sets up tab bar visibility and loads the selected map list
 * Only runs in browser environments with DOM available
 */
if (typeof document !== 'undefined' && typeof process === 'undefined') {
  const mapList = new MapList()
  await fetchNavBar('list', 'List of Hidden Battle Maps')

  const secondTabBar = document.getElementById('second-tab-bar')
  const chooseInclude = document.getElementById('choose-include')

  if (secondTabBar) {
    secondTabBar.classList.remove('hidden')
  }
  if (chooseInclude) {
    chooseInclude.classList.remove('hidden')
  }

  const includes = setupMapListOptions(mapList.makeList.bind(mapList))

  mapList.makeList(includes)
}
